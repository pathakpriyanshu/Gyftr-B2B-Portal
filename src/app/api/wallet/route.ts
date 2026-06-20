import { db } from "@/lib/db";
import { ok, requireUser } from "@/lib/api";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const [wallet, transactions] = await Promise.all([
    db.getWallet(auth.user.clientId),
    db.listWalletTransactions(auth.user.clientId, 200),
  ]);

  return ok({ wallet, transactions });
}
