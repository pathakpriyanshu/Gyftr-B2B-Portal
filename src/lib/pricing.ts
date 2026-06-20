import { money } from "@/lib/utils";
import type { Brand, CartLine, CartSummary } from "@/types";

/** Build a fully-priced cart line for a brand + denomination + quantity. */
export function priceLine(
  brand: Pick<Brand, "id" | "name" | "logoUrl" | "discountPct">,
  denomination: number,
  quantity: number
): CartLine {
  const q = Math.max(1, Math.floor(quantity));
  const faceValueTotal = money(denomination * q);
  const discountTotal = money((faceValueTotal * brand.discountPct) / 100);
  const finalPrice = money(faceValueTotal - discountTotal);
  return {
    brandId: brand.id,
    brandName: brand.name,
    brandLogoUrl: brand.logoUrl,
    denomination,
    quantity: q,
    discountPct: brand.discountPct,
    faceValueTotal,
    discountTotal,
    finalPrice,
  };
}

/** Recompute derived totals on a stored cart line (defensive). */
export function recalcLine(line: CartLine): CartLine {
  const faceValueTotal = money(line.denomination * line.quantity);
  const discountTotal = money((faceValueTotal * line.discountPct) / 100);
  return {
    ...line,
    faceValueTotal,
    discountTotal,
    finalPrice: money(faceValueTotal - discountTotal),
  };
}

export function summarize(lines: CartLine[]): CartSummary {
  return lines.reduce<CartSummary>(
    (acc, l) => ({
      totalQuantity: acc.totalQuantity + l.quantity,
      totalFaceValue: money(acc.totalFaceValue + l.faceValueTotal),
      totalDiscount: money(acc.totalDiscount + l.discountTotal),
      payableAmount: money(acc.payableAmount + l.finalPrice),
    }),
    { totalQuantity: 0, totalFaceValue: 0, totalDiscount: 0, payableAmount: 0 }
  );
}
