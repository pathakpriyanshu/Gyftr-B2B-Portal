"""
Django settings for the Gyftr B2B Voucher Portal backend.

Zero-config defaults: SQLite database, console email, Gyftr mock mode — so the
API runs end-to-end with no external services. Swap in real credentials via the
`.env` file (see `.env.example`).
"""
from pathlib import Path
from urllib.parse import urlparse, unquote

from dotenv import load_dotenv

from core.appconfig import env_bool, env_int, env_str, get_env

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env from the project root (idempotent; real env vars win).
load_dotenv(BASE_DIR / ".env")

# ---------------------------------------------------------------------------
#  Core Django
# ---------------------------------------------------------------------------
SECRET_KEY = env_str(
    "DJANGO_SECRET_KEY",
    # fall back to the JWT secret, then a dev default
    get_env("AUTH_JWT_SECRET") or "dev_only_insecure_django_secret_change_me_now",
)

DEBUG = env_bool("DJANGO_DEBUG", True)

ALLOWED_HOSTS = [h.strip() for h in env_str("DJANGO_ALLOWED_HOSTS", "*").split(",") if h.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "core",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# ---------------------------------------------------------------------------
#  Database — SQLite by default, Postgres/Supabase via DATABASE_URL
# ---------------------------------------------------------------------------
def _database_from_url(url: str):
    p = urlparse(url)
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": unquote(p.path.lstrip("/")),
        "USER": unquote(p.username or ""),
        "PASSWORD": unquote(p.password or ""),
        "HOST": p.hostname or "",
        "PORT": str(p.port or ""),
        "CONN_MAX_AGE": 60,
        "OPTIONS": {"sslmode": "require"} if "supabase" in (p.hostname or "") else {},
    }


_DATABASE_URL = get_env("DATABASE_URL", "").strip()
if _DATABASE_URL.startswith("postgres"):
    DATABASES = {"default": _database_from_url(_DATABASE_URL)}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# The frontend calls bare paths like `/api/brands` (no trailing slash); never
# 301-redirect to add one (would break POST/PATCH bodies).
APPEND_SLASH = False

# Local file storage for payment proofs + generated voucher files.
MEDIA_ROOT = BASE_DIR / "media"

# ---------------------------------------------------------------------------
#  CORS — allow the Next.js frontend to call the API with credentials (cookies)
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in env_str("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
#  Application config (mirrors the Node `src/lib/env.ts`)
# ---------------------------------------------------------------------------
APP = {
    "name": env_str("APP_NAME", "Gyftr B2B Portal"),
    # Public URL of this backend — used to build absolute file URLs.
    "url": env_str("APP_URL", "http://localhost:8000"),
    # Frontend URL — used in emailed download links.
    "frontend_url": env_str("FRONTEND_URL", "http://localhost:3000"),
    "auth": {
        "jwt_secret": env_str(
            "AUTH_JWT_SECRET", "dev_only_insecure_secret_change_me_now_000000"
        ),
        "cookie_name": env_str("SESSION_COOKIE_NAME", "gyftr_b2b_session"),
        "session_ttl_hours": env_int("SESSION_TTL_HOURS", 12),
        "cookie_secure": env_bool("SESSION_COOKIE_SECURE", False),
    },
    "otp": {
        "length": env_int("OTP_LENGTH", 6),
        "ttl_minutes": env_int("OTP_TTL_MINUTES", 5),
        "resend_cooldown_seconds": env_int("OTP_RESEND_COOLDOWN_SECONDS", 30),
        "dev_mode": env_bool("OTP_DEV_MODE", True),
    },
    "email": {
        "provider": env_str("EMAIL_PROVIDER", "console"),
        "from": env_str("EMAIL_FROM", "Gyftr B2B <no-reply@gyftr.net>"),
        "resend_api_key": env_str("RESEND_API_KEY", ""),
    },
    "gyftr": {
        "base_url": env_str("GYFTR_API_BASE_URL", ""),
        "api_key": env_str("GYFTR_API_KEY", ""),
        "catalog_endpoint": env_str("GYFTR_CATALOG_ENDPOINT", "/catalog/brands"),
        "send_voucher_endpoint": env_str("GYFTR_SEND_VOUCHER_ENDPOINT", "/voucher/issue"),
        "use_mock": (
            env_bool("GYFTR_USE_MOCK", True)
            or not get_env("GYFTR_API_KEY")
            or get_env("GYFTR_API_KEY") == "YOUR_GYFTR_API_KEY"
        ),
    },
    "bank": {
        "account_name": env_str("PAYMENT_BANK_ACCOUNT_NAME", "GYFTR pvt. Ltd."),
        "account_number": env_str("PAYMENT_BANK_ACCOUNT_NUMBER", "000111222333444"),
        "ifsc": env_str("PAYMENT_BANK_IFSC", "HDFC0000001"),
        "bank_name": env_str("PAYMENT_BANK_NAME", "HDFC Bank"),
        "branch": env_str("PAYMENT_BANK_BRANCH", "Gurugram"),
    },
}
