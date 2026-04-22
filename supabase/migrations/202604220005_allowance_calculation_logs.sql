-- =====================================================
-- Migration: Allowance Calculation Logs (Audit Trail)
-- Date: 2026-04-22
-- Description: Detailed audit trail for allowance calculations per payroll period
-- =====================================================

CREATE TABLE IF NOT EXISTS public.allowance_calculation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_slip_id uuid REFERENCES public.payroll_slips(id) ON DELETE CASCADE,
  employee_allowance_id uuid REFERENCES public.employee_allowances(id) ON DELETE SET NULL,
  
  -- Allowance type snapshot
  allowance_type text NOT NULL CHECK (allowance_type IN (
    'FIXED', 'ATTENDANCE_BASED', 'CONDITIONAL', 'PRORATED'
  )),
  
  -- Base values
  base_nominal numeric(20, 4) NOT NULL, -- Original nominal from allowance_type or employee_allowances
  
  -- Calculation result
  calculated_amount numeric(20, 4) NOT NULL, -- Final calculated amount
  
  -- Attendance breakdown (for ATTENDANCE_BASED type)
  working_days integer, -- Total working days in the month
  present_days integer, -- Days present (HADIR)
  alpha_days integer DEFAULT 0, -- Days alpha (unauthorized absence)
  sick_leave_days integer DEFAULT 0, -- Days sick leave (with certificate)
  paid_leave_days integer DEFAULT 0, -- Days paid leave (annual leave)
  late_days integer DEFAULT 0, -- Days late (for late allowance deduction)
  
  -- Deduction breakdown
  deduction_amount numeric(20, 4) DEFAULT 0, -- Total deducted amount
  deduction_breakdown jsonb, -- Detailed breakdown: {"alpha": 50000, "sick": 0, "paid": 0}
  
  -- Calculation formula (for transparency)
  calculation_formula text, -- e.g., "500000 - (500000 / 22 * 1) = 477273"
  
  -- Conditional evaluation (for CONDITIONAL type)
  condition_met boolean, -- TRUE if condition rules are satisfied
  condition_details jsonb, -- e.g., {"has_overtime": true, "overtime_hours": 8}
  
  -- Prorate info (for PRORATED type or mid-month join/resign)
  is_prorated boolean DEFAULT false,
  prorated_days integer, -- Actual working days in the month
  prorated_reason text, -- "mid_month_join" or "mid_month_resign"
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  
  -- Indexes for reporting
  UNIQUE(payroll_slip_id, employee_allowance_id)
);

CREATE INDEX IF NOT EXISTS idx_allowance_logs_payroll ON public.allowance_calculation_logs(payroll_slip_id);
CREATE INDEX IF NOT EXISTS idx_allowance_logs_employee ON public.allowance_calculation_logs(employee_allowance_id);
CREATE INDEX IF NOT EXISTS idx_allowance_logs_type ON public.allowance_calculation_logs(allowance_type);
CREATE INDEX IF NOT EXISTS idx_allowance_logs_period ON public.allowance_calculation_logs(created_at);

-- Enable RLS
ALTER TABLE public.allowance_calculation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their allowance calculation logs" ON public.allowance_calculation_logs;
CREATE POLICY "Users can view their allowance calculation logs"
  ON public.allowance_calculation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payroll_slips ps
      JOIN public.user_profiles up ON up.id = ps.employee_id
      WHERE ps.id = allowance_calculation_logs.payroll_slip_id
      AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "HR admin can view all allowance calculation logs" ON public.allowance_calculation_logs;
CREATE POLICY "HR admin can view all allowance calculation logs"
  ON public.allowance_calculation_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

COMMENT ON TABLE public.allowance_calculation_logs IS 'Audit trail for allowance calculations - shows exactly how each allowance was calculated per payroll period';
COMMENT ON COLUMN public.allowance_calculation_logs.deduction_breakdown IS 'JSON breakdown of deductions: {"alpha": amount, "sick": amount, "paid": amount}';
COMMENT ON COLUMN public.allowance_calculation_logs.condition_details IS 'JSON details for CONDITIONAL type: {"has_overtime": true, "overtime_hours": 8, "on_project": true}';
