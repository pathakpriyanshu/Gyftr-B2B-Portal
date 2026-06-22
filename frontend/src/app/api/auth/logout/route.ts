import { ok } from "@/lib/api";
import { clearSessionCookie, getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";

export async function POST() {
  const session = await getSession();
  if (session) {
    await db.audit({
      clientId: session.clientId,
      userId: session.id,
      action: "auth.logout",
      entity: "user",
      entityId: session.id,
    });
  }
  clearSessionCookie();
  return ok({ loggedOut: true });
}
