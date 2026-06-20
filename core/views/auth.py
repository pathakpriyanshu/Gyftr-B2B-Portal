"""Auth endpoints — mirrors src/app/api/auth/*."""
from datetime import datetime, timezone

from django.conf import settings
from django.views.decorators.csrf import csrf_exempt

from core import repo
from core.http import current_user, fail, ok, read_json
from core.models import AppUser, Client, LoginOtp
from core.services import email as email_service
from core.services.jwt_auth import clear_session_cookie, set_session_cookie
from core.services.otp import generate_otp, hash_otp, is_expired, otp_expiry, verify_otp_hash
from core.validators import validate_request_otp, validate_verify_otp

MAX_ATTEMPTS = 5


def _seconds_since(dt) -> float:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - dt).total_seconds()


@csrf_exempt
def request_otp(request):
    if request.method != "POST":
        return fail("Method not allowed", 405)
    data, err = validate_request_otp(read_json(request))
    if err:
        return fail(err, 422)

    email = data["email"]
    user = AppUser.objects.filter(email__iexact=email).first()
    if not user:
        return fail(
            "No account is registered with this email. Contact your administrator.",
            404,
            "NO_ACCOUNT",
        )
    if user.status == "disabled":
        return fail(
            "This account has been disabled. Contact your administrator.", 403, "ACCOUNT_DISABLED"
        )

    cooldown = settings.APP["otp"]["resend_cooldown_seconds"]
    latest = LoginOtp.objects.filter(email__iexact=email, consumed=False).order_by("-created_at").first()
    if latest:
        since = _seconds_since(latest.created_at)
        if since < cooldown:
            wait = int((cooldown - since) + 0.999)
            return fail(f"Please wait {wait}s before requesting another code.", 429, "COOLDOWN")

    otp = generate_otp()
    LoginOtp.objects.create(email=email, otp_hash=hash_otp(otp), expires_at=otp_expiry())

    tmpl = email_service.login_otp_email(otp)
    email_service.send_email(to=email, subject=tmpl["subject"], html=tmpl["html"], text=tmpl["text"])

    repo.audit(
        client_id=user.client_id, user_id=user.id, action="auth.otp_requested",
        entity="user", entity_id=user.id,
    )

    payload = {"sent": True, "ttlMinutes": settings.APP["otp"]["ttl_minutes"]}
    if settings.APP["otp"]["dev_mode"]:
        payload["devOtp"] = otp
    return ok(payload)


@csrf_exempt
def verify_otp(request):
    if request.method != "POST":
        return fail("Method not allowed", 405)
    data, err = validate_verify_otp(read_json(request))
    if err:
        return fail(err, 422)

    email, otp = data["email"], data["otp"]
    user = AppUser.objects.filter(email__iexact=email).first()
    if not user:
        return fail("No account found for this email.", 404, "NO_ACCOUNT")
    if user.status == "disabled":
        return fail("This account has been disabled.", 403, "ACCOUNT_DISABLED")

    record = LoginOtp.objects.filter(email__iexact=email, consumed=False).order_by("-created_at").first()
    if not record:
        return fail("No active code. Please request a new OTP.", 400, "NO_OTP")
    if is_expired(record.expires_at):
        return fail("Your code has expired. Request a new OTP.", 400, "OTP_EXPIRED")
    if record.attempts >= MAX_ATTEMPTS:
        return fail("Too many incorrect attempts. Request a new OTP.", 429, "TOO_MANY_ATTEMPTS")

    if not verify_otp_hash(otp, record.otp_hash):
        record.attempts += 1
        record.save(update_fields=["attempts"])
        return fail("Incorrect code. Please try again.", 401, "INVALID_OTP")

    record.consumed = True
    record.save(update_fields=["consumed"])
    user.last_login_at = datetime.now(timezone.utc)
    user.save(update_fields=["last_login_at"])

    client = Client.objects.filter(id=user.client_id).first()
    client_name = client.name if client else ""
    session_user = {
        "id": user.id,
        "email": user.email,
        "fullName": user.full_name,
        "role": user.role,
        "clientId": user.client_id,
        "clientName": client_name,
    }

    repo.audit(
        client_id=user.client_id, user_id=user.id, action="auth.login",
        entity="user", entity_id=user.id,
    )

    response = ok({"user": session_user})
    set_session_cookie(response, session_user)
    return response


def me(request):
    if request.method != "GET":
        return fail("Method not allowed", 405)
    session = current_user(request)
    if not session:
        return fail("Not authenticated", 401, "UNAUTHENTICATED")
    return ok({"user": session})


@csrf_exempt
def logout(request):
    if request.method != "POST":
        return fail("Method not allowed", 405)
    session = current_user(request)
    if session:
        repo.audit(
            client_id=session["clientId"], user_id=session["id"], action="auth.logout",
            entity="user", entity_id=session["id"],
        )
    response = ok({"loggedOut": True})
    clear_session_cookie(response)
    return response
