import { db } from "@/lib/db";
import { ok, fail, requireUser, readJson } from "@/lib/api";
import { priceLine, summarize } from "@/lib/pricing";
import { saveCartSchema, firstError } from "@/lib/schemas";
import type { CartLine } from "@/types";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const lines = await db.getCart(auth.user.id);
  return ok({ lines, summary: summarize(lines) });
}

/** Persist the cart. Pricing is recomputed server-side from the client ratecard. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = await readJson<unknown>(req);
  const parsed = saveCartSchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);

  const brands = await db.listBrandsForClient(auth.user.clientId);
  const brandMap = new Map(brands.map((b) => [b.id, b]));

  const repriced: CartLine[] = [];
  for (const line of parsed.data.lines) {
    const brand = brandMap.get(line.brandId);
    if (!brand) continue; // drop unknown brands
    if (!brand.denominations.includes(line.denomination)) continue; // drop invalid denom
    repriced.push(priceLine(brand, line.denomination, line.quantity));
  }

  await db.saveCart(auth.user.id, auth.user.clientId, repriced);
  return ok({ lines: repriced, summary: summarize(repriced) });
}
