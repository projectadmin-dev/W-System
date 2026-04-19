-- =====================================================
-- FASE-4.0-G: Work Areas & Overtime Rules
-- =====================================================
-- Work area definitions + overtime calculation rules
-- =====================================================

-- 6.1 hr_work_areas - Work location/area definitions
CREATE TABLE IF NOT EXISTS public.hr_work_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  
  code text NOT NULL, -- e.g., "WH-01", "OFF-HR", "SITE-A"
  name text NOT NULL, -- e.g., "Warehouse 1", "HR Office", "Construction Site A"
  
  -- Location reference
  city_id uuid REFERENCES public.regions(id), -- Reference to cities in regions table
  
  -- Work area type
  area_type text NOT NULL CHECK (area_type IN ('office', 'warehouse', 'site', 'remote', 'client')),
  
  -- Address details
  address_line1 text,
  address_line2 text,
  postal_code text,
  
  -- Contact person at this location
  contact_name text,
  contact_phone text,
  
  -- Status
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, code)
);

CREATE INDEX IF NOT EXISTS idx_hr_work_areas_tenant ON public.hr_work_areas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_areas_entity ON public.hr_work_areas(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_areas_branch ON public.hr_work_areas(branch_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_areas_city ON public.hr_work_areas(city_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_areas_type ON public.hr_work_areas(area_type);
CREATE INDEX IF NOT EXISTS idx_hr_work_areas_active ON public.hr_work_areas(is_active);

-- Enable RLS
ALTER TABLE public.hr_work_areas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view work areas in their tenant" ON public.hr_work_areas;
CREATE POLICY "Users can view work areas in their tenant"
  ON public.hr_work_areas FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage work areas" ON public.hr_work_areas;
CREATE POLICY "HR admin can manage work areas"
  ON public.hr_work_areas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_work_areas_updated_at ON public.hr_work_areas;
CREATE TRIGGER hr_work_areas_updated_at
  BEFORE UPDATE ON public.hr_work_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6.2 hr_overtime_rules - Overtime calculation rules
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hr_overtime_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  
  -- Rule classification
  code text NOT NULL, -- e.g., "OT-WEEKDAY", "OT-WEEKEND", "OT-HOLIDAY"
  name text NOT NULL, -- e.g., "Weekday Overtime", "Weekend Overtime"
  
  -- Day type
  day_type text NOT NULL CHECK (day_type IN ('weekday', 'weekend', 'public_holiday', 'national_holiday')),
  
  -- Time-based rules (hour of day)
  start_hour integer CHECK (start_hour >= 0 AND start_hour <= 23), -- e.g., 17 = 5 PM
  end_hour integer CHECK (end_hour >= 0 AND end_hour <= 23), -- e.g., 21 = 9 PM
  
  -- Overtime multiplier (based on Indonesian labor law)
  -- Hour 1: 1.5x, Hour 2+: 2x for weekday
  -- Weekend/holiday: different rates
  first_hour_multiplier numeric(5, 2) DEFAULT 1.50 CHECK (first_hour_multiplier >= 1.0),
  subsequent_hour_multiplier numeric(5, 2) DEFAULT 2.00 CHECK (subsequent_hour_multiplier >= 1.0),
  
  -- Max overtime per day/month
  max_hours_per_day numeric(4, 2) DEFAULT 4.00,
  max_hours_per_month numeric(4, 2) DEFAULT 60.00,
  
  -- Approval requirements
  requires_approval boolean DEFAULT true,
  approval_level text DEFAULT 'supervisor', -- supervisor, manager, hr
  
  -- Effective period
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  
  -- Status
  is_active boolean DEFAULT true,
  
  description text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, code)
);

CREATE INDEX IF NOT EXISTS idx_hr_overtime_rules_tenant ON public.hr_overtime_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_overtime_rules_entity ON public.hr_overtime_rules(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_overtime_rules_day_type ON public.hr_overtime_rules(day_type);
CREATE INDEX IF NOT EXISTS idx_hr_overtime_rules_active ON public.hr_overtime_rules(is_active);

-- Enable RLS
ALTER TABLE public.hr_overtime_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view overtime rules in their tenant" ON public.hr_overtime_rules;
CREATE POLICY "Users can view overtime rules in their tenant"
  ON public.hr_overtime_rules FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage overtime rules" ON public.hr_overtime_rules;
CREATE POLICY "HR admin can manage overtime rules"
  ON public.hr_overtime_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_overtime_rules_updated_at ON public.hr_overtime_rules;
CREATE TRIGGER hr_overtime_rules_updated_at
  BEFORE UPDATE ON public.hr_overtime_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Seed Data: Default Overtime Rules (Indonesian Labor Law)
-- =====================================================

-- Weekday overtime (after normal working hours)
INSERT INTO public.hr_overtime_rules (entity_id, code, name, day_type, start_hour, first_hour_multiplier, subsequent_hour_multiplier, max_hours_per_day, max_hours_per_month)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  'OT-WEEKDAY',
  'Weekday Overtime (After 5 PM)',
  'weekday',
  17, -- Starts at 5 PM
  1.50, -- First hour: 1.5x hourly rate
  2.00, -- Subsequent hours: 2x hourly rate
  4.00, -- Max 4 hours per day
  60.00 -- Max 60 hours per month
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- Weekend overtime (Saturday/Sunday)
INSERT INTO public.hr_overtime_rules (entity_id, code, name, day_type, first_hour_multiplier, subsequent_hour_multiplier, max_hours_per_day, max_hours_per_month)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  'OT-WEEKEND',
  'Weekend Overtime',
  'weekend',
  2.00, -- First hour: 2x
  3.00, -- Subsequent hours: 3x
  8.00, -- Max 8 hours per day
  60.00
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- Public holiday overtime
INSERT INTO public.hr_overtime_rules (entity_id, code, name, day_type, first_hour_multiplier, subsequent_hour_multiplier, max_hours_per_day, max_hours_per_month)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  'OT-HOLIDAY',
  'Public Holiday Overtime',
  'public_holiday',
  2.00, -- First hour: 2x
  3.00, -- Subsequent hours: 3x
  8.00,
  60.00
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Tables created:
-- - hr_work_areas (work location definitions)
-- - hr_overtime_rules (OT calculation rules per Indonesian labor law)
-- =====================================================
