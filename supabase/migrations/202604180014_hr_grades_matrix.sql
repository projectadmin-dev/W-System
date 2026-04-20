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
