# FINANCE — Journal / Jurnal Umum + Auto-Journal Engine — Migration Guide

**Module:** Finance → General Journal + Auto-Journal Engine
**Companion:** `FINANCE-JOURNAL-SPEC.md`
**Tenant:** `00000000-0000-0000-0000-000000000001`
**Last updated:** 2026-06-08

> **Appendix A** seeds the auto-journal **config** (`konfigurasi_jurnal` + `_detail`). The journal **entries/lines** themselves are in `supabase/seed/lk_reports_seed.sql` (shared with Laporan Keuangan); cost centers in `20260528000008_seed_cost_centers.sql`.

---

## Table of Contents

1. [Overview](#1-overview) · 2. [Migration Order](#2-migration-order) · 3. [Deploy Runbook](#3-deploy-runbook) · 4. [ADRs](#4-architecture-decision-records-adr) · 5. [Anti-Patterns](#5-anti-patterns--pitfalls) · 6. [Rollback](#6-rollback) · 7. [Verification](#7-verification-queries) · 8. [Appendix A — Auto-Journal Config Seed](#appendix-a--auto-journal-config-seed)

---

## 1. Overview

The journal core is the double-entry ledger (`journal_entries` + `journal_lines`) with posted-immutability and balance triggers, extended by: journal categories, cost-center allocation, and a **config-driven auto-journal engine** (`konfigurasi_jurnal`) that posts AR/AP/internal-payment journals. Later tax-withholding migrations extended the config to carry PPh lines.

## 2. Migration Order

| # | Migration file | What it does |
|---|---|---|
| 1 | `20260421015823_create_journal_entries.sql` | `journal_entries` + `journal_lines` + `fiscal_periods`; triggers: balance validation, posted-immutability, `assign_fiscal_period`; single-side line CHECK. |
| 2 | `202605150400_add_posted_at_journal.sql` | adds `posted_at` (currently unwritten — see anti-patterns). |
| 3 | `20260528000002_journal_kategori.sql` | adds `kategori_jurnal` (`REGULAR/BEGINNING_BALANCE/CLOSING/ADJUSTMENT`) + index. |
| 4 | `20260528000003_cost_center.sql` | `cost_center_configs` / `cost_center_levels` / `cost_center_values` (tree). |
| 5 | `20260528000004_journal_line_cost_centers.sql` | split-allocation table + `journal_lines.cost_center_value_id`. |
| 6 | `20260605000001_journal_automation_schema.sql` | `konfigurasi_jurnal` + `konfigurasi_jurnal_detail` + `jurnal_error_log` + `ap_payment_history`; extends `source_type` CHECK; adds source-doc COA/journal-link columns. |
| 7 | `20260605000002_seed_journal_automation_config.sql` | seeds the 5 base configs (AR-INV-ISSUE, AR-PAY-RCV, AP-BILL-RCV, AP-PAY, PMB-INTERNAL). |
| 8 | `20260605000004_journal_automation_indexes.sql` | indexes for the engine. |
| 9 | `20260606000002/03_tax_withholding_*` | PPh premise columns + CHECKs; extends `sumber_nominal` with `pph_amount`/`kas_neto`. |
| 10 | `20260606000005/06/08_*_pph.sql` | rebuilds AP-PAY / AR-PAY-RCV / PMB-INTERNAL config details to add the optional PPh line + switch the bank leg to `kas_neto`. |

### ⚠ Deploy-order coupling (critical)
Migrations #10 make the cash/bank leg read **`kas_neto`**, which only the **updated routes** send. Apply them **after** deploying the matching AR/AP/pembayaran route code. Applied early, old payments (sending only `bayar_sekarang`) leave the bank line at 0 → unbalanced → journal silently skipped (non-blocking) and must be backfilled.

### Dependency graph
```
coa ─┐
fiscal_periods ─┼─► journal_entries ──► journal_lines ──► journal_line_cost_centers
                │         ▲ source_id/source_type back-link
konfigurasi_jurnal ──► konfigurasi_jurnal_detail   (engine config; CASCADE)
engine writes journal_entry_id back to: ar_invoices, ar_payment_history,
   ap_invoices, ap_payment_history, pembayaran
jurnal_error_log  ◄── engine failures (non-blocking)
```

## 3. Deploy Runbook

```bash
cd /home/ubuntu/apps/wsystem-1 && git pull origin master
# Deploy route code FIRST, then apply migrations (see deploy-order coupling above):
cd apps/web && npm run build && pm2 restart wsystem-1-staging
supabase db push
# config + entries fixtures:
# psql "$DATABASE_URL" -f supabase/seed/journal_automation_seed.sql   # konfigurasi config
# psql "$DATABASE_URL" -f supabase/seed/lk_reports_seed.sql            # entries + lines (see its trigger note)
```

## 4. Architecture Decision Records (ADR)

### ADR-1 — Config-driven auto-journal engine (not hardcoded postings)
Journals for AR/AP/internal events come from `konfigurasi_jurnal` templates resolved at runtime, not from per-route hardcoded Dr/Cr.
**Why:** accountants can change mappings without code; one engine guarantees consistency across modules. **Trade-off:** a token vocabulary (`dynamic_source`/`sumber_nominal`) must stay in sync across the DB CHECK and two TS files; a missing/inactive config silently produces no journal (logged).

### ADR-2 — Pure core + impure wrapper
`journal-engine-core.ts` (resolution + balance) is side-effect-free and unit-tested; `journal-engine.ts` does DB + write-back.
**Why:** the accounting logic is testable without a DB. **Trade-off:** two layers to keep aligned.

### ADR-3 — Always-Balanced · Non-blocking · Idempotent
The engine never breaks the business transaction: it validates balance, skips zero-nominal lines, dedupes by `(source_type, source_id)`, and logs failures to `jurnal_error_log` instead of throwing.
**Why:** a journaling glitch must not block an invoice/payment. **Trade-off:** missing journals are silent — must be monitored via `jurnal_error_log` + the "approved/paid but no journal" query (§7).

### ADR-4 — Posted entries are immutable; correct via reversal
DB triggers block UPDATE/DELETE of posted entries/lines; corrections create a new reversing entry.
**Why:** PSAK / audit integrity. **Trade-off:** soft-deleting a posted entry errors at the DB; single-entry `/reverse` leaves an unposted draft (must be posted).

### ADR-5 — Balance validated on `*_amount_base`
The on-post trigger sums `debit_amount_base`/`credit_amount_base` (IDR base), not transaction amounts.
**Why:** multi-currency-ready base balancing. **Trade-off:** a caller passing wrong base can pass the DB check while the transaction amounts disagree (currently base defaults to `amount × rate`).

### ADR-6 — PPh at payment, DPP = subtotal, server-computed
Withholding is computed server-side at payment time; optional PPh lines vanish when `pph_amount = 0`.
**Why:** PSAK timing + never trust client tax numbers. **Trade-off:** the deploy-order coupling above.

## 5. Anti-Patterns & Pitfalls

| ❌ Anti-pattern | ✅ Do instead / note |
|---|---|
| Hardcoding Dr/Cr in a new route | Add a `konfigurasi_jurnal` config + call `processJournalAutomation` |
| Mutating a posted entry | Immutable — reverse it (`/reverse` then post, or `/reverse-source`) |
| Trusting an approval/payment implies a journal | Check `jurnal_error_log` + the "missing journal" query; engine is non-blocking |
| Applying PPh config migrations before route deploy | Bank leg reads `kas_neto=0` → journal skipped; deploy routes first |
| Expecting `posted_at` to be set | Repo never writes it — fix in the new repo |
| Relying on `journal_line_cost_centers` | Write-dead today; the `new` page only sets `journal_lines.cost_center_value_id` |
| Treating `konfigurasi_*`/`jurnal_error_log` as tenant-isolated | RLS is `USING(true)`, no `tenants` FK — harden in the new repo |
| Re-running the config seed on shared data | Appendix A `DELETE`s this tenant's config first (detail before header) |

## 6. Rollback

```sql
-- Reverse auto-journals for a source (preferred correction):
-- POST /api/finance/journal/reverse-source { source_type, source_id }

-- Config reset (safe; engine just stops auto-posting until reseeded):
BEGIN;
DELETE FROM public.konfigurasi_jurnal_detail
 WHERE konfigurasi_id IN (SELECT id FROM public.konfigurasi_jurnal WHERE tenant_id='00000000-0000-0000-0000-000000000001');
DELETE FROM public.konfigurasi_jurnal WHERE tenant_id='00000000-0000-0000-0000-000000000001';
COMMIT;
-- Journal entries: do NOT bulk-delete posted entries (immutability triggers + audit). Reverse instead.
```

## 7. Verification Queries

```sql
-- posted journals balance per entry (Dr=Cr on base amounts)
SELECT je.entry_number, sum(jl.debit_amount_base) dr, sum(jl.credit_amount_base) cr
FROM journal_entries je JOIN journal_lines jl ON jl.journal_entry_id = je.id
WHERE je.tenant_id='00000000-0000-0000-0000-000000000001' AND je.status='posted' AND je.deleted_at IS NULL
GROUP BY 1 HAVING sum(jl.debit_amount_base) <> sum(jl.credit_amount_base);  -- expect 0 rows

-- auto-journal failures to investigate
SELECT error_code, count(*) FROM jurnal_error_log
WHERE tenant_id='00000000-0000-0000-0000-000000000001' GROUP BY 1 ORDER BY 2 DESC;

-- approved/paid source docs missing a journal back-link (non-blocking gaps)
SELECT 'ap' src, ap_number ref FROM ap_invoices
WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND status IN ('APPROVED','PAID') AND journal_entry_id IS NULL;

-- active auto-journal configs
SELECT kode_konfigurasi, modul_referensi, is_aktif FROM konfigurasi_jurnal
WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL ORDER BY 1;
```

---

## Appendix A — Auto-Journal Config Seed

The 5 base configs + their 16 line templates (real UUIDs; `konfigurasi_jurnal_detail.coa_id` references `coa`). Journal entries/lines live in `lk_reports_seed.sql`. Also saved standalone at **`supabase/seed/journal_automation_seed.sql`**.

```sql
-- =====================================================
-- Seed: Journal Automation config (konfigurasi_jurnal)
-- Captured from live tenant 00000000-0000-0000-0000-000000000001.
-- Tables: konfigurasi_jurnal (5 headers), konfigurasi_jurnal_detail (16 lines).
-- Drives config-based auto-journaling for AR/AP/internal-payment use cases.
--
-- EXTERNAL DEPENDENCIES: coa(id) — konfigurasi_jurnal_detail.coa_id (where set).
-- NOTE: journal_entries/journal_lines themselves are in lk_reports_seed.sql;
--       cost centers in migration 20260528000008_seed_cost_centers.sql.
-- Idempotent: clears these two config tables first (detail before header).
-- =====================================================

BEGIN;

DELETE FROM public.konfigurasi_jurnal_detail
 WHERE konfigurasi_id IN (SELECT id FROM public.konfigurasi_jurnal WHERE tenant_id = '00000000-0000-0000-0000-000000000001');
DELETE FROM public.konfigurasi_jurnal WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

INSERT INTO public.konfigurasi_jurnal (id, tenant_id, kode_konfigurasi, nama_fitur, modul_referensi, tipe_jurnal, is_aktif, keterangan, created_by, updated_by, created_at, updated_at, deleted_at) VALUES
  ('50f24d54-9829-49b8-9acd-41fbba0d2485', '00000000-0000-0000-0000-000000000001', 'AP-BILL-RCV', 'Terima Tagihan Pihak Ketiga (AP)', 'pembelian', 'hutang_beban', 'true', 'Dr Beban/Aset (per item) + PPN Masukan / Cr Hutang Usaha saat tagihan diterima', '00000000-0000-0000-0000-000000000002', NULL, '2026-06-05 16:03:12.323838+00', NULL, NULL),
  ('c38b3972-1f97-4df3-ba75-61b019532163', '00000000-0000-0000-0000-000000000001', 'AP-PAY', 'Bayar Tagihan Pihak Ketiga (AP)', 'pembelian', 'pelunasan_hutang', 'true', 'Dr Hutang Usaha / Cr Kas/Bank saat tagihan dibayar', '00000000-0000-0000-0000-000000000002', NULL, '2026-06-05 16:03:12.323838+00', NULL, NULL),
  ('f3e422fc-0124-4f1c-aff7-130abdd38e39', '00000000-0000-0000-0000-000000000001', 'AR-INV-ISSUE', 'Terbit Invoice Penjualan (AR)', 'penjualan', 'piutang_pendapatan', 'true', 'Dr Piutang / Cr Pendapatan + PPN Keluaran saat invoice diterbitkan', '00000000-0000-0000-0000-000000000002', NULL, '2026-06-05 16:03:12.323838+00', NULL, NULL),
  ('62c94ae2-d3e5-4487-b5fc-9e7ed58e262d', '00000000-0000-0000-0000-000000000001', 'AR-PAY-RCV', 'Terima Pembayaran Invoice (AR)', 'penjualan', 'pelunasan_piutang', 'true', 'Dr Kas/Bank / Cr Piutang saat pembayaran customer diterima', '00000000-0000-0000-0000-000000000002', NULL, '2026-06-05 16:03:12.323838+00', NULL, NULL),
  ('bd29ca37-a24e-4aaa-9004-3ba07a734a42', '00000000-0000-0000-0000-000000000001', 'PMB-INTERNAL', 'Pembayaran Permintaan Uang Internal', 'pembayaran_internal', 'beban_kas', 'true', 'Dr Beban (+ biaya lain) / Cr Kas/Bank saat transfer disbursement internal', '00000000-0000-0000-0000-000000000002', NULL, '2026-06-05 16:03:12.323838+00', NULL, NULL);

INSERT INTO public.konfigurasi_jurnal_detail (id, tenant_id, konfigurasi_id, coa_id, dynamic_source, posisi, sumber_nominal, urutan, keterangan_baris, is_optional, created_at) VALUES
  ('14e6dd0b-77e9-43af-89dc-0edc35afe223', '00000000-0000-0000-0000-000000000001', '50f24d54-9829-49b8-9acd-41fbba0d2485', NULL, 'ap_line_coa', 'debit', 'line_amount', '1', 'Beban/Aset (per item)', 'false', '2026-06-05 16:03:12.323838+00'),
  ('3cccd29e-f31e-4a94-ac81-9069431daab5', '00000000-0000-0000-0000-000000000001', '50f24d54-9829-49b8-9acd-41fbba0d2485', '814273b5-6273-4fdd-bad5-5b6a61cde53f', NULL, 'debit', 'pajak', '2', 'PPN Masukan', 'true', '2026-06-05 16:03:12.323838+00'),
  ('80063e1a-bbea-4267-9c7a-6bccba501083', '00000000-0000-0000-0000-000000000001', '50f24d54-9829-49b8-9acd-41fbba0d2485', '6143b3cd-8724-416c-832e-007726949562', NULL, 'credit', 'grand_total', '3', 'Hutang Usaha', 'false', '2026-06-05 16:03:12.323838+00'),
  ('6b32f363-fa5c-4259-8b5f-74789853adf4', '00000000-0000-0000-0000-000000000001', '62c94ae2-d3e5-4487-b5fc-9e7ed58e262d', NULL, 'ar_bank_coa', 'debit', 'kas_neto', '1', 'Kas/Bank (neto)', 'false', '2026-06-08 03:34:46.328931+00'),
  ('1d0f39be-b25b-40df-8cc7-1d48723964b6', '00000000-0000-0000-0000-000000000001', '62c94ae2-d3e5-4487-b5fc-9e7ed58e262d', 'f50da11a-5db8-45eb-a6b8-36f83e2d23f8', NULL, 'debit', 'pph_amount', '2', 'PPh 23 Dibayar Dimuka (kredit pajak)', 'true', '2026-06-08 03:34:46.328931+00'),
  ('d5b4452a-8fc7-4522-a002-049ddfc452b7', '00000000-0000-0000-0000-000000000001', '62c94ae2-d3e5-4487-b5fc-9e7ed58e262d', '31008df0-1623-4daa-a075-316b3683530d', NULL, 'credit', 'bayar_sekarang', '3', 'Piutang Usaha (gross)', 'false', '2026-06-08 03:34:46.328931+00'),
  ('6dd687bc-e924-441c-a2bf-0b522e346f90', '00000000-0000-0000-0000-000000000001', 'bd29ca37-a24e-4aaa-9004-3ba07a734a42', NULL, 'pmb_expense_coa', 'debit', 'nominal_bayar', '1', 'Beban', 'false', '2026-06-06 22:49:39.126202+00'),
  ('f3c48f01-4d97-4191-aa5e-2a64b24426f9', '00000000-0000-0000-0000-000000000001', 'bd29ca37-a24e-4aaa-9004-3ba07a734a42', NULL, 'pmb_biaya_lain_coa', 'debit', 'biaya_lain_amount', '2', 'Biaya Lain', 'false', '2026-06-06 22:49:39.126202+00'),
  ('d1f80d79-98c0-404b-843e-9ef122cb8a7c', '00000000-0000-0000-0000-000000000001', 'bd29ca37-a24e-4aaa-9004-3ba07a734a42', 'c0560eb3-071b-4ab4-9d74-304c18a6a29a', NULL, 'credit', 'pph_amount', '3', 'Hutang PPh 23 (potong saat bayar)', 'true', '2026-06-06 22:49:39.126202+00'),
  ('4e126a34-a5c9-4a12-8ce4-7b84bcd98eba', '00000000-0000-0000-0000-000000000001', 'bd29ca37-a24e-4aaa-9004-3ba07a734a42', NULL, 'pmb_bank_coa', 'credit', 'kas_neto', '4', 'Kas/Bank (neto)', 'false', '2026-06-06 22:49:39.126202+00'),
  ('1e033389-367b-43a3-87ab-ef41f2ac8d09', '00000000-0000-0000-0000-000000000001', 'c38b3972-1f97-4df3-ba75-61b019532163', '6143b3cd-8724-416c-832e-007726949562', NULL, 'debit', 'bayar_sekarang', '1', 'Hutang Usaha (gross)', 'false', '2026-06-06 13:36:36.406257+00'),
  ('224d40fb-3f49-438e-b163-94ba618dd37b', '00000000-0000-0000-0000-000000000001', 'c38b3972-1f97-4df3-ba75-61b019532163', 'c0560eb3-071b-4ab4-9d74-304c18a6a29a', NULL, 'credit', 'pph_amount', '2', 'Hutang PPh 23 (potong saat bayar)', 'true', '2026-06-06 13:36:36.406257+00'),
  ('42278d12-a39c-4aee-a99c-141baf3d132b', '00000000-0000-0000-0000-000000000001', 'c38b3972-1f97-4df3-ba75-61b019532163', NULL, 'ap_bank_coa', 'credit', 'kas_neto', '3', 'Kas/Bank (neto)', 'false', '2026-06-06 13:36:36.406257+00'),
  ('bd5d561a-5ee9-4aa0-9033-37460d796ee9', '00000000-0000-0000-0000-000000000001', 'f3e422fc-0124-4f1c-aff7-130abdd38e39', '31008df0-1623-4daa-a075-316b3683530d', NULL, 'debit', 'total_piutang', '1', 'Piutang Usaha', 'false', '2026-06-05 16:03:12.323838+00'),
  ('02bad8fa-4b81-4332-a692-8b3613f4f0f4', '00000000-0000-0000-0000-000000000001', 'f3e422fc-0124-4f1c-aff7-130abdd38e39', NULL, 'invoice_revenue_coa', 'credit', 'subtotal', '2', 'Pendapatan', 'false', '2026-06-05 16:03:12.323838+00'),
  ('a2a5bbe4-65ab-4459-9f1a-1b361a1225bd', '00000000-0000-0000-0000-000000000001', 'f3e422fc-0124-4f1c-aff7-130abdd38e39', 'd11b1d61-664d-415a-9b4e-8e05e35717fb', NULL, 'credit', 'pajak', '3', 'PPN Keluaran', 'true', '2026-06-05 16:03:12.323838+00');

COMMIT;

```


---

## Appendix B — Forward Schema (new repo): `company_id` & `branch_id`

`tenant_id` stays unchanged; nullable so the dataseeds load unmodified. Cost-center master tables (`cost_center_*`) are out of scope here (org-structure module).

| Column | Type | Nullable | Final (new repo) |
|---|---|---|---|
| `company_id` | uuid | yes | FK → `companies`/`entities(id)` + index + RLS |
| `branch_id` | uuid | yes | FK → `branches(id)` + index + RLS |

**Already covered by `0001_finance_add_company_branch.sql`:** `journal_entries`, `journal_lines`.

**Added by `0002_finance_add_company_branch_journal_cashreg.sql`:**

```sql
ALTER TABLE public.journal_line_cost_centers ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.journal_line_cost_centers ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.konfigurasi_jurnal ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.konfigurasi_jurnal ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.konfigurasi_jurnal_detail ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.konfigurasi_jurnal_detail ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.jurnal_error_log ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.jurnal_error_log ADD COLUMN IF NOT EXISTS branch_id  uuid;

COMMENT ON COLUMN public.journal_line_cost_centers.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.journal_line_cost_centers.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.konfigurasi_jurnal.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.konfigurasi_jurnal.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.konfigurasi_jurnal_detail.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.konfigurasi_jurnal_detail.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.jurnal_error_log.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.jurnal_error_log.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
```
