-- Migration: 2026041800125_create_crm_projects.sql
-- Description: Create CRM projects table (required by finance invoices)
-- Dependencies: 0001 (tenants), 0002 (entities), 0005 (user_profiles)

-- Drop existing if re-running
DROP TABLE IF EXISTS public.projects CASCADE;

-- Projects table (CRM)
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id),
  
  -- Project info
  project_code text NOT NULL,
  project_name text NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  
  -- Financial
  budget_amount numeric(20,4) DEFAULT 0,
  currency text DEFAULT 'IDR',
  
  -- Timeline
  start_date date,
  end_date date,
  
  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  
  -- Ownership
  project_manager uuid REFERENCES public.user_profiles(id),
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- Indexes
CREATE INDEX idx_projects_tenant ON public.projects(tenant_id);
CREATE INDEX idx_projects_entity ON public.projects(entity_id);
CREATE INDEX idx_projects_client ON public.projects(client_id);
CREATE INDEX idx_projects_status ON public.projects(status);

-- RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "tenant_isolation" ON public.projects;
CREATE POLICY "tenant_isolation" ON public.projects
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

DROP POLICY IF EXISTS "project_manager_access" ON public.projects;
CREATE POLICY "project_manager_access" ON public.projects
  FOR SELECT
  USING (
    project_manager = current_setting('app.current_user')::uuid
    OR created_by = current_setting('app.current_user')::uuid
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.projects TO postgres;
GRANT ALL ON public.projects TO anon;
GRANT ALL ON public.projects TO authenticated;
