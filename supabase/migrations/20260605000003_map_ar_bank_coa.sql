-- ============================================================
-- Journal Automation (Phase 4): map AR bank accounts to a cash/bank COA.
-- Needed so AR payment receipts (UC#2) can resolve the Dr Kas/Bank account.
-- Idempotent: only fills coa_id where currently null.
-- Heuristic: "cash/kas" accounts -> 1-10001 Kas, otherwise -> 1-10002 Bank.
-- ============================================================

UPDATE public.ar_bank_accounts ab
SET coa_id = c.id
FROM public.coa c
WHERE ab.coa_id IS NULL
  AND c.tenant_id = ab.tenant_id
  AND c.account_code = CASE
        WHEN ab.nama_bank ILIKE '%cash%' OR ab.nama_akun ILIKE '%kas%' THEN '1-10001'
        ELSE '1-10002'
      END;
