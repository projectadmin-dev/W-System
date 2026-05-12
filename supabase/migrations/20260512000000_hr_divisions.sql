-- =====================================================
-- HR Divisions Table (Missing from FASE-4.0-F)
-- =====================================================
-- Divisions are subdivisions within departments/entities
-- Related to entities (organization structure)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.hr_divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,

  -- Basic info
  code text NOT NULL, -- e.g., "DIV-A", "DIV-WEB"
  name text NOT NULL, -- e.g., "Division A", "Web Development"

  -- Organization links
  department_id uuid REFERENCES public.hr_departments(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.hr_divisions(id) ON DELETE SET NULL, -- nested divisions

  -- Division head
  head_user_id uuid REFERENCES auth.users(id),

  -- Contact info
  email text,
  phone text,

  -- Status
  is_active boolean DEFAULT true,

  -- Description
  description text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id, entity_id, code)
);

CREATE INDEX IF NOT EXISTS idx_hr_divisions_tenant ON public.hr_divisions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hr_divisions_entity ON public.hr_divisions(entity_id);
CREATE INDEX IF NOT EXISTS idx_hr_divisions_department ON public.hr_divisions(department_id);
CREATE INDEX IF NOT EXISTS idx_hr_divisions_parent ON public.hr_divisions(parent_id);
CREATE INDEX IF NOT EXISTS idx_hr_divisions_active ON public.hr_divisions(is_active);

-- Enable RLS
ALTER TABLE public.hr_divisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view divisions in their tenant" ON public.hr_divisions;
CREATE POLICY "Users can view divisions in their tenant"
  ON public.hr_divisions FOR SELECT
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage divisions" ON public.hr_divisions;
CREATE POLICY "HR admin can manage divisions"
  ON public.hr_divisions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'hr_admin')
    )
  );

-- Trigger: Auto-update updated_at
DROP TRIGGER IF EXISTS hr_divisions_updated_at ON public.hr_divisions;
CREATE TRIGGER hr_divisions_updated_at
  BEFORE UPDATE ON public.hr_divisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Table created:
-- - hr_divisions (divisions/sub-departments)
-- =====================================================
