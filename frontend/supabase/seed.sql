-- ============================================================================
--  Demo seed data for the Gyftr B2B Voucher Portal.
--  Run after schema.sql. Creates one demo client with users, a funded
--  wallet, a brand catalog with denominations, and a client ratecard.
--
--  Demo login emails (OTP is printed to the server console in dev mode):
--    admin@acme.test        (admin)
--    finance@acme.test      (finance)
--    procurement@acme.test  (procurement)
--    viewer@acme.test       (viewer)
-- ============================================================================

-- --- Client -----------------------------------------------------------------
insert into clients (id, name, legal_name, gst_number, status, allow_wallet, allow_bank_transfer)
values ('11111111-1111-1111-1111-111111111111', 'Acme Corporation',
        'Acme Corporation Pvt. Ltd.', '06AABCA1234A1Z5', 'active', true, true)
on conflict (id) do nothing;

-- --- Users ------------------------------------------------------------------
insert into users (client_id, email, full_name, role, status) values
  ('11111111-1111-1111-1111-111111111111', 'admin@acme.test',       'Aarav Admin',      'admin',       'active'),
  ('11111111-1111-1111-1111-111111111111', 'finance@acme.test',     'Fatima Finance',   'finance',     'active'),
  ('11111111-1111-1111-1111-111111111111', 'procurement@acme.test', 'Priya Procurement','procurement', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'viewer@acme.test',      'Vikram Viewer',    'viewer',      'active')
on conflict (email) do nothing;

-- --- Wallet -----------------------------------------------------------------
insert into wallets (client_id, balance, currency)
values ('11111111-1111-1111-1111-111111111111', 500000.00, 'INR')
on conflict (client_id) do update set balance = excluded.balance;

insert into wallet_transactions (client_id, type, amount, balance_after, reference, description)
values ('11111111-1111-1111-1111-111111111111', 'credit', 500000.00, 500000.00,
        'TOPUP-INIT', 'Initial wallet top-up')
on conflict do nothing;

-- --- Brands -----------------------------------------------------------------
insert into brands (id, external_id, name, slug, category, logo_url, description, default_discount_pct, sort_order) values
  ('21111111-0000-0000-0000-000000000001', 'AMZN', 'Amazon Shopping',  'amazon',     'E-commerce', 'https://logo.clearbit.com/amazon.in',     'Shop millions of products on Amazon.in', 4.00, 1),
  ('21111111-0000-0000-0000-000000000002', 'FLPK', 'Flipkart',         'flipkart',   'E-commerce', 'https://logo.clearbit.com/flipkart.com',  'India''s leading online marketplace',    3.50, 2),
  ('21111111-0000-0000-0000-000000000003', 'MYNT', 'Myntra',           'myntra',     'Fashion',    'https://logo.clearbit.com/myntra.com',    'Fashion and lifestyle destination',      6.00, 3),
  ('21111111-0000-0000-0000-000000000004', 'SWGY', 'Swiggy',           'swiggy',     'Food',       'https://logo.clearbit.com/swiggy.com',    'Food delivery and dining',               5.00, 4),
  ('21111111-0000-0000-0000-000000000005', 'ZOMT', 'Zomato',           'zomato',     'Food',       'https://logo.clearbit.com/zomato.com',    'Order food online',                      5.00, 5),
  ('21111111-0000-0000-0000-000000000006', 'BMS',  'BookMyShow',       'bookmyshow', 'Entertainment','https://logo.clearbit.com/bookmyshow.com','Movies and events',                    7.00, 6),
  ('21111111-0000-0000-0000-000000000007', 'TAJ',  'Taj Experiences',  'taj',        'Travel',     'https://logo.clearbit.com/tajhotels.com', 'Luxury stays and dining',                8.00, 7),
  ('21111111-0000-0000-0000-000000000008', 'UBER', 'Uber',             'uber',       'Travel',     'https://logo.clearbit.com/uber.com',      'Rides and Uber Eats',                    4.50, 8),
  ('21111111-0000-0000-0000-000000000009', 'CROMA','Croma',            'croma',      'Electronics','https://logo.clearbit.com/croma.com',     'Electronics megastore',                  3.00, 9),
  ('21111111-0000-0000-0000-000000000010', 'NYKA', 'Nykaa',            'nykaa',      'Beauty',     'https://logo.clearbit.com/nykaa.com',     'Beauty and wellness',                    6.50, 10),
  ('21111111-0000-0000-0000-000000000011', 'PVR',  'PVR Cinemas',      'pvr',        'Entertainment','https://logo.clearbit.com/pvrcinemas.com','Premium movie experience',             7.00, 11),
  ('21111111-0000-0000-0000-000000000012', 'LIFE', 'Lifestyle',        'lifestyle',  'Fashion',    'https://logo.clearbit.com/lifestylestores.com','Apparel and accessories',          6.00, 12)
on conflict (id) do nothing;

-- --- Denominations ----------------------------------------------------------
insert into denominations (brand_id, face_value)
select b.id, v.face_value
from brands b
cross join (values (250),(500),(1000),(2000),(5000),(10000)) as v(face_value)
on conflict (brand_id, face_value) do nothing;

-- --- Client ratecard (Acme negotiated discounts, override defaults) ---------
insert into ratecards (client_id, brand_id, discount_pct)
select '11111111-1111-1111-1111-111111111111', b.id, b.default_discount_pct + 1.5
from brands b
on conflict (client_id, brand_id) do update set discount_pct = excluded.discount_pct;
