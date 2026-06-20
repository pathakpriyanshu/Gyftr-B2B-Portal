from django.contrib import admin

from core import models

for _model in (
    models.Client,
    models.AppUser,
    models.Brand,
    models.Ratecard,
    models.Wallet,
    models.WalletTransaction,
    models.Cart,
    models.Order,
    models.OrderItem,
    models.Voucher,
    models.LoginOtp,
    models.DownloadToken,
    models.AuditLog,
    models.Sequence,
):
    try:
        admin.site.register(_model)
    except admin.sites.AlreadyRegistered:
        pass
