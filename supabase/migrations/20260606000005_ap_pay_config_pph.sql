-- ============================================================
-- Tax Withholding (Fase B): AP-PAY journal config — add PPh line
-- See docs/TAX-WITHHOLDING-PLAN.md §6.1
--
-- Before: Dr Hutang Usaha (bayar_sekarang) / Cr Bank (bayar_sekarang)
-- After:  Dr Hutang Usaha (bayar_sekarang, gross)
--         Cr Hutang PPh 23 (pph_amount, OPTIONAL — skipped when 0)
--         Cr Bank          (kas_neto = gross − pph)
--
-- ⚠️ DEPLOY ORDER: apply this AFTER the new pay route is live. The new
-- bank line reads `kas_neto`, which only the updated route sends. If applied
-- before the route deploy, old payments (sending only bayar_sekarang) would
-- leave the bank line at 0 → unbalanced → journal skipped (non-blocking).
-- The reverse window (new route + old config) stays balanced (PPh recorded in
-- ap_payment_history but not yet split in the journal).
--
-- When pph_amount = 0: line 2 is skipped and kas_neto = bayar_sekarang, so the
-- journal is byte-for-byte identical to the previous behavior.
-- ============================================================

DO $$
DECLARE
    v_tenant UUID := '00000000-0000-0000-0000-000000000001';
    k        UUID;
    c_hutang UUID;
    c_pph23  UUID;
BEGIN
    SELECT id INTO k FROM public.konfigurasi_jurnal
        WHERE tenant_id = v_tenant AND kode_konfigurasi = 'AP-PAY' AND deleted_at IS NULL;
    IF k IS NULL THEN
        RAISE NOTICE 'AP-PAY config not found — skipping';
        RETURN;
    END IF;

    SELECT id INTO c_hutang FROM public.coa
        WHERE tenant_id = v_tenant AND account_code = '2-10100' LIMIT 1;
    SELECT id INTO c_pph23 FROM public.coa
        WHERE tenant_id = v_tenant AND account_code = '2-10200-2' LIMIT 1;

    DELETE FROM public.konfigurasi_jurnal_detail WHERE konfigurasi_id = k;

    INSERT INTO public.konfigurasi_jurnal_detail
        (tenant_id, konfigurasi_id, coa_id, dynamic_source, posisi, sumber_nominal, urutan, keterangan_baris, is_optional)
    VALUES
        (v_tenant, k, c_hutang, NULL,          'debit',  'bayar_sekarang', 1, 'Hutang Usaha (gross)',           FALSE),
        (v_tenant, k, c_pph23,  NULL,          'credit', 'pph_amount',     2, 'Hutang PPh 23 (potong saat bayar)', TRUE),
        (v_tenant, k, NULL,     'ap_bank_coa', 'credit', 'kas_neto',       3, 'Kas/Bank (neto)',                FALSE);
END $$;
