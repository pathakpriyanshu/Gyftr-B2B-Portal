import { db } from "@/lib/db";
import { ok, fail, requireUser, readJson, canTransact } from "@/lib/api";
import { priceLine, summarize } from "@/lib/pricing";
import { createOrderSchema, submitPaymentSchema, firstError } from "@/lib/schemas";
import { fulfillOrder } from "@/lib/orders";
import { sendEmail, orderConfirmationEmail } from "@/lib/email";
import { formatINR } from "@/lib/utils";
import { z } from "zod";
import type { OrderItem } from "@/types";

const bodySchema = createOrderSchema.merge(z.object({ payment: submitPaymentSchema }));

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const orders = await db.listOrders(auth.user.clientId);
  return ok({ orders });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!canTransact(auth.user.role))
    return fail("Your role does not permit placing orders.", 403, "FORBIDDEN");

  const body = await readJson<unknown>(req);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);

  const { items, payment } = parsed.data;

  // --- reprice authoritatively from the client ratecard ---
  const brands = await db.listBrandsForClient(auth.user.clientId);
  const brandMap = new Map(brands.map((b) => [b.id, b]));

  const orderItems: Omit<OrderItem, "id">[] = [];
  for (const it of items) {
    const brand = brandMap.get(it.brandId);
    if (!brand) return fail(`Unknown brand in cart.`, 422, "BAD_BRAND");
    if (!brand.denominations.includes(it.denomination))
      return fail(`Invalid denomination for ${brand.name}.`, 422, "BAD_DENOM");
    const line = priceLine(brand, it.denomination, it.quantity);
    orderItems.push({
      brandId: brand.id,
      brandName: brand.name,
      brandLogoUrl: brand.logoUrl,
      denomination: line.denomination,
      quantity: line.quantity,
      discountPct: line.discountPct,
      faceValueTotal: line.faceValueTotal,
      discountTotal: line.discountTotal,
      finalPrice: line.finalPrice,
    });
  }
  const summary = summarize(
    orderItems.map((i) => ({
      brandId: i.brandId,
      brandName: i.brandName,
      brandLogoUrl: i.brandLogoUrl,
      denomination: i.denomination,
      quantity: i.quantity,
      discountPct: i.discountPct,
      faceValueTotal: i.faceValueTotal,
      discountTotal: i.discountTotal,
      finalPrice: i.finalPrice,
    }))
  );

  // --- validate payment method availability ---
  const client = await db.getClientById(auth.user.clientId);
  if (payment.method === "wallet" && !(client?.allowWallet ?? true))
    return fail("Wallet payment is not enabled for your account.", 403);
  if (payment.method === "bank_transfer" && !(client?.allowBankTransfer ?? true))
    return fail("Bank transfer is not enabled for your account.", 403);

  // --- pre-flight: validate wallet balance BEFORE creating the order so a
  //     failed payment never pollutes order history ---
  if (payment.method === "wallet") {
    const wallet = await db.getWallet(auth.user.clientId);
    if (wallet.balance < summary.payableAmount)
      return fail("Insufficient wallet balance.", 402, "INSUFFICIENT_BALANCE");
  }
  if (payment.method === "bank_transfer" && (!payment.utrNumber || payment.utrNumber.trim().length < 4))
    return fail("UTR / reference number is required for bank transfer.", 422, "UTR_REQUIRED");

  // --- create the order ---
  const order = await db.createOrder({
    clientId: auth.user.clientId,
    userId: auth.user.id,
    placedByName: auth.user.fullName,
    items: orderItems,
    totalFaceValue: summary.totalFaceValue,
    totalDiscount: summary.totalDiscount,
    payableAmount: summary.payableAmount,
    totalQuantity: summary.totalQuantity,
  });

  // --- process payment ---
  if (payment.method === "wallet") {
    try {
      await db.debitWallet(
        auth.user.clientId,
        order.payableAmount,
        order.orderNumber,
        `Voucher order ${order.orderNumber}`,
        auth.user.id
      );
    } catch {
      // race: balance changed between pre-flight and debit
      await db.updateOrder(order.id, { status: "cancelled" });
      return fail("Insufficient wallet balance.", 402, "INSUFFICIENT_BALANCE");
    }
    await db.updateOrder(order.id, {
      paymentMethod: "wallet",
      paymentStatus: "verified",
      status: "paid",
      paymentSubmittedAt: new Date().toISOString(),
      paymentVerifiedAt: new Date().toISOString(),
    });
    await db.clearCart(auth.user.id);

    // wallet payments are auto-verified → fulfil immediately
    await fulfillOrder(order.id);

    const tmpl = orderConfirmationEmail(order.orderNumber, formatINR(order.payableAmount));
    await sendEmail({ to: auth.user.email, ...tmpl });

    const final = await db.getOrderById(order.id);
    return ok({ order: final, paymentStatus: "verified" });
  }

  // bank transfer → goes under verification (UTR validated pre-flight)
  await db.updateOrder(order.id, {
    paymentMethod: "bank_transfer",
    paymentStatus: "under_verification",
    status: "under_verification",
    utrNumber: payment.utrNumber!.trim(),
    paymentProofUrl: payment.paymentProofUrl ?? payment.paymentProofKey ?? null,
    paymentSubmittedAt: new Date().toISOString(),
  });
  await db.clearCart(auth.user.id);

  await db.audit({
    clientId: auth.user.clientId,
    userId: auth.user.id,
    action: "order.placed",
    entity: "order",
    entityId: order.id,
    metadata: { method: payment.method, amount: order.payableAmount },
  });

  const tmpl = orderConfirmationEmail(order.orderNumber, formatINR(order.payableAmount));
  await sendEmail({ to: auth.user.email, ...tmpl });

  const final = await db.getOrderById(order.id);
  return ok({ order: final, paymentStatus: "under_verification" });
}
