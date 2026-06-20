import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

/** Public landing-page data for an email download link (no session required). */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const token = await db.getDownloadTokenByToken(params.token);
  if (!token) return fail("This download link is invalid or has expired.", 404, "BAD_TOKEN");

  const order = await db.getOrderById(token.orderId);
  if (!order) return fail("Order not found.", 404);

  const vouchers = await db.listVouchers(order.id);

  return ok({
    orderNumber: order.orderNumber,
    voucherCount: vouchers.length,
    email: maskEmail(token.email),
    verified: token.verified,
    ready: order.status === "fulfilled",
  });
}
