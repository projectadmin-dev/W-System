-- =====================================================
-- FASE-1: Finance Module (COA + Invoices + Payments)
-- =====================================================
-- Based on USER_STORIES v3.0 § 2.6 (US-Q2C-006, US-Q2C-007)
-- PSAK-compliant Chart of Accounts + AR Management
-- =====================================================

-- 9.1 Chart of Accounts (COA) Table
CREATE TABLE IF NOT EXISTS public.coa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_code text NOT NULL, -- e.g., "1-1000" for Assets
  account_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN (
    'asset', 'liability', 'equity', 'revenue', 'expense'
  )),
  parent_account_id uuid REFERENCES public.coa(id),
  level integer NOT NULL DEFAULT 1, -- hierarchy level
  is_active boolean NOT NULL DEFAULT true,
  normal_balance text CHECK (normal_balance IN ('debit', 'credit')),
  tax_code text, -- linked to tax_rates
  description text,
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- 9.2 Indexes
CREATE INDEX IF NOT EXISTS idx_coa_tenant ON coa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_coa_code ON coa(tenant_id, account_code);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON coa(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_coa_type ON coa(tenant_id, account_type);

-- 9.3 Enable RLS
ALTER TABLE public.coa ENABLE ROW LEVEL SECURITY;

-- 9.4 RLS Policies

-- Finance: full access
DROP POLICY IF EXISTS "finance_manage_coa" ON public.coa;
CREATE POLICY "finance_manage_coa"
  ON public.coa FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  );

-- Commercial/PM: read only (for project costing context)
DROP POLICY IF EXISTS "others_read_coa" ON public.coa;
CREATE POLICY "others_read_coa"
  ON public.coa FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('commercial', 'pm', 'ceo')
    )
  );

-- 9.5 Invoices Table (Accounts Receivable)
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id),
  
  -- Invoice number (INV-YYYY-MM-NNNN)
  invoice_number text NOT NULL UNIQUE,
  
  -- Links
  client_id uuid NOT NULL REFERENCES public.clients(id),
  project_id uuid REFERENCES public.projects(id), -- will be created later
  quotation_id uuid REFERENCES public.quotations(id),
  ticket_id uuid REFERENCES public.tickets(id), -- will be created later
  
  -- Invoice details
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  payment_terms_days integer DEFAULT 30,
  
  -- Line items
  line_items jsonb NOT NULL, -- [{description, quantity, unit_price, total, coa_id}]
  
  -- Financial
  subtotal numeric(20,4) NOT NULL,
  tax_rate numeric(5,2) DEFAULT 11,
  tax_amount numeric(20,4) DEFAULT 0,
  discount_amount numeric(20,4) DEFAULT 0,
  total_amount numeric(20,4) NOT NULL,
  currency text NOT NULL DEFAULT 'IDR',
  
  -- Status
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled'
  )),
  
  -- Payment tracking
  amount_paid numeric(20,4) DEFAULT 0,
  amount_due numeric(20,4) NOT NULL DEFAULT 0, -- Computed: total_amount - amount_paid
  last_payment_at timestamptz,
  
  -- Aging (for credit check) - computed in application layer
  aging_days integer DEFAULT 0, -- Computed: CASE WHEN due_date < CURRENT_DATE THEN CURRENT_DATE - due_date ELSE 0 END
  
  -- Notes
  notes text,
  billing_address text,
  
  -- Ownership
  issued_by uuid NOT NULL REFERENCES public.user_profiles(id),
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- 9.6 Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date) WHERE status NOT IN ('paid', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_invoices_aging ON invoices(aging_days) WHERE status = 'overdue';
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- 9.7 Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 9.8 RLS Policies

-- Finance: full access
DROP POLICY IF EXISTS "finance_manage_invoices" ON public.invoices;
CREATE POLICY "finance_manage_invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  );

-- Commercial: read invoices for their clients
DROP POLICY IF EXISTS "commercial_read_invoices" ON public.invoices;
CREATE POLICY "commercial_read_invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('commercial', 'commercial_director')
    )
  );

-- PM: read invoices for their projects
DROP POLICY IF EXISTS "pm_read_project_invoices" ON public.invoices;
CREATE POLICY "pm_read_project_invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('pm', 'pm_lead')
    )
  );

-- Client: read own invoices only
DROP POLICY IF EXISTS "client_read_own_invoices" ON public.invoices;
CREATE POLICY "client_read_own_invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND auth.jwt()->>'role' = 'client'
    AND client_id = (auth.jwt()->>'client_id')::uuid
  );

-- 9.9 Payments Table (Cash Receipt)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Payment number (PMT-YYYY-MM-NNNN)
  payment_number text NOT NULL UNIQUE,
  
  -- Links
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  
  -- Payment details
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL CHECK (payment_method IN (
    'bank_transfer', 'cash', 'check', 'credit_card', 'ewallet'
  )),
  bank_account text, -- for transfers
  check_number text, -- for checks
  
  -- Amount
  amount numeric(20,4) NOT NULL,
  currency text NOT NULL DEFAULT 'IDR',
  exchange_rate numeric(10,4) DEFAULT 1, -- for multi-currency
  
  -- Reference
  reference_number text, -- bank reference
  notes text,
  
  -- Reconciliation
  reconciled boolean NOT NULL DEFAULT false,
  reconciled_at timestamptz,
  reconciled_by uuid REFERENCES public.user_profiles(id),
  
  -- Ownership
  received_by uuid NOT NULL REFERENCES public.user_profiles(id),
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- 9.10 Indexes
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_reconciled ON payments(tenant_id, reconciled) WHERE deleted_at IS NULL;

-- 9.11 Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 9.12 RLS Policies

-- Finance: full access
DROP POLICY IF EXISTS "finance_manage_payments" ON public.payments;
CREATE POLICY "finance_manage_payments"
  ON public.payments FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    )
  );

-- Commercial: read payments
DROP POLICY IF EXISTS "commercial_read_payments" ON public.payments;
CREATE POLICY "commercial_read_payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('commercial', 'commercial_director')
    )
  );

-- Client: read own payments
DROP POLICY IF EXISTS "client_read_own_payments" ON public.payments;
CREATE POLICY "client_read_own_payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND auth.jwt()->>'role' = 'client'
    AND client_id = (auth.jwt()->>'client_id')::uuid
  );

-- 9.13 Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9.14 Function: Update invoice amount_paid on payment insert
CREATE OR REPLACE FUNCTION public.update_invoice_payment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.invoices
  SET 
    amount_paid = COALESCE(amount_paid, 0) + NEW.amount,
    last_payment_at = NEW.payment_date,
    status = CASE 
      WHEN COALESCE(amount_paid, 0) + NEW.amount >= total_amount THEN 'paid'
      WHEN COALESCE(amount_paid, 0) + NEW.amount > 0 THEN 'partially_paid'
      ELSE status
    END
  WHERE id = NEW.invoice_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9.15 Trigger: Auto-update invoice on payment
DROP TRIGGER IF EXISTS payment_updates_invoice ON payments;
CREATE TRIGGER payment_updates_invoice
  AFTER INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_payment();

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
