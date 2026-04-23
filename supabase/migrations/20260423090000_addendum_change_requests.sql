-- Migration: Add Addendum / Change Request support for Q2C project kickoff
-- User Story: US-Q2C-006
-- Date: 2026-04-23

-- 1. Extend projects table for kickoff workflow
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS quotation_id uuid REFERENCES public.quotations(id),
ADD COLUMN IF NOT EXISTS brief_id uuid REFERENCES public.project_briefs(id),
ADD COLUMN IF NOT EXISTS deal_value numeric(20,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS signed_addendum boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS addendum_signed_at timestamptz,
ADD COLUMN IF NOT EXISTS addendum_signed_by uuid REFERENCES public.user_profiles(id),
ADD COLUMN IF NOT EXISTS kickoff_status text NOT NULL DEFAULT 'not_started'
  CHECK (kickoff_status IN ('not_started','addendum_required','addendum_sent','addendum_signed','ready','started')),
ADD COLUMN IF NOT EXISTS kickoff_date date,
ADD COLUMN IF NOT EXISTS execution_blocked_reason text;

COMMENT ON COLUMN public.projects.signed_addendum IS 'Hard rule: NO execution without signed addendum';
COMMENT ON COLUMN public.projects.kickoff_status IS 'Q2C kickoff workflow for US-Q2C-006';

-- 2. Create change_requests table (addendum during project)
CREATE TABLE IF NOT EXISTS public.change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id),

  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES public.user_profiles(id),
  approved_by uuid REFERENCES public.user_profiles(id),

  -- Change details
  title text NOT NULL,
  description text,
  change_type text NOT NULL DEFAULT 'scope' CHECK (change_type IN ('scope','timeline','cost','resource')),

  -- Impact analysis
  time_impact_days integer DEFAULT 0,
  cost_impact numeric(20,4) DEFAULT 0,
  old_value jsonb,
  new_value jsonb,

  -- Approval workflow
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft','submitted','impact_analyzed','pending_approval','approved','rejected','cancelled')
  ),

  -- Approval matrix fields
  required_approver text,  -- PM / Commercial Director / CEO / CEO+CFO
  margin_after numeric(5,2), -- % margin after change

  -- E-sign
  signed_by_client boolean DEFAULT false,
  signed_by_client_at timestamptz,
  signed_by_client_email text,

  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

CREATE INDEX idx_change_requests_tenant ON public.change_requests(tenant_id);
CREATE INDEX idx_change_requests_project ON public.change_requests(project_id);
CREATE INDEX idx_change_requests_status ON public.change_requests(status);

-- RLS
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_change_requests" ON public.change_requests
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY "project_manager_change_requests" ON public.change_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.project_manager = current_setting('app.current_user')::uuid
    )
  );

COMMENT ON TABLE public.change_requests IS 'Scope change / addendum workflow during project. Hard rule: execution blocked until signed.';
