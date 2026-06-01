-- Seed AR Aging Data: Year-to-Date Invoices
-- This adds sample invoices with various aging periods for demo/testing
-- Current date assumed: 2026-06-01

-- Get default tenant and user IDs
DO $$
DECLARE
  default_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
  default_user_id uuid := '00000000-0000-0000-0000-000000000002';
  sample_client_1 uuid;
  sample_client_2 uuid;
  sample_client_3 uuid;
  sample_client_4 uuid;
  sample_entity_id uuid;
BEGIN

  -- Ensure we have sample clients
  INSERT INTO public.clients (
    id, tenant_id, code, name, email, phone, address, city, country,
    created_at, created_by
  ) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid,
    default_tenant_id,
    'CLI-001',
    'PT Maju Jaya Sentosa',
    'info@majujaya.id',
    '+62-21-123-4001',
    'Jl. Sudirman No. 100',
    'Jakarta',
    'Indonesia',
    now(),
    default_user_id
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000002'::uuid,
    default_tenant_id,
    'CLI-002',
    'PT Sukses Abadi',
    'info@sukses.id',
    '+62-21-123-4002',
    'Jl. Gatot Subroto No. 50',
    'Jakarta',
    'Indonesia',
    now(),
    default_user_id
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000003'::uuid,
    default_tenant_id,
    'CLI-003',
    'CV Delta Prima',
    'info@deltapri.id',
    '+62-31-123-4003',
    'Jl. Urip Sumoharjo No. 200',
    'Surabaya',
    'Indonesia',
    now(),
    default_user_id
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-000000000004'::uuid,
    default_tenant_id,
    'CLI-004',
    'PT Mitra Sejahtera',
    'info@mitrase.id',
    '+62-24-123-4004',
    'Jl. Diponegoro No. 75',
    'Semarang',
    'Indonesia',
    now(),
    default_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001'::uuid INTO sample_client_1;
  SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002'::uuid INTO sample_client_2;
  SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003'::uuid INTO sample_client_3;
  SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004'::uuid INTO sample_client_4;

  -- Get or create entity
  SELECT id INTO sample_entity_id FROM public.entities
  WHERE tenant_id = default_tenant_id LIMIT 1;

  IF sample_entity_id IS NULL THEN
    INSERT INTO public.entities (
      tenant_id, name, code, address, city, created_by
    ) VALUES (
      default_tenant_id, 'Default Entity', 'ENT-001', 'Jakarta', 'Jakarta', default_user_id
    )
    RETURNING id INTO sample_entity_id;
  END IF;

  -- Insert invoices with various aging periods
  -- Year-to-date invoices (January to May) with different payment statuses

  -- January 2026 - OVERDUE (>120 days overdue)
  INSERT INTO public.invoices (
    tenant_id, entity_id, invoice_number, client_id,
    issue_date, due_date, payment_terms_days,
    line_items, subtotal, tax_rate, tax_amount, discount_amount,
    total_amount, currency, status, amount_paid, amount_due,
    issued_by, created_by, created_at
  ) VALUES
  (
    default_tenant_id, sample_entity_id,
    'INV-2026-001',
    sample_client_1,
    '2026-01-10'::date,
    '2026-01-25'::date,
    15,
    '[{"description": "Consulting Services", "quantity": 1, "unit_price": 50000000, "total": 50000000}]'::jsonb,
    50000000, 11, 5500000, 0,
    55500000,
    'IDR',
    'overdue',
    0,
    55500000,
    default_user_id,
    default_user_id,
    now()
  ) ON CONFLICT (invoice_number) DO NOTHING;

  -- February 2026 - OVERDUE (>90 days overdue)
  INSERT INTO public.invoices (
    tenant_id, entity_id, invoice_number, client_id,
    issue_date, due_date, payment_terms_days,
    line_items, subtotal, tax_rate, tax_amount, discount_amount,
    total_amount, currency, status, amount_paid, amount_due,
    issued_by, created_by, created_at
  ) VALUES
  (
    default_tenant_id, sample_entity_id,
    'INV-2026-002',
    sample_client_2,
    '2026-02-05'::date,
    '2026-02-20'::date,
    15,
    '[{"description": "IT Support Services", "quantity": 2, "unit_price": 30000000, "total": 60000000}]'::jsonb,
    60000000, 11, 6600000, 0,
    66600000,
    'IDR',
    'overdue',
    0,
    66600000,
    default_user_id,
    default_user_id,
    now()
  ) ON CONFLICT (invoice_number) DO NOTHING;

  -- March 2026 - PARTIALLY PAID (60-90 days overdue)
  INSERT INTO public.invoices (
    tenant_id, entity_id, invoice_number, client_id,
    issue_date, due_date, payment_terms_days,
    line_items, subtotal, tax_rate, tax_amount, discount_amount,
    total_amount, currency, status, amount_paid, amount_due,
    issued_by, created_by, created_at, last_payment_at
  ) VALUES
  (
    default_tenant_id, sample_entity_id,
    'INV-2026-003',
    sample_client_1,
    '2026-03-01'::date,
    '2026-03-20'::date,
    20,
    '[{"description": "Development Services", "quantity": 1, "unit_price": 100000000, "total": 100000000}]'::jsonb,
    100000000, 11, 11000000, 0,
    111000000,
    'IDR',
    'partially_paid',
    50000000,
    61000000,
    default_user_id,
    default_user_id,
    now(),
    '2026-04-15'::timestamp
  ) ON CONFLICT (invoice_number) DO NOTHING;

  -- March 2026 (2) - OVERDUE (60-90 days)
  INSERT INTO public.invoices (
    tenant_id, entity_id, invoice_number, client_id,
    issue_date, due_date, payment_terms_days,
    line_items, subtotal, tax_rate, tax_amount, discount_amount,
    total_amount, currency, status, amount_paid, amount_due,
    issued_by, created_by, created_at
  ) VALUES
  (
    default_tenant_id, sample_entity_id,
    'INV-2026-004',
    sample_client_3,
    '2026-03-10'::date,
    '2026-03-30'::date,
    20,
    '[{"description": "Training Services", "quantity": 3, "unit_price": 20000000, "total": 60000000}]'::jsonb,
    60000000, 11, 6600000, 0,
    66600000,
    'IDR',
    'overdue',
    0,
    66600000,
    default_user_id,
    default_user_id,
    now()
  ) ON CONFLICT (invoice_number) DO NOTHING;

  -- April 2026 - OVERDUE (30-60 days)
  INSERT INTO public.invoices (
    tenant_id, entity_id, invoice_number, client_id,
    issue_date, due_date, payment_terms_days,
    line_items, subtotal, tax_rate, tax_amount, discount_amount,
    total_amount, currency, status, amount_paid, amount_due,
    issued_by, created_by, created_at
  ) VALUES
  (
    default_tenant_id, sample_entity_id,
    'INV-2026-005',
    sample_client_2,
    '2026-04-01'::date,
    '2026-04-15'::date,
    15,
    '[{"description": "Maintenance Services", "quantity": 1, "unit_price": 40000000, "total": 40000000}]'::jsonb,
    40000000, 11, 4400000, 0,
    44400000,
    'IDR',
    'overdue',
    0,
    44400000,
    default_user_id,
    default_user_id,
    now()
  ) ON CONFLICT (invoice_number) DO NOTHING;

  -- April 2026 (2) - PARTIALLY PAID (30-60 days overdue)
  INSERT INTO public.invoices (
    tenant_id, entity_id, invoice_number, client_id,
    issue_date, due_date, payment_terms_days,
    line_items, subtotal, tax_rate, tax_amount, discount_amount,
    total_amount, currency, status, amount_paid, amount_due,
    issued_by, created_by, created_at, last_payment_at
  ) VALUES
  (
    default_tenant_id, sample_entity_id,
    'INV-2026-006',
    sample_client_4,
    '2026-04-05'::date,
    '2026-04-20'::date,
    15,
    '[{"description": "Support Services", "quantity": 2, "unit_price": 35000000, "total": 70000000}]'::jsonb,
    70000000, 11, 7700000, 0,
    77700000,
    'IDR',
    'partially_paid',
    30000000,
    47700000,
    default_user_id,
    default_user_id,
    now(),
    '2026-05-10'::timestamp
  ) ON CONFLICT (invoice_number) DO NOTHING;

  -- May 2026 - OVERDUE (1-30 days)
  INSERT INTO public.invoices (
    tenant_id, entity_id, invoice_number, client_id,
    issue_date, due_date, payment_terms_days,
    line_items, subtotal, tax_rate, tax_amount, discount_amount,
    total_amount, currency, status, amount_paid, amount_due,
    issued_by, created_by, created_at
  ) VALUES
  (
    default_tenant_id, sample_entity_id,
    'INV-2026-007',
    sample_client_1,
    '2026-05-10'::date,
    '2026-05-25'::date,
    15,
    '[{"description": "Consulting Hours", "quantity": 100, "unit_price": 500000, "total": 50000000}]'::jsonb,
    50000000, 11, 5500000, 0,
    55500000,
    'IDR',
    'overdue',
    0,
    55500000,
    default_user_id,
    default_user_id,
    now()
  ) ON CONFLICT (invoice_number) DO NOTHING;

  -- May 2026 (2) - SENT (NOT YET DUE - Current)
  INSERT INTO public.invoices (
    tenant_id, entity_id, invoice_number, client_id,
    issue_date, due_date, payment_terms_days,
    line_items, subtotal, tax_rate, tax_amount, discount_amount,
    total_amount, currency, status, amount_paid, amount_due,
    issued_by, created_by, created_at
  ) VALUES
  (
    default_tenant_id, sample_entity_id,
    'INV-2026-008',
    sample_client_3,
    '2026-05-20'::date,
    '2026-06-10'::date,
    20,
    '[{"description": "Project Delivery", "quantity": 1, "unit_price": 80000000, "total": 80000000}]'::jsonb,
    80000000, 11, 8800000, 0,
    88800000,
    'IDR',
    'sent',
    0,
    88800000,
    default_user_id,
    default_user_id,
    now()
  ) ON CONFLICT (invoice_number) DO NOTHING;

  -- June 2026 - SENT (NOT YET DUE - Current)
  INSERT INTO public.invoices (
    tenant_id, entity_id, invoice_number, client_id,
    issue_date, due_date, payment_terms_days,
    line_items, subtotal, tax_rate, tax_amount, discount_amount,
    total_amount, currency, status, amount_paid, amount_due,
    issued_by, created_by, created_at
  ) VALUES
  (
    default_tenant_id, sample_entity_id,
    'INV-2026-009',
    sample_client_2,
    '2026-06-01'::date,
    '2026-06-15'::date,
    15,
    '[{"description": "Services", "quantity": 1, "unit_price": 75000000, "total": 75000000}]'::jsonb,
    75000000, 11, 8250000, 0,
    83250000,
    'IDR',
    'sent',
    0,
    83250000,
    default_user_id,
    default_user_id,
    now()
  ) ON CONFLICT (invoice_number) DO NOTHING;

  -- June 2026 (2) - DRAFT (Not Yet Sent)
  INSERT INTO public.invoices (
    tenant_id, entity_id, invoice_number, client_id,
    issue_date, due_date, payment_terms_days,
    line_items, subtotal, tax_rate, tax_amount, discount_amount,
    total_amount, currency, status, amount_paid, amount_due,
    issued_by, created_by, created_at
  ) VALUES
  (
    default_tenant_id, sample_entity_id,
    'INV-2026-010',
    sample_client_4,
    '2026-06-01'::date,
    '2026-06-20'::date,
    20,
    '[{"description": "Consultation", "quantity": 1, "unit_price": 60000000, "total": 60000000}]'::jsonb,
    60000000, 11, 6600000, 0,
    66600000,
    'IDR',
    'draft',
    0,
    66600000,
    default_user_id,
    default_user_id,
    now()
  ) ON CONFLICT (invoice_number) DO NOTHING;

END $$;
