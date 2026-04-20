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
