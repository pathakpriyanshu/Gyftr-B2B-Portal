"""Public OTP-gated voucher download flow — mirrors src/app/api/download/*."""
from datetime import datetime, timezone

from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from core import repo
from core.http import fail, ok, read_json
from core.models import DownloadToken, Order
from core.services import email as email_service
from core.services.excel import generate_voucher_workbook
from core.services.otp import generate_otp, hash_otp, is_expired, otp_expiry, verify_otp_hash
from core.validators import validate_download_verify

MAX_ATTEMPTS = 5


def _mask_email(email: str) -> str:
    if "@" not in email:
        return email
    name, domain = email.split("@", 1)
    visible = name[:2]
    return f"{visible}{'*' * max(1, len(name) - 2)}@{domain}"


def _seconds_since(dt) -> float:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - dt).total_seconds()


def download_info(request, token):
    if request.method != "GET":
        return fail("Method not allowed", 405)
    row = DownloadToken.objects.filter(token=token).first()
    if not row:
        return fail("This download link is invalid or has expired.", 404, "BAD_TOKEN")

    order = Order.objects.filter(id=row.order_id).first()
    if not order:
        return fail("Order not found.", 404)

    return ok({
        "orderNumber": order.order_number,
        "voucherCount": order.vouchers.count(),
        "email": _mask_email(row.email),
        "verified": row.verified,
        "ready": order.status == "fulfilled",
    })


@csrf_exempt
def download_request_otp(request, token):
    if request.method != "POST":
        return fail("Method not allowed", 405)
    row = DownloadToken.objects.filter(token=token).first()
    if not row:
        return fail("This download link is invalid or has expired.", 404, "BAD_TOKEN")

    order = Order.objects.filter(id=row.order_id).first()
    if not order or order.status != "fulfilled":
        return fail("Vouchers are not ready for this order yet.", 409, "NOT_READY")

    cooldown = settings.APP["otp"]["resend_cooldown_seconds"]
    if row.otp_sent_at:
        since = _seconds_since(row.otp_sent_at)
        if since < cooldown:
            wait = int((cooldown - since) + 0.999)
            return fail(f"Please wait {wait}s before requesting another code.", 429, "COOLDOWN")

    otp = generate_otp()
    row.otp_hash = hash_otp(otp)
    row.otp_expires_at = otp_expiry()
    row.otp_sent_at = datetime.now(timezone.utc)
    row.attempts = 0
    row.save(update_fields=["otp_hash", "otp_expires_at", "otp_sent_at", "attempts"])

    tmpl = email_service.download_otp_email(otp)
    email_service.send_email(to=row.email, subject=tmpl["subject"], html=tmpl["html"], text=tmpl["text"])

    payload = {"sent": True, "ttlMinutes": settings.APP["otp"]["ttl_minutes"]}
    if settings.APP["otp"]["dev_mode"]:
        payload["devOtp"] = otp
    return ok(payload)


@csrf_exempt
def download_verify_otp(request, token):
    if request.method != "POST":
        return fail("Method not allowed", 405)
    row = DownloadToken.objects.filter(token=token).first()
    if not row:
        return fail("This download link is invalid or has expired.", 404, "BAD_TOKEN")

    data, err = validate_download_verify(read_json(request))
    if err:
        return fail(err, 422)

    if not row.otp_hash:
        return fail("Please request an OTP first.", 400, "NO_OTP")
    if is_expired(row.otp_expires_at):
        return fail("Your code has expired. Request a new OTP.", 400, "OTP_EXPIRED")
    if row.attempts >= MAX_ATTEMPTS:
        return fail("Too many incorrect attempts. Request a new OTP.", 429, "TOO_MANY_ATTEMPTS")

    if not verify_otp_hash(data["otp"], row.otp_hash):
        row.attempts += 1
        row.save(update_fields=["attempts"])
        return fail("Incorrect code. Please try again.", 401, "INVALID_OTP")

    row.verified = True
    row.verified_at = datetime.now(timezone.utc)
    row.save(update_fields=["verified", "verified_at"])

    order = Order.objects.filter(id=row.order_id).first()
    repo.audit(
        client_id=order.client_id if order else None,
        action="voucher.download_verified", entity="order", entity_id=row.order_id,
    )

    return ok({
        "verified": True,
        "orderNumber": order.order_number if order else None,
        "voucherCount": order.vouchers.count() if order else 0,
        "downloadUrl": f"/api/download/{token}/file",
    })


def download_file(request, token):
    if request.method != "GET":
        return fail("Method not allowed", 405)
    row = DownloadToken.objects.filter(token=token).first()
    if not row:
        return fail("This download link is invalid or has expired.", 404, "BAD_TOKEN")
    if not row.verified:
        return fail("Please verify the OTP before downloading.", 403, "NOT_VERIFIED")

    order = Order.objects.filter(id=row.order_id).first()
    if not order or order.status != "fulfilled":
        return fail("Vouchers are not ready for this order.", 409, "NOT_READY")

    vouchers = list(order.vouchers.all())
    buffer = generate_voucher_workbook(order, vouchers)

    repo.audit(
        client_id=order.client_id, action="voucher.downloaded",
        entity="order", entity_id=order.id, metadata={"vouchers": len(vouchers)},
    )

    response = HttpResponse(
        buffer,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{order.order_number}-vouchers.xlsx"'
    response["Cache-Control"] = "no-store"
    return response
