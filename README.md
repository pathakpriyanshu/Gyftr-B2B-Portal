# Gyftr B2B Voucher Portal — Django Backend

A complete **Python / Django** backend for the Gyftr B2B Gift Voucher Ordering &
Download Portal. It is a drop-in replacement for the original Next.js/Node API
layer: every endpoint, response shape (`{ ok, data }`), error code, OTP/JWT auth
flow, pricing rule, Excel voucher file, and the Gyftr mock is reproduced exactly,
so the existing Next.js frontend runs unchanged against it.

- **Framework:** Django 5.1 (plain views, no DRF — full control of the response envelope)
- **DB:** SQLite by default (zero-config, real migrations + seed); Postgres/Supabase via `DATABASE_URL`
- **Auth:** email-OTP login → HS256 JWT session cookie (`PyJWT`), verifiable by the frontend's `jose`
- **Files:** local-disk storage for payment proofs + generated voucher `.xlsx` (`openpyxl`)
- **External services:** all feature-flagged & mockable (Gyftr issuance, email) — runs end-to-end with no keys

## Quick start

```bash
# 1. create + activate a virtualenv (already created as .venv if you used setup)
python -m venv .venv
.venv\Scripts\activate            # Windows
# source .venv/bin/activate       # macOS/Linux

# 2. install dependencies
pip install -r requirements.txt

# 3. configure env (defaults work out of the box)
copy .env.example .env            # Windows
# cp .env.example .env            # macOS/Linux

# 4. create the database + seed the demo data
python manage.py migrate
python manage.py seed_data

# 5. run the API (port 8000)
python manage.py runserver 8000
```

The API is now at **http://localhost:8000**. Health check: `GET /` → `{"ok": true, ...}`.

### Demo accounts

OTP is printed to the server console **and** returned in the API response while
`OTP_DEV_MODE=true` (so you can sign in without a real mailbox):

| Email | Role |
|-------|------|
| `admin@acme.test` | admin |
| `finance@acme.test` | finance |
| `procurement@acme.test` | procurement |
| `viewer@acme.test` | viewer |

Demo client **HDFC Corporation** starts with a **₹5,00,000** wallet.

## Running with the frontend

The Next.js frontend (in `../B2B-Portal`) is wired to this backend via one env
var. In `../B2B-Portal/.env.local`:

```
NEXT_PUBLIC_API_URL="http://localhost:8000"
AUTH_JWT_SECRET="dev_only_change_me_super_long_random_secret_min_32_chars"
SESSION_COOKIE_NAME="gyftr_b2b_session"
```

`AUTH_JWT_SECRET` and `SESSION_COOKIE_NAME` **must match** this backend's `.env`
so the frontend's middleware/server components can verify the session cookie this
backend issues. Then:

```bash
# terminal 1 — backend
cd b2b-portal-django && python manage.py runserver 8000
# terminal 2 — frontend
cd B2B-Portal && npm run dev
```

Open http://localhost:3000 and sign in. Cookies are shared across the two
`localhost` ports (host-based), and CORS is pre-configured for credentialed
requests from `http://localhost:3000`.

## Project layout

```
config/            Django project (settings, urls, wsgi/asgi)
core/
  models.py        All tables (clients, users, brands, ratecards, wallet,
                   orders, vouchers, otps, download tokens, audit, sequence)
  serialize.py     snake_case models -> camelCase API contract
  validators.py    Request validation (mirrors the Zod schemas + messages)
  http.py          { ok, data } / { ok:false, error, code } envelope + auth helpers
  repo.py          Wallet math, order numbering, tokens, audit
  views/           One module per area (auth, catalog, account, cart, orders,
                   admin, users, files, download)
  urls.py          Paths match the Next.js API routes exactly (no trailing slash)
  services/        jwt_auth, otp, pricing, gyftr (mock), excel, email, storage, orders (fulfillment)
  management/commands/seed_data.py   Demo seed (--reset to wipe + reseed)
smoke_test.py      End-to-end API test of both journeys (run with the server up)
```

## Endpoints

All under `/api`, matching the original contract:

- **Auth:** `POST /auth/request-otp`, `POST /auth/verify-otp`, `GET /auth/me`, `POST /auth/logout`
- **Catalog:** `GET /brands`, `GET /brands/<id>`
- **Account:** `GET /dashboard`, `GET /config`, `GET /wallet`
- **Cart:** `GET|POST /cart`
- **Orders:** `GET|POST /orders`, `GET /orders/<id>`, `GET /orders/<id>/download-link`
- **Finance:** `GET /admin/orders`, `POST /admin/orders/<id>/verify`
- **Users:** `GET|POST /users`, `PATCH /users/<id>`
- **Files:** `POST /upload`, `GET /files/<path>`
- **Voucher download (public):** `GET /download/<token>`, `POST /download/<token>/request-otp`,
  `POST /download/<token>/verify-otp`, `GET /download/<token>/file`

## Testing

With the server running:

```bash
python smoke_test.py
```

Exercises: OTP login + session, brand catalog with client ratecard pricing,
server-side repricing (a tampered 99%-discount line is overridden), wallet order
→ auto-fulfillment → 5 vouchers, valid `.xlsx` (PK magic bytes), wallet debit
accuracy, bank-transfer → finance approval → fulfillment, OTP-gated download,
RBAC (viewer blocked), and insufficient-balance handling (no orphan order).

## Switching to Postgres / Supabase

Set `DATABASE_URL` in `.env`, then `migrate` + `seed_data`:

```
DATABASE_URL="postgres://user:pass@host:5432/dbname"
```

## Production notes

- Set `DJANGO_DEBUG=false`, a strong `DJANGO_SECRET_KEY`, real `DJANGO_ALLOWED_HOSTS`.
- Set `SESSION_COOKIE_SECURE=true` when serving over HTTPS.
- Set `OTP_DEV_MODE=false` and configure `EMAIL_PROVIDER=resend` + `RESEND_API_KEY`.
- Set `GYFTR_USE_MOCK=false` + `GYFTR_API_KEY` to issue real vouchers.
- Put the `CORS_ALLOWED_ORIGINS` to your real frontend origin.
