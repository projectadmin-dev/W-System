-- =====================================================
-- Migration: Allowance Types (Dynamic Allowance System)
-- Date: 2026-04-22
-- Description: Create allowance_types table for dynamic allowance management
-- =====================================================

CREATE TABLE IF NOT EXISTS public.allowance_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  
  -- Allowance info
  name text NOT NULL, -- e.g., "Tunjangan Kehadiran", "Tunjangan Transport"
  code text NOT NULL, -- e.g., "TKEHADIRAN", "TTRANSPORT"
  
  -- Type: determines calculation method
  type text NOT NULL CHECK (type IN (
    'FIXED', -- Fixed amount every month
    'ATTENDANCE_BASED', -- Based on attendance (deducted on alpha/sick/leave)
    'CONDITIONAL', -- Based on conditions (e.g., only if overtime, only if on project)
    'PRORATED' -- Prorated based on join/resign date
  )),
  
  -- Default amount
  default_nominal numeric(20, 4) DEFAULT 0,
  
  -- Tax treatment
  is_taxable boolean DEFAULT false, -- Included in taxable income
  
  -- Attendance-based deduction rules (only for ATTENDANCE_BASED type)
  deduct_on_alpha boolean DEFAULT true, -- Deduct if alpha (unauthorized absence)
  deduct_on_sick_leave boolean DEFAULT false, -- Deduct if sick leave (with certificate)
  deduct_on_paid_leave boolean DEFAULT false, -- Deduct if paid leave (annual leave)
  
  -- Conditional rules (JSONB, only for CONDITIONAL type)
  -- Example: {"condition": "has_overtime", "min_overtime_hours": 4}
  -- Example: {"condition": "assigned_to_project", "project_type": "billable"}
  condition_rules jsonb,
  
  -- Display order in payslip
  display_order integer DEFAULT 0,
  
  -- Metadata
  description text,
  is_active boolean DEFAULT true,
  
  -- Audit
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  
  UNIQUE(tenant_id, entity_id, code)
);

CREATE INDEX IF NOT EXISTS idx_allowance_types_tenant ON public.allowance_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_allowance_types_entity ON public.allowance_types(entity_id);
CREATE INDEX IF NOT EXISTS idx_allowance_types_type ON public.allowance_types(type);
CREATE INDEX IF NOT EXISTS idx_allowance_types_active ON public.allowance_types(is_active);

-- Enable RLS
ALTER TABLE public.allowance_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view allowance types in their tenant" ON public.allowance_types;
CREATE POLICY "Users can view allowance types in their tenant"
  ON public.allowance_types FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage allowance types" ON public.allowance_types;
CREATE POLICY "HR admin can manage allowance types"
  ON public.allowance_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  )
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS allowance_types_updated_at ON public.allowance_types;
CREATE TRIGGER allowance_types_updated_at
  BEFORE UPDATE ON public.allowance_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.allowance_types IS 'Dynamic allowance types: FIXED, ATTENDANCE_BASED, CONDITIONAL, PRORATED';
COMMENT ON COLUMN public.allowance_types.type IS 'Calculation method: FIXED (full amount), ATTENDANCE_BASED (deducted on absence), CONDITIONAL (based on rules), PRORATED (mid-month join/resign)';
COMMENT ON COLUMN public.allowance_types.condition_rules IS 'JSON rules for CONDITIONAL type: {"condition": "has_overtime", "min_hours": 4}';
