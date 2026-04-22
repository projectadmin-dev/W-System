-- =====================================================
-- Migration: Employee Allowances
-- Date: 2026-04-22
-- Description: Link allowance types to employees with individual overrides
-- =====================================================

CREATE TABLE IF NOT EXISTS public.employee_allowances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  allowance_type_id uuid REFERENCES public.allowance_types(id) ON DELETE CASCADE NOT NULL,
  
  -- Amount configuration
  nominal numeric(20, 4) NOT NULL DEFAULT 0, -- Base amount from allowance type
  override_nominal numeric(20, 4), -- Individual override (nullable = use default)
  
  -- Validity period
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date, -- NULL = indefinite
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Audit
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  
  -- Ensure one allowance type per employee (active at a time)
  UNIQUE(employee_id, allowance_type_id, start_date)
);

CREATE INDEX IF NOT EXISTS idx_employee_allowances_employee ON public.employee_allowances(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_allowances_type ON public.employee_allowances(allowance_type_id);
CREATE INDEX IF NOT EXISTS idx_employee_allowances_active ON public.employee_allowances(is_active);
CREATE INDEX IF NOT EXISTS idx_employee_allowances_date ON public.employee_allowances(start_date, end_date);

-- Enable RLS
ALTER TABLE public.employee_allowances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own allowances" ON public.employee_allowances;
CREATE POLICY "Users can view their own allowances"
  ON public.employee_allowances FOR SELECT
  USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "HR admin can manage employee allowances" ON public.employee_allowances;
CREATE POLICY "HR admin can manage employee allowances"
  ON public.employee_allowances FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = employee_allowances.employee_id
      AND up.tenant_id = (auth.jwt()->>'tenant_id')::uuid
    )
  );

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS employee_allowances_updated_at ON public.employee_allowances;
CREATE TRIGGER employee_allowances_updated_at
  BEFORE UPDATE ON public.employee_allowances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.employee_allowances IS 'Link between employees and allowance types with individual overrides';
COMMENT ON COLUMN public.employee_allowances.override_nominal IS 'Individual override amount (NULL = use allowance_type.default_nominal)';
