-- =====================================================
-- FASE-4.0-A: Work Shifts & Calendars
-- =====================================================
-- Multi-shift support + work calendar (holidays, cuti bersama)
-- Reference: hc-master-data-workflow skill
-- =====================================================

-- 1.1 hr_work_shifts - Shift definitions per entity/branch
CREATE TABLE IF NOT EXISTS public.hr_work_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  
  name text NOT NULL, -- e.g., "Shift Pagi", "Shift Malam", "Shift Reguler"
  code text NOT NULL, -- e.g., "SHIFT-AM", "SHIFT-PM", "SHIFT-RG"
  
  start_time time NOT NULL, -- e.g., "08:00:00"
  end_time time NOT NULL, -- e.g., "17:00:00"
  
  break_start time, -- e.g., "12:00:00"
  break_end time, -- e.g., "13:00:00"
  break_duration_minutes integer DEFAULT 60,
  
  grace_period_minutes integer DEFAULT 15, -- late tolerance
  is_active boolean DEFAULT true,
  
  -- Inheritance pattern
  is_default boolean DEFAULT false, -- tenant-level default
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, branch_id, code)
);

CREATE INDEX IF NOT EXISTS idx_hr_work_shifts_tenant ON public.hr_work_shifts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_shifts_entity ON public.hr_work_shifts(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_shifts_branch ON public.hr_work_shifts(branch_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_shifts_active ON public.hr_work_shifts(is_active);

-- Enable RLS
ALTER TABLE public.hr_work_shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view shifts in their tenant" ON public.hr_work_shifts;
CREATE POLICY "Users can view shifts in their tenant"
  ON public.hr_work_shifts FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage shifts" ON public.hr_work_shifts;
CREATE POLICY "HR admin can manage shifts"
  ON public.hr_work_shifts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_work_shifts_updated_at ON public.hr_work_shifts;
CREATE TRIGGER hr_work_shifts_updated_at
  BEFORE UPDATE ON public.hr_work_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 1.2 hr_work_calendars - Holiday calendar per year
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hr_work_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  
  year integer NOT NULL CHECK (year >= 2020 AND year <= 2100),
  date date NOT NULL,
  
  name text NOT NULL, -- e.g., "Hari Raya Idul Fitri", "Tahun Baru"
  type text NOT NULL DEFAULT 'national_holiday' CHECK (type IN (
    'national_holiday', -- Libur nasional
    'cuti_bersama', -- Cuti bersama
    'weekend', -- Weekend (auto-generated)
    'company_holiday', -- Libur perusahaan
    'unpaid_leave' -- Cuti tanpa upah
  )),
  
  is_paid boolean DEFAULT true,
  description text,
  
  -- Inheritance pattern
  is_default boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, branch_id, date)
);

CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_tenant ON public.hr_work_calendars(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_entity ON public.hr_work_calendars(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_branch ON public.hr_work_calendars(branch_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_year ON public.hr_work_calendars(year);
CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_date ON public.hr_work_calendars(date);
CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_type ON public.hr_work_calendars(type);

-- Enable RLS
ALTER TABLE public.hr_work_calendars ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view calendars in their tenant" ON public.hr_work_calendars;
CREATE POLICY "Users can view calendars in their tenant"
  ON public.hr_work_calendars FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage calendars" ON public.hr_work_calendars;
CREATE POLICY "HR admin can manage calendars"
  ON public.hr_work_calendars FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Tables created:
-- - hr_work_shifts (multi-shift per entity/branch)
-- - hr_work_calendars (holiday calendar per year)
-- =====================================================
