-- =====================================================
-- W-System HC Master Data - COMPLETE MIGRATIONS
-- Generated: 2026-04-18
-- Supabase Project: kcbtehpcdltvdijgsrsb
-- =====================================================
-- Total: 12 migration files
-- FASE-0: 4 files (tenants, entities, branches, regions)
-- FASE-4.0: 8 files (11 HC tables + seed data)
-- =====================================================


-- ============================================
-- FILE: 20260418_001_create_core_tenants.sql
-- ============================================

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
-- Users can view tenants they belong to
DROP POLICY IF EXISTS "Users can view own tenants" ON public.tenants;
CREATE POLICY "Users can view own tenants"
  ON public.tenants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.tenant_id = tenants.id AND up.user_id = auth.uid()
    )
  );

-- Super admin can view all tenants
DROP POLICY IF EXISTS "Super admin can view all tenants" ON public.tenants;
CREATE POLICY "Super admin can view all tenants"
  ON public.tenants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role_id IN (
        SELECT id FROM public.roles WHERE name = 'super_admin'
      )
    )
  );

-- Super admin can manage all tenants
DROP POLICY IF EXISTS "Super admin can manage all tenants" ON public.tenants;
CREATE POLICY "Super admin can manage all tenants"
  ON public.tenants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role_id IN (
        SELECT id FROM public.roles WHERE name = 'super_admin'
      )
    )
  );

-- 1.5 Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS tenants_updated_at ON tenants;
CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================




-- ============================================
-- FILE: 20260418_002_create_core_entities.sql
-- ============================================

-- =====================================================
-- FASE-0: Core Foundation - Entities
-- =====================================================
-- Business entities (holding companies, subsidiaries, divisions)
-- Support multi-company structure under single tenant
-- =====================================================

-- 2.1 Entities Table
CREATE TABLE IF NOT EXISTS public.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL, -- e.g., "HOLDING", "SUB-A", "DIV-1"
  type text NOT NULL DEFAULT 'division' CHECK (type IN ('holding', 'subsidiary', 'division', 'department')),
  parent_id uuid REFERENCES public.entities(id) ON DELETE SET NULL, -- hierarchical structure
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  settings jsonb DEFAULT '{}'::jsonb, -- entity-specific configs
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, code) -- one code per tenant
);

-- 2.2 Indexes
CREATE INDEX IF NOT EXISTS idx_entities_tenant ON entities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_entities_parent ON entities(parent_id);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_status ON entities(status);

-- 2.3 Enable RLS
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

-- 2.4 RLS Policies
-- Users can view entities in their tenant
DROP POLICY IF EXISTS "Users can view tenant entities" ON public.entities;
CREATE POLICY "Users can view tenant entities"
  ON public.entities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.tenant_id = entities.tenant_id AND up.user_id = auth.uid()
    )
  );

-- HR Admin + Super Admin can manage entities
DROP POLICY IF EXISTS "HR admin can manage entities" ON public.entities;
CREATE POLICY "HR admin can manage entities"
  ON public.entities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.tenant_id = entities.tenant_id
      AND up.user_id = auth.uid()
      AND r.name IN ('hr_admin', 'super_admin')
    )
  );

-- 2.5 Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS entities_updated_at ON entities;
CREATE TRIGGER entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================




-- ============================================
-- FILE: 20260418_003_create_core_branches.sql
-- ============================================

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
      WHERE up.tenant_id = branches.tenant_id AND up.user_id = auth.uid()
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
      AND up.user_id = auth.uid()
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




-- ============================================
-- FILE: 20260418_004_create_core_regions.sql
-- ============================================

-- =====================================================
-- FASE-0: Core Foundation - Regions
-- =====================================================
-- Geographic regions (countries, provinces, cities)
-- Used for UMR references, branch locations, tax jurisdictions
-- =====================================================

-- 4.1 Regions Table (hierarchical: country → province → city)
CREATE TABLE IF NOT EXISTS public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.regions(id) ON DELETE CASCADE, -- hierarchical (province → country, city → province)
  type text NOT NULL CHECK (type IN ('country', 'province', 'city', 'district')),
  name text NOT NULL, -- e.g., "Indonesia", "DKI Jakarta", "Jakarta Pusat"
  code text UNIQUE, -- e.g., "ID", "ID-JK", "ID-JK-01" (ISO 3166-2 for provinces)
  metadata jsonb DEFAULT '{}'::jsonb, -- additional data (area_km2, population, etc.)
  created_at timestamptz DEFAULT now()
);

-- 4.2 Indexes
CREATE INDEX IF NOT EXISTS idx_regions_parent ON regions(parent_id);
CREATE INDEX IF NOT EXISTS idx_regions_type ON regions(type);
CREATE INDEX IF NOT EXISTS idx_regions_code ON regions(code);
CREATE INDEX IF NOT EXISTS idx_regions_name ON regions(name);

-- 4.3 Enable RLS
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

-- 4.4 RLS Policies
-- Everyone (authenticated) can view regions (read-only reference data)
DROP POLICY IF EXISTS "Users can view regions" ON public.regions;
CREATE POLICY "Users can view regions"
  ON public.regions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Super admin can manage regions
DROP POLICY IF EXISTS "Super admin can manage regions" ON public.regions;
CREATE POLICY "Super admin can manage regions"
  ON public.regions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.user_id = auth.uid() AND r.name = 'super_admin'
    )
  );

-- =====================================================
-- 4.5 Seed Data: Indonesia Regions
-- =====================================================

-- Indonesia (Country)
INSERT INTO public.regions (type, name, code)
VALUES ('country', 'Indonesia', 'ID')
ON CONFLICT (code) DO NOTHING;

-- Provinces (sample - can be expanded)
INSERT INTO public.regions (parent_id, type, name, code)
SELECT 
  (SELECT id FROM regions WHERE code = 'ID'),
  'province',
  province_name,
  province_code
FROM (VALUES
  ('DKI Jakarta', 'ID-JK'),
  ('Jawa Barat', 'ID-JB'),
  ('Jawa Tengah', 'ID-JT'),
  ('Jawa Timur', 'ID-JI'),
  ('Banten', 'ID-BT'),
  ('Bali', 'ID-BA'),
  ('Sulawesi Selatan', 'ID-SN'),
  ('Sumatera Utara', 'ID-SU'),
  ('Sumatera Barat', 'ID-SB'),
  ('Jambi', 'ID-JA')
) AS provinces(province_name, province_code)
ON CONFLICT (code) DO NOTHING;

-- Cities (major cities for UMR)
INSERT INTO public.regions (parent_id, type, name, code)
SELECT 
  (SELECT id FROM regions WHERE code = parent_code),
  'city',
  city_name,
  city_code
FROM (VALUES
  -- DKI Jakarta
  ('ID-JK', 'Jakarta Pusat', 'ID-JK-01'),
  ('ID-JK', 'Jakarta Utara', 'ID-JK-02'),
  ('ID-JK', 'Jakarta Barat', 'ID-JK-03'),
  ('ID-JK', 'Jakarta Selatan', 'ID-JK-04'),
  ('ID-JK', 'Jakarta Timur', 'ID-JK-05'),
  -- Jawa Barat
  ('ID-JB', 'Bandung', 'ID-JB-01'),
  ('ID-JB', 'Bekasi', 'ID-JB-02'),
  ('ID-JB', 'Depok', 'ID-JB-03'),
  ('ID-JB', 'Bogor', 'ID-JB-04'),
  -- Banten
  ('ID-BT', 'Tangerang', 'ID-BT-01'),
  -- Jawa Timur
  ('ID-JI', 'Surabaya', 'ID-JI-01'),
  -- Jawa Tengah
  ('ID-JT', 'Semarang', 'ID-JT-01'),
  -- Bali
  ('ID-BA', 'Denpasar', 'ID-BA-01'),
  -- Sulawesi Selatan
  ('ID-SN', 'Makassar', 'ID-SN-01')
) AS cities(parent_code, city_name, city_code)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Regions available:
-- - 1 country (Indonesia)
-- - 10 provinces
-- - 14 major cities
-- =====================================================




-- ============================================
-- FILE: 20260418_005_create_identity_profiles.sql
-- ============================================

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




-- ============================================
-- FILE: 20260418_005_hr_work_shifts_calendars.sql
-- ============================================

-- =====================================================
-- FASE-4.0-A: Work Shifts & Calendars
-- =====================================================
-- Multi-shift support + work calendar (holidays, cuti bersama)
-- Reference: hc-master-data-workflow skill
-- =====================================================

-- 1.1 hr_work_shifts - Shift definitions per entity/branch
CREATE TABLE IF NOT EXISTS public.hr_work_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  
  name text NOT NULL, -- e.g., "Shift Pagi", "Shift Malam", "Shift Reguler"
  code text NOT NULL, -- e.g., "SHIFT-AM", "SHIFT-PM", "SHIFT-RG"
  
  start_time time NOT NULL, -- e.g., "08:00:00"
  end_time time NOT NULL, -- e.g., "17:00:00"
  
  break_start time, -- e.g., "12:00:00"
  break_end time, -- e.g., "13:00:00"
  break_duration_minutes integer DEFAULT 60,
  
  grace_period_minutes integer DEFAULT 15, -- late tolerance
  is_active boolean DEFAULT true,
  
  -- Inheritance pattern
  is_default boolean DEFAULT false, -- tenant-level default
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, branch_id, code)
);

CREATE INDEX IF NOT EXISTS idx_hr_work_shifts_tenant ON public.hr_work_shifts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_shifts_entity ON public.hr_work_shifts(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_shifts_branch ON public.hr_work_shifts(branch_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_shifts_active ON public.hr_work_shifts(is_active);

-- Enable RLS
ALTER TABLE public.hr_work_shifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view shifts in their tenant" ON public.hr_work_shifts;
CREATE POLICY "Users can view shifts in their tenant"
  ON public.hr_work_shifts FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage shifts" ON public.hr_work_shifts;
CREATE POLICY "HR admin can manage shifts"
  ON public.hr_work_shifts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_work_shifts_updated_at ON public.hr_work_shifts;
CREATE TRIGGER hr_work_shifts_updated_at
  BEFORE UPDATE ON public.hr_work_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 1.2 hr_work_calendars - Holiday calendar per year
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hr_work_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  
  year integer NOT NULL CHECK (year >= 2020 AND year <= 2100),
  date date NOT NULL,
  
  name text NOT NULL, -- e.g., "Hari Raya Idul Fitri", "Tahun Baru"
  type text NOT NULL DEFAULT 'national_holiday' CHECK (type IN (
    'national_holiday', -- Libur nasional
    'cuti_bersama', -- Cuti bersama
    'weekend', -- Weekend (auto-generated)
    'company_holiday', -- Libur perusahaan
    'unpaid_leave' -- Cuti tanpa upah
  )),
  
  is_paid boolean DEFAULT true,
  description text,
  
  -- Inheritance pattern
  is_default boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, branch_id, date)
);

CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_tenant ON public.hr_work_calendars(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_entity ON public.hr_work_calendars(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_branch ON public.hr_work_calendars(branch_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_year ON public.hr_work_calendars(year);
CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_date ON public.hr_work_calendars(date);
CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_type ON public.hr_work_calendars(type);

-- Enable RLS
ALTER TABLE public.hr_work_calendars ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view calendars in their tenant" ON public.hr_work_calendars;
CREATE POLICY "Users can view calendars in their tenant"
  ON public.hr_work_calendars FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage calendars" ON public.hr_work_calendars;
CREATE POLICY "HR admin can manage calendars"
  ON public.hr_work_calendars FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Tables created:
-- - hr_work_shifts (multi-shift per entity/branch)
-- - hr_work_calendars (holiday calendar per year)
-- =====================================================




-- ============================================
-- FILE: 20260418_006_create_customer_clients.sql
-- ============================================

-- =====================================================
-- FASE-0: Master Data - Customer (Clients & Contacts)
-- =====================================================
-- Client companies and their contact persons
-- =====================================================

-- 6.1 Clients Table (customer companies)
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  name text NOT NULL,
  legal_name text, -- PT/CV name
  tax_id text, -- NPWP
  type text NOT NULL DEFAULT 'prospect' CHECK (type IN ('prospect', 'active', 'inactive', 'blacklisted')),
  tier text NOT NULL DEFAULT 'small' CHECK (tier IN ('enterprise', 'mid', 'small')),
  industry text,
  website text,
  address text,
  city text,
  province text,
  country text DEFAULT 'Indonesia',
  postal_code text,
  phone text,
  email text,
  -- Credit & billing
  credit_limit numeric(20,4) DEFAULT 0,
  payment_terms_days integer DEFAULT 30, -- NET30, NET60, etc.
  currency text DEFAULT 'IDR',
  -- Relationship
  account_manager_id uuid REFERENCES public.user_profiles(id),
  source text CHECK (source IN ('referral', 'digital_ads', 'event', 'partner', 'inbound', 'outbound')),
  -- Metadata
  tags text[],
  notes text,
  settings jsonb DEFAULT '{}'::jsonb,
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- 6.2 Indexes
CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_entity ON clients(entity_id);
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(tenant_id, type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clients_tier ON clients(tenant_id, tier);
CREATE INDEX IF NOT EXISTS idx_clients_account_manager ON clients(account_manager_id);

-- 6.3 Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 6.4 RLS Policies

-- Marketing: read clients (for lead context)
DROP POLICY IF EXISTS "marketing_read_clients" ON public.clients;
CREATE POLICY "marketing_read_clients"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('marketing', 'marketing_lead')
    )
  );

-- Commercial: full access to clients
DROP POLICY IF EXISTS "commercial_manage_clients" ON public.clients;
CREATE POLICY "commercial_manage_clients"
  ON public.clients FOR ALL
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

-- Finance: read clients (for billing)
DROP POLICY IF EXISTS "finance_read_clients" ON public.clients;
CREATE POLICY "finance_read_clients"
  ON public.clients FOR SELECT
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

-- PM: read clients (for project context)
DROP POLICY IF EXISTS "pm_read_clients" ON public.clients;
CREATE POLICY "pm_read_clients"
  ON public.clients FOR SELECT
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

-- Client: read own client record only
DROP POLICY IF EXISTS "client_read_own" ON public.clients;
CREATE POLICY "client_read_own"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND auth.jwt()->>'role' = 'client'
    AND id = (auth.jwt()->>'client_id')::uuid
  );

-- 6.5 Contacts Table (contact persons at client companies)
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text, -- job title
  email text,
  phone text,
  mobile text,
  is_primary boolean NOT NULL DEFAULT false,
  is_decision_maker boolean NOT NULL DEFAULT false,
  department text,
  notes text,
  tags text[],
  preferences jsonb DEFAULT '{}'::jsonb,
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- 6.6 Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_client ON contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_primary ON contacts(client_id, is_primary) WHERE deleted_at IS NULL;

-- 6.7 Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- 6.8 RLS Policies

-- Marketing: read contacts
DROP POLICY IF EXISTS "marketing_read_contacts" ON public.contacts;
CREATE POLICY "marketing_read_contacts"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('marketing', 'marketing_lead')
    )
  );

-- Commercial: full access to contacts
DROP POLICY IF EXISTS "commercial_manage_contacts" ON public.contacts;
CREATE POLICY "commercial_manage_contacts"
  ON public.contacts FOR ALL
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

-- Finance: read contacts
DROP POLICY IF EXISTS "finance_read_contacts" ON public.contacts;
CREATE POLICY "finance_read_contacts"
  ON public.contacts FOR SELECT
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

-- PM: read contacts
DROP POLICY IF EXISTS "pm_read_contacts" ON public.contacts;
CREATE POLICY "pm_read_contacts"
  ON public.contacts FOR SELECT
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

-- 6.9 Trigger: Auto-update updated_at for clients
DROP TRIGGER IF EXISTS clients_updated_at ON clients;
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6.10 Trigger: Auto-update updated_at for contacts
DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================




-- ============================================
-- FILE: 20260418_006_hr_city_umr.sql
-- ============================================

-- =====================================================
-- FASE-4.0-B: City UMR (Upah Minimum Regional)
-- =====================================================
-- UMR per city per year - reference for salary calculation
-- Requires: regions table (FASE-0) ✅
-- =====================================================

CREATE TABLE IF NOT EXISTS public.hr_city_umr (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Reference to regions table (city)
  city_id uuid REFERENCES public.regions(id) ON DELETE CASCADE NOT NULL,
  
  year integer NOT NULL CHECK (year >= 2020 AND year <= 2100),
  
  umr_amount numeric(20, 4) NOT NULL CHECK (umr_amount >= 0), -- e.g., 5067315.0000
  effective_date date NOT NULL, -- e.g., "2025-01-01"
  
  source text, -- e.g., "Per gubernur DKI Jakarta No. XXX/2024"
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- One UMR per city per year per tenant
  UNIQUE(tenant_id, city_id, year)
);

CREATE INDEX IF NOT EXISTS idx_hr_city_umr_tenant ON public.hr_city_umr(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_city_umr_city ON public.hr_city_umr(city_id);
CREATE INDEX IF NOT EXISTS idx_hr_city_umr_year ON public.hr_city_umr(year);

-- Enable RLS
ALTER TABLE public.hr_city_umr ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view UMR in their tenant" ON public.hr_city_umr;
CREATE POLICY "Users can view UMR in their tenant"
  ON public.hr_city_umr FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage UMR" ON public.hr_city_umr;
CREATE POLICY "HR admin can manage UMR"
  ON public.hr_city_umr FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_city_umr_updated_at ON public.hr_city_umr;
CREATE TRIGGER hr_city_umr_updated_at
  BEFORE UPDATE ON public.hr_city_umr
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Seed Data: UMR 2025 for major cities (sample values)
-- Source: Per gubernur respective provinces 2024
-- =====================================================

INSERT INTO public.hr_city_umr (city_id, year, umr_amount, effective_date, source)
SELECT 
  r.id as city_id,
  2025 as year,
  umr_value,
  '2025-01-01' as effective_date,
  source_text
FROM (VALUES
  -- DKI Jakarta (highest UMR)
  ('Jakarta Pusat', 5067315.00, 'Pergub DKI Jakarta No. 121/2024'),
  ('Jakarta Utara', 5067315.00, 'Pergub DKI Jakarta No. 121/2024'),
  ('Jakarta Barat', 5067315.00, 'Pergub DKI Jakarta No. 121/2024'),
  ('Jakarta Selatan', 5067315.00, 'Pergub DKI Jakarta No. 121/2024'),
  ('Jakarta Timur', 5067315.00, 'Pergub DKI Jakarta No. 121/2024'),
  
  -- Jawa Barat
  ('Bandung', 3285000.00, 'Pergub Jawa Barat No. 88/2024'),
  ('Bekasi', 5239093.00, 'Pergub Jawa Barat No. 88/2024'),
  ('Depok', 4902021.00, 'Pergub Jawa Barat No. 88/2024'),
  ('Bogor', 4902021.00, 'Pergub Jawa Barat No. 88/2024'),
  
  -- Banten
  ('Tangerang', 4958609.00, 'Pergub Banten No. 69/2024'),
  
  -- Jawa Timur
  ('Surabaya', 4569425.00, 'Pergub Jawa Timur No. 44/2024'),
  
  -- Jawa Tengah
  ('Semarang', 3376000.00, 'Pergub Jawa Tengah No. 66/2024')
) AS umr_data(city_name, umr_value, source_text)
JOIN public.regions r ON r.city_name = umr_data.city_name AND r.type = 'city'
ON CONFLICT (tenant_id, city_id, year) DO NOTHING;

-- Note: Above insert will not insert yet because tenant_id is required
-- Run this after creating a tenant, or use:
-- INSERT INTO public.hr_city_umr (tenant_id, city_id, year, umr_amount, effective_date, source)
-- VALUES ('00000000-0000-0000-0000-000000000001', <city_id>, 2025, <amount>, '2025-01-01', '<source>');

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- hr_city_umr ready for UMR configuration per city/year
-- =====================================================




-- ============================================
-- FILE: 20260418_007_create_crm_leads.sql
-- ============================================

-- =====================================================
-- FASE-1: CRM Module (Leads Management)
-- =====================================================
-- Lead pipeline with scoring & SLA tracking
-- Based on USER_STORIES v3.0 § 2.2 (US-Q2C-002)
-- =====================================================

-- 7.1 Scoring Rules Table (configurable lead scoring)
CREATE TABLE IF NOT EXISTS public.scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  component text NOT NULL CHECK (component IN (
    'budget_disclosed', 'authority_level', 'need_definition', 
    'timeline', 'engagement_score'
  )),
  weight integer NOT NULL CHECK (weight BETWEEN 0 AND 100),
  rules jsonb NOT NULL, -- scoring mapping, e.g. {"unknown":0,"range":15,"exact":25}
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7.2 Seed default scoring rules (per USER_STORIES v3.0)
INSERT INTO public.scoring_rules (tenant_id, component, weight, rules) 
SELECT 
  t.id,
  sr.component,
  sr.weight,
  sr.rules
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('budget_disclosed', 25, '{"unknown":0,"range":15,"exact":25}'::jsonb),
    ('authority_level', 25, '{"influencer":5,"manager":15,"c_level":25}'::jsonb),
    ('need_definition', 20, '{"scale":"0-20"}'::jsonb),
    ('timeline', 15, '{"unknown":0,"within_6mo":8,"within_3mo":15}'::jsonb),
    ('engagement_score', 15, '{"scale":"0-15"}'::jsonb)
) AS sr(component, weight, rules)
ON CONFLICT DO NOTHING;

-- 7.3 SLA Configs Table (stage transition timelines)
CREATE TABLE IF NOT EXISTS public.sla_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stage_from text NOT NULL CHECK (stage_from IN ('cold', 'warm', 'hot')),
  stage_to text NOT NULL CHECK (stage_to IN ('warm', 'hot', 'deal')),
  duration_hours integer NOT NULL,
  escalation_role text, -- role to notify on breach
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7.4 Seed default SLA configs (per USER_STORIES v3.0)
INSERT INTO public.sla_configs (tenant_id, stage_from, stage_to, duration_hours, escalation_role)
SELECT 
  t.id,
  cfg.stage_from,
  cfg.stage_to,
  cfg.duration_hours,
  cfg.escalation_role
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('cold', 'warm', 168, 'marketing_lead'), -- 7 days
    ('warm', 'hot', 336, 'commercial_director'), -- 14 days
    ('hot', 'deal', 720, 'commercial_director') -- 30 days
) AS cfg(stage_from, stage_to, duration_hours, escalation_role)
ON CONFLICT DO NOTHING;

-- 7.5 Leads Table (core CRM entity)
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id),
  entity_id uuid REFERENCES public.entities(id),
  
  -- Basic info
  name text NOT NULL,
  contact_email text,
  contact_phone text,
  company_name text,
  job_title text,
  
  -- Source tracking
  source text NOT NULL CHECK (source IN (
    'referral', 'digital_ads', 'event', 'partner', 'inbound', 'outbound'
  )),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referring_client_id uuid REFERENCES public.clients(id),
  event_id text,
  
  -- Scoring components (per USER_STORIES v3.0 § 2.2)
  budget_disclosed text CHECK (budget_disclosed IN ('unknown', 'range', 'exact')),
  authority_level text CHECK (authority_level IN ('influencer', 'manager', 'c_level')),
  need_definition integer CHECK (need_definition BETWEEN 0 AND 20),
  timeline text CHECK (timeline IN ('unknown', 'within_6mo', 'within_3mo')),
  engagement_score integer CHECK (engagement_score BETWEEN 0 AND 15),
  
  -- Computed total score (0-100)
  total_score integer CHECK (total_score BETWEEN 0 AND 100),
  score_calculated_at timestamptz,
  
  -- Pipeline stage
  stage text NOT NULL DEFAULT 'cold' CHECK (stage IN ('cold', 'warm', 'hot', 'deal')),
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  previous_stage text,
  
  -- SLA tracking
  sla_deadline_at timestamptz,
  sla_breached boolean NOT NULL DEFAULT false,
  sla_breached_at timestamptz,
  last_activity_at timestamptz,
  
  -- Ownership
  current_pic_id uuid NOT NULL REFERENCES public.user_profiles(id),
  marketing_pic_id uuid REFERENCES public.user_profiles(id),
  commercial_pic_id uuid REFERENCES public.user_profiles(id),
  
  -- Metadata
  tags text[],
  notes text,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
  updated_by uuid REFERENCES public.user_profiles(id),
  deleted_at timestamptz
);

-- 7.6 Indexes
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(tenant_id, stage) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_sla ON leads(sla_deadline_at) 
  WHERE sla_breached = false AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(tenant_id, total_score) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_pic ON leads(current_pic_id);
CREATE INDEX IF NOT EXISTS idx_leads_client ON leads(client_id);

-- 7.7 Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 7.8 RLS Policies

-- Marketing: full access to tenant's leads
DROP POLICY IF EXISTS "marketing_manage_leads" ON public.leads;
CREATE POLICY "marketing_manage_leads"
  ON public.leads FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('marketing', 'marketing_lead', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('marketing', 'marketing_lead', 'admin', 'super_admin')
    )
  );

-- Commercial: read all tenant leads (for handover context)
DROP POLICY IF EXISTS "commercial_read_leads" ON public.leads;
CREATE POLICY "commercial_read_leads"
  ON public.leads FOR SELECT
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

-- Commercial: update leads they own (as commercial_pic)
DROP POLICY IF EXISTS "commercial_update_own_leads" ON public.leads;
CREATE POLICY "commercial_update_own_leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND commercial_pic_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND commercial_pic_id = auth.uid()
  );

-- CEO/CFO: read all for strategic visibility
DROP POLICY IF EXISTS "exec_read_leads" ON public.leads;
CREATE POLICY "exec_read_leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('ceo', 'cfo')
    )
  );

-- PM: read leads converted to deals
DROP POLICY IF EXISTS "pm_read_deal_leads" ON public.leads;
CREATE POLICY "pm_read_deal_leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND stage = 'deal'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('pm', 'pm_lead')
    )
  );

-- 7.9 Lead Activities Table (audit trail of interactions)
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN (
    'call', 'email', 'meeting', 'demo', 'proposal_sent', 
    'follow_up', 'note', 'stage_changed', 'score_updated'
  )),
  subject text,
  description text,
  outcome text,
  next_step text,
  next_step_due_at timestamptz,
  
  -- Metadata
  channel text CHECK (channel IN ('phone', 'email', 'whatsapp', 'zoom', 'in_person')),
  duration_minutes integer,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ownership
  performed_by uuid NOT NULL REFERENCES public.user_profiles(id),
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- 7.10 Indexes
CREATE INDEX IF NOT EXISTS idx_lead_activities_tenant ON lead_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_performed_by ON lead_activities(performed_by);
CREATE INDEX IF NOT EXISTS idx_lead_activities_recent ON lead_activities(lead_id, recorded_at DESC);

-- 7.11 Enable RLS
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- 7.12 RLS Policies for Lead Activities

-- Marketing: full access
DROP POLICY IF EXISTS "marketing_manage_lead_activities" ON public.lead_activities;
CREATE POLICY "marketing_manage_lead_activities"
  ON public.lead_activities FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('marketing', 'marketing_lead', 'admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('marketing', 'marketing_lead', 'admin', 'super_admin')
    )
  );

-- Commercial: read + insert (for handover notes)
DROP POLICY IF EXISTS "commercial_read_insert_activities" ON public.lead_activities;
CREATE POLICY "commercial_read_insert_activities"
  ON public.lead_activities FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('commercial', 'commercial_director')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('commercial', 'commercial_director')
    )
  );

-- 7.13 Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS lead_activities_updated_at ON lead_activities;
CREATE TRIGGER lead_activities_updated_at
  BEFORE UPDATE ON lead_activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7.14 Function: Calculate lead score
CREATE OR REPLACE FUNCTION public.calculate_lead_score(lead_id uuid)
RETURNS integer AS $$
DECLARE
  lead_record RECORD;
  score integer := 0;
  rule_record RECORD;
BEGIN
  -- Get lead data
  SELECT * INTO lead_record FROM public.leads WHERE id = lead_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Budget disclosed (25 pts)
  SELECT weight * (rules->>lead_record.budget_disclosed)::integer / 25
  INTO score
  FROM public.scoring_rules 
  WHERE component = 'budget_disclosed' AND tenant_id = lead_record.tenant_id;
  
  -- Authority level (25 pts)
  SELECT weight * (rules->>lead_record.authority_level)::integer / 25
  INTO score
  FROM public.scoring_rules 
  WHERE component = 'authority_level' AND tenant_id = lead_record.tenant_id;
  
  -- Need definition (20 pts)
  SELECT weight * lead_record.need_definition / 20
  INTO score
  FROM public.scoring_rules 
  WHERE component = 'need_definition' AND tenant_id = lead_record.tenant_id;
  
  -- Timeline (15 pts)
  SELECT weight * (rules->>lead_record.timeline)::integer / 15
  INTO score
  FROM public.scoring_rules 
  WHERE component = 'timeline' AND tenant_id = lead_record.tenant_id;
  
  -- Engagement score (15 pts)
  SELECT weight * lead_record.engagement_score / 15
  INTO score
  FROM public.scoring_rules 
  WHERE component = 'engagement_score' AND tenant_id = lead_record.tenant_id;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================




-- ============================================
-- FILE: 20260418_007_hr_bpjs_pph21_configs.sql
-- ============================================

-- =====================================================
-- FASE-4.0-C: BPJS & PPh21 Configurations
-- =====================================================
-- BPJS Kesehatan & Ketenagakerjaan rates
-- PPh21 TER (Tarif Efektif Rata-rata) 2025 config
-- =====================================================

-- 2.1 hr_bpjs_configs - BPJS rates configuration
CREATE TABLE IF NOT EXISTS public.hr_bpjs_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  
  -- BPJS Numbers
  bpjs_tk_number text, -- BPJS Ketenagakerjaan company number
  bpjs_kes_number text, -- BPJS Kesehatan company number
  
  -- BPJS Ketenagakerjaan Rates (percentage)
  -- Jaminan Kecelakaan Kerja (JKK) - company only, varies by risk level
  jkk_rate numeric(5, 4) NOT NULL DEFAULT 0.0024 CHECK (jkk_rate >= 0 AND jkk_rate <= 1), -- 0.24% default (risk level 1)
  
  -- Jaminan Kematian (JKM) - company only
  jkm_rate numeric(5, 4) NOT NULL DEFAULT 0.003 CHECK (jkm_rate >= 0 AND jkm_rate <= 1), -- 0.3%
  
  -- Jaminan Hari Tua (JHT) - company + employee
  jht_employee_rate numeric(5, 4) NOT NULL DEFAULT 0.02 CHECK (jht_employee_rate >= 0 AND jht_employee_rate <= 1), -- 2% employee
  jht_company_rate numeric(5, 4) NOT NULL DEFAULT 0.037 CHECK (jht_company_rate >= 0 AND jht_company_rate <= 1), -- 3.7% company
  
  -- Jaminan Pensiun (JP) - company + employee (salary cap applies)
  jp_employee_rate numeric(5, 4) NOT NULL DEFAULT 0.01 CHECK (jp_employee_rate >= 0 AND jp_employee_rate <= 1), -- 1% employee
  jp_company_rate numeric(5, 4) NOT NULL DEFAULT 0.02 CHECK (jp_company_rate >= 0 AND jp_company_rate <= 1), -- 2% company
  jp_salary_cap numeric(20, 4) DEFAULT 10800000.00, -- Salary cap for JP (2024: 10.8M)
  
  -- BPJS Kesehatan Rates (percentage)
  kes_employee_rate numeric(5, 4) NOT NULL DEFAULT 0.01 CHECK (kes_employee_rate >= 0 AND kes_employee_rate <= 1), -- 1% employee
  kes_company_rate numeric(5, 4) NOT NULL DEFAULT 0.04 CHECK (kes_company_rate >= 0 AND kes_company_rate <= 1), -- 4% company
  kes_salary_cap numeric(20, 4) DEFAULT 12000000.00, -- Salary cap for BPJS Kesehatan (2024: 12M)
  
  -- UMR override (for minimum contribution base)
  umr_override numeric(20, 4), -- If NULL, use hr_city_umr based on employee city
  
  -- Validity period
  effective_date date NOT NULL DEFAULT (CURRENT_DATE),
  end_date date, -- NULL = still active
  
  -- Inheritance pattern
  is_default boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, branch_id, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_hr_bpjs_configs_tenant ON public.hr_bpjs_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_bpjs_configs_entity ON public.hr_bpjs_configs(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_bpjs_configs_branch ON public.hr_bpjs_configs(branch_id);
CREATE INDEX IF NOT EXISTS idx_hr_bpjs_configs_active ON public.hr_bpjs_configs(end_date);

-- Enable RLS
ALTER TABLE public.hr_bpjs_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view BPJS configs in their tenant" ON public.hr_bpjs_configs;
CREATE POLICY "Users can view BPJS configs in their tenant"
  ON public.hr_bpjs_configs FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage BPJS configs" ON public.hr_bpjs_configs;
CREATE POLICY "HR admin can manage BPJS configs"
  ON public.hr_bpjs_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_bpjs_configs_updated_at ON public.hr_bpjs_configs;
CREATE TRIGGER hr_bpjs_configs_updated_at
  BEFORE UPDATE ON public.hr_bpjs_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2.2 hr_pph21_configs - PPh21 TER configuration per year
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hr_pph21_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  tax_year integer NOT NULL CHECK (tax_year >= 2020 AND tax_year <= 2100),
  
  -- PTKP (Penghasilan Tidak Kena Pajak) - per PMK 101/PMK.03/2016
  ptkp_tk0 numeric(20, 2) NOT NULL DEFAULT 54000000.00, -- TK/0 (Single, no dependents)
  ptkp_tk1 numeric(20, 2) NOT NULL DEFAULT 58500000.00, -- TK/1 (Single, 1 dependent)
  ptkp_tk2 numeric(20, 2) NOT NULL DEFAULT 63000000.00, -- TK/2 (Single, 2 dependents)
  ptkp_tk3 numeric(20, 2) NOT NULL DEFAULT 67500000.00, -- TK/3 (Single, 3 dependents)
  ptkp_k0 numeric(20, 2) NOT NULL DEFAULT 58500000.00, -- K/0 (Married, no dependents)
  ptkp_k1 numeric(20, 2) NOT NULL DEFAULT 63000000.00, -- K/1 (Married, 1 dependent)
  ptkp_k2 numeric(20, 2) NOT NULL DEFAULT 67500000.00, -- K/2 (Married, 2 dependents)
  ptkp_k3 numeric(20, 2) NOT NULL DEFAULT 72000000.00, -- K/3 (Married, 3 dependents)
  
  -- PPh21 TER Brackets (UU HPP 2021) - JSONB for flexibility
  -- Format: [{"min": 0, "max": 60000000, "rate": 0.05}, {"min": 60000000, "max": 500000000, "rate": 0.15}, ...]
  pph21_brackets jsonb NOT NULL DEFAULT '[
    {"min": 0, "max": 60000000, "rate": 0.05},
    {"min": 60000000, "max": 500000000, "rate": 0.15},
    {"min": 500000000, "max": 2500000000, "rate": 0.25},
    {"min": 2500000000, "max": 5000000000, "rate": 0.30},
    {"min": 5000000000, "max": null, "rate": 0.35}
  ]'::jsonb,
  
  -- TER (Tarif Efektif Rata-rata) method
  use_ter_method boolean DEFAULT true, -- true = TER, false = gross-up
  
  -- TER Brackets (for monthly calculation) - JSONB
  ter_brackets jsonb DEFAULT '[
    {"min": 0, "max": 5500000, "rate": 0.0},
    {"min": 5500000, "max": 8958333, "rate": 0.05},
    {"min": 8958333, "max": 20000000, "rate": 0.15},
    {"min": 20000000, "max": null, "rate": 0.25}
  ]'::jsonb,
  
  -- Biaya jabatan (5% of salary, max 600k/year = 50k/month)
  jabatan_rate numeric(5, 4) NOT NULL DEFAULT 0.05 CHECK (jabatan_rate >= 0 AND jabatan_rate <= 1),
  jabatan_max_annual numeric(20, 2) NOT NULL DEFAULT 6000000.00,
  jabatan_max_monthly numeric(20, 2) NOT NULL DEFAULT 500000.00,
  
  -- Non-NPWP surcharge (20% higher)
  non_npwp_surcharge numeric(5, 4) NOT NULL DEFAULT 0.20 CHECK (non_npwp_surcharge >= 0 AND non_npwp_surcharge <= 1),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, tax_year)
);

CREATE INDEX IF NOT EXISTS idx_hr_pph21_configs_tenant ON public.hr_pph21_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_pph21_configs_year ON public.hr_pph21_configs(tax_year);

-- Enable RLS
ALTER TABLE public.hr_pph21_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view PPh21 configs in their tenant" ON public.hr_pph21_configs;
CREATE POLICY "Users can view PPh21 configs in their tenant"
  ON public.hr_pph21_configs FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage PPh21 configs" ON public.hr_pph21_configs;
CREATE POLICY "HR admin can manage PPh21 configs"
  ON public.hr_pph21_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_pph21_configs_updated_at ON public.hr_pph21_configs;
CREATE TRIGGER hr_pph21_configs_updated_at
  BEFORE UPDATE ON public.hr_pph21_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Seed Data: Default PPh21 Config 2025
-- =====================================================

INSERT INTO public.hr_pph21_configs (tax_year, ptkp_tk0, ptkp_tk1, ptkp_tk2, ptkp_tk3, ptkp_k0, ptkp_k1, ptkp_k2, ptkp_k3)
VALUES (2025, 54000000.00, 58500000.00, 63000000.00, 67500000.00, 58500000.00, 63000000.00, 67500000.00, 72000000.00)
ON CONFLICT (tenant_id, tax_year) DO NOTHING;

-- Note: Above insert requires tenant_id. Run after creating tenant:
-- INSERT INTO public.hr_pph21_configs (tenant_id, tax_year, ...)
-- VALUES ('00000000-0000-0000-0000-000000000001', 2025, ...);

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Tables created:
-- - hr_bpjs_configs (BPJS TK & Kesehatan rates)
-- - hr_pph21_configs (PPh21 TER brackets + PTKP)
-- =====================================================




-- ============================================
-- FILE: 20260418_008_create_sales_briefs_quotations.sql
-- ============================================

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




-- ============================================
-- FILE: 20260418_008_hr_salary_components.sql
-- ============================================

-- =====================================================
-- FASE-4.0-D: Salary Components
-- =====================================================
-- Earnings, deductions, allowances, bonuses, etc.
-- Soft delete mandatory - never hard delete if used by employees
-- =====================================================

CREATE TABLE IF NOT EXISTS public.hr_salary_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  
  -- Component info
  name text NOT NULL, -- e.g., "Gaji Pokok", "Tunjangan Jabatan", "BPJS Kesehatan"
  code text NOT NULL, -- e.g., "GAPOK", "TUNJAB", "BPJSKESE"
  
  -- Type: earning or deduction
  component_type text NOT NULL CHECK (component_type IN ('earning', 'deduction')),
  
  -- Category for grouping and reporting
  category text NOT NULL CHECK (category IN (
    'basic', -- Gaji pokok
    'allowance', -- Tunjangan (transport, makan, komunikasi, dll)
    'overtime', -- Lembur
    'bonus', -- Bonus performance
    'thr', -- THR
    'bpjs_tk', -- BPJS Ketenagakerjaan
    'bpjs_kes', -- BPJS Kesehatan
    'pph21', -- PPh21
    'loan', -- Kasbon/pinjaman
    'other' -- Lainnya
  )),
  
  -- Amount configuration
  amount_type text NOT NULL DEFAULT 'fixed' CHECK (amount_type IN (
    'fixed', -- Fixed amount
    'percentage', -- Percentage of basic salary
    'formula', -- Custom formula
    'variable' -- Varies per employee
  )),
  
  fixed_amount numeric(20, 4) DEFAULT 0, -- For fixed type
  percentage numeric(5, 4) DEFAULT 0, -- For percentage type (e.g., 0.05 = 5%)
  formula text, -- For formula type (e.g., "basic_salary * 0.1")
  
  -- Tax and BPJS treatment
  is_taxable boolean DEFAULT false, -- Included in taxable income
  is_bpjs_base boolean DEFAULT false, -- Included in BPJS contribution base
  is_fixed boolean DEFAULT true, -- Fixed every month (vs variable)
  
  -- Display order in payslip
  display_order integer DEFAULT 0,
  
  -- Soft delete - HARD RULE: never hard delete if used by employees
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id),
  deleted_reason text,
  
  description text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, code)
);

CREATE INDEX IF NOT EXISTS idx_hr_salary_components_tenant ON public.hr_salary_components(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_salary_components_entity ON public.hr_salary_components(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_salary_components_type ON public.hr_salary_components(component_type);
CREATE INDEX IF NOT EXISTS idx_hr_salary_components_category ON public.hr_salary_components(category);
CREATE INDEX IF NOT EXISTS idx_hr_salary_components_deleted ON public.hr_salary_components(deleted_at);

-- Enable RLS
ALTER TABLE public.hr_salary_components ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view salary components in their tenant" ON public.hr_salary_components;
CREATE POLICY "Users can view salary components in their tenant"
  ON public.hr_salary_components FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage salary components" ON public.hr_salary_components;
CREATE POLICY "HR admin can manage salary components"
  ON public.hr_salary_components FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  )
  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_salary_components_updated_at ON public.hr_salary_components;
CREATE TRIGGER hr_salary_components_updated_at
  BEFORE UPDATE ON public.hr_salary_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Seed Data: Default Salary Components (12 components)
-- =====================================================

-- EARNINGS
INSERT INTO public.hr_salary_components (name, code, component_type, category, is_taxable, is_bpjs_base, is_fixed, display_order)
VALUES 
  ('Gaji Pokok', 'GAPOK', 'earning', 'basic', true, true, true, 1),
  ('Tunjangan Jabatan', 'TUNJAB', 'earning', 'allowance', true, true, true, 2),
  ('Tunjangan Transport', 'TUNTRANS', 'earning', 'allowance', true, false, true, 3),
  ('Tunjangan Makan', 'TUNMAKAN', 'earning', 'allowance', true, false, true, 4),
  ('Tunjangan Komunikasi', 'TUNKOMUNIK', 'earning', 'allowance', true, false, true, 5),
  ('Lembur', 'LEMBUR', 'earning', 'overtime', true, false, false, 6),
  ('Bonus', 'BONUS', 'earning', 'bonus', true, false, false, 7),
  ('THR', 'THR', 'earning', 'thr', true, false, true, 8)
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- DEDUCTIONS
INSERT INTO public.hr_salary_components (name, code, component_type, category, is_taxable, is_bpjs_base, is_fixed, display_order)
VALUES 
  ('BPJS Ketenagakerjaan', 'BPJSTKE', 'deduction', 'bpjs_tk', false, false, true, 10),
  ('BPJS Kesehatan', 'BPJSKESE', 'deduction', 'bpjs_kes', false, false, true, 11),
  ('PPh21', 'PPH21', 'deduction', 'pph21', false, false, false, 12),
  ('Kasbon', 'KASBON', 'deduction', 'loan', false, false, false, 13)
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- Note: Above inserts require tenant_id. Run after creating tenant.

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- hr_salary_components ready with 12 default components
-- SOFT DELETE ONLY - never hard delete!
-- =====================================================




-- ============================================
-- FILE: 20260418_009_hr_grades_matrix.sql
-- ============================================

-- =====================================================
-- FASE-4.0-E: Job Grades & Salary Matrix
-- =====================================================
-- Job grading system + salary steps per grade
-- =====================================================

-- 4.1 hr_job_grades - Job grade/level definitions
CREATE TABLE IF NOT EXISTS public.hr_job_grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  
  code text NOT NULL, -- e.g., "G1", "G2", "M1", "M2", "S1", "S2"
  name text NOT NULL, -- e.g., "Staff", "Senior Staff", "Manager", "Senior Manager"
  
  -- Hierarchy level (lower = higher in hierarchy)
  level integer NOT NULL CHECK (level > 0), -- e.g., 1 = highest (Director), 10 = lowest (Staff)
  
  -- Salary range
  salary_min numeric(20, 4) NOT NULL CHECK (salary_min >= 0),
  salary_mid numeric(20, 4), -- Market midpoint (optional)
  salary_max numeric(20, 4) NOT NULL CHECK (salary_max >= salary_min),
  
  -- Leave quota per year
  leave_quota integer DEFAULT 12, -- Annual leave days
  
  -- Other benefits
  is_overtime_eligible boolean DEFAULT true,
  is_car_allowance_eligible boolean DEFAULT false,
  is_bonus_eligible boolean DEFAULT true,
  
  description text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, code)
);

CREATE INDEX IF NOT EXISTS idx_hr_job_grades_tenant ON public.hr_job_grades(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_job_grades_entity ON public.hr_job_grades(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_job_grades_level ON public.hr_job_grades(level);

-- Enable RLS
ALTER TABLE public.hr_job_grades ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view job grades in their tenant" ON public.hr_job_grades;
CREATE POLICY "Users can view job grades in their tenant"
  ON public.hr_job_grades FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage job grades" ON public.hr_job_grades;
CREATE POLICY "HR admin can manage job grades"
  ON public.hr_job_grades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_job_grades_updated_at ON public.hr_job_grades;
CREATE TRIGGER hr_job_grades_updated_at
  BEFORE UPDATE ON public.hr_job_grades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 4.2 hr_salary_matrix - Salary steps per job grade
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hr_salary_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  
  grade_id uuid REFERENCES public.hr_job_grades(id) ON DELETE CASCADE NOT NULL,
  
  step integer NOT NULL CHECK (step > 0), -- e.g., 1, 2, 3, 4, 5
  amount numeric(20, 4) NOT NULL CHECK (amount >= 0),
  
  effective_date date NOT NULL,
  end_date date, -- NULL = still active
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, grade_id, step, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_hr_salary_matrix_tenant ON public.hr_salary_matrix(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_salary_matrix_entity ON public.hr_salary_matrix(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_salary_matrix_grade ON public.hr_salary_matrix(grade_id);
CREATE INDEX IF NOT EXISTS idx_hr_salary_matrix_step ON public.hr_salary_matrix(step);
CREATE INDEX IF NOT EXISTS idx_hr_salary_matrix_active ON public.hr_salary_matrix(end_date);

-- Enable RLS
ALTER TABLE public.hr_salary_matrix ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view salary matrix in their tenant" ON public.hr_salary_matrix;
CREATE POLICY "Users can view salary matrix in their tenant"
  ON public.hr_salary_matrix FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage salary matrix" ON public.hr_salary_matrix;
CREATE POLICY "HR admin can manage salary matrix"
  ON public.hr_salary_matrix FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- =====================================================
-- Seed Data: Default Job Grades (sample structure)
-- =====================================================

INSERT INTO public.hr_job_grades (code, name, level, salary_min, salary_mid, salary_max, leave_quota, is_overtime_eligible)
VALUES 
  -- Management track
  ('D1', 'Director', 1, 25000000.00, 35000000.00, 50000000.00, 15, false),
  ('M1', 'Manager', 2, 15000000.00, 20000000.00, 30000000.00, 14, false),
  ('M2', 'Senior Manager', 3, 12000000.00, 15000000.00, 20000000.00, 14, false),
  
  -- Professional track
  ('S1', 'Senior Staff', 4, 8000000.00, 10000000.00, 14000000.00, 12, true),
  ('S2', 'Staff', 5, 5500000.00, 7000000.00, 9000000.00, 12, true),
  ('S3', 'Junior Staff', 6, 4500000.00, 5000000.00, 6000000.00, 12, true)
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- Note: Above insert requires tenant_id. Run after creating tenant.

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Tables created:
-- - hr_job_grades (job levels with salary range)
-- - hr_salary_matrix (salary steps per grade)
-- =====================================================




-- ============================================
-- FILE: 20260418_010_hr_org_structure.sql
-- ============================================

-- =====================================================
-- FASE-4.0-F: Organization Structure
-- =====================================================
-- Departments (hierarchical) + Positions
-- Requires: entities table (FASE-0) ✅
-- =====================================================

-- 5.1 hr_departments - Department structure (nested)
CREATE TABLE IF NOT EXISTS public.hr_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  
  -- Hierarchy
  parent_id uuid REFERENCES public.hr_departments(id) ON DELETE SET NULL, -- nested departments
  code text NOT NULL, -- e.g., "HR", "FIN", "IT", "OPS"
  name text NOT NULL, -- e.g., "Human Resources", "Finance", "Information Technology"
  
  -- Department head
  head_user_id uuid REFERENCES auth.users(id), -- User who leads this department
  
  -- Contact info
  email text,
  phone text,
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Cost center (for finance integration)
  cost_center_code text,
  
  description text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, code)
);

CREATE INDEX IF NOT EXISTS idx_hr_departments_tenant ON public.hr_departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_departments_entity ON public.hr_departments(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_departments_branch ON public.hr_departments(branch_id);
CREATE INDEX IF NOT EXISTS idx_hr_departments_parent ON public.hr_departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_hr_departments_active ON public.hr_departments(is_active);

-- Enable RLS
ALTER TABLE public.hr_departments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view departments in their tenant" ON public.hr_departments;
CREATE POLICY "Users can view departments in their tenant"
  ON public.hr_departments FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage departments" ON public.hr_departments;
CREATE POLICY "HR admin can manage departments"
  ON public.hr_departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_departments_updated_at ON public.hr_departments;
CREATE TRIGGER hr_departments_updated_at
  BEFORE UPDATE ON public.hr_departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5.2 hr_positions - Position catalog
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hr_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  
  -- Position details
  code text NOT NULL, -- e.g., "HR-MGR", "FIN-SPV", "IT-DEV"
  name text NOT NULL, -- e.g., "HR Manager", "Finance Supervisor", "Software Developer"
  
  -- Organization links
  department_id uuid REFERENCES public.hr_departments(id) ON DELETE SET NULL,
  grade_id uuid REFERENCES public.hr_job_grades(id) ON DELETE SET NULL,
  
  -- Reporting line
  reports_to_id uuid REFERENCES public.hr_positions(id) ON DELETE SET NULL, -- position this reports to
  
  -- Headcount
  headcount_planned integer DEFAULT 1,
  headcount_current integer DEFAULT 0,
  
  -- Requirements
  is_critical boolean DEFAULT false, -- Critical position (succession planning)
  is_vacant boolean DEFAULT false, -- Currently no incumbent
  
  -- Job info
  job_description text,
  requirements text, -- Qualifications, skills, experience
  
  -- Status
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, code)
);

CREATE INDEX IF NOT EXISTS idx_hr_positions_tenant ON public.hr_positions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_positions_entity ON public.hr_positions(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_positions_department ON public.hr_positions(department_id);
CREATE INDEX IF NOT EXISTS idx_hr_positions_grade ON public.hr_positions(grade_id);
CREATE INDEX IF NOT EXISTS idx_hr_positions_reports ON public.hr_positions(reports_to_id);
CREATE INDEX IF NOT EXISTS idx_hr_positions_active ON public.hr_positions(is_active);
CREATE INDEX IF NOT EXISTS idx_hr_positions_vacant ON public.hr_positions(is_vacant);

-- Enable RLS
ALTER TABLE public.hr_positions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view positions in their tenant" ON public.hr_positions;
CREATE POLICY "Users can view positions in their tenant"
  ON public.hr_positions FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage positions" ON public.hr_positions;
CREATE POLICY "HR admin can manage positions"
  ON public.hr_positions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_positions_updated_at ON public.hr_positions;
CREATE TRIGGER hr_positions_updated_at
  BEFORE UPDATE ON public.hr_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Seed Data: Sample Departments & Positions
-- =====================================================

-- Departments (under demo entity)
INSERT INTO public.hr_departments (entity_id, code, name, cost_center_code)
SELECT 
  '30000000-0000-0000-0000-000000000001' as entity_id, -- Human Capital Division
  dept_code,
  dept_name,
  cost_code
FROM (VALUES
  ('HR', 'Human Resources', 'CC-HR-001'),
  ('GA', 'General Affairs', 'CC-GA-001'),
  ('FIN', 'Finance & Accounting', 'CC-FIN-001'),
  ('IT', 'Information Technology', 'CC-IT-001'),
  ('OPS', 'Operations', 'CC-OPS-001')
) AS depts(dept_code, dept_name, cost_code)
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- Positions (sample)
INSERT INTO public.hr_positions (entity_id, department_id, code, name, grade_id, headcount_planned, is_critical)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id, -- PT W-System Indonesia
  (SELECT id FROM hr_departments WHERE code = 'HR' LIMIT 1) as department_id,
  pos_code,
  pos_name,
  (SELECT id FROM hr_job_grades WHERE code = pos_grade LIMIT 1) as grade_id,
  hc_planned,
  is_crit
FROM (VALUES
  ('HR-MGR', 'HR Manager', 'M1', 1, true),
  ('HR-SPV', 'HR Supervisor', 'S1', 1, false),
  ('HR-STF', 'HR Staff', 'S2', 2, false),
  ('GA-MGR', 'GA Manager', 'M1', 1, false),
  ('GA-STF', 'GA Staff', 'S2', 2, false)
) AS positions(pos_code, pos_name, pos_grade, hc_planned, is_crit)
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- Note: Above inserts require tenant_id. Run after creating tenant.

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Tables created:
-- - hr_departments (nested org structure)
-- - hr_positions (position catalog with headcount)
-- =====================================================




-- ============================================
-- FILE: 20260418_011_hr_work_areas_ot.sql
-- ============================================

-- =====================================================
-- FASE-4.0-G: Work Areas & Overtime Rules
-- =====================================================
-- Work area definitions + overtime calculation rules
-- =====================================================

-- 6.1 hr_work_areas - Work location/area definitions
CREATE TABLE IF NOT EXISTS public.hr_work_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  
  code text NOT NULL, -- e.g., "WH-01", "OFF-HR", "SITE-A"
  name text NOT NULL, -- e.g., "Warehouse 1", "HR Office", "Construction Site A"
  
  -- Location reference
  city_id uuid REFERENCES public.regions(id), -- Reference to cities in regions table
  
  -- Work area type
  area_type text NOT NULL CHECK (area_type IN ('office', 'warehouse', 'site', 'remote', 'client')),
  
  -- Address details
  address_line1 text,
  address_line2 text,
  postal_code text,
  
  -- Contact person at this location
  contact_name text,
  contact_phone text,
  
  -- Status
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, code)
);

CREATE INDEX IF NOT EXISTS idx_hr_work_areas_tenant ON public.hr_work_areas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_areas_entity ON public.hr_work_areas(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_areas_branch ON public.hr_work_areas(branch_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_areas_city ON public.hr_work_areas(city_id);
CREATE INDEX IF NOT EXISTS idx_hr_work_areas_type ON public.hr_work_areas(area_type);
CREATE INDEX IF NOT EXISTS idx_hr_work_areas_active ON public.hr_work_areas(is_active);

-- Enable RLS
ALTER TABLE public.hr_work_areas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view work areas in their tenant" ON public.hr_work_areas;
CREATE POLICY "Users can view work areas in their tenant"
  ON public.hr_work_areas FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage work areas" ON public.hr_work_areas;
CREATE POLICY "HR admin can manage work areas"
  ON public.hr_work_areas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_work_areas_updated_at ON public.hr_work_areas;
CREATE TRIGGER hr_work_areas_updated_at
  BEFORE UPDATE ON public.hr_work_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6.2 hr_overtime_rules - Overtime calculation rules
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hr_overtime_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
  
  -- Rule classification
  code text NOT NULL, -- e.g., "OT-WEEKDAY", "OT-WEEKEND", "OT-HOLIDAY"
  name text NOT NULL, -- e.g., "Weekday Overtime", "Weekend Overtime"
  
  -- Day type
  day_type text NOT NULL CHECK (day_type IN ('weekday', 'weekend', 'public_holiday', 'national_holiday')),
  
  -- Time-based rules (hour of day)
  start_hour integer CHECK (start_hour >= 0 AND start_hour <= 23), -- e.g., 17 = 5 PM
  end_hour integer CHECK (end_hour >= 0 AND end_hour <= 23), -- e.g., 21 = 9 PM
  
  -- Overtime multiplier (based on Indonesian labor law)
  -- Hour 1: 1.5x, Hour 2+: 2x for weekday
  -- Weekend/holiday: different rates
  first_hour_multiplier numeric(5, 2) DEFAULT 1.50 CHECK (first_hour_multiplier >= 1.0),
  subsequent_hour_multiplier numeric(5, 2) DEFAULT 2.00 CHECK (subsequent_hour_multiplier >= 1.0),
  
  -- Max overtime per day/month
  max_hours_per_day numeric(4, 2) DEFAULT 4.00,
  max_hours_per_month numeric(4, 2) DEFAULT 60.00,
  
  -- Approval requirements
  requires_approval boolean DEFAULT true,
  approval_level text DEFAULT 'supervisor', -- supervisor, manager, hr
  
  -- Effective period
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  
  -- Status
  is_active boolean DEFAULT true,
  
  description text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, entity_id, code)
);

CREATE INDEX IF NOT EXISTS idx_hr_overtime_rules_tenant ON public.hr_overtime_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_overtime_rules_entity ON public.hr_overtime_rules(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_overtime_rules_day_type ON public.hr_overtime_rules(day_type);
CREATE INDEX IF NOT EXISTS idx_hr_overtime_rules_active ON public.hr_overtime_rules(is_active);

-- Enable RLS
ALTER TABLE public.hr_overtime_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view overtime rules in their tenant" ON public.hr_overtime_rules;
CREATE POLICY "Users can view overtime rules in their tenant"
  ON public.hr_overtime_rules FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage overtime rules" ON public.hr_overtime_rules;
CREATE POLICY "HR admin can manage overtime rules"
  ON public.hr_overtime_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_overtime_rules_updated_at ON public.hr_overtime_rules;
CREATE TRIGGER hr_overtime_rules_updated_at
  BEFORE UPDATE ON public.hr_overtime_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Seed Data: Default Overtime Rules (Indonesian Labor Law)
-- =====================================================

-- Weekday overtime (after normal working hours)
INSERT INTO public.hr_overtime_rules (entity_id, code, name, day_type, start_hour, first_hour_multiplier, subsequent_hour_multiplier, max_hours_per_day, max_hours_per_month)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  'OT-WEEKDAY',
  'Weekday Overtime (After 5 PM)',
  'weekday',
  17, -- Starts at 5 PM
  1.50, -- First hour: 1.5x hourly rate
  2.00, -- Subsequent hours: 2x hourly rate
  4.00, -- Max 4 hours per day
  60.00 -- Max 60 hours per month
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- Weekend overtime (Saturday/Sunday)
INSERT INTO public.hr_overtime_rules (entity_id, code, name, day_type, first_hour_multiplier, subsequent_hour_multiplier, max_hours_per_day, max_hours_per_month)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  'OT-WEEKEND',
  'Weekend Overtime',
  'weekend',
  2.00, -- First hour: 2x
  3.00, -- Subsequent hours: 3x
  8.00, -- Max 8 hours per day
  60.00
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- Public holiday overtime
INSERT INTO public.hr_overtime_rules (entity_id, code, name, day_type, first_hour_multiplier, subsequent_hour_multiplier, max_hours_per_day, max_hours_per_month)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  'OT-HOLIDAY',
  'Public Holiday Overtime',
  'public_holiday',
  2.00, -- First hour: 2x
  3.00, -- Subsequent hours: 3x
  8.00,
  60.00
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Tables created:
-- - hr_work_areas (work location definitions)
-- - hr_overtime_rules (OT calculation rules per Indonesian labor law)
-- =====================================================




-- ============================================
-- FILE: 20260418_012_seed_hc_data.sql
-- ============================================

-- =====================================================
-- FASE-4.0-H: Seed Data for HC Master Data Tables
-- =====================================================
-- Sample data for testing and development
-- Requires: FASE-0 (tenants, entities, branches, regions) ✅
-- Requires: FASE-4.0-A to G ✅
-- =====================================================

-- =====================================================
-- 1. Work Shifts & Calendars
-- =====================================================

-- Work shifts (assuming tenant_id and entity_id from demo data)
INSERT INTO public.hr_work_shifts (entity_id, code, name, shift_type, start_time, end_time, is_overnight, break_duration_minutes)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  shift_code,
  shift_name,
  s_type,
  s_start,
  s_end,
  overnight,
  break_min
FROM (VALUES
  ('REG', 'Regular Shift', 'regular', '09:00', '18:00', false, 60),
  ('MOR', 'Morning Shift', 'regular', '07:00', '16:00', false, 60),
  ('AFT', 'Afternoon Shift', 'regular', '14:00', '23:00', false, 60),
  ('NGT', 'Night Shift', 'regular', '23:00', '08:00', true, 60),
  ('FLX', 'Flexible', 'flexible', NULL, NULL, false, NULL)
) AS shifts(shift_code, shift_name, s_type, s_start, s_end, overnight, break_min)
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- Work calendars
INSERT INTO public.hr_work_calendars (entity_id, name, calendar_type, start_date, end_date, is_default)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  cal_name,
  cal_type,
  cal_start,
  cal_end,
  is_def
FROM (VALUES
  ('Standard 2026', 'standard', '2026-01-01', '2026-12-31', true),
  ('Production 2026', 'production', '2026-01-01', '2026-12-31', false),
  ('Retail 2026', 'retail', '2026-01-01', '2026-12-31', false)
) AS calendars(cal_name, cal_type, cal_start, cal_end, is_def)
ON CONFLICT (tenant_id, entity_id, name) DO NOTHING;

-- =====================================================
-- 2. City UMR (Upah Minimum Regional) 2026
-- =====================================================

INSERT INTO public.hr_city_umr (city_id, year, umr_amount, effective_date, source_document)
SELECT 
  city_id,
  2026,
  umr,
  eff_date,
  src_doc
FROM (VALUES
  -- DKI Jakarta (from regions table seed data)
  ((SELECT id FROM regions WHERE name = 'Jakarta Pusat'), 4900000.00, '2026-01-01', 'Kepgub DKI Jakarta No. XXX/2025'),
  ((SELECT id FROM regions WHERE name = 'Jakarta Selatan'), 4900000.00, '2026-01-01', 'Kepgub DKI Jakarta No. XXX/2025'),
  ((SELECT id FROM regions WHERE name = 'Jakarta Barat'), 4900000.00, '2026-01-01', 'Kepgub DKI Jakarta No. XXX/2025'),
  ((SELECT id FROM regions WHERE name = 'Jakarta Timur'), 4900000.00, '2026-01-01', 'Kepgub DKI Jakarta No. XXX/2025'),
  ((SELECT id FROM regions WHERE name = 'Jakarta Utara'), 4900000.00, '2026-01-01', 'Kepgub DKI Jakarta No. XXX/2025'),
  
  -- Jawa Barat
  ((SELECT id FROM regions WHERE name = 'Bandung'), 3200000.00, '2026-01-01', 'Kepgub Jabar No. XXX/2025'),
  ((SELECT id FROM regions WHERE name = 'Bekasi'), 5100000.00, '2026-01-01', 'Kepgub Jabar No. XXX/2025'),
  ((SELECT id FROM regions WHERE name = 'Depok'), 4800000.00, '2026-01-01', 'Kepgub Jabar No. XXX/2025'),
  ((SELECT id FROM regions WHERE name = 'Bogor'), 4500000.00, '2026-01-01', 'Kepgub Jabar No. XXX/2025'),
  ((SELECT id FROM regions WHERE name = 'Tangerang'), 5000000.00, '2026-01-01', 'Kepgub Banten No. XXX/2025'),
  
  -- Jawa Timur
  ((SELECT id FROM regions WHERE name = 'Surabaya'), 4600000.00, '2026-01-01', 'Kepgub Jatim No. XXX/2025'),
  
  -- Jawa Tengah
  ((SELECT id FROM regions WHERE name = 'Semarang'), 3100000.00, '2026-01-01', 'Kepgub Jateng No. XXX/2025')
) AS umr_data(city_id, umr, eff_date, src_doc)
ON CONFLICT (tenant_id, city_id, year) DO NOTHING;

-- =====================================================
-- 3. BPJS & PPh21 Configs
-- =====================================================

-- BPJS Ketenagakerjaan config (2026 rates)
INSERT INTO public.hr_bpjs_configs (entity_id, bpjs_type, category, rate_employee, rate_company, max_salary_base, description)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  b_type,
  cat,
  r_emp,
  r_comp,
  max_base,
  desc_text
FROM (VALUES
  ('ketenagakerjaan', 'JKK', 0.00, 0.24, 12000000.00, 'Jaminan Kecelakaan Kerja - 0.24% (risk level 1)'),
  ('ketenagakerjaan', 'JKM', 0.00, 0.30, 12000000.00, 'Jaminan Kematian - 0.30%'),
  ('ketenagakerjaan', 'JHT', 2.00, 3.70, 12000000.00, 'Jaminan Hari Tua - 5.70% total'),
  ('ketenagakerjaan', 'JP', 1.00, 2.00, 12000000.00, 'Jaminan Pensiun - 3.00% total'),
  ('kesehatan', 'Kesehatan', 1.00, 4.00, 12000000.00, 'BPJS Kesehatan - 5% total')
) AS bpjs(b_type, cat, r_emp, r_comp, max_base, desc_text)
ON CONFLICT (tenant_id, entity_id, bpjs_type, category) DO NOTHING;

-- PPh21 TER (Tarif Efektif Rata-rata) 2026
INSERT INTO public.hr_pph21_configs (entity_id, filing_status, income_range_min, income_range_max, monthly_rate, description)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  status,
  min_inc,
  max_inc,
  rate,
  desc_text
FROM (VALUES
  ('TK/0', 0, 5000000.00, 0.00, 'TK/0 - Penghasilan s.d. 5 Juta'),
  ('TK/0', 5000000.01, 10000000.00, 0.025, 'TK/0 - Penghasilan 5-10 Juta'),
  ('TK/0', 10000000.01, 20000000.00, 0.045, 'TK/0 - Penghasilan 10-20 Juta'),
  ('TK/0', 20000000.01, 50000000.00, 0.0675, 'TK/0 - Penghasilan 20-50 Juta'),
  ('TK/0', 50000000.01, 100000000.00, 0.0825, 'TK/0 - Penghasilan 50-100 Juta'),
  ('TK/0', 100000000.01, 250000000.00, 0.0975, 'TK/0 - Penghasilan 100-250 Juta'),
  ('TK/0', 250000000.01, 500000000.00, 0.1125, 'TK/0 - Penghasilan 250-500 Juta'),
  ('TK/0', 500000000.01, NULL, 0.135, 'TK/0 - Penghasilan > 500 Juta'),
  
  ('K/0', 0, 5000000.00, 0.00, 'K/0 - Kawin tanpa tanggungan'),
  ('K/0', 5000000.01, 10000000.00, 0.0225, 'K/0'),
  ('K/0', 10000000.01, 20000000.00, 0.0425, 'K/0'),
  ('K/0', 20000000.01, 50000000.00, 0.065, 'K/0'),
  ('K/0', 50000000.01, 100000000.00, 0.08, 'K/0'),
  ('K/0', 100000000.01, 250000000.00, 0.095, 'K/0'),
  ('K/0', 250000000.01, 500000000.00, 0.11, 'K/0'),
  ('K/0', 500000000.01, NULL, 0.1325, 'K/0'),
  
  ('K/1', 0, 5000000.00, 0.00, 'K/1 - Kawin 1 tanggungan'),
  ('K/1', 5000000.01, 10000000.00, 0.02, 'K/1'),
  ('K/1', 10000000.01, 20000000.00, 0.04, 'K/1'),
  ('K/1', 20000000.01, 50000000.00, 0.0625, 'K/1'),
  ('K/1', 50000000.01, 100000000.00, 0.0775, 'K/1'),
  ('K/1', 100000000.01, 250000000.00, 0.0925, 'K/1'),
  ('K/1', 250000000.01, 500000000.00, 0.1075, 'K/1'),
  ('K/1', 500000000.01, NULL, 0.13, 'K/1'),
  
  ('K/2', 0, 5000000.00, 0.00, 'K/2 - Kawin 2 tanggungan'),
  ('K/2', 5000000.01, 10000000.00, 0.0175, 'K/2'),
  ('K/2', 10000000.01, 20000000.00, 0.0375, 'K/2'),
  ('K/2', 20000000.01, 50000000.00, 0.06, 'K/2'),
  ('K/2', 50000000.01, 100000000.00, 0.075, 'K/2'),
  ('K/2', 100000000.01, 250000000.00, 0.09, 'K/2'),
  ('K/2', 250000000.01, 500000000.00, 0.105, 'K/2'),
  ('K/2', 500000000.01, NULL, 0.1275, 'K/2'),
  
  ('K/3', 0, 5000000.00, 0.00, 'K/3 - Kawin 3 tanggungan (max)'),
  ('K/3', 5000000.01, 10000000.00, 0.015, 'K/3'),
  ('K/3', 10000000.01, 20000000.00, 0.035, 'K/3'),
  ('K/3', 20000000.01, 50000000.00, 0.0575, 'K/3'),
  ('K/3', 50000000.01, 100000000.00, 0.0725, 'K/3'),
  ('K/3', 100000000.01, 250000000.00, 0.0875, 'K/3'),
  ('K/3', 250000000.01, 500000000.00, 0.1025, 'K/3'),
  ('K/3', 500000000.01, NULL, 0.125, 'K/3')
) AS pph21(status, min_inc, max_inc, rate, desc_text)
ON CONFLICT (tenant_id, entity_id, filing_status, income_range_min) DO NOTHING;

-- =====================================================
-- 4. Salary Components
-- =====================================================

INSERT INTO public.hr_salary_components (entity_id, code, name, component_type, is_fixed, is_taxable, is_bpjs_base, display_order)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  comp_code,
  comp_name,
  c_type,
  fixed,
  taxable,
  bpjs_base,
  d_order
FROM (VALUES
  ('GAJI_POKOK', 'Gaji Pokok', 'earning', true, true, true, 1),
  ('TUNJ_JABATAN', 'Tunjangan Jabatan', 'earning', true, true, true, 2),
  ('TUNJ_MAKAN', 'Tunjangan Makan', 'earning', true, true, false, 3),
  ('TUNJ_TRANSPORT', 'Tunjangan Transport', 'earning', true, true, false, 4),
  ('TUNJ_KEHADIRAN', 'Tunjangan Kehadiran', 'earning', true, true, false, 5),
  ('LEMBUR', 'Lembur/Overtime', 'earning', false, true, false, 6),
  ('BONUS', 'Bonus', 'earning', false, true, true, 7),
  ('THP', 'THR', 'earning', false, true, true, 8),
  
  ('BPJS_KT_EMP', 'BPJS Ketenagakerjaan (Employee)', 'deduction', true, false, false, 100),
  ('BPJS_KES_EMP', 'BPJS Kesehatan (Employee)', 'deduction', true, false, false, 101),
  ('PPh21', 'PPh Pasal 21', 'deduction', false, false, false, 102),
  ('POTONGAN_LAIN', 'Potongan Lain-lain', 'deduction', false, false, false, 103)
) AS components(comp_code, comp_name, c_type, fixed, taxable, bpjs_base, d_order)
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- =====================================================
-- 5. Job Grades & Salary Matrix
-- =====================================================

INSERT INTO public.hr_job_grades (entity_id, code, name, level, salary_min, salary_mid, salary_max, leave_quota, is_overtime_eligible)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  g_code,
  g_name,
  g_level,
  g_min,
  g_mid,
  g_max,
  leave_q,
  ot_eligible
FROM (VALUES
  ('D1', 'Director', 1, 25000000.00, 35000000.00, 50000000.00, 15, false),
  ('M1', 'Manager', 2, 15000000.00, 20000000.00, 30000000.00, 14, false),
  ('M2', 'Senior Manager', 3, 12000000.00, 15000000.00, 20000000.00, 14, false),
  ('S1', 'Senior Staff', 4, 8000000.00, 10000000.00, 14000000.00, 12, true),
  ('S2', 'Staff', 5, 5500000.00, 7000000.00, 9000000.00, 12, true),
  ('S3', 'Junior Staff', 6, 4500000.00, 5000000.00, 6000000.00, 12, true)
) AS grades(g_code, g_name, g_level, g_min, g_mid, g_max, leave_q, ot_eligible)
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- Salary matrix steps (example for S2 - Staff grade)
INSERT INTO public.hr_salary_matrix (entity_id, grade_id, step, amount, effective_date)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  (SELECT id FROM hr_job_grades WHERE code = 'S2' LIMIT 1) as grade_id,
  step_num,
  amt,
  '2026-01-01'
FROM (VALUES
  (1, 5500000.00),
  (2, 6000000.00),
  (3, 6500000.00),
  (4, 7000000.00),
  (5, 7500000.00)
) AS steps(step_num, amt)
ON CONFLICT (tenant_id, entity_id, grade_id, step, effective_date) DO NOTHING;

-- =====================================================
-- 6. Work Areas
-- =====================================================

INSERT INTO public.hr_work_areas (entity_id, branch_id, code, name, area_type, address_line1, city_id)
SELECT 
  '20000000-0000-0000-0000-000000000001' as entity_id,
  '10000000-0000-0000-0000-000000000001' as branch_id, -- Head Office
  area_code,
  area_name,
  a_type,
  addr,
  (SELECT id FROM regions WHERE name = 'Jakarta Selatan' LIMIT 1) as city_id
FROM (VALUES
  ('OFF-HO', 'Head Office', 'office', 'Jl. Raya TB Simatupang No. 1'),
  ('WH-01', 'Warehouse 1', 'warehouse', 'Jl. Industri Raya No. 5'),
  ('SITE-A', 'Project Site A', 'site', 'Lokasi Proyek BSD')
) AS areas(area_code, area_name, a_type, addr)
ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;

-- =====================================================
-- SEED DATA COMPLETE!
-- =====================================================
-- All HC Master Data tables now have sample data for testing
-- Total: 11 FASE-4.0 tables + 4 FASE-0 tables = 15 tables
-- =====================================================


