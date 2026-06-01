-- QUICK SEED: AR Aging Sample Data
-- Copy-paste ini langsung ke Supabase Studio SQL Editor
-- Untuk jalankan: pilih database > SQL > paste ini > Run

-- 1. INSERT CLIENTS
INSERT INTO public.clients (id, tenant_id, code, name, email, phone, address, city, country, created_at, created_by)
VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'CLI-001', 'PT Maju Jaya Sentosa', 'info@majujaya.id', '+62-21-1234001', 'Jl. Sudirman No. 100', 'Jakarta', 'Indonesia', now(), '00000000-0000-0000-0000-000000000002'::uuid),
('aaaaaaaa-aaaa-aaaa-aaaa-000000000002'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'CLI-002', 'PT Sukses Abadi', 'info@sukses.id', '+62-21-1234002', 'Jl. Gatot Subroto No. 50', 'Jakarta', 'Indonesia', now(), '00000000-0000-0000-0000-000000000002'::uuid),
('aaaaaaaa-aaaa-aaaa-aaaa-000000000003'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'CLI-003', 'CV Delta Prima', 'info@deltapri.id', '+62-31-1234003', 'Jl. Urip Sumoharjo No. 200', 'Surabaya', 'Indonesia', now(), '00000000-0000-0000-0000-000000000002'::uuid),
('aaaaaaaa-aaaa-aaaa-aaaa-000000000004'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'CLI-004', 'PT Mitra Sejahtera', 'info@mitrase.id', '+62-24-1234004', 'Jl. Diponegoro No. 75', 'Semarang', 'Indonesia', now(), '00000000-0000-0000-0000-000000000002'::uuid)
ON CONFLICT (id) DO NOTHING;

-- 2. INSERT INVOICES (10 invoices)
INSERT INTO public.invoices (
  id, tenant_id, invoice_number, client_id,
  issue_date, due_date, payment_terms_days,
  line_items, subtotal, tax_rate, tax_amount, discount_amount,
  total_amount, currency, status, amount_paid, amount_due,
  issued_by, created_by, created_at
) VALUES
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'INV-2026-001', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid, '2026-01-10'::date, '2026-01-25'::date, 15, '[{"description":"Consulting Services","quantity":1,"unit_price":50000000,"total":50000000}]'::jsonb, 50000000, 11, 5500000, 0, 55500000, 'IDR', 'overdue', 0, 55500000, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, now()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'INV-2026-002', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002'::uuid, '2026-02-05'::date, '2026-02-20'::date, 15, '[{"description":"IT Support Services","quantity":2,"unit_price":30000000,"total":60000000}]'::jsonb, 60000000, 11, 6600000, 0, 66600000, 'IDR', 'overdue', 0, 66600000, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, now()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'INV-2026-003', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid, '2026-03-01'::date, '2026-03-20'::date, 20, '[{"description":"Development Services","quantity":1,"unit_price":100000000,"total":100000000}]'::jsonb, 100000000, 11, 11000000, 0, 111000000, 'IDR', 'partially_paid', 50000000, 61000000, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, now()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'INV-2026-004', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003'::uuid, '2026-03-10'::date, '2026-03-30'::date, 20, '[{"description":"Training Services","quantity":3,"unit_price":20000000,"total":60000000}]'::jsonb, 60000000, 11, 6600000, 0, 66600000, 'IDR', 'overdue', 0, 66600000, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, now()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'INV-2026-005', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002'::uuid, '2026-04-01'::date, '2026-04-15'::date, 15, '[{"description":"Maintenance Services","quantity":1,"unit_price":40000000,"total":40000000}]'::jsonb, 40000000, 11, 4400000, 0, 44400000, 'IDR', 'overdue', 0, 44400000, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, now()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'INV-2026-006', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004'::uuid, '2026-04-05'::date, '2026-04-20'::date, 15, '[{"description":"Support Services","quantity":2,"unit_price":35000000,"total":70000000}]'::jsonb, 70000000, 11, 7700000, 0, 77700000, 'IDR', 'partially_paid', 30000000, 47700000, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, now()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'INV-2026-007', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid, '2026-05-10'::date, '2026-05-25'::date, 15, '[{"description":"Consulting Hours","quantity":100,"unit_price":500000,"total":50000000}]'::jsonb, 50000000, 11, 5500000, 0, 55500000, 'IDR', 'overdue', 0, 55500000, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, now()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'INV-2026-008', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003'::uuid, '2026-05-20'::date, '2026-06-10'::date, 20, '[{"description":"Project Delivery","quantity":1,"unit_price":80000000,"total":80000000}]'::jsonb, 80000000, 11, 8800000, 0, 88800000, 'IDR', 'sent', 0, 88800000, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, now()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'INV-2026-009', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002'::uuid, '2026-06-01'::date, '2026-06-15'::date, 15, '[{"description":"Services","quantity":1,"unit_price":75000000,"total":75000000}]'::jsonb, 75000000, 11, 8250000, 0, 83250000, 'IDR', 'sent', 0, 83250000, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, now()),
(gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'INV-2026-010', 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004'::uuid, '2026-06-01'::date, '2026-06-20'::date, 20, '[{"description":"Consultation","quantity":1,"unit_price":60000000,"total":60000000}]'::jsonb, 60000000, 11, 6600000, 0, 66600000, 'IDR', 'draft', 0, 66600000, '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, now())
ON CONFLICT (invoice_number) DO NOTHING;
