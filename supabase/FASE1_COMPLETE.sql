-- =====================================================
-- W.SYSTEM FASE-1: Q2C MVP COMPLETE SCHEMA
-- =====================================================
-- Generated: 2026-04-19 00:30 WIB
-- Total Migrations: 18 files
-- Modules: Core, Identity, Customer, CRM, Sales, Finance, Ticket
-- =====================================================



-- =====================================================
-- FILE: 20260418_001_create_core_tenants.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-0: Core Foundation - Tenants
     3|-- =====================================================
     4|-- Multi-tenant isolation - root of all tenant-scoped data
     5|-- =====================================================
     6|
     7|-- 1.1 Tenants Table (companies/organizations)
     8|CREATE TABLE IF NOT EXISTS public.tenants (
     9|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    10|  name text NOT NULL,
    11|  slug text UNIQUE NOT NULL, -- subdomain: acme.wsystem.app
    12|  legal_name text, -- PT/CV name for legal documents
    13|  tax_id text, -- NPWP
    14|  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'archived')),
    15|  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    16|  settings jsonb DEFAULT '{}'::jsonb, -- tenant-specific configs
    17|  created_at timestamptz DEFAULT now(),
    18|  updated_at timestamptz DEFAULT now()
    19|);
    20|
    21|-- 1.2 Indexes
    22|CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
    23|CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
    24|CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);
    25|
    26|-- 1.3 Enable RLS
    27|ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
    28|
    29|-- 1.4 RLS Policies
    30|-- Users can view tenants they belong to
    31|DROP POLICY IF EXISTS "Users can view own tenants" ON public.tenants;
    32|CREATE POLICY "Users can view own tenants"
    33|  ON public.tenants FOR SELECT
    34|  USING (
    35|    EXISTS (
    36|      SELECT 1 FROM public.user_profiles up
    37|      WHERE up.tenant_id = tenants.id AND up.user_id = auth.uid()
    38|    )
    39|  );
    40|
    41|-- Super admin can view all tenants
    42|DROP POLICY IF EXISTS "Super admin can view all tenants" ON public.tenants;
    43|CREATE POLICY "Super admin can view all tenants"
    44|  ON public.tenants FOR SELECT
    45|  USING (
    46|    EXISTS (
    47|      SELECT 1 FROM public.user_profiles up
    48|      WHERE up.user_id = auth.uid() AND up.role_id IN (
    49|        SELECT id FROM public.roles WHERE name = 'super_admin'
    50|      )
    51|    )
    52|  );
    53|
    54|-- Super admin can manage all tenants
    55|DROP POLICY IF EXISTS "Super admin can manage all tenants" ON public.tenants;
    56|CREATE POLICY "Super admin can manage all tenants"
    57|  ON public.tenants FOR ALL
    58|  USING (
    59|    EXISTS (
    60|      SELECT 1 FROM public.user_profiles up
    61|      WHERE up.user_id = auth.uid() AND up.role_id IN (
    62|        SELECT id FROM public.roles WHERE name = 'super_admin'
    63|      )
    64|    )
    65|  );
    66|
    67|-- 1.5 Trigger: Auto-update updated_at
    68|DROP TRIGGER IF EXISTS tenants_updated_at ON tenants;
    69|CREATE TRIGGER tenants_updated_at
    70|  BEFORE UPDATE ON tenants
    71|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    72|
    73|-- =====================================================
    74|-- SETUP COMPLETE!
    75|-- =====================================================
    76|


-- =====================================================
-- FILE: 20260418_002_create_core_entities.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-0: Core Foundation - Entities
     3|-- =====================================================
     4|-- Business entities (holding companies, subsidiaries, divisions)
     5|-- Support multi-company structure under single tenant
     6|-- =====================================================
     7|
     8|-- 2.1 Entities Table
     9|CREATE TABLE IF NOT EXISTS public.entities (
    10|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    11|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    12|  name text NOT NULL,
    13|  code text NOT NULL, -- e.g., "HOLDING", "SUB-A", "DIV-1"
    14|  type text NOT NULL DEFAULT 'division' CHECK (type IN ('holding', 'subsidiary', 'division', 'department')),
    15|  parent_id uuid REFERENCES public.entities(id) ON DELETE SET NULL, -- hierarchical structure
    16|  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    17|  settings jsonb DEFAULT '{}'::jsonb, -- entity-specific configs
    18|  created_at timestamptz DEFAULT now(),
    19|  updated_at timestamptz DEFAULT now(),
    20|  UNIQUE(tenant_id, code) -- one code per tenant
    21|);
    22|
    23|-- 2.2 Indexes
    24|CREATE INDEX IF NOT EXISTS idx_entities_tenant ON entities(tenant_id);
    25|CREATE INDEX IF NOT EXISTS idx_entities_parent ON entities(parent_id);
    26|CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
    27|CREATE INDEX IF NOT EXISTS idx_entities_status ON entities(status);
    28|
    29|-- 2.3 Enable RLS
    30|ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
    31|
    32|-- 2.4 RLS Policies
    33|-- Users can view entities in their tenant
    34|DROP POLICY IF EXISTS "Users can view tenant entities" ON public.entities;
    35|CREATE POLICY "Users can view tenant entities"
    36|  ON public.entities FOR SELECT
    37|  USING (
    38|    EXISTS (
    39|      SELECT 1 FROM public.user_profiles up
    40|      WHERE up.tenant_id = entities.tenant_id AND up.user_id = auth.uid()
    41|    )
    42|  );
    43|
    44|-- HR Admin + Super Admin can manage entities
    45|DROP POLICY IF EXISTS "HR admin can manage entities" ON public.entities;
    46|CREATE POLICY "HR admin can manage entities"
    47|  ON public.entities FOR ALL
    48|  USING (
    49|    EXISTS (
    50|      SELECT 1 FROM public.user_profiles up
    51|      JOIN public.roles r ON up.role_id = r.id
    52|      WHERE up.tenant_id = entities.tenant_id
    53|      AND up.user_id = auth.uid()
    54|      AND r.name IN ('hr_admin', 'super_admin')
    55|    )
    56|  );
    57|
    58|-- 2.5 Trigger: Auto-update updated_at
    59|DROP TRIGGER IF EXISTS entities_updated_at ON entities;
    60|CREATE TRIGGER entities_updated_at
    61|  BEFORE UPDATE ON entities
    62|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    63|
    64|-- =====================================================
    65|-- SETUP COMPLETE!
    66|-- =====================================================
    67|


-- =====================================================
-- FILE: 20260418_003_create_core_branches.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-0: Core Foundation - Branches
     3|-- =====================================================
     4|-- Physical locations/offices under entities
     5|-- Support multi-location operations
     6|-- =====================================================
     7|
     8|-- 3.1 Branches Table
     9|CREATE TABLE IF NOT EXISTS public.branches (
    10|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    11|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    12|  entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL, -- nullable for tenant-level branches
    13|  name text NOT NULL, -- e.g., "Jakarta HQ", "Surabaya Office"
    14|  code text NOT NULL, -- e.g., "JKT-01", "SBY-01"
    15|  address text,
    16|  city_id uuid, -- reference to regions (will be created later)
    17|  province text,
    18|  country text DEFAULT 'Indonesia',
    19|  postal_code text,
    20|  phone text,
    21|  email text,
    22|  is_headquarters boolean DEFAULT false,
    23|  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    24|  settings jsonb DEFAULT '{}'::jsonb, -- branch-specific configs (timezone, working_hours, etc.)
    25|  created_at timestamptz DEFAULT now(),
    26|  updated_at timestamptz DEFAULT now(),
    27|  UNIQUE(tenant_id, code) -- one code per tenant
    28|);
    29|
    30|-- 3.2 Indexes
    31|CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
    32|CREATE INDEX IF NOT EXISTS idx_branches_entity ON branches(entity_id);
    33|CREATE INDEX IF NOT EXISTS idx_branches_city ON branches(city_id);
    34|CREATE INDEX IF NOT EXISTS idx_branches_status ON branches(status);
    35|CREATE INDEX IF NOT EXISTS idx_branches_hq ON branches(is_headquarters);
    36|
    37|-- 3.3 Enable RLS
    38|ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
    39|
    40|-- 3.4 RLS Policies
    41|-- Users can view branches in their tenant
    42|DROP POLICY IF EXISTS "Users can view tenant branches" ON public.branches;
    43|CREATE POLICY "Users can view tenant branches"
    44|  ON public.branches FOR SELECT
    45|  USING (
    46|    EXISTS (
    47|      SELECT 1 FROM public.user_profiles up
    48|      WHERE up.tenant_id = branches.tenant_id AND up.user_id = auth.uid()
    49|    )
    50|  );
    51|
    52|-- HR Admin + Super Admin can manage branches
    53|DROP POLICY IF EXISTS "HR admin can manage branches" ON public.branches;
    54|CREATE POLICY "HR admin can manage branches"
    55|  ON public.branches FOR ALL
    56|  USING (
    57|    EXISTS (
    58|      SELECT 1 FROM public.user_profiles up
    59|      JOIN public.roles r ON up.role_id = r.id
    60|      WHERE up.tenant_id = branches.tenant_id
    61|      AND up.user_id = auth.uid()
    62|      AND r.name IN ('hr_admin', 'super_admin')
    63|    )
    64|  );
    65|
    66|-- 3.5 Trigger: Auto-update updated_at
    67|DROP TRIGGER IF EXISTS branches_updated_at ON branches;
    68|CREATE TRIGGER branches_updated_at
    69|  BEFORE UPDATE ON branches
    70|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    71|
    72|-- =====================================================
    73|-- SETUP COMPLETE!
    74|-- =====================================================
    75|


-- =====================================================
-- FILE: 20260418_004_create_core_regions.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-0: Core Foundation - Regions
     3|-- =====================================================
     4|-- Geographic regions (countries, provinces, cities)
     5|-- Used for UMR references, branch locations, tax jurisdictions
     6|-- =====================================================
     7|
     8|-- 4.1 Regions Table (hierarchical: country → province → city)
     9|CREATE TABLE IF NOT EXISTS public.regions (
    10|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    11|  parent_id uuid REFERENCES public.regions(id) ON DELETE CASCADE, -- hierarchical (province → country, city → province)
    12|  type text NOT NULL CHECK (type IN ('country', 'province', 'city', 'district')),
    13|  name text NOT NULL, -- e.g., "Indonesia", "DKI Jakarta", "Jakarta Pusat"
    14|  code text UNIQUE, -- e.g., "ID", "ID-JK", "ID-JK-01" (ISO 3166-2 for provinces)
    15|  metadata jsonb DEFAULT '{}'::jsonb, -- additional data (area_km2, population, etc.)
    16|  created_at timestamptz DEFAULT now()
    17|);
    18|
    19|-- 4.2 Indexes
    20|CREATE INDEX IF NOT EXISTS idx_regions_parent ON regions(parent_id);
    21|CREATE INDEX IF NOT EXISTS idx_regions_type ON regions(type);
    22|CREATE INDEX IF NOT EXISTS idx_regions_code ON regions(code);
    23|CREATE INDEX IF NOT EXISTS idx_regions_name ON regions(name);
    24|
    25|-- 4.3 Enable RLS
    26|ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
    27|
    28|-- 4.4 RLS Policies
    29|-- Everyone (authenticated) can view regions (read-only reference data)
    30|DROP POLICY IF EXISTS "Users can view regions" ON public.regions;
    31|CREATE POLICY "Users can view regions"
    32|  ON public.regions FOR SELECT
    33|  USING (auth.uid() IS NOT NULL);
    34|
    35|-- Super admin can manage regions
    36|DROP POLICY IF EXISTS "Super admin can manage regions" ON public.regions;
    37|CREATE POLICY "Super admin can manage regions"
    38|  ON public.regions FOR ALL
    39|  USING (
    40|    EXISTS (
    41|      SELECT 1 FROM public.user_profiles up
    42|      JOIN public.roles r ON up.role_id = r.id
    43|      WHERE up.user_id = auth.uid() AND r.name = 'super_admin'
    44|    )
    45|  );
    46|
    47|-- =====================================================
    48|-- 4.5 Seed Data: Indonesia Regions
    49|-- =====================================================
    50|
    51|-- Indonesia (Country)
    52|INSERT INTO public.regions (type, name, code)
    53|VALUES ('country', 'Indonesia', 'ID')
    54|ON CONFLICT (code) DO NOTHING;
    55|
    56|-- Provinces (sample - can be expanded)
    57|INSERT INTO public.regions (parent_id, type, name, code)
    58|SELECT 
    59|  (SELECT id FROM regions WHERE code = 'ID'),
    60|  'province',
    61|  province_name,
    62|  province_code
    63|FROM (VALUES
    64|  ('DKI Jakarta', 'ID-JK'),
    65|  ('Jawa Barat', 'ID-JB'),
    66|  ('Jawa Tengah', 'ID-JT'),
    67|  ('Jawa Timur', 'ID-JI'),
    68|  ('Banten', 'ID-BT'),
    69|  ('Bali', 'ID-BA'),
    70|  ('Sulawesi Selatan', 'ID-SN'),
    71|  ('Sumatera Utara', 'ID-SU'),
    72|  ('Sumatera Barat', 'ID-SB'),
    73|  ('Jambi', 'ID-JA')
    74|) AS provinces(province_name, province_code)
    75|ON CONFLICT (code) DO NOTHING;
    76|
    77|-- Cities (major cities for UMR)
    78|INSERT INTO public.regions (parent_id, type, name, code)
    79|SELECT 
    80|  (SELECT id FROM regions WHERE code = parent_code),
    81|  'city',
    82|  city_name,
    83|  city_code
    84|FROM (VALUES
    85|  -- DKI Jakarta
    86|  ('ID-JK', 'Jakarta Pusat', 'ID-JK-01'),
    87|  ('ID-JK', 'Jakarta Utara', 'ID-JK-02'),
    88|  ('ID-JK', 'Jakarta Barat', 'ID-JK-03'),
    89|  ('ID-JK', 'Jakarta Selatan', 'ID-JK-04'),
    90|  ('ID-JK', 'Jakarta Timur', 'ID-JK-05'),
    91|  -- Jawa Barat
    92|  ('ID-JB', 'Bandung', 'ID-JB-01'),
    93|  ('ID-JB', 'Bekasi', 'ID-JB-02'),
    94|  ('ID-JB', 'Depok', 'ID-JB-03'),
    95|  ('ID-JB', 'Bogor', 'ID-JB-04'),
    96|  -- Banten
    97|  ('ID-BT', 'Tangerang', 'ID-BT-01'),
    98|  -- Jawa Timur
    99|  ('ID-JI', 'Surabaya', 'ID-JI-01'),
   100|  -- Jawa Tengah
   101|  ('ID-JT', 'Semarang', 'ID-JT-01'),
   102|  -- Bali
   103|  ('ID-BA', 'Denpasar', 'ID-BA-01'),
   104|  -- Sulawesi Selatan
   105|  ('ID-SN', 'Makassar', 'ID-SN-01')
   106|) AS cities(parent_code, city_name, city_code)
   107|ON CONFLICT (code) DO NOTHING;
   108|
   109|-- =====================================================
   110|-- SETUP COMPLETE!
   111|-- =====================================================
   112|-- Regions available:
   113|-- - 1 country (Indonesia)
   114|-- - 10 provinces
   115|-- - 14 major cities
   116|-- =====================================================
   117|


-- =====================================================
-- FILE: 20260418_005_create_identity_profiles.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-0: Core Foundation - Identity (Profiles & Roles)
     3|-- =====================================================
     4|-- User profiles with RBAC + JWT claims for RLS
     5|-- =====================================================
     6|
     7|-- 5.1 Roles Table (static RBAC definitions)
     8|CREATE TABLE IF NOT EXISTS public.roles (
     9|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    10|  name text NOT NULL UNIQUE,
    11|  description text,
    12|  permissions jsonb DEFAULT '[]'::jsonb, -- array of permission strings
    13|  created_at timestamptz DEFAULT now(),
    14|  updated_at timestamptz DEFAULT now()
    15|);
    16|
    17|-- 5.2 Seed default roles
    18|INSERT INTO public.roles (name, description) VALUES
    19|  ('super_admin', 'Full system access across all tenants'),
    20|  ('admin', 'Tenant-level admin with full access'),
    21|  ('marketing', 'Marketing team - leads management'),
    22|  ('marketing_lead', 'Marketing team lead'),
    23|  ('commercial', 'Commercial team - briefs & quotations'),
    24|  ('commercial_director', 'Commercial director - approvals'),
    25|  ('pm', 'Project manager'),
    26|  ('pm_lead', 'Senior project manager'),
    27|  ('developer', 'Development team'),
    28|  ('finance', 'Finance team'),
    29|  ('cfo', 'Chief Financial Officer'),
    30|  ('ceo', 'Chief Executive Officer'),
    31|  ('hr', 'Human Resources'),
    32|  ('client', 'External client - portal access only')
    33|ON CONFLICT (name) DO NOTHING;
    34|
    35|-- 5.3 User Profiles Table (extends auth.users)
    36|CREATE TABLE IF NOT EXISTS public.user_profiles (
    37|  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    38|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    39|  entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
    40|  full_name text NOT NULL,
    41|  email text NOT NULL,
    42|  role_id uuid NOT NULL REFERENCES public.roles(id),
    43|  department text,
    44|  phone text,
    45|  avatar_url text,
    46|  timezone text DEFAULT 'Asia/Jakarta',
    47|  language text DEFAULT 'id',
    48|  preferences jsonb DEFAULT '{}'::jsonb,
    49|  is_active boolean NOT NULL DEFAULT true,
    50|  last_login_at timestamptz,
    51|  created_at timestamptz DEFAULT now(),
    52|  updated_at timestamptz DEFAULT now(),
    53|  deleted_at timestamptz
    54|);
    55|
    56|-- 5.4 Indexes
    57|CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);
    58|CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role_id);
    59|CREATE INDEX IF NOT EXISTS idx_user_profiles_entity ON user_profiles(entity_id);
    60|CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
    61|CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(tenant_id, is_active) WHERE deleted_at IS NULL;
    62|
    63|-- 5.5 Enable RLS
    64|ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
    65|
    66|-- 5.6 RLS Policies
    67|
    68|-- View own profile
    69|DROP POLICY IF EXISTS "view_own_profile" ON public.user_profiles;
    70|CREATE POLICY "view_own_profile"
    71|  ON public.user_profiles FOR SELECT
    72|  TO authenticated
    73|  USING (id = auth.uid());
    74|
    75|-- Update own profile
    76|DROP POLICY IF EXISTS "update_own_profile" ON public.user_profiles;
    77|CREATE POLICY "update_own_profile"
    78|  ON public.user_profiles FOR UPDATE
    79|  TO authenticated
    80|  USING (id = auth.uid())
    81|  WITH CHECK (id = auth.uid() AND tenant_id = (auth.jwt()->>'tenant_id')::uuid);
    82|
    83|-- Admin can manage all profiles in tenant
    84|DROP POLICY IF EXISTS "admin_manage_profiles" ON public.user_profiles;
    85|CREATE POLICY "admin_manage_profiles"
    86|  ON public.user_profiles FOR ALL
    87|  TO authenticated
    88|  USING (
    89|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    90|    AND EXISTS (
    91|      SELECT 1 FROM public.user_profiles up
    92|      JOIN public.roles r ON up.role_id = r.id
    93|      WHERE up.id = auth.uid()
    94|      AND r.name IN ('admin', 'super_admin')
    95|    )
    96|  )
    97|  WITH CHECK (
    98|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    99|    AND EXISTS (
   100|      SELECT 1 FROM public.user_profiles up
   101|      JOIN public.roles r ON up.role_id = r.id
   102|      WHERE up.id = auth.uid()
   103|      AND r.name IN ('admin', 'super_admin')
   104|    )
   105|  );
   106|
   107|-- Privileged roles can view tenant profiles (for assignment UI)
   108|DROP POLICY IF EXISTS "privileged_view_tenant_profiles" ON public.user_profiles;
   109|CREATE POLICY "privileged_view_tenant_profiles"
   110|  ON public.user_profiles FOR SELECT
   111|  TO authenticated
   112|  USING (
   113|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   114|    AND EXISTS (
   115|      SELECT 1 FROM public.user_profiles up
   116|      JOIN public.roles r ON up.role_id = r.id
   117|      WHERE up.id = auth.uid()
   118|      AND r.name IN ('admin', 'commercial', 'commercial_director', 'pm_lead', 'cfo', 'ceo', 'super_admin')
   119|    )
   120|  );
   121|
   122|-- 5.7 Trigger: Auto-update updated_at
   123|DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
   124|CREATE TRIGGER user_profiles_updated_at
   125|  BEFORE UPDATE ON user_profiles
   126|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
   127|
   128|-- 5.8 Function: Get user roles (helper for RLS)
   129|CREATE OR REPLACE FUNCTION public.get_user_roles()
   130|RETURNS TABLE(role_name text) AS $$
   131|BEGIN
   132|  RETURN QUERY
   133|  SELECT r.name
   134|  FROM public.user_profiles up
   135|  JOIN public.roles r ON up.role_id = r.id
   136|  WHERE up.id = auth.uid() AND up.deleted_at IS NULL;
   137|END;
   138|$$ LANGUAGE plpgsql SECURITY DEFINER;
   139|
   140|-- 5.9 Function: Check if user has role
   141|CREATE OR REPLACE FUNCTION public.user_has_role(required_role text)
   142|RETURNS boolean AS $$
   143|BEGIN
   144|  RETURN EXISTS (
   145|    SELECT 1
   146|    FROM public.user_profiles up
   147|    JOIN public.roles r ON up.role_id = r.id
   148|    WHERE up.id = auth.uid()
   149|    AND r.name = required_role
   150|    AND up.deleted_at IS NULL
   151|  );
   152|END;
   153|$$ LANGUAGE plpgsql SECURITY DEFINER;
   154|
   155|-- =====================================================
   156|-- SETUP COMPLETE!
   157|-- =====================================================
   158|


-- =====================================================
-- FILE: 20260418_005_hr_work_shifts_calendars.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-4.0-A: Work Shifts & Calendars
     3|-- =====================================================
     4|-- Multi-shift support + work calendar (holidays, cuti bersama)
     5|-- Reference: hc-master-data-workflow skill
     6|-- =====================================================
     7|
     8|-- 1.1 hr_work_shifts - Shift definitions per entity/branch
     9|CREATE TABLE IF NOT EXISTS public.hr_work_shifts (
    10|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    11|  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    12|  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
    13|  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
    14|  
    15|  name text NOT NULL, -- e.g., "Shift Pagi", "Shift Malam", "Shift Reguler"
    16|  code text NOT NULL, -- e.g., "SHIFT-AM", "SHIFT-PM", "SHIFT-RG"
    17|  
    18|  start_time time NOT NULL, -- e.g., "08:00:00"
    19|  end_time time NOT NULL, -- e.g., "17:00:00"
    20|  
    21|  break_start time, -- e.g., "12:00:00"
    22|  break_end time, -- e.g., "13:00:00"
    23|  break_duration_minutes integer DEFAULT 60,
    24|  
    25|  grace_period_minutes integer DEFAULT 15, -- late tolerance
    26|  is_active boolean DEFAULT true,
    27|  
    28|  -- Inheritance pattern
    29|  is_default boolean DEFAULT false, -- tenant-level default
    30|  
    31|  created_at timestamptz DEFAULT now(),
    32|  updated_at timestamptz DEFAULT now(),
    33|  
    34|  UNIQUE(tenant_id, entity_id, branch_id, code)
    35|);
    36|
    37|CREATE INDEX IF NOT EXISTS idx_hr_work_shifts_tenant ON public.hr_work_shifts(tenant_id);
    38|CREATE INDEX IF NOT EXISTS idx_hr_work_shifts_entity ON public.hr_work_shifts(entity_id);
    39|CREATE INDEX IF NOT EXISTS idx_hr_work_shifts_branch ON public.hr_work_shifts(branch_id);
    40|CREATE INDEX IF NOT EXISTS idx_hr_work_shifts_active ON public.hr_work_shifts(is_active);
    41|
    42|-- Enable RLS
    43|ALTER TABLE public.hr_work_shifts ENABLE ROW LEVEL SECURITY;
    44|
    45|-- RLS Policies
    46|DROP POLICY IF EXISTS "Users can view shifts in their tenant" ON public.hr_work_shifts;
    47|CREATE POLICY "Users can view shifts in their tenant"
    48|  ON public.hr_work_shifts FOR SELECT
    49|  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
    50|
    51|DROP POLICY IF EXISTS "HR admin can manage shifts" ON public.hr_work_shifts;
    52|CREATE POLICY "HR admin can manage shifts"
    53|  ON public.hr_work_shifts FOR ALL
    54|  USING (
    55|    EXISTS (
    56|      SELECT 1 FROM public.user_roles ur
    57|      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    58|    )
    59|  );
    60|
    61|-- Trigger: Auto-update updated_at
    62|DROP TRIGGER IF EXISTS hr_work_shifts_updated_at ON public.hr_work_shifts;
    63|CREATE TRIGGER hr_work_shifts_updated_at
    64|  BEFORE UPDATE ON public.hr_work_shifts
    65|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    66|
    67|-- =====================================================
    68|-- 1.2 hr_work_calendars - Holiday calendar per year
    69|-- =====================================================
    70|CREATE TABLE IF NOT EXISTS public.hr_work_calendars (
    71|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    72|  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    73|  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
    74|  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
    75|  
    76|  year integer NOT NULL CHECK (year >= 2020 AND year <= 2100),
    77|  date date NOT NULL,
    78|  
    79|  name text NOT NULL, -- e.g., "Hari Raya Idul Fitri", "Tahun Baru"
    80|  type text NOT NULL DEFAULT 'national_holiday' CHECK (type IN (
    81|    'national_holiday', -- Libur nasional
    82|    'cuti_bersama', -- Cuti bersama
    83|    'weekend', -- Weekend (auto-generated)
    84|    'company_holiday', -- Libur perusahaan
    85|    'unpaid_leave' -- Cuti tanpa upah
    86|  )),
    87|  
    88|  is_paid boolean DEFAULT true,
    89|  description text,
    90|  
    91|  -- Inheritance pattern
    92|  is_default boolean DEFAULT false,
    93|  
    94|  created_at timestamptz DEFAULT now(),
    95|  
    96|  UNIQUE(tenant_id, entity_id, branch_id, date)
    97|);
    98|
    99|CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_tenant ON public.hr_work_calendars(tenant_id);
   100|CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_entity ON public.hr_work_calendars(entity_id);
   101|CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_branch ON public.hr_work_calendars(branch_id);
   102|CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_year ON public.hr_work_calendars(year);
   103|CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_date ON public.hr_work_calendars(date);
   104|CREATE INDEX IF NOT EXISTS idx_hr_work_calendars_type ON public.hr_work_calendars(type);
   105|
   106|-- Enable RLS
   107|ALTER TABLE public.hr_work_calendars ENABLE ROW LEVEL SECURITY;
   108|
   109|-- RLS Policies
   110|DROP POLICY IF EXISTS "Users can view calendars in their tenant" ON public.hr_work_calendars;
   111|CREATE POLICY "Users can view calendars in their tenant"
   112|  ON public.hr_work_calendars FOR SELECT
   113|  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
   114|
   115|DROP POLICY IF EXISTS "HR admin can manage calendars" ON public.hr_work_calendars;
   116|CREATE POLICY "HR admin can manage calendars"
   117|  ON public.hr_work_calendars FOR ALL
   118|  USING (
   119|    EXISTS (
   120|      SELECT 1 FROM public.user_roles ur
   121|      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
   122|    )
   123|  );
   124|
   125|-- =====================================================
   126|-- SETUP COMPLETE!
   127|-- =====================================================
   128|-- Tables created:
   129|-- - hr_work_shifts (multi-shift per entity/branch)
   130|-- - hr_work_calendars (holiday calendar per year)
   131|-- =====================================================
   132|


-- =====================================================
-- FILE: 20260418_006_create_customer_clients.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-0: Master Data - Customer (Clients & Contacts)
     3|-- =====================================================
     4|-- Client companies and their contact persons
     5|-- =====================================================
     6|
     7|-- 6.1 Clients Table (customer companies)
     8|CREATE TABLE IF NOT EXISTS public.clients (
     9|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    10|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    11|  entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
    12|  name text NOT NULL,
    13|  legal_name text, -- PT/CV name
    14|  tax_id text, -- NPWP
    15|  type text NOT NULL DEFAULT 'prospect' CHECK (type IN ('prospect', 'active', 'inactive', 'blacklisted')),
    16|  tier text NOT NULL DEFAULT 'small' CHECK (tier IN ('enterprise', 'mid', 'small')),
    17|  industry text,
    18|  website text,
    19|  address text,
    20|  city text,
    21|  province text,
    22|  country text DEFAULT 'Indonesia',
    23|  postal_code text,
    24|  phone text,
    25|  email text,
    26|  -- Credit & billing
    27|  credit_limit numeric(20,4) DEFAULT 0,
    28|  payment_terms_days integer DEFAULT 30, -- NET30, NET60, etc.
    29|  currency text DEFAULT 'IDR',
    30|  -- Relationship
    31|  account_manager_id uuid REFERENCES public.user_profiles(id),
    32|  source text CHECK (source IN ('referral', 'digital_ads', 'event', 'partner', 'inbound', 'outbound')),
    33|  -- Metadata
    34|  tags text[],
    35|  notes text,
    36|  settings jsonb DEFAULT '{}'::jsonb,
    37|  -- Audit
    38|  created_at timestamptz DEFAULT now(),
    39|  updated_at timestamptz DEFAULT now(),
    40|  created_by uuid REFERENCES public.user_profiles(id),
    41|  updated_by uuid REFERENCES public.user_profiles(id),
    42|  deleted_at timestamptz
    43|);
    44|
    45|-- 6.2 Indexes
    46|CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);
    47|CREATE INDEX IF NOT EXISTS idx_clients_entity ON clients(entity_id);
    48|CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(tenant_id, type) WHERE deleted_at IS NULL;
    49|CREATE INDEX IF NOT EXISTS idx_clients_tier ON clients(tenant_id, tier);
    50|CREATE INDEX IF NOT EXISTS idx_clients_account_manager ON clients(account_manager_id);
    51|
    52|-- 6.3 Enable RLS
    53|ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
    54|
    55|-- 6.4 RLS Policies
    56|
    57|-- Marketing: read clients (for lead context)
    58|DROP POLICY IF EXISTS "marketing_read_clients" ON public.clients;
    59|CREATE POLICY "marketing_read_clients"
    60|  ON public.clients FOR SELECT
    61|  TO authenticated
    62|  USING (
    63|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    64|    AND EXISTS (
    65|      SELECT 1 FROM public.user_profiles up
    66|      JOIN public.roles r ON up.role_id = r.id
    67|      WHERE up.id = auth.uid()
    68|      AND r.name IN ('marketing', 'marketing_lead')
    69|    )
    70|  );
    71|
    72|-- Commercial: full access to clients
    73|DROP POLICY IF EXISTS "commercial_manage_clients" ON public.clients;
    74|CREATE POLICY "commercial_manage_clients"
    75|  ON public.clients FOR ALL
    76|  TO authenticated
    77|  USING (
    78|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    79|    AND EXISTS (
    80|      SELECT 1 FROM public.user_profiles up
    81|      JOIN public.roles r ON up.role_id = r.id
    82|      WHERE up.id = auth.uid()
    83|      AND r.name IN ('commercial', 'commercial_director', 'admin', 'super_admin')
    84|    )
    85|  )
    86|  WITH CHECK (
    87|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    88|    AND EXISTS (
    89|      SELECT 1 FROM public.user_profiles up
    90|      JOIN public.roles r ON up.role_id = r.id
    91|      WHERE up.id = auth.uid()
    92|      AND r.name IN ('commercial', 'commercial_director', 'admin', 'super_admin')
    93|    )
    94|  );
    95|
    96|-- Finance: read clients (for billing)
    97|DROP POLICY IF EXISTS "finance_read_clients" ON public.clients;
    98|CREATE POLICY "finance_read_clients"
    99|  ON public.clients FOR SELECT
   100|  TO authenticated
   101|  USING (
   102|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   103|    AND EXISTS (
   104|      SELECT 1 FROM public.user_profiles up
   105|      JOIN public.roles r ON up.role_id = r.id
   106|      WHERE up.id = auth.uid()
   107|      AND r.name IN ('finance', 'cfo')
   108|    )
   109|  );
   110|
   111|-- PM: read clients (for project context)
   112|DROP POLICY IF EXISTS "pm_read_clients" ON public.clients;
   113|CREATE POLICY "pm_read_clients"
   114|  ON public.clients FOR SELECT
   115|  TO authenticated
   116|  USING (
   117|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   118|    AND EXISTS (
   119|      SELECT 1 FROM public.user_profiles up
   120|      JOIN public.roles r ON up.role_id = r.id
   121|      WHERE up.id = auth.uid()
   122|      AND r.name IN ('pm', 'pm_lead')
   123|    )
   124|  );
   125|
   126|-- Client: read own client record only
   127|DROP POLICY IF EXISTS "client_read_own" ON public.clients;
   128|CREATE POLICY "client_read_own"
   129|  ON public.clients FOR SELECT
   130|  TO authenticated
   131|  USING (
   132|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   133|    AND auth.jwt()->>'role' = 'client'
   134|    AND id = (auth.jwt()->>'client_id')::uuid
   135|  );
   136|
   137|-- 6.5 Contacts Table (contact persons at client companies)
   138|CREATE TABLE IF NOT EXISTS public.contacts (
   139|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   140|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
   141|  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
   142|  name text NOT NULL,
   143|  title text, -- job title
   144|  email text,
   145|  phone text,
   146|  mobile text,
   147|  is_primary boolean NOT NULL DEFAULT false,
   148|  is_decision_maker boolean NOT NULL DEFAULT false,
   149|  department text,
   150|  notes text,
   151|  tags text[],
   152|  preferences jsonb DEFAULT '{}'::jsonb,
   153|  -- Audit
   154|  created_at timestamptz DEFAULT now(),
   155|  updated_at timestamptz DEFAULT now(),
   156|  created_by uuid REFERENCES public.user_profiles(id),
   157|  updated_by uuid REFERENCES public.user_profiles(id),
   158|  deleted_at timestamptz
   159|);
   160|
   161|-- 6.6 Indexes
   162|CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
   163|CREATE INDEX IF NOT EXISTS idx_contacts_client ON contacts(client_id);
   164|CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
   165|CREATE INDEX IF NOT EXISTS idx_contacts_primary ON contacts(client_id, is_primary) WHERE deleted_at IS NULL;
   166|
   167|-- 6.7 Enable RLS
   168|ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
   169|
   170|-- 6.8 RLS Policies
   171|
   172|-- Marketing: read contacts
   173|DROP POLICY IF EXISTS "marketing_read_contacts" ON public.contacts;
   174|CREATE POLICY "marketing_read_contacts"
   175|  ON public.contacts FOR SELECT
   176|  TO authenticated
   177|  USING (
   178|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   179|    AND EXISTS (
   180|      SELECT 1 FROM public.user_profiles up
   181|      JOIN public.roles r ON up.role_id = r.id
   182|      WHERE up.id = auth.uid()
   183|      AND r.name IN ('marketing', 'marketing_lead')
   184|    )
   185|  );
   186|
   187|-- Commercial: full access to contacts
   188|DROP POLICY IF EXISTS "commercial_manage_contacts" ON public.contacts;
   189|CREATE POLICY "commercial_manage_contacts"
   190|  ON public.contacts FOR ALL
   191|  TO authenticated
   192|  USING (
   193|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   194|    AND EXISTS (
   195|      SELECT 1 FROM public.user_profiles up
   196|      JOIN public.roles r ON up.role_id = r.id
   197|      WHERE up.id = auth.uid()
   198|      AND r.name IN ('commercial', 'commercial_director', 'admin', 'super_admin')
   199|    )
   200|  )
   201|  WITH CHECK (
   202|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   203|    AND EXISTS (
   204|      SELECT 1 FROM public.user_profiles up
   205|      JOIN public.roles r ON up.role_id = r.id
   206|      WHERE up.id = auth.uid()
   207|      AND r.name IN ('commercial', 'commercial_director', 'admin', 'super_admin')
   208|    )
   209|  );
   210|
   211|-- Finance: read contacts
   212|DROP POLICY IF EXISTS "finance_read_contacts" ON public.contacts;
   213|CREATE POLICY "finance_read_contacts"
   214|  ON public.contacts FOR SELECT
   215|  TO authenticated
   216|  USING (
   217|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   218|    AND EXISTS (
   219|      SELECT 1 FROM public.user_profiles up
   220|      JOIN public.roles r ON up.role_id = r.id
   221|      WHERE up.id = auth.uid()
   222|      AND r.name IN ('finance', 'cfo')
   223|    )
   224|  );
   225|
   226|-- PM: read contacts
   227|DROP POLICY IF EXISTS "pm_read_contacts" ON public.contacts;
   228|CREATE POLICY "pm_read_contacts"
   229|  ON public.contacts FOR SELECT
   230|  TO authenticated
   231|  USING (
   232|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   233|    AND EXISTS (
   234|      SELECT 1 FROM public.user_profiles up
   235|      JOIN public.roles r ON up.role_id = r.id
   236|      WHERE up.id = auth.uid()
   237|      AND r.name IN ('pm', 'pm_lead')
   238|    )
   239|  );
   240|
   241|-- 6.9 Trigger: Auto-update updated_at for clients
   242|DROP TRIGGER IF EXISTS clients_updated_at ON clients;
   243|CREATE TRIGGER clients_updated_at
   244|  BEFORE UPDATE ON clients
   245|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
   246|
   247|-- 6.10 Trigger: Auto-update updated_at for contacts
   248|DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
   249|CREATE TRIGGER contacts_updated_at
   250|  BEFORE UPDATE ON contacts
   251|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
   252|
   253|-- =====================================================
   254|-- SETUP COMPLETE!
   255|-- =====================================================
   256|


-- =====================================================
-- FILE: 20260418_006_hr_city_umr.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-4.0-B: City UMR (Upah Minimum Regional)
     3|-- =====================================================
     4|-- UMR per city per year - reference for salary calculation
     5|-- Requires: regions table (FASE-0) ✅
     6|-- =====================================================
     7|
     8|CREATE TABLE IF NOT EXISTS public.hr_city_umr (
     9|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    10|  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    11|  
    12|  -- Reference to regions table (city)
    13|  city_id uuid REFERENCES public.regions(id) ON DELETE CASCADE NOT NULL,
    14|  
    15|  year integer NOT NULL CHECK (year >= 2020 AND year <= 2100),
    16|  
    17|  umr_amount numeric(20, 4) NOT NULL CHECK (umr_amount >= 0), -- e.g., 5067315.0000
    18|  effective_date date NOT NULL, -- e.g., "2025-01-01"
    19|  
    20|  source text, -- e.g., "Per gubernur DKI Jakarta No. XXX/2024"
    21|  notes text,
    22|  
    23|  created_at timestamptz DEFAULT now(),
    24|  updated_at timestamptz DEFAULT now(),
    25|  
    26|  -- One UMR per city per year per tenant
    27|  UNIQUE(tenant_id, city_id, year)
    28|);
    29|
    30|CREATE INDEX IF NOT EXISTS idx_hr_city_umr_tenant ON public.hr_city_umr(tenant_id);
    31|CREATE INDEX IF NOT EXISTS idx_hr_city_umr_city ON public.hr_city_umr(city_id);
    32|CREATE INDEX IF NOT EXISTS idx_hr_city_umr_year ON public.hr_city_umr(year);
    33|
    34|-- Enable RLS
    35|ALTER TABLE public.hr_city_umr ENABLE ROW LEVEL SECURITY;
    36|
    37|-- RLS Policies
    38|DROP POLICY IF EXISTS "Users can view UMR in their tenant" ON public.hr_city_umr;
    39|CREATE POLICY "Users can view UMR in their tenant"
    40|  ON public.hr_city_umr FOR SELECT
    41|  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
    42|
    43|DROP POLICY IF EXISTS "HR admin can manage UMR" ON public.hr_city_umr;
    44|CREATE POLICY "HR admin can manage UMR"
    45|  ON public.hr_city_umr FOR ALL
    46|  USING (
    47|    EXISTS (
    48|      SELECT 1 FROM public.user_roles ur
    49|      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    50|    )
    51|  );
    52|
    53|-- Trigger: Auto-update updated_at
    54|DROP TRIGGER IF EXISTS hr_city_umr_updated_at ON public.hr_city_umr;
    55|CREATE TRIGGER hr_city_umr_updated_at
    56|  BEFORE UPDATE ON public.hr_city_umr
    57|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    58|
    59|-- =====================================================
    60|-- Seed Data: UMR 2025 for major cities (sample values)
    61|-- Source: Per gubernur respective provinces 2024
    62|-- =====================================================
    63|
    64|INSERT INTO public.hr_city_umr (city_id, year, umr_amount, effective_date, source)
    65|SELECT 
    66|  r.id as city_id,
    67|  2025 as year,
    68|  umr_value,
    69|  '2025-01-01' as effective_date,
    70|  source_text
    71|FROM (VALUES
    72|  -- DKI Jakarta (highest UMR)
    73|  ('Jakarta Pusat', 5067315.00, 'Pergub DKI Jakarta No. 121/2024'),
    74|  ('Jakarta Utara', 5067315.00, 'Pergub DKI Jakarta No. 121/2024'),
    75|  ('Jakarta Barat', 5067315.00, 'Pergub DKI Jakarta No. 121/2024'),
    76|  ('Jakarta Selatan', 5067315.00, 'Pergub DKI Jakarta No. 121/2024'),
    77|  ('Jakarta Timur', 5067315.00, 'Pergub DKI Jakarta No. 121/2024'),
    78|  
    79|  -- Jawa Barat
    80|  ('Bandung', 3285000.00, 'Pergub Jawa Barat No. 88/2024'),
    81|  ('Bekasi', 5239093.00, 'Pergub Jawa Barat No. 88/2024'),
    82|  ('Depok', 4902021.00, 'Pergub Jawa Barat No. 88/2024'),
    83|  ('Bogor', 4902021.00, 'Pergub Jawa Barat No. 88/2024'),
    84|  
    85|  -- Banten
    86|  ('Tangerang', 4958609.00, 'Pergub Banten No. 69/2024'),
    87|  
    88|  -- Jawa Timur
    89|  ('Surabaya', 4569425.00, 'Pergub Jawa Timur No. 44/2024'),
    90|  
    91|  -- Jawa Tengah
    92|  ('Semarang', 3376000.00, 'Pergub Jawa Tengah No. 66/2024')
    93|) AS umr_data(city_name, umr_value, source_text)
    94|JOIN public.regions r ON r.city_name = umr_data.city_name AND r.type = 'city'
    95|ON CONFLICT (tenant_id, city_id, year) DO NOTHING;
    96|
    97|-- Note: Above insert will not insert yet because tenant_id is required
    98|-- Run this after creating a tenant, or use:
    99|-- INSERT INTO public.hr_city_umr (tenant_id, city_id, year, umr_amount, effective_date, source)
   100|-- VALUES ('00000000-0000-0000-0000-000000000001', <city_id>, 2025, <amount>, '2025-01-01', '<source>');
   101|
   102|-- =====================================================
   103|-- SETUP COMPLETE!
   104|-- =====================================================
   105|-- hr_city_umr ready for UMR configuration per city/year
   106|-- =====================================================
   107|


-- =====================================================
-- FILE: 20260418_007_create_crm_leads.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-1: CRM Module (Leads Management)
     3|-- =====================================================
     4|-- Lead pipeline with scoring & SLA tracking
     5|-- Based on USER_STORIES v3.0 § 2.2 (US-Q2C-002)
     6|-- =====================================================
     7|
     8|-- 7.1 Scoring Rules Table (configurable lead scoring)
     9|CREATE TABLE IF NOT EXISTS public.scoring_rules (
    10|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    11|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    12|  component text NOT NULL CHECK (component IN (
    13|    'budget_disclosed', 'authority_level', 'need_definition', 
    14|    'timeline', 'engagement_score'
    15|  )),
    16|  weight integer NOT NULL CHECK (weight BETWEEN 0 AND 100),
    17|  rules jsonb NOT NULL, -- scoring mapping, e.g. {"unknown":0,"range":15,"exact":25}
    18|  is_active boolean NOT NULL DEFAULT true,
    19|  created_at timestamptz DEFAULT now(),
    20|  updated_at timestamptz DEFAULT now()
    21|);
    22|
    23|-- 7.2 Seed default scoring rules (per USER_STORIES v3.0)
    24|INSERT INTO public.scoring_rules (tenant_id, component, weight, rules) 
    25|SELECT 
    26|  t.id,
    27|  sr.component,
    28|  sr.weight,
    29|  sr.rules
    30|FROM public.tenants t
    31|CROSS JOIN (
    32|  VALUES 
    33|    ('budget_disclosed', 25, '{"unknown":0,"range":15,"exact":25}'::jsonb),
    34|    ('authority_level', 25, '{"influencer":5,"manager":15,"c_level":25}'::jsonb),
    35|    ('need_definition', 20, '{"scale":"0-20"}'::jsonb),
    36|    ('timeline', 15, '{"unknown":0,"within_6mo":8,"within_3mo":15}'::jsonb),
    37|    ('engagement_score', 15, '{"scale":"0-15"}'::jsonb)
    38|) AS sr(component, weight, rules)
    39|ON CONFLICT DO NOTHING;
    40|
    41|-- 7.3 SLA Configs Table (stage transition timelines)
    42|CREATE TABLE IF NOT EXISTS public.sla_configs (
    43|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    44|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    45|  stage_from text NOT NULL CHECK (stage_from IN ('cold', 'warm', 'hot')),
    46|  stage_to text NOT NULL CHECK (stage_to IN ('warm', 'hot', 'deal')),
    47|  duration_hours integer NOT NULL,
    48|  escalation_role text, -- role to notify on breach
    49|  is_active boolean NOT NULL DEFAULT true,
    50|  created_at timestamptz DEFAULT now(),
    51|  updated_at timestamptz DEFAULT now()
    52|);
    53|
    54|-- 7.4 Seed default SLA configs (per USER_STORIES v3.0)
    55|INSERT INTO public.sla_configs (tenant_id, stage_from, stage_to, duration_hours, escalation_role)
    56|SELECT 
    57|  t.id,
    58|  cfg.stage_from,
    59|  cfg.stage_to,
    60|  cfg.duration_hours,
    61|  cfg.escalation_role
    62|FROM public.tenants t
    63|CROSS JOIN (
    64|  VALUES 
    65|    ('cold', 'warm', 168, 'marketing_lead'), -- 7 days
    66|    ('warm', 'hot', 336, 'commercial_director'), -- 14 days
    67|    ('hot', 'deal', 720, 'commercial_director') -- 30 days
    68|) AS cfg(stage_from, stage_to, duration_hours, escalation_role)
    69|ON CONFLICT DO NOTHING;
    70|
    71|-- 7.5 Leads Table (core CRM entity)
    72|CREATE TABLE IF NOT EXISTS public.leads (
    73|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    74|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    75|  client_id uuid REFERENCES public.clients(id),
    76|  entity_id uuid REFERENCES public.entities(id),
    77|  
    78|  -- Basic info
    79|  name text NOT NULL,
    80|  contact_email text,
    81|  contact_phone text,
    82|  company_name text,
    83|  job_title text,
    84|  
    85|  -- Source tracking
    86|  source text NOT NULL CHECK (source IN (
    87|    'referral', 'digital_ads', 'event', 'partner', 'inbound', 'outbound'
    88|  )),
    89|  utm_source text,
    90|  utm_medium text,
    91|  utm_campaign text,
    92|  referring_client_id uuid REFERENCES public.clients(id),
    93|  event_id text,
    94|  
    95|  -- Scoring components (per USER_STORIES v3.0 § 2.2)
    96|  budget_disclosed text CHECK (budget_disclosed IN ('unknown', 'range', 'exact')),
    97|  authority_level text CHECK (authority_level IN ('influencer', 'manager', 'c_level')),
    98|  need_definition integer CHECK (need_definition BETWEEN 0 AND 20),
    99|  timeline text CHECK (timeline IN ('unknown', 'within_6mo', 'within_3mo')),
   100|  engagement_score integer CHECK (engagement_score BETWEEN 0 AND 15),
   101|  
   102|  -- Computed total score (0-100)
   103|  total_score integer CHECK (total_score BETWEEN 0 AND 100),
   104|  score_calculated_at timestamptz,
   105|  
   106|  -- Pipeline stage
   107|  stage text NOT NULL DEFAULT 'cold' CHECK (stage IN ('cold', 'warm', 'hot', 'deal')),
   108|  stage_entered_at timestamptz NOT NULL DEFAULT now(),
   109|  previous_stage text,
   110|  
   111|  -- SLA tracking
   112|  sla_deadline_at timestamptz,
   113|  sla_breached boolean NOT NULL DEFAULT false,
   114|  sla_breached_at timestamptz,
   115|  last_activity_at timestamptz,
   116|  
   117|  -- Ownership
   118|  current_pic_id uuid NOT NULL REFERENCES public.user_profiles(id),
   119|  marketing_pic_id uuid REFERENCES public.user_profiles(id),
   120|  commercial_pic_id uuid REFERENCES public.user_profiles(id),
   121|  
   122|  -- Metadata
   123|  tags text[],
   124|  notes text,
   125|  custom_fields jsonb DEFAULT '{}'::jsonb,
   126|  
   127|  -- Audit
   128|  created_at timestamptz NOT NULL DEFAULT now(),
   129|  updated_at timestamptz NOT NULL DEFAULT now(),
   130|  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
   131|  updated_by uuid REFERENCES public.user_profiles(id),
   132|  deleted_at timestamptz
   133|);
   134|
   135|-- 7.6 Indexes
   136|CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
   137|CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(tenant_id, stage) WHERE deleted_at IS NULL;
   138|CREATE INDEX IF NOT EXISTS idx_leads_sla ON leads(sla_deadline_at) 
   139|  WHERE sla_breached = false AND deleted_at IS NULL;
   140|CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(tenant_id, total_score) WHERE deleted_at IS NULL;
   141|CREATE INDEX IF NOT EXISTS idx_leads_pic ON leads(current_pic_id);
   142|CREATE INDEX IF NOT EXISTS idx_leads_client ON leads(client_id);
   143|
   144|-- 7.7 Enable RLS
   145|ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
   146|
   147|-- 7.8 RLS Policies
   148|
   149|-- Marketing: full access to tenant's leads
   150|DROP POLICY IF EXISTS "marketing_manage_leads" ON public.leads;
   151|CREATE POLICY "marketing_manage_leads"
   152|  ON public.leads FOR ALL
   153|  TO authenticated
   154|  USING (
   155|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   156|    AND EXISTS (
   157|      SELECT 1 FROM public.user_profiles up
   158|      JOIN public.roles r ON up.role_id = r.id
   159|      WHERE up.id = auth.uid()
   160|      AND r.name IN ('marketing', 'marketing_lead', 'admin', 'super_admin')
   161|    )
   162|  )
   163|  WITH CHECK (
   164|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   165|    AND EXISTS (
   166|      SELECT 1 FROM public.user_profiles up
   167|      JOIN public.roles r ON up.role_id = r.id
   168|      WHERE up.id = auth.uid()
   169|      AND r.name IN ('marketing', 'marketing_lead', 'admin', 'super_admin')
   170|    )
   171|  );
   172|
   173|-- Commercial: read all tenant leads (for handover context)
   174|DROP POLICY IF EXISTS "commercial_read_leads" ON public.leads;
   175|CREATE POLICY "commercial_read_leads"
   176|  ON public.leads FOR SELECT
   177|  TO authenticated
   178|  USING (
   179|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   180|    AND EXISTS (
   181|      SELECT 1 FROM public.user_profiles up
   182|      JOIN public.roles r ON up.role_id = r.id
   183|      WHERE up.id = auth.uid()
   184|      AND r.name IN ('commercial', 'commercial_director')
   185|    )
   186|  );
   187|
   188|-- Commercial: update leads they own (as commercial_pic)
   189|DROP POLICY IF EXISTS "commercial_update_own_leads" ON public.leads;
   190|CREATE POLICY "commercial_update_own_leads"
   191|  ON public.leads FOR UPDATE
   192|  TO authenticated
   193|  USING (
   194|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   195|    AND commercial_pic_id = auth.uid()
   196|  )
   197|  WITH CHECK (
   198|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   199|    AND commercial_pic_id = auth.uid()
   200|  );
   201|
   202|-- CEO/CFO: read all for strategic visibility
   203|DROP POLICY IF EXISTS "exec_read_leads" ON public.leads;
   204|CREATE POLICY "exec_read_leads"
   205|  ON public.leads FOR SELECT
   206|  TO authenticated
   207|  USING (
   208|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   209|    AND EXISTS (
   210|      SELECT 1 FROM public.user_profiles up
   211|      JOIN public.roles r ON up.role_id = r.id
   212|      WHERE up.id = auth.uid()
   213|      AND r.name IN ('ceo', 'cfo')
   214|    )
   215|  );
   216|
   217|-- PM: read leads converted to deals
   218|DROP POLICY IF EXISTS "pm_read_deal_leads" ON public.leads;
   219|CREATE POLICY "pm_read_deal_leads"
   220|  ON public.leads FOR SELECT
   221|  TO authenticated
   222|  USING (
   223|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   224|    AND stage = 'deal'
   225|    AND EXISTS (
   226|      SELECT 1 FROM public.user_profiles up
   227|      JOIN public.roles r ON up.role_id = r.id
   228|      WHERE up.id = auth.uid()
   229|      AND r.name IN ('pm', 'pm_lead')
   230|    )
   231|  );
   232|
   233|-- 7.9 Lead Activities Table (audit trail of interactions)
   234|CREATE TABLE IF NOT EXISTS public.lead_activities (
   235|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   236|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
   237|  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
   238|  activity_type text NOT NULL CHECK (activity_type IN (
   239|    'call', 'email', 'meeting', 'demo', 'proposal_sent', 
   240|    'follow_up', 'note', 'stage_changed', 'score_updated'
   241|  )),
   242|  subject text,
   243|  description text,
   244|  outcome text,
   245|  next_step text,
   246|  next_step_due_at timestamptz,
   247|  
   248|  -- Metadata
   249|  channel text CHECK (channel IN ('phone', 'email', 'whatsapp', 'zoom', 'in_person')),
   250|  duration_minutes integer,
   251|  recorded_at timestamptz NOT NULL DEFAULT now(),
   252|  
   253|  -- Ownership
   254|  performed_by uuid NOT NULL REFERENCES public.user_profiles(id),
   255|  
   256|  -- Audit
   257|  created_at timestamptz DEFAULT now(),
   258|  updated_at timestamptz DEFAULT now(),
   259|  deleted_at timestamptz
   260|);
   261|
   262|-- 7.10 Indexes
   263|CREATE INDEX IF NOT EXISTS idx_lead_activities_tenant ON lead_activities(tenant_id);
   264|CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
   265|CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
   266|CREATE INDEX IF NOT EXISTS idx_lead_activities_performed_by ON lead_activities(performed_by);
   267|CREATE INDEX IF NOT EXISTS idx_lead_activities_recent ON lead_activities(lead_id, recorded_at DESC);
   268|
   269|-- 7.11 Enable RLS
   270|ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
   271|
   272|-- 7.12 RLS Policies for Lead Activities
   273|
   274|-- Marketing: full access
   275|DROP POLICY IF EXISTS "marketing_manage_lead_activities" ON public.lead_activities;
   276|CREATE POLICY "marketing_manage_lead_activities"
   277|  ON public.lead_activities FOR ALL
   278|  TO authenticated
   279|  USING (
   280|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   281|    AND EXISTS (
   282|      SELECT 1 FROM public.user_profiles up
   283|      JOIN public.roles r ON up.role_id = r.id
   284|      WHERE up.id = auth.uid()
   285|      AND r.name IN ('marketing', 'marketing_lead', 'admin', 'super_admin')
   286|    )
   287|  )
   288|  WITH CHECK (
   289|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   290|    AND EXISTS (
   291|      SELECT 1 FROM public.user_profiles up
   292|      JOIN public.roles r ON up.role_id = r.id
   293|      WHERE up.id = auth.uid()
   294|      AND r.name IN ('marketing', 'marketing_lead', 'admin', 'super_admin')
   295|    )
   296|  );
   297|
   298|-- Commercial: read + insert (for handover notes)
   299|DROP POLICY IF EXISTS "commercial_read_insert_activities" ON public.lead_activities;
   300|CREATE POLICY "commercial_read_insert_activities"
   301|  ON public.lead_activities FOR ALL
   302|  TO authenticated
   303|  USING (
   304|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   305|    AND EXISTS (
   306|      SELECT 1 FROM public.user_profiles up
   307|      JOIN public.roles r ON up.role_id = r.id
   308|      WHERE up.id = auth.uid()
   309|      AND r.name IN ('commercial', 'commercial_director')
   310|    )
   311|  )
   312|  WITH CHECK (
   313|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   314|    AND EXISTS (
   315|      SELECT 1 FROM public.user_profiles up
   316|      JOIN public.roles r ON up.role_id = r.id
   317|      WHERE up.id = auth.uid()
   318|      AND r.name IN ('commercial', 'commercial_director')
   319|    )
   320|  );
   321|
   322|-- 7.13 Trigger: Auto-update updated_at
   323|DROP TRIGGER IF EXISTS leads_updated_at ON leads;
   324|CREATE TRIGGER leads_updated_at
   325|  BEFORE UPDATE ON leads
   326|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
   327|
   328|DROP TRIGGER IF EXISTS lead_activities_updated_at ON lead_activities;
   329|CREATE TRIGGER lead_activities_updated_at
   330|  BEFORE UPDATE ON lead_activities
   331|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
   332|
   333|-- 7.14 Function: Calculate lead score
   334|CREATE OR REPLACE FUNCTION public.calculate_lead_score(lead_id uuid)
   335|RETURNS integer AS $$
   336|DECLARE
   337|  lead_record RECORD;
   338|  score integer := 0;
   339|  rule_record RECORD;
   340|BEGIN
   341|  -- Get lead data
   342|  SELECT * INTO lead_record FROM public.leads WHERE id = lead_id;
   343|  
   344|  IF NOT FOUND THEN
   345|    RETURN NULL;
   346|  END IF;
   347|  
   348|  -- Budget disclosed (25 pts)
   349|  SELECT weight * (rules->>lead_record.budget_disclosed)::integer / 25
   350|  INTO score
   351|  FROM public.scoring_rules 
   352|  WHERE component = 'budget_disclosed' AND tenant_id = lead_record.tenant_id;
   353|  
   354|  -- Authority level (25 pts)
   355|  SELECT weight * (rules->>lead_record.authority_level)::integer / 25
   356|  INTO score
   357|  FROM public.scoring_rules 
   358|  WHERE component = 'authority_level' AND tenant_id = lead_record.tenant_id;
   359|  
   360|  -- Need definition (20 pts)
   361|  SELECT weight * lead_record.need_definition / 20
   362|  INTO score
   363|  FROM public.scoring_rules 
   364|  WHERE component = 'need_definition' AND tenant_id = lead_record.tenant_id;
   365|  
   366|  -- Timeline (15 pts)
   367|  SELECT weight * (rules->>lead_record.timeline)::integer / 15
   368|  INTO score
   369|  FROM public.scoring_rules 
   370|  WHERE component = 'timeline' AND tenant_id = lead_record.tenant_id;
   371|  
   372|  -- Engagement score (15 pts)
   373|  SELECT weight * lead_record.engagement_score / 15
   374|  INTO score
   375|  FROM public.scoring_rules 
   376|  WHERE component = 'engagement_score' AND tenant_id = lead_record.tenant_id;
   377|  
   378|  RETURN score;
   379|END;
   380|$$ LANGUAGE plpgsql SECURITY DEFINER;
   381|
   382|-- =====================================================
   383|-- SETUP COMPLETE!
   384|-- =====================================================
   385|


-- =====================================================
-- FILE: 20260418_007_hr_bpjs_pph21_configs.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-4.0-C: BPJS & PPh21 Configurations
     3|-- =====================================================
     4|-- BPJS Kesehatan & Ketenagakerjaan rates
     5|-- PPh21 TER (Tarif Efektif Rata-rata) 2025 config
     6|-- =====================================================
     7|
     8|-- 2.1 hr_bpjs_configs - BPJS rates configuration
     9|CREATE TABLE IF NOT EXISTS public.hr_bpjs_configs (
    10|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    11|  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    12|  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
    13|  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
    14|  
    15|  -- BPJS Numbers
    16|  bpjs_tk_number text, -- BPJS Ketenagakerjaan company number
    17|  bpjs_kes_number text, -- BPJS Kesehatan company number
    18|  
    19|  -- BPJS Ketenagakerjaan Rates (percentage)
    20|  -- Jaminan Kecelakaan Kerja (JKK) - company only, varies by risk level
    21|  jkk_rate numeric(5, 4) NOT NULL DEFAULT 0.0024 CHECK (jkk_rate >= 0 AND jkk_rate <= 1), -- 0.24% default (risk level 1)
    22|  
    23|  -- Jaminan Kematian (JKM) - company only
    24|  jkm_rate numeric(5, 4) NOT NULL DEFAULT 0.003 CHECK (jkm_rate >= 0 AND jkm_rate <= 1), -- 0.3%
    25|  
    26|  -- Jaminan Hari Tua (JHT) - company + employee
    27|  jht_employee_rate numeric(5, 4) NOT NULL DEFAULT 0.02 CHECK (jht_employee_rate >= 0 AND jht_employee_rate <= 1), -- 2% employee
    28|  jht_company_rate numeric(5, 4) NOT NULL DEFAULT 0.037 CHECK (jht_company_rate >= 0 AND jht_company_rate <= 1), -- 3.7% company
    29|  
    30|  -- Jaminan Pensiun (JP) - company + employee (salary cap applies)
    31|  jp_employee_rate numeric(5, 4) NOT NULL DEFAULT 0.01 CHECK (jp_employee_rate >= 0 AND jp_employee_rate <= 1), -- 1% employee
    32|  jp_company_rate numeric(5, 4) NOT NULL DEFAULT 0.02 CHECK (jp_company_rate >= 0 AND jp_company_rate <= 1), -- 2% company
    33|  jp_salary_cap numeric(20, 4) DEFAULT 10800000.00, -- Salary cap for JP (2024: 10.8M)
    34|  
    35|  -- BPJS Kesehatan Rates (percentage)
    36|  kes_employee_rate numeric(5, 4) NOT NULL DEFAULT 0.01 CHECK (kes_employee_rate >= 0 AND kes_employee_rate <= 1), -- 1% employee
    37|  kes_company_rate numeric(5, 4) NOT NULL DEFAULT 0.04 CHECK (kes_company_rate >= 0 AND kes_company_rate <= 1), -- 4% company
    38|  kes_salary_cap numeric(20, 4) DEFAULT 12000000.00, -- Salary cap for BPJS Kesehatan (2024: 12M)
    39|  
    40|  -- UMR override (for minimum contribution base)
    41|  umr_override numeric(20, 4), -- If NULL, use hr_city_umr based on employee city
    42|  
    43|  -- Validity period
    44|  effective_date date NOT NULL DEFAULT (CURRENT_DATE),
    45|  end_date date, -- NULL = still active
    46|  
    47|  -- Inheritance pattern
    48|  is_default boolean DEFAULT false,
    49|  
    50|  created_at timestamptz DEFAULT now(),
    51|  updated_at timestamptz DEFAULT now(),
    52|  
    53|  UNIQUE(tenant_id, entity_id, branch_id, effective_date)
    54|);
    55|
    56|CREATE INDEX IF NOT EXISTS idx_hr_bpjs_configs_tenant ON public.hr_bpjs_configs(tenant_id);
    57|CREATE INDEX IF NOT EXISTS idx_hr_bpjs_configs_entity ON public.hr_bpjs_configs(entity_id);
    58|CREATE INDEX IF NOT EXISTS idx_hr_bpjs_configs_branch ON public.hr_bpjs_configs(branch_id);
    59|CREATE INDEX IF NOT EXISTS idx_hr_bpjs_configs_active ON public.hr_bpjs_configs(end_date);
    60|
    61|-- Enable RLS
    62|ALTER TABLE public.hr_bpjs_configs ENABLE ROW LEVEL SECURITY;
    63|
    64|-- RLS Policies
    65|DROP POLICY IF EXISTS "Users can view BPJS configs in their tenant" ON public.hr_bpjs_configs;
    66|CREATE POLICY "Users can view BPJS configs in their tenant"
    67|  ON public.hr_bpjs_configs FOR SELECT
    68|  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
    69|
    70|DROP POLICY IF EXISTS "HR admin can manage BPJS configs" ON public.hr_bpjs_configs;
    71|CREATE POLICY "HR admin can manage BPJS configs"
    72|  ON public.hr_bpjs_configs FOR ALL
    73|  USING (
    74|    EXISTS (
    75|      SELECT 1 FROM public.user_roles ur
    76|      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    77|    )
    78|  );
    79|
    80|-- Trigger: Auto-update updated_at
    81|DROP TRIGGER IF EXISTS hr_bpjs_configs_updated_at ON public.hr_bpjs_configs;
    82|CREATE TRIGGER hr_bpjs_configs_updated_at
    83|  BEFORE UPDATE ON public.hr_bpjs_configs
    84|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    85|
    86|-- =====================================================
    87|-- 2.2 hr_pph21_configs - PPh21 TER configuration per year
    88|-- =====================================================
    89|CREATE TABLE IF NOT EXISTS public.hr_pph21_configs (
    90|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    91|  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    92|  
    93|  tax_year integer NOT NULL CHECK (tax_year >= 2020 AND tax_year <= 2100),
    94|  
    95|  -- PTKP (Penghasilan Tidak Kena Pajak) - per PMK 101/PMK.03/2016
    96|  ptkp_tk0 numeric(20, 2) NOT NULL DEFAULT 54000000.00, -- TK/0 (Single, no dependents)
    97|  ptkp_tk1 numeric(20, 2) NOT NULL DEFAULT 58500000.00, -- TK/1 (Single, 1 dependent)
    98|  ptkp_tk2 numeric(20, 2) NOT NULL DEFAULT 63000000.00, -- TK/2 (Single, 2 dependents)
    99|  ptkp_tk3 numeric(20, 2) NOT NULL DEFAULT 67500000.00, -- TK/3 (Single, 3 dependents)
   100|  ptkp_k0 numeric(20, 2) NOT NULL DEFAULT 58500000.00, -- K/0 (Married, no dependents)
   101|  ptkp_k1 numeric(20, 2) NOT NULL DEFAULT 63000000.00, -- K/1 (Married, 1 dependent)
   102|  ptkp_k2 numeric(20, 2) NOT NULL DEFAULT 67500000.00, -- K/2 (Married, 2 dependents)
   103|  ptkp_k3 numeric(20, 2) NOT NULL DEFAULT 72000000.00, -- K/3 (Married, 3 dependents)
   104|  
   105|  -- PPh21 TER Brackets (UU HPP 2021) - JSONB for flexibility
   106|  -- Format: [{"min": 0, "max": 60000000, "rate": 0.05}, {"min": 60000000, "max": 500000000, "rate": 0.15}, ...]
   107|  pph21_brackets jsonb NOT NULL DEFAULT '[
   108|    {"min": 0, "max": 60000000, "rate": 0.05},
   109|    {"min": 60000000, "max": 500000000, "rate": 0.15},
   110|    {"min": 500000000, "max": 2500000000, "rate": 0.25},
   111|    {"min": 2500000000, "max": 5000000000, "rate": 0.30},
   112|    {"min": 5000000000, "max": null, "rate": 0.35}
   113|  ]'::jsonb,
   114|  
   115|  -- TER (Tarif Efektif Rata-rata) method
   116|  use_ter_method boolean DEFAULT true, -- true = TER, false = gross-up
   117|  
   118|  -- TER Brackets (for monthly calculation) - JSONB
   119|  ter_brackets jsonb DEFAULT '[
   120|    {"min": 0, "max": 5500000, "rate": 0.0},
   121|    {"min": 5500000, "max": 8958333, "rate": 0.05},
   122|    {"min": 8958333, "max": 20000000, "rate": 0.15},
   123|    {"min": 20000000, "max": null, "rate": 0.25}
   124|  ]'::jsonb,
   125|  
   126|  -- Biaya jabatan (5% of salary, max 600k/year = 50k/month)
   127|  jabatan_rate numeric(5, 4) NOT NULL DEFAULT 0.05 CHECK (jabatan_rate >= 0 AND jabatan_rate <= 1),
   128|  jabatan_max_annual numeric(20, 2) NOT NULL DEFAULT 6000000.00,
   129|  jabatan_max_monthly numeric(20, 2) NOT NULL DEFAULT 500000.00,
   130|  
   131|  -- Non-NPWP surcharge (20% higher)
   132|  non_npwp_surcharge numeric(5, 4) NOT NULL DEFAULT 0.20 CHECK (non_npwp_surcharge >= 0 AND non_npwp_surcharge <= 1),
   133|  
   134|  created_at timestamptz DEFAULT now(),
   135|  updated_at timestamptz DEFAULT now(),
   136|  
   137|  UNIQUE(tenant_id, tax_year)
   138|);
   139|
   140|CREATE INDEX IF NOT EXISTS idx_hr_pph21_configs_tenant ON public.hr_pph21_configs(tenant_id);
   141|CREATE INDEX IF NOT EXISTS idx_hr_pph21_configs_year ON public.hr_pph21_configs(tax_year);
   142|
   143|-- Enable RLS
   144|ALTER TABLE public.hr_pph21_configs ENABLE ROW LEVEL SECURITY;
   145|
   146|-- RLS Policies
   147|DROP POLICY IF EXISTS "Users can view PPh21 configs in their tenant" ON public.hr_pph21_configs;
   148|CREATE POLICY "Users can view PPh21 configs in their tenant"
   149|  ON public.hr_pph21_configs FOR SELECT
   150|  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
   151|
   152|DROP POLICY IF EXISTS "HR admin can manage PPh21 configs" ON public.hr_pph21_configs;
   153|CREATE POLICY "HR admin can manage PPh21 configs"
   154|  ON public.hr_pph21_configs FOR ALL
   155|  USING (
   156|    EXISTS (
   157|      SELECT 1 FROM public.user_roles ur
   158|      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
   159|    )
   160|  );
   161|
   162|-- Trigger: Auto-update updated_at
   163|DROP TRIGGER IF EXISTS hr_pph21_configs_updated_at ON public.hr_pph21_configs;
   164|CREATE TRIGGER hr_pph21_configs_updated_at
   165|  BEFORE UPDATE ON public.hr_pph21_configs
   166|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
   167|
   168|-- =====================================================
   169|-- Seed Data: Default PPh21 Config 2025
   170|-- =====================================================
   171|
   172|INSERT INTO public.hr_pph21_configs (tax_year, ptkp_tk0, ptkp_tk1, ptkp_tk2, ptkp_tk3, ptkp_k0, ptkp_k1, ptkp_k2, ptkp_k3)
   173|VALUES (2025, 54000000.00, 58500000.00, 63000000.00, 67500000.00, 58500000.00, 63000000.00, 67500000.00, 72000000.00)
   174|ON CONFLICT (tenant_id, tax_year) DO NOTHING;
   175|
   176|-- Note: Above insert requires tenant_id. Run after creating tenant:
   177|-- INSERT INTO public.hr_pph21_configs (tenant_id, tax_year, ...)
   178|-- VALUES ('00000000-0000-0000-0000-000000000001', 2025, ...);
   179|
   180|-- =====================================================
   181|-- SETUP COMPLETE!
   182|-- =====================================================
   183|-- Tables created:
   184|-- - hr_bpjs_configs (BPJS TK & Kesehatan rates)
   185|-- - hr_pph21_configs (PPh21 TER brackets + PTKP)
   186|-- =====================================================
   187|


-- =====================================================
-- FILE: 20260418_008_create_sales_briefs_quotations.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-1: Sales Module (Project Briefs & Quotations)
     3|-- =====================================================
     4|-- Based on USER_STORIES v3.0 § 2.3-2.5 (US-Q2C-003, US-Q2C-005)
     5|-- =====================================================
     6|
     7|-- 8.1 Approval Rules Table (margin-based routing)
     8|CREATE TABLE IF NOT EXISTS public.approval_rules (
     9|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    10|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    11|  margin_min numeric(5,2) NOT NULL, -- percentage
    12|  margin_max numeric(5,2) NOT NULL, -- percentage
    13|  approver_role text NOT NULL, -- role required for approval
    14|  sla_days integer NOT NULL, -- approval SLA in business days
    15|  is_active boolean NOT NULL DEFAULT true,
    16|  created_at timestamptz DEFAULT now(),
    17|  updated_at timestamptz DEFAULT now()
    18|);
    19|
    20|-- 8.2 Seed default approval rules (per USER_STORIES v3.0 § 2.3)
    21|INSERT INTO public.approval_rules (tenant_id, margin_min, margin_max, approver_role, sla_days)
    22|SELECT 
    23|  t.id,
    24|  rule.margin_min,
    25|  rule.margin_max,
    26|  rule.approver_role,
    27|  rule.sla_days
    28|FROM public.tenants t
    29|CROSS JOIN (
    30|  VALUES 
    31|    (30.00, 999.99, 'pm', 1),
    32|    (20.00, 30.00, 'commercial_director', 2),
    33|    (10.00, 20.00, 'ceo', 3),
    34|    (0.00, 10.00, 'ceo_cfo_dual', 5)
    35|) AS rule(margin_min, margin_max, approver_role, sla_days)
    36|ON CONFLICT DO NOTHING;
    37|
    38|-- 8.3 Project Briefs Table
    39|CREATE TABLE IF NOT EXISTS public.project_briefs (
    40|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    41|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    42|  entity_id uuid REFERENCES public.entities(id),
    43|  lead_id uuid REFERENCES public.leads(id),
    44|  client_id uuid NOT NULL REFERENCES public.clients(id),
    45|  
    46|  -- Brief content
    47|  title text NOT NULL,
    48|  executive_summary text NOT NULL,
    49|  scope_of_work text NOT NULL,
    50|  assumptions text[],
    51|  exclusions text[],
    52|  deliverables text[],
    53|  
    54|  -- Financial (per USER_STORIES v3.0)
    55|  estimated_revenue numeric(20,4) NOT NULL,
    56|  estimated_cost numeric(20,4) NOT NULL,
    57|  estimated_margin numeric(20,4) GENERATED ALWAYS AS (estimated_revenue - estimated_cost) STORED,
    58|  estimated_margin_pct numeric(5,2) GENERATED ALWAYS AS (
    59|    CASE WHEN estimated_revenue > 0 THEN ((estimated_revenue - estimated_cost) / estimated_revenue) * 100 ELSE 0 END
    60|  ) STORED,
    61|  currency text NOT NULL DEFAULT 'IDR',
    62|  
    63|  -- Workflow
    64|  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    65|    'draft', 'submitted', 'under_review', 'approved', 'rejected', 'needs_revision'
    66|  )),
    67|  approval_tier text, -- auto-populated based on margin
    68|  current_approver_id uuid REFERENCES public.user_profiles(id),
    69|  approved_by uuid REFERENCES public.user_profiles(id),
    70|  approved_at timestamptz,
    71|  rejection_reason text,
    72|  
    73|  -- Credit check snapshot (US-Q2C-003)
    74|  credit_check_status text CHECK (credit_check_status IN ('pending', 'passed', 'failed', 'overridden')),
    75|  credit_check_data jsonb,
    76|  credit_check_performed_at timestamptz,
    77|  
    78|  -- SLA
    79|  submitted_at timestamptz,
    80|  sla_deadline_at timestamptz,
    81|  sla_breached boolean NOT NULL DEFAULT false,
    82|  
    83|  -- Ownership
    84|  commercial_pic_id uuid NOT NULL REFERENCES public.user_profiles(id),
    85|  
    86|  -- Audit
    87|  created_at timestamptz NOT NULL DEFAULT now(),
    88|  updated_at timestamptz NOT NULL DEFAULT now(),
    89|  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
    90|  updated_by uuid REFERENCES public.user_profiles(id),
    91|  deleted_at timestamptz
    92|);
    93|
    94|-- 8.4 Indexes
    95|CREATE INDEX IF NOT EXISTS idx_briefs_tenant ON project_briefs(tenant_id);
    96|CREATE INDEX IF NOT EXISTS idx_briefs_status ON project_briefs(tenant_id, status) WHERE deleted_at IS NULL;
    97|CREATE INDEX IF NOT EXISTS idx_briefs_client ON project_briefs(client_id);
    98|CREATE INDEX IF NOT EXISTS idx_briefs_lead ON project_briefs(lead_id);
    99|CREATE INDEX IF NOT EXISTS idx_briefs_approver ON project_briefs(current_approver_id) 
   100|  WHERE status = 'under_review';
   101|CREATE INDEX IF NOT EXISTS idx_briefs_commercial ON project_briefs(commercial_pic_id);
   102|
   103|-- 8.5 Enable RLS
   104|ALTER TABLE public.project_briefs ENABLE ROW LEVEL SECURITY;
   105|
   106|-- 8.6 RLS Policies
   107|
   108|-- Commercial: full access for own tenant briefs
   109|DROP POLICY IF EXISTS "commercial_manage_briefs" ON public.project_briefs;
   110|CREATE POLICY "commercial_manage_briefs"
   111|  ON public.project_briefs FOR ALL
   112|  TO authenticated
   113|  USING (
   114|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   115|    AND EXISTS (
   116|      SELECT 1 FROM public.user_profiles up
   117|      JOIN public.roles r ON up.role_id = r.id
   118|      WHERE up.id = auth.uid()
   119|      AND r.name IN ('commercial', 'commercial_director', 'admin', 'super_admin')
   120|    )
   121|  )
   122|  WITH CHECK (
   123|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   124|    AND EXISTS (
   125|      SELECT 1 FROM public.user_profiles up
   126|      JOIN public.roles r ON up.role_id = r.id
   127|      WHERE up.id = auth.uid()
   128|      AND r.name IN ('commercial', 'commercial_director', 'admin', 'super_admin')
   129|    )
   130|  );
   131|
   132|-- Approvers (PM, CEO, CFO) can read + update when assigned
   133|DROP POLICY IF EXISTS "approver_update_assigned" ON public.project_briefs;
   134|CREATE POLICY "approver_update_assigned"
   135|  ON public.project_briefs FOR UPDATE
   136|  TO authenticated
   137|  USING (
   138|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   139|    AND current_approver_id = auth.uid()
   140|  )
   141|  WITH CHECK (
   142|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   143|    AND current_approver_id = auth.uid()
   144|  );
   145|
   146|-- Finance: read for credit check context
   147|DROP POLICY IF EXISTS "finance_read_briefs" ON public.project_briefs;
   148|CREATE POLICY "finance_read_briefs"
   149|  ON public.project_briefs FOR SELECT
   150|  TO authenticated
   151|  USING (
   152|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   153|    AND EXISTS (
   154|      SELECT 1 FROM public.user_profiles up
   155|      JOIN public.roles r ON up.role_id = r.id
   156|      WHERE up.id = auth.uid()
   157|      AND r.name IN ('finance', 'cfo')
   158|    )
   159|  );
   160|
   161|-- PM: read approved briefs (for project handover)
   162|DROP POLICY IF EXISTS "pm_read_approved_briefs" ON public.project_briefs;
   163|CREATE POLICY "pm_read_approved_briefs"
   164|  ON public.project_briefs FOR SELECT
   165|  TO authenticated
   166|  USING (
   167|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   168|    AND status = 'approved'
   169|    AND EXISTS (
   170|      SELECT 1 FROM public.user_profiles up
   171|      JOIN public.roles r ON up.role_id = r.id
   172|      WHERE up.id = auth.uid()
   173|      AND r.name IN ('pm', 'pm_lead')
   174|    )
   175|  );
   176|
   177|-- 8.7 Quotations Table
   178|CREATE TABLE IF NOT EXISTS public.quotations (
   179|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   180|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
   181|  brief_id uuid NOT NULL REFERENCES public.project_briefs(id),
   182|  client_id uuid NOT NULL REFERENCES public.clients(id),
   183|  
   184|  -- Quotation number (QTN-YYYY-MM-NNNN-vX.Y)
   185|  quotation_number text NOT NULL UNIQUE,
   186|  version text NOT NULL DEFAULT 'v1.0',
   187|  parent_quotation_id uuid REFERENCES public.quotations(id), -- for versioning
   188|  
   189|  -- Content
   190|  title text NOT NULL,
   191|  description text,
   192|  line_items jsonb NOT NULL, -- [{description, quantity, unit_price, total}]
   193|  
   194|  -- Financial
   195|  subtotal numeric(20,4) NOT NULL,
   196|  tax_rate numeric(5,2) DEFAULT 11, -- PPN
   197|  tax_amount numeric(20,4) GENERATED ALWAYS AS (subtotal * tax_rate / 100) STORED,
   198|  discount_percent numeric(5,2) DEFAULT 0,
   199|  discount_amount numeric(20,4) GENERATED ALWAYS AS (subtotal * discount_percent / 100) STORED,
   200|  total_amount numeric(20,4) NOT NULL,
   201|  currency text NOT NULL DEFAULT 'IDR',
   202|  
   203|  -- Payment terms
   204|  payment_terms text, -- e.g., "50% down payment, 50% on delivery"
   205|  validity_days integer DEFAULT 30,
   206|  valid_until date,
   207|  
   208|  -- Workflow
   209|  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
   210|    'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised'
   211|  )),
   212|  sent_at timestamptz,
   213|  viewed_at timestamptz,
   214|  accepted_at timestamptz,
   215|  rejected_at timestamptz,
   216|  rejection_reason text,
   217|  
   218|  -- Client approval
   219|  accepted_by text, -- client name
   220|  accepted_by_title text,
   221|  accepted_by_email text,
   222|  signature_data jsonb, -- e-signature metadata
   223|  
   224|  -- Ownership
   225|  commercial_pic_id uuid NOT NULL REFERENCES public.user_profiles(id),
   226|  
   227|  -- Audit
   228|  created_at timestamptz NOT NULL DEFAULT now(),
   229|  updated_at timestamptz NOT NULL DEFAULT now(),
   230|  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
   231|  updated_by uuid REFERENCES public.user_profiles(id),
   232|  deleted_at timestamptz
   233|);
   234|
   235|-- 8.8 Indexes
   236|CREATE INDEX IF NOT EXISTS idx_quotations_tenant ON quotations(tenant_id);
   237|CREATE INDEX IF NOT EXISTS idx_quotations_brief ON quotations(brief_id);
   238|CREATE INDEX IF NOT EXISTS idx_quotations_client ON quotations(client_id);
   239|CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(tenant_id, status) WHERE deleted_at IS NULL;
   240|CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);
   241|
   242|-- 8.9 Enable RLS
   243|ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
   244|
   245|-- 8.10 RLS Policies
   246|
   247|-- Commercial: full access
   248|DROP POLICY IF EXISTS "commercial_manage_quotations" ON public.quotations;
   249|CREATE POLICY "commercial_manage_quotations"
   250|  ON public.quotations FOR ALL
   251|  TO authenticated
   252|  USING (
   253|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   254|    AND EXISTS (
   255|      SELECT 1 FROM public.user_profiles up
   256|      JOIN public.roles r ON up.role_id = r.id
   257|      WHERE up.id = auth.uid()
   258|      AND r.name IN ('commercial', 'commercial_director', 'admin', 'super_admin')
   259|    )
   260|  )
   261|  WITH CHECK (
   262|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   263|    AND EXISTS (
   264|      SELECT 1 FROM public.user_profiles up
   265|      JOIN public.roles r ON up.role_id = r.id
   266|      WHERE up.id = auth.uid()
   267|      AND r.name IN ('commercial', 'commercial_director', 'admin', 'super_admin')
   268|    )
   269|  );
   270|
   271|-- Finance: read quotations
   272|DROP POLICY IF EXISTS "finance_read_quotations" ON public.quotations;
   273|CREATE POLICY "finance_read_quotations"
   274|  ON public.quotations FOR SELECT
   275|  TO authenticated
   276|  USING (
   277|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   278|    AND EXISTS (
   279|      SELECT 1 FROM public.user_profiles up
   280|      JOIN public.roles r ON up.role_id = r.id
   281|      WHERE up.id = auth.uid()
   282|      AND r.name IN ('finance', 'cfo')
   283|    )
   284|  );
   285|
   286|-- PM: read accepted quotations (for project execution)
   287|DROP POLICY IF EXISTS "pm_read_accepted_quotations" ON public.quotations;
   288|CREATE POLICY "pm_read_accepted_quotations"
   289|  ON public.quotations FOR SELECT
   290|  TO authenticated
   291|  USING (
   292|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   293|    AND status = 'accepted'
   294|    AND EXISTS (
   295|      SELECT 1 FROM public.user_profiles up
   296|      JOIN public.roles r ON up.role_id = r.id
   297|      WHERE up.id = auth.uid()
   298|      AND r.name IN ('pm', 'pm_lead')
   299|    )
   300|  );
   301|
   302|-- 8.11 Trigger: Auto-update updated_at
   303|DROP TRIGGER IF EXISTS project_briefs_updated_at ON project_briefs;
   304|CREATE TRIGGER project_briefs_updated_at
   305|  BEFORE UPDATE ON project_briefs
   306|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
   307|
   308|DROP TRIGGER IF EXISTS quotations_updated_at ON quotations;
   309|CREATE TRIGGER quotations_updated_at
   310|  BEFORE UPDATE ON quotations
   311|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
   312|
   313|-- 8.12 Function: Get approval tier based on margin
   314|CREATE OR REPLACE FUNCTION public.get_approval_tier(margin_pct numeric, tenant_id uuid)
   315|RETURNS TABLE(approver_role text, sla_days integer) AS $$
   316|BEGIN
   317|  RETURN QUERY
   318|  SELECT ar.approver_role, ar.sla_days
   319|  FROM public.approval_rules ar
   320|  WHERE ar.tenant_id = get_approval_tier.tenant_id
   321|  AND margin_pct >= ar.margin_min
   322|  AND margin_pct <= ar.margin_max
   323|  AND ar.is_active = true
   324|  LIMIT 1;
   325|END;
   326|$$ LANGUAGE plpgsql SECURITY DEFINER;
   327|
   328|-- 8.13 Function: Check credit before brief submission
   329|CREATE OR REPLACE FUNCTION public.check_client_credit(p_client_id uuid)
   330|RETURNS TABLE(status text, message text, ar_aging_days integer) AS $$
   331|DECLARE
   332|  aging_result RECORD;
   333|BEGIN
   334|  -- Get AR aging for client (simplified - would need invoices table)
   335|  SELECT MAX(aging_days) INTO aging_result
   336|  FROM (
   337|    -- Placeholder: would query invoice aging data
   338|    SELECT 0 AS aging_days
   339|  ) subq;
   340|  
   341|  IF aging_result.aging_days > 65 THEN
   342|    RETURN QUERY SELECT 'failed'::text, 'Client has AR aging >65 days'::text, aging_result.aging_days;
   343|  ELSE
   344|    RETURN QUERY SELECT 'passed'::text, 'Credit check passed'::text, COALESCE(aging_result.aging_days, 0);
   345|  END IF;
   346|END;
   347|$$ LANGUAGE plpgsql SECURITY DEFINER;
   348|
   349|-- =====================================================
   350|-- SETUP COMPLETE!
   351|-- =====================================================
   352|


-- =====================================================
-- FILE: 20260418_008_hr_salary_components.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-4.0-D: Salary Components
     3|-- =====================================================
     4|-- Earnings, deductions, allowances, bonuses, etc.
     5|-- Soft delete mandatory - never hard delete if used by employees
     6|-- =====================================================
     7|
     8|CREATE TABLE IF NOT EXISTS public.hr_salary_components (
     9|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    10|  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    11|  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
    12|  
    13|  -- Component info
    14|  name text NOT NULL, -- e.g., "Gaji Pokok", "Tunjangan Jabatan", "BPJS Kesehatan"
    15|  code text NOT NULL, -- e.g., "GAPOK", "TUNJAB", "BPJSKESE"
    16|  
    17|  -- Type: earning or deduction
    18|  component_type text NOT NULL CHECK (component_type IN ('earning', 'deduction')),
    19|  
    20|  -- Category for grouping and reporting
    21|  category text NOT NULL CHECK (category IN (
    22|    'basic', -- Gaji pokok
    23|    'allowance', -- Tunjangan (transport, makan, komunikasi, dll)
    24|    'overtime', -- Lembur
    25|    'bonus', -- Bonus performance
    26|    'thr', -- THR
    27|    'bpjs_tk', -- BPJS Ketenagakerjaan
    28|    'bpjs_kes', -- BPJS Kesehatan
    29|    'pph21', -- PPh21
    30|    'loan', -- Kasbon/pinjaman
    31|    'other' -- Lainnya
    32|  )),
    33|  
    34|  -- Amount configuration
    35|  amount_type text NOT NULL DEFAULT 'fixed' CHECK (amount_type IN (
    36|    'fixed', -- Fixed amount
    37|    'percentage', -- Percentage of basic salary
    38|    'formula', -- Custom formula
    39|    'variable' -- Varies per employee
    40|  )),
    41|  
    42|  fixed_amount numeric(20, 4) DEFAULT 0, -- For fixed type
    43|  percentage numeric(5, 4) DEFAULT 0, -- For percentage type (e.g., 0.05 = 5%)
    44|  formula text, -- For formula type (e.g., "basic_salary * 0.1")
    45|  
    46|  -- Tax and BPJS treatment
    47|  is_taxable boolean DEFAULT false, -- Included in taxable income
    48|  is_bpjs_base boolean DEFAULT false, -- Included in BPJS contribution base
    49|  is_fixed boolean DEFAULT true, -- Fixed every month (vs variable)
    50|  
    51|  -- Display order in payslip
    52|  display_order integer DEFAULT 0,
    53|  
    54|  -- Soft delete - HARD RULE: never hard delete if used by employees
    55|  deleted_at timestamptz,
    56|  deleted_by uuid REFERENCES auth.users(id),
    57|  deleted_reason text,
    58|  
    59|  description text,
    60|  
    61|  created_at timestamptz DEFAULT now(),
    62|  updated_at timestamptz DEFAULT now(),
    63|  
    64|  UNIQUE(tenant_id, entity_id, code)
    65|);
    66|
    67|CREATE INDEX IF NOT EXISTS idx_hr_salary_components_tenant ON public.hr_salary_components(tenant_id);
    68|CREATE INDEX IF NOT EXISTS idx_hr_salary_components_entity ON public.hr_salary_components(entity_id);
    69|CREATE INDEX IF NOT EXISTS idx_hr_salary_components_type ON public.hr_salary_components(component_type);
    70|CREATE INDEX IF NOT EXISTS idx_hr_salary_components_category ON public.hr_salary_components(category);
    71|CREATE INDEX IF NOT EXISTS idx_hr_salary_components_deleted ON public.hr_salary_components(deleted_at);
    72|
    73|-- Enable RLS
    74|ALTER TABLE public.hr_salary_components ENABLE ROW LEVEL SECURITY;
    75|
    76|-- RLS Policies
    77|DROP POLICY IF EXISTS "Users can view salary components in their tenant" ON public.hr_salary_components;
    78|CREATE POLICY "Users can view salary components in their tenant"
    79|  ON public.hr_salary_components FOR SELECT
    80|  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
    81|
    82|DROP POLICY IF EXISTS "HR admin can manage salary components" ON public.hr_salary_components;
    83|CREATE POLICY "HR admin can manage salary components"
    84|  ON public.hr_salary_components FOR ALL
    85|  USING (
    86|    EXISTS (
    87|      SELECT 1 FROM public.user_roles ur
    88|      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    89|    )
    90|  )
    91|  WITH CHECK (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
    92|
    93|-- Trigger: Auto-update updated_at
    94|DROP TRIGGER IF EXISTS hr_salary_components_updated_at ON public.hr_salary_components;
    95|CREATE TRIGGER hr_salary_components_updated_at
    96|  BEFORE UPDATE ON public.hr_salary_components
    97|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    98|
    99|-- =====================================================
   100|-- Seed Data: Default Salary Components (12 components)
   101|-- =====================================================
   102|
   103|-- EARNINGS
   104|INSERT INTO public.hr_salary_components (name, code, component_type, category, is_taxable, is_bpjs_base, is_fixed, display_order)
   105|VALUES 
   106|  ('Gaji Pokok', 'GAPOK', 'earning', 'basic', true, true, true, 1),
   107|  ('Tunjangan Jabatan', 'TUNJAB', 'earning', 'allowance', true, true, true, 2),
   108|  ('Tunjangan Transport', 'TUNTRANS', 'earning', 'allowance', true, false, true, 3),
   109|  ('Tunjangan Makan', 'TUNMAKAN', 'earning', 'allowance', true, false, true, 4),
   110|  ('Tunjangan Komunikasi', 'TUNKOMUNIK', 'earning', 'allowance', true, false, true, 5),
   111|  ('Lembur', 'LEMBUR', 'earning', 'overtime', true, false, false, 6),
   112|  ('Bonus', 'BONUS', 'earning', 'bonus', true, false, false, 7),
   113|  ('THR', 'THR', 'earning', 'thr', true, false, true, 8)
   114|ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;
   115|
   116|-- DEDUCTIONS
   117|INSERT INTO public.hr_salary_components (name, code, component_type, category, is_taxable, is_bpjs_base, is_fixed, display_order)
   118|VALUES 
   119|  ('BPJS Ketenagakerjaan', 'BPJSTKE', 'deduction', 'bpjs_tk', false, false, true, 10),
   120|  ('BPJS Kesehatan', 'BPJSKESE', 'deduction', 'bpjs_kes', false, false, true, 11),
   121|  ('PPh21', 'PPH21', 'deduction', 'pph21', false, false, false, 12),
   122|  ('Kasbon', 'KASBON', 'deduction', 'loan', false, false, false, 13)
   123|ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;
   124|
   125|-- Note: Above inserts require tenant_id. Run after creating tenant.
   126|
   127|-- =====================================================
   128|-- SETUP COMPLETE!
   129|-- =====================================================
   130|-- hr_salary_components ready with 12 default components
   131|-- SOFT DELETE ONLY - never hard delete!
   132|-- =====================================================
   133|


-- =====================================================
-- FILE: 20260418_009_create_finance_invoices.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-1: Finance Module (COA + Invoices + Payments)
     3|-- =====================================================
     4|-- Based on USER_STORIES v3.0 § 2.6 (US-Q2C-006, US-Q2C-007)
     5|-- PSAK-compliant Chart of Accounts + AR Management
     6|-- =====================================================
     7|
     8|-- 9.1 Chart of Accounts (COA) Table
     9|CREATE TABLE IF NOT EXISTS public.coa (
    10|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    11|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    12|  account_code text NOT NULL, -- e.g., "1-1000" for Assets
    13|  account_name text NOT NULL,
    14|  account_type text NOT NULL CHECK (account_type IN (
    15|    'asset', 'liability', 'equity', 'revenue', 'expense'
    16|  )),
    17|  parent_account_id uuid REFERENCES public.coa(id),
    18|  level integer NOT NULL DEFAULT 1, -- hierarchy level
    19|  is_active boolean NOT NULL DEFAULT true,
    20|  normal_balance text CHECK (normal_balance IN ('debit', 'credit')),
    21|  tax_code text, -- linked to tax_rates
    22|  description text,
    23|  
    24|  -- Audit
    25|  created_at timestamptz DEFAULT now(),
    26|  updated_at timestamptz DEFAULT now(),
    27|  created_by uuid REFERENCES public.user_profiles(id),
    28|  deleted_at timestamptz
    29|);
    30|
    31|-- 9.2 Indexes
    32|CREATE INDEX IF NOT EXISTS idx_coa_tenant ON coa(tenant_id);
    33|CREATE INDEX IF NOT EXISTS idx_coa_code ON coa(tenant_id, account_code);
    34|CREATE INDEX IF NOT EXISTS idx_coa_parent ON coa(parent_account_id);
    35|CREATE INDEX IF NOT EXISTS idx_coa_type ON coa(tenant_id, account_type);
    36|
    37|-- 9.3 Enable RLS
    38|ALTER TABLE public.coa ENABLE ROW LEVEL SECURITY;
    39|
    40|-- 9.4 RLS Policies
    41|
    42|-- Finance: full access
    43|DROP POLICY IF EXISTS "finance_manage_coa" ON public.coa;
    44|CREATE POLICY "finance_manage_coa"
    45|  ON public.coa FOR ALL
    46|  TO authenticated
    47|  USING (
    48|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    49|    AND EXISTS (
    50|      SELECT 1 FROM public.user_profiles up
    51|      JOIN public.roles r ON up.role_id = r.id
    52|      WHERE up.id = auth.uid()
    53|      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    54|    )
    55|  )
    56|  WITH CHECK (
    57|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    58|    AND EXISTS (
    59|      SELECT 1 FROM public.user_profiles up
    60|      JOIN public.roles r ON up.role_id = r.id
    61|      WHERE up.id = auth.uid()
    62|      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
    63|    )
    64|  );
    65|
    66|-- Commercial/PM: read only (for project costing context)
    67|DROP POLICY IF EXISTS "others_read_coa" ON public.coa;
    68|CREATE POLICY "others_read_coa"
    69|  ON public.coa FOR SELECT
    70|  TO authenticated
    71|  USING (
    72|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    73|    AND EXISTS (
    74|      SELECT 1 FROM public.user_profiles up
    75|      JOIN public.roles r ON up.role_id = r.id
    76|      WHERE up.id = auth.uid()
    77|      AND r.name IN ('commercial', 'pm', 'ceo')
    78|    )
    79|  );
    80|
    81|-- 9.5 Invoices Table (Accounts Receivable)
    82|CREATE TABLE IF NOT EXISTS public.invoices (
    83|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    84|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    85|  entity_id uuid REFERENCES public.entities(id),
    86|  
    87|  -- Invoice number (INV-YYYY-MM-NNNN)
    88|  invoice_number text NOT NULL UNIQUE,
    89|  
    90|  -- Links
    91|  client_id uuid NOT NULL REFERENCES public.clients(id),
    92|  project_id uuid REFERENCES public.projects(id), -- will be created later
    93|  quotation_id uuid REFERENCES public.quotations(id),
    94|  ticket_id uuid REFERENCES public.tickets(id), -- will be created later
    95|  
    96|  -- Invoice details
    97|  issue_date date NOT NULL DEFAULT CURRENT_DATE,
    98|  due_date date NOT NULL,
    99|  payment_terms_days integer DEFAULT 30,
   100|  
   101|  -- Line items
   102|  line_items jsonb NOT NULL, -- [{description, quantity, unit_price, total, coa_id}]
   103|  
   104|  -- Financial
   105|  subtotal numeric(20,4) NOT NULL,
   106|  tax_rate numeric(5,2) DEFAULT 11,
   107|  tax_amount numeric(20,4) DEFAULT 0,
   108|  discount_amount numeric(20,4) DEFAULT 0,
   109|  total_amount numeric(20,4) NOT NULL,
   110|  currency text NOT NULL DEFAULT 'IDR',
   111|  
   112|  -- Status
   113|  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
   114|    'draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled'
   115|  )),
   116|  
   117|  -- Payment tracking
   118|  amount_paid numeric(20,4) DEFAULT 0,
   119|  amount_due numeric(20,4) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
   120|  last_payment_at timestamptz,
   121|  
   122|  -- Aging (for credit check)
   123|  aging_days integer GENERATED ALWAYS AS (
   124|    CASE 
   125|      WHEN due_date < CURRENT_DATE THEN CURRENT_DATE - due_date
   126|      ELSE 0
   127|    END
   128|  ) STORED,
   129|  
   130|  -- Notes
   131|  notes text,
   132|  billing_address text,
   133|  
   134|  -- Ownership
   135|  issued_by uuid NOT NULL REFERENCES public.user_profiles(id),
   136|  
   137|  -- Audit
   138|  created_at timestamptz NOT NULL DEFAULT now(),
   139|  updated_at timestamptz NOT NULL DEFAULT now(),
   140|  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
   141|  updated_by uuid REFERENCES public.user_profiles(id),
   142|  deleted_at timestamptz
   143|);
   144|
   145|-- 9.6 Indexes
   146|CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
   147|CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
   148|CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(tenant_id, status) WHERE deleted_at IS NULL;
   149|CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date) WHERE status NOT IN ('paid', 'cancelled');
   150|CREATE INDEX IF NOT EXISTS idx_invoices_aging ON invoices(aging_days) WHERE status = 'overdue';
   151|CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
   152|
   153|-- 9.7 Enable RLS
   154|ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
   155|
   156|-- 9.8 RLS Policies
   157|
   158|-- Finance: full access
   159|DROP POLICY IF EXISTS "finance_manage_invoices" ON public.invoices;
   160|CREATE POLICY "finance_manage_invoices"
   161|  ON public.invoices FOR ALL
   162|  TO authenticated
   163|  USING (
   164|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   165|    AND EXISTS (
   166|      SELECT 1 FROM public.user_profiles up
   167|      JOIN public.roles r ON up.role_id = r.id
   168|      WHERE up.id = auth.uid()
   169|      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
   170|    )
   171|  )
   172|  WITH CHECK (
   173|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   174|    AND EXISTS (
   175|      SELECT 1 FROM public.user_profiles up
   176|      JOIN public.roles r ON up.role_id = r.id
   177|      WHERE up.id = auth.uid()
   178|      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
   179|    )
   180|  );
   181|
   182|-- Commercial: read invoices for their clients
   183|DROP POLICY IF EXISTS "commercial_read_invoices" ON public.invoices;
   184|CREATE POLICY "commercial_read_invoices"
   185|  ON public.invoices FOR SELECT
   186|  TO authenticated
   187|  USING (
   188|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   189|    AND EXISTS (
   190|      SELECT 1 FROM public.user_profiles up
   191|      JOIN public.roles r ON up.role_id = r.id
   192|      WHERE up.id = auth.uid()
   193|      AND r.name IN ('commercial', 'commercial_director')
   194|    )
   195|  );
   196|
   197|-- PM: read invoices for their projects
   198|DROP POLICY IF EXISTS "pm_read_project_invoices" ON public.invoices;
   199|CREATE POLICY "pm_read_project_invoices"
   200|  ON public.invoices FOR SELECT
   201|  TO authenticated
   202|  USING (
   203|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   204|    AND EXISTS (
   205|      SELECT 1 FROM public.user_profiles up
   206|      JOIN public.roles r ON up.role_id = r.id
   207|      WHERE up.id = auth.uid()
   208|      AND r.name IN ('pm', 'pm_lead')
   209|    )
   210|  );
   211|
   212|-- Client: read own invoices only
   213|DROP POLICY IF EXISTS "client_read_own_invoices" ON public.invoices;
   214|CREATE POLICY "client_read_own_invoices"
   215|  ON public.invoices FOR SELECT
   216|  TO authenticated
   217|  USING (
   218|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   219|    AND auth.jwt()->>'role' = 'client'
   220|    AND client_id = (auth.jwt()->>'client_id')::uuid
   221|  );
   222|
   223|-- 9.9 Payments Table (Cash Receipt)
   224|CREATE TABLE IF NOT EXISTS public.payments (
   225|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   226|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
   227|  
   228|  -- Payment number (PMT-YYYY-MM-NNNN)
   229|  payment_number text NOT NULL UNIQUE,
   230|  
   231|  -- Links
   232|  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
   233|  client_id uuid NOT NULL REFERENCES public.clients(id),
   234|  
   235|  -- Payment details
   236|  payment_date date NOT NULL DEFAULT CURRENT_DATE,
   237|  payment_method text NOT NULL CHECK (payment_method IN (
   238|    'bank_transfer', 'cash', 'check', 'credit_card', 'ewallet'
   239|  )),
   240|  bank_account text, -- for transfers
   241|  check_number text, -- for checks
   242|  
   243|  -- Amount
   244|  amount numeric(20,4) NOT NULL,
   245|  currency text NOT NULL DEFAULT 'IDR',
   246|  exchange_rate numeric(10,4) DEFAULT 1, -- for multi-currency
   247|  
   248|  -- Reference
   249|  reference_number text, -- bank reference
   250|  notes text,
   251|  
   252|  -- Reconciliation
   253|  reconciled boolean NOT NULL DEFAULT false,
   254|  reconciled_at timestamptz,
   255|  reconciled_by uuid REFERENCES public.user_profiles(id),
   256|  
   257|  -- Ownership
   258|  received_by uuid NOT NULL REFERENCES public.user_profiles(id),
   259|  
   260|  -- Audit
   261|  created_at timestamptz NOT NULL DEFAULT now(),
   262|  updated_at timestamptz NOT NULL DEFAULT now(),
   263|  created_by uuid NOT NULL REFERENCES public.user_profiles(id),
   264|  updated_by uuid REFERENCES public.user_profiles(id),
   265|  deleted_at timestamptz
   266|);
   267|
   268|-- 9.10 Indexes
   269|CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
   270|CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
   271|CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
   272|CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
   273|CREATE INDEX IF NOT EXISTS idx_payments_reconciled ON payments(tenant_id, reconciled) WHERE deleted_at IS NULL;
   274|
   275|-- 9.11 Enable RLS
   276|ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
   277|
   278|-- 9.12 RLS Policies
   279|
   280|-- Finance: full access
   281|DROP POLICY IF EXISTS "finance_manage_payments" ON public.payments;
   282|CREATE POLICY "finance_manage_payments"
   283|  ON public.payments FOR ALL
   284|  TO authenticated
   285|  USING (
   286|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   287|    AND EXISTS (
   288|      SELECT 1 FROM public.user_profiles up
   289|      JOIN public.roles r ON up.role_id = r.id
   290|      WHERE up.id = auth.uid()
   291|      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
   292|    )
   293|  )
   294|  WITH CHECK (
   295|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   296|    AND EXISTS (
   297|      SELECT 1 FROM public.user_profiles up
   298|      JOIN public.roles r ON up.role_id = r.id
   299|      WHERE up.id = auth.uid()
   300|      AND r.name IN ('finance', 'cfo', 'admin', 'super_admin')
   301|    )
   302|  );
   303|
   304|-- Commercial: read payments
   305|DROP POLICY IF EXISTS "commercial_read_payments" ON public.payments;
   306|CREATE POLICY "commercial_read_payments"
   307|  ON public.payments FOR SELECT
   308|  TO authenticated
   309|  USING (
   310|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   311|    AND EXISTS (
   312|      SELECT 1 FROM public.user_profiles up
   313|      JOIN public.roles r ON up.role_id = r.id
   314|      WHERE up.id = auth.uid()
   315|      AND r.name IN ('commercial', 'commercial_director')
   316|    )
   317|  );
   318|
   319|-- Client: read own payments
   320|DROP POLICY IF EXISTS "client_read_own_payments" ON public.payments;
   321|CREATE POLICY "client_read_own_payments"
   322|  ON public.payments FOR SELECT
   323|  TO authenticated
   324|  USING (
   325|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   326|    AND auth.jwt()->>'role' = 'client'
   327|    AND client_id = (auth.jwt()->>'client_id')::uuid
   328|  );
   329|
   330|-- 9.13 Trigger: Auto-update updated_at
   331|DROP TRIGGER IF EXISTS invoices_updated_at ON invoices;
   332|CREATE TRIGGER invoices_updated_at
   333|  BEFORE UPDATE ON invoices
   334|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
   335|
   336|DROP TRIGGER IF EXISTS payments_updated_at ON payments;
   337|CREATE TRIGGER payments_updated_at
   338|  BEFORE UPDATE ON payments
   339|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
   340|
   341|-- 9.14 Function: Update invoice amount_paid on payment insert
   342|CREATE OR REPLACE FUNCTION public.update_invoice_payment()
   343|RETURNS TRIGGER AS $$
   344|BEGIN
   345|  UPDATE public.invoices
   346|  SET 
   347|    amount_paid = COALESCE(amount_paid, 0) + NEW.amount,
   348|    last_payment_at = NEW.payment_date,
   349|    status = CASE 
   350|      WHEN COALESCE(amount_paid, 0) + NEW.amount >= total_amount THEN 'paid'
   351|      WHEN COALESCE(amount_paid, 0) + NEW.amount > 0 THEN 'partially_paid'
   352|      ELSE status
   353|    END
   354|  WHERE id = NEW.invoice_id;
   355|  
   356|  RETURN NEW;
   357|END;
   358|$$ LANGUAGE plpgsql;
   359|
   360|-- 9.15 Trigger: Auto-update invoice on payment
   361|DROP TRIGGER IF EXISTS payment_updates_invoice ON payments;
   362|CREATE TRIGGER payment_updates_invoice
   363|  AFTER INSERT ON payments
   364|  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_payment();
   365|
   366|-- =====================================================
   367|-- SETUP COMPLETE!
   368|-- =====================================================
   369|


-- =====================================================
-- FILE: 20260418_009_hr_grades_matrix.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-4.0-E: Job Grades & Salary Matrix
     3|-- =====================================================
     4|-- Job grading system + salary steps per grade
     5|-- =====================================================
     6|
     7|-- 4.1 hr_job_grades - Job grade/level definitions
     8|CREATE TABLE IF NOT EXISTS public.hr_job_grades (
     9|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    10|  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    11|  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
    12|  
    13|  code text NOT NULL, -- e.g., "G1", "G2", "M1", "M2", "S1", "S2"
    14|  name text NOT NULL, -- e.g., "Staff", "Senior Staff", "Manager", "Senior Manager"
    15|  
    16|  -- Hierarchy level (lower = higher in hierarchy)
    17|  level integer NOT NULL CHECK (level > 0), -- e.g., 1 = highest (Director), 10 = lowest (Staff)
    18|  
    19|  -- Salary range
    20|  salary_min numeric(20, 4) NOT NULL CHECK (salary_min >= 0),
    21|  salary_mid numeric(20, 4), -- Market midpoint (optional)
    22|  salary_max numeric(20, 4) NOT NULL CHECK (salary_max >= salary_min),
    23|  
    24|  -- Leave quota per year
    25|  leave_quota integer DEFAULT 12, -- Annual leave days
    26|  
    27|  -- Other benefits
    28|  is_overtime_eligible boolean DEFAULT true,
    29|  is_car_allowance_eligible boolean DEFAULT false,
    30|  is_bonus_eligible boolean DEFAULT true,
    31|  
    32|  description text,
    33|  
    34|  created_at timestamptz DEFAULT now(),
    35|  updated_at timestamptz DEFAULT now(),
    36|  
    37|  UNIQUE(tenant_id, entity_id, code)
    38|);
    39|
    40|CREATE INDEX IF NOT EXISTS idx_hr_job_grades_tenant ON public.hr_job_grades(tenant_id);
    41|CREATE INDEX IF NOT EXISTS idx_hr_job_grades_entity ON public.hr_job_grades(entity_id);
    42|CREATE INDEX IF NOT EXISTS idx_hr_job_grades_level ON public.hr_job_grades(level);
    43|
    44|-- Enable RLS
    45|ALTER TABLE public.hr_job_grades ENABLE ROW LEVEL SECURITY;
    46|
    47|-- RLS Policies
    48|DROP POLICY IF EXISTS "Users can view job grades in their tenant" ON public.hr_job_grades;
    49|CREATE POLICY "Users can view job grades in their tenant"
    50|  ON public.hr_job_grades FOR SELECT
    51|  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
    52|
    53|DROP POLICY IF EXISTS "HR admin can manage job grades" ON public.hr_job_grades;
    54|CREATE POLICY "HR admin can manage job grades"
    55|  ON public.hr_job_grades FOR ALL
    56|  USING (
    57|    EXISTS (
    58|      SELECT 1 FROM public.user_roles ur
    59|      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    60|    )
    61|  );
    62|
    63|-- Trigger: Auto-update updated_at
    64|DROP TRIGGER IF EXISTS hr_job_grades_updated_at ON public.hr_job_grades;
    65|CREATE TRIGGER hr_job_grades_updated_at
    66|  BEFORE UPDATE ON public.hr_job_grades
    67|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    68|
    69|-- =====================================================
    70|-- 4.2 hr_salary_matrix - Salary steps per job grade
    71|-- =====================================================
    72|CREATE TABLE IF NOT EXISTS public.hr_salary_matrix (
    73|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    74|  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    75|  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
    76|  
    77|  grade_id uuid REFERENCES public.hr_job_grades(id) ON DELETE CASCADE NOT NULL,
    78|  
    79|  step integer NOT NULL CHECK (step > 0), -- e.g., 1, 2, 3, 4, 5
    80|  amount numeric(20, 4) NOT NULL CHECK (amount >= 0),
    81|  
    82|  effective_date date NOT NULL,
    83|  end_date date, -- NULL = still active
    84|  
    85|  notes text,
    86|  
    87|  created_at timestamptz DEFAULT now(),
    88|  
    89|  UNIQUE(tenant_id, entity_id, grade_id, step, effective_date)
    90|);
    91|
    92|CREATE INDEX IF NOT EXISTS idx_hr_salary_matrix_tenant ON public.hr_salary_matrix(tenant_id);
    93|CREATE INDEX IF NOT EXISTS idx_hr_salary_matrix_entity ON public.hr_salary_matrix(entity_id);
    94|CREATE INDEX IF NOT EXISTS idx_hr_salary_matrix_grade ON public.hr_salary_matrix(grade_id);
    95|CREATE INDEX IF NOT EXISTS idx_hr_salary_matrix_step ON public.hr_salary_matrix(step);
    96|CREATE INDEX IF NOT EXISTS idx_hr_salary_matrix_active ON public.hr_salary_matrix(end_date);
    97|
    98|-- Enable RLS
    99|ALTER TABLE public.hr_salary_matrix ENABLE ROW LEVEL SECURITY;
   100|
   101|-- RLS Policies
   102|DROP POLICY IF EXISTS "Users can view salary matrix in their tenant" ON public.hr_salary_matrix;
   103|CREATE POLICY "Users can view salary matrix in their tenant"
   104|  ON public.hr_salary_matrix FOR SELECT
   105|  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
   106|
   107|DROP POLICY IF EXISTS "HR admin can manage salary matrix" ON public.hr_salary_matrix;
   108|CREATE POLICY "HR admin can manage salary matrix"
   109|  ON public.hr_salary_matrix FOR ALL
   110|  USING (
   111|    EXISTS (
   112|      SELECT 1 FROM public.user_roles ur
   113|      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
   114|    )
   115|  );
   116|
   117|-- =====================================================
   118|-- Seed Data: Default Job Grades (sample structure)
   119|-- =====================================================
   120|
   121|INSERT INTO public.hr_job_grades (code, name, level, salary_min, salary_mid, salary_max, leave_quota, is_overtime_eligible)
   122|VALUES 
   123|  -- Management track
   124|  ('D1', 'Director', 1, 25000000.00, 35000000.00, 50000000.00, 15, false),
   125|  ('M1', 'Manager', 2, 15000000.00, 20000000.00, 30000000.00, 14, false),
   126|  ('M2', 'Senior Manager', 3, 12000000.00, 15000000.00, 20000000.00, 14, false),
   127|  
   128|  -- Professional track
   129|  ('S1', 'Senior Staff', 4, 8000000.00, 10000000.00, 14000000.00, 12, true),
   130|  ('S2', 'Staff', 5, 5500000.00, 7000000.00, 9000000.00, 12, true),
   131|  ('S3', 'Junior Staff', 6, 4500000.00, 5000000.00, 6000000.00, 12, true)
   132|ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;
   133|
   134|-- Note: Above insert requires tenant_id. Run after creating tenant.
   135|
   136|-- =====================================================
   137|-- SETUP COMPLETE!
   138|-- =====================================================
   139|-- Tables created:
   140|-- - hr_job_grades (job levels with salary range)
   141|-- - hr_salary_matrix (salary steps per grade)
   142|-- =====================================================
   143|


-- =====================================================
-- FILE: 20260418_010_create_ticket_support.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-1: Ticket Module (Support & SLA Management)
     3|-- =====================================================
     4|-- Based on USER_STORIES v3.0 § 2.7-2.8 (US-Q2C-008, US-Q2C-009)
     5|-- Ticket intake, SLA monitoring, time logging
     6|-- =====================================================
     7|
     8|-- 10.1 Priority Rules Table (auto-priority calculation)
     9|CREATE TABLE IF NOT EXISTS public.priority_rules (
    10|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    11|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    12|  client_tier text NOT NULL CHECK (client_tier IN ('enterprise', 'mid', 'small')),
    13|  category text NOT NULL CHECK (category IN ('support', 'bug', 'feature_request', 'consultation')),
    14|  impact text NOT NULL CHECK (impact IN ('critical', 'high', 'medium', 'low')),
    15|  urgency text NOT NULL CHECK (urgency IN ('critical', 'high', 'medium', 'low')),
    16|  priority_result text NOT NULL CHECK (priority_result IN ('critical', 'high', 'medium', 'low')),
    17|  sla_response_hours integer NOT NULL,
    18|  sla_resolution_hours integer NOT NULL,
    19|  is_active boolean NOT NULL DEFAULT true,
    20|  created_at timestamptz DEFAULT now(),
    21|  updated_at timestamptz DEFAULT now()
    22|);
    23|
    24|-- 10.2 Seed default priority rules
    25|INSERT INTO public.priority_rules (tenant_id, client_tier, category, impact, urgency, priority_result, sla_response_hours, sla_resolution_hours)
    26|SELECT 
    27|  t.id,
    28|  rule.client_tier,
    29|  rule.category,
    30|  rule.impact,
    31|  rule.urgency,
    32|  rule.priority_result,
    33|  rule.sla_response_hours,
    34|  rule.sla_resolution_hours
    35|FROM public.tenants t
    36|CROSS JOIN (
    37|  -- Enterprise clients
    38|  ('enterprise', 'bug', 'critical', 'critical', 'critical', 2, 8),
    39|  ('enterprise', 'bug', 'critical', 'high', 'critical', 4, 12),
    40|  ('enterprise', 'bug', 'high', 'high', 'high', 8, 24),
    41|  ('enterprise', 'support', 'medium', 'medium', 'medium', 24, 72),
    42|  -- Mid clients
    43|  ('mid', 'bug', 'critical', 'critical', 'critical', 4, 12),
    44|  ('mid', 'bug', 'high', 'high', 'high', 8, 24),
    45|  ('mid', 'support', 'medium', 'medium', 'medium', 24, 72),
    46|  -- Small clients
    47|  ('small', 'bug', 'critical', 'critical', 'high', 8, 24),
    48|  ('small', 'support', 'medium', 'medium', 'medium', 48, 120)
    49|) AS rule(client_tier, category, impact, urgency, priority_result, sla_response_hours, sla_resolution_hours)
    50|ON CONFLICT DO NOTHING;
    51|
    52|-- 10.3 Billing Rules Table (ticket billing logic)
    53|CREATE TABLE IF NOT EXISTS public.billing_rules (
    54|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    55|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    56|  ticket_category text NOT NULL CHECK (ticket_category IN ('support', 'bug', 'feature_request', 'consultation')),
    57|  client_tier text, -- NULL = applies to all tiers
    58|  billing_type text NOT NULL CHECK (billing_type IN ('warranty', 'retainer', 'ad_hoc', 'contract_covered', 'courtesy')),
    59|  hourly_rate numeric(20,4),
    60|  minimum_hours numeric(6,2) DEFAULT 1,
    61|  is_active boolean NOT NULL DEFAULT true,
    62|  created_at timestamptz DEFAULT now(),
    63|  updated_at timestamptz DEFAULT now()
    64|);
    65|
    66|-- 10.4 Tickets Table (core support entity)
    67|CREATE TABLE IF NOT EXISTS public.tickets (
    68|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    69|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    70|  entity_id uuid REFERENCES public.entities(id),
    71|  
    72|  -- Ticket number (TKT-YYYY-MM-NNNN)
    73|  ticket_number text NOT NULL UNIQUE,
    74|  
    75|  -- Links
    76|  client_id uuid NOT NULL REFERENCES public.clients(id),
    77|  submitted_by uuid REFERENCES public.user_profiles(id),
    78|  project_id uuid, -- will link to projects table
    79|  quotation_id uuid REFERENCES public.quotations(id),
    80|  
    81|  -- Channel
    82|  channel text NOT NULL CHECK (channel IN ('portal', 'email', 'whatsapp', 'phone')),
    83|  channel_reference text, -- email message_id, WhatsApp message ID
    84|  
    85|  -- Content
    86|  subject text NOT NULL,
    87|  description text NOT NULL,
    88|  category text NOT NULL CHECK (category IN ('support', 'bug', 'feature_request', 'consultation')),
    89|  category_auto boolean DEFAULT false, -- auto-categorized by AI
    90|  
    91|  -- Priority
    92|  priority text NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    93|  priority_score integer CHECK (priority_score BETWEEN 0 AND 100),
    94|  priority_auto boolean DEFAULT false, -- auto-calculated
    95|  
    96|  -- Impact & Urgency (for priority calculation)
    97|  impact text CHECK (impact IN ('critical', 'high', 'medium', 'low')),
    98|  urgency text CHECK (urgency IN ('critical', 'high', 'medium', 'low')),
    99|  
   100|  -- Status workflow
   101|  status text NOT NULL DEFAULT 'submitted' CHECK (status IN (
   102|    'submitted', 'in_triage', 'triaged', 'in_progress',
   103|    'waiting_client_info', 'waiting_client_approval',
   104|    'delivered', 'approved', 'rejected', 'resolved',
   105|    'auto_closed', 'converted_to_addendum'
   106|  )),
   107|  
   108|  -- Assignment
   109|  pic_commercial_id uuid REFERENCES public.user_profiles(id), -- triage owner
   110|  pm_id uuid REFERENCES public.user_profiles(id), -- execution owner
   111|  developer_id uuid REFERENCES public.user_profiles(id),
   112|  
   113|  -- SLA tracking
   114|  response_sla_deadline timestamptz,
   115|  response_sla_met_at timestamptz,
   116|  resolution_sla_deadline timestamptz,
   117|  resolution_sla_met_at timestamptz,
   118|  sla_paused boolean NOT NULL DEFAULT false,
   119|  sla_paused_at timestamptz,
   120|  sla_pause_reason text,
   121|  total_paused_duration interval DEFAULT '0'::interval,
   122|  sla_breached boolean NOT NULL DEFAULT false,
   123|  sla_breached_at timestamptz,
   124|  
   125|  -- Effort & billing
   126|  estimated_hours numeric(6,2),
   127|  actual_hours numeric(6,2) DEFAULT 0,
   128|  billable boolean,
   129|  billing_reason text CHECK (billing_reason IN (
   130|    'warranty', 'retainer', 'ad_hoc', 'contract_covered', 'courtesy'
   131|  )),
   132|  invoice_id uuid, -- will link to invoices
   133|  
   134|  -- Conversion
   135|  converted_to_project_id uuid, -- if converted to project
   136|  source_quotation_id uuid REFERENCES public.quotations(id),
   137|  
   138|  -- Satisfaction
   139|  csat_rating integer CHECK (csat_rating BETWEEN 1 AND 5),
   140|  csat_comment text,
   141|  csat_submitted_at timestamptz,
   142|  
   143|  -- Metadata
   144|  tags text[],
   145|  custom_fields jsonb DEFAULT '{}'::jsonb,
   146|  
   147|  -- Audit
   148|  created_at timestamptz NOT NULL DEFAULT now(),
   149|  updated_at timestamptz NOT NULL DEFAULT now(),
   150|  created_by uuid REFERENCES public.user_profiles(id),
   151|  updated_by uuid REFERENCES public.user_profiles(id),
   152|  deleted_at timestamptz
   153|);
   154|
   155|-- 10.5 Indexes
   156|CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON tickets(tenant_id);
   157|CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(tenant_id, status) WHERE deleted_at IS NULL;
   158|CREATE INDEX IF NOT EXISTS idx_tickets_client ON tickets(client_id) WHERE deleted_at IS NULL;
   159|CREATE INDEX IF NOT EXISTS idx_tickets_pm_active ON tickets(pm_id) 
   160|  WHERE status IN ('triaged', 'in_progress') AND deleted_at IS NULL;
   161|CREATE INDEX IF NOT EXISTS idx_tickets_sla_response ON tickets(response_sla_deadline) 
   162|  WHERE sla_breached = false AND sla_paused = false AND deleted_at IS NULL;
   163|CREATE INDEX IF NOT EXISTS idx_tickets_sla_resolution ON tickets(resolution_sla_deadline) 
   164|  WHERE sla_breached = false AND sla_paused = false AND deleted_at IS NULL;
   165|CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets(ticket_number);
   166|
   167|-- 10.6 Enable RLS
   168|ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
   169|
   170|-- 10.7 RLS Policies
   171|
   172|-- Commercial: full tenant access (triage owner)
   173|DROP POLICY IF EXISTS "commercial_manage_tickets" ON public.tickets;
   174|CREATE POLICY "commercial_manage_tickets"
   175|  ON public.tickets FOR ALL
   176|  TO authenticated
   177|  USING (
   178|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   179|    AND EXISTS (
   180|      SELECT 1 FROM public.user_profiles up
   181|      JOIN public.roles r ON up.role_id = r.id
   182|      WHERE up.id = auth.uid()
   183|      AND r.name IN ('commercial', 'commercial_director', 'admin', 'super_admin')
   184|    )
   185|  )
   186|  WITH CHECK (
   187|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   188|    AND EXISTS (
   189|      SELECT 1 FROM public.user_profiles up
   190|      JOIN public.roles r ON up.role_id = r.id
   191|      WHERE up.id = auth.uid()
   192|      AND r.name IN ('commercial', 'commercial_director', 'admin', 'super_admin')
   193|    )
   194|  );
   195|
   196|-- PM: read all tenant, update only assigned
   197|DROP POLICY IF EXISTS "pm_read_tickets" ON public.tickets;
   198|CREATE POLICY "pm_read_tickets"
   199|  ON public.tickets FOR SELECT
   200|  TO authenticated
   201|  USING (
   202|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   203|    AND EXISTS (
   204|      SELECT 1 FROM public.user_profiles up
   205|      JOIN public.roles r ON up.role_id = r.id
   206|      WHERE up.id = auth.uid()
   207|      AND r.name IN ('pm', 'pm_lead')
   208|    )
   209|  );
   210|
   211|DROP POLICY IF EXISTS "pm_update_assigned_tickets" ON public.tickets;
   212|CREATE POLICY "pm_update_assigned_tickets"
   213|  ON public.tickets FOR UPDATE
   214|  TO authenticated
   215|  USING (
   216|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   217|    AND pm_id = auth.uid()
   218|  )
   219|  WITH CHECK (
   220|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   221|    AND pm_id = auth.uid()
   222|  );
   223|
   224|-- Developer: read + update only assigned tickets
   225|DROP POLICY IF EXISTS "developer_read_assigned_tickets" ON public.tickets;
   226|CREATE POLICY "developer_read_assigned_tickets"
   227|  ON public.tickets FOR SELECT
   228|  TO authenticated
   229|  USING (
   230|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   231|    AND EXISTS (
   232|      SELECT 1 FROM public.user_profiles up
   233|      JOIN public.roles r ON up.role_id = r.id
   234|      WHERE up.id = auth.uid()
   235|      AND r.name IN ('developer')
   236|    )
   237|    AND (pm_id = auth.uid() OR developer_id = auth.uid())
   238|  );
   239|
   240|DROP POLICY IF EXISTS "developer_update_assigned_tickets" ON public.tickets;
   241|CREATE POLICY "developer_update_assigned_tickets"
   242|  ON public.tickets FOR UPDATE
   243|  TO authenticated
   244|  USING (
   245|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   246|    AND developer_id = auth.uid()
   247|  )
   248|  WITH CHECK (
   249|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   250|    AND developer_id = auth.uid()
   251|  );
   252|
   253|-- CFO: read all for billing visibility
   254|DROP POLICY IF EXISTS "cfo_read_tickets" ON public.tickets;
   255|CREATE POLICY "cfo_read_tickets"
   256|  ON public.tickets FOR SELECT
   257|  TO authenticated
   258|  USING (
   259|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   260|    AND EXISTS (
   261|      SELECT 1 FROM public.user_profiles up
   262|      JOIN public.roles r ON up.role_id = r.id
   263|      WHERE up.id = auth.uid()
   264|      AND r.name IN ('cfo', 'finance')
   265|    )
   266|  );
   267|
   268|-- Client: read + insert own tickets
   269|DROP POLICY IF EXISTS "client_read_own_tickets" ON public.tickets;
   270|CREATE POLICY "client_read_own_tickets"
   271|  ON public.tickets FOR SELECT
   272|  TO authenticated
   273|  USING (
   274|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   275|    AND auth.jwt()->>'role' = 'client'
   276|    AND client_id = (auth.jwt()->>'client_id')::uuid
   277|  );
   278|
   279|DROP POLICY IF EXISTS "client_insert_own_tickets" ON public.tickets;
   280|CREATE POLICY "client_insert_own_tickets"
   281|  ON public.tickets FOR INSERT
   282|  TO authenticated
   283|  WITH CHECK (
   284|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   285|    AND auth.jwt()->>'role' = 'client'
   286|    AND client_id = (auth.jwt()->>'client_id')::uuid
   287|  );
   288|
   289|-- 10.8 Ticket Tasks Table (internal work breakdown)
   290|CREATE TABLE IF NOT EXISTS public.ticket_tasks (
   291|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   292|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
   293|  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
   294|  
   295|  -- Task details
   296|  title text NOT NULL,
   297|  description text,
   298|  task_type text CHECK (task_type IN ('development', 'testing', 'documentation', 'deployment', 'other')),
   299|  
   300|  -- Assignment
   301|  assigned_to uuid REFERENCES public.user_profiles(id),
   302|  
   303|  -- Status
   304|  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
   305|  
   306|  -- Effort
   307|  estimated_hours numeric(6,2),
   308|  actual_hours numeric(6,2) DEFAULT 0,
   309|  
   310|  -- Dependencies
   311|  depends_on uuid[], -- array of ticket_task ids
   312|  
   313|  -- Audit
   314|  created_at timestamptz DEFAULT now(),
   315|  updated_at timestamptz DEFAULT now(),
   316|  created_by uuid REFERENCES public.user_profiles(id),
   317|  completed_at timestamptz,
   318|  deleted_at timestamptz
   319|);
   320|
   321|-- 10.9 Indexes
   322|CREATE INDEX IF NOT EXISTS idx_ticket_tasks_tenant ON ticket_tasks(tenant_id);
   323|CREATE INDEX IF NOT EXISTS idx_ticket_tasks_ticket ON ticket_tasks(ticket_id);
   324|CREATE INDEX IF NOT EXISTS idx_ticket_tasks_assigned ON ticket_tasks(assigned_to);
   325|CREATE INDEX IF NOT EXISTS idx_ticket_tasks_status ON ticket_tasks(status) WHERE deleted_at IS NULL;
   326|
   327|-- 10.10 Enable RLS
   328|ALTER TABLE public.ticket_tasks ENABLE ROW LEVEL SECURITY;
   329|
   330|-- 10.11 RLS Policies for Ticket Tasks
   331|
   332|-- PM: full access to tasks for their tickets
   333|DROP POLICY IF EXISTS "pm_manage_ticket_tasks" ON public.ticket_tasks;
   334|CREATE POLICY "pm_manage_ticket_tasks"
   335|  ON public.ticket_tasks FOR ALL
   336|  TO authenticated
   337|  USING (
   338|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   339|    AND EXISTS (
   340|      SELECT 1 FROM public.tickets t
   341|      WHERE t.id = ticket_id
   342|      AND t.pm_id = auth.uid()
   343|    )
   344|    AND EXISTS (
   345|      SELECT 1 FROM public.user_profiles up
   346|      JOIN public.roles r ON up.role_id = r.id
   347|      WHERE up.id = auth.uid()
   348|      AND r.name IN ('pm', 'pm_lead')
   349|    )
   350|  )
   351|  WITH CHECK (
   352|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   353|    AND EXISTS (
   354|      SELECT 1 FROM public.tickets t
   355|      WHERE t.id = ticket_id
   356|      AND t.pm_id = auth.uid()
   357|    )
   358|    AND EXISTS (
   359|      SELECT 1 FROM public.user_profiles up
   360|      JOIN public.roles r ON up.role_id = r.id
   361|      WHERE up.id = auth.uid()
   362|      AND r.name IN ('pm', 'pm_lead')
   363|    )
   364|  );
   365|
   366|-- Developer: read + update own assigned tasks
   367|DROP POLICY IF EXISTS "developer_read_ticket_tasks" ON public.ticket_tasks;
   368|CREATE POLICY "developer_read_ticket_tasks"
   369|  ON public.ticket_tasks FOR SELECT
   370|  TO authenticated
   371|  USING (
   372|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   373|    AND EXISTS (
   374|      SELECT 1 FROM public.user_profiles up
   375|      JOIN public.roles r ON up.role_id = r.id
   376|      WHERE up.id = auth.uid()
   377|      AND r.name IN ('developer')
   378|    )
   379|    AND (assigned_to = auth.uid() OR EXISTS (
   380|      SELECT 1 FROM public.tickets t
   381|      WHERE t.id = ticket_id
   382|      AND t.developer_id = auth.uid()
   383|    ))
   384|  );
   385|
   386|DROP POLICY IF EXISTS "developer_update_own_ticket_tasks" ON public.ticket_tasks;
   387|CREATE POLICY "developer_update_own_ticket_tasks"
   388|  ON public.ticket_tasks FOR UPDATE
   389|  TO authenticated
   390|  USING (
   391|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   392|    AND assigned_to = auth.uid()
   393|  )
   394|  WITH CHECK (
   395|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   396|    AND assigned_to = auth.uid()
   397|  );
   398|
   399|-- 10.12 Ticket Time Logs Table (effort tracking)
   400|CREATE TABLE IF NOT EXISTS public.ticket_time_logs (
   401|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   402|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
   403|  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
   404|  ticket_task_id uuid REFERENCES public.ticket_tasks(id) ON DELETE SET NULL,
   405|  
   406|  -- Time entry
   407|  started_at timestamptz NOT NULL,
   408|  ended_at timestamptz,
   409|  duration_minutes integer NOT NULL,
   410|  duration_hours numeric(6,2) GENERATED ALWAYS AS (duration_minutes / 60.0) STORED,
   411|  
   412|  -- Activity
   413|  activity_type text CHECK (activity_type IN (
   414|    'development', 'testing', 'debugging', 'meeting', 'documentation', 
   415|    'code_review', 'deployment', 'research'
   416|  )),
   417|  description text,
   418|  
   419|  -- Billable
   420|  billable boolean NOT NULL DEFAULT true,
   421|  
   422|  -- Ownership
   423|  user_id uuid NOT NULL REFERENCES public.user_profiles(id),
   424|  
   425|  -- Audit
   426|  created_at timestamptz DEFAULT now(),
   427|  updated_at timestamptz DEFAULT now(),
   428|  deleted_at timestamptz
   429|);
   430|
   431|-- 10.13 Indexes
   432|CREATE INDEX IF NOT EXISTS idx_ticket_time_logs_tenant ON ticket_time_logs(tenant_id);
   433|CREATE INDEX IF NOT EXISTS idx_ticket_time_logs_ticket ON ticket_time_logs(ticket_id);
   434|CREATE INDEX IF NOT EXISTS idx_ticket_time_logs_user ON ticket_time_logs(user_id);
   435|CREATE INDEX IF NOT EXISTS idx_ticket_time_logs_date ON ticket_time_logs(started_at);
   436|
   437|-- 10.14 Enable RLS
   438|ALTER TABLE public.ticket_time_logs ENABLE ROW LEVEL SECURITY;
   439|
   440|-- 10.15 RLS Policies for Time Logs
   441|
   442|-- PM: read all time logs for their tickets
   443|DROP POLICY IF EXISTS "pm_read_ticket_time_logs" ON public.ticket_time_logs;
   444|CREATE POLICY "pm_read_ticket_time_logs"
   445|  ON public.ticket_time_logs FOR SELECT
   446|  TO authenticated
   447|  USING (
   448|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   449|    AND EXISTS (
   450|      SELECT 1 FROM public.tickets t
   451|      WHERE t.id = ticket_id
   452|      AND t.pm_id = auth.uid()
   453|    )
   454|    AND EXISTS (
   455|      SELECT 1 FROM public.user_profiles up
   456|      JOIN public.roles r ON up.role_id = r.id
   457|      WHERE up.id = auth.uid()
   458|      AND r.name IN ('pm', 'pm_lead')
   459|    )
   460|  );
   461|
   462|-- Developer: read + insert own time logs
   463|DROP POLICY IF EXISTS "developer_read_own_time_logs" ON public.ticket_time_logs;
   464|CREATE POLICY "developer_read_own_time_logs"
   465|  ON public.ticket_time_logs FOR SELECT
   466|  TO authenticated
   467|  USING (
   468|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   469|    AND user_id = auth.uid()
   470|  );
   471|
   472|DROP POLICY IF EXISTS "developer_insert_time_logs" ON public.ticket_time_logs;
   473|CREATE POLICY "developer_insert_time_logs"
   474|  ON public.ticket_time_logs FOR INSERT
   475|  TO authenticated
   476|  WITH CHECK (
   477|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   478|    AND user_id = auth.uid()
   479|  );
   480|
   481|-- Finance: read all for billing
   482|DROP POLICY IF EXISTS "finance_read_ticket_time_logs" ON public.ticket_time_logs;
   483|CREATE POLICY "finance_read_ticket_time_logs"
   484|  ON public.ticket_time_logs FOR SELECT
   485|  TO authenticated
   486|  USING (
   487|    tenant_id = (auth.jwt()->>'tenant_id')::uuid
   488|    AND EXISTS (
   489|      SELECT 1 FROM public.user_profiles up
   490|      JOIN public.roles r ON up.role_id = r.id
   491|      WHERE up.id = auth.uid()
   492|      AND r.name IN ('finance', 'cfo')
   493|    )
   494|  );
   495|
   496|-- 10.16 Ticket Comments Table (communication thread)
   497|CREATE TABLE IF NOT EXISTS public.ticket_comments (
   498|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   499|  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
   500|  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
   501|


-- =====================================================
-- FILE: 20260418_010_hr_org_structure.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-4.0-F: Organization Structure
     3|-- =====================================================
     4|-- Departments (hierarchical) + Positions
     5|-- Requires: entities table (FASE-0) ✅
     6|-- =====================================================
     7|
     8|-- 5.1 hr_departments - Department structure (nested)
     9|CREATE TABLE IF NOT EXISTS public.hr_departments (
    10|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    11|  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    12|  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
    13|  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
    14|  
    15|  -- Hierarchy
    16|  parent_id uuid REFERENCES public.hr_departments(id) ON DELETE SET NULL, -- nested departments
    17|  code text NOT NULL, -- e.g., "HR", "FIN", "IT", "OPS"
    18|  name text NOT NULL, -- e.g., "Human Resources", "Finance", "Information Technology"
    19|  
    20|  -- Department head
    21|  head_user_id uuid REFERENCES auth.users(id), -- User who leads this department
    22|  
    23|  -- Contact info
    24|  email text,
    25|  phone text,
    26|  
    27|  -- Status
    28|  is_active boolean DEFAULT true,
    29|  
    30|  -- Cost center (for finance integration)
    31|  cost_center_code text,
    32|  
    33|  description text,
    34|  
    35|  created_at timestamptz DEFAULT now(),
    36|  updated_at timestamptz DEFAULT now(),
    37|  
    38|  UNIQUE(tenant_id, entity_id, code)
    39|);
    40|
    41|CREATE INDEX IF NOT EXISTS idx_hr_departments_tenant ON public.hr_departments(tenant_id);
    42|CREATE INDEX IF NOT EXISTS idx_hr_departments_entity ON public.hr_departments(entity_id);
    43|CREATE INDEX IF NOT EXISTS idx_hr_departments_branch ON public.hr_departments(branch_id);
    44|CREATE INDEX IF NOT EXISTS idx_hr_departments_parent ON public.hr_departments(parent_id);
    45|CREATE INDEX IF NOT EXISTS idx_hr_departments_active ON public.hr_departments(is_active);
    46|
    47|-- Enable RLS
    48|ALTER TABLE public.hr_departments ENABLE ROW LEVEL SECURITY;
    49|
    50|-- RLS Policies
    51|DROP POLICY IF EXISTS "Users can view departments in their tenant" ON public.hr_departments;
    52|CREATE POLICY "Users can view departments in their tenant"
    53|  ON public.hr_departments FOR SELECT
    54|  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
    55|
    56|DROP POLICY IF EXISTS "HR admin can manage departments" ON public.hr_departments;
    57|CREATE POLICY "HR admin can manage departments"
    58|  ON public.hr_departments FOR ALL
    59|  USING (
    60|    EXISTS (
    61|      SELECT 1 FROM public.user_roles ur
    62|      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    63|    )
    64|  );
    65|
    66|-- Trigger: Auto-update updated_at
    67|DROP TRIGGER IF EXISTS hr_departments_updated_at ON public.hr_departments;
    68|CREATE TRIGGER hr_departments_updated_at
    69|  BEFORE UPDATE ON public.hr_departments
    70|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    71|
    72|-- =====================================================
    73|-- 5.2 hr_positions - Position catalog
    74|-- =====================================================
    75|CREATE TABLE IF NOT EXISTS public.hr_positions (
    76|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    77|  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    78|  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
    79|  
    80|  -- Position details
    81|  code text NOT NULL, -- e.g., "HR-MGR", "FIN-SPV", "IT-DEV"
    82|  name text NOT NULL, -- e.g., "HR Manager", "Finance Supervisor", "Software Developer"
    83|  
    84|  -- Organization links
    85|  department_id uuid REFERENCES public.hr_departments(id) ON DELETE SET NULL,
    86|  grade_id uuid REFERENCES public.hr_job_grades(id) ON DELETE SET NULL,
    87|  
    88|  -- Reporting line
    89|  reports_to_id uuid REFERENCES public.hr_positions(id) ON DELETE SET NULL, -- position this reports to
    90|  
    91|  -- Headcount
    92|  headcount_planned integer DEFAULT 1,
    93|  headcount_current integer DEFAULT 0,
    94|  
    95|  -- Requirements
    96|  is_critical boolean DEFAULT false, -- Critical position (succession planning)
    97|  is_vacant boolean DEFAULT false, -- Currently no incumbent
    98|  
    99|  -- Job info
   100|  job_description text,
   101|  requirements text, -- Qualifications, skills, experience
   102|  
   103|  -- Status
   104|  is_active boolean DEFAULT true,
   105|  
   106|  created_at timestamptz DEFAULT now(),
   107|  updated_at timestamptz DEFAULT now(),
   108|  
   109|  UNIQUE(tenant_id, entity_id, code)
   110|);
   111|
   112|CREATE INDEX IF NOT EXISTS idx_hr_positions_tenant ON public.hr_positions(tenant_id);
   113|CREATE INDEX IF NOT EXISTS idx_hr_positions_entity ON public.hr_positions(entity_id);
   114|CREATE INDEX IF NOT EXISTS idx_hr_positions_department ON public.hr_positions(department_id);
   115|CREATE INDEX IF NOT EXISTS idx_hr_positions_grade ON public.hr_positions(grade_id);
   116|CREATE INDEX IF NOT EXISTS idx_hr_positions_reports ON public.hr_positions(reports_to_id);
   117|CREATE INDEX IF NOT EXISTS idx_hr_positions_active ON public.hr_positions(is_active);
   118|CREATE INDEX IF NOT EXISTS idx_hr_positions_vacant ON public.hr_positions(is_vacant);
   119|
   120|-- Enable RLS
   121|ALTER TABLE public.hr_positions ENABLE ROW LEVEL SECURITY;
   122|
   123|-- RLS Policies
   124|DROP POLICY IF EXISTS "Users can view positions in their tenant" ON public.hr_positions;
   125|CREATE POLICY "Users can view positions in their tenant"
   126|  ON public.hr_positions FOR SELECT
   127|  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
   128|
   129|DROP POLICY IF EXISTS "HR admin can manage positions" ON public.hr_positions;
   130|CREATE POLICY "HR admin can manage positions"
   131|  ON public.hr_positions FOR ALL
   132|  USING (
   133|    EXISTS (
   134|      SELECT 1 FROM public.user_roles ur
   135|      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
   136|    )
   137|  );
   138|
   139|-- Trigger: Auto-update updated_at
   140|DROP TRIGGER IF EXISTS hr_positions_updated_at ON public.hr_positions;
   141|CREATE TRIGGER hr_positions_updated_at
   142|  BEFORE UPDATE ON public.hr_positions
   143|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
   144|
   145|-- =====================================================
   146|-- Seed Data: Sample Departments & Positions
   147|-- =====================================================
   148|
   149|-- Departments (under demo entity)
   150|INSERT INTO public.hr_departments (entity_id, code, name, cost_center_code)
   151|SELECT 
   152|  '30000000-0000-0000-0000-000000000001' as entity_id, -- Human Capital Division
   153|  dept_code,
   154|  dept_name,
   155|  cost_code
   156|FROM (VALUES
   157|  ('HR', 'Human Resources', 'CC-HR-001'),
   158|  ('GA', 'General Affairs', 'CC-GA-001'),
   159|  ('FIN', 'Finance & Accounting', 'CC-FIN-001'),
   160|  ('IT', 'Information Technology', 'CC-IT-001'),
   161|  ('OPS', 'Operations', 'CC-OPS-001')
   162|) AS depts(dept_code, dept_name, cost_code)
   163|ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;
   164|
   165|-- Positions (sample)
   166|INSERT INTO public.hr_positions (entity_id, department_id, code, name, grade_id, headcount_planned, is_critical)
   167|SELECT 
   168|  '20000000-0000-0000-0000-000000000001' as entity_id, -- PT W-System Indonesia
   169|  (SELECT id FROM hr_departments WHERE code = 'HR' LIMIT 1) as department_id,
   170|  pos_code,
   171|  pos_name,
   172|  (SELECT id FROM hr_job_grades WHERE code = pos_grade LIMIT 1) as grade_id,
   173|  hc_planned,
   174|  is_crit
   175|FROM (VALUES
   176|  ('HR-MGR', 'HR Manager', 'M1', 1, true),
   177|  ('HR-SPV', 'HR Supervisor', 'S1', 1, false),
   178|  ('HR-STF', 'HR Staff', 'S2', 2, false),
   179|  ('GA-MGR', 'GA Manager', 'M1', 1, false),
   180|  ('GA-STF', 'GA Staff', 'S2', 2, false)
   181|) AS positions(pos_code, pos_name, pos_grade, hc_planned, is_crit)
   182|ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;
   183|
   184|-- Note: Above inserts require tenant_id. Run after creating tenant.
   185|
   186|-- =====================================================
   187|-- SETUP COMPLETE!
   188|-- =====================================================
   189|-- Tables created:
   190|-- - hr_departments (nested org structure)
   191|-- - hr_positions (position catalog with headcount)
   192|-- =====================================================
   193|


-- =====================================================
-- FILE: 20260418_011_hr_work_areas_ot.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-4.0-G: Work Areas & Overtime Rules
     3|-- =====================================================
     4|-- Work area definitions + overtime calculation rules
     5|-- =====================================================
     6|
     7|-- 6.1 hr_work_areas - Work location/area definitions
     8|CREATE TABLE IF NOT EXISTS public.hr_work_areas (
     9|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    10|  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    11|  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
    12|  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
    13|  
    14|  code text NOT NULL, -- e.g., "WH-01", "OFF-HR", "SITE-A"
    15|  name text NOT NULL, -- e.g., "Warehouse 1", "HR Office", "Construction Site A"
    16|  
    17|  -- Location reference
    18|  city_id uuid REFERENCES public.regions(id), -- Reference to cities in regions table
    19|  
    20|  -- Work area type
    21|  area_type text NOT NULL CHECK (area_type IN ('office', 'warehouse', 'site', 'remote', 'client')),
    22|  
    23|  -- Address details
    24|  address_line1 text,
    25|  address_line2 text,
    26|  postal_code text,
    27|  
    28|  -- Contact person at this location
    29|  contact_name text,
    30|  contact_phone text,
    31|  
    32|  -- Status
    33|  is_active boolean DEFAULT true,
    34|  
    35|  created_at timestamptz DEFAULT now(),
    36|  updated_at timestamptz DEFAULT now(),
    37|  
    38|  UNIQUE(tenant_id, entity_id, code)
    39|);
    40|
    41|CREATE INDEX IF NOT EXISTS idx_hr_work_areas_tenant ON public.hr_work_areas(tenant_id);
    42|CREATE INDEX IF NOT EXISTS idx_hr_work_areas_entity ON public.hr_work_areas(entity_id);
    43|CREATE INDEX IF NOT EXISTS idx_hr_work_areas_branch ON public.hr_work_areas(branch_id);
    44|CREATE INDEX IF NOT EXISTS idx_hr_work_areas_city ON public.hr_work_areas(city_id);
    45|CREATE INDEX IF NOT EXISTS idx_hr_work_areas_type ON public.hr_work_areas(area_type);
    46|CREATE INDEX IF NOT EXISTS idx_hr_work_areas_active ON public.hr_work_areas(is_active);
    47|
    48|-- Enable RLS
    49|ALTER TABLE public.hr_work_areas ENABLE ROW LEVEL SECURITY;
    50|
    51|-- RLS Policies
    52|DROP POLICY IF EXISTS "Users can view work areas in their tenant" ON public.hr_work_areas;
    53|CREATE POLICY "Users can view work areas in their tenant"
    54|  ON public.hr_work_areas FOR SELECT
    55|  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
    56|
    57|DROP POLICY IF EXISTS "HR admin can manage work areas" ON public.hr_work_areas;
    58|CREATE POLICY "HR admin can manage work areas"
    59|  ON public.hr_work_areas FOR ALL
    60|  USING (
    61|    EXISTS (
    62|      SELECT 1 FROM public.user_roles ur
    63|      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    64|    )
    65|  );
    66|
    67|-- Trigger: Auto-update updated_at
    68|DROP TRIGGER IF EXISTS hr_work_areas_updated_at ON public.hr_work_areas;
    69|CREATE TRIGGER hr_work_areas_updated_at
    70|  BEFORE UPDATE ON public.hr_work_areas
    71|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    72|
    73|-- =====================================================
    74|-- 6.2 hr_overtime_rules - Overtime calculation rules
    75|-- =====================================================
    76|CREATE TABLE IF NOT EXISTS public.hr_overtime_rules (
    77|  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    78|  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    79|  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE,
    80|  
    81|  -- Rule classification
    82|  code text NOT NULL, -- e.g., "OT-WEEKDAY", "OT-WEEKEND", "OT-HOLIDAY"
    83|  name text NOT NULL, -- e.g., "Weekday Overtime", "Weekend Overtime"
    84|  
    85|  -- Day type
    86|  day_type text NOT NULL CHECK (day_type IN ('weekday', 'weekend', 'public_holiday', 'national_holiday')),
    87|  
    88|  -- Time-based rules (hour of day)
    89|  start_hour integer CHECK (start_hour >= 0 AND start_hour <= 23), -- e.g., 17 = 5 PM
    90|  end_hour integer CHECK (end_hour >= 0 AND end_hour <= 23), -- e.g., 21 = 9 PM
    91|  
    92|  -- Overtime multiplier (based on Indonesian labor law)
    93|  -- Hour 1: 1.5x, Hour 2+: 2x for weekday
    94|  -- Weekend/holiday: different rates
    95|  first_hour_multiplier numeric(5, 2) DEFAULT 1.50 CHECK (first_hour_multiplier >= 1.0),
    96|  subsequent_hour_multiplier numeric(5, 2) DEFAULT 2.00 CHECK (subsequent_hour_multiplier >= 1.0),
    97|  
    98|  -- Max overtime per day/month
    99|  max_hours_per_day numeric(4, 2) DEFAULT 4.00,
   100|  max_hours_per_month numeric(4, 2) DEFAULT 60.00,
   101|  
   102|  -- Approval requirements
   103|  requires_approval boolean DEFAULT true,
   104|  approval_level text DEFAULT 'supervisor', -- supervisor, manager, hr
   105|  
   106|  -- Effective period
   107|  effective_date date NOT NULL DEFAULT CURRENT_DATE,
   108|  end_date date,
   109|  
   110|  -- Status
   111|  is_active boolean DEFAULT true,
   112|  
   113|  description text,
   114|  
   115|  created_at timestamptz DEFAULT now(),
   116|  updated_at timestamptz DEFAULT now(),
   117|  
   118|  UNIQUE(tenant_id, entity_id, code)
   119|);
   120|
   121|CREATE INDEX IF NOT EXISTS idx_hr_overtime_rules_tenant ON public.hr_overtime_rules(tenant_id);
   122|CREATE INDEX IF NOT EXISTS idx_hr_overtime_rules_entity ON public.hr_overtime_rules(entity_id);
   123|CREATE INDEX IF NOT EXISTS idx_hr_overtime_rules_day_type ON public.hr_overtime_rules(day_type);
   124|CREATE INDEX IF NOT EXISTS idx_hr_overtime_rules_active ON public.hr_overtime_rules(is_active);
   125|
   126|-- Enable RLS
   127|ALTER TABLE public.hr_overtime_rules ENABLE ROW LEVEL SECURITY;
   128|
   129|-- RLS Policies
   130|DROP POLICY IF EXISTS "Users can view overtime rules in their tenant" ON public.hr_overtime_rules;
   131|CREATE POLICY "Users can view overtime rules in their tenant"
   132|  ON public.hr_overtime_rules FOR SELECT
   133|  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);
   134|
   135|DROP POLICY IF EXISTS "HR admin can manage overtime rules" ON public.hr_overtime_rules;
   136|CREATE POLICY "HR admin can manage overtime rules"
   137|  ON public.hr_overtime_rules FOR ALL
   138|  USING (
   139|    EXISTS (
   140|      SELECT 1 FROM public.user_roles ur
   141|      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
   142|    )
   143|  );
   144|
   145|-- Trigger: Auto-update updated_at
   146|DROP TRIGGER IF EXISTS hr_overtime_rules_updated_at ON public.hr_overtime_rules;
   147|CREATE TRIGGER hr_overtime_rules_updated_at
   148|  BEFORE UPDATE ON public.hr_overtime_rules
   149|  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
   150|
   151|-- =====================================================
   152|-- Seed Data: Default Overtime Rules (Indonesian Labor Law)
   153|-- =====================================================
   154|
   155|-- Weekday overtime (after normal working hours)
   156|INSERT INTO public.hr_overtime_rules (entity_id, code, name, day_type, start_hour, first_hour_multiplier, subsequent_hour_multiplier, max_hours_per_day, max_hours_per_month)
   157|SELECT 
   158|  '20000000-0000-0000-0000-000000000001' as entity_id,
   159|  'OT-WEEKDAY',
   160|  'Weekday Overtime (After 5 PM)',
   161|  'weekday',
   162|  17, -- Starts at 5 PM
   163|  1.50, -- First hour: 1.5x hourly rate
   164|  2.00, -- Subsequent hours: 2x hourly rate
   165|  4.00, -- Max 4 hours per day
   166|  60.00 -- Max 60 hours per month
   167|ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;
   168|
   169|-- Weekend overtime (Saturday/Sunday)
   170|INSERT INTO public.hr_overtime_rules (entity_id, code, name, day_type, first_hour_multiplier, subsequent_hour_multiplier, max_hours_per_day, max_hours_per_month)
   171|SELECT 
   172|  '20000000-0000-0000-0000-000000000001' as entity_id,
   173|  'OT-WEEKEND',
   174|  'Weekend Overtime',
   175|  'weekend',
   176|  2.00, -- First hour: 2x
   177|  3.00, -- Subsequent hours: 3x
   178|  8.00, -- Max 8 hours per day
   179|  60.00
   180|ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;
   181|
   182|-- Public holiday overtime
   183|INSERT INTO public.hr_overtime_rules (entity_id, code, name, day_type, first_hour_multiplier, subsequent_hour_multiplier, max_hours_per_day, max_hours_per_month)
   184|SELECT 
   185|  '20000000-0000-0000-0000-000000000001' as entity_id,
   186|  'OT-HOLIDAY',
   187|  'Public Holiday Overtime',
   188|  'public_holiday',
   189|  2.00, -- First hour: 2x
   190|  3.00, -- Subsequent hours: 3x
   191|  8.00,
   192|  60.00
   193|ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;
   194|
   195|-- =====================================================
   196|-- SETUP COMPLETE!
   197|-- =====================================================
   198|-- Tables created:
   199|-- - hr_work_areas (work location definitions)
   200|-- - hr_overtime_rules (OT calculation rules per Indonesian labor law)
   201|-- =====================================================
   202|


-- =====================================================
-- FILE: 20260418_012_seed_hc_data.sql
-- =====================================================

     1|-- =====================================================
     2|-- FASE-4.0-H: Seed Data for HC Master Data Tables
     3|-- =====================================================
     4|-- Sample data for testing and development
     5|-- Requires: FASE-0 (tenants, entities, branches, regions) ✅
     6|-- Requires: FASE-4.0-A to G ✅
     7|-- =====================================================
     8|
     9|-- =====================================================
    10|-- 1. Work Shifts & Calendars
    11|-- =====================================================
    12|
    13|-- Work shifts (assuming tenant_id and entity_id from demo data)
    14|INSERT INTO public.hr_work_shifts (entity_id, code, name, shift_type, start_time, end_time, is_overnight, break_duration_minutes)
    15|SELECT 
    16|  '20000000-0000-0000-0000-000000000001' as entity_id,
    17|  shift_code,
    18|  shift_name,
    19|  s_type,
    20|  s_start,
    21|  s_end,
    22|  overnight,
    23|  break_min
    24|FROM (VALUES
    25|  ('REG', 'Regular Shift', 'regular', '09:00', '18:00', false, 60),
    26|  ('MOR', 'Morning Shift', 'regular', '07:00', '16:00', false, 60),
    27|  ('AFT', 'Afternoon Shift', 'regular', '14:00', '23:00', false, 60),
    28|  ('NGT', 'Night Shift', 'regular', '23:00', '08:00', true, 60),
    29|  ('FLX', 'Flexible', 'flexible', NULL, NULL, false, NULL)
    30|) AS shifts(shift_code, shift_name, s_type, s_start, s_end, overnight, break_min)
    31|ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;
    32|
    33|-- Work calendars
    34|INSERT INTO public.hr_work_calendars (entity_id, name, calendar_type, start_date, end_date, is_default)
    35|SELECT 
    36|  '20000000-0000-0000-0000-000000000001' as entity_id,
    37|  cal_name,
    38|  cal_type,
    39|  cal_start,
    40|  cal_end,
    41|  is_def
    42|FROM (VALUES
    43|  ('Standard 2026', 'standard', '2026-01-01', '2026-12-31', true),
    44|  ('Production 2026', 'production', '2026-01-01', '2026-12-31', false),
    45|  ('Retail 2026', 'retail', '2026-01-01', '2026-12-31', false)
    46|) AS calendars(cal_name, cal_type, cal_start, cal_end, is_def)
    47|ON CONFLICT (tenant_id, entity_id, name) DO NOTHING;
    48|
    49|-- =====================================================
    50|-- 2. City UMR (Upah Minimum Regional) 2026
    51|-- =====================================================
    52|
    53|INSERT INTO public.hr_city_umr (city_id, year, umr_amount, effective_date, source_document)
    54|SELECT 
    55|  city_id,
    56|  2026,
    57|  umr,
    58|  eff_date,
    59|  src_doc
    60|FROM (VALUES
    61|  -- DKI Jakarta (from regions table seed data)
    62|  ((SELECT id FROM regions WHERE name = 'Jakarta Pusat'), 4900000.00, '2026-01-01', 'Kepgub DKI Jakarta No. XXX/2025'),
    63|  ((SELECT id FROM regions WHERE name = 'Jakarta Selatan'), 4900000.00, '2026-01-01', 'Kepgub DKI Jakarta No. XXX/2025'),
    64|  ((SELECT id FROM regions WHERE name = 'Jakarta Barat'), 4900000.00, '2026-01-01', 'Kepgub DKI Jakarta No. XXX/2025'),
    65|  ((SELECT id FROM regions WHERE name = 'Jakarta Timur'), 4900000.00, '2026-01-01', 'Kepgub DKI Jakarta No. XXX/2025'),
    66|  ((SELECT id FROM regions WHERE name = 'Jakarta Utara'), 4900000.00, '2026-01-01', 'Kepgub DKI Jakarta No. XXX/2025'),
    67|  
    68|  -- Jawa Barat
    69|  ((SELECT id FROM regions WHERE name = 'Bandung'), 3200000.00, '2026-01-01', 'Kepgub Jabar No. XXX/2025'),
    70|  ((SELECT id FROM regions WHERE name = 'Bekasi'), 5100000.00, '2026-01-01', 'Kepgub Jabar No. XXX/2025'),
    71|  ((SELECT id FROM regions WHERE name = 'Depok'), 4800000.00, '2026-01-01', 'Kepgub Jabar No. XXX/2025'),
    72|  ((SELECT id FROM regions WHERE name = 'Bogor'), 4500000.00, '2026-01-01', 'Kepgub Jabar No. XXX/2025'),
    73|  ((SELECT id FROM regions WHERE name = 'Tangerang'), 5000000.00, '2026-01-01', 'Kepgub Banten No. XXX/2025'),
    74|  
    75|  -- Jawa Timur
    76|  ((SELECT id FROM regions WHERE name = 'Surabaya'), 4600000.00, '2026-01-01', 'Kepgub Jatim No. XXX/2025'),
    77|  
    78|  -- Jawa Tengah
    79|  ((SELECT id FROM regions WHERE name = 'Semarang'), 3100000.00, '2026-01-01', 'Kepgub Jateng No. XXX/2025')
    80|) AS umr_data(city_id, umr, eff_date, src_doc)
    81|ON CONFLICT (tenant_id, city_id, year) DO NOTHING;
    82|
    83|-- =====================================================
    84|-- 3. BPJS & PPh21 Configs
    85|-- =====================================================
    86|
    87|-- BPJS Ketenagakerjaan config (2026 rates)
    88|INSERT INTO public.hr_bpjs_configs (entity_id, bpjs_type, category, rate_employee, rate_company, max_salary_base, description)
    89|SELECT 
    90|  '20000000-0000-0000-0000-000000000001' as entity_id,
    91|  b_type,
    92|  cat,
    93|  r_emp,
    94|  r_comp,
    95|  max_base,
    96|  desc_text
    97|FROM (VALUES
    98|  ('ketenagakerjaan', 'JKK', 0.00, 0.24, 12000000.00, 'Jaminan Kecelakaan Kerja - 0.24% (risk level 1)'),
    99|  ('ketenagakerjaan', 'JKM', 0.00, 0.30, 12000000.00, 'Jaminan Kematian - 0.30%'),
   100|  ('ketenagakerjaan', 'JHT', 2.00, 3.70, 12000000.00, 'Jaminan Hari Tua - 5.70% total'),
   101|  ('ketenagakerjaan', 'JP', 1.00, 2.00, 12000000.00, 'Jaminan Pensiun - 3.00% total'),
   102|  ('kesehatan', 'Kesehatan', 1.00, 4.00, 12000000.00, 'BPJS Kesehatan - 5% total')
   103|) AS bpjs(b_type, cat, r_emp, r_comp, max_base, desc_text)
   104|ON CONFLICT (tenant_id, entity_id, bpjs_type, category) DO NOTHING;
   105|
   106|-- PPh21 TER (Tarif Efektif Rata-rata) 2026
   107|INSERT INTO public.hr_pph21_configs (entity_id, filing_status, income_range_min, income_range_max, monthly_rate, description)
   108|SELECT 
   109|  '20000000-0000-0000-0000-000000000001' as entity_id,
   110|  status,
   111|  min_inc,
   112|  max_inc,
   113|  rate,
   114|  desc_text
   115|FROM (VALUES
   116|  ('TK/0', 0, 5000000.00, 0.00, 'TK/0 - Penghasilan s.d. 5 Juta'),
   117|  ('TK/0', 5000000.01, 10000000.00, 0.025, 'TK/0 - Penghasilan 5-10 Juta'),
   118|  ('TK/0', 10000000.01, 20000000.00, 0.045, 'TK/0 - Penghasilan 10-20 Juta'),
   119|  ('TK/0', 20000000.01, 50000000.00, 0.0675, 'TK/0 - Penghasilan 20-50 Juta'),
   120|  ('TK/0', 50000000.01, 100000000.00, 0.0825, 'TK/0 - Penghasilan 50-100 Juta'),
   121|  ('TK/0', 100000000.01, 250000000.00, 0.0975, 'TK/0 - Penghasilan 100-250 Juta'),
   122|  ('TK/0', 250000000.01, 500000000.00, 0.1125, 'TK/0 - Penghasilan 250-500 Juta'),
   123|  ('TK/0', 500000000.01, NULL, 0.135, 'TK/0 - Penghasilan > 500 Juta'),
   124|  
   125|  ('K/0', 0, 5000000.00, 0.00, 'K/0 - Kawin tanpa tanggungan'),
   126|  ('K/0', 5000000.01, 10000000.00, 0.0225, 'K/0'),
   127|  ('K/0', 10000000.01, 20000000.00, 0.0425, 'K/0'),
   128|  ('K/0', 20000000.01, 50000000.00, 0.065, 'K/0'),
   129|  ('K/0', 50000000.01, 100000000.00, 0.08, 'K/0'),
   130|  ('K/0', 100000000.01, 250000000.00, 0.095, 'K/0'),
   131|  ('K/0', 250000000.01, 500000000.00, 0.11, 'K/0'),
   132|  ('K/0', 500000000.01, NULL, 0.1325, 'K/0'),
   133|  
   134|  ('K/1', 0, 5000000.00, 0.00, 'K/1 - Kawin 1 tanggungan'),
   135|  ('K/1', 5000000.01, 10000000.00, 0.02, 'K/1'),
   136|  ('K/1', 10000000.01, 20000000.00, 0.04, 'K/1'),
   137|  ('K/1', 20000000.01, 50000000.00, 0.0625, 'K/1'),
   138|  ('K/1', 50000000.01, 100000000.00, 0.0775, 'K/1'),
   139|  ('K/1', 100000000.01, 250000000.00, 0.0925, 'K/1'),
   140|  ('K/1', 250000000.01, 500000000.00, 0.1075, 'K/1'),
   141|  ('K/1', 500000000.01, NULL, 0.13, 'K/1'),
   142|  
   143|  ('K/2', 0, 5000000.00, 0.00, 'K/2 - Kawin 2 tanggungan'),
   144|  ('K/2', 5000000.01, 10000000.00, 0.0175, 'K/2'),
   145|  ('K/2', 10000000.01, 20000000.00, 0.0375, 'K/2'),
   146|  ('K/2', 20000000.01, 50000000.00, 0.06, 'K/2'),
   147|  ('K/2', 50000000.01, 100000000.00, 0.075, 'K/2'),
   148|  ('K/2', 100000000.01, 250000000.00, 0.09, 'K/2'),
   149|  ('K/2', 250000000.01, 500000000.00, 0.105, 'K/2'),
   150|  ('K/2', 500000000.01, NULL, 0.1275, 'K/2'),
   151|  
   152|  ('K/3', 0, 5000000.00, 0.00, 'K/3 - Kawin 3 tanggungan (max)'),
   153|  ('K/3', 5000000.01, 10000000.00, 0.015, 'K/3'),
   154|  ('K/3', 10000000.01, 20000000.00, 0.035, 'K/3'),
   155|  ('K/3', 20000000.01, 50000000.00, 0.0575, 'K/3'),
   156|  ('K/3', 50000000.01, 100000000.00, 0.0725, 'K/3'),
   157|  ('K/3', 100000000.01, 250000000.00, 0.0875, 'K/3'),
   158|  ('K/3', 250000000.01, 500000000.00, 0.1025, 'K/3'),
   159|  ('K/3', 500000000.01, NULL, 0.125, 'K/3')
   160|) AS pph21(status, min_inc, max_inc, rate, desc_text)
   161|ON CONFLICT (tenant_id, entity_id, filing_status, income_range_min) DO NOTHING;
   162|
   163|-- =====================================================
   164|-- 4. Salary Components
   165|-- =====================================================
   166|
   167|INSERT INTO public.hr_salary_components (entity_id, code, name, component_type, is_fixed, is_taxable, is_bpjs_base, display_order)
   168|SELECT 
   169|  '20000000-0000-0000-0000-000000000001' as entity_id,
   170|  comp_code,
   171|  comp_name,
   172|  c_type,
   173|  fixed,
   174|  taxable,
   175|  bpjs_base,
   176|  d_order
   177|FROM (VALUES
   178|  ('GAJI_POKOK', 'Gaji Pokok', 'earning', true, true, true, 1),
   179|  ('TUNJ_JABATAN', 'Tunjangan Jabatan', 'earning', true, true, true, 2),
   180|  ('TUNJ_MAKAN', 'Tunjangan Makan', 'earning', true, true, false, 3),
   181|  ('TUNJ_TRANSPORT', 'Tunjangan Transport', 'earning', true, true, false, 4),
   182|  ('TUNJ_KEHADIRAN', 'Tunjangan Kehadiran', 'earning', true, true, false, 5),
   183|  ('LEMBUR', 'Lembur/Overtime', 'earning', false, true, false, 6),
   184|  ('BONUS', 'Bonus', 'earning', false, true, true, 7),
   185|  ('THP', 'THR', 'earning', false, true, true, 8),
   186|  
   187|  ('BPJS_KT_EMP', 'BPJS Ketenagakerjaan (Employee)', 'deduction', true, false, false, 100),
   188|  ('BPJS_KES_EMP', 'BPJS Kesehatan (Employee)', 'deduction', true, false, false, 101),
   189|  ('PPh21', 'PPh Pasal 21', 'deduction', false, false, false, 102),
   190|  ('POTONGAN_LAIN', 'Potongan Lain-lain', 'deduction', false, false, false, 103)
   191|) AS components(comp_code, comp_name, c_type, fixed, taxable, bpjs_base, d_order)
   192|ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;
   193|
   194|-- =====================================================
   195|-- 5. Job Grades & Salary Matrix
   196|-- =====================================================
   197|
   198|INSERT INTO public.hr_job_grades (entity_id, code, name, level, salary_min, salary_mid, salary_max, leave_quota, is_overtime_eligible)
   199|SELECT 
   200|  '20000000-0000-0000-0000-000000000001' as entity_id,
   201|  g_code,
   202|  g_name,
   203|  g_level,
   204|  g_min,
   205|  g_mid,
   206|  g_max,
   207|  leave_q,
   208|  ot_eligible
   209|FROM (VALUES
   210|  ('D1', 'Director', 1, 25000000.00, 35000000.00, 50000000.00, 15, false),
   211|  ('M1', 'Manager', 2, 15000000.00, 20000000.00, 30000000.00, 14, false),
   212|  ('M2', 'Senior Manager', 3, 12000000.00, 15000000.00, 20000000.00, 14, false),
   213|  ('S1', 'Senior Staff', 4, 8000000.00, 10000000.00, 14000000.00, 12, true),
   214|  ('S2', 'Staff', 5, 5500000.00, 7000000.00, 9000000.00, 12, true),
   215|  ('S3', 'Junior Staff', 6, 4500000.00, 5000000.00, 6000000.00, 12, true)
   216|) AS grades(g_code, g_name, g_level, g_min, g_mid, g_max, leave_q, ot_eligible)
   217|ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;
   218|
   219|-- Salary matrix steps (example for S2 - Staff grade)
   220|INSERT INTO public.hr_salary_matrix (entity_id, grade_id, step, amount, effective_date)
   221|SELECT 
   222|  '20000000-0000-0000-0000-000000000001' as entity_id,
   223|  (SELECT id FROM hr_job_grades WHERE code = 'S2' LIMIT 1) as grade_id,
   224|  step_num,
   225|  amt,
   226|  '2026-01-01'
   227|FROM (VALUES
   228|  (1, 5500000.00),
   229|  (2, 6000000.00),
   230|  (3, 6500000.00),
   231|  (4, 7000000.00),
   232|  (5, 7500000.00)
   233|) AS steps(step_num, amt)
   234|ON CONFLICT (tenant_id, entity_id, grade_id, step, effective_date) DO NOTHING;
   235|
   236|-- =====================================================
   237|-- 6. Work Areas
   238|-- =====================================================
   239|
   240|INSERT INTO public.hr_work_areas (entity_id, branch_id, code, name, area_type, address_line1, city_id)
   241|SELECT 
   242|  '20000000-0000-0000-0000-000000000001' as entity_id,
   243|  '10000000-0000-0000-0000-000000000001' as branch_id, -- Head Office
   244|  area_code,
   245|  area_name,
   246|  a_type,
   247|  addr,
   248|  (SELECT id FROM regions WHERE name = 'Jakarta Selatan' LIMIT 1) as city_id
   249|FROM (VALUES
   250|  ('OFF-HO', 'Head Office', 'office', 'Jl. Raya TB Simatupang No. 1'),
   251|  ('WH-01', 'Warehouse 1', 'warehouse', 'Jl. Industri Raya No. 5'),
   252|  ('SITE-A', 'Project Site A', 'site', 'Lokasi Proyek BSD')
   253|) AS areas(area_code, area_name, a_type, addr)
   254|ON CONFLICT (tenant_id, entity_id, code) DO NOTHING;
   255|
   256|-- =====================================================
   257|-- SEED DATA COMPLETE!
   258|-- =====================================================
   259|-- All HC Master Data tables now have sample data for testing
   260|-- Total: 11 FASE-4.0 tables + 4 FASE-0 tables = 15 tables
   261|-- =====================================================
   262|
