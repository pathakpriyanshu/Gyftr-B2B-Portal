"""
Serializers: map snake_case models to the exact camelCase JSON contract the
Next.js frontend consumes (see the TS types in `src/types/index.ts`).
"""
from datetime import datetime, timezone
from decimal import Decimal


def num(value):
    """Render a Decimal/number as a JSON number (int when integral, like JS)."""
    if value is None:
        return 0
    if isinstance(value, Decimal):
        value = float(value)
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def iso(dt: datetime | None):
    if not dt:
        return None
    return dt.astimezone(timezone.utc).isoformat()


def client_json(c):
    return {
        "id": c.id,
        "name": c.name,
        "legalName": c.legal_name,
        "logoUrl": c.logo_url,
        "gstNumber": c.gst_number,
        "status": c.status,
        "allowWallet": c.allow_wallet,
        "allowBankTransfer": c.allow_bank_transfer,
    }


def user_json(u):
    return {
        "id": u.id,
        "clientId": u.client_id,
        "email": u.email,
        "fullName": u.full_name,
        "phone": u.phone,
        "role": u.role,
        "status": u.status,
        "lastLoginAt": iso(u.last_login_at),
        "createdAt": iso(u.created_at),
    }


def brand_json(b, discount_pct):
    return {
        "id": b.id,
        "externalId": b.external_id,
        "name": b.name,
        "slug": b.slug,
        "category": b.category,
        "logoUrl": b.logo_url,
        "description": b.description,
        "terms": b.terms,
        "defaultDiscountPct": num(b.default_discount_pct),
        "status": b.status,
        "denominations": sorted(b.denominations),
        "discountPct": num(discount_pct),
    }


def wallet_txn_json(t):
    return {
        "id": t.id,
        "type": t.type,
        "amount": num(t.amount),
        "balanceAfter": num(t.balance_after),
        "reference": t.reference,
        "description": t.description,
        "createdAt": iso(t.created_at),
    }


def order_item_json(it):
    return {
        "id": it.id,
        "brandId": it.brand_id,
        "brandName": it.brand_name,
        "brandLogoUrl": it.brand_logo_url,
        "denomination": num(it.denomination),
        "quantity": it.quantity,
        "discountPct": num(it.discount_pct),
        "faceValueTotal": num(it.face_value_total),
        "discountTotal": num(it.discount_total),
        "finalPrice": num(it.final_price),
    }


def order_json(o, include_items=True):
    data = {
        "id": o.id,
        "orderNumber": o.order_number,
        "clientId": o.client_id,
        "userId": o.user_id,
        "status": o.status,
        "totalFaceValue": num(o.total_face_value),
        "totalDiscount": num(o.total_discount),
        "payableAmount": num(o.payable_amount),
        "totalQuantity": o.total_quantity,
        "paymentMethod": o.payment_method,
        "paymentStatus": o.payment_status,
        "paymentProofUrl": o.payment_proof_url,
        "utrNumber": o.utr_number,
        "paymentSubmittedAt": iso(o.payment_submitted_at),
        "paymentVerifiedAt": iso(o.payment_verified_at),
        "rejectionReason": o.rejection_reason,
        "createdAt": iso(o.created_at),
        "placedByName": o.placed_by_name,
    }
    if include_items:
        items = o.items.all() if hasattr(o, "items") else []
        data["items"] = [order_item_json(it) for it in items]
    return data


def voucher_json(v):
    return {
        "id": v.id,
        "brandName": v.brand_name,
        "denomination": num(v.denomination),
        "code": v.code,
        "pin": v.pin,
        "expiryDate": v.expiry_date,
        "status": v.status,
    }
