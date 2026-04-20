-- =====================================================
-- FASE-0: Core Foundation - Regions
-- =====================================================
-- Geographic regions (countries, provinces, cities)
-- Used for UMR references, branch locations, tax jurisdictions
-- =====================================================

-- 4.1 Regions Table (hierarchical: country → province → city)
CREATE TABLE IF NOT EXISTS public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.regions(id) ON DELETE CASCADE, -- hierarchical (province → country, city → province)
  type text NOT NULL CHECK (type IN ('country', 'province', 'city', 'district')),
  name text NOT NULL, -- e.g., "Indonesia", "DKI Jakarta", "Jakarta Pusat"
  code text UNIQUE, -- e.g., "ID", "ID-JK", "ID-JK-01" (ISO 3166-2 for provinces)
  metadata jsonb DEFAULT '{}'::jsonb, -- additional data (area_km2, population, etc.)
  created_at timestamptz DEFAULT now()
);

-- 4.2 Indexes
CREATE INDEX IF NOT EXISTS idx_regions_parent ON regions(parent_id);
CREATE INDEX IF NOT EXISTS idx_regions_type ON regions(type);
CREATE INDEX IF NOT EXISTS idx_regions_code ON regions(code);
CREATE INDEX IF NOT EXISTS idx_regions_name ON regions(name);

-- 4.3 Enable RLS
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

-- 4.4 RLS Policies
-- Everyone (authenticated) can view regions (read-only reference data)
DROP POLICY IF EXISTS "Users can view regions" ON public.regions;
CREATE POLICY "Users can view regions"
  ON public.regions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Super admin can manage regions
DROP POLICY IF EXISTS "Super admin can manage regions" ON public.regions;
CREATE POLICY "Super admin can manage regions"
  ON public.regions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() AND r.name = 'super_admin'
    )
  );

-- =====================================================
-- 4.5 Seed Data: Indonesia Regions
-- =====================================================

-- Indonesia (Country)
INSERT INTO public.regions (type, name, code)
VALUES ('country', 'Indonesia', 'ID')
ON CONFLICT (code) DO NOTHING;

-- Provinces (sample - can be expanded)
INSERT INTO public.regions (parent_id, type, name, code)
SELECT 
  (SELECT id FROM regions WHERE code = 'ID'),
  'province',
  province_name,
  province_code
FROM (VALUES
  ('DKI Jakarta', 'ID-JK'),
  ('Jawa Barat', 'ID-JB'),
  ('Jawa Tengah', 'ID-JT'),
  ('Jawa Timur', 'ID-JI'),
  ('Banten', 'ID-BT'),
  ('Bali', 'ID-BA'),
  ('Sulawesi Selatan', 'ID-SN'),
  ('Sumatera Utara', 'ID-SU'),
  ('Sumatera Barat', 'ID-SB'),
  ('Jambi', 'ID-JA')
) AS provinces(province_name, province_code)
ON CONFLICT (code) DO NOTHING;

-- Cities (major cities for UMR)
INSERT INTO public.regions (parent_id, type, name, code)
SELECT 
  (SELECT id FROM regions WHERE code = parent_code),
  'city',
  city_name,
  city_code
FROM (VALUES
  -- DKI Jakarta
  ('ID-JK', 'Jakarta Pusat', 'ID-JK-01'),
  ('ID-JK', 'Jakarta Utara', 'ID-JK-02'),
  ('ID-JK', 'Jakarta Barat', 'ID-JK-03'),
  ('ID-JK', 'Jakarta Selatan', 'ID-JK-04'),
  ('ID-JK', 'Jakarta Timur', 'ID-JK-05'),
  -- Jawa Barat
  ('ID-JB', 'Bandung', 'ID-JB-01'),
  ('ID-JB', 'Bekasi', 'ID-JB-02'),
  ('ID-JB', 'Depok', 'ID-JB-03'),
  ('ID-JB', 'Bogor', 'ID-JB-04'),
  -- Banten
  ('ID-BT', 'Tangerang', 'ID-BT-01'),
  -- Jawa Timur
  ('ID-JI', 'Surabaya', 'ID-JI-01'),
  -- Jawa Tengah
  ('ID-JT', 'Semarang', 'ID-JT-01'),
  -- Bali
  ('ID-BA', 'Denpasar', 'ID-BA-01'),
  -- Sulawesi Selatan
  ('ID-SN', 'Makassar', 'ID-SN-01')
) AS cities(parent_code, city_name, city_code)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Regions available:
-- - 1 country (Indonesia)
-- - 10 provinces
-- - 14 major cities
-- =====================================================
