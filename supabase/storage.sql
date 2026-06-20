-- ============================================================================
--  Storage buckets for payment proofs and generated voucher files.
--  Run after schema.sql. Buckets are PRIVATE — files are served via
--  short-lived signed URLs generated server-side.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('voucher-files', 'voucher-files', false)
on conflict (id) do nothing;

-- No public storage policies: only the service-role key (used by the
-- portal's server routes) may read/write these buckets.
