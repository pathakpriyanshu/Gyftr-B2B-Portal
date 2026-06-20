import { db } from "@/lib/db";
import { ok, requireUser } from "@/lib/api";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const [stats, orders] = await Promise.all([
    db.getDashboardStats(auth.user.clientId),
    db.listOrders(auth.user.clientId, 6),
  ]);

  return ok({ stats, orders });
}
