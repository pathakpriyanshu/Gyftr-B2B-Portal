"""OTP generation, salted hashing, and expiry — mirrors `src/lib/auth/otp.ts`."""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from django.conf import settings


def _secret() -> str:
    return settings.APP["auth"]["jwt_secret"]


def generate_otp(length: int | None = None) -> str:
    if length is None:
        length = settings.APP["otp"]["length"]
    n = secrets.randbelow(10 ** length)
    return str(n).zfill(length)


def hash_otp(otp: str) -> str:
    return hmac.new(_secret().encode("utf-8"), otp.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_otp_hash(otp: str, otp_hash: str) -> bool:
    return hmac.compare_digest(hash_otp(otp), otp_hash or "")


def otp_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=settings.APP["otp"]["ttl_minutes"])


def is_expired(dt: datetime | None) -> bool:
    if not dt:
        return True
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt < datetime.now(timezone.utc)
