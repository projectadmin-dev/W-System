-- =============================================================
-- MIGRATION: Auto-generate project_code CMP-YYYY-NNNN
-- File: 20260512_150000_commercial_project_auto_code.sql
-- =============================================================

-- Helper: get next sequence number for tenant+year
CREATE OR REPLACE FUNCTION public.get_next_project_code(
  p_tenant_id uuid,
  p_year integer
) RETURNS TEXT AS $$
DECLARE
  next_seq INTEGER;
  code TEXT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(project_code FROM 'CMP-[0-9]{4}-([0-9]+)$') AS INTEGER)
  ), 0) + 1
  INTO next_seq
  FROM public.commercial_projects
  WHERE tenant_id = p_tenant_id
    AND project_code LIKE 'CMP-' || p_year || '%';

  code := 'CMP-' || p_year || '-' || LPAD(next_seq::TEXT, 4, '0');
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger: auto-assign project_code on insert
CREATE OR REPLACE FUNCTION public.trg_assign_project_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_code IS NULL OR NEW.project_code = '' THEN
    NEW.project_code := public.get_next_project_code(
      NEW.tenant_id,
      EXTRACT(YEAR FROM COALESCE(NEW.created_at, NOW()))::INTEGER
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_project_code ON public.commercial_projects;
CREATE TRIGGER trg_assign_project_code
  BEFORE INSERT ON public.commercial_projects
  FOR EACH ROW EXECUTE FUNCTION public.trg_assign_project_code();

-- =============================================================
-- DONE
-- =============================================================
