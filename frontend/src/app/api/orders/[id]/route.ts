import { db } from "@/lib/db";
import { ok, fail, requireUser } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  // accept either internal id or human order number
  const order =
    (await db.getOrderById(params.id)) ?? (await db.getOrderByNumber(params.id));
  if (!order) return fail("Order not found", 404);
  if (order.clientId !== auth.user.clientId) return fail("Order not found", 404);

  const vouchers = await db.listVouchers(order.id);
  return ok({ order, voucherCount: vouchers.length });
}
