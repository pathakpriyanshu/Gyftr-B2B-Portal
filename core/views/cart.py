"""Cart endpoints — mirrors src/app/api/cart/route.ts. Pricing is always
recomputed server-side from the client ratecard (client totals untrusted)."""
from django.views.decorators.csrf import csrf_exempt

from core import repo
from core.http import current_user, fail, ok, read_json
from core.models import Cart
from core.services.pricing import price_line, summarize
from core.validators import validate_save_cart


def _brand_map(client_id):
    rows = repo.list_brands_for_client(client_id)
    out = {}
    for r in rows:
        b = r["brand"]
        out[b.id] = {
            "id": b.id,
            "name": b.name,
            "logoUrl": b.logo_url,
            "discountPct": r["discountPct"],
            "denominations": b.denominations,
        }
    return out


@csrf_exempt
def cart(request):
    user = current_user(request)
    if not user:
        return fail("Not authenticated", 401, "UNAUTHENTICATED")

    if request.method == "GET":
        row = Cart.objects.filter(user_id=user["id"]).first()
        lines = row.lines if row else []
        return ok({"lines": lines, "summary": summarize(lines)})

    if request.method == "POST":
        data, err = validate_save_cart(read_json(request))
        if err:
            return fail(err, 422)

        brand_map = _brand_map(user["clientId"])
        repriced = []
        for line in data["lines"]:
            brand = brand_map.get(line["brandId"])
            if not brand:
                continue  # drop unknown brand
            if int(line["denomination"]) not in [int(d) for d in brand["denominations"]]:
                continue  # drop invalid denomination
            repriced.append(price_line(brand, line["denomination"], line["quantity"]))

        Cart.objects.update_or_create(
            user_id=user["id"],
            defaults={"client_id": user["clientId"], "lines": repriced},
        )
        return ok({"lines": repriced, "summary": summarize(repriced)})

    return fail("Method not allowed", 405)
