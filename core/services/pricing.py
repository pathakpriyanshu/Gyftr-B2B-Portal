"""Cart/order pricing — mirrors `src/lib/pricing.ts`. All math via Decimal."""
import math
from decimal import Decimal

from core.serialize import num
from core.services.money import money


def price_line(brand: dict, denomination, quantity) -> dict:
    """Build a fully-priced cart line. `brand` needs id, name, logoUrl, discountPct."""
    q = max(1, int(math.floor(quantity)))
    discount_pct = Decimal(str(brand["discountPct"]))
    face_value_total = money(Decimal(str(denomination)) * q)
    discount_total = money(face_value_total * discount_pct / Decimal(100))
    final_price = money(face_value_total - discount_total)
    return {
        "brandId": brand["id"],
        "brandName": brand["name"],
        "brandLogoUrl": brand.get("logoUrl"),
        "denomination": num(denomination),
        "quantity": q,
        "discountPct": num(discount_pct),
        "faceValueTotal": num(face_value_total),
        "discountTotal": num(discount_total),
        "finalPrice": num(final_price),
    }


def summarize(lines: list[dict]) -> dict:
    total_quantity = 0
    total_face = Decimal(0)
    total_discount = Decimal(0)
    payable = Decimal(0)
    for l in lines:
        total_quantity += int(l["quantity"])
        total_face += Decimal(str(l["faceValueTotal"]))
        total_discount += Decimal(str(l["discountTotal"]))
        payable += Decimal(str(l["finalPrice"]))
    return {
        "totalQuantity": total_quantity,
        "totalFaceValue": num(money(total_face)),
        "totalDiscount": num(money(total_discount)),
        "payableAmount": num(money(payable)),
    }
