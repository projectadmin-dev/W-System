-- =====================================================
-- Seed Data: Projects for Kanban Board Testing
-- =====================================================
-- Run in: Supabase Dashboard → SQL Editor
-- Purpose: Add sample projects to test Kanban drag-drop
-- =====================================================
-- Catatan: Kita perlu membuat user secara manual karena pgcrypto gen_salt() tidak tersedia
-- =====================================================

BEGIN;

-- =====================================================
-- Step 1: Create PM user (Rudi Permana)
-- =====================================================
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Generate UUID secara manual
  v_user_id := 'e7e3fb4c-6674-4cb1-b674-19ae85e8547b';
  
  -- Insert ke auth.users (passwordHash = crypt('Password123!', gen_salt('bf')))
  -- Untuk now(), kita pakai timestamp statis karena gen_random_uuid() dan gen_salt() tidak tersedia
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, 
    created_at, updated_at, role, aud, last_sign_in_at
  ) VALUES (
    v_user_id,
    'pm.test@wit.id',
    '$2a$10$12345678901234567890ubKQqJ0QgJ0QkQjQjQjQjQjQjQjQjQjQj',  -- placeholder, akan diupdate nanti
    now(),
    '{"full_name":"Rudi Permana"}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated',
    now()
  ) ON CONFLICT (id) DO NOTHING;
  
  -- Insert ke user_profiles
  INSERT INTO public.user_profiles (
    id, tenant_id, entity_id, full_name, email, role_id, department, is_active
  )
  SELECT 
    v_user_id,
    t.id,
    (SELECT id FROM public.entities WHERE tenant_id = t.id LIMIT 1),
    'Rudi Permana',
    'pm.test@wit.id',
    (SELECT id FROM public.roles WHERE name = 'pm' LIMIT 1),
    'Project Management',
    true
  FROM public.tenants t
  WHERE t.slug = 'wit'
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Created PM user with id: %', v_user_id;
END $$;

-- =====================================================
-- Step 2: Create Commercial user (Siti Nurhaliza)
-- =====================================================
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := 'e3571f54-7b8f-4f42-acfa-62d1d4acd351';
  
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, 
    created_at, updated_at, role, aud, last_sign_in_at
  ) VALUES (
    v_user_id,
    'commercial.test@wit.id',
    '$2a$10$12345678901234567890ubKQqJ0QgJ0QkQjQjQjQjQjQjQjQjQjQj',  -- placeholder
    now(),
    '{"full_name":"Siti Nurhaliza"}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated',
    now()
  ) ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.user_profiles (
    id, tenant_id, entity_id, full_name, email, role_id, department, is_active
  )
  SELECT 
    v_user_id,
    t.id,
    (SELECT id FROM public.entities WHERE tenant_id = t.id LIMIT 1),
    'Siti Nurhaliza',
    'commercial.test@wit.id',
    (SELECT id FROM public.roles WHERE name = 'commercial' LIMIT 1),
    'Commercial',
    true
  FROM public.tenants t
  WHERE t.slug = 'wit'
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Created Commercial user with id: %', v_user_id;
END $$;

-- =====================================================
-- Step 3: Create Clients (tanpa kolom 'code', gunakan unique constraint lain)
-- =====================================================
INSERT INTO public.clients (tenant_id, entity_id, name, legal_name, type, tier, industry, email, phone, created_by)
SELECT 
  t.id, e.id,
  'PT Garudafood Putra Jaya', 'PT Garudafood Putra Jaya TBK', 'active', 'enterprise', 'Food & Beverage', 'info@garudafood.co.id', '021-5678901', 
  (SELECT id FROM public.user_profiles WHERE email = 'commercial.test@wit.id' LIMIT 1)
FROM public.tenants t, public.entities e 
WHERE t.slug = 'wit' AND e.tenant_id = t.id
ON CONFLICT DO NOTHING;

INSERT INTO public.clients (tenant_id, entity_id, name, legal_name, type, tier, industry, email, phone, created_by)
SELECT 
  t.id, e.id,
  'CV Maju Logistik', 'CV Maju Logistik Nusantara', 'active', 'mid', 'Logistics', 'contact@majulogistik.id', '024-9876543',
  (SELECT id FROM public.user_profiles WHERE email = 'commercial.test@wit.id' LIMIT 1)
FROM public.tenants t, public.entities e 
WHERE t.slug = 'wit' AND e.tenant_id = t.id
ON CONFLICT DO NOTHING;

INSERT INTO public.clients (tenant_id, entity_id, name, legal_name, type, tier, industry, email, phone, created_by)
SELECT 
  t.id, e.id,
  'PT Indomedia Digital Solusi', 'PT Indomedia Digital Solusi', 'active', 'mid', 'Technology', 'hello@indomedia.id', '021-12345678',
  (SELECT id FROM public.user_profiles WHERE email = 'commercial.test@wit.id' LIMIT 1)
FROM public.tenants t, public.entities e 
WHERE t.slug = 'wit' AND e.tenant_id = t.id
ON CONFLICT DO NOTHING;

INSERT INTO public.clients (tenant_id, entity_id, name, legal_name, type, tier, industry, email, phone, created_by)
SELECT 
  t.id, e.id,
  'Klinik Sehat Sentosa', 'Klinik Sehat Sentosa', 'active', 'small', 'Healthcare', 'info@kliniksehat.co.id', '031-5551234',
  (SELECT id FROM public.user_profiles WHERE email = 'commercial.test@wit.id' LIMIT 1)
FROM public.tenants t, public.entities e 
WHERE t.slug = 'wit' AND e.tenant_id = t.id
ON CONFLICT DO NOTHING;

INSERT INTO public.clients (tenant_id, entity_id, name, legal_name, type, tier, industry, email, phone, created_by)
SELECT 
  t.id, e.id,
  'PT Borneo Energi Terbarukan', 'PT Borneo Energi Terbarukan', 'prospect', 'mid', 'Energy', 'contact@borneoenergi.co.id', '0541-765432',
  (SELECT id FROM public.user_profiles WHERE email = 'commercial.test@wit.id' LIMIT 1)
FROM public.tenants t, public.entities e 
WHERE t.slug = 'wit' AND e.tenant_id = t.id
ON CONFLICT DO NOTHING;

-- =====================================================
-- Step 4: Create Projects (10 sample projects)
-- =====================================================

-- PLANNING status
INSERT INTO public.projects (tenant_id, entity_id, project_code, project_name, client_id, budget_amount, currency, start_date, end_date, status, project_manager, created_by)
SELECT 
  t.id, e.id, 'PRJ-2026-001', 'Implementasi ERP SAP Business One',
  c.id, 850000000, 'IDR', '2026-06-01', '2026-11-30', 'planning',
  (SELECT id FROM public.user_profiles WHERE email = 'pm.test@wit.id' LIMIT 1),
  (SELECT id FROM public.user_profiles WHERE email = 'commercial.test@wit.id' LIMIT 1)
FROM public.tenants t, public.entities e, public.clients c
WHERE t.slug = 'wit' AND e.tenant_id = t.id AND c.name = 'PT Garudafood Putra Jaya' AND c.tenant_id = t.id
ON CONFLICT DO NOTHING;

INSERT INTO public.projects (tenant_id, entity_id, project_code, project_name, client_id, budget_amount, currency, start_date, end_date, status, project_manager, created_by)
SELECT 
  t.id, e.id, 'PRJ-2026-002', 'Dashboard Analytics Real-Time',
  c.id, 320000000, 'IDR', '2026-07-01', '2026-09-30', 'planning',
  (SELECT id FROM public.user_profiles WHERE email = 'pm.test@wit.id' LIMIT 1),
  (SELECT id FROM public.user_profiles WHERE email = 'commercial.test@wit.id' LIMIT 1)
FROM public.tenants t, public.entities e, public.clients c
WHERE t.slug = 'wit' AND e.tenant_id = t.id AND c.name = 'PT Indomedia Digital Solusi' AND c.tenant_id = t.id
ON CONFLICT DO NOTHING;

-- ACTIVE status
INSERT INTO public.projects (tenant_id, entity_id, project_code, project_name, client_id, budget_amount, currency, start_date, end_date, status, project_manager, created_by)
SELECT 
  t.id, e.id, 'PRJ-2026-003', 'Sistem Inventory Warehouse Management',
  c.id, 450000000, 'IDR', '2026-03-01', '2026-08-31', 'active',
  (SELECT id FROM public.user_profiles WHERE email = 'pm.test@wit.id' LIMIT 1),
  (SELECT id FROM public.user_profiles WHERE email = 'commercial.test@wit.id' LIMIT 1)
FROM public.tenants t, public.entities e, public.clients c
WHERE t.slug = 'wit' AND e.tenant_id = t.id AND c.name = 'CV Maju Logistik' AND c.tenant_id = t.id
ON CONFLICT DO NOTHING;

INSERT INTO public.projects (tenant_id, entity_id, project_code, project_name, client_id, budget_amount, currency, start_date, end_date, status, project_manager, created_by)
SELECT 
  t.id, e.id, 'PRJ-2026-004', 'Mobile App Pasien - Telemedicine',
  c.id, 275000000, 'IDR', '2026-04-15', '2026-07-15', 'active',
  (SELECT id FROM public.user_profiles WHERE email = 'pm.test@wit.id' LIMIT 1),
  (SELECT id FROM public.user_profiles WHERE email = 'commercial.test@wit.id' LIMIT 1)
FROM public.tenants t, public.entities e, public.clients c
WHERE t.slug = 'wit' AND e.tenant_id = t.id AND c.name = 'Klinik Sehat Sentosa' AND c.tenant_id = t.id
ON CONFLICT DO NOTHING;

INSERT INTO public.projects (tenant_id, entity_id, project_code, project_name, client_id, budget_amount, currency, start_date, end_date, status, project_manager, created_by)
SELECT 
  t.id, e.id, 'PRJ-2026-005', 'Integration API e-Faktur with ERP',
  c.id, 180000000, 'IDR', '2026-02-01', '2026-05-31', 'active',
  (SELECT id FROM public.user_profiles WHERE email = 'pm.test@wit.id' LIMIT 1),
  (SELECT id FROM public.user_profiles WHERE email = 'commercial.test@wit.id' LIMIT 1)
FROM public.tenants t, public.entities e, public.clients c
WHERE t.slug = 'wit' AND e.tenant_id = t.id AND c.name = 'PT Garudafood Putra Jaya' AND c.tenant_id = t.id
ON CONFLICT DO NOTHING;

INSERT INTO public.projects (tenant_id, entity_id, project_code, project_name, client_id, budget_amount, currency, start_date, end_date, status, project_manager, created_by)
SELECT 
  t.id, e.id, 'PRJ-2026-006', 'Digital Marketing Automation Platform',
  c.id, 520000000, 'IDR', '2026-01-15', '2026-06-30', 'active',
  (SELECT id FROM public.user_profiles WHERE email = 'pm.test@wit.id' LIMIT 1),
  (SELECT id FROM public.user_profiles WHERE email = 'commercial.test@wit.id' LIMIT 1)
FROM public.tenants t, public.entities e, public.clients c
WHERE t.slug = 'wit' AND e.tenant_id = t.id AND c.name = 'PT Indomedia Digital Solusi' AND c.tenant_id = t.id
ON CONFLICT DO NOTHING;

-- ON_HOLD status
INSERT INTO public.projects (tenant_id, entity_id, project_code, project_name, client_id, budget_amount, currency, start_date, end_date, status, project_manager, created_by)
SELECT 
  t.id, e.id, 'PRJ-2025-008', 'Smart Grid Monitoring System',
  c.id, 1200000000, 'IDR', '2025-10-01', '2026-03-31', 'on_hold',
  (SELECT id FROM public.user_profiles WHERE email = 'pm.test@wit.id' LIMIT 1),
  (SELECT id FROM public.user_profiles WHERE email = 'commercial.test@wit.id' LIMIT 1)
FROM public.tenants t, public.entities e, public.clients c
WHERE t.slug = 'wit' AND e.tenant_id = t.id AND c.name = 'PT Borneo Energi Terbarukan' AND c.tenant_id = t.id
ON CONFLICT DO NOTHING;

INSERT INTO public.projects (tenant_id, entity_id, project_code, project_name, client_id, budget_amount, currency, start_date, end_date, status, project_manager, created_by)
SELECT 
  t.id, e.id, 'PRJ-2025-009', 'Blockchain Supply Chain Tracking',
  c.id, 750000000, 'IDR', '2025-11-01', '2026-04-30', 'on_hold',
  (SELECT id FROM public.user_profiles WHERE email = 'pm.test@wit.id' LIMIT 1),
  (SELECT id FROM public.user_profiles WHERE email = 'commercial.test@wit.id' LIMIT 1)
FROM public.tenants t, public.entities e, public.clients c
WHERE t.slug = 'wit' AND e.tenant_id = t.id AND c.name = 'CV Maju Logistik' AND c.tenant_id = t.id
ON CONFLICT DO NOTHING;

-- COMPLETED status
INSERT INTO public.projects (tenant_id, entity_id, project_code, project_name, client_id, budget_amount, currency, start_date, end_date, status, project_manager, created_by)
SELECT 
  t.id, e.id, 'PRJ-2025-006', 'Website Redesign Corporate',
  c.id, 95000000, 'IDR', '2025-08-01', '2025-11-30', 'completed',
  (SELECT id FROM public.user_profiles WHERE email = 'pm.test@wit.id' LIMIT 1),
  (SELECT id FROM public.user_profiles WHERE email = 'commercial.test@wit.id' LIMIT 1)
FROM public.tenants t, public.entities e, public.clients c
WHERE t.slug = 'wit' AND e.tenant_id = t.id AND c.name = 'Klinik Sehat Sentosa' AND c.tenant_id = t.id
ON CONFLICT DO NOTHING;

INSERT INTO public.projects (tenant_id, entity_id, project_code, project_name, client_id, budget_amount, currency, start_date, end_date, status, project_manager, created_by)
SELECT 
  t.id, e.id, 'PRJ-2025-007', 'CRM Implementation Salesforce',
  c.id, 380000000, 'IDR', '2025-07-01', '2025-12-31', 'completed',
  (SELECT id FROM public.user_profiles WHERE email = 'pm.test@wit.id' LIMIT 1),
  (SELECT id FROM public.user_profiles WHERE email = 'commercial.test@wit.id' LIMIT 1)
FROM public.tenants t, public.entities e, public.clients c
WHERE t.slug = 'wit' AND e.tenant_id = t.id AND c.name = 'PT Garudafood Putra Jaya' AND c.tenant_id = t.id
ON CONFLICT DO NOTHING;

COMMIT;

-- Verify
SELECT 'Projects created:' as info, COUNT(*) as total FROM public.projects WHERE deleted_at IS NULL;
SELECT 'By status:' as info, status, COUNT(*) as count FROM public.projects WHERE deleted_at IS NULL GROUP BY status ORDER BY status;
