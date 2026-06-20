"""Response envelope + auth/role helpers — mirrors `src/lib/api.ts`."""
import json

from django.http import JsonResponse

from core.services.jwt_auth import get_session

ROLE_RANK = {"viewer": 0, "procurement": 1, "finance": 2, "admin": 3}


def ok(data, status=200) -> JsonResponse:
    return JsonResponse({"ok": True, "data": data}, status=status)


def fail(error: str, status=400, code=None) -> JsonResponse:
    return JsonResponse({"ok": False, "error": error, "code": code}, status=status)


def current_user(request):
    """Session user dict, or None."""
    return get_session(request)


def has_role(role: str, minimum: str) -> bool:
    return ROLE_RANK.get(role, -1) >= ROLE_RANK.get(minimum, 99)


def can_transact(role: str) -> bool:
    return role != "viewer"


def read_json(request):
    try:
        if not request.body:
            return None
        return json.loads(request.body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return None
