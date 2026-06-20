"""
Session JWT (HS256) — issued by this backend, verified by both this backend
*and* the Next.js frontend's `jose` middleware/server components. Claim shape +
secret must match `src/lib/auth/jwt.ts`.
"""
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings

ALG = "HS256"


def _secret() -> str:
    return settings.APP["auth"]["jwt_secret"]


def sign_session(user: dict) -> str:
    """`user` is a SessionUser dict: id, email, fullName, role, clientId, clientName."""
    now = datetime.now(timezone.utc)
    ttl_hours = settings.APP["auth"]["session_ttl_hours"]
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "fullName": user["fullName"],
        "role": user["role"],
        "clientId": user["clientId"],
        "clientName": user["clientName"],
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=ttl_hours)).timestamp()),
    }
    return jwt.encode(payload, _secret(), algorithm=ALG)


def verify_session(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, _secret(), algorithms=[ALG])
    except jwt.PyJWTError:
        return None
    if not payload.get("sub"):
        return None
    return {
        "id": str(payload["sub"]),
        "email": str(payload.get("email", "")),
        "fullName": str(payload.get("fullName", "")),
        "role": payload.get("role"),
        "clientId": str(payload.get("clientId", "")),
        "clientName": str(payload.get("clientName", "")),
    }


def get_session(request) -> dict | None:
    """Read + verify the current session from the request cookie."""
    token = request.COOKIES.get(settings.APP["auth"]["cookie_name"])
    if not token:
        return None
    return verify_session(token)


def set_session_cookie(response, user: dict) -> None:
    token = sign_session(user)
    response.set_cookie(
        settings.APP["auth"]["cookie_name"],
        token,
        max_age=settings.APP["auth"]["session_ttl_hours"] * 3600,
        httponly=True,
        secure=settings.APP["auth"]["cookie_secure"],
        samesite="Lax",
        path="/",
    )


def clear_session_cookie(response) -> None:
    response.delete_cookie(settings.APP["auth"]["cookie_name"], path="/")
