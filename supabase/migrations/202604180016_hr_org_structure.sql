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
