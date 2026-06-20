"""URL map — paths match the Next.js API routes exactly (no trailing slashes)."""
from django.urls import path

from core.views import account, admin as admin_views, auth, catalog, cart, download, files, orders, users

urlpatterns = [
    # --- auth ---
    path("api/auth/request-otp", auth.request_otp),
    path("api/auth/verify-otp", auth.verify_otp),
    path("api/auth/me", auth.me),
    path("api/auth/logout", auth.logout),

    # --- catalog ---
    path("api/brands", catalog.brands_list),
    path("api/brands/<str:brand_id>", catalog.brand_detail),

    # --- account ---
    path("api/dashboard", account.dashboard),
    path("api/config", account.config),
    path("api/wallet", account.wallet),

    # --- cart ---
    path("api/cart", cart.cart),

    # --- orders (specific before generic) ---
    path("api/orders", orders.orders_list_create),
    path("api/orders/<str:ident>/download-link", orders.order_download_link),
    path("api/orders/<str:ident>", orders.order_detail),

    # --- admin / finance ---
    path("api/admin/orders", admin_views.pending_verifications),
    path("api/admin/orders/<str:ident>/verify", admin_views.verify_order),

    # --- users ---
    path("api/users", users.users_list_create),
    path("api/users/<str:ident>", users.user_update),

    # --- files ---
    path("api/upload", files.upload),
    path("api/files/<path:path>", files.files),

    # --- voucher download (specific before generic) ---
    path("api/download/<str:token>/request-otp", download.download_request_otp),
    path("api/download/<str:token>/verify-otp", download.download_verify_otp),
    path("api/download/<str:token>/file", download.download_file),
    path("api/download/<str:token>", download.download_info),
]
