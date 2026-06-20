"""Brand catalog endpoints — mirrors src/app/api/brands/*."""
from core import repo
from core.http import current_user, fail, ok
from core.serialize import brand_json


def brands_list(request):
    if request.method != "GET":
        return fail("Method not allowed", 405)
    user = current_user(request)
    if not user:
        return fail("Not authenticated", 401, "UNAUTHENTICATED")

    rows = repo.list_brands_for_client(user["clientId"])
    brands = [brand_json(r["brand"], r["discountPct"]) for r in rows]
    categories = []
    for b in brands:
        if b["category"] and b["category"] not in categories:
            categories.append(b["category"])
    return ok({"brands": brands, "categories": categories})


def brand_detail(request, brand_id):
    if request.method != "GET":
        return fail("Method not allowed", 405)
    user = current_user(request)
    if not user:
        return fail("Not authenticated", 401, "UNAUTHENTICATED")

    row = repo.get_brand_for_client(user["clientId"], brand_id)
    if not row:
        return fail("Brand not found", 404)
    return ok({"brand": brand_json(row["brand"], row["discountPct"])})
