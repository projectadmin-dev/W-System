-- ============================================================
-- Tax Withholding (Fase C): AR-PAY-RCV journal config — add PPh line
-- See docs/TAX-WITHHOLDING-PLAN.md §6.2
--
-- Before: Dr Bank (bayar_sekarang) / Cr Piutang (bayar_sekarang)
-- After:  Dr Bank                  (kas_neto = gross − pph)
--         Dr PPh 23 Dibayar Dimuka (pph_amount, OPTIONAL — skipped when 0)
--         Cr Piutang Usaha         (bayar_sekarang, gross)
--
-- Customer withholds PPh from our invoice payment → we receive cash net of
-- PPh but the receivable is cleared in full; the withheld amount is a
-- creditable prepaid-tax asset (1-10400-3).
--
-- ⚠️ DEPLOY ORDER: apply AFTER the new AR payment service is live (it sends
-- kas_neto). Reverse window (new code + old config) stays balanced.
-- When pph_amount = 0: line 2 skipped, kas_neto = bayar_sekarang → identical
-- to the previous journal.
-- ============================================================

DO $$
DECLARE
    v_tenant  UUID := '00000000-0000-0000-0000-000000000001';
    k         UUID;
    c_piutang UUID;
    c_pph23dd UUID;
BEGIN
    SELECT id INTO k FROM public.konfigurasi_jurnal
        WHERE tenant_id = v_tenant AND kode_konfigurasi = 'AR-PAY-RCV' AND deleted_at IS NULL;
    IF k IS NULL THEN
        RAISE NOTICE 'AR-PAY-RCV config not found — skipping';
        RETURN;
    END IF;

    SELECT id INTO c_piutang FROM public.coa
        WHERE tenant_id = v_tenant AND account_code = '1-10100' LIMIT 1;
    SELECT id INTO c_pph23dd FROM public.coa
        WHERE tenant_id = v_tenant AND account_code = '1-10400-3' LIMIT 1;

    DELETE FROM public.konfigurasi_jurnal_detail WHERE konfigurasi_id = k;

    INSERT INTO public.konfigurasi_jurnal_detail
        (tenant_id, konfigurasi_id, coa_id, dynamic_source, posisi, sumber_nominal, urutan, keterangan_baris, is_optional)
    VALUES
        (v_tenant, k, NULL,      'ar_bank_coa', 'debit',  'kas_neto',       1, 'Kas/Bank (neto)',                FALSE),
        (v_tenant, k, c_pph23dd, NULL,          'debit',  'pph_amount',     2, 'PPh 23 Dibayar Dimuka (kredit pajak)', TRUE),
        (v_tenant, k, c_piutang, NULL,          'credit', 'bayar_sekarang', 3, 'Piutang Usaha (gross)',          FALSE);
END $$;
