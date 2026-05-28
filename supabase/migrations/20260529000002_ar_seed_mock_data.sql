-- ============================================================
-- AR Monitoring — Mock Data Seed
-- Tujuan: Menampilkan contoh data untuk testing UI/UX
-- ============================================================

DO $$
DECLARE
  v_tenant   UUID := '00000000-0000-0000-0000-000000000001';

  -- User dari seed migration (project manager WIT)
  v_user     UUID;

  -- Clients
  v_client_sdn   UUID := gen_random_uuid();
  v_client_indo  UUID := gen_random_uuid();
  v_client_maju  UUID := gen_random_uuid();
  v_client_prima UUID := gen_random_uuid();

  -- Projects
  v_proj_erp     UUID := '65196ad6-f52f-4be7-9c5b-a00633d5ccd6'; -- existing from CSV
  v_proj_dash    UUID := gen_random_uuid();
  v_proj_maint   UUID := gen_random_uuid();
  v_proj_inv     UUID := gen_random_uuid();

  -- Bank IDs
  v_bank_bca     UUID;
  v_bank_mandiri UUID;
  v_bank_bri     UUID;

BEGIN
  -- ── Resolve user ─────────────────────────────────────────────
  SELECT id INTO v_user FROM public.user_profiles
  WHERE email LIKE '%@wit.id' LIMIT 1;

  -- Fallback: use the project manager UUID from the CSV
  IF v_user IS NULL THEN
    v_user := '8734a995-64dd-4ae1-ae34-dfc505b9271d';
  END IF;

  -- ── Resolve bank IDs ─────────────────────────────────────────
  SELECT id INTO v_bank_bca     FROM public.ar_bank_accounts WHERE tenant_id = v_tenant AND kode = 'B001';
  SELECT id INTO v_bank_mandiri FROM public.ar_bank_accounts WHERE tenant_id = v_tenant AND kode = 'B002';
  SELECT id INTO v_bank_bri     FROM public.ar_bank_accounts WHERE tenant_id = v_tenant AND kode = 'B003';

  -- ── Seed Clients ─────────────────────────────────────────────
  INSERT INTO public.clients (id, tenant_id, name, legal_name, type, tier, created_at, updated_at)
  VALUES
    (v_client_sdn,   v_tenant, 'PT Sumber Daya Nusantara',   'PT Sumber Daya Nusantara',   'active', 'enterprise', NOW(), NOW()),
    (v_client_indo,  v_tenant, 'PT Indomedia Digital Solusi', 'PT Indomedia Digital Solusi', 'active', 'mid',        NOW(), NOW()),
    (v_client_maju,  v_tenant, 'CV Maju Logistik Nusantara',  'CV Maju Logistik Nusantara',  'active', 'small',      NOW(), NOW()),
    (v_client_prima, v_tenant, 'PT Prima Teknologi Indonesia', 'PT Prima Teknologi Indonesia','active', 'mid',        NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- ── Seed / Update Projects ───────────────────────────────────

  -- Update existing CSV project → active, link to client
  UPDATE public.projects
  SET status = 'active', client_id = v_client_sdn, updated_at = NOW()
  WHERE id = v_proj_erp AND tenant_id = v_tenant;

  -- New projects
  INSERT INTO public.projects (id, tenant_id, project_code, project_name, client_id, budget_amount, currency, start_date, end_date, status, project_manager, created_by, created_at, updated_at)
  VALUES
    (v_proj_dash, v_tenant, 'PRJ-2026-002', 'Dashboard Analytics Real-Time',        v_client_indo,  320000000, 'IDR', '2026-07-01', '2026-09-30', 'active', v_user, v_user, NOW(), NOW()),
    (v_proj_maint,v_tenant, 'PRJ-2026-003', 'HRIS Maintenance & Support Retainer',  v_client_prima, 600000000, 'IDR', '2026-01-01', '2026-12-31', 'active', v_user, v_user, NOW(), NOW()),
    (v_proj_inv,  v_tenant, 'PRJ-2026-004', 'Sistem Inventory Warehouse Management',v_client_maju,  450000000, 'IDR', '2026-03-01', '2026-08-31', 'active', v_user, v_user, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- ── Seed AR Invoices ─────────────────────────────────────────

  -- PROJECT 1: ERP SAP — 3 invoice (lunas, sebagian, belum)
  INSERT INTO public.ar_invoices (
    tenant_id, project_id, project_name, client_name, nilai_kontrak,
    no_invoice, tgl_invoice, tipe_invoice, description,
    qty, harga_satuan, ppn_11_persen,
    sudah_dibayar, note_termin, payment_method, bank_id, bank_label,
    deadline_bayar, status_bayar, status_kirim,
    created_by, created_at, updated_at
  ) VALUES
    -- Termin 1: LUNAS
    (v_tenant, v_proj_erp, 'Implementasi ERP SAP Business One', 'PT Sumber Daya Nusantara', 850000000,
     'INV-20260101-001', '2026-01-01', 'one_time', 'Kickoff & Requirement Gathering',
     1, 255000000, TRUE,
     283050000, 'Termin 1 dari 3 (30%)', 'BCA', v_bank_bca, 'B001 - BCA IRFAN ARSANDI',
     '2026-01-31', 'lunas', 'sent',
     v_user, NOW(), NOW()),

    -- Termin 2: SEBAGIAN
    (v_tenant, v_proj_erp, 'Implementasi ERP SAP Business One', 'PT Sumber Daya Nusantara', 850000000,
     'INV-20260201-001', '2026-02-01', 'one_time', 'Development & Konfigurasi Modul',
     1, 340000000, TRUE,
     200000000, 'Termin 2 dari 3 (40%)', 'BCA', v_bank_bca, 'B001 - BCA IRFAN ARSANDI',
     '2026-03-01', 'sebagian', 'sent',
     v_user, NOW(), NOW()),

    -- Termin 3: BELUM (dengan deadline lewat → jatuh_tempo)
    (v_tenant, v_proj_erp, 'Implementasi ERP SAP Business One', 'PT Sumber Daya Nusantara', 850000000,
     'INV-20260315-001', '2026-03-15', 'one_time', 'UAT, Training & Go-Live Support',
     1, 255000000, TRUE,
     0, 'Termin 3 dari 3 (30%)', NULL, NULL, NULL,
     '2026-04-15', 'jatuh_tempo', 'sent',
     v_user, NOW(), NOW());

  -- PROJECT 2: Dashboard Analytics — 2 invoice
  INSERT INTO public.ar_invoices (
    tenant_id, project_id, project_name, client_name, nilai_kontrak,
    no_invoice, tgl_invoice, tipe_invoice, description,
    qty, harga_satuan, ppn_11_persen,
    sudah_dibayar, payment_method, bank_id, bank_label,
    deadline_bayar, status_bayar, status_kirim,
    created_by, created_at, updated_at
  ) VALUES
    (v_tenant, v_proj_dash, 'Dashboard Analytics Real-Time', 'PT Indomedia Digital Solusi', 320000000,
     'INV-20260501-001', '2026-05-01', 'one_time', 'Development Dashboard Phase 1',
     1, 160000000, FALSE,
     80000000, 'Mandiri', v_bank_mandiri, 'B002 - Mandiri WAHANA INFORMASI TEKNOLOGI',
     '2026-06-01', 'sebagian', 'sent',
     v_user, NOW(), NOW()),

    (v_tenant, v_proj_dash, 'Dashboard Analytics Real-Time', 'PT Indomedia Digital Solusi', 320000000,
     'INV-20260601-001', '2026-06-01', 'one_time', 'Development Dashboard Phase 2 & Deployment',
     1, 160000000, FALSE,
     0, NULL, NULL, NULL,
     '2026-06-30', 'belum', 'sent',
     v_user, NOW(), NOW());

  -- PROJECT 3: HRIS Maintenance — 6 recurring monthly invoices (Jan–Jun 2026)
  DECLARE
    v_parent_id UUID := gen_random_uuid();
    v_months    TEXT[] := ARRAY['01','02','03','04','05','06'];
    v_statuses  TEXT[] := ARRAY['sent','sent','sent','sent','reminder','reminder'];
    v_paid      NUMERIC[] := ARRAY[50000000,50000000,50000000,25000000,0,0];
    v_sb        TEXT[] := ARRAY['lunas','lunas','lunas','sebagian','belum','belum'];
    v_i         INT;
    v_inv_id    UUID;
    v_bank_ref  UUID;
    v_bank_lbl  TEXT;
  BEGIN
    FOR v_i IN 1..6 LOOP
      v_inv_id := CASE WHEN v_i = 1 THEN v_parent_id ELSE gen_random_uuid() END;
      v_bank_ref := CASE WHEN v_i <= 4 THEN v_bank_bca ELSE NULL END;
      v_bank_lbl := CASE WHEN v_i <= 4 THEN 'B001 - BCA IRFAN ARSANDI' ELSE NULL END;

      INSERT INTO public.ar_invoices (
        id, tenant_id, project_id, project_name, client_name, nilai_kontrak,
        no_invoice, tgl_invoice, tipe_invoice, description,
        qty, harga_satuan, ppn_11_persen,
        recurring_start_date, recurring_end_date, recurring_interval,
        recurring_parent_id, recurring_sequence,
        sudah_dibayar, payment_method, bank_id, bank_label,
        deadline_bayar, status_bayar, status_kirim,
        created_by, created_at, updated_at
      ) VALUES (
        v_inv_id, v_tenant, v_proj_maint, 'HRIS Maintenance & Support Retainer', 'PT Prima Teknologi Indonesia', 600000000,
        'INV-2026' || v_months[v_i] || '01-001',
        ('2026-' || v_months[v_i] || '-01')::DATE,
        'recurring',
        'Monthly Maintenance & Support Fee — Bulan ' || v_i,
        1, 50000000, FALSE,
        '2026-01-01', '2026-06-30', 'monthly',
        CASE WHEN v_i = 1 THEN NULL ELSE v_parent_id END,
        v_i,
        v_paid[v_i],
        CASE WHEN v_i <= 4 THEN 'BCA' ELSE NULL END,
        v_bank_ref, v_bank_lbl,
        ('2026-' || v_months[v_i] || '-15')::DATE,
        v_sb[v_i],
        v_statuses[v_i],
        v_user, NOW(), NOW()
      ) ON CONFLICT (tenant_id, no_invoice) DO NOTHING;
    END LOOP;
  END;

  -- PROJECT 4: Inventory WMS — 2 invoice (1 jatuh_tempo, 1 belum)
  INSERT INTO public.ar_invoices (
    tenant_id, project_id, project_name, client_name, nilai_kontrak,
    no_invoice, tgl_invoice, tipe_invoice, description,
    qty, harga_satuan, ppn_11_persen,
    sudah_dibayar, payment_method, bank_id, bank_label,
    deadline_bayar, status_bayar, status_kirim,
    created_by, created_at, updated_at
  ) VALUES
    (v_tenant, v_proj_inv, 'Sistem Inventory Warehouse Management', 'CV Maju Logistik Nusantara', 450000000,
     'INV-20260301-001', '2026-03-01', 'one_time', 'Analisis Kebutuhan & Desain Sistem',
     1, 135000000, TRUE,
     0, NULL, NULL, NULL,
     '2026-04-01', 'jatuh_tempo', 'sent',
     v_user, NOW(), NOW()),

    (v_tenant, v_proj_inv, 'Sistem Inventory Warehouse Management', 'CV Maju Logistik Nusantara', 450000000,
     'INV-20260501-002', '2026-05-01', 'one_time', 'Development Modul Core',
     1, 180000000, TRUE,
     0, NULL, NULL, NULL,
     '2026-06-01', 'belum', 'sent',
     v_user, NOW(), NOW());

  -- ── Payment History untuk invoice yang sudah dibayar ─────────
  INSERT INTO public.ar_payment_history (
    tenant_id, invoice_id, sudah_dibayar_lama, sisa_piutang_lama,
    bayar_sekarang, status_baru, bank_id, bank_label,
    catatan_pembayaran, created_at, actor_name
  )
  SELECT
    v_tenant,
    inv.id,
    0,
    inv.total_piutang,
    inv.sudah_dibayar,
    inv.status_bayar,
    inv.bank_id,
    inv.bank_label,
    'Pembayaran via ' || COALESCE(inv.payment_method, 'Transfer'),
    NOW() - INTERVAL '10 days',
    'Finance Team'
  FROM public.ar_invoices inv
  WHERE inv.tenant_id = v_tenant
    AND inv.sudah_dibayar > 0
    AND NOT EXISTS (
      SELECT 1 FROM public.ar_payment_history ph WHERE ph.invoice_id = inv.id
    );

END $$;
