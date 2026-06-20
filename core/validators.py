"""
Request validation — mirrors the Zod schemas in `src/lib/schemas.ts`, including
the exact human error messages the frontend surfaces.

Each validator returns (data, error): on success error is None; on failure data
is None and error is a message string (the caller responds 422).
"""
import re

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
OTP_RE = re.compile(r"^\d{4,8}$")
ROLES = {"admin", "finance", "procurement", "viewer"}
USER_STATUSES = {"active", "disabled", "invited"}


def _clean_email(value):
    if not isinstance(value, str):
        return None
    email = value.strip().lower()
    if not EMAIL_RE.match(email):
        return None
    return email


def _is_number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def validate_request_otp(body):
    if not isinstance(body, dict):
        return None, "Enter a valid email address"
    email = _clean_email(body.get("email"))
    if not email:
        return None, "Enter a valid email address"
    return {"email": email}, None


def validate_verify_otp(body):
    if not isinstance(body, dict):
        return None, "Enter a valid email address"
    email = _clean_email(body.get("email"))
    if not email:
        return None, "Enter a valid email address"
    otp = body.get("otp")
    if not isinstance(otp, str) or not OTP_RE.match(otp):
        return None, "Enter the OTP"
    return {"email": email, "otp": otp}, None


def validate_save_cart(body):
    if not isinstance(body, dict) or not isinstance(body.get("lines"), list):
        return None, "Invalid request"
    lines = body["lines"]
    if len(lines) > 200:
        return None, "Invalid request"
    cleaned = []
    for l in lines:
        if not isinstance(l, dict):
            return None, "Invalid request"
        brand_id = l.get("brandId")
        denomination = l.get("denomination")
        quantity = l.get("quantity")
        if not isinstance(brand_id, str) or not brand_id:
            return None, "Invalid request"
        if not _is_number(denomination) or denomination <= 0:
            return None, "Invalid request"
        if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity <= 0 or quantity > 100000:
            return None, "Invalid request"
        cleaned.append({
            "brandId": brand_id,
            "denomination": denomination,
            "quantity": quantity,
        })
    return {"lines": cleaned}, None


def _validate_payment(payment):
    if not isinstance(payment, dict):
        return None, "Invalid request"
    method = payment.get("method")
    if method not in ("wallet", "bank_transfer"):
        return None, "Invalid request"
    utr = payment.get("utrNumber")
    if utr is not None:
        if not isinstance(utr, str) or len(utr.strip()) > 40:
            return None, "Invalid request"
        utr = utr.strip()
    return {
        "method": method,
        "utrNumber": utr,
        "paymentProofKey": payment.get("paymentProofKey"),
        "paymentProofUrl": payment.get("paymentProofUrl"),
    }, None


def validate_create_order(body):
    if not isinstance(body, dict):
        return None, "Cart is empty"
    items = body.get("items")
    if not isinstance(items, list) or len(items) < 1:
        return None, "Cart is empty"
    cleaned_items = []
    for it in items:
        if not isinstance(it, dict):
            return None, "Invalid request"
        brand_id = it.get("brandId")
        denomination = it.get("denomination")
        quantity = it.get("quantity")
        if not isinstance(brand_id, str) or not brand_id:
            return None, "Invalid request"
        if not _is_number(denomination) or denomination <= 0:
            return None, "Invalid request"
        if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity <= 0 or quantity > 100000:
            return None, "Invalid request"
        cleaned_items.append({
            "brandId": brand_id,
            "denomination": denomination,
            "quantity": quantity,
        })
    payment, err = _validate_payment(body.get("payment"))
    if err:
        return None, err
    return {"items": cleaned_items, "payment": payment}, None


def validate_download_verify(body):
    if not isinstance(body, dict):
        return None, "Enter the OTP"
    otp = body.get("otp")
    if not isinstance(otp, str) or not OTP_RE.match(otp):
        return None, "Enter the OTP"
    return {"otp": otp}, None


def validate_create_user(body):
    if not isinstance(body, dict):
        return None, "Name is required"
    email = _clean_email(body.get("email"))
    if not email:
        return None, "Enter a valid email address"
    full_name = body.get("fullName")
    if not isinstance(full_name, str) or len(full_name.strip()) < 2:
        return None, "Name is required"
    if len(full_name.strip()) > 120:
        return None, "Name is required"
    phone = body.get("phone")
    if phone is not None and (not isinstance(phone, str) or len(phone.strip()) > 20):
        return None, "Invalid request"
    role = body.get("role")
    if role not in ROLES:
        return None, "Invalid request"
    return {
        "email": email,
        "fullName": full_name.strip(),
        "phone": phone.strip() if isinstance(phone, str) else phone,
        "role": role,
    }, None


def validate_update_user(body):
    if not isinstance(body, dict):
        return None, "Invalid request"
    out = {}
    if "fullName" in body and body["fullName"] is not None:
        fn = body["fullName"]
        if not isinstance(fn, str) or not (2 <= len(fn.strip()) <= 120):
            return None, "Invalid request"
        out["fullName"] = fn.strip()
    if "phone" in body:
        phone = body["phone"]
        if phone is not None and (not isinstance(phone, str) or len(phone.strip()) > 20):
            return None, "Invalid request"
        out["phone"] = phone.strip() if isinstance(phone, str) else phone
    if "role" in body and body["role"] is not None:
        if body["role"] not in ROLES:
            return None, "Invalid request"
        out["role"] = body["role"]
    if "status" in body and body["status"] is not None:
        if body["status"] not in USER_STATUSES:
            return None, "Invalid request"
        out["status"] = body["status"]
    return out, None


def validate_verify_order(body):
    if not isinstance(body, dict):
        return None, "Invalid request"
    action = body.get("action")
    if action not in ("approve", "reject"):
        return None, "Invalid request"
    reason = body.get("reason")
    if reason is not None:
        if not isinstance(reason, str) or len(reason.strip()) > 300:
            return None, "Invalid request"
        reason = reason.strip()
    return {"action": action, "reason": reason}, None
