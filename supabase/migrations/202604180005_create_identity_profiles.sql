-- =====================================================
-- FASE-0: Core Foundation - Identity (Profiles & Roles)
-- =====================================================
-- User profiles with RBAC + JWT claims for RLS
-- =====================================================

-- 5.1 Roles Table (static RBAC definitions)
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  permissions jsonb DEFAULT '[]'::jsonb, -- array of permission strings
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5.2 Seed default roles
INSERT INTO public.roles (name, description) VALUES
  ('super_admin', 'Full system access across all tenants'),
  ('admin', 'Tenant-level admin with full access'),
  ('marketing', 'Marketing team - leads management'),
  ('marketing_lead', 'Marketing team lead'),
  ('commercial', 'Commercial team - briefs & quotations'),
  ('commercial_director', 'Commercial director - approvals'),
  ('pm', 'Project manager'),
  ('pm_lead', 'Senior project manager'),
  ('developer', 'Development team'),
  ('finance', 'Finance team'),
  ('cfo', 'Chief Financial Officer'),
  ('ceo', 'Chief Executive Officer'),
  ('hr', 'Human Resources'),
  ('client', 'External client - portal access only')
ON CONFLICT (name) DO NOTHING;

-- 5.3 User Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  role_id uuid NOT NULL REFERENCES public.roles(id),
  department text,
  phone text,
  avatar_url text,
  timezone text DEFAULT 'Asia/Jakarta',
  language text DEFAULT 'id',
  preferences jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- 5.4 Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_entity ON user_profiles(entity_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(tenant_id, is_active) WHERE deleted_at IS NULL;

-- 5.5 Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 5.6 RLS Policies

-- View own profile
DROP POLICY IF EXISTS "view_own_profile" ON public.user_profiles;
CREATE POLICY "view_own_profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Update own profile
DROP POLICY IF EXISTS "update_own_profile" ON public.user_profiles;
CREATE POLICY "update_own_profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- Admin can manage all profiles in tenant
DROP POLICY IF EXISTS "admin_manage_profiles" ON public.user_profiles;
CREATE POLICY "admin_manage_profiles"
  ON public.user_profiles FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('admin', 'super_admin')
    )
  );

-- Privileged roles can view tenant profiles (for assignment UI)
DROP POLICY IF EXISTS "privileged_view_tenant_profiles" ON public.user_profiles;
CREATE POLICY "privileged_view_tenant_profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('admin', 'commercial', 'commercial_director', 'pm_lead', 'cfo', 'ceo', 'super_admin')
    )
  );

-- 5.7 Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5.8 Function: Get user roles (helper for RLS)
CREATE OR REPLACE FUNCTION public.get_user_roles()
RETURNS TABLE(role_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT r.name
  FROM public.user_profiles up
  JOIN public.roles r ON up.role_id = r.id
  WHERE up.id = auth.uid() AND up.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.9 Function: Check if user has role
CREATE OR REPLACE FUNCTION public.user_has_role(required_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.roles r ON up.role_id = r.id
    WHERE up.id = auth.uid()
    AND r.name = required_role
    AND up.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
