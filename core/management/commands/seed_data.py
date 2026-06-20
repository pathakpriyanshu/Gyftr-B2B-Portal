"""
Seed the demo dataset — mirrors `supabase/seed.sql` and `src/lib/db/memory.ts`.

Idempotent: skips if the demo client already exists, unless --reset is passed.
Demo accounts (OTP printed to console in dev mode):
  admin@acme.test · finance@acme.test · procurement@acme.test · viewer@acme.test
"""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import (
    AppUser,
    Brand,
    Client,
    Ratecard,
    Sequence,
    Wallet,
    WalletTransaction,
)

DEMO_CLIENT_ID = "11111111-1111-1111-1111-111111111111"
DENOMS = [250, 500, 1000, 2000, 5000, 10000]

BRANDS = [
    ("AMZN", "Amazon Shopping", "amazon", "E-commerce", "amazon.in", 4.0),
    ("FLPK", "Flipkart", "flipkart", "E-commerce", "flipkart.com", 3.5),
    ("MYNT", "Myntra", "myntra", "Fashion", "myntra.com", 6.0),
    ("SWGY", "Swiggy", "swiggy", "Food", "swiggy.com", 5.0),
    ("ZOMT", "Zomato", "zomato", "Food", "zomato.com", 5.0),
    ("BMS", "BookMyShow", "bookmyshow", "Entertainment", "bookmyshow.com", 7.0),
    ("TAJ", "Taj Experiences", "taj", "Travel", "tajhotels.com", 8.0),
    ("UBER", "Uber", "uber", "Travel", "uber.com", 4.5),
    ("CROMA", "Croma", "croma", "Electronics", "croma.com", 3.0),
    ("NYKA", "Nykaa", "nykaa", "Beauty", "nykaa.com", 6.5),
    ("PVR", "PVR Cinemas", "pvr", "Entertainment", "pvrcinemas.com", 7.0),
    ("LIFE", "Lifestyle", "lifestyle", "Fashion", "lifestylestores.com", 6.0),
]

USERS = [
    ("admin@acme.test", "Ramchandra Admin", "admin"),
    ("finance@acme.test", "Raghav Finance", "finance"),
    ("procurement@acme.test", "Madhav Procurement", "procurement"),
    ("viewer@acme.test", "Vikram Viewer", "viewer"),
]


class Command(BaseCommand):
    help = "Seed the demo client, users, brands, ratecards and wallet."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset", action="store_true",
            help="Wipe all data and reseed from scratch.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write("Resetting all data…")
            for model in (
                WalletTransaction, Wallet, Ratecard, Brand, AppUser, Client, Sequence,
            ):
                model.objects.all().delete()

        if Client.objects.filter(id=DEMO_CLIENT_ID).exists():
            self.stdout.write(self.style.WARNING(
                "Demo client already present — nothing to seed. Use --reset to reseed."
            ))
            return

        client = Client.objects.create(
            id=DEMO_CLIENT_ID,
            name="HDFC Corporation",
            legal_name="HDFC Corporation Pvt. Ltd.",
            logo_url=None,
            gst_number="06AABCA1234A1Z5",
            status="active",
            allow_wallet=True,
            allow_bank_transfer=True,
        )

        for email, full_name, role in USERS:
            AppUser.objects.create(
                client=client, email=email, full_name=full_name,
                role=role, status="active",
            )

        Wallet.objects.create(client=client, balance=Decimal("500000"), currency="INR")
        WalletTransaction.objects.create(
            client=client, type="credit", amount=Decimal("500000"),
            balance_after=Decimal("500000"), reference="TOPUP-INIT",
            description="Initial wallet top-up",
        )

        for i, (ext, name, slug, category, domain, disc) in enumerate(BRANDS):
            brand = Brand.objects.create(
                id=f"21111111-0000-0000-0000-0000000000{str(i + 1).zfill(2)}",
                external_id=ext,
                name=name,
                slug=slug,
                category=category,
                logo_url=f"https://logo.clearbit.com/{domain}",
                description=f"{name} gift vouchers — redeemable across {name} platforms.",
                terms="Valid for 12 months from date of issue. Not redeemable for cash.",
                default_discount_pct=Decimal(str(disc)),
                status="active",
                sort_order=i + 1,
                denominations=DENOMS,
            )
            Ratecard.objects.create(
                client=client, brand=brand,
                discount_pct=Decimal(str(disc)) + Decimal("1.5"),
            )

        Sequence.objects.update_or_create(key="order", defaults={"value": 1000})

        self.stdout.write(self.style.SUCCESS(
            f"Seeded demo client '{client.name}', {len(USERS)} users, "
            f"{len(BRANDS)} brands, wallet INR 5,00,000."
        ))
