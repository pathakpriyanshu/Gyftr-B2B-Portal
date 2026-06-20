# Gyftr B2B — Gift Voucher Ordering & Download Portal

A production-grade B2B web portal that lets corporate clients **bulk-order gift vouchers
across multiple brands**, pay via **wallet or bank transfer**, and **securely download
vouchers** (OTP-protected Excel) after payment verification.

Built from the product PRD and Figma flows. Covers both end-to-end journeys:
**Order Placement & Payment** and **Voucher Download**.

---

## ✨ Features

| Area | What's included |
|------|-----------------|
| **Auth** | Passwordless email-OTP login, JWT httpOnly sessions, role-based access |
| **Roles** | `admin`, `finance`, `procurement`, `viewer` — one user → one client |
| **Dashboard** | Wallet balance, total orders, last order status, recent orders |
| **Catalog** | Brand grid, sticky search, category filters, per-client rate cards |
| **Configure** | Denomination + quantity picker with **real-time pricing breakdown** |
| **Cart** | Persisted across sessions (localStorage **and** server), edit/remove, live totals |
| **Checkout** | Step-based: order summary → payment (wallet / bank transfer + proof upload) |
| **Payments** | Wallet (instant) · Bank transfer (UTR + receipt → finance verification) |
| **Fulfilment** | Voucher issuance via Gyftr API (mockable), `.xlsx` generation |
| **Download** | Secure email link → OTP verification → Excel with codes & PINs |
| **Finance** | Verification queue to approve/reject bank-transfer payments |
| **Users** | Admin user management with roles & enable/disable |
| **Wallet** | Balance + full transaction history |

---

## 🧱 Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** with a hand-built shadcn-style component library (no Radix dependency)
- **Supabase** (PostgreSQL + Storage) for production data & file storage
- **jose** for JWT sessions · custom OTP (HMAC-SHA256, never stored in plaintext)
- **ExcelJS** for voucher file generation
- **Zustand** (cart) · **TanStack Query** (data fetching) · **Zod** (validation) · **Sonner** (toasts)

---

## 🚀 Quick start (zero config)

The app ships with an **in-memory, file-persisted data backend** seeded with a demo
client, users, wallet, and brand catalog — so it runs end-to-end with **no external
services**.

```bash
npm install
npm run dev
# → http://localhost:3000
```

### Demo accounts

OTP is **printed on screen / in the server console** while `OTP_DEV_MODE=true`.

| Email | Role | Can |
|-------|------|-----|
| `admin@acme.test` | Administrator | Everything + manage users |
| `finance@acme.test` | Finance | Verify bank-transfer payments |
| `procurement@acme.test` | Procurement | Place orders |
| `viewer@acme.test` | Viewer | Read-only |

The demo wallet starts with **₹5,00,000**.

---

## 🔌 Going to production (Supabase + real keys)

1. Copy env and fill in real values:
   ```bash
   cp .env.example .env.local
   ```
2. Create a Supabase project, then in the SQL editor run, in order:
   - `supabase/schema.sql`
   - `supabase/storage.sql`
   - `supabase/seed.sql` (optional demo data)
3. Set in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `AUTH_JWT_SECRET` (generate: `openssl rand -base64 48`)
   - `DB_BACKEND=supabase` (or leave unset — it auto-detects when Supabase creds are present)
4. **Email**: set `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` (or `smtp`) to send real OTP emails.
   Defaults to console logging.
5. **Gyftr APIs**: set `GYFTR_API_KEY`, `GYFTR_API_BASE_URL`, and `GYFTR_USE_MOCK=false`
   to issue real vouchers via the Catalog / Send-Voucher APIs.
6. **Bank details** shown at checkout come from the `PAYMENT_BANK_*` env vars.

Every external integration is **feature-flagged and mockable**, so you can flip them on
one at a time. See `.env.example` for the full list (each placeholder is tagged
`YOUR_…`).

---

## 🗂️ Project structure

```
src/
  app/
    (app)/            # authenticated portal (sidebar shell)
      dashboard, brands, brands/[id], cart, checkout, checkout/confirmation,
      orders, orders/[id], wallet, users, settings, support, admin
    login/            # email-OTP sign in
    download/[token]/ # public OTP-gated voucher download (Journey 2)
    api/              # route handlers (auth, brands, cart, orders, wallet, users,
                      #   admin verify, upload, files, download, config, dashboard)
  components/         # UI library + app shell + domain components
  lib/
    db/               # backend interface + memory & supabase implementations
    auth/             # jwt, otp, session
    email.ts, excel.ts, gyftr.ts, orders.ts, pricing.ts, storage.ts, schemas.ts
  store/cart.ts       # Zustand cart (persisted + server-synced)
  providers/          # React Query, Session context
supabase/             # schema.sql, storage.sql, seed.sql
```

---

## 🔁 Order lifecycle

```
pending_payment ─┬─(wallet, balance ok)──► paid ──► processing ──► fulfilled
                 └─(bank transfer + UTR)──► under_verification ──(finance approve)──► paid ─► … ─► fulfilled
                                                                └──(finance reject)──► rejected
```

On `fulfilled`: vouchers are issued, an `.xlsx` is generated & stored, a secure
download token is created, and an OTP-gated download link is emailed to the buyer.

---

## 🔐 Security notes

- Sessions are signed JWTs in **httpOnly** cookies; middleware guards protected routes.
- OTPs are hashed (HMAC-SHA256), expiring, attempt-limited, and cooldown-rated.
- Order pricing is **always recomputed server-side** from the client rate card — client
  totals are never trusted.
- Storage buckets are **private**; files are served via signed URLs (Supabase) or an
  auth-gated route (local fallback).
- Voucher download requires a valid token **and** a verified OTP.

---

## 📦 Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run start      # run production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```
