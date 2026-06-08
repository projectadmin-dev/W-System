# FINANCE — Account Payable (AP) — Migration Guide

**Module:** Finance → Accounts Payable
**Companion:** `FINANCE-ACCOUNT_PAYABLE-SPEC.md`
**Tenant:** `00000000-0000-0000-0000-000000000001`
**Last updated:** 2026-06-08

> **Appendix A** contains the complete live dataseed (28 bills + items + approval steps) as a re-runnable script.

---

## Table of Contents

1. [Overview](#1-overview) · 2. [Migration Order](#2-migration-order) · 3. [Deploy Runbook](#3-deploy-runbook) · 4. [ADRs](#4-architecture-decision-records-adr) · 5. [Anti-Patterns](#5-anti-patterns--pitfalls) · 6. [Rollback](#6-rollback) · 7. [Verification](#7-verification-queries) · 8. [Appendix A — Live Dataseed](#appendix-a--live-dataseed)

---

## 1. Overview

One additive migration creates three tables (`ap_invoices`, `ap_invoice_items`, `ap_approval_steps`) mirroring the AR pattern, with generated money columns and a duplicate-guard UNIQUE constraint. No RLS/triggers/seed in the migration; the QA seed (`supabase/seed/qa_account_payable_seed.sql`) and app-created data populate it.

## 2. Migration Order

| # | Migration file | What it does |
|---|---|---|
| 1 | `20260529000005_account_payable_schema.sql` | Creates `ap_invoices` (+ generated `amount_due`, `uq_ap_duplicate`), `ap_invoice_items` (+ generated `subtotal`), `ap_approval_steps` (action CHECK); indexes; FKs to `projects`, `coa`, `journal_entries`. |

> Later migrations added tax columns (`ppn_dipungut_oleh`, `pph_*`) to `ap_invoices`; captured in the live schema and Appendix A. `ap_payment_history` exists in the live DB (0 rows) but is **not** created by this migration and is **not** used (payments are `PAY` steps).

### Dependency graph

```
projects ────────► ap_invoices ─┬─► ap_invoice_items   (CASCADE)
coa ──► ap_invoice_items.coa_id  └─► ap_approval_steps  (CASCADE)
journal_entries ──► ap_invoices.journal_entry_id (set on approve, best-effort)
```

## 3. Deploy Runbook

```bash
cd /home/ubuntu/apps/wsystem-1 && git pull origin master
supabase db push
# optional fixtures:
# psql "$DATABASE_URL" -f supabase/seed/account_payable_seed.sql
cd apps/web && npm run build && pm2 restart wsystem-1-staging
```

> GL posting on approval requires COA account `2-10100` (Hutang Usaha) and at least one `expense` account to exist — both are present in the COA seed.

## 4. Architecture Decision Records (ADR)

### ADR-1 — A pure engine (`ap-logic.ts`) is the single source of truth
Totals, aging, forecast, guards, payment, and journal-line building are pure functions, unit-tested with `node:test`.
**Why:** the dashboard and the API must not drift; logic is testable without a DB. **Trade-off:** several routes still reimplement parts inline (see Anti-patterns) — keep them in sync or refactor to import the engine.

### ADR-2 — Generated `amount_due`/`subtotal`
`amount_due = grand_total − amount_paid`; item `subtotal = qty·harga` are DB-generated.
**Why:** the DB guarantees consistency; routes only write `amount_paid`/inputs. **Trade-off:** header `grand_total` is written by the app (`computeTotals`), so item totals and the header are linked only through application logic.

### ADR-3 — Vendor as free text (`pihak_ketiga`)
The vendor is a `VARCHAR(300)` on the bill; `vendor_id` is an optional, **unconstrained** link to `fin_vendors`.
**Why:** unblocks AP without a populated vendor master. **Trade-off:** no referential integrity for vendors; the dup key uses free text (`tenant_id, pihak_ketiga, no_invoice, tgl_terima`). See the Vendor module doc.

### ADR-4 — Best-effort GL on approval
`tryCreateJournal` posts a balanced journal but never blocks the approval.
**Why:** approval workflow must not fail because of a COA misconfiguration. **Trade-off:** an invoice can be APPROVED with `journal_entry_id = null`; callers must surface the returned `warning`.

### ADR-5 — Action/audit "steps", not a multi-level chain
`ap_approval_steps` is an append-only action log (SUBMIT/APPROVE/REJECT/PAY), not sequential approver gates.
**Why:** matches the single-approver reality. **Trade-off:** the `step` integer implies a chain that does not exist.

## 5. Anti-Patterns & Pitfalls

| ❌ Anti-pattern | ✅ Do instead / note |
|---|---|
| Reading `/finance/ap-aging` or `GET /api/finance/ap-aging` as real | Page is mock; the API is a zero-stub over `contacts`. Real aging = `computeAging` via the account-payable list route. |
| Reimplementing payment/total/GL math in a new route | Import `ap-logic.ts` — `/pay`, PATCH, `/approve` already drifted into inline copies (same `EPS = 0.009`). |
| Editing identity fields on a DRAFT/REJECTED bill blindly | May collide with `uq_ap_duplicate` and surface as a raw 500; pre-check the dup key. |
| Trusting an approval implies a journal exists | Inspect the `warning` + `journal_entry_id`; posting is best-effort. |
| Writing `amount_due`/item `subtotal` | They are generated — write `amount_paid` / `qty`/`harga` instead. |
| Re-running the seed on shared data | Appendix A `DELETE`s this tenant's `ap_invoices` first (items + steps cascade). |

## 6. Rollback

```sql
BEGIN;
DELETE FROM public.ap_invoices WHERE tenant_id='00000000-0000-0000-0000-000000000001'; -- cascades items + steps
COMMIT;
-- DROP TABLE public.ap_approval_steps, public.ap_invoice_items, public.ap_invoices;  -- only when decommissioning
```

> Journals already posted on approval (`journal_entries` with `source_type='invoice'`) are **not** removed by the above — reverse them via the journal module if needed.

## 7. Verification Queries

```sql
-- status distribution
SELECT status, count(*), sum(grand_total) total, sum(amount_due) due
FROM public.ap_invoices WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL
GROUP BY 1 ORDER BY 1;

-- generated amount_due consistency
SELECT count(*) bad FROM public.ap_invoices
WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND amount_due <> grand_total - amount_paid; -- expect 0

-- approved bills missing a journal (best-effort posting gaps)
SELECT ap_number FROM public.ap_invoices
WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND status IN ('APPROVED','PAID') AND journal_entry_id IS NULL;
```

---

## Appendix A — Live Dataseed

Captured from the live tenant (`deleted_at IS NULL` only — QA fixtures excluded; real UUIDs preserved). 28 bills across DRAFT/SUBMITTED/APPROVED/PAID/REJECTED plus their items and approval steps. Also saved standalone at **`supabase/seed/account_payable_seed.sql`**.

```sql
-- =====================================================
-- Seed: Account Payable (AP)
-- Captured from the live Supabase tenant 00000000-0000-0000-0000-000000000001 (deleted_at IS NULL only).
-- Tables: ap_invoices, ap_invoice_items, ap_approval_steps
--         (ap_payment_history has no rows; payments are PAY steps).
--
-- EXTERNAL DEPENDENCIES (optional FKs, ON DELETE SET NULL):
--   projects(id)        — ap_invoices.project_id
--   coa(id)             — ap_invoice_items.coa_id
--   journal_entries(id) — ap_invoices.journal_entry_id (null here)
--   vendor_id is NULL throughout (vendors carried as free-text pihak_ketiga).
--
-- Contains the realistic monthly bills (AP-2026-04/05/06-Sxxx) across
-- DRAFT / SUBMITTED / APPROVED / PAID / REJECTED states. (QA test fixtures
-- were soft-deleted and are intentionally excluded.)
--
-- Idempotent: clears ap_invoices first; items + approval steps cascade.
-- =====================================================

BEGIN;

DELETE FROM public.ap_invoices WHERE tenant_id = '00000000-0000-0000-0000-000000000001';  -- cascades ap_invoice_items + ap_approval_steps

INSERT INTO public.ap_invoices (id, tenant_id, ap_number, no_invoice, no_ref_dokumen, tgl_terima, tgl_jatuh_tempo, dasar_pengajuan, pihak_ketiga, vendor_id, project_id, project_name, deskripsi, mata_uang, kurs, subtotal, discount_amount, tax_amount, grand_total, amount_paid, amount_due, status, journal_entry_id, attachment_url, submitted_at, approved_at, approved_by, approver_name, rejected_at, reject_reason, paid_at, created_at, updated_at, created_by, deleted_at, ppn_dipungut_oleh, pph_jenis, lawan_punya_npwp, pph_tarif, pph_dipotong_oleh, pph_dpp, pph_amount, pph_dpp_kategori_id) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'AP-2026-04-S001', 'SEED-APR-001', 'PO-2026-004-001', '2026-04-01', '2026-04-30', 'infrastructure', 'Google Cloud Indonesia', NULL, NULL, NULL, 'Tagihan layanan GCP (Compute Engine, Cloud Storage) bulan April 2026', 'IDR', '1.000000', '45000000.00', '0.00', '0.00', '45000000.00', '45000000.00', '0.00', 'PAID', NULL, NULL, '2026-04-02 00:00:00+00', '2026-04-03 00:00:00+00', NULL, 'Budi Santoso', NULL, NULL, '2026-04-28 00:00:00+00', '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'AP-2026-04-S002', 'SEED-APR-002', 'PO-2026-004-002', '2026-04-05', '2026-04-20', 'server', 'Amazon Web Services', NULL, NULL, NULL, 'Tagihan AWS EC2 dan S3 bulan April 2026', 'IDR', '1.000000', '32000000.00', '0.00', '0.00', '32000000.00', '0.00', '32000000.00', 'APPROVED', NULL, NULL, '2026-04-06 00:00:00+00', '2026-04-07 00:00:00+00', NULL, 'Siti Rahayu', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'AP-2026-04-S003', 'SEED-APR-003', NULL, '2026-04-08', '2026-04-10', 'overhead', 'PT. Biznet Networks', NULL, NULL, NULL, 'Tagihan bandwidth internet Biznet bulan April 2026', 'IDR', '1.000000', '15000000.00', '0.00', '0.00', '15000000.00', '0.00', '15000000.00', 'SUBMITTED', NULL, NULL, '2026-04-09 00:00:00+00', NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'AP-2026-04-S004', 'SEED-APR-004', NULL, '2026-04-10', '2026-05-10', 'server', 'PT. Microsoft Indonesia', NULL, NULL, NULL, 'Tagihan Microsoft 365 kuartal 2 2026', 'IDR', '1.000000', '18000000.00', '0.00', '0.00', '18000000.00', '0.00', '18000000.00', 'REJECTED', NULL, NULL, '2026-04-11 00:00:00+00', NULL, NULL, NULL, '2026-04-15 00:00:00+00', 'Tagihan tidak sesuai PO; harga berbeda dengan kontrak yang disepakati.', NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'AP-2026-04-S005', 'SEED-APR-005', 'SPT-2026-03', '2026-04-01', '2026-03-20', 'ppn', 'Direktorat Jenderal Pajak', NULL, NULL, NULL, 'PPN Masa Maret 2026', 'IDR', '1.000000', '28000000.00', '0.00', '0.00', '28000000.00', '0.00', '28000000.00', 'APPROVED', NULL, NULL, '2026-04-02 00:00:00+00', '2026-04-05 00:00:00+00', NULL, 'Ahmad Fauzi', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'AP-2026-04-S006', 'SEED-APR-006', NULL, '2026-04-03', '2026-03-30', 'overhead', 'PT. Telkom Indonesia', NULL, NULL, NULL, 'Tagihan telepon dan internet Telkom Maret 2026', 'IDR', '1.000000', '9000000.00', '0.00', '0.00', '9000000.00', '0.00', '9000000.00', 'APPROVED', NULL, NULL, '2026-04-04 00:00:00+00', '2026-04-05 00:00:00+00', NULL, 'Ahmad Fauzi', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'AP-2026-04-S007', 'SEED-APR-007', 'PO-2026-002-007', '2026-04-01', '2026-02-15', 'purchase_order', 'PT. Maxindo Data Center', NULL, NULL, NULL, 'Tagihan colocation server Q1 2026', 'IDR', '1.000000', '55000000.00', '0.00', '0.00', '55000000.00', '0.00', '55000000.00', 'APPROVED', NULL, NULL, '2026-04-02 00:00:00+00', '2026-04-03 00:00:00+00', NULL, 'Dewi Lestari', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'AP-2026-04-S008', 'SEED-APR-008', NULL, '2026-04-05', '2026-04-15', 'lain_lain', 'PT. Sangkuriang Teknologi', NULL, NULL, NULL, 'Tagihan jasa konsultansi IT April 2026', 'IDR', '1.000000', '22000000.00', '0.00', '0.00', '22000000.00', '22000000.00', '0.00', 'PAID', NULL, NULL, '2026-04-06 00:00:00+00', '2026-04-08 00:00:00+00', NULL, 'Budi Santoso', NULL, NULL, '2026-04-14 00:00:00+00', '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'AP-2026-04-S009', 'SEED-APR-009', 'PO-2026-004-009', '2026-04-15', '2026-04-25', 'purchase_order', 'PT. Innodata Solusi', NULL, NULL, NULL, 'Tagihan development sprint 4 bulan April 2026', 'IDR', '1.000000', '38000000.00', '0.00', '0.00', '38000000.00', '0.00', '38000000.00', 'APPROVED', NULL, NULL, '2026-04-16 00:00:00+00', '2026-04-17 00:00:00+00', NULL, 'Siti Rahayu', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'AP-2026-05-S001', 'SEED-MAY-001', 'PO-2026-005-001', '2026-05-01', '2026-05-25', 'infrastructure', 'Google Cloud Indonesia', NULL, NULL, NULL, 'Tagihan layanan GCP bulan Mei 2026', 'IDR', '1.000000', '50000000.00', '0.00', '0.00', '50000000.00', '50000000.00', '0.00', 'PAID', NULL, NULL, '2026-05-02 00:00:00+00', '2026-05-03 00:00:00+00', NULL, 'Budi Santoso', NULL, NULL, '2026-05-24 00:00:00+00', '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'AP-2026-05-S002', 'SEED-MAY-002', 'PO-2026-005-002', '2026-05-05', '2026-05-15', 'server', 'Amazon Web Services', NULL, NULL, NULL, 'Tagihan AWS EC2, RDS, dan CloudFront bulan Mei 2026', 'IDR', '1.000000', '38000000.00', '0.00', '0.00', '38000000.00', '0.00', '38000000.00', 'APPROVED', NULL, NULL, '2026-05-06 00:00:00+00', '2026-05-07 00:00:00+00', NULL, 'Siti Rahayu', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'AP-2026-05-S003', 'SEED-MAY-003', NULL, '2026-05-05', '2026-05-22', 'overhead', 'PT. Telkomsel', NULL, NULL, NULL, 'Tagihan paket data korporat Mei 2026', 'IDR', '1.000000', '7500000.00', '0.00', '0.00', '7500000.00', '0.00', '7500000.00', 'APPROVED', NULL, NULL, '2026-05-06 00:00:00+00', '2026-05-07 00:00:00+00', NULL, 'Ahmad Fauzi', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'AP-2026-05-S004', 'SEED-MAY-004', NULL, '2026-05-08', '2026-05-10', 'overhead', 'PT. Biznet Networks', NULL, NULL, NULL, 'Tagihan bandwidth Biznet Mei 2026', 'IDR', '1.000000', '12000000.00', '0.00', '0.00', '12000000.00', '0.00', '12000000.00', 'SUBMITTED', NULL, NULL, '2026-05-09 00:00:00+00', NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'AP-2026-05-S005', 'SEED-MAY-005', 'PO-2026-005-005', '2026-05-20', '2026-06-15', 'purchase_order', 'PT. PLABS Technology', NULL, NULL, NULL, 'Tagihan development proyek ERP fase 2 Mei 2026', 'IDR', '1.000000', '85000000.00', '0.00', '0.00', '85000000.00', '0.00', '85000000.00', 'DRAFT', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'AP-2026-05-S006', 'SEED-MAY-006', NULL, '2026-05-01', '2026-03-31', 'server', 'Cloudflare Inc.', NULL, NULL, NULL, 'Tagihan CDN dan DNS protection Cloudflare Q1 2026', 'IDR', '1.000000', '5500000.00', '0.00', '0.00', '5500000.00', '0.00', '5500000.00', 'APPROVED', NULL, NULL, '2026-05-02 00:00:00+00', '2026-05-05 00:00:00+00', NULL, 'Dewi Lestari', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'AP-2026-05-S007', 'SEED-MAY-007', NULL, '2026-05-03', '2026-02-28', 'server', 'PT. Microsoft Indonesia', NULL, NULL, NULL, 'Tagihan Azure compute dan storage Februari 2026', 'IDR', '1.000000', '25000000.00', '0.00', '0.00', '25000000.00', '0.00', '25000000.00', 'APPROVED', NULL, NULL, '2026-05-04 00:00:00+00', '2026-05-05 00:00:00+00', NULL, 'Budi Santoso', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', 'AP-2026-05-S008', 'SEED-MAY-008', NULL, '2026-05-03', '2026-05-05', 'server', 'DigitalOcean LLC', NULL, NULL, NULL, 'Tagihan droplet dan object storage DigitalOcean Mei 2026', 'IDR', '1.000000', '8800000.00', '0.00', '0.00', '8800000.00', '0.00', '8800000.00', 'APPROVED', NULL, NULL, '2026-05-04 00:00:00+00', '2026-05-05 00:00:00+00', NULL, 'Ahmad Fauzi', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'AP-2026-05-S009', 'SEED-MAY-009', NULL, '2026-05-10', '2026-05-20', 'lain_lain', 'PT. InfoMedia Nusantara', NULL, NULL, NULL, 'Tagihan iklan digital dan social media ads Mei 2026', 'IDR', '1.000000', '18000000.00', '0.00', '0.00', '18000000.00', '18000000.00', '0.00', 'PAID', NULL, NULL, '2026-05-11 00:00:00+00', '2026-05-12 00:00:00+00', NULL, 'Siti Rahayu', NULL, NULL, '2026-05-19 00:00:00+00', '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', 'AP-2026-06-S001', 'SEED-JUN-001', 'PO-2026-006-001', '2026-06-01', '2026-06-05', 'infrastructure', 'Google Cloud Indonesia', NULL, NULL, NULL, 'Tagihan layanan GCP (Compute, BigQuery, Cloud SQL) Juni 2026', 'IDR', '1.000000', '48000000.00', '0.00', '0.00', '48000000.00', '0.00', '48000000.00', 'APPROVED', NULL, NULL, '2026-06-01 00:00:00+00', '2026-06-01 00:00:00+00', NULL, 'Budi Santoso', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'AP-2026-06-S002', 'SEED-JUN-002', 'PO-2026-006-002', '2026-06-01', '2026-06-07', 'server', 'Amazon Web Services', NULL, NULL, NULL, 'Tagihan AWS bulan Juni 2026', 'IDR', '1.000000', '35000000.00', '0.00', '0.00', '35000000.00', '0.00', '35000000.00', 'APPROVED', NULL, NULL, '2026-06-01 00:00:00+00', '2026-06-01 00:00:00+00', NULL, 'Siti Rahayu', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'AP-2026-06-S003', 'SEED-JUN-003', NULL, '2026-06-01', '2026-06-10', 'server', 'PT. Microsoft Indonesia', NULL, NULL, NULL, 'Tagihan Microsoft Azure Juni 2026', 'IDR', '1.000000', '22000000.00', '0.00', '0.00', '22000000.00', '0.00', '22000000.00', 'APPROVED', NULL, NULL, '2026-06-01 00:00:00+00', '2026-06-01 00:00:00+00', NULL, 'Ahmad Fauzi', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 'AP-2026-06-S004', 'SEED-JUN-004', NULL, '2026-06-01', '2026-06-13', 'overhead', 'PT. Telkom Indonesia', NULL, NULL, NULL, 'Tagihan internet leased line dan telepon Telkom Juni 2026', 'IDR', '1.000000', '15000000.00', '0.00', '0.00', '15000000.00', '0.00', '15000000.00', 'APPROVED', NULL, NULL, '2026-06-01 00:00:00+00', '2026-06-01 00:00:00+00', NULL, 'Dewi Lestari', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000001', 'AP-2026-06-S005', 'SEED-JUN-005', 'PO-2026-006-005', '2026-06-01', '2026-06-18', 'purchase_order', 'PT. PLABS Technology', NULL, NULL, NULL, 'Tagihan development sprint 5-6 Juni 2026', 'IDR', '1.000000', '90000000.00', '0.00', '0.00', '90000000.00', '0.00', '90000000.00', 'APPROVED', NULL, NULL, '2026-06-01 00:00:00+00', '2026-06-01 00:00:00+00', NULL, 'Budi Santoso', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000001', 'AP-2026-06-S006', 'SEED-JUN-006', NULL, '2026-06-01', '2026-06-20', 'server', 'Cloudflare Inc.', NULL, NULL, NULL, 'Tagihan CDN dan WAF Cloudflare Juni 2026', 'IDR', '1.000000', '8000000.00', '0.00', '0.00', '8000000.00', '0.00', '8000000.00', 'SUBMITTED', NULL, NULL, '2026-06-01 00:00:00+00', NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000001', 'AP-2026-06-S007', 'SEED-JUN-007', 'SPT-2026-05', '2026-06-01', '2026-06-25', 'ppn', 'Direktorat Jenderal Pajak', NULL, NULL, NULL, 'PPN Masa Mei 2026', 'IDR', '1.000000', '32000000.00', '0.00', '0.00', '32000000.00', '0.00', '32000000.00', 'APPROVED', NULL, NULL, '2026-06-01 00:00:00+00', '2026-06-01 00:00:00+00', NULL, 'Ahmad Fauzi', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000001', 'AP-2026-06-S008', 'SEED-JUN-008', NULL, '2026-06-01', '2026-06-28', 'overhead', 'PT. Biznet Networks', NULL, NULL, NULL, 'Tagihan bandwidth internet Biznet Juni 2026', 'IDR', '1.000000', '18500000.00', '0.00', '0.00', '18500000.00', '0.00', '18500000.00', 'APPROVED', NULL, NULL, '2026-06-01 00:00:00+00', '2026-06-01 00:00:00+00', NULL, 'Siti Rahayu', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000001', 'AP-2026-06-S009', 'SEED-JUN-009', NULL, '2026-06-01', '2026-07-05', 'overhead', 'PT. Telkomsel', NULL, NULL, NULL, 'Tagihan paket data korporat Juni-Juli 2026', 'IDR', '1.000000', '6500000.00', '0.00', '0.00', '6500000.00', '0.00', '6500000.00', 'DRAFT', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('10000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000001', 'AP-2026-06-S010', 'SEED-JUN-010', NULL, '2026-06-01', '2026-06-03', 'server', 'DigitalOcean LLC', NULL, NULL, NULL, 'Tagihan droplet dan spaces DigitalOcean Juni 2026', 'IDR', '1.000000', '12000000.00', '0.00', '0.00', '12000000.00', '0.00', '12000000.00', 'APPROVED', NULL, NULL, '2026-06-01 00:00:00+00', '2026-06-01 00:00:00+00', NULL, 'Dewi Lestari', NULL, NULL, NULL, '2026-06-01 14:36:38.740972+00', NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL);

INSERT INTO public.ap_invoice_items (id, ap_invoice_id, urutan, deskripsi, qty, harga, subtotal, diskon, pajak, coa_id, coa_kode, coa_nama, created_at) VALUES
  ('924fc5dc-a24b-4f2a-8501-95065f92c98b', '10000000-0000-0000-0000-000000000001', '1', 'Compute Engine VM (n2-standard-4 x30 hari)', '1.0000', '32000000.00', '32000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('fd37edd4-9491-4c88-b392-762744b1aa0e', '10000000-0000-0000-0000-000000000001', '2', 'Cloud Storage 500GB + CDN transfer', '1.0000', '13000000.00', '13000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('f3bc4b6f-a125-407c-b217-f04613947719', '10000000-0000-0000-0000-000000000002', '1', 'EC2 t3.large (2 instance x30 hari)', '2.0000', '12000000.00', '24000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('234d21ab-0c9e-47a2-85a3-efc7a2a11c19', '10000000-0000-0000-0000-000000000002', '2', 'S3 Standard Storage 2TB', '1.0000', '8000000.00', '8000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('fda8e7b4-d045-40fa-a23e-71544a9f35e2', '10000000-0000-0000-0000-000000000003', '1', 'Dedicated Bandwidth 100Mbps', '1.0000', '15000000.00', '15000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('3d68a013-2c7f-4fef-a4ff-022d6b438325', '10000000-0000-0000-0000-000000000004', '1', 'Microsoft 365 Business Premium (50 user)', '50.0000', '360000.00', '18000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('3bd91c0b-3950-443d-b879-923e4b9e61e0', '10000000-0000-0000-0000-000000000005', '1', 'PPN Masa Maret 2026 (10% dari DPP)', '1.0000', '28000000.00', '28000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('e55b877a-a0ce-4e68-8261-5066a9dcb3fd', '10000000-0000-0000-0000-000000000006', '1', 'Astinet 20Mbps dedicated + telepon', '1.0000', '9000000.00', '9000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('6fe83577-ed1f-4d93-ae92-e075892d7537', '10000000-0000-0000-0000-000000000007', '1', 'Colocation 2U rack space + power 10A', '1.0000', '40000000.00', '40000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('64d4958a-fa48-4d17-acf8-5050b765093a', '10000000-0000-0000-0000-000000000007', '2', 'IP Transit 1Gbps (burst)', '1.0000', '15000000.00', '15000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('558c3cc8-a505-41a1-859e-848ed764c70b', '10000000-0000-0000-0000-000000000008', '1', 'Jasa konsultansi IT assessment & roadmap (10 hari)', '10.0000', '2200000.00', '22000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('1fda3daf-6969-4755-9c6a-7655102b3033', '10000000-0000-0000-0000-000000000009', '1', 'Development sprint 4 - backend API', '1.0000', '20000000.00', '20000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('a8bd7412-23ce-43e7-bbc5-39b210903f1d', '10000000-0000-0000-0000-000000000009', '2', 'Development sprint 4 - frontend UI', '1.0000', '18000000.00', '18000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('73c772a0-5693-4ac4-9f72-fba3f864d4a2', '10000000-0000-0000-0000-000000000010', '1', 'Compute Engine, BigQuery, Cloud SQL', '1.0000', '50000000.00', '50000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('b3ce8ea3-5c0d-44e8-ae7c-939a4d457f77', '10000000-0000-0000-0000-000000000011', '1', 'EC2 + RDS Aurora PostgreSQL', '1.0000', '28000000.00', '28000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('515d0cb0-7053-4e9d-8cc3-aec633c88219', '10000000-0000-0000-0000-000000000011', '2', 'CloudFront CDN & Route53', '1.0000', '10000000.00', '10000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('a77d2d89-f47e-4355-af61-705d3442f9b6', '10000000-0000-0000-0000-000000000012', '1', 'Paket data korporat 100GB x15 user', '15.0000', '500000.00', '7500000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('68f908ac-d228-43dc-9294-085dfb6ae397', '10000000-0000-0000-0000-000000000013', '1', 'Dedicated bandwidth 100Mbps Mei 2026', '1.0000', '12000000.00', '12000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('26159f80-3890-4530-baa1-0025ac6a95ee', '10000000-0000-0000-0000-000000000014', '1', 'Development ERP modul Purchase & Inventory', '1.0000', '50000000.00', '50000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('7f72ade5-2d80-4f66-8439-d87e23a0c7b7', '10000000-0000-0000-0000-000000000014', '2', 'Development ERP modul Finance & Reporting', '1.0000', '35000000.00', '35000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('503187ec-fa14-44ce-86fb-9e9ef0d9e226', '10000000-0000-0000-0000-000000000015', '1', 'Cloudflare Pro plan + DDoS protection', '1.0000', '5500000.00', '5500000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('19cdc08a-f2e7-48af-811e-6deb16140d77', '10000000-0000-0000-0000-000000000016', '1', 'Azure VM B4ms + Blob Storage 1TB', '1.0000', '25000000.00', '25000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('5f572425-7435-496b-b2ca-da2a087d2046', '10000000-0000-0000-0000-000000000017', '1', 'Droplet 8GB RAM (2 unit) + Spaces 250GB', '1.0000', '8800000.00', '8800000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('46fe701d-7590-438d-a9ce-fc1d026f16e1', '10000000-0000-0000-0000-000000000018', '1', 'Iklan Google Display Network (budget)', '1.0000', '10000000.00', '10000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('7b1a3e52-5053-4e09-a36c-d47bdb881fc4', '10000000-0000-0000-0000-000000000018', '2', 'Social media ads Facebook & Instagram', '1.0000', '8000000.00', '8000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('12db4808-ead2-4e00-9ca4-5dab9eddb7d9', '10000000-0000-0000-0000-000000000019', '1', 'Compute Engine, BigQuery, Cloud SQL Juni', '1.0000', '48000000.00', '48000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('281d183e-3b69-45a6-aa1a-de8556957e2f', '10000000-0000-0000-0000-000000000020', '1', 'AWS EC2, S3, RDS, CloudFront Juni', '1.0000', '35000000.00', '35000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('c967bdf3-52e9-4d09-8ff6-8619e07a031b', '10000000-0000-0000-0000-000000000021', '1', 'Azure compute dan storage Juni', '1.0000', '22000000.00', '22000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('62ffb44a-8055-4335-a8b3-a613e8451a44', '10000000-0000-0000-0000-000000000022', '1', 'Astinet dedicated 50Mbps + telepon korporat', '1.0000', '15000000.00', '15000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('5d694553-c5cd-402d-b038-a3baab3d1927', '10000000-0000-0000-0000-000000000023', '1', 'Development sprint 5 backend + API gateway', '1.0000', '50000000.00', '50000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('3a87925f-e8a7-4818-b36f-f2ab91ac3808', '10000000-0000-0000-0000-000000000023', '2', 'Development sprint 6 mobile apps + QA', '1.0000', '40000000.00', '40000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('440f409e-8e74-409d-b0d0-dabc58b08dad', '10000000-0000-0000-0000-000000000024', '1', 'Cloudflare Business plan + WAF rules', '1.0000', '8000000.00', '8000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('dd983786-10f9-4b4d-89fc-7e2832a97546', '10000000-0000-0000-0000-000000000025', '1', 'PPN Masa Mei 2026 (10% dari DPP Rp 320jt)', '1.0000', '32000000.00', '32000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('b9e9af2f-59d5-43b2-a1f8-8b53d7bd94a6', '10000000-0000-0000-0000-000000000026', '1', 'Dedicated bandwidth 100Mbps Juni', '1.0000', '18500000.00', '18500000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('cb476bcc-4254-47be-a005-97504adb0353', '10000000-0000-0000-0000-000000000027', '1', 'Paket data korporat 100GB x13 user', '13.0000', '500000.00', '6500000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00'),
  ('0b7b6e77-6e27-4092-8ce5-ed66b6aa73be', '10000000-0000-0000-0000-000000000028', '1', 'Droplet 8GB RAM (2 unit) + Spaces 500GB', '1.0000', '12000000.00', '12000000.00', '0.00', '0.00', NULL, NULL, NULL, '2026-06-01 14:37:11.209036+00');

INSERT INTO public.ap_approval_steps (id, ap_invoice_id, step, action, actor_id, actor_name, notes, created_at) VALUES
  ('58685d7c-bf48-4ef7-99bf-30c378288c5f', '10000000-0000-0000-0000-000000000001', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan diajukan', '2026-04-02 00:00:00+00'),
  ('11538122-7419-4e0c-b85a-c7b2f191ab96', '10000000-0000-0000-0000-000000000001', '2', 'APPROVE', NULL, 'Budi Santoso', 'Disetujui, sesuai kontrak', '2026-04-03 00:00:00+00'),
  ('e0d329cb-fee7-45b5-bb9c-39bc71a7d2d8', '10000000-0000-0000-0000-000000000001', '3', 'PAY', NULL, 'Finance Staff', 'Pembayaran via transfer BCA', '2026-04-28 00:00:00+00'),
  ('6c640958-c06f-4dae-b25e-655fe03cddd5', '10000000-0000-0000-0000-000000000002', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan diajukan', '2026-04-06 00:00:00+00'),
  ('8e42fdbf-4b64-458e-bc9a-51c8baf362e5', '10000000-0000-0000-0000-000000000002', '2', 'APPROVE', NULL, 'Siti Rahayu', 'Disetujui', '2026-04-07 00:00:00+00'),
  ('eb1fd57d-3fc7-40b6-bee6-410931815e72', '10000000-0000-0000-0000-000000000003', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan diajukan', '2026-04-09 00:00:00+00'),
  ('127a6441-07be-42ff-98c3-532ff63c4122', '10000000-0000-0000-0000-000000000004', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan diajukan', '2026-04-11 00:00:00+00'),
  ('50a8bc45-8ce9-4c85-8fe4-dea983caf693', '10000000-0000-0000-0000-000000000004', '2', 'REJECT', NULL, 'Ahmad Fauzi', 'Harga tidak sesuai kontrak', '2026-04-15 00:00:00+00'),
  ('f2a3e232-3624-44b4-b160-2f922a35b193', '10000000-0000-0000-0000-000000000005', '1', 'SUBMIT', NULL, 'Finance Staff', 'PPN diajukan', '2026-04-02 00:00:00+00'),
  ('8ecf7f7f-e1c7-4570-8f80-361d684c978e', '10000000-0000-0000-0000-000000000005', '2', 'APPROVE', NULL, 'Ahmad Fauzi', 'Disetujui', '2026-04-05 00:00:00+00'),
  ('158d420c-4ddb-478a-be49-b9b9c489e63e', '10000000-0000-0000-0000-000000000006', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan diajukan', '2026-04-04 00:00:00+00'),
  ('d6567286-4a08-4c5e-920c-5f17770eb123', '10000000-0000-0000-0000-000000000006', '2', 'APPROVE', NULL, 'Ahmad Fauzi', 'Disetujui', '2026-04-05 00:00:00+00'),
  ('6bbc75ab-d95e-4674-8e1d-d0c557ca7249', '10000000-0000-0000-0000-000000000007', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan colocation diajukan', '2026-04-02 00:00:00+00'),
  ('7b1816b7-3bfc-4d31-9f1d-f9fae4e36975', '10000000-0000-0000-0000-000000000007', '2', 'APPROVE', NULL, 'Dewi Lestari', 'Disetujui sesuai kontrak', '2026-04-03 00:00:00+00'),
  ('ee502919-0098-471c-8564-0f9519cd99ca', '10000000-0000-0000-0000-000000000008', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan diajukan', '2026-04-06 00:00:00+00'),
  ('2ae2f17f-c348-4ad9-8a4d-f42181706c1d', '10000000-0000-0000-0000-000000000008', '2', 'APPROVE', NULL, 'Budi Santoso', 'Disetujui', '2026-04-08 00:00:00+00'),
  ('09ef8027-c72e-49c6-a0be-52d0775926cf', '10000000-0000-0000-0000-000000000008', '3', 'PAY', NULL, 'Finance Staff', 'Pembayaran via transfer BNI', '2026-04-14 00:00:00+00'),
  ('ea773af0-f0e8-4776-9c55-d0253065e264', '10000000-0000-0000-0000-000000000009', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan sprint 4 diajukan', '2026-04-16 00:00:00+00'),
  ('9f9aab26-a065-4ca7-aa75-0ff5f670afb8', '10000000-0000-0000-0000-000000000009', '2', 'APPROVE', NULL, 'Siti Rahayu', 'Disetujui', '2026-04-17 00:00:00+00'),
  ('d5ada63e-a8f5-4580-89ec-c50b72a578a7', '10000000-0000-0000-0000-000000000010', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan GCP Mei diajukan', '2026-05-02 00:00:00+00'),
  ('3e2e5146-9b78-4a0d-8638-842fdc1e29c2', '10000000-0000-0000-0000-000000000010', '2', 'APPROVE', NULL, 'Budi Santoso', 'Disetujui', '2026-05-03 00:00:00+00'),
  ('5aa6631f-1247-4db6-9d2b-7645e17e3578', '10000000-0000-0000-0000-000000000010', '3', 'PAY', NULL, 'Finance Staff', 'Pembayaran via virtual account', '2026-05-24 00:00:00+00'),
  ('92141cc9-4840-4e76-b759-92522478baf8', '10000000-0000-0000-0000-000000000011', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan AWS Mei diajukan', '2026-05-06 00:00:00+00'),
  ('0c71d781-4ac1-414d-bd1f-4c73e6f4ff93', '10000000-0000-0000-0000-000000000011', '2', 'APPROVE', NULL, 'Siti Rahayu', 'Disetujui', '2026-05-07 00:00:00+00'),
  ('7f3db958-d095-4059-9424-e96bff2e005b', '10000000-0000-0000-0000-000000000012', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan paket data diajukan', '2026-05-06 00:00:00+00'),
  ('e9da7bc2-4087-4c7c-aa2a-a815b01baef4', '10000000-0000-0000-0000-000000000012', '2', 'APPROVE', NULL, 'Ahmad Fauzi', 'Disetujui', '2026-05-07 00:00:00+00'),
  ('0dcdcba4-9e6b-405b-adba-2210dc5c244c', '10000000-0000-0000-0000-000000000013', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan bandwidth diajukan', '2026-05-09 00:00:00+00'),
  ('34e26de3-aa41-4460-b2b0-433fb3c86584', '10000000-0000-0000-0000-000000000015', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan Cloudflare diajukan', '2026-05-02 00:00:00+00'),
  ('0a6d5763-05cd-42b6-ad8c-0a8a034dd2b9', '10000000-0000-0000-0000-000000000015', '2', 'APPROVE', NULL, 'Dewi Lestari', 'Disetujui', '2026-05-05 00:00:00+00'),
  ('a64dada1-9ec7-413d-9260-dbfaec6b93e1', '10000000-0000-0000-0000-000000000016', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan Azure Feb diajukan', '2026-05-04 00:00:00+00'),
  ('fd260196-e4c5-416d-98a5-b3afdd98acdf', '10000000-0000-0000-0000-000000000016', '2', 'APPROVE', NULL, 'Budi Santoso', 'Disetujui', '2026-05-05 00:00:00+00'),
  ('ab7bfa33-d798-465a-bd4b-2187f44c1999', '10000000-0000-0000-0000-000000000017', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan DO Mei diajukan', '2026-05-04 00:00:00+00'),
  ('9c1763a8-4263-45d6-be3f-2a32226c18d0', '10000000-0000-0000-0000-000000000017', '2', 'APPROVE', NULL, 'Ahmad Fauzi', 'Disetujui', '2026-05-05 00:00:00+00'),
  ('b9b43a72-42fa-4ddf-a672-1ab0ca9cd0c0', '10000000-0000-0000-0000-000000000018', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan iklan diajukan', '2026-05-11 00:00:00+00'),
  ('bd5004ab-211e-49dd-87b7-7a01af3922ff', '10000000-0000-0000-0000-000000000018', '2', 'APPROVE', NULL, 'Siti Rahayu', 'Disetujui', '2026-05-12 00:00:00+00'),
  ('68ad3f95-34b9-4cee-9099-5dc6e73050ce', '10000000-0000-0000-0000-000000000018', '3', 'PAY', NULL, 'Finance Staff', 'Pembayaran iklan digital', '2026-05-19 00:00:00+00'),
  ('60de1ede-3041-4154-9810-125229a561e7', '10000000-0000-0000-0000-000000000019', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan GCP Juni diajukan', '2026-06-01 00:00:00+00'),
  ('7c9933ec-5a29-4af5-b95b-1252dc073456', '10000000-0000-0000-0000-000000000019', '2', 'APPROVE', NULL, 'Budi Santoso', 'Disetujui - jatuh tempo 5 Juni', '2026-06-01 00:00:00+00'),
  ('59e341f3-d11d-44b8-b16e-60ed1514747c', '10000000-0000-0000-0000-000000000020', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan AWS Juni diajukan', '2026-06-01 00:00:00+00'),
  ('b94f1cb1-8ff3-4d60-af8c-206af6b275e2', '10000000-0000-0000-0000-000000000020', '2', 'APPROVE', NULL, 'Siti Rahayu', 'Disetujui', '2026-06-01 00:00:00+00'),
  ('fee419ba-17d4-4b27-ac9e-0d44e1c2e88d', '10000000-0000-0000-0000-000000000021', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan Azure Juni diajukan', '2026-06-01 00:00:00+00'),
  ('7cf4e601-f8c5-486a-87bd-d2f47a1d458a', '10000000-0000-0000-0000-000000000021', '2', 'APPROVE', NULL, 'Ahmad Fauzi', 'Disetujui', '2026-06-01 00:00:00+00'),
  ('86f0a45e-6cb5-418a-a86d-7985516c049f', '10000000-0000-0000-0000-000000000022', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan Telkom Juni diajukan', '2026-06-01 00:00:00+00'),
  ('794bcf25-5638-4271-aed4-584bd35ff02e', '10000000-0000-0000-0000-000000000022', '2', 'APPROVE', NULL, 'Dewi Lestari', 'Disetujui', '2026-06-01 00:00:00+00'),
  ('752beed6-f897-49eb-a058-e5b9e035e14f', '10000000-0000-0000-0000-000000000023', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan dev sprint 5-6 diajukan', '2026-06-01 00:00:00+00'),
  ('5a70dc40-dddd-41ea-adce-c6b83d56b946', '10000000-0000-0000-0000-000000000023', '2', 'APPROVE', NULL, 'Budi Santoso', 'Disetujui - prioritas tinggi', '2026-06-01 00:00:00+00'),
  ('ec541dbd-557a-4ae2-8872-50070592fcb0', '10000000-0000-0000-0000-000000000024', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan Cloudflare Juni diajukan', '2026-06-01 00:00:00+00'),
  ('d09982ce-35ad-4078-9501-585aa0795d04', '10000000-0000-0000-0000-000000000025', '1', 'SUBMIT', NULL, 'Finance Staff', 'PPN Mei 2026 diajukan', '2026-06-01 00:00:00+00'),
  ('a4d57250-47b4-4da9-b456-b3f24d3a2111', '10000000-0000-0000-0000-000000000025', '2', 'APPROVE', NULL, 'Ahmad Fauzi', 'Disetujui', '2026-06-01 00:00:00+00'),
  ('b3f50a7f-a7d2-4a72-bb0b-e36aeb57577c', '10000000-0000-0000-0000-000000000026', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan Biznet Juni diajukan', '2026-06-01 00:00:00+00'),
  ('f4cc38cf-391b-45c7-bf29-e004157e4655', '10000000-0000-0000-0000-000000000026', '2', 'APPROVE', NULL, 'Siti Rahayu', 'Disetujui', '2026-06-01 00:00:00+00'),
  ('a9af2718-bb88-45ee-9a1c-423752546271', '10000000-0000-0000-0000-000000000028', '1', 'SUBMIT', NULL, 'Finance Staff', 'Tagihan DO Juni diajukan', '2026-06-01 00:00:00+00'),
  ('e34c5fb1-afc5-4242-9e43-f06a12168304', '10000000-0000-0000-0000-000000000028', '2', 'APPROVE', NULL, 'Dewi Lestari', 'Disetujui', '2026-06-01 00:00:00+00');

COMMIT;

```


---

## Appendix B — Forward Schema (new repo): `company_id` & `branch_id`

All 3 table(s) of this module gain two **nullable** scoping columns in the new repository, to isolate data per **company** (PT / legal entity) and **branch** (kantor cabang):

| Column | Type | Nullable | Now | Final (new repo) |
|---|---|---|---|---|
| `company_id` | uuid | yes | no FK/index/RLS | FK → `companies`/`entities(id)` + index + RLS |
| `branch_id` | uuid | yes | no FK/index/RLS | FK → `branches(id)` + index + RLS |

`tenant_id` is **kept unchanged**; these are new independent columns. They are nullable so the Appendix A dataseed loads without modification (existing rows simply have NULL company/branch). FK wiring, backfill, and RLS are deferred to the new-repo final migration (see `PRD_Task_Management.md`, Phase 5). Combined SQL for all modules: `docs/finance/new-repo/0001_finance_add_company_branch.sql`.

```sql
-- Account Payable (AP) — add company_id + branch_id (nullable, no FK)
ALTER TABLE public.ap_invoices ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.ap_invoices ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.ap_invoice_items ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.ap_invoice_items ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.ap_approval_steps ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.ap_approval_steps ADD COLUMN IF NOT EXISTS branch_id  uuid;

COMMENT ON COLUMN public.ap_invoices.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ap_invoices.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ap_invoice_items.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ap_invoice_items.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ap_approval_steps.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ap_approval_steps.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
```
