"""Finance verification endpoints — mirrors src/app/api/admin/orders/*."""
from datetime import datetime, timezone

from django.views.decorators.csrf import csrf_exempt

from core import repo
from core.http import current_user, fail, has_role, ok, read_json
from core.models import Order
from core.serialize import order_json
from core.services.orders import fulfill_order
from core.validators import validate_verify_order


def pending_verifications(request):
    if request.method != "GET":
        return fail("Method not allowed", 405)
    user = current_user(request)
    if not user:
        return fail("Not authenticated", 401, "UNAUTHENTICATED")
    if not has_role(user["role"], "finance"):
        return fail("Finance access required.", 403, "FORBIDDEN")

    orders = (
        Order.objects.filter(client_id=user["clientId"], status="under_verification")
        .order_by("-created_at")[:200]
    )
    return ok({"orders": [order_json(o, include_items=False) for o in orders]})


@csrf_exempt
def verify_order(request, ident):
    if request.method != "POST":
        return fail("Method not allowed", 405)
    user = current_user(request)
    if not user:
        return fail("Not authenticated", 401, "UNAUTHENTICATED")
    if not has_role(user["role"], "finance"):
        return fail("Finance access required.", 403, "FORBIDDEN")

    data, err = validate_verify_order(read_json(request))
    if err:
        return fail(err, 422)

    order = Order.objects.filter(id=ident).first()
    if not order or order.client_id != user["clientId"]:
        return fail("Order not found", 404)
    if order.status != "under_verification":
        return fail("This order is not awaiting verification.", 409, "BAD_STATE")

    if data["action"] == "reject":
        order.status = "rejected"
        order.payment_status = "rejected"
        order.rejection_reason = data["reason"] or "Payment could not be verified."
        order.verified_by = user["id"]
        order.save()
        repo.audit(
            client_id=user["clientId"], user_id=user["id"], action="order.payment_rejected",
            entity="order", entity_id=order.id, metadata={"reason": data["reason"]},
        )
        order.refresh_from_db()
        return ok({"order": order_json(order, include_items=True)})

    # approve
    order.status = "paid"
    order.payment_status = "verified"
    order.payment_verified_at = datetime.now(timezone.utc)
    order.verified_by = user["id"]
    order.save()
    repo.audit(
        client_id=user["clientId"], user_id=user["id"], action="order.payment_verified",
        entity="order", entity_id=order.id,
    )

    fulfilled = fulfill_order(order.id)
    return ok({"order": order_json(fulfilled, include_items=True)})
