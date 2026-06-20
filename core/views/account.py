"""Dashboard, checkout config, and wallet endpoints."""
from django.conf import settings

from core.http import current_user, fail, ok
from core.models import Client, Order, Wallet, WalletTransaction
from core.serialize import num, order_json, wallet_txn_json

PENDING_STATUSES = {"pending_payment", "under_verification", "processing", "paid"}


def dashboard(request):
    if request.method != "GET":
        return fail("Method not allowed", 405)
    user = current_user(request)
    if not user:
        return fail("Not authenticated", 401, "UNAUTHENTICATED")

    client_id = user["clientId"]
    wallet = Wallet.objects.filter(client_id=client_id).first()
    orders = list(Order.objects.filter(client_id=client_id).order_by("-created_at"))

    last_order = order_json(orders[0], include_items=False) if orders else None
    stats = {
        "walletBalance": num(wallet.balance) if wallet else 0,
        "walletCurrency": wallet.currency if wallet else "INR",
        "totalOrders": len(orders),
        "pendingOrders": sum(1 for o in orders if o.status in PENDING_STATUSES),
        "fulfilledOrders": sum(1 for o in orders if o.status == "fulfilled"),
        "lastOrder": last_order,
    }
    recent = [order_json(o, include_items=False) for o in orders[:6]]
    return ok({"stats": stats, "orders": recent})


def config(request):
    if request.method != "GET":
        return fail("Method not allowed", 405)
    user = current_user(request)
    if not user:
        return fail("Not authenticated", 401, "UNAUTHENTICATED")

    client = Client.objects.filter(id=user["clientId"]).first()
    bank = settings.APP["bank"]
    return ok({
        "paymentMethods": {
            "wallet": client.allow_wallet if client else True,
            "bankTransfer": client.allow_bank_transfer if client else True,
        },
        "bank": {
            "accountName": bank["account_name"],
            "accountNumber": bank["account_number"],
            "ifsc": bank["ifsc"],
            "bankName": bank["bank_name"],
            "branch": bank["branch"],
        },
        "client": (
            {"id": client.id, "name": client.name, "gstNumber": client.gst_number}
            if client else None
        ),
    })


def wallet(request):
    if request.method != "GET":
        return fail("Method not allowed", 405)
    user = current_user(request)
    if not user:
        return fail("Not authenticated", 401, "UNAUTHENTICATED")

    client_id = user["clientId"]
    w = Wallet.objects.filter(client_id=client_id).first()
    txns = WalletTransaction.objects.filter(client_id=client_id).order_by("-created_at")[:200]
    return ok({
        "wallet": {
            "clientId": client_id,
            "balance": num(w.balance) if w else 0,
            "currency": w.currency if w else "INR",
        },
        "transactions": [wallet_txn_json(t) for t in txns],
    })
