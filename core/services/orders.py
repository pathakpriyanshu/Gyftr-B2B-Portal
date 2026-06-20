"""Order fulfillment — mirrors `src/lib/orders.ts`. Idempotent."""
from django.conf import settings

from core import repo
from core.models import AppUser, Order, Voucher
from core.services import email as email_service
from core.services.excel import generate_voucher_workbook
from core.services.gyftr import issue_vouchers
from core.services.storage import upload_file


def fulfill_order(order_id: str):
    order = Order.objects.filter(id=order_id).first()
    if not order:
        return None
    if order.status == "fulfilled":
        return order

    order.status = "processing"
    order.save(update_fields=["status"])

    # 1. issue vouchers (idempotent — skip if already issued)
    if not order.vouchers.exists():
        new_vouchers = issue_vouchers(order.order_number, list(order.items.all()))
        Voucher.objects.bulk_create([
            Voucher(
                order=order,
                order_item_id=v["orderItemId"],
                brand_id=v["brandId"],
                brand_name=v["brandName"],
                denomination=v["denomination"],
                code=v["code"],
                pin=v["pin"],
                expiry_date=v["expiryDate"],
                status="issued",
            )
            for v in new_vouchers
        ])

    vouchers = list(order.vouchers.all())

    # 2. generate + store the Excel file (best-effort; regenerated on download)
    try:
        buffer = generate_voucher_workbook(order, vouchers)
        upload_file(
            "voucher-files",
            f"{order.order_number}.xlsx",
            buffer,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    except Exception:
        pass

    # 3. secure download token + email link
    user = AppUser.objects.filter(id=order.user_id).first()
    email = user.email if user else ""
    token = repo.get_or_create_download_token(order, email)

    order.status = "fulfilled"
    order.save(update_fields=["status"])

    if email:
        link = f"{settings.APP['frontend_url']}/download/{token.token}"
        tmpl = email_service.download_link_email(order.order_number, link)
        email_service.send_email(to=email, subject=tmpl["subject"], html=tmpl["html"], text=tmpl["text"])

    repo.audit(
        client_id=order.client_id,
        user_id=order.user_id,
        action="order.fulfilled",
        entity="order",
        entity_id=order.id,
        metadata={"vouchers": len(vouchers)},
    )

    order.refresh_from_db()
    return order
