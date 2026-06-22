import { db } from "@/lib/db";
import { ok, requireUser } from "@/lib/api";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const brands = await db.listBrandsForClient(auth.user.clientId);
  const categories = Array.from(
    new Set(brands.map((b) => b.category).filter(Boolean))
  ) as string[];

  return ok({ brands, categories });
}
