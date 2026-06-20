"""
Data models for the Gyftr B2B Voucher Portal.

Field names are snake_case (Django idiom); the API serializers in
`core/serialize.py` map them to the camelCase contract the frontend expects.
"""
import uuid

from django.db import models


def _uuid() -> str:
    return str(uuid.uuid4())


class Client(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=_uuid, editable=False)
    name = models.CharField(max_length=200)
    legal_name = models.CharField(max_length=200, null=True, blank=True)
    logo_url = models.CharField(max_length=500, null=True, blank=True)
    gst_number = models.CharField(max_length=32, null=True, blank=True)
    status = models.CharField(max_length=20, default="active")
    allow_wallet = models.BooleanField(default=True)
    allow_bank_transfer = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class AppUser(models.Model):
    ROLE_CHOICES = [
        ("admin", "admin"),
        ("finance", "finance"),
        ("procurement", "procurement"),
        ("viewer", "viewer"),
    ]
    STATUS_CHOICES = [
        ("active", "active"),
        ("disabled", "disabled"),
        ("invited", "invited"),
    ]
    id = models.CharField(primary_key=True, max_length=64, default=_uuid, editable=False)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="users")
    email = models.CharField(max_length=255, unique=True)
    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="viewer")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    last_login_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} <{self.email}>"


class Brand(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=_uuid, editable=False)
    external_id = models.CharField(max_length=32, null=True, blank=True)
    name = models.CharField(max_length=200)
    slug = models.CharField(max_length=120, null=True, blank=True)
    category = models.CharField(max_length=80, null=True, blank=True)
    logo_url = models.CharField(max_length=500, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    terms = models.TextField(null=True, blank=True)
    default_discount_pct = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default="active")
    sort_order = models.IntegerField(default=0)
    denominations = models.JSONField(default=list)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return self.name


class Ratecard(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="ratecards")
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name="ratecards")
    discount_pct = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    class Meta:
        unique_together = ("client", "brand")


class Wallet(models.Model):
    client = models.OneToOneField(Client, on_delete=models.CASCADE, related_name="wallet")
    balance = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="INR")


class WalletTransaction(models.Model):
    TYPE_CHOICES = [("credit", "credit"), ("debit", "debit"), ("refund", "refund")]
    id = models.CharField(primary_key=True, max_length=64, default=_uuid, editable=False)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="wallet_txns")
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    balance_after = models.DecimalField(max_digits=14, decimal_places=2)
    reference = models.CharField(max_length=120, null=True, blank=True)
    description = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Cart(models.Model):
    user = models.OneToOneField(AppUser, on_delete=models.CASCADE, related_name="cart")
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="carts")
    lines = models.JSONField(default=list)
    updated_at = models.DateTimeField(auto_now=True)


class Order(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=_uuid, editable=False)
    order_number = models.CharField(max_length=32, unique=True)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name="orders")
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name="orders")
    status = models.CharField(max_length=24, default="pending_payment")
    total_face_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_discount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    payable_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_quantity = models.IntegerField(default=0)
    payment_method = models.CharField(max_length=20, null=True, blank=True)
    payment_status = models.CharField(max_length=24, default="unpaid")
    payment_proof_url = models.CharField(max_length=500, null=True, blank=True)
    utr_number = models.CharField(max_length=40, null=True, blank=True)
    payment_submitted_at = models.DateTimeField(null=True, blank=True)
    payment_verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.CharField(max_length=64, null=True, blank=True)
    rejection_reason = models.CharField(max_length=300, null=True, blank=True)
    placed_by_name = models.CharField(max_length=200, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class OrderItem(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=_uuid, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    brand_id = models.CharField(max_length=64)
    brand_name = models.CharField(max_length=200)
    brand_logo_url = models.CharField(max_length=500, null=True, blank=True)
    denomination = models.IntegerField()
    quantity = models.IntegerField()
    discount_pct = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    face_value_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    discount_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    final_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ["id"]


class Voucher(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=_uuid, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="vouchers")
    order_item_id = models.CharField(max_length=64, null=True, blank=True)
    brand_id = models.CharField(max_length=64, null=True, blank=True)
    brand_name = models.CharField(max_length=200)
    denomination = models.IntegerField()
    code = models.CharField(max_length=80)
    pin = models.CharField(max_length=20, null=True, blank=True)
    expiry_date = models.CharField(max_length=20, null=True, blank=True)
    status = models.CharField(max_length=20, default="issued")

    class Meta:
        ordering = ["id"]


class LoginOtp(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=_uuid, editable=False)
    email = models.CharField(max_length=255)
    otp_hash = models.CharField(max_length=128)
    expires_at = models.DateTimeField()
    attempts = models.IntegerField(default=0)
    consumed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class DownloadToken(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=_uuid, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="download_tokens")
    token = models.CharField(max_length=80, unique=True)
    email = models.CharField(max_length=255)
    otp_hash = models.CharField(max_length=128, null=True, blank=True)
    otp_expires_at = models.DateTimeField(null=True, blank=True)
    otp_sent_at = models.DateTimeField(null=True, blank=True)
    attempts = models.IntegerField(default=0)
    verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class AuditLog(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=_uuid, editable=False)
    client_id = models.CharField(max_length=64, null=True, blank=True)
    user_id = models.CharField(max_length=64, null=True, blank=True)
    action = models.CharField(max_length=80)
    entity = models.CharField(max_length=80, null=True, blank=True)
    entity_id = models.CharField(max_length=64, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class Sequence(models.Model):
    """Monotonic counter for human-readable order numbers (seeds at 1000)."""
    key = models.CharField(primary_key=True, max_length=40)
    value = models.BigIntegerField(default=0)
