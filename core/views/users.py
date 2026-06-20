"""User management endpoints — mirrors src/app/api/users/*."""
from django.views.decorators.csrf import csrf_exempt

from core import repo
from core.http import current_user, fail, has_role, ok, read_json
from core.models import AppUser
from core.serialize import user_json
from core.validators import validate_create_user, validate_update_user


@csrf_exempt
def users_list_create(request):
    user = current_user(request)
    if not user:
        return fail("Not authenticated", 401, "UNAUTHENTICATED")

    if request.method == "GET":
        users = AppUser.objects.filter(client_id=user["clientId"]).order_by("created_at")
        return ok({"users": [user_json(u) for u in users]})

    if request.method != "POST":
        return fail("Method not allowed", 405)

    if not has_role(user["role"], "admin"):
        return fail("Only administrators can add users.", 403, "FORBIDDEN")

    data, err = validate_create_user(read_json(request))
    if err:
        return fail(err, 422)

    if AppUser.objects.filter(email__iexact=data["email"]).exists():
        return fail("A user with this email already exists.", 409, "DUPLICATE")

    new_user = AppUser.objects.create(
        client_id=user["clientId"],
        email=data["email"].lower(),
        full_name=data["fullName"],
        phone=data["phone"],
        role=data["role"],
        status="active",
    )
    repo.audit(
        client_id=user["clientId"], user_id=user["id"], action="user.created",
        entity="user", entity_id=new_user.id,
        metadata={"email": new_user.email, "role": new_user.role},
    )
    return ok({"user": user_json(new_user)})


@csrf_exempt
def user_update(request, ident):
    if request.method != "PATCH":
        return fail("Method not allowed", 405)
    user = current_user(request)
    if not user:
        return fail("Not authenticated", 401, "UNAUTHENTICATED")
    if not has_role(user["role"], "admin"):
        return fail("Only administrators can modify users.", 403, "FORBIDDEN")

    target = AppUser.objects.filter(id=ident).first()
    if not target or target.client_id != user["clientId"]:
        return fail("User not found", 404)

    data, err = validate_update_user(read_json(request))
    if err:
        return fail(err, 422)

    # guard: don't let an admin lock themselves out
    if target.id == user["id"]:
        if data.get("status") == "disabled":
            return fail("You cannot disable your own account.", 400, "SELF_DISABLE")
        if data.get("role") and data["role"] != "admin":
            return fail("You cannot change your own role.", 400, "SELF_DEMOTE")

    if "fullName" in data:
        target.full_name = data["fullName"]
    if "phone" in data:
        target.phone = data["phone"]
    if "role" in data:
        target.role = data["role"]
    if "status" in data:
        target.status = data["status"]
    target.save()

    repo.audit(
        client_id=user["clientId"], user_id=user["id"], action="user.updated",
        entity="user", entity_id=target.id, metadata=data,
    )
    return ok({"user": user_json(target)})
