import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ok, requireUser } from "@/lib/api";

/** Checkout config: which payment methods are enabled + bank details. */
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const client = await db.getClientById(auth.user.clientId);

  return ok({
    paymentMethods: {
      wallet: client?.allowWallet ?? true,
      bankTransfer: client?.allowBankTransfer ?? true,
    },
    bank: {
      accountName: env.bank.accountName,
      accountNumber: env.bank.accountNumber,
      ifsc: env.bank.ifsc,
      bankName: env.bank.bankName,
      branch: env.bank.branch,
    },
    client: client
      ? { id: client.id, name: client.name, gstNumber: client.gstNumber }
      : null,
  });
}
