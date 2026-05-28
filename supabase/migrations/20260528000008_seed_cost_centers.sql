-- =====================================================
-- Seed: WIT.ID Org Structure as Default Cost Center Config
-- 5 Levels: Entity → Lokasi → Divisi → Departemen → Sub Departemen
-- =====================================================

DO $$
DECLARE
  v_config_id   uuid;
  v_l1_id       uuid;  -- Entity level def
  v_l2_id       uuid;  -- Lokasi level def
  v_l3_id       uuid;  -- Divisi level def
  v_l4_id       uuid;  -- Departemen level def
  v_l5_id       uuid;  -- Sub Departemen level def

  -- L1 values
  v_entity_id   uuid;
  -- L2 values
  v_bandung_id  uuid;
  -- L3 (Divisi) values
  v_mgmt_id     uuid;
  v_tech_id     uuid;
  v_ops_id      uuid;
  v_itsup_id    uuid;
  -- L4 (Departemen) values
  v_commercial_id   uuid;
  v_sales_id        uuid;
  v_marketing_id    uuid;
  v_finance_id      uuid;
  v_design_id       uuid;
  v_it_id           uuid;
  v_ot_id           uuid;
  v_ops_dept_id     uuid;
  v_hr_id           uuid;
  v_itsup_dept_id   uuid;
BEGIN

  -- ── 1. Config ──────────────────────────────────────────────────────
  INSERT INTO public.cost_center_configs (
    tenant_id, kode, nama, deskripsi, is_default, is_active, sort_order
  ) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'ORG-WIT',
    'Struktur Organisasi WIT',
    'Hierarki organisasi resmi PT. Wahana Informasi dan Teknologi',
    true, true, 1
  )
  RETURNING id INTO v_config_id;

  -- ── 2. Level Definitions ───────────────────────────────────────────
  INSERT INTO public.cost_center_levels (config_id, level_number, label, is_default_select, sort_order)
  VALUES (v_config_id, 1, 'Entity',          false, 1)
  RETURNING id INTO v_l1_id;

  INSERT INTO public.cost_center_levels (config_id, level_number, label, is_default_select, sort_order)
  VALUES (v_config_id, 2, 'Lokasi',          false, 2)
  RETURNING id INTO v_l2_id;

  INSERT INTO public.cost_center_levels (config_id, level_number, label, is_default_select, sort_order)
  VALUES (v_config_id, 3, 'Divisi',          true,  3)  -- default filter level
  RETURNING id INTO v_l3_id;

  INSERT INTO public.cost_center_levels (config_id, level_number, label, is_default_select, sort_order)
  VALUES (v_config_id, 4, 'Departemen',      false, 4)
  RETURNING id INTO v_l4_id;

  INSERT INTO public.cost_center_levels (config_id, level_number, label, is_default_select, sort_order)
  VALUES (v_config_id, 5, 'Sub Departemen',  false, 5)
  RETURNING id INTO v_l5_id;

  -- ── 3. L1: Entity ──────────────────────────────────────────────────
  INSERT INTO public.cost_center_values (
    config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order
  ) VALUES (
    v_config_id, v_l1_id, NULL,
    'WIT', 'PT. Wahana Informasi dan Teknologi', 1, true, 1
  )
  RETURNING id INTO v_entity_id;

  -- ── 4. L2: Lokasi ──────────────────────────────────────────────────
  INSERT INTO public.cost_center_values (
    config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order
  ) VALUES (
    v_config_id, v_l2_id, v_entity_id,
    'LOK-BDG', 'Bandung - Sukakarya 2 No.40', 2, true, 1
  )
  RETURNING id INTO v_bandung_id;

  -- ── 5. L3: Divisi ──────────────────────────────────────────────────
  INSERT INTO public.cost_center_values (
    config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order
  ) VALUES (v_config_id, v_l3_id, v_bandung_id, 'DIV-MGT', 'Management',  3, true, 1)
  RETURNING id INTO v_mgmt_id;

  INSERT INTO public.cost_center_values (
    config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order
  ) VALUES (v_config_id, v_l3_id, v_bandung_id, 'DIV-TEC', 'Tech',        3, true, 2)
  RETURNING id INTO v_tech_id;

  INSERT INTO public.cost_center_values (
    config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order
  ) VALUES (v_config_id, v_l3_id, v_bandung_id, 'DIV-OPS', 'Ops',         3, true, 3)
  RETURNING id INTO v_ops_id;

  INSERT INTO public.cost_center_values (
    config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order
  ) VALUES (v_config_id, v_l3_id, v_bandung_id, 'DIV-ITS', 'IT Support',  3, true, 4)
  RETURNING id INTO v_itsup_id;

  -- ── 6. L4: Departemen ──────────────────────────────────────────────
  -- Under Management
  INSERT INTO public.cost_center_values (
    config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order
  ) VALUES (v_config_id, v_l4_id, v_mgmt_id, 'DEPT-COM', 'Commercial',   4, true, 1)
  RETURNING id INTO v_commercial_id;

  INSERT INTO public.cost_center_values (
    config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order
  ) VALUES (v_config_id, v_l4_id, v_mgmt_id, 'DEPT-SAL', 'Sales',        4, true, 2)
  RETURNING id INTO v_sales_id;

  INSERT INTO public.cost_center_values (
    config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order
  ) VALUES (v_config_id, v_l4_id, v_mgmt_id, 'DEPT-MKT', 'Marketing',    4, true, 3)
  RETURNING id INTO v_marketing_id;

  INSERT INTO public.cost_center_values (
    config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order
  ) VALUES (v_config_id, v_l4_id, v_mgmt_id, 'DEPT-FIN', 'Finance',      4, true, 4)
  RETURNING id INTO v_finance_id;

  INSERT INTO public.cost_center_values (
    config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order
  ) VALUES (v_config_id, v_l4_id, v_mgmt_id, 'DEPT-DES', 'Design',       4, true, 5)
  RETURNING id INTO v_design_id;

  -- Under Tech
  INSERT INTO public.cost_center_values (
    config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order
  ) VALUES (v_config_id, v_l4_id, v_tech_id, 'DEPT-IT', 'Information Technology', 4, true, 1)
  RETURNING id INTO v_it_id;

  INSERT INTO public.cost_center_values (
    config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order
  ) VALUES (v_config_id, v_l4_id, v_tech_id, 'DEPT-OT', 'Operation Technology',   4, true, 2)
  RETURNING id INTO v_ot_id;

  -- Under Ops
  INSERT INTO public.cost_center_values (
    config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order
  ) VALUES (v_config_id, v_l4_id, v_ops_id, 'DEPT-OPS', 'Operations',    4, true, 1)
  RETURNING id INTO v_ops_dept_id;

  INSERT INTO public.cost_center_values (
    config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order
  ) VALUES (v_config_id, v_l4_id, v_ops_id, 'DEPT-HR', 'Human Resources', 4, true, 2)
  RETURNING id INTO v_hr_id;

  -- Under IT Support
  INSERT INTO public.cost_center_values (
    config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order
  ) VALUES (v_config_id, v_l4_id, v_itsup_id, 'DEPT-ITS', 'IT Support & Helpdesk', 4, true, 1)
  RETURNING id INTO v_itsup_dept_id;

  -- ── 7. L5: Sub Departemen ──────────────────────────────────────────
  -- Under Commercial
  INSERT INTO public.cost_center_values (config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order)
  VALUES
    (v_config_id, v_l5_id, v_commercial_id, 'SUB-COM-01', 'Business Development',       5, true, 1),
    (v_config_id, v_l5_id, v_commercial_id, 'SUB-COM-02', 'Partnership & Alliance',      5, true, 2),
    (v_config_id, v_l5_id, v_commercial_id, 'SUB-COM-03', 'Key Account Management',      5, true, 3);

  -- Under Sales
  INSERT INTO public.cost_center_values (config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order)
  VALUES
    (v_config_id, v_l5_id, v_sales_id, 'SUB-SAL-01', 'Inside Sales',                   5, true, 1),
    (v_config_id, v_l5_id, v_sales_id, 'SUB-SAL-02', 'Field Sales',                     5, true, 2),
    (v_config_id, v_l5_id, v_sales_id, 'SUB-SAL-03', 'Pre-Sales & Demo',                5, true, 3);

  -- Under Marketing
  INSERT INTO public.cost_center_values (config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order)
  VALUES
    (v_config_id, v_l5_id, v_marketing_id, 'SUB-MKT-01', 'Digital Marketing',           5, true, 1),
    (v_config_id, v_l5_id, v_marketing_id, 'SUB-MKT-02', 'Brand & Communications',      5, true, 2),
    (v_config_id, v_l5_id, v_marketing_id, 'SUB-MKT-03', 'Content & Creative',          5, true, 3);

  -- Under Finance
  INSERT INTO public.cost_center_values (config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order)
  VALUES
    (v_config_id, v_l5_id, v_finance_id, 'SUB-FIN-01', 'Accounting & Reporting',       5, true, 1),
    (v_config_id, v_l5_id, v_finance_id, 'SUB-FIN-02', 'Tax & Compliance',             5, true, 2),
    (v_config_id, v_l5_id, v_finance_id, 'SUB-FIN-03', 'Treasury & Cash Management',  5, true, 3);

  -- Under Design
  INSERT INTO public.cost_center_values (config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order)
  VALUES
    (v_config_id, v_l5_id, v_design_id, 'SUB-DES-01', 'UI/UX Design',                 5, true, 1),
    (v_config_id, v_l5_id, v_design_id, 'SUB-DES-02', 'Graphic Design',               5, true, 2),
    (v_config_id, v_l5_id, v_design_id, 'SUB-DES-03', 'Motion & Video',               5, true, 3);

  -- Under Information Technology
  INSERT INTO public.cost_center_values (config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order)
  VALUES
    (v_config_id, v_l5_id, v_it_id, 'SUB-IT-01', 'Software Engineering',              5, true, 1),
    (v_config_id, v_l5_id, v_it_id, 'SUB-IT-02', 'Backend Development',              5, true, 2),
    (v_config_id, v_l5_id, v_it_id, 'SUB-IT-03', 'Frontend Development',             5, true, 3),
    (v_config_id, v_l5_id, v_it_id, 'SUB-IT-04', 'Mobile Development',               5, true, 4),
    (v_config_id, v_l5_id, v_it_id, 'SUB-IT-05', 'QA & Testing',                     5, true, 5);

  -- Under Operation Technology
  INSERT INTO public.cost_center_values (config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order)
  VALUES
    (v_config_id, v_l5_id, v_ot_id, 'SUB-OT-01', 'DevOps & Infrastructure',          5, true, 1),
    (v_config_id, v_l5_id, v_ot_id, 'SUB-OT-02', 'Cloud & Server Management',        5, true, 2),
    (v_config_id, v_l5_id, v_ot_id, 'SUB-OT-03', 'Network & Security',               5, true, 3),
    (v_config_id, v_l5_id, v_ot_id, 'SUB-OT-04', 'Database Administration',          5, true, 4);

  -- Under Operations
  INSERT INTO public.cost_center_values (config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order)
  VALUES
    (v_config_id, v_l5_id, v_ops_dept_id, 'SUB-OPS-01', 'Procurement & Vendor Mgmt', 5, true, 1),
    (v_config_id, v_l5_id, v_ops_dept_id, 'SUB-OPS-02', 'Office Administration',     5, true, 2),
    (v_config_id, v_l5_id, v_ops_dept_id, 'SUB-OPS-03', 'Facility Management',       5, true, 3);

  -- Under Human Resources
  INSERT INTO public.cost_center_values (config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order)
  VALUES
    (v_config_id, v_l5_id, v_hr_id, 'SUB-HR-01', 'Talent Acquisition',               5, true, 1),
    (v_config_id, v_l5_id, v_hr_id, 'SUB-HR-02', 'People Development & Training',   5, true, 2),
    (v_config_id, v_l5_id, v_hr_id, 'SUB-HR-03', 'Compensation & Benefits',         5, true, 3);

  -- Under IT Support & Helpdesk
  INSERT INTO public.cost_center_values (config_id, level_id, parent_value_id, kode, nama, level_number, is_active, sort_order)
  VALUES
    (v_config_id, v_l5_id, v_itsup_dept_id, 'SUB-ITS-01', 'End-User Support',        5, true, 1),
    (v_config_id, v_l5_id, v_itsup_dept_id, 'SUB-ITS-02', 'Asset & License Mgmt',   5, true, 2),
    (v_config_id, v_l5_id, v_itsup_dept_id, 'SUB-ITS-03', 'Internal Tools & ERP',   5, true, 3);

  RAISE NOTICE 'WIT.ID cost center org structure seeded. Config ID: %', v_config_id;
END $$;
