-- =====================================================
-- Migration: Extend Payroll Slips for THR & Pro-Rate
-- Date: 2026-04-22
-- Description: Add THR and pro-rate fields to payroll_slips
-- =====================================================

-- Add new columns to existing payroll_slips table
ALTER TABLE public.payroll_slips
ADD COLUMN IF NOT EXISTS thr_amount numeric(20, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS thr_months numeric(5, 2) DEFAULT 0, -- e.g., 2.0 = 2 months, 0.17 = 2 months prorated
ADD COLUMN IF NOT EXISTS pro_rate_days integer,
ADD COLUMN IF NOT EXISTS pro_rate_applied boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pro_rate_reason text, -- "mid_month_join" or "mid_month_resign"
ADD COLUMN IF NOT EXISTS allowance_breakdown jsonb, -- Summary of allowance calculations
ADD COLUMN IF NOT EXISTS calculation_metadata jsonb; -- Additional calculation details

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_payroll_slips_thr ON public.payroll_slips(thr_amount);
CREATE INDEX IF NOT EXISTS idx_payroll_slips_pro_rate ON public.payroll_slips(pro_rate_applied);

-- Update payroll_slip_details categories to include new types
-- Note: This is a documentation comment - the actual category values are used in application code
-- New categories:
-- - 'thr': Tunjangan Hari Raya
-- - 'salary_prorate': Pro-rated salary adjustment
-- - 'allowance_prorate': Pro-rated allowance adjustment
-- - 'leave_encashment': Payment for unused leave (upon resignation)

COMMENT ON COLUMN public.payroll_slips.thr_amount IS 'THR amount for this period (if applicable)';
COMMENT ON COLUMN public.payroll_slips.thr_months IS 'Number of months used for THR calculation (e.g., 2.0 for 2 months, 0.17 for 2/12)';
COMMENT ON COLUMN public.payroll_slips.pro_rate_days IS 'Number of days worked in the period (for pro-rate calculation)';
COMMENT ON COLUMN public.payroll_slips.pro_rate_applied IS 'TRUE if pro-rate calculation was applied';
COMMENT ON COLUMN public.payroll_slips.pro_rate_reason IS 'Reason for pro-rate: mid_month_join or mid_month_resign';
COMMENT ON COLUMN public.payroll_slips.allowance_breakdown IS 'JSON summary: {"FIXED": 500000, "ATTENDANCE_BASED": 477273, "CONDITIONAL": 0, "PRORATED": 250000}';
COMMENT ON COLUMN public.payroll_slips.calculation_metadata IS 'Additional metadata: {"working_days": 22, "present_days": 21, "alpha_days": 1}';
