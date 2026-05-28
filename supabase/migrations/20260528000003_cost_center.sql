-- =====================================================
-- Migration: Cost Center 3-Table Hierarchy
-- Supports N-level org structure with rollup queries
-- =====================================================

-- 1. Cost Center Configuration (top-level: "Struktur Organisasi WIT")
CREATE TABLE IF NOT EXISTS public.cost_center_configs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kode        text        NOT NULL,
  nama        text        NOT NULL,
  deskripsi   text,
  is_default  boolean     NOT NULL DEFAULT false,
  is_active   boolean     NOT NULL DEFAULT true,
  sort_order  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid        REFERENCES public.user_profiles(id),
  deleted_at  timestamptz,
  UNIQUE (tenant_id, kode)
);

-- 2. Level Definitions within a Config (L1=Entity, L2=Lokasi, L3=Divisi, etc.)
CREATE TABLE IF NOT EXISTS public.cost_center_levels (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id      uuid    NOT NULL REFERENCES public.cost_center_configs(id) ON DELETE CASCADE,
  level_number   integer NOT NULL CHECK (level_number BETWEEN 1 AND 10),
  label          text    NOT NULL,   -- e.g., 'Entity', 'Divisi', 'Departemen'
  is_default_select boolean NOT NULL DEFAULT false,  -- which level to default-filter on
  sort_order     integer NOT NULL DEFAULT 0,
  UNIQUE (config_id, level_number)
);

-- 3. Actual Values / Nodes within the hierarchy
CREATE TABLE IF NOT EXISTS public.cost_center_values (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id       uuid        NOT NULL REFERENCES public.cost_center_configs(id) ON DELETE CASCADE,
  level_id        uuid        NOT NULL REFERENCES public.cost_center_levels(id),
  parent_value_id uuid        REFERENCES public.cost_center_values(id),
  kode            text        NOT NULL,
  nama            text        NOT NULL,
  level_number    integer     NOT NULL,
  is_active       boolean     NOT NULL DEFAULT true,
  sort_order      integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  UNIQUE (config_id, kode)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cc_configs_tenant
  ON public.cost_center_configs(tenant_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cc_levels_config
  ON public.cost_center_levels(config_id);

CREATE INDEX IF NOT EXISTS idx_cc_values_config
  ON public.cost_center_values(config_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cc_values_parent
  ON public.cost_center_values(parent_value_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cc_values_level
  ON public.cost_center_values(config_id, level_number) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE public.cost_center_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_center_levels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_center_values  ENABLE ROW LEVEL SECURITY;

-- Finance/Admin: full access
CREATE POLICY "finance_manage_cc_configs"
  ON public.cost_center_configs FOR ALL TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid AND EXISTS (
    SELECT 1 FROM public.user_profiles up JOIN public.roles r ON up.role_id = r.id
    WHERE up.id = auth.uid() AND r.name IN ('finance','cfo','admin','super_admin')
  ));

CREATE POLICY "all_read_cc_configs"
  ON public.cost_center_configs FOR SELECT TO authenticated
  USING (tenant_id = (auth.jwt()->>'tenant_id')::uuid);

CREATE POLICY "all_read_cc_levels"
  ON public.cost_center_levels FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cost_center_configs c
    WHERE c.id = config_id AND c.tenant_id = (auth.jwt()->>'tenant_id')::uuid
  ));

CREATE POLICY "all_read_cc_values"
  ON public.cost_center_values FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.cost_center_configs c
    WHERE c.id = config_id AND c.tenant_id = (auth.jwt()->>'tenant_id')::uuid
  ));

COMMENT ON TABLE public.cost_center_configs IS
  'Top-level cost center configuration (e.g., "Struktur Organisasi WIT"). Multiple configs per tenant supported.';

COMMENT ON TABLE public.cost_center_levels IS
  'Defines levels within a cost center config (L1=Entity, L2=Lokasi, L3=Divisi, L4=Departemen, L5=Sub Departemen).';

COMMENT ON TABLE public.cost_center_values IS
  'Actual org nodes. parent_value_id enables tree rollup: selecting L3=Divisi also captures all L4/L5 children.';
