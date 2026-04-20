-- =====================================================
-- FASE-0: Core Foundation - Tenants
-- =====================================================
-- Multi-tenant isolation - root of all tenant-scoped data
-- =====================================================

-- 1.1 Tenants Table (companies/organizations)
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL, -- subdomain: acme.wsystem.app
  legal_name text, -- PT/CV name for legal documents
  tax_id text, -- NPWP
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'archived')),
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  settings jsonb DEFAULT '{}'::jsonb, -- tenant-specific configs
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1.2 Indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);

-- 1.3 Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 1.4 RLS Policies
-- Simplified policies - no dependency on user_profiles
DROP POLICY IF EXISTS "Users can view own tenants" ON public.tenants;
CREATE POLICY "Users can view own tenants"
  ON public.tenants FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Super admin can view all tenants" ON public.tenants;
CREATE POLICY "Super admin can view all tenants"
  ON public.tenants FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Super admin can manage all tenants" ON public.tenants;
CREATE POLICY "Super admin can manage all tenants"
  ON public.tenants FOR ALL
  USING (true);

-- 1.5 Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS tenants_updated_at ON tenants;
CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
