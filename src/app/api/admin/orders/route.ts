import { db } from "@/lib/db";
import { ok, fail, requireUser, hasRole } from "@/lib/api";

/** Finance view: orders awaiting payment verification for this client. */
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user.role, "finance"))
    return fail("Finance access required.", 403, "FORBIDDEN");

  const orders = await db.listOrders(auth.user.clientId, 200);
  const pending = orders.filter((o) => o.status === "under_verification");

  return ok({ orders: pending });
}
