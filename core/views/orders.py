"""Order endpoints — mirrors src/app/api/orders/*."""
from datetime import datetime, timezone

from django.views.decorators.csrf import csrf_exempt

from core import repo
from core.http import can_transact, current_user, fail, ok, read_json
from core.models import AppUser, Client, Order, OrderItem, Wallet
from core.serialize import order_json
from core.services import email as email_service
from core.services.money import format_inr
from core.services.orders import fulfill_order
from core.services.pricing import price_line, summarize
from core.validators import validate_create_order


def _now():
    return datetime.now(timezone.utc)


def _find_order(ident):
    return (
        Order.objects.filter(id=ident).first()
        or Order.objects.filter(order_number=ident).first()
    )


def _brand_map(client_id):
    rows = repo.list_brands_for_client(client_id)
    out = {}
    for r in rows:
        b = r["brand"]
        out[b.id] = {
            "id": b.id,
            "name": b.name,
            "logoUrl": b.logo_url,
            "discountPct": r["discountPct"],
            "denominations": [int(d) for d in b.denominations],
        }
    return out


@csrf_exempt
def orders_list_create(request):
    user = current_user(request)
    if not user:
        return fail("Not authenticated", 401, "UNAUTHENTICATED")

    if request.method == "GET":
        orders = Order.objects.filter(client_id=user["clientId"]).order_by("-created_at")[:100]
        return ok({"orders": [order_json(o, include_items=False) for o in orders]})

    if request.method != "POST":
        return fail("Method not allowed", 405)

    if not can_transact(user["role"]):
        return fail("Your role does not permit placing orders.", 403, "FORBIDDEN")

    data, err = validate_create_order(read_json(request))
    if err:
        return fail(err, 422)
    items, payment = data["items"], data["payment"]

    # --- reprice authoritatively from the client ratecard ---
    brand_map = _brand_map(user["clientId"])
    order_lines = []
    for it in items:
        brand = brand_map.get(it["brandId"])
        if not brand:
            return fail("Unknown brand in cart.", 422, "BAD_BRAND")
        if int(it["denomination"]) not in brand["denominations"]:
            return fail(f"Invalid denomination for {brand['name']}.", 422, "BAD_DENOM")
        order_lines.append(price_line(brand, it["denomination"], it["quantity"]))

    summary = summarize(order_lines)

    # --- validate payment method availability ---
    client = Client.objects.filter(id=user["clientId"]).first()
    if payment["method"] == "wallet" and not (client.allow_wallet if client else True):
        return fail("Wallet payment is not enabled for your account.", 403)
    if payment["method"] == "bank_transfer" and not (client.allow_bank_transfer if client else True):
        return fail("Bank transfer is not enabled for your account.", 403)

    # --- pre-flight checks before creating the order ---
    if payment["method"] == "wallet":
        w = Wallet.objects.filter(client_id=user["clientId"]).first()
        balance = w.balance if w else 0
        if balance < summary["payableAmount"]:
            return fail("Insufficient wallet balance.", 402, "INSUFFICIENT_BALANCE")
    if payment["method"] == "bank_transfer":
        utr = (payment.get("utrNumber") or "").strip()
        if len(utr) < 4:
            return fail("UTR / reference number is required for bank transfer.", 422, "UTR_REQUIRED")

    # --- create the order ---
    order = Order.objects.create(
        order_number=repo.next_order_number(),
        client_id=user["clientId"],
        user_id=user["id"],
        placed_by_name=user["fullName"],
        status="pending_payment",
        total_face_value=summary["totalFaceValue"],
        total_discount=summary["totalDiscount"],
        payable_amount=summary["payableAmount"],
        total_quantity=summary["totalQuantity"],
        payment_status="unpaid",
    )
    OrderItem.objects.bulk_create([
        OrderItem(
            order=order,
            brand_id=l["brandId"],
            brand_name=l["brandName"],
            brand_logo_url=l["brandLogoUrl"],
            denomination=l["denomination"],
            quantity=l["quantity"],
            discount_pct=l["discountPct"],
            face_value_total=l["faceValueTotal"],
            discount_total=l["discountTotal"],
            final_price=l["finalPrice"],
        )
        for l in order_lines
    ])

    # --- process payment ---
    if payment["method"] == "wallet":
        try:
            repo.debit_wallet(
                user["clientId"], order.payable_amount, order.order_number,
                f"Voucher order {order.order_number}",
            )
        except repo.InsufficientBalance:
            order.status = "cancelled"
            order.save(update_fields=["status"])
            return fail("Insufficient wallet balance.", 402, "INSUFFICIENT_BALANCE")

        now = _now()
        order.payment_method = "wallet"
        order.payment_status = "verified"
        order.status = "paid"
        order.payment_submitted_at = now
        order.payment_verified_at = now
        order.save()
        _clear_cart(user["id"])

        fulfill_order(order.id)

        tmpl = email_service.order_confirmation_email(order.order_number, format_inr(order.payable_amount))
        email_service.send_email(to=user["email"], subject=tmpl["subject"], html=tmpl["html"], text=tmpl["text"])

        final = _find_order(order.id)
        return ok({"order": order_json(final, include_items=True), "paymentStatus": "verified"})

    # --- bank transfer → under verification ---
    order.payment_method = "bank_transfer"
    order.payment_status = "under_verification"
    order.status = "under_verification"
    order.utr_number = (payment.get("utrNumber") or "").strip()
    order.payment_proof_url = payment.get("paymentProofUrl") or payment.get("paymentProofKey") or None
    order.payment_submitted_at = _now()
    order.save()
    _clear_cart(user["id"])

    repo.audit(
        client_id=user["clientId"], user_id=user["id"], action="order.placed",
        entity="order", entity_id=order.id,
        metadata={"method": payment["method"], "amount": float(order.payable_amount)},
    )

    tmpl = email_service.order_confirmation_email(order.order_number, format_inr(order.payable_amount))
    email_service.send_email(to=user["email"], subject=tmpl["subject"], html=tmpl["html"], text=tmpl["text"])

    final = _find_order(order.id)
    return ok({"order": order_json(final, include_items=True), "paymentStatus": "under_verification"})


def order_detail(request, ident):
    if request.method != "GET":
        return fail("Method not allowed", 405)
    user = current_user(request)
    if not user:
        return fail("Not authenticated", 401, "UNAUTHENTICATED")

    order = _find_order(ident)
    if not order or order.client_id != user["clientId"]:
        return fail("Order not found", 404)

    voucher_count = order.vouchers.count()
    return ok({"order": order_json(order, include_items=True), "voucherCount": voucher_count})


def order_download_link(request, ident):
    if request.method != "GET":
        return fail("Method not allowed", 405)
    user = current_user(request)
    if not user:
        return fail("Not authenticated", 401, "UNAUTHENTICATED")

    order = _find_order(ident)
    if not order or order.client_id != user["clientId"]:
        return fail("Order not found", 404)
    if order.status != "fulfilled":
        return fail("Vouchers are not ready for this order yet.", 409, "NOT_READY")

    owner = AppUser.objects.filter(id=order.user_id).first()
    token = repo.get_or_create_download_token(order, owner.email if owner else user["email"])
    return ok({"token": token.token, "url": f"/download/{token.token}"})


def _clear_cart(user_id):
    from core.models import Cart

    Cart.objects.filter(user_id=user_id).update(lines=[])
