"""
Domain data-access operations that carry logic (wallet math, order numbering,
download tokens, audit). Plain ORM reads live directly in the views.
"""
import secrets
from datetime import datetime, timezone

from django.db import transaction

from core.models import (
    AuditLog,
    Brand,
    DownloadToken,
    Ratecard,
    Sequence,
    Wallet,
    WalletTransaction,
)
from core.services.money import money


def audit(*, client_id=None, user_id=None, action, entity=None, entity_id=None, metadata=None):
    AuditLog.objects.create(
        client_id=client_id,
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        metadata=metadata or {},
    )


# ---------------------------------------------------------------------------
#  Catalog — effective (ratecard or default) discount per client
# ---------------------------------------------------------------------------
def list_brands_for_client(client_id) -> list[dict]:
    """Returns [{'brand': Brand, 'discountPct': Decimal}] for active brands."""
    brands = list(Brand.objects.filter(status="active").order_by("sort_order"))
    rates = {
        rc.brand_id: rc.discount_pct
        for rc in Ratecard.objects.filter(client_id=client_id)
    }
    return [
        {"brand": b, "discountPct": rates.get(b.id, b.default_discount_pct)}
        for b in brands
    ]


def get_brand_for_client(client_id, brand_id):
    b = Brand.objects.filter(id=brand_id).first()
    if not b:
        return None
    rc = Ratecard.objects.filter(client_id=client_id, brand_id=brand_id).first()
    return {"brand": b, "discountPct": rc.discount_pct if rc else b.default_discount_pct}


# ---------------------------------------------------------------------------
#  Wallet
# ---------------------------------------------------------------------------
class InsufficientBalance(Exception):
    pass


@transaction.atomic
def debit_wallet(client_id, amount, reference, description) -> WalletTransaction:
    wallet = Wallet.objects.select_for_update().filter(client_id=client_id).first()
    if not wallet:
        raise ValueError("Wallet not found")
    amt = money(amount)
    if wallet.balance < amt:
        raise InsufficientBalance("INSUFFICIENT_BALANCE")
    wallet.balance = money(wallet.balance - amt)
    wallet.save(update_fields=["balance"])
    return WalletTransaction.objects.create(
        client_id=client_id,
        type="debit",
        amount=amt,
        balance_after=wallet.balance,
        reference=reference,
        description=description,
    )


@transaction.atomic
def credit_wallet(client_id, amount, reference, description, type="credit") -> WalletTransaction:
    wallet = Wallet.objects.select_for_update().filter(client_id=client_id).first()
    if not wallet:
        raise ValueError("Wallet not found")
    amt = money(amount)
    wallet.balance = money(wallet.balance + amt)
    wallet.save(update_fields=["balance"])
    return WalletTransaction.objects.create(
        client_id=client_id,
        type=type,
        amount=amt,
        balance_after=wallet.balance,
        reference=reference,
        description=description,
    )


# ---------------------------------------------------------------------------
#  Order numbering
# ---------------------------------------------------------------------------
@transaction.atomic
def next_order_number() -> str:
    seq, _ = Sequence.objects.select_for_update().get_or_create(
        key="order", defaults={"value": 1000}
    )
    seq.value += 1
    seq.save(update_fields=["value"])
    year = datetime.now(timezone.utc).year
    return f"GYF{year}{seq.value:06d}"


# ---------------------------------------------------------------------------
#  Download tokens
# ---------------------------------------------------------------------------
def get_or_create_download_token(order, email) -> DownloadToken:
    existing = DownloadToken.objects.filter(order=order).first()
    if existing:
        return existing
    return DownloadToken.objects.create(
        order=order,
        token=secrets.token_urlsafe(24),
        email=email,
    )
