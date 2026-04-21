-- =====================================================
-- EXTEND user_profiles dengan HR Employee Fields
-- =====================================================
-- Menambahkan data karyawan ke user_profiles untuk
-- kebutuhan HR & Payroll (1 user = 1 karyawan)
-- =====================================================

-- 1. Tambahkan kolom HR ke user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS nik text,  -- Nomor Induk Karyawan
ADD COLUMN IF NOT EXISTS employee_number text,  -- Formatted employee ID (EMP-YYYY-NNN)
ADD COLUMN IF NOT EXISTS employment_status text,  -- permanent, contract, probation, intern, part_time
ADD COLUMN IF NOT EXISTS join_date date,  -- Tanggal bergabung
ADD COLUMN IF NOT EXISTS resignation_date date,  -- Tanggal resign (nullable)
ADD COLUMN IF NOT EXISTS termination_reason text,  -- Alasan resign/termination
ADD COLUMN IF NOT EXISTS position_id uuid REFERENCES public.hr_positions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.hr_departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS grade_id uuid REFERENCES public.hr_job_grades(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS base_salary numeric(20,4),  -- Gaji pokok
ADD COLUMN IF NOT EXISTS bank_account text,  -- Rekening bank untuk payroll
ADD COLUMN IF NOT EXISTS bank_name text,  -- Nama bank
ADD COLUMN IF NOT EXISTS npwp text,  -- Nomor NPWP
ADD COLUMN IF NOT EXISTS bpjs_kesehatan text,  -- Nomor BPJS Kesehatan
ADD COLUMN IF NOT EXISTS bpjs_ketenagakerjaan text,  -- Nomor BPJS Ketenagakerjaan
ADD COLUMN IF NOT EXISTS emergency_contact_name text,  -- Kontak darurat
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS emergency_contact_relation text,  -- Hubungan (istri/suami/orang tua/dll)
ADD COLUMN IF NOT EXISTS address text,  -- Alamat lengkap
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS province text,
ADD COLUMN IF NOT EXISTS postal_code text;

-- 2. Indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_user_profiles_nik ON user_profiles(nik) WHERE nik IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_employee_number ON user_profiles(employee_number) WHERE employee_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_employment_status ON user_profiles(employment_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_join_date ON user_profiles(join_date);
CREATE INDEX IF NOT EXISTS idx_user_profiles_position ON user_profiles(position_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_department ON user_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_grade ON user_profiles(grade_id);

-- 3. Constraint: NIK harus unique per tenant
DROP INDEX IF EXISTS idx_user_profiles_nik_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_nik_unique 
  ON user_profiles(tenant_id, nik) 
  WHERE nik IS NOT NULL;

-- 4. Constraint: Employee number harus unique per tenant
DROP INDEX IF EXISTS idx_user_profiles_employee_number_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_employee_number_unique 
  ON user_profiles(tenant_id, employee_number) 
  WHERE employee_number IS NOT NULL;

-- 5. Tambahkan comment untuk dokumentasi
COMMENT ON COLUMN public.user_profiles.nik IS 'Nomor Induk Karyawan - unique per tenant';
COMMENT ON COLUMN public.user_profiles.employee_number IS 'Formatted employee ID (e.g., EMP-2026-001)';
COMMENT ON COLUMN public.user_profiles.employment_status IS 'permanent, contract, probation, intern, part_time';
COMMENT ON COLUMN public.user_profiles.join_date IS 'Tanggal bergabung dengan perusahaan';
COMMENT ON COLUMN public.user_profiles.resignation_date IS 'Tanggal resign/termination (nullable)';
COMMENT ON COLUMN public.user_profiles.base_salary IS 'Gaji pokok untuk payroll calculation';
COMMENT ON COLUMN public.user_profiles.npwp IS 'Nomor NPWP untuk tax reporting';
COMMENT ON COLUMN public.user_profiles.bpjs_kesehatan IS 'Nomor kepesertaan BPJS Kesehatan';
COMMENT ON COLUMN public.user_profiles.bpjs_ketenagakerjaan IS 'Nomor kepesertaan BPJS Ketenagakerjaan';

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- user_profiles sekarang extended dengan HR employee fields
-- untuk mendukung 1 user = 1 karyawan scenario
-- =====================================================
