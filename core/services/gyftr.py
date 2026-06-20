"""
Gyftr core API client (catalog + voucher issuance) — mirrors `src/lib/gyftr.ts`.

With GYFTR_USE_MOCK true (default) issuance is simulated locally so the portal
is fully functional end-to-end. Flip the flag + set GYFTR_API_KEY for real calls.
"""
import re
import secrets
from datetime import date

from django.conf import settings


def _random_code(brand_ext: str, denomination: int) -> str:
    block = lambda: secrets.token_hex(2).upper()
    return f"{brand_ext}-{block()}-{block()}-{denomination}"


def _random_pin() -> str:
    return str(secrets.randbelow(1_000_000)).zfill(6)


def issue_vouchers(order_number: str, items) -> list[dict]:
    """`items` is an iterable of OrderItem model instances. Returns NewVoucher dicts."""
    if not settings.APP["gyftr"]["use_mock"]:
        return _issue_via_api(order_number, items)
    return _issue_mock(items)


def _issue_mock(items) -> list[dict]:
    today = date.today()
    try:
        expiry = today.replace(year=today.year + 1)
    except ValueError:  # Feb 29
        expiry = today.replace(year=today.year + 1, day=28)
    expiry_date = expiry.isoformat()

    out: list[dict] = []
    for item in items:
        letters = re.sub(r"[^A-Za-z]", "", item.brand_name)[:4]
        ext = (letters or "GYF").upper()
        for _ in range(item.quantity):
            out.append({
                "orderItemId": item.id,
                "brandId": item.brand_id,
                "brandName": item.brand_name,
                "denomination": item.denomination,
                "code": _random_code(ext, item.denomination),
                "pin": _random_pin(),
                "expiryDate": expiry_date,
            })
    return out


def _issue_via_api(order_number: str, items) -> list[dict]:
    import requests

    g = settings.APP["gyftr"]
    url = f"{g['base_url']}{g['send_voucher_endpoint']}"
    res = requests.post(
        url,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {g['api_key']}",
        },
        json={
            "orderNumber": order_number,
            "items": [
                {"brand": i.brand_id, "denomination": i.denomination, "quantity": i.quantity}
                for i in items
            ],
        },
        timeout=30,
    )
    res.raise_for_status()
    payload = res.json()
    return [
        {
            "orderItemId": v.get("orderItemId", ""),
            "brandId": v.get("brandId"),
            "brandName": v["brandName"],
            "denomination": v["denomination"],
            "code": v["code"],
            "pin": v.get("pin"),
            "expiryDate": v.get("expiryDate"),
        }
        for v in payload.get("vouchers", [])
    ]
