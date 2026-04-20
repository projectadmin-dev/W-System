-- =====================================================
-- FASE-4.0-H: Seed Data for HC Master Data Tables
-- =====================================================
-- Sample data for testing and development
-- Requires: FASE-0 (tenants, entities, branches, regions) ✅
-- Requires: FASE-4.0-A to G ✅
-- =====================================================

-- =====================================================
-- 1. Work Shifts & Calendars
-- =====================================================

-- Work shifts (assuming tenant_id and entity_id from demo data)
INSERT INTO public.hr_work_shifts (entity_id, code, name, shift_type, start_time, end_time, is_overnight, break_duration_minutes)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  shift_code,
  shift_name,
  s_type,
  s_start,
  s_end,
  overnight,
  break_min
FROM (VALUES
  ('REG', 'Regular Shift', 'regular', '09:00', '18:00', false, 60),
  ('MOR', 'Morning Shift', 'regular', '07:00', '16:00', false, 60),
  ('AFT', 'Afternoon Shift', 'regular', '14:00', '23:00', false, 60),
  ('NGT', 'Night Shift', 'regular', '23:00', '08:00', true, 60),
  ('FLX', 'Flexible', 'flexible', NULL, NULL, false, NULL)
) AS shifts(shift_code, shift_name, s_type, s_start, s_end, overnight, break_min)
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- Work calendars
INSERT INTO public.hr_work_calendars (entity_id, name, calendar_type, start_date, end_date, is_default)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  cal_name,
  cal_type,
  cal_start,
  cal_end,
  is_def
FROM (VALUES
  ('Standard 2026', 'standard', '2026-01-01', '2026-12-31', true),
  ('Production 2026', 'production', '2026-01-01', '2026-12-31', false),
  ('Retail 2026', 'retail', '2026-01-01', '2026-12-31', false)
) AS calendars(cal_name, cal_type, cal_start, cal_end, is_def)
ON CONFLICT (tenant_id, entity_id, name) DO NOTHING;

-- =====================================================
-- 2. City UMR (Upah Minimum Regional) 2026
-- =====================================================

INSERT INTO public.hr_city_umr (city_id, year, umr_amount, effective_date, source_document)
SELECT 
  city_id,
  2026,
  umr,
  eff_date,
  src_doc
FROM (VALUES
  -- DKI Jakarta (from regions table seed data)
  ((SELECT id FROM regions WHERE name = 'Jakarta Pusat'), 4900000.00, '2026-01-01', 'Kepgub DKI Jakarta No. XXX/2025'),
  ((SELECT id FROM regions WHERE name = 'Jakarta Selatan'), 4900000.00, '2026-01-01', 'Kepgub DKI Jakarta No. XXX/2025'),
  ((SELECT id FROM regions WHERE name = 'Jakarta Barat'), 4900000.00, '2026-01-01', 'Kepgub DKI Jakarta No. XXX/2025'),
  ((SELECT id FROM regions WHERE name = 'Jakarta Timur'), 4900000.00, '2026-01-01', 'Kepgub DKI Jakarta No. XXX/2025'),
  ((SELECT id FROM regions WHERE name = 'Jakarta Utara'), 4900000.00, '2026-01-01', 'Kepgub DKI Jakarta No. XXX/2025'),
  
  -- Jawa Barat
  ((SELECT id FROM regions WHERE name = 'Bandung'), 3200000.00, '2026-01-01', 'Kepgub Jabar No. XXX/2025'),
  ((SELECT id FROM regions WHERE name = 'Bekasi'), 5100000.00, '2026-01-01', 'Kepgub Jabar No. XXX/2025'),
  ((SELECT id FROM regions WHERE name = 'Depok'), 4800000.00, '2026-01-01', 'Kepgub Jabar No. XXX/2025'),
  ((SELECT id FROM regions WHERE name = 'Bogor'), 4500000.00, '2026-01-01', 'Kepgub Jabar No. XXX/2025'),
  ((SELECT id FROM regions WHERE name = 'Tangerang'), 5000000.00, '2026-01-01', 'Kepgub Banten No. XXX/2025'),
  
  -- Jawa Timur
  ((SELECT id FROM regions WHERE name = 'Surabaya'), 4600000.00, '2026-01-01', 'Kepgub Jatim No. XXX/2025'),
  
  -- Jawa Tengah
  ((SELECT id FROM regions WHERE name = 'Semarang'), 3100000.00, '2026-01-01', 'Kepgub Jateng No. XXX/2025')
) AS umr_data(city_id, umr, eff_date, src_doc)
ON CONFLICT (tenant_id, city_id, year) DO NOTHING;

-- =====================================================
-- 3. BPJS & PPh21 Configs
-- =====================================================

-- BPJS Ketenagakerjaan config (2026 rates)
INSERT INTO public.hr_bpjs_configs (entity_id, bpjs_type, category, rate_employee, rate_company, max_salary_base, description)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  b_type,
  cat,
  r_emp,
  r_comp,
  max_base,
  desc_text
FROM (VALUES
  ('ketenagakerjaan', 'JKK', 0.00, 0.24, 12000000.00, 'Jaminan Kecelakaan Kerja - 0.24% (risk level 1)'),
  ('ketenagakerjaan', 'JKM', 0.00, 0.30, 12000000.00, 'Jaminan Kematian - 0.30%'),
  ('ketenagakerjaan', 'JHT', 2.00, 3.70, 12000000.00, 'Jaminan Hari Tua - 5.70% total'),
  ('ketenagakerjaan', 'JP', 1.00, 2.00, 12000000.00, 'Jaminan Pensiun - 3.00% total'),
  ('kesehatan', 'Kesehatan', 1.00, 4.00, 12000000.00, 'BPJS Kesehatan - 5% total')
) AS bpjs(b_type, cat, r_emp, r_comp, max_base, desc_text)
ON CONFLICT (tenant_id, entity_id, bpjs_type, category) DO NOTHING;

-- PPh21 TER (Tarif Efektif Rata-rata) 2026
INSERT INTO public.hr_pph21_configs (entity_id, filing_status, income_range_min, income_range_max, monthly_rate, description)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  status,
  min_inc,
  max_inc,
  rate,
  desc_text
FROM (VALUES
  ('TK/0', 0, 5000000.00, 0.00, 'TK/0 - Penghasilan s.d. 5 Juta'),
  ('TK/0', 5000000.01, 10000000.00, 0.025, 'TK/0 - Penghasilan 5-10 Juta'),
  ('TK/0', 10000000.01, 20000000.00, 0.045, 'TK/0 - Penghasilan 10-20 Juta'),
  ('TK/0', 20000000.01, 50000000.00, 0.0675, 'TK/0 - Penghasilan 20-50 Juta'),
  ('TK/0', 50000000.01, 100000000.00, 0.0825, 'TK/0 - Penghasilan 50-100 Juta'),
  ('TK/0', 100000000.01, 250000000.00, 0.0975, 'TK/0 - Penghasilan 100-250 Juta'),
  ('TK/0', 250000000.01, 500000000.00, 0.1125, 'TK/0 - Penghasilan 250-500 Juta'),
  ('TK/0', 500000000.01, NULL, 0.135, 'TK/0 - Penghasilan > 500 Juta'),
  
  ('K/0', 0, 5000000.00, 0.00, 'K/0 - Kawin tanpa tanggungan'),
  ('K/0', 5000000.01, 10000000.00, 0.0225, 'K/0'),
  ('K/0', 10000000.01, 20000000.00, 0.0425, 'K/0'),
  ('K/0', 20000000.01, 50000000.00, 0.065, 'K/0'),
  ('K/0', 50000000.01, 100000000.00, 0.08, 'K/0'),
  ('K/0', 100000000.01, 250000000.00, 0.095, 'K/0'),
  ('K/0', 250000000.01, 500000000.00, 0.11, 'K/0'),
  ('K/0', 500000000.01, NULL, 0.1325, 'K/0'),
  
  ('K/1', 0, 5000000.00, 0.00, 'K/1 - Kawin 1 tanggungan'),
  ('K/1', 5000000.01, 10000000.00, 0.02, 'K/1'),
  ('K/1', 10000000.01, 20000000.00, 0.04, 'K/1'),
  ('K/1', 20000000.01, 50000000.00, 0.0625, 'K/1'),
  ('K/1', 50000000.01, 100000000.00, 0.0775, 'K/1'),
  ('K/1', 100000000.01, 250000000.00, 0.0925, 'K/1'),
  ('K/1', 250000000.01, 500000000.00, 0.1075, 'K/1'),
  ('K/1', 500000000.01, NULL, 0.13, 'K/1'),
  
  ('K/2', 0, 5000000.00, 0.00, 'K/2 - Kawin 2 tanggungan'),
  ('K/2', 5000000.01, 10000000.00, 0.0175, 'K/2'),
  ('K/2', 10000000.01, 20000000.00, 0.0375, 'K/2'),
  ('K/2', 20000000.01, 50000000.00, 0.06, 'K/2'),
  ('K/2', 50000000.01, 100000000.00, 0.075, 'K/2'),
  ('K/2', 100000000.01, 250000000.00, 0.09, 'K/2'),
  ('K/2', 250000000.01, 500000000.00, 0.105, 'K/2'),
  ('K/2', 500000000.01, NULL, 0.1275, 'K/2'),
  
  ('K/3', 0, 5000000.00, 0.00, 'K/3 - Kawin 3 tanggungan (max)'),
  ('K/3', 5000000.01, 10000000.00, 0.015, 'K/3'),
  ('K/3', 10000000.01, 20000000.00, 0.035, 'K/3'),
  ('K/3', 20000000.01, 50000000.00, 0.0575, 'K/3'),
  ('K/3', 50000000.01, 100000000.00, 0.0725, 'K/3'),
  ('K/3', 100000000.01, 250000000.00, 0.0875, 'K/3'),
  ('K/3', 250000000.01, 500000000.00, 0.1025, 'K/3'),
  ('K/3', 500000000.01, NULL, 0.125, 'K/3')
) AS pph21(status, min_inc, max_inc, rate, desc_text)
ON CONFLICT (tenant_id, entity_id, filing_status, income_range_min) DO NOTHING;

-- =====================================================
-- 4. Salary Components
-- =====================================================

INSERT INTO public.hr_salary_components (entity_id, code, name, component_type, is_fixed, is_taxable, is_bpjs_base, display_order)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  comp_code,
  comp_name,
  c_type,
  fixed,
  taxable,
  bpjs_base,
  d_order
FROM (VALUES
  ('GAJI_POKOK', 'Gaji Pokok', 'earning', true, true, true, 1),
  ('TUNJ_JABATAN', 'Tunjangan Jabatan', 'earning', true, true, true, 2),
  ('TUNJ_MAKAN', 'Tunjangan Makan', 'earning', true, true, false, 3),
  ('TUNJ_TRANSPORT', 'Tunjangan Transport', 'earning', true, true, false, 4),
  ('TUNJ_KEHADIRAN', 'Tunjangan Kehadiran', 'earning', true, true, false, 5),
  ('LEMBUR', 'Lembur/Overtime', 'earning', false, true, false, 6),
  ('BONUS', 'Bonus', 'earning', false, true, true, 7),
  ('THP', 'THR', 'earning', false, true, true, 8),
  
  ('BPJS_KT_EMP', 'BPJS Ketenagakerjaan (Employee)', 'deduction', true, false, false, 100),
  ('BPJS_KES_EMP', 'BPJS Kesehatan (Employee)', 'deduction', true, false, false, 101),
  ('PPh21', 'PPh Pasal 21', 'deduction', false, false, false, 102),
  ('POTONGAN_LAIN', 'Potongan Lain-lain', 'deduction', false, false, false, 103)
) AS components(comp_code, comp_name, c_type, fixed, taxable, bpjs_base, d_order)
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- =====================================================
-- 5. Job Grades & Salary Matrix
-- =====================================================

INSERT INTO public.hr_job_grades (entity_id, code, name, level, salary_min, salary_mid, salary_max, leave_quota, is_overtime_eligible)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  g_code,
  g_name,
  g_level,
  g_min,
  g_mid,
  g_max,
  leave_q,
  ot_eligible
FROM (VALUES
  ('D1', 'Director', 1, 25000000.00, 35000000.00, 50000000.00, 15, false),
  ('M1', 'Manager', 2, 15000000.00, 20000000.00, 30000000.00, 14, false),
  ('M2', 'Senior Manager', 3, 12000000.00, 15000000.00, 20000000.00, 14, false),
  ('S1', 'Senior Staff', 4, 8000000.00, 10000000.00, 14000000.00, 12, true),
  ('S2', 'Staff', 5, 5500000.00, 7000000.00, 9000000.00, 12, true),
  ('S3', 'Junior Staff', 6, 4500000.00, 5000000.00, 6000000.00, 12, true)
) AS grades(g_code, g_name, g_level, g_min, g_mid, g_max, leave_q, ot_eligible)
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- Salary matrix steps (example for S2 - Staff grade)
INSERT INTO public.hr_salary_matrix (entity_id, grade_id, step, amount, effective_date)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  (SELECT id FROM hr_job_grades WHERE code = 'S2' LIMIT 1) as grade_id,
  step_num,
  amt,
  '2026-01-01'
FROM (VALUES
  (1, 5500000.00),
  (2, 6000000.00),
  (3, 6500000.00),
  (4, 7000000.00),
  (5, 7500000.00)
) AS steps(step_num, amt)
ON CONFLICT (tenant_id, entity_id, grade_id, step, effective_date) DO NOTHING;

-- =====================================================
-- 6. Work Areas
-- =====================================================

INSERT INTO public.hr_work_areas (entity_id, branch_id, code, name, area_type, address_line1, city_id)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  '10000000-0000-0000-0000-000000000001' as branch_id, -- Head Office
  area_code,
  area_name,
  a_type,
  addr,
  (SELECT id FROM regions WHERE name = 'Jakarta Selatan' LIMIT 1) as city_id
FROM (VALUES
  ('OFF-HO', 'Head Office', 'office', 'Jl. Raya TB Simatupang No. 1'),
  ('WH-01', 'Warehouse 1', 'warehouse', 'Jl. Industri Raya No. 5'),
  ('SITE-A', 'Project Site A', 'site', 'Lokasi Proyek BSD')
) AS areas(area_code, area_name, a_type, addr)
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- =====================================================
-- SEED DATA COMPLETE!
-- =====================================================
-- All HC Master Data tables now have sample data for testing
-- Total: 11 FASE-4.0 tables + 4 FASE-0 tables = 15 tables
-- =====================================================
