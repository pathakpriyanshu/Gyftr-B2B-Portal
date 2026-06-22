import { db } from "@/lib/db";
import { ok, fail, requireUser } from "@/lib/api";

/** Returns the secure (OTP-gated) download link for a fulfilled order. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const order =
    (await db.getOrderById(params.id)) ?? (await db.getOrderByNumber(params.id));
  if (!order || order.clientId !== auth.user.clientId) return fail("Order not found", 404);
  if (order.status !== "fulfilled")
    return fail("Vouchers are not ready for this order yet.", 409, "NOT_READY");

  const user = await db.getUserById(order.userId);
  const token = await db.getOrCreateDownloadToken(order.id, user?.email ?? auth.user.email);

  return ok({ token: token.token, url: `/download/${token.token}` });
}
