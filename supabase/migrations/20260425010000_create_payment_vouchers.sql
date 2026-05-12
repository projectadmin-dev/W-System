-- =====================================================
-- Payment Voucher Module (BKK + BBK)
-- Bukti Kas Keluar / Bukti Bank Keluar
-- =====================================================

-- ============================================
-- 1. PAYMENT VOUCHERS (Header)
-- ============================================
CREATE TABLE IF NOT EXISTS public.payment_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Voucher identity
  voucher_type TEXT NOT NULL CHECK (voucher_type IN ('BKK', 'BBK')),
  voucher_number TEXT NOT NULL UNIQUE,
  voucher_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Sender (source account)
  sender_account_id UUID, -- FK ke bank_accounts OR petty_cash_custodians
  sender_type TEXT NOT NULL CHECK (sender_type IN ('bank', 'petty_cash')),

  -- Receiver
  receiver_name TEXT NOT NULL,
  receiver_account_no TEXT,
  receiver_bank TEXT,
  vendor_id UUID REFERENCES public.fin_vendors(id) ON DELETE SET NULL,

  -- Main payment
  main_coa_id UUID NOT NULL REFERENCES public.coa(id),
  main_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Totals
  currency TEXT NOT NULL DEFAULT 'IDR',
  exchange_rate DECIMAL(10,4) NOT NULL DEFAULT 1,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Narrative
  notes TEXT,
  description TEXT,
  reference_number TEXT, -- no invoice vendor / referensi

  -- Status lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'cancelled', 'voided')),

  -- Approval & audit
  approved_by UUID REFERENCES public.user_profiles(id),
  approved_at TIMESTAMPTZ,
  prepared_by UUID NOT NULL REFERENCES public.user_profiles(id),

  -- Auto-journal link
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,

  -- Attachments
  attachment_url TEXT,

  -- Print audit
  printed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_vouchers_tenant ON payment_vouchers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_type ON payment_vouchers(voucher_type);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_number ON payment_vouchers(voucher_number);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_status ON payment_vouchers(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_sender ON payment_vouchers(sender_account_id, sender_type);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_date ON payment_vouchers(voucher_date);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_vendor ON payment_vouchers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_journal ON payment_vouchers(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_payment_vouchers_deleted_at ON payment_vouchers(deleted_at) WHERE deleted_at IS NULL;

ALTER TABLE payment_vouchers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. PAYMENT VOUCHER ITEMS (Biaya Lainnya)
-- ============================================
CREATE TABLE IF NOT EXISTS public.payment_voucher_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_voucher_id UUID NOT NULL REFERENCES public.payment_vouchers(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  coa_id UUID NOT NULL REFERENCES public.coa(id),
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pvi_voucher ON payment_voucher_items(payment_voucher_id);
CREATE INDEX IF NOT EXISTS idx_pvi_coa ON payment_voucher_items(coa_id);

ALTER TABLE payment_voucher_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. AUTO-NUMBERING FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION generate_voucher_number(v_type TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  prefix := v_type || '-' || TO_CHAR(NOW(), 'YYYYMM');

  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(voucher_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM public.payment_vouchers
  WHERE voucher_number LIKE prefix || '-%'
    AND deleted_at IS NULL;

  result := prefix || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. AUTO-UPDATE total_amount TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION recalc_voucher_total()
RETURNS TRIGGER AS $$
DECLARE
  v_main DECIMAL(15,2);
  v_items DECIMAL(15,2);
  v_voucher_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_voucher_id := OLD.payment_voucher_id;
  ELSE
    v_voucher_id := NEW.payment_voucher_id;
  END IF;

  SELECT main_amount INTO v_main FROM public.payment_vouchers WHERE id = v_voucher_id;
  SELECT COALESCE(SUM(amount), 0) INTO v_items FROM public.payment_voucher_items WHERE payment_voucher_id = v_voucher_id;

  UPDATE public.payment_vouchers
  SET total_amount = COALESCE(v_main, 0) + COALESCE(v_items, 0),
      updated_at = NOW()
  WHERE id = v_voucher_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalc_voucher_total ON public.payment_voucher_items;
CREATE TRIGGER trg_recalc_voucher_total
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_voucher_items
  FOR EACH ROW
  EXECUTE FUNCTION recalc_voucher_total();

-- Also update total when main_amount changes
DROP TRIGGER IF EXISTS trg_recalc_voucher_main ON public.payment_vouchers;
CREATE TRIGGER trg_recalc_voucher_main
  AFTER UPDATE OF main_amount ON public.payment_vouchers
  FOR EACH ROW
  EXECUTE FUNCTION recalc_voucher_total();

-- ============================================
-- 5. RLS POLICIES (simple — admin/finance full access)
-- ============================================
DROP POLICY IF EXISTS "payment_vouchers_admin_all" ON public.payment_vouchers;
CREATE POLICY "payment_vouchers_admin_all"
  ON public.payment_vouchers FOR ALL
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "payment_voucher_items_admin_all" ON public.payment_voucher_items;
CREATE POLICY "payment_voucher_items_admin_all"
  ON public.payment_voucher_items FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.payment_vouchers pv WHERE pv.id = payment_voucher_items.payment_voucher_id
    AND pv.tenant_id = (auth.jwt()->>'tenant_id')::uuid
  ));
