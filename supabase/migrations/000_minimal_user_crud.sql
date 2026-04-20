-- Minimal migration for User CRUD
-- Run this first

-- 1. Tenants (no RLS dependency)
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  legal_name text,
  tax_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'archived')),
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);

-- 2. Roles
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  permissions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

-- 3. User Profiles (without entity_id dependency)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(tenant_id, is_active) WHERE deleted_at IS NULL;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Simple RLS for now
DROP POLICY IF EXISTS "view_own_profile" ON public.user_profiles;
CREATE POLICY "view_own_profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_profiles" ON public.user_profiles;
CREATE POLICY "admin_manage_profiles"
  ON public.user_profiles FOR ALL
  TO authenticated
  USING (true);
