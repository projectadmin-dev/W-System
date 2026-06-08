-- =====================================================
-- Seed: Cash/Bank Register (cash-register module)
-- Captured from live tenant 00000000-0000-0000-0000-000000000001.
-- Tables: cash_register_entries (1), petty_cash_custodians (1).
-- money_requests and bank_accounts are EMPTY today.
--
-- EXTERNAL DEPENDENCIES: coa(id) / bank_accounts(id) where referenced.
-- Idempotent: clears these tables for the tenant first.
-- =====================================================

BEGIN;

DELETE FROM public.cash_register_entries WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
INSERT INTO public.cash_register_entries (id, entry_date, entry_type, source_type, source_id, coa_id, account_name, amount, description, reference_number, running_balance, created_by, created_at, updated_at, deleted_at) VALUES
  ('bfd137ce-41aa-491c-b8b8-d7f71180a7bf', '2026-05-18', 'in', 'vendor_payment', NULL, NULL, 'Kas Kecil', '100000.00', '12320420', '123123123', '0.00', NULL, '2026-05-18 09:32:48.700898+00', '2026-05-18 09:32:48.700898+00', NULL);

DELETE FROM public.petty_cash_custodians WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
INSERT INTO public.petty_cash_custodians (id, tenant_id, user_id, custodian_name, department, account_name, opening_balance, current_balance, max_limit, currency, is_active, notes, created_at, updated_at, created_by, updated_by, deleted_at) VALUES
  ('d638a0ee-878a-4c15-b297-4fbb361c5310', '00000000-0000-0000-0000-000000000001', NULL, 'Kas Kecil Kantor Pusat', 'Finance', 'Kas Kecil', '500000.00', '500000.00', '5000000.00', 'IDR', 'true', NULL, '2026-04-25 06:14:07.377529+00', '2026-04-25 06:14:07.377529+00', NULL, NULL, NULL);

COMMIT;
