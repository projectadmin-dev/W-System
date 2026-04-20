-- Migration: 2026041800127_create_crm_quotations.sql
-- Description: Create CRM quotations table (required by finance invoices and tickets)
-- Dependencies: 0001 (tenants), 0002 (entities), 0005 (user_profiles)

-- Drop existing if re-running
DROP TABLE IF EXISTS public.quotation_items CASCADE;
DROP TABLE IF EXISTS public.quotations CASCADE;

-- Quotations table (CRM)
CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id),
  
  -- Quotation number (QT-YYYY-MM-NNNN)
  quotation_number text NOT NULL UNIQUE,
  
  -- Links
  client_id uuid NOT NULL REFERENCES public.clients(id),
  project_id uuid REFERENCES public.projects(id),
  
  -- Quotation details
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date NOT NULL,
  payment_terms_days integer DEFAULT 30,
  
  -- Status
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted')),
  
  -- Financial
  subtotal numeric(20,4) NOT NULL,
  tax_rate numeric(5,2) DEFAULT 11,
  tax_amount numeric(20,4) DEFAULT 0,
  discount_amount numeric(20,4) DEFAULT 0,
  total_amount numeric(20,4) NOT NULL,
  currency text NOT NULL DEFAULT 'IDR',
  
  -- Notes
  notes text,
  terms_conditions text,
  
  -- Ownership
  prepared_by uuid NOT NULL REFERENCES public.user_profiles(id),
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- Indexes
CREATE INDEX idx_quotations_tenant ON public.quotations(tenant_id);
CREATE INDEX idx_quotations_entity ON public.quotations(entity_id);
CREATE INDEX idx_quotations_client ON public.quotations(client_id);
CREATE INDEX idx_quotations_project ON public.quotations(project_id);
CREATE INDEX idx_quotations_status ON public.quotations(status);

-- RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON public.quotations;
CREATE POLICY "tenant_isolation" ON public.quotations
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

DROP POLICY IF EXISTS "prepared_by_access" ON public.quotations;
CREATE POLICY "prepared_by_access" ON public.quotations
  FOR SELECT
  USING (
    prepared_by = current_setting('app.current_user')::uuid
    OR created_by = current_setting('app.current_user')::uuid
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_quotations_updated_at ON public.quotations;
CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Quotation Items
CREATE TABLE public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit_price numeric(20,4) NOT NULL,
  total numeric(20,4) NOT NULL,
  coa_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_quotation_items_quotation ON public.quotation_items(quotation_id);

-- RLS
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_items" ON public.quotation_items;
CREATE POLICY "tenant_isolation_items" ON public.quotation_items
  FOR ALL
  USING (
    quotation_id IN (
      SELECT id FROM public.quotations WHERE tenant_id = current_setting('app.current_tenant')::uuid
    )
  );

-- Grant permissions
GRANT ALL ON public.quotations TO postgres;
GRANT ALL ON public.quotations TO anon;
GRANT ALL ON public.quotations TO authenticated;

GRANT ALL ON public.quotation_items TO postgres;
GRANT ALL ON public.quotation_items TO anon;
GRANT ALL ON public.quotation_items TO authenticated;
