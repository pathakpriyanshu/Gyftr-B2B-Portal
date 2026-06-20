import { db } from "@/lib/db";
import { ok, fail, requireUser } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const brand = await db.getBrandForClient(auth.user.clientId, params.id);
  if (!brand) return fail("Brand not found", 404);

  return ok({ brand });
}
