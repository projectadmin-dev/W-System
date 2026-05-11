-- =====================================================
-- Fix: hr_overtime_rules schema to match frontend type
-- =====================================================
-- Change: Simple overtime rule structure with:
--   - min_overtime_minutes
--   - overtime_multiplier
--   - max_hours_per_day/month
-- =====================================================

-- Drop existing rules to avoid conflicts
-- First, backup if needed
-- CREATE TABLE IF NOT EXISTS public.hr_overtime_rules_backup AS SELECT * FROM public.hr_overtime_rules WHERE 1=0;

-- Drop and recreate with new structure
DROP TABLE IF EXISTS public.hr_overtime_rules;

CREATE TABLE public.hr_overtime_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  
  -- Rule classification
  code text NOT NULL,
  name text NOT NULL,
  
  -- Overtime calculation parameters
  min_overtime_minutes integer DEFAULT 30 CHECK (min_overtime_minutes >= 0),
  overtime_multiplier numeric(5, 2) DEFAULT 1.50 CHECK (overtime_multiplier >= 1.0),
  max_overtime_hours_per_day integer DEFAULT 4 CHECK (max_overtime_hours_per_day >= 0),
  max_overtime_hours_per_month integer DEFAULT 60 CHECK (max_overtime_hours_per_month >= 0),
  
  -- Status
  is_active boolean DEFAULT true,
  
  description text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, code)
);

CREATE INDEX idx_hr_overtime_rules_tenant ON public.hr_overtime_rules(tenant_id);
CREATE INDEX idx_hr_overtime_rules_entity ON public.hr_overtime_rules(entity_id);
CREATE INDEX idx_hr_overtime_rules_active ON public.hr_overtime_rules(is_active);

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
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() 
      AND r.name IN ('admin', 'hr_admin')
      AND up.deleted_at IS NULL
    )
  );

-- Trigger
DROP TRIGGER IF EXISTS hr_overtime_rules_updated_at ON public.hr_overtime_rules;
CREATE TRIGGER hr_overtime_rules_updated_at
  BEFORE UPDATE ON public.hr_overtime_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
