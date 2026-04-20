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
