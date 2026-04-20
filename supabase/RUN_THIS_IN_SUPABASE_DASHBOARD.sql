-- =====================================================
-- W-System HC Master Data - COMPLETE MIGRATIONS
-- Run di Supabase Dashboard: https://kcbtehpcdltvdijgsrsb.supabase.co → SQL Editor
-- =====================================================
-- Copy paste SEMUA isi file ini → Run
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create update_updated_at function (needed for triggers)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. TENANTS TABLE
-- ============================================
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
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. ENTITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  type text NOT NULL DEFAULT 'division' CHECK (type IN ('holding', 'subsidiary', 'division', 'department')),
  parent_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_entities_tenant ON entities(tenant_id);
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. BRANCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text NOT NULL,
  address text,
  city_id uuid,
  province text,
  country text DEFAULT 'Indonesia',
  postal_code text,
  phone text,
  email text,
  is_headquarters boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. REGIONS TABLE + SEED DATA
-- ============================================
CREATE TABLE IF NOT EXISTS public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.regions(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('country', 'province', 'city', 'district')),
  name text NOT NULL,
  code text UNIQUE,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_regions_type ON regions(type);
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

-- Seed Indonesia regions
INSERT INTO public.regions (type, name, code) VALUES ('country', 'Indonesia', 'ID') ON CONFLICT (code) DO NOTHING;

INSERT INTO public.regions (parent_id, type, name, code)
SELECT (SELECT id FROM regions WHERE code = 'ID'), 'province', province_name, province_code
FROM (VALUES
  ('DKI Jakarta', 'ID-JK'), ('Jawa Barat', 'ID-JB'), ('Jawa Tengah', 'ID-JT'),
  ('Jawa Timur', 'ID-JI'), ('Banten', 'ID-BT'), ('Bali', 'ID-BA'),
  ('Sulawesi Selatan', 'ID-SN'), ('Sumatera Utara', 'ID-SU')
) AS provinces(province_name, province_code) ON CONFLICT (code) DO NOTHING;

INSERT INTO public.regions (parent_id, type, name, code)
SELECT (SELECT id FROM regions WHERE code = parent_code), 'city', city_name, city_code
FROM (VALUES
  ('ID-JK', 'Jakarta Pusat', 'ID-JK-01'), ('ID-JK', 'Jakarta Selatan', 'ID-JK-04'),
  ('ID-JB', 'Bandung', 'ID-JB-01'), ('ID-JB', 'Bekasi', 'ID-JB-02'),
  ('ID-BT', 'Tangerang', 'ID-BT-01'), ('ID-JI', 'Surabaya', 'ID-JI-01')
) AS cities(parent_code, city_name, city_code) ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 5. ROLES TABLE + SEED DATA (CRITICAL FOR LOGIN!)
-- ============================================
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  permissions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed default roles
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
  ('hrd', 'Human Resources Development'),
  ('client', 'External client - portal access only')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 6. USER_PROFILES TABLE (CRITICAL FOR LOGIN!)
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
DROP POLICY IF EXISTS "view_own_profile" ON public.user_profiles;
CREATE POLICY "view_own_profile" ON public.user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_profiles" ON public.user_profiles;
CREATE POLICY "admin_manage_profiles" ON public.user_profiles FOR ALL TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() AND r.name IN ('admin', 'super_admin', 'hrd')
    )
  );

-- ============================================
-- 7. TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS tenants_updated_at ON tenants;
CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS entities_updated_at ON entities;
CREATE TRIGGER entities_updated_at BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS branches_updated_at ON branches;
CREATE TRIGGER branches_updated_at BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 8. SEED DATA: Default Tenant + Test User
-- ============================================

-- Create default tenant (WIT.ID)
INSERT INTO public.tenants (name, slug, legal_name, status, plan) VALUES
  ('WIT.ID', 'wit', 'PT Wit Indonesia Teknologi', 'active', 'enterprise')
ON CONFLICT (slug) DO NOTHING;

-- Get tenant_id for WIT
DO $$
DECLARE
  wit_tenant_id uuid;
  hrd_role_id uuid;
BEGIN
  SELECT id INTO wit_tenant_id FROM public.tenants WHERE slug = 'wit';
  SELECT id INTO hrd_role_id FROM public.roles WHERE name = 'hrd';
  
  -- Note: user_profiles will be created when user hrd@wit.id logs in
  -- This is handled by Supabase Auth trigger
  RAISE NOTICE 'Tenant WIT.ID ready: %', wit_tenant_id;
  RAISE NOTICE 'Role HRD ready: %', hrd_role_id;
END $$;

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
-- Tables created: tenants, entities, branches, regions, roles, user_profiles
-- Test login: hrd@wit.id / WitSystem2026!
-- ============================================
