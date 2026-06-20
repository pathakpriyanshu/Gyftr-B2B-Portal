-- ============================================================================
--  Gyftr B2B Voucher Portal — Database Schema (PostgreSQL / Supabase)
--  Run this in the Supabase SQL editor (or `supabase db push`).
--  Idempotent-ish: safe to re-run on a fresh project.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
--  ENUMS
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'finance', 'procurement', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('active', 'disabled', 'invited');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum (
    'pending_payment',   -- order created, awaiting payment submission
    'under_verification',-- payment submitted (bank transfer), awaiting finance approval
    'paid',              -- payment verified / wallet debited
    'processing',        -- vouchers being issued via Gyftr API
    'fulfilled',         -- vouchers issued, ready for download
    'cancelled',
    'rejected'           -- payment rejected by finance
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('wallet', 'bank_transfer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('unpaid', 'received', 'under_verification', 'verified', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type wallet_txn_type as enum ('credit', 'debit', 'refund');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
--  CLIENTS  (corporate accounts)
-- ---------------------------------------------------------------------------
create table if not exists clients (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  legal_name      text,
  logo_url        text,
  gst_number      text,
  status          text not null default 'active',  -- active | disabled
  -- which payment methods this client may use
  allow_wallet    boolean not null default true,
  allow_bank_transfer boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  USERS  (one user belongs to exactly one client)
-- ---------------------------------------------------------------------------
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  email           text not null unique,
  full_name       text not null,
  phone           text,
  role            user_role not null default 'procurement',
  status          user_status not null default 'active',
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists users_client_idx on users(client_id);

-- ---------------------------------------------------------------------------
--  WALLET  (one wallet per client)
-- ---------------------------------------------------------------------------
create table if not exists wallets (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null unique references clients(id) on delete cascade,
  balance         numeric(14,2) not null default 0,
  currency        text not null default 'INR',
  updated_at      timestamptz not null default now()
);

create table if not exists wallet_transactions (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  type            wallet_txn_type not null,
  amount          numeric(14,2) not null,
  balance_after   numeric(14,2) not null,
  reference       text,                       -- order number / topup ref
  description     text,
  created_by      uuid references users(id),
  created_at      timestamptz not null default now()
);
create index if not exists wallet_txn_client_idx on wallet_transactions(client_id, created_at desc);

-- ---------------------------------------------------------------------------
--  CATALOG: BRANDS + DENOMINATIONS  (synced from Gyftr Catalog API)
-- ---------------------------------------------------------------------------
create table if not exists brands (
  id              uuid primary key default gen_random_uuid(),
  external_id     text unique,                -- id in the Gyftr catalog
  name            text not null,
  slug            text unique,
  category        text,
  logo_url        text,
  description     text,
  terms           text,
  -- default discount % off face value (client ratecard overrides this)
  default_discount_pct numeric(6,2) not null default 0,
  status          text not null default 'active',  -- active | inactive
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists brands_category_idx on brands(category);

create table if not exists denominations (
  id              uuid primary key default gen_random_uuid(),
  brand_id        uuid not null references brands(id) on delete cascade,
  face_value      numeric(12,2) not null,
  status          text not null default 'active',
  unique (brand_id, face_value)
);
create index if not exists denominations_brand_idx on denominations(brand_id);

-- ---------------------------------------------------------------------------
--  RATECARDS  (client-specific discount per brand — overrides default)
-- ---------------------------------------------------------------------------
create table if not exists ratecards (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id) on delete cascade,
  brand_id        uuid not null references brands(id) on delete cascade,
  discount_pct    numeric(6,2) not null default 0,
  updated_at      timestamptz not null default now(),
  unique (client_id, brand_id)
);

-- ---------------------------------------------------------------------------
--  CARTS  (persisted across sessions, one active cart per user)
-- ---------------------------------------------------------------------------
create table if not exists carts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  client_id       uuid not null references clients(id) on delete cascade,
  updated_at      timestamptz not null default now(),
  unique (user_id)
);

create table if not exists cart_items (
  id              uuid primary key default gen_random_uuid(),
  cart_id         uuid not null references carts(id) on delete cascade,
  brand_id        uuid not null references brands(id),
  denomination    numeric(12,2) not null,
  quantity        int not null check (quantity > 0),
  discount_pct    numeric(6,2) not null default 0,
  created_at      timestamptz not null default now(),
  unique (cart_id, brand_id, denomination)
);

-- ---------------------------------------------------------------------------
--  ORDERS
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null unique,
  client_id           uuid not null references clients(id),
  user_id             uuid not null references users(id),
  status              order_status not null default 'pending_payment',
  total_face_value    numeric(14,2) not null default 0,
  total_discount      numeric(14,2) not null default 0,
  payable_amount      numeric(14,2) not null default 0,
  total_quantity      int not null default 0,
  payment_method      payment_method,
  payment_status      payment_status not null default 'unpaid',
  payment_proof_url   text,
  utr_number          text,
  payment_submitted_at timestamptz,
  payment_verified_at timestamptz,
  verified_by         uuid references users(id),
  rejection_reason    text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists orders_client_idx on orders(client_id, created_at desc);
create index if not exists orders_status_idx on orders(status);

create table if not exists order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  brand_id        uuid not null references brands(id),
  brand_name      text not null,
  brand_logo_url  text,
  denomination    numeric(12,2) not null,
  quantity        int not null,
  discount_pct    numeric(6,2) not null,
  face_value_total numeric(14,2) not null,   -- denomination * quantity
  discount_total   numeric(14,2) not null,
  final_price      numeric(14,2) not null,   -- payable for this line
  created_at      timestamptz not null default now()
);
create index if not exists order_items_order_idx on order_items(order_id);

-- ---------------------------------------------------------------------------
--  VOUCHERS  (issued after payment verification)
-- ---------------------------------------------------------------------------
create table if not exists vouchers (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  order_item_id   uuid references order_items(id) on delete cascade,
  brand_id        uuid references brands(id),
  brand_name      text not null,
  denomination    numeric(12,2) not null,
  code            text not null,
  pin             text,
  expiry_date     date,
  status          text not null default 'issued',  -- issued | redeemed
  created_at      timestamptz not null default now()
);
create index if not exists vouchers_order_idx on vouchers(order_id);

-- ---------------------------------------------------------------------------
--  VOUCHER DOWNLOAD TOKENS  (secure, OTP-gated email link)
-- ---------------------------------------------------------------------------
create table if not exists voucher_download_tokens (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  token           text not null unique,       -- random url-safe token (in email link)
  email           text not null,
  otp_hash        text,                        -- hashed current OTP
  otp_expires_at  timestamptz,
  otp_sent_at     timestamptz,
  attempts        int not null default 0,
  verified        boolean not null default false,
  verified_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists vdt_order_idx on voucher_download_tokens(order_id);

-- ---------------------------------------------------------------------------
--  LOGIN OTP CODES
-- ---------------------------------------------------------------------------
create table if not exists login_otps (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  otp_hash        text not null,
  expires_at      timestamptz not null,
  attempts        int not null default 0,
  consumed        boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists login_otps_email_idx on login_otps(email, created_at desc);

-- ---------------------------------------------------------------------------
--  AUDIT LOG
-- ---------------------------------------------------------------------------
create table if not exists audit_logs (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid references clients(id),
  user_id         uuid references users(id),
  action          text not null,
  entity          text,
  entity_id       text,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists audit_logs_client_idx on audit_logs(client_id, created_at desc);

-- ---------------------------------------------------------------------------
--  updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['clients','users','brands','orders']
  loop
    execute format(
      'drop trigger if exists trg_%1$s_updated on %1$s;
       create trigger trg_%1$s_updated before update on %1$s
       for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
--  ROW LEVEL SECURITY
--  The portal talks to the DB with the service-role key from server-side
--  route handlers (after verifying our own JWT session), so RLS is enabled
--  with no public policies — the anon/public role cannot read anything.
-- ---------------------------------------------------------------------------
alter table clients enable row level security;
alter table users enable row level security;
alter table wallets enable row level security;
alter table wallet_transactions enable row level security;
alter table brands enable row level security;
alter table denominations enable row level security;
alter table ratecards enable row level security;
alter table carts enable row level security;
alter table cart_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table vouchers enable row level security;
alter table voucher_download_tokens enable row level security;
alter table login_otps enable row level security;
alter table audit_logs enable row level security;
