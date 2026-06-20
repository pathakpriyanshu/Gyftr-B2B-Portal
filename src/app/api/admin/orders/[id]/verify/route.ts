import { db } from "@/lib/db";
import { ok, fail, requireUser, readJson, hasRole } from "@/lib/api";
import { fulfillOrder } from "@/lib/orders";
import { verifyOrderSchema, firstError } from "@/lib/schemas";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user.role, "finance"))
    return fail("Finance access required.", 403, "FORBIDDEN");

  const body = await readJson<unknown>(req);
  const parsed = verifyOrderSchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);

  const order = await db.getOrderById(params.id);
  if (!order || order.clientId !== auth.user.clientId) return fail("Order not found", 404);
  if (order.status !== "under_verification")
    return fail("This order is not awaiting verification.", 409, "BAD_STATE");

  if (parsed.data.action === "reject") {
    await db.updateOrder(order.id, {
      status: "rejected",
      paymentStatus: "rejected",
      rejectionReason: parsed.data.reason || "Payment could not be verified.",
      verifiedBy: auth.user.id,
    });
    await db.audit({
      clientId: auth.user.clientId,
      userId: auth.user.id,
      action: "order.payment_rejected",
      entity: "order",
      entityId: order.id,
      metadata: { reason: parsed.data.reason },
    });
    const updated = await db.getOrderById(order.id);
    return ok({ order: updated });
  }

  // approve
  await db.updateOrder(order.id, {
    status: "paid",
    paymentStatus: "verified",
    paymentVerifiedAt: new Date().toISOString(),
    verifiedBy: auth.user.id,
  });
  await db.audit({
    clientId: auth.user.clientId,
    userId: auth.user.id,
    action: "order.payment_verified",
    entity: "order",
    entityId: order.id,
  });

  const fulfilled = await fulfillOrder(order.id);
  return ok({ order: fulfilled });
}
