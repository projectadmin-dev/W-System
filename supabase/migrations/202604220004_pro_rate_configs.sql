-- =====================================================
-- Migration: Pro-Rate Configuration
-- Date: 2026-04-22
-- Description: Pro-rate calculation settings for mid-month join/resign
-- =====================================================

CREATE TABLE IF NOT EXISTS public.pro_rate_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  
  -- Configuration name
  name text NOT NULL, -- e.g., "Default Pro-Rate", "Jakarta Office Pro-Rate"
  
  -- Working days configuration
  default_working_days integer NOT NULL DEFAULT 22 CHECK (default_working_days >= 1 AND default_working_days <= 31),
  -- Default: 22 days/month (standard working days)
  
  -- Pro-rate scope
  prorate_salary boolean DEFAULT true, -- Apply pro-rate to basic salary
  prorate_allowances boolean DEFAULT true, -- Apply pro-rate to allowances (FIXED, PRORATED types)
  
  -- Cut-off date for payroll period
  -- Employees joining before this date → included in current month payroll
  -- Employees joining after this date → start from next month payroll
  payroll_cutoff_date integer NOT NULL DEFAULT 23 CHECK (payroll_cutoff_date >= 1 AND payroll_cutoff_date <= 31),
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Audit
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(entity_id)
);

CREATE INDEX IF NOT EXISTS idx_pro_rate_configs_entity ON public.pro_rate_configs(entity_id);

-- Enable RLS
ALTER TABLE public.pro_rate_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view pro-rate configs in their entity" ON public.pro_rate_configs;
CREATE POLICY "Users can view pro-rate configs in their entity"
  ON public.pro_rate_configs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.entity_id = pro_rate_configs.entity_id
      AND up.tenant_id = (auth.jwt()->>'tenant_id')::uuid
    )
  );

DROP POLICY IF EXISTS "HR admin can manage pro-rate configs" ON public.pro_rate_configs;
CREATE POLICY "HR admin can manage pro-rate configs"
  ON public.pro_rate_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Trigger
DROP TRIGGER IF EXISTS pro_rate_configs_updated_at ON public.pro_rate_configs;
CREATE TRIGGER pro_rate_configs_updated_at
  BEFORE UPDATE ON public.pro_rate_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.pro_rate_configs IS 'Pro-rate calculation configuration for mid-month join/resign employees';
COMMENT ON COLUMN public.pro_rate_configs.default_working_days IS 'Standard working days per month (default: 22)';
COMMENT ON COLUMN public.pro_rate_configs.payroll_cutoff_date IS 'Cut-off date for payroll inclusion (default: 23)';
