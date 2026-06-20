import { ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) return fail("Not authenticated", 401, "UNAUTHENTICATED");
  return ok({ user: session });
}
