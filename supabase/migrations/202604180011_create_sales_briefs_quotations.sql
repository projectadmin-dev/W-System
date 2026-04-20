-- =====================================================
-- FASE-1: Sales Module (Project Briefs & Quotations)
-- =====================================================
-- Based on USER_STORIES v3.0 § 2.3-2.5 (US-Q2C-003, US-Q2C-005)
-- =====================================================

-- 8.1 Approval Rules Table (margin-based routing)
CREATE TABLE IF NOT EXISTS public.approval_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  margin_min numeric(5,2) NOT NULL, -- percentage
  margin_max numeric(5,2) NOT NULL, -- percentage
  approver_role text NOT NULL, -- role required for approval
  sla_days integer NOT NULL, -- approval SLA in business days
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8.2 Seed default approval rules (per USER_STORIES v3.0 § 2.3)
INSERT INTO public.approval_rules (tenant_id, margin_min, margin_max, approver_role, sla_days)
SELECT 
  t.id,
  rule.margin_min,
  rule.margin_max,
  rule.approver_role,
  rule.sla_days
FROM public.tenants t
CROSS JOIN (
  VALUES 
    (30.00, 999.99, 'pm', 1),
    (20.00, 30.00, 'commercial_director', 2),
    (10.00, 20.00, 'ceo', 3),
    (0.00, 10.00, 'ceo_cfo_dual', 5)
) AS rule(margin_min, margin_max, approver_role, sla_days)
ON CONFLICT DO NOTHING;

-- 8.3 Project Briefs Table
CREATE TABLE IF NOT EXISTS public.project_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id),
  lead_id uuid REFERENCES public.leads(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  
  -- Brief content
  title text NOT NULL,
  executive_summary text NOT NULL,
  scope_of_work text NOT NULL,
  assumptions text[],
  exclusions text[],
  deliverables text[],
  
  -- Financial (per USER_STORIES v3.0)
  estimated_revenue numeric(20,4) NOT NULL,
  estimated_cost numeric(20,4) NOT NULL,
  estimated_margin numeric(20,4) GENERATED ALWAYS AS (estimated_revenue - estimated_cost) STORED,
  estimated_margin_pct numeric(5,2) GENERATED ALWAYS AS (
    CASE WHEN estimated_revenue > 0 THEN ((estimated_revenue - estimated_cost) / estimated_revenue) * 100 ELSE 0 END
  ) STORED,
  currency text NOT NULL DEFAULT 'IDR',
  
  -- Workflow
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'under_review', 'approved', 'rejected', 'needs_revision'
  )),
  approval_tier text, -- auto-populated based on margin
  current_approver_id uuid REFERENCES public.user_profiles(id),
  approved_by uuid REFERENCES public.user_profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  
  -- Credit check snapshot (US-Q2C-003)
  credit_check_status text CHECK (credit_check_status IN ('pending', 'passed', 'failed', 'overridden')),
  credit_check_data jsonb,
  credit_check_performed_at timestamptz,
  
  -- SLA
  submitted_at timestamptz,
  sla_deadline_at timestamptz,
  sla_breached boolean NOT NULL DEFAULT false,
  
  -- Ownership
  commercial_pic_id uuid NOT NULL REFERENCES public.user_profiles(id),
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- 8.4 Indexes
CREATE INDEX IF NOT EXISTS idx_briefs_tenant ON project_briefs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_briefs_status ON project_briefs(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_briefs_client ON project_briefs(client_id);
CREATE INDEX IF NOT EXISTS idx_briefs_lead ON project_briefs(lead_id);
CREATE INDEX IF NOT EXISTS idx_briefs_approver ON project_briefs(current_approver_id) 
  WHERE status = 'under_review';
CREATE INDEX IF NOT EXISTS idx_briefs_commercial ON project_briefs(commercial_pic_id);

-- 8.5 Enable RLS
ALTER TABLE public.project_briefs ENABLE ROW LEVEL SECURITY;

-- 8.6 RLS Policies

-- Commercial: full access for own tenant briefs
DROP POLICY IF EXISTS "commercial_manage_briefs" ON public.project_briefs;
CREATE POLICY "commercial_manage_briefs"
  ON public.project_briefs FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('commercial', 'commercial_director', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('commercial', 'commercial_director', 'admin', 'super_admin')
    )
  );

-- Approvers (PM, CEO, CFO) can read + update when assigned
DROP POLICY IF EXISTS "approver_update_assigned" ON public.project_briefs;
CREATE POLICY "approver_update_assigned"
  ON public.project_briefs FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND current_approver_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND current_approver_id = auth.uid()
  );

-- Finance: read for credit check context
DROP POLICY IF EXISTS "finance_read_briefs" ON public.project_briefs;
CREATE POLICY "finance_read_briefs"
  ON public.project_briefs FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo')
    )
  );

-- PM: read approved briefs (for project handover)
DROP POLICY IF EXISTS "pm_read_approved_briefs" ON public.project_briefs;
CREATE POLICY "pm_read_approved_briefs"
  ON public.project_briefs FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('pm', 'pm_lead')
    )
  );

-- 8.7 Quotations Table
CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  brief_id uuid NOT NULL REFERENCES public.project_briefs(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  
  -- Quotation number (QTN-YYYY-MM-NNNN-vX.Y)
  quotation_number text NOT NULL UNIQUE,
  version text NOT NULL DEFAULT 'v1.0',
  parent_quotation_id uuid REFERENCES public.quotations(id), -- for versioning
  
  -- Content
  title text NOT NULL,
  description text,
  line_items jsonb NOT NULL, -- [{description, quantity, unit_price, total}]
  
  -- Financial
  subtotal numeric(20,4) NOT NULL,
  tax_rate numeric(5,2) DEFAULT 11, -- PPN
  tax_amount numeric(20,4) GENERATED ALWAYS AS (subtotal * tax_rate / 100) STORED,
  discount_percent numeric(5,2) DEFAULT 0,
  discount_amount numeric(20,4) GENERATED ALWAYS AS (subtotal * discount_percent / 100) STORED,
  total_amount numeric(20,4) NOT NULL,
  currency text NOT NULL DEFAULT 'IDR',
  
  -- Payment terms
  payment_terms text, -- e.g., "50% down payment, 50% on delivery"
  validity_days integer DEFAULT 30,
  valid_until date,
  
  -- Workflow
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised'
  )),
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  
  -- Client approval
  accepted_by text, -- client name
  accepted_by_title text,
  accepted_by_email text,
  signature_data jsonb, -- e-signature metadata
  
  -- Ownership
  commercial_pic_id uuid NOT NULL REFERENCES public.user_profiles(id),
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- 8.8 Indexes
CREATE INDEX IF NOT EXISTS idx_quotations_tenant ON quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotations_brief ON quotations(brief_id);
CREATE INDEX IF NOT EXISTS idx_quotations_client ON quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);

-- 8.9 Enable RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- 8.10 RLS Policies

-- Commercial: full access
DROP POLICY IF EXISTS "commercial_manage_quotations" ON public.quotations;
CREATE POLICY "commercial_manage_quotations"
  ON public.quotations FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('commercial', 'commercial_director', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('commercial', 'commercial_director', 'admin', 'super_admin')
    )
  );

-- Finance: read quotations
DROP POLICY IF EXISTS "finance_read_quotations" ON public.quotations;
CREATE POLICY "finance_read_quotations"
  ON public.quotations FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('finance', 'cfo')
    )
  );

-- PM: read accepted quotations (for project execution)
DROP POLICY IF EXISTS "pm_read_accepted_quotations" ON public.quotations;
CREATE POLICY "pm_read_accepted_quotations"
  ON public.quotations FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND status = 'accepted'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('pm', 'pm_lead')
    )
  );

-- 8.11 Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS project_briefs_updated_at ON project_briefs;
CREATE TRIGGER project_briefs_updated_at
  BEFORE UPDATE ON project_briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS quotations_updated_at ON quotations;
CREATE TRIGGER quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8.12 Function: Get approval tier based on margin
CREATE OR REPLACE FUNCTION public.get_approval_tier(margin_pct numeric, tenant_id uuid)
RETURNS TABLE(approver_role text, sla_days integer) AS $$
BEGIN
  RETURN QUERY
  SELECT ar.approver_role, ar.sla_days
  FROM public.approval_rules ar
  WHERE ar.tenant_id = get_approval_tier.tenant_id
  AND margin_pct >= ar.margin_min
  AND margin_pct <= ar.margin_max
  AND ar.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8.13 Function: Check credit before brief submission
CREATE OR REPLACE FUNCTION public.check_client_credit(p_client_id uuid)
RETURNS TABLE(status text, message text, ar_aging_days integer) AS $$
DECLARE
  aging_result RECORD;
BEGIN
  -- Get AR aging for client (simplified - would need invoices table)
  SELECT MAX(aging_days) INTO aging_result
  FROM (
    -- Placeholder: would query invoice aging data
    SELECT 0 AS aging_days
  ) subq;
  
  IF aging_result.aging_days > 65 THEN
    RETURN QUERY SELECT 'failed'::text, 'Client has AR aging >65 days'::text, aging_result.aging_days;
  ELSE
    RETURN QUERY SELECT 'passed'::text, 'Credit check passed'::text, COALESCE(aging_result.aging_days, 0);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
