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
-- SETUP COMPLETE!
-- =====================================================
-- hr_city_umr ready for UMR configuration per city/year
-- Seed data will be inserted by 0018_seed_hc_data.sql
-- =====================================================
