-- Migration: Add cash_flow_category to COA
-- Purpose: Tag each COA account for Cash Flow Statement auto-generation (PSAK/IFRS)
-- Date: 2026-04-25

-- 1. Add cash_flow_category column
ALTER TABLE public.coa
ADD COLUMN IF NOT EXISTS cash_flow_category text
CHECK (cash_flow_category IN ('operating', 'investing', 'financing', 'non_cash', 'not_applicable'));

COMMENT ON COLUMN public.coa.cash_flow_category IS
  'Cash flow classification per PSAK/IFRS:
   - operating: Cash flows from core business activities
   - investing: Cash flows from acquisition/disposal of assets & investments
   - financing: Cash flows from debt and equity financing activities
   - non_cash: Non-cash items (depreciation, amortization)
   - not_applicable: Items not in cash flow statement (nominal accounts)';

-- 2. Add index for fast cash flow report queries
CREATE INDEX IF NOT EXISTS idx_coa_cash_flow_category
ON public.coa(tenant_id, cash_flow_category)
WHERE cash_flow_category IS NOT NULL;

-- 3. Update existing COA records with cash_flow_category based on account patterns
UPDATE public.coa
SET cash_flow_category = CASE
    -- Cash & Banks → Operating
    WHEN account_code ILIKE '1-110%' OR account_code ILIKE '1-111%' OR account_code ILIKE '1-112%'
      THEN 'operating'

    -- Receivables (short-term) → Operating
    WHEN account_code ILIKE '1-120%' OR account_code ILIKE '1-121%' OR account_code ILIKE '1-130%'
      THEN 'operating'

    -- Inventory & Prepayments → Operating
    WHEN account_code ILIKE '1-140%' OR account_code ILIKE '1-141%' OR account_code ILIKE '1-150%'
      THEN 'operating'

    -- Short-term Payables → Operating
    WHEN account_code ILIKE '2-110%' OR account_code ILIKE '2-111%' OR account_code ILIKE '2-120%'
      THEN 'operating'

    -- Taxes payable (short-term) → Operating
    WHEN account_code ILIKE '2-130%' OR account_code ILIKE '2-131%'
      THEN 'operating'

    -- Accrued expenses → Operating
    WHEN account_code ILIKE '2-140%'
      THEN 'operating'

    -- Revenue accounts → Operating
    WHEN account_code ILIKE '4-%'
      THEN 'operating'

    -- Cost of Goods Sold & Operating Expenses → Operating
    WHEN account_code ILIKE '5-100%' OR account_code ILIKE '5-110%' OR account_code ILIKE '5-120%' OR account_code ILIKE '5-130%'
      THEN 'operating'

    -- Fixed Assets & Accumulated Depreciation → Investing
    WHEN account_code ILIKE '1-210%' OR account_code ILIKE '1-211%' OR account_code ILIKE '1-220%'
      THEN 'investing'

    -- Intangible Assets → Investing
    WHEN account_code ILIKE '1-230%' OR account_code ILIKE '1-231%'
      THEN 'investing'

    -- Long-term Investments → Investing
    WHEN account_code ILIKE '1-240%' OR account_code ILIKE '1-241%'
      THEN 'investing'

    -- Assets under construction (CWIP) → Investing
    WHEN account_code ILIKE '1-250%'
      THEN 'investing'

    -- Long-term Debt & Bank Loans → Financing
    WHEN account_code ILIKE '2-210%' OR account_code ILIKE '2-211%' OR account_code ILIKE '2-220%'
      THEN 'financing'

    -- Bonds Payable → Financing
    WHEN account_code ILIKE '2-230%'
      THEN 'financing'

    -- Equity: Share Capital, Agio, Retained Earnings → Financing
    WHEN account_code ILIKE '3-110%' OR account_code ILIKE '3-111%' OR account_code ILIKE '3-120%' OR account_code ILIKE '3-121%'
      THEN 'financing'

    -- Dividends → Financing
    WHEN account_code ILIKE '3-130%'
      THEN 'financing'

    -- Depreciation & Amortization → Non-Cash
    WHEN account_name ILIKE '%depresiasi%' OR account_name ILIKE '%amortisas%' OR account_name ILIKE '%penyusutan%'
      THEN 'non_cash'

    -- Tax expense (if shown separately) → Operating
    WHEN account_code ILIKE '5-140%'
      THEN 'operating'

    -- Other operating expenses
    WHEN account_code ILIKE '5-190%'
      THEN 'operating'

    -- Other revenue
    WHEN account_code ILIKE '4-190%'
      THEN 'operating'

    -- Other non-operating items → not_applicable
    ELSE 'not_applicable'
  END
WHERE cash_flow_category IS NULL;

-- 4. Make sure RLS allows updating cash_flow_category
-- (already covered by existing finance_manage_coa policy)
