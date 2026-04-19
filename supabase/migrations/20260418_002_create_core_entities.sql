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
