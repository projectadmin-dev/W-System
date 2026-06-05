-- ============================================================
-- Journal Automation (Phase 3): Seed the 5 trigger configs.
-- Idempotent: re-running upserts the header and rebuilds details.
-- Fixed COA resolved by account_code; dynamic accounts/lines are
-- read from the source document at runtime by the engine.
-- ============================================================

DO $$
DECLARE
    v_tenant  UUID := '00000000-0000-0000-0000-000000000001';
    v_user    UUID := '00000000-0000-0000-0000-000000000002';
    c_piutang UUID; -- 1-10100 Piutang Usaha
    c_ppn_out UUID; -- 2-10200-4 Hutang PPN (output VAT)
    c_ppn_in  UUID; -- 1-10400-1 PPN Masukan (input VAT)
    c_hutang  UUID; -- 2-10100 Hutang Usaha
    k UUID;
BEGIN
    SELECT id INTO c_piutang FROM public.coa WHERE account_code='1-10100'   AND tenant_id=v_tenant;
    SELECT id INTO c_ppn_out FROM public.coa WHERE account_code='2-10200-4' AND tenant_id=v_tenant;
    SELECT id INTO c_ppn_in  FROM public.coa WHERE account_code='1-10400-1' AND tenant_id=v_tenant;
    SELECT id INTO c_hutang  FROM public.coa WHERE account_code='2-10100'   AND tenant_id=v_tenant;

    IF c_piutang IS NULL OR c_ppn_out IS NULL OR c_ppn_in IS NULL OR c_hutang IS NULL THEN
        RAISE EXCEPTION 'Seed aborted: required COA accounts not found (1-10100, 2-10200-4, 1-10400-1, 2-10100)';
    END IF;

    -- ── UC#1: AR-INV-ISSUE ──────────────────────────────────
    INSERT INTO public.konfigurasi_jurnal
        (tenant_id, kode_konfigurasi, nama_fitur, modul_referensi, tipe_jurnal, keterangan, created_by)
    VALUES
        (v_tenant, 'AR-INV-ISSUE', 'Terbit Invoice Penjualan (AR)', 'penjualan',
         'piutang_pendapatan', 'Dr Piutang / Cr Pendapatan + PPN Keluaran saat invoice diterbitkan', v_user)
    ON CONFLICT (tenant_id, kode_konfigurasi)
        DO UPDATE SET nama_fitur=EXCLUDED.nama_fitur, tipe_jurnal=EXCLUDED.tipe_jurnal,
                      keterangan=EXCLUDED.keterangan, is_aktif=TRUE, updated_at=NOW(), updated_by=v_user
        RETURNING id INTO k;
    DELETE FROM public.konfigurasi_jurnal_detail WHERE konfigurasi_id=k;
    INSERT INTO public.konfigurasi_jurnal_detail
        (tenant_id, konfigurasi_id, coa_id, dynamic_source, posisi, sumber_nominal, urutan, keterangan_baris, is_optional) VALUES
        (v_tenant, k, c_piutang, NULL,                  'debit',  'total_piutang', 1, 'Piutang Usaha',  FALSE),
        (v_tenant, k, NULL,      'invoice_revenue_coa', 'credit', 'subtotal',      2, 'Pendapatan',     FALSE),
        (v_tenant, k, c_ppn_out, NULL,                  'credit', 'pajak',         3, 'PPN Keluaran',   TRUE);

    -- ── UC#2: AR-PAY-RCV ────────────────────────────────────
    INSERT INTO public.konfigurasi_jurnal
        (tenant_id, kode_konfigurasi, nama_fitur, modul_referensi, tipe_jurnal, keterangan, created_by)
    VALUES
        (v_tenant, 'AR-PAY-RCV', 'Terima Pembayaran Invoice (AR)', 'penjualan',
         'pelunasan_piutang', 'Dr Kas/Bank / Cr Piutang saat pembayaran customer diterima', v_user)
    ON CONFLICT (tenant_id, kode_konfigurasi)
        DO UPDATE SET nama_fitur=EXCLUDED.nama_fitur, tipe_jurnal=EXCLUDED.tipe_jurnal,
                      keterangan=EXCLUDED.keterangan, is_aktif=TRUE, updated_at=NOW(), updated_by=v_user
        RETURNING id INTO k;
    DELETE FROM public.konfigurasi_jurnal_detail WHERE konfigurasi_id=k;
    INSERT INTO public.konfigurasi_jurnal_detail
        (tenant_id, konfigurasi_id, coa_id, dynamic_source, posisi, sumber_nominal, urutan, keterangan_baris, is_optional) VALUES
        (v_tenant, k, NULL,      'ar_bank_coa', 'debit',  'bayar_sekarang', 1, 'Kas/Bank',      FALSE),
        (v_tenant, k, c_piutang, NULL,          'credit', 'bayar_sekarang', 2, 'Piutang Usaha', FALSE);

    -- ── UC#3: AP-BILL-RCV ───────────────────────────────────
    INSERT INTO public.konfigurasi_jurnal
        (tenant_id, kode_konfigurasi, nama_fitur, modul_referensi, tipe_jurnal, keterangan, created_by)
    VALUES
        (v_tenant, 'AP-BILL-RCV', 'Terima Tagihan Pihak Ketiga (AP)', 'pembelian',
         'hutang_beban', 'Dr Beban/Aset (per item) + PPN Masukan / Cr Hutang Usaha saat tagihan diterima', v_user)
    ON CONFLICT (tenant_id, kode_konfigurasi)
        DO UPDATE SET nama_fitur=EXCLUDED.nama_fitur, tipe_jurnal=EXCLUDED.tipe_jurnal,
                      keterangan=EXCLUDED.keterangan, is_aktif=TRUE, updated_at=NOW(), updated_by=v_user
        RETURNING id INTO k;
    DELETE FROM public.konfigurasi_jurnal_detail WHERE konfigurasi_id=k;
    INSERT INTO public.konfigurasi_jurnal_detail
        (tenant_id, konfigurasi_id, coa_id, dynamic_source, posisi, sumber_nominal, urutan, keterangan_baris, is_optional) VALUES
        (v_tenant, k, NULL,     'ap_line_coa', 'debit',  'line_amount', 1, 'Beban/Aset (per item)', FALSE),
        (v_tenant, k, c_ppn_in, NULL,          'debit',  'pajak',       2, 'PPN Masukan',           TRUE),
        (v_tenant, k, c_hutang, NULL,          'credit', 'grand_total', 3, 'Hutang Usaha',          FALSE);

    -- ── UC#4: AP-PAY ────────────────────────────────────────
    INSERT INTO public.konfigurasi_jurnal
        (tenant_id, kode_konfigurasi, nama_fitur, modul_referensi, tipe_jurnal, keterangan, created_by)
    VALUES
        (v_tenant, 'AP-PAY', 'Bayar Tagihan Pihak Ketiga (AP)', 'pembelian',
         'pelunasan_hutang', 'Dr Hutang Usaha / Cr Kas/Bank saat tagihan dibayar', v_user)
    ON CONFLICT (tenant_id, kode_konfigurasi)
        DO UPDATE SET nama_fitur=EXCLUDED.nama_fitur, tipe_jurnal=EXCLUDED.tipe_jurnal,
                      keterangan=EXCLUDED.keterangan, is_aktif=TRUE, updated_at=NOW(), updated_by=v_user
        RETURNING id INTO k;
    DELETE FROM public.konfigurasi_jurnal_detail WHERE konfigurasi_id=k;
    INSERT INTO public.konfigurasi_jurnal_detail
        (tenant_id, konfigurasi_id, coa_id, dynamic_source, posisi, sumber_nominal, urutan, keterangan_baris, is_optional) VALUES
        (v_tenant, k, c_hutang, NULL,          'debit',  'bayar_sekarang', 1, 'Hutang Usaha', FALSE),
        (v_tenant, k, NULL,     'ap_bank_coa', 'credit', 'bayar_sekarang', 2, 'Kas/Bank',     FALSE);

    -- ── UC#5: PMB-INTERNAL ──────────────────────────────────
    INSERT INTO public.konfigurasi_jurnal
        (tenant_id, kode_konfigurasi, nama_fitur, modul_referensi, tipe_jurnal, keterangan, created_by)
    VALUES
        (v_tenant, 'PMB-INTERNAL', 'Pembayaran Permintaan Uang Internal', 'pembayaran_internal',
         'beban_kas', 'Dr Beban (+ biaya lain) / Cr Kas/Bank saat transfer disbursement internal', v_user)
    ON CONFLICT (tenant_id, kode_konfigurasi)
        DO UPDATE SET nama_fitur=EXCLUDED.nama_fitur, tipe_jurnal=EXCLUDED.tipe_jurnal,
                      keterangan=EXCLUDED.keterangan, is_aktif=TRUE, updated_at=NOW(), updated_by=v_user
        RETURNING id INTO k;
    DELETE FROM public.konfigurasi_jurnal_detail WHERE konfigurasi_id=k;
    INSERT INTO public.konfigurasi_jurnal_detail
        (tenant_id, konfigurasi_id, coa_id, dynamic_source, posisi, sumber_nominal, urutan, keterangan_baris, is_optional) VALUES
        (v_tenant, k, NULL, 'pmb_expense_coa',    'debit',  'nominal_bayar',     1, 'Beban',        FALSE),
        (v_tenant, k, NULL, 'pmb_biaya_lain_coa', 'debit',  'biaya_lain_amount', 2, 'Biaya Lain',   FALSE),
        (v_tenant, k, NULL, 'pmb_bank_coa',       'credit', 'grand_total',       3, 'Kas/Bank',     FALSE);
END $$;
