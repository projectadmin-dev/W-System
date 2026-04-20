-- =====================================================
-- FASE-0: Core Foundation - Branches
-- =====================================================
-- Physical locations/offices under entities
-- Support multi-location operations
-- =====================================================

-- 3.1 Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL, -- nullable for tenant-level branches
  name text NOT NULL, -- e.g., "Jakarta HQ", "Surabaya Office"
  code text NOT NULL, -- e.g., "JKT-01", "SBY-01"
  address text,
  city_id uuid, -- reference to regions (will be created later)
  province text,
  country text DEFAULT 'Indonesia',
  postal_code text,
  phone text,
  email text,
  is_headquarters boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  settings jsonb DEFAULT '{}'::jsonb, -- branch-specific configs (timezone, working_hours, etc.)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, code) -- one code per tenant
);

-- 3.2 Indexes
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_entity ON branches(entity_id);
CREATE INDEX IF NOT EXISTS idx_branches_city ON branches(city_id);
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches(status);
CREATE INDEX IF NOT EXISTS idx_branches_hq ON branches(is_headquarters);

-- 3.3 Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- 3.4 RLS Policies
-- Users can view branches in their tenant
DROP POLICY IF EXISTS "Users can view tenant branches" ON public.branches;
CREATE POLICY "Users can view tenant branches"
  ON public.branches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.tenant_id = branches.tenant_id AND up.id = auth.uid()
    )
  );

-- HR Admin + Super Admin can manage branches
DROP POLICY IF EXISTS "HR admin can manage branches" ON public.branches;
CREATE POLICY "HR admin can manage branches"
  ON public.branches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.tenant_id = branches.tenant_id
      AND up.id = auth.uid()
      AND r.name IN ('hr_admin', 'super_admin')
    )
  );

-- 3.5 Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS branches_updated_at ON branches;
CREATE TRIGGER branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
