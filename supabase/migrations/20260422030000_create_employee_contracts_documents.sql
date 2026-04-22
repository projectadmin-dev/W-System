-- =====================================================
-- FASE-4.0-F: Employee Contracts & Documents
-- =====================================================
-- Employee = User (user_profiles extended)
-- Contracts: History of employment contracts per employee
-- Documents: Employee attachment files (KTP, Ijazah, SK, etc)
-- =====================================================

-- 1. hr_employee_contracts - Employment contract history
CREATE TABLE IF NOT EXISTS public.hr_employee_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  
  contract_no text NOT NULL, -- e.g., "PKWTT-2026-001"
  contract_type text NOT NULL, -- pkwt, pkwtt, freelance, pt, magang
  
  start_date date NOT NULL,
  end_date date, -- nullable for permanent contracts
  probation_end_date date, -- nullable for no probation
  
  position_id uuid REFERENCES public.hr_positions(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.hr_departments(id) ON DELETE SET NULL,
  grade_id uuid REFERENCES public.hr_job_grades(id) ON DELETE SET NULL,
  
  base_salary numeric(20,4),
  work_shift_id uuid REFERENCES public.hr_work_shifts(id) ON DELETE SET NULL,
  work_area_id uuid REFERENCES public.hr_work_areas(id) ON DELETE SET NULL,
  
  is_active boolean DEFAULT true,
  termination_reason text,
  termination_date date,
  
  document_url text,
  signed_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(tenant_id, contract_no)
);

CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON public.hr_employee_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_employee ON public.hr_employee_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_active ON public.hr_employee_contracts(is_active);

ALTER TABLE public.hr_employee_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view contracts in their tenant" ON public.hr_employee_contracts;
CREATE POLICY "Users can view contracts in their tenant"
  ON public.hr_employee_contracts FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage contracts" ON public.hr_employee_contracts;
CREATE POLICY "HR admin can manage contracts"
  ON public.hr_employee_contracts FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() AND r.name IN ('admin','hr','super_admin')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() AND r.name IN ('admin','hr','super_admin')
    )
  );

-- Trigger: only one active contract per employee
CREATE OR REPLACE FUNCTION public.check_one_active_contract()
RETURNS TRIGGER AS $$
DECLARE
  conflict_exists BOOLEAN;
BEGIN
  IF NEW.is_active THEN
    SELECT EXISTS(
      SELECT 1 FROM public.hr_employee_contracts
      WHERE employee_id = NEW.employee_id
        AND id != NEW.id
        AND is_active = true
    ) INTO conflict_exists;
    IF conflict_exists THEN
      RAISE EXCEPTION 'Employee already has an active contract. Deactivate the existing one first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_one_active_contract ON public.hr_employee_contracts;
CREATE TRIGGER enforce_one_active_contract
  BEFORE INSERT OR UPDATE ON public.hr_employee_contracts
  FOR EACH ROW EXECUTE FUNCTION public.check_one_active_contract();

-- 2. hr_employee_documents - Employee file attachments
CREATE TABLE IF NOT EXISTS public.hr_employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  
  document_type text NOT NULL, -- ktp, kk, ijazah, sertifikat, kontrak, sk, passfoto, npwp, bpjs_card, other
  document_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES public.user_profiles(id),
  verified_at timestamptz,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_docs_tenant ON public.hr_employee_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_docs_employee ON public.hr_employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_docs_type ON public.hr_employee_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_docs_verified ON public.hr_employee_documents(is_verified);

ALTER TABLE public.hr_employee_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view docs in their tenant" ON public.hr_employee_documents;
CREATE POLICY "Users can view docs in their tenant"
  ON public.hr_employee_documents FOR SELECT
  TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

DROP POLICY IF EXISTS "HR admin can manage documents" ON public.hr_employee_documents;
CREATE POLICY "HR admin can manage documents"
  ON public.hr_employee_documents FOR ALL
  TO authenticated
  USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() AND r.name IN ('admin','hr','super_admin')
    )
  )
  WITH CHECK (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() AND r.name IN ('admin','hr','super_admin')
    )
  );

-- Trigger: updated_at
DROP TRIGGER IF EXISTS contracts_updated_at ON public.hr_employee_contracts;
CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON public.hr_employee_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS docs_updated_at ON public.hr_employee_documents;
CREATE TRIGGER docs_updated_at
  BEFORE UPDATE ON public.hr_employee_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
