-- =====================================================
-- Migration: COA 5-Layer Enhancement
-- Adds coa_layer identifier + all reporting flags
-- =====================================================

-- 1. Add coa_layer (the "layer badge" for UI/UX)
ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS coa_layer text
    CHECK (coa_layer IN ('category', 'type', 'sub_account', 'general_ledger', 'detail_ledger'));

-- 2. Add sort_order for display ordering within siblings
ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- 3. Reporting classification flags (Category layer)
ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS enum_laporan_keuangan text
    CHECK (enum_laporan_keuangan IN ('INCOME_STATEMENT', 'BALANCE_SHEET'));

ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS enum_laporan_keuangan_category text
    CHECK (enum_laporan_keuangan_category IN (
      'ASSET', 'LIABILITY', 'EQUITY',
      'REVENUE', 'COGS', 'OPEX',
      'OTHER_INCOME', 'OTHER_EXPENSE', 'TAX_EXPENSE'
    ));

-- 4. Account Type flags (Type layer)
ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS contra_account boolean NOT NULL DEFAULT false;

ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS direct_indirect_cost text
    CHECK (direct_indirect_cost IN ('DIRECT', 'INDIRECT'));

-- Cost category for Cost per Departemen (CPD) matrix
ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS enum_cost_category text
    CHECK (enum_cost_category IN (
      'PERSONNEL', 'OPERATIONAL', 'MARKETING', 'TECHNOLOGY', 'OVERHEAD'
    ));

-- 5. Sub Account flags (Sub Account layer — CF, budgeting, tax)
ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS enum_cf_section text
    CHECK (enum_cf_section IN ('OPERATING', 'INVESTING', 'FINANCING', 'EXCLUDED'));

ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS enum_cf_line text;

ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS is_working_capital boolean NOT NULL DEFAULT false;

ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS is_non_cash_item boolean NOT NULL DEFAULT false;

ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS is_budgeted boolean NOT NULL DEFAULT false;

ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS is_tax_deductible boolean NOT NULL DEFAULT true;

-- Shared across GL, sub_account, detail layers
ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS is_restricted boolean NOT NULL DEFAULT false;

-- 6. Detail Ledger flags
ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS is_trial_balance boolean NOT NULL DEFAULT true;

ALTER TABLE public.coa
  ADD COLUMN IF NOT EXISTS is_taxation_report boolean NOT NULL DEFAULT false;

-- 7. Indexes for reporting queries
CREATE INDEX IF NOT EXISTS idx_coa_laporan ON public.coa(tenant_id, enum_laporan_keuangan)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_coa_lk_category ON public.coa(tenant_id, enum_laporan_keuangan_category)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_coa_layer ON public.coa(tenant_id, coa_layer)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_coa_budgeted ON public.coa(tenant_id, is_budgeted)
  WHERE deleted_at IS NULL AND is_budgeted = true;

COMMENT ON COLUMN public.coa.coa_layer IS
  'Layer in 5-layer COA hierarchy: category > type > sub_account > general_ledger > detail_ledger. Used for layer badges in UI.';

COMMENT ON COLUMN public.coa.enum_laporan_keuangan IS
  'Which financial statement this account belongs to: INCOME_STATEMENT or BALANCE_SHEET.';

COMMENT ON COLUMN public.coa.enum_laporan_keuangan_category IS
  'Section within the financial statement. Drives IS tree grouping and CF sign logic.';

COMMENT ON COLUMN public.coa.contra_account IS
  'Flips sign multiplier. E.g., Accumulated Depreciation (credit normal but reduces asset).';

COMMENT ON COLUMN public.coa.enum_cf_section IS
  'Cash Flow section for balance sheet accounts: INVESTING for fixed assets, FINANCING for LT debt/equity.';

COMMENT ON COLUMN public.coa.is_working_capital IS
  'TRUE for short-term BS accounts (AR, AP, inventory) — drives Changes in Working Capital in CF indirect method.';

COMMENT ON COLUMN public.coa.is_non_cash_item IS
  'TRUE for IS accounts that are non-cash (depreciation, amortization) — add-back in CF indirect method.';
