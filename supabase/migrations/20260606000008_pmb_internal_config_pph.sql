-- ============================================================
-- Tax Withholding (Fase E): PMB-INTERNAL config — add PPh line
-- Internal disbursement paying a third party for services → we withhold PPh 23.
--
-- Before: Dr Beban (nominal_bayar) / Dr Biaya Lain (multi) / Cr Bank (grand_total)
-- After:  Dr Beban             (nominal_bayar)
--         Dr Biaya Lain        (biaya_lain_amount, multi-line)
--         Cr Hutang PPh 23     (pph_amount, OPTIONAL — skipped when 0)
--         Cr Bank              (kas_neto = grand_total − pph)
--
-- DPP basis = nominal_bayar (service value; biaya lain excluded). When PPh=0,
-- the line is skipped and kas_neto = grand_total → journal identical to before.
--
-- ⚠️ DEPLOY ORDER: apply AFTER the new execute route is live (it sends kas_neto).
-- ============================================================

DO $$
DECLARE
    v_tenant UUID := '00000000-0000-0000-0000-000000000001';
    k        UUID;
    c_pph23  UUID;
BEGIN
    SELECT id INTO k FROM public.konfigurasi_jurnal
        WHERE tenant_id = v_tenant AND kode_konfigurasi = 'PMB-INTERNAL' AND deleted_at IS NULL;
    IF k IS NULL THEN
        RAISE NOTICE 'PMB-INTERNAL config not found — skipping';
        RETURN;
    END IF;

    SELECT id INTO c_pph23 FROM public.coa
        WHERE tenant_id = v_tenant AND account_code = '2-10200-2' LIMIT 1;

    DELETE FROM public.konfigurasi_jurnal_detail WHERE konfigurasi_id = k;

    INSERT INTO public.konfigurasi_jurnal_detail
        (tenant_id, konfigurasi_id, coa_id, dynamic_source, posisi, sumber_nominal, urutan, keterangan_baris, is_optional)
    VALUES
        (v_tenant, k, NULL,    'pmb_expense_coa',    'debit',  'nominal_bayar',     1, 'Beban',                             FALSE),
        (v_tenant, k, NULL,    'pmb_biaya_lain_coa', 'debit',  'biaya_lain_amount', 2, 'Biaya Lain',                        FALSE),
        (v_tenant, k, c_pph23, NULL,                 'credit', 'pph_amount',        3, 'Hutang PPh 23 (potong saat bayar)', TRUE),
        (v_tenant, k, NULL,    'pmb_bank_coa',       'credit', 'kas_neto',          4, 'Kas/Bank (neto)',                   FALSE);
END $$;
