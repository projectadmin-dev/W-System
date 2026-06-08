# FINANCE — Accounts Receivable (AR) — Migration Guide

**Module:** Finance → Accounts Receivable
**Companion:** `FINANCE-AR-SPEC.md`
**Tenant:** `00000000-0000-0000-0000-000000000001`
**Last updated:** 2026-06-08

> **Appendix A** contains the complete live dataseed (4 bank accounts, 13 invoices, 7 payment-history rows) as a re-runnable script.

---

## Table of Contents

1. [Overview](#1-overview) · 2. [Migration Order](#2-migration-order) · 3. [Deploy Runbook](#3-deploy-runbook) · 4. [ADRs](#4-architecture-decision-records-adr) · 5. [Anti-Patterns](#5-anti-patterns--pitfalls) · 6. [Rollback](#6-rollback) · 7. [Verification](#7-verification-queries) · 8. [Appendix A — Live Dataseed](#appendix-a--live-dataseed)

---

## 1. Overview

Two additive migrations: one creates the three `ar_*` tables (with generated money columns and permissive RLS), the other seeds realistic mock data (clients, projects, invoices, payment history) for the monitoring screen.

## 2. Migration Order

| # | Migration file | What it does |
|---|---|---|
| 1 | `20260529000001_ar_schema.sql` | Creates `ar_bank_accounts`, `ar_invoices`, `ar_payment_history`; generated columns (`subtotal`, `ppn_amount`, `total_piutang`, `sisa_piutang`); CHECK constraints; indexes; permissive RLS policies. |
| 2 | `20260529000002_ar_seed_mock_data.sql` | `DO $$` block: seeds 4 clients, 4 projects, 13 AR invoices (incl. a 6-month recurring series), and payment history for paid invoices. |

> Later migrations added tax columns to `ar_invoices`/`ar_payment_history` (`revenue_coa_id`, `journal_entry_id`, `ppn_dipungut_oleh`, `pph_*`, `nomor_bukti_potong`, …); captured in the live schema and Appendix A.

### Dependency graph

```
projects ──► ar_invoices ──► ar_payment_history   (CASCADE)
ar_bank_accounts ──► ar_invoices.bank_id
ar_invoices.recurring_parent_id ──► ar_invoices    (self, CASCADE)
```

## 3. Deploy Runbook

```bash
cd /home/ubuntu/apps/wsystem-1 && git pull origin master
supabase db push
# optional fixtures (depends on the projects from migration 0002):
# psql "$DATABASE_URL" -f supabase/seed/ar_seed.sql
cd apps/web && npm run build && pm2 restart wsystem-1-staging
```

## 4. Architecture Decision Records (ADR)

### ADR-1 — Money columns are DB-generated
`subtotal`/`ppn_amount`/`total_piutang`/`sisa_piutang` are `GENERATED ALWAYS … STORED`.
**Why:** the database is the single source of truth for amounts; the client only previews. **Trade-off:** the 11% PPN rate is baked into the column definition — changing it requires a migration, and the client preview must stay in sync.

### ADR-2 — Denormalized snapshots on the invoice
`project_name`, `client_name`, `nilai_kontrak`, `bank_label` are copied onto each invoice.
**Why:** invoices must render historically even if the project/client changes. **Trade-off:** snapshots drift from source.

### ADR-3 — Recurring series as sibling rows linked by `recurring_parent_id`
Each occurrence is its own `ar_invoices` row; sequence 1 is the parent.
**Why:** each occurrence has its own due date, payment, and status. **Trade-off:** `ON DELETE CASCADE` on the self-FK means hard-deleting the parent wipes the series (UI only soft-archives).

### ADR-4 — Manual `status_bayar`
Payment status is user-selected, not auto-derived.
**Why:** lets Finance reflect real-world nuances. **Trade-off:** status can disagree with amounts/dates; `jatuh_tempo` is never auto-applied; overdue is computed separately.

### ADR-5 — Permissive RLS, app-level tenancy
RLS is enabled with `USING(true)`; isolation is enforced in the service layer.
**Why:** ships fast with the service-role client. **Trade-off:** no DB-level tenant isolation; the default-tenant fallback can silently capture tenant-less users.

## 5. Anti-Patterns & Pitfalls

| ❌ Anti-pattern | ✅ Do instead / note |
|---|---|
| Reading `/finance/ar-aging` as real data | It is a **mock** prototype (fixed 2026-04-22). Real receivables are in `ar-monitoring`. |
| Using `GET /api/finance/ar-aging` | Orphaned; reads a different `invoices` table, no auth, different buckets. |
| Writing `subtotal`/`total_piutang` directly | They are generated — write `qty`/`harga_satuan`/`ppn_11_persen`/`sudah_dibayar` instead. |
| Hard-deleting a recurring parent | CASCADE wipes the whole series — archive (soft) instead. |
| Expecting auto `lunas`/`jatuh_tempo` | `status_bayar` is manual; reconcile in app/report logic. |
| Re-running the seed on shared data | Appendix A `DELETE`s this tenant's `ar_invoices`/`ar_bank_accounts` first. |

## 6. Rollback

```sql
BEGIN;
DELETE FROM public.ar_invoices      WHERE tenant_id='00000000-0000-0000-0000-000000000001'; -- cascades payment history + series
DELETE FROM public.ar_bank_accounts WHERE tenant_id='00000000-0000-0000-0000-000000000001';
COMMIT;
-- DROP TABLE public.ar_payment_history, public.ar_invoices, public.ar_bank_accounts;  -- only when decommissioning
```

## 7. Verification Queries

```sql
-- generated totals are internally consistent
SELECT count(*) AS bad FROM public.ar_invoices
WHERE tenant_id='00000000-0000-0000-0000-000000000001'
  AND sisa_piutang <> total_piutang - sudah_dibayar;   -- expect 0

-- collection snapshot
SELECT status_bayar, count(*), sum(total_piutang) piutang, sum(sudah_dibayar) dibayar
FROM public.ar_invoices WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL
GROUP BY 1 ORDER BY 1;
```

---

## Appendix A — Live Dataseed

Captured from the live tenant (real UUIDs preserved). The `ar_invoices.project_id` values reference projects seeded by `20260529000002_ar_seed_mock_data.sql` — ensure those exist first. Also saved standalone at **`supabase/seed/ar_seed.sql`**.

```sql
-- =====================================================
-- Seed: AR (Accounts Receivable) — Monitoring data
-- Captured from the live Supabase tenant 00000000-0000-0000-0000-000000000001.
-- Tables: ar_bank_accounts, ar_invoices, ar_payment_history.
--
-- EXTERNAL DEPENDENCIES (must exist for FKs to resolve):
--   projects(id)        — ar_invoices.project_id
--   user_profiles(id)   — created_by / archived_by
--   coa(id)             — ar_bank_accounts.coa_id
--   (also seeded by migration 20260529000002_ar_seed_mock_data.sql)
--
-- Idempotent: clears module tables first; ar_payment_history and recurring
-- children cascade from ar_invoices.
-- =====================================================

BEGIN;

DELETE FROM public.ar_invoices      WHERE tenant_id = '00000000-0000-0000-0000-000000000001';  -- cascades ar_payment_history + recurring children
DELETE FROM public.ar_bank_accounts WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

INSERT INTO public.ar_bank_accounts (id, tenant_id, kode, nama_bank, nama_akun, no_rekening, is_active, created_at, coa_id) VALUES
  ('8611b78d-39c8-48ad-a9d4-f6df03a3fcee', '00000000-0000-0000-0000-000000000001', 'B001', 'BCA', 'IRFAN ARSANDI', '1234567890', 'true', '2026-05-28 10:45:28.099913+00', 'c2fc0cb7-9f8f-4ae1-8613-24dea0c8cdc5'),
  ('9c017140-90b1-4b25-a96c-23493358b1f9', '00000000-0000-0000-0000-000000000001', 'B002', 'Mandiri', 'WAHANA INFORMASI TEKNOLOGI', '0987654321', 'true', '2026-05-28 10:45:28.099913+00', 'c2fc0cb7-9f8f-4ae1-8613-24dea0c8cdc5'),
  ('1520df5c-28f0-40e0-a4f0-2f74a2a915fd', '00000000-0000-0000-0000-000000000001', 'B003', 'BRI', 'WAHANA INFORMASI TEKNOLOGI', '1112223334', 'true', '2026-05-28 10:45:28.099913+00', 'c2fc0cb7-9f8f-4ae1-8613-24dea0c8cdc5'),
  ('f9c43da8-0735-49c7-beaa-646f9880e4d2', '00000000-0000-0000-0000-000000000001', 'B004', 'Cash', 'Kas Operasional', NULL, 'true', '2026-05-28 10:45:28.099913+00', '0b911c63-26b6-4226-9df6-189a2a10a2a7');

INSERT INTO public.ar_invoices (id, tenant_id, project_id, project_name, client_name, nilai_kontrak, no_invoice, tgl_invoice, tipe_invoice, description, qty, harga_satuan, ppn_11_persen, subtotal, ppn_amount, total_piutang, recurring_start_date, recurring_end_date, recurring_interval, recurring_parent_id, recurring_sequence, sudah_dibayar, sisa_piutang, note_termin, payment_method, bank_id, bank_label, deadline_bayar, status_bayar, status_kirim, is_archived, archived_at, archived_by, created_at, updated_at, created_by, updated_by, deleted_at, revenue_coa_id, journal_entry_id, ppn_dipungut_oleh, pph_jenis, lawan_punya_npwp, pph_tarif, pph_dipotong_oleh, pph_dpp, pph_amount, pph_dpp_kategori_id) VALUES
  ('ff7ccac4-7254-41ba-8c81-0c8add8920d7', '00000000-0000-0000-0000-000000000001', '65196ad6-f52f-4be7-9c5b-a00633d5ccd6', 'Implementasi ERP SAP Business One', 'PT Sumber Daya Nusantara', '850000000.000000', 'INV-20260101-001', '2026-01-01', 'one_time', 'Kickoff & Requirement Gathering', '1.000000', '255000000.000000', 'true', '255000000.000000', '28050000.000000', '283050000.000000', NULL, NULL, NULL, NULL, NULL, '283050000.000000', '0.000000', 'Termin 1 dari 3 (30%)', 'BCA', '8611b78d-39c8-48ad-a9d4-f6df03a3fcee', 'B001 - BCA IRFAN ARSANDI', '2026-01-31', 'lunas', 'sent', 'false', NULL, NULL, '2026-05-28 11:23:23.560916+00', '2026-05-28 11:23:23.560916+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('947a218d-d0ea-4b0c-bca5-557e7403ba40', '00000000-0000-0000-0000-000000000001', '97997d6a-dd06-4254-90bd-485a7a1fd435', 'HRIS Maintenance & Support Retainer', 'PT Prima Teknologi Indonesia', '600000000.000000', 'INV-20260101-003', '2026-01-01', 'recurring', 'Monthly Maintenance & Support Fee — Bulan 1', '1.000000', '50000000.000000', 'false', '50000000.000000', '0.000000', '50000000.000000', '2026-01-01', '2026-06-30', 'monthly', NULL, '1', '50000000.000000', '0.000000', NULL, 'BCA', '8611b78d-39c8-48ad-a9d4-f6df03a3fcee', 'B001 - BCA IRFAN ARSANDI', '2026-01-15', 'lunas', 'sent', 'false', NULL, NULL, '2026-05-28 11:23:23.560916+00', '2026-05-28 11:23:23.560916+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('0c4b8947-2aa7-4744-b11c-a6926a6c448b', '00000000-0000-0000-0000-000000000001', '65196ad6-f52f-4be7-9c5b-a00633d5ccd6', 'Implementasi ERP SAP Business One', 'PT Sumber Daya Nusantara', '850000000.000000', 'INV-20260201-001', '2026-02-01', 'one_time', 'Development & Konfigurasi Modul', '1.000000', '340000000.000000', 'true', '340000000.000000', '37400000.000000', '377400000.000000', NULL, NULL, NULL, NULL, NULL, '200000000.000000', '177400000.000000', 'Termin 2 dari 3 (40%)', 'BCA', '8611b78d-39c8-48ad-a9d4-f6df03a3fcee', 'B001 - BCA IRFAN ARSANDI', '2026-03-01', 'sebagian', 'sent', 'false', NULL, NULL, '2026-05-28 11:23:23.560916+00', '2026-05-28 11:23:23.560916+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('8cdf1e46-35b8-4f3b-9514-35e0315957cf', '00000000-0000-0000-0000-000000000001', '97997d6a-dd06-4254-90bd-485a7a1fd435', 'HRIS Maintenance & Support Retainer', 'PT Prima Teknologi Indonesia', '600000000.000000', 'INV-20260201-003', '2026-02-01', 'recurring', 'Monthly Maintenance & Support Fee — Bulan 2', '1.000000', '50000000.000000', 'false', '50000000.000000', '0.000000', '50000000.000000', '2026-01-01', '2026-06-30', 'monthly', '947a218d-d0ea-4b0c-bca5-557e7403ba40', '2', '50000000.000000', '0.000000', NULL, 'BCA', '8611b78d-39c8-48ad-a9d4-f6df03a3fcee', 'B001 - BCA IRFAN ARSANDI', '2026-02-15', 'lunas', 'sent', 'false', NULL, NULL, '2026-05-28 11:23:23.560916+00', '2026-05-28 11:23:23.560916+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('0b89701e-35df-417d-ab8f-ac3823e401f9', '00000000-0000-0000-0000-000000000001', '3c6acafa-8ec8-4d09-bf53-9b22a7008c66', 'Sistem Inventory Warehouse Management', 'CV Maju Logistik Nusantara', '450000000.000000', 'INV-20260301-001', '2026-03-01', 'one_time', 'Analisis Kebutuhan & Desain Sistem', '1.000000', '135000000.000000', 'true', '135000000.000000', '14850000.000000', '149850000.000000', NULL, NULL, NULL, NULL, NULL, '0.000000', '149850000.000000', NULL, NULL, NULL, NULL, '2026-04-01', 'jatuh_tempo', 'sent', 'false', NULL, NULL, '2026-05-28 11:23:23.560916+00', '2026-05-28 11:23:23.560916+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('3b400291-f1e3-4859-b076-0be960066a60', '00000000-0000-0000-0000-000000000001', '97997d6a-dd06-4254-90bd-485a7a1fd435', 'HRIS Maintenance & Support Retainer', 'PT Prima Teknologi Indonesia', '600000000.000000', 'INV-20260301-003', '2026-03-01', 'recurring', 'Monthly Maintenance & Support Fee — Bulan 3', '1.000000', '50000000.000000', 'false', '50000000.000000', '0.000000', '50000000.000000', '2026-01-01', '2026-06-30', 'monthly', '947a218d-d0ea-4b0c-bca5-557e7403ba40', '3', '50000000.000000', '0.000000', NULL, 'BCA', '8611b78d-39c8-48ad-a9d4-f6df03a3fcee', 'B001 - BCA IRFAN ARSANDI', '2026-03-15', 'lunas', 'sent', 'false', NULL, NULL, '2026-05-28 11:23:23.560916+00', '2026-05-28 11:23:23.560916+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('c554f35b-e71d-45b8-99a9-408a8ecbbcfa', '00000000-0000-0000-0000-000000000001', '65196ad6-f52f-4be7-9c5b-a00633d5ccd6', 'Implementasi ERP SAP Business One', 'PT Sumber Daya Nusantara', '850000000.000000', 'INV-20260315-001', '2026-03-15', 'one_time', 'UAT, Training & Go-Live Support', '1.000000', '255000000.000000', 'true', '255000000.000000', '28050000.000000', '283050000.000000', NULL, NULL, NULL, NULL, NULL, '0.000000', '283050000.000000', 'Termin 3 dari 3 (30%)', NULL, NULL, NULL, '2026-04-15', 'jatuh_tempo', 'sent', 'false', NULL, NULL, '2026-05-28 11:23:23.560916+00', '2026-05-28 11:23:23.560916+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('a0b8b26f-da28-4894-9e60-5d669251ad99', '00000000-0000-0000-0000-000000000001', '97997d6a-dd06-4254-90bd-485a7a1fd435', 'HRIS Maintenance & Support Retainer', 'PT Prima Teknologi Indonesia', '600000000.000000', 'INV-20260401-003', '2026-04-01', 'recurring', 'Monthly Maintenance & Support Fee — Bulan 4', '1.000000', '50000000.000000', 'false', '50000000.000000', '0.000000', '50000000.000000', '2026-01-01', '2026-06-30', 'monthly', '947a218d-d0ea-4b0c-bca5-557e7403ba40', '4', '25000000.000000', '25000000.000000', NULL, 'BCA', '8611b78d-39c8-48ad-a9d4-f6df03a3fcee', 'B001 - BCA IRFAN ARSANDI', '2026-04-15', 'sebagian', 'sent', 'false', NULL, NULL, '2026-05-28 11:23:23.560916+00', '2026-05-28 11:23:23.560916+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('edf9e18a-0cb6-4acc-90c5-7f97c4c77461', '00000000-0000-0000-0000-000000000001', 'a1f65187-8b27-45fc-bda1-c3346d0e0c15', 'Dashboard Analytics Real-Time', 'PT Indomedia Digital Solusi', '320000000.000000', 'INV-20260501-001', '2026-05-01', 'one_time', 'Development Dashboard Phase 1', '1.000000', '160000000.000000', 'false', '160000000.000000', '0.000000', '160000000.000000', NULL, NULL, NULL, NULL, NULL, '80000000.000000', '80000000.000000', NULL, 'Mandiri', '9c017140-90b1-4b25-a96c-23493358b1f9', 'B002 - Mandiri WAHANA INFORMASI TEKNOLOGI', '2026-06-01', 'sebagian', 'sent', 'false', NULL, NULL, '2026-05-28 11:23:23.560916+00', '2026-05-28 11:23:23.560916+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('8322bd87-88bd-4e6f-a140-fdddfe498f3d', '00000000-0000-0000-0000-000000000001', '3c6acafa-8ec8-4d09-bf53-9b22a7008c66', 'Sistem Inventory Warehouse Management', 'CV Maju Logistik Nusantara', '450000000.000000', 'INV-20260501-002', '2026-05-01', 'one_time', 'Development Modul Core', '1.000000', '180000000.000000', 'true', '180000000.000000', '19800000.000000', '199800000.000000', NULL, NULL, NULL, NULL, NULL, '0.000000', '199800000.000000', NULL, NULL, NULL, NULL, '2026-06-01', 'belum', 'sent', 'false', NULL, NULL, '2026-05-28 11:23:23.560916+00', '2026-05-28 11:23:23.560916+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('4a9ee9df-c3fe-4635-af44-aa32db7694a4', '00000000-0000-0000-0000-000000000001', '97997d6a-dd06-4254-90bd-485a7a1fd435', 'HRIS Maintenance & Support Retainer', 'PT Prima Teknologi Indonesia', '600000000.000000', 'INV-20260501-003', '2026-05-01', 'recurring', 'Monthly Maintenance & Support Fee — Bulan 5', '1.000000', '50000000.000000', 'false', '50000000.000000', '0.000000', '50000000.000000', '2026-01-01', '2026-06-30', 'monthly', '947a218d-d0ea-4b0c-bca5-557e7403ba40', '5', '0.000000', '50000000.000000', NULL, NULL, NULL, NULL, '2026-05-15', 'belum', 'reminder', 'false', NULL, NULL, '2026-05-28 11:23:23.560916+00', '2026-05-28 11:23:23.560916+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('951dc712-322f-43da-bc8a-fc9547dbeb39', '00000000-0000-0000-0000-000000000001', 'a1f65187-8b27-45fc-bda1-c3346d0e0c15', 'Dashboard Analytics Real-Time', 'PT Indomedia Digital Solusi', '320000000.000000', 'INV-20260601-001', '2026-06-01', 'one_time', 'Development Dashboard Phase 2 & Deployment', '1.000000', '160000000.000000', 'false', '160000000.000000', '0.000000', '160000000.000000', NULL, NULL, NULL, NULL, NULL, '0.000000', '160000000.000000', NULL, NULL, NULL, NULL, '2026-06-30', 'belum', 'sent', 'false', NULL, NULL, '2026-05-28 11:23:23.560916+00', '2026-05-28 11:23:23.560916+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL),
  ('9dc6a306-7915-4cc7-8927-e03c88174730', '00000000-0000-0000-0000-000000000001', '97997d6a-dd06-4254-90bd-485a7a1fd435', 'HRIS Maintenance & Support Retainer', 'PT Prima Teknologi Indonesia', '600000000.000000', 'INV-20260601-003', '2026-06-01', 'recurring', 'Monthly Maintenance & Support Fee — Bulan 6', '1.000000', '50000000.000000', 'false', '50000000.000000', '0.000000', '50000000.000000', '2026-01-01', '2026-06-30', 'monthly', '947a218d-d0ea-4b0c-bca5-557e7403ba40', '6', '0.000000', '50000000.000000', NULL, NULL, NULL, NULL, '2026-06-15', 'belum', 'reminder', 'false', NULL, NULL, '2026-05-28 11:23:23.560916+00', '2026-05-28 11:23:23.560916+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, NULL, NULL, NULL, 'kita', NULL, 'true', NULL, 'tidak_ada', NULL, '0.00', NULL);

INSERT INTO public.ar_payment_history (id, tenant_id, invoice_id, sudah_dibayar_lama, sisa_piutang_lama, bayar_sekarang, status_baru, bank_id, bank_label, deadline_baru, catatan_pembayaran, created_at, created_by, actor_name, journal_entry_id, pph_amount, kas_neto, nomor_bukti_potong, tanggal_bukti_potong) VALUES
  ('3053a946-9e2f-4b99-9bf3-1dca71070db6', '00000000-0000-0000-0000-000000000001', '0c4b8947-2aa7-4744-b11c-a6926a6c448b', '0.000000', '377400000.000000', '200000000.000000', 'sebagian', '8611b78d-39c8-48ad-a9d4-f6df03a3fcee', 'B001 - BCA IRFAN ARSANDI', NULL, 'Pembayaran via BCA', '2026-05-18 11:23:23.560916+00', NULL, 'Finance Team', NULL, '0.00', NULL, NULL, NULL),
  ('a4c25746-0a60-4c85-b9b8-f144f914f0e8', '00000000-0000-0000-0000-000000000001', '3b400291-f1e3-4859-b076-0be960066a60', '0.000000', '50000000.000000', '50000000.000000', 'lunas', '8611b78d-39c8-48ad-a9d4-f6df03a3fcee', 'B001 - BCA IRFAN ARSANDI', NULL, 'Pembayaran via BCA', '2026-05-18 11:23:23.560916+00', NULL, 'Finance Team', NULL, '0.00', NULL, NULL, NULL),
  ('498dd944-b12e-435e-ae6e-992e2f6d86d5', '00000000-0000-0000-0000-000000000001', '8cdf1e46-35b8-4f3b-9514-35e0315957cf', '0.000000', '50000000.000000', '50000000.000000', 'lunas', '8611b78d-39c8-48ad-a9d4-f6df03a3fcee', 'B001 - BCA IRFAN ARSANDI', NULL, 'Pembayaran via BCA', '2026-05-18 11:23:23.560916+00', NULL, 'Finance Team', NULL, '0.00', NULL, NULL, NULL),
  ('a08941f0-5077-4867-b8b2-f66c5056f889', '00000000-0000-0000-0000-000000000001', '947a218d-d0ea-4b0c-bca5-557e7403ba40', '0.000000', '50000000.000000', '50000000.000000', 'lunas', '8611b78d-39c8-48ad-a9d4-f6df03a3fcee', 'B001 - BCA IRFAN ARSANDI', NULL, 'Pembayaran via BCA', '2026-05-18 11:23:23.560916+00', NULL, 'Finance Team', NULL, '0.00', NULL, NULL, NULL),
  ('0bfcab8f-3d61-4feb-bf42-0f0ae44c4a90', '00000000-0000-0000-0000-000000000001', 'a0b8b26f-da28-4894-9e60-5d669251ad99', '0.000000', '50000000.000000', '25000000.000000', 'sebagian', '8611b78d-39c8-48ad-a9d4-f6df03a3fcee', 'B001 - BCA IRFAN ARSANDI', NULL, 'Pembayaran via BCA', '2026-05-18 11:23:23.560916+00', NULL, 'Finance Team', NULL, '0.00', NULL, NULL, NULL),
  ('7888d30d-161e-41cb-9c8b-6ed4aed626bd', '00000000-0000-0000-0000-000000000001', 'edf9e18a-0cb6-4acc-90c5-7f97c4c77461', '0.000000', '160000000.000000', '80000000.000000', 'sebagian', '9c017140-90b1-4b25-a96c-23493358b1f9', 'B002 - Mandiri WAHANA INFORMASI TEKNOLOGI', NULL, 'Pembayaran via Mandiri', '2026-05-18 11:23:23.560916+00', NULL, 'Finance Team', NULL, '0.00', NULL, NULL, NULL),
  ('90bc8a16-2490-4e04-b4af-4a3953ace829', '00000000-0000-0000-0000-000000000001', 'ff7ccac4-7254-41ba-8c81-0c8add8920d7', '0.000000', '283050000.000000', '283050000.000000', 'lunas', '8611b78d-39c8-48ad-a9d4-f6df03a3fcee', 'B001 - BCA IRFAN ARSANDI', NULL, 'Pembayaran via BCA', '2026-05-18 11:23:23.560916+00', NULL, 'Finance Team', NULL, '0.00', NULL, NULL, NULL);

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
-- Accounts Receivable (AR) — add company_id + branch_id (nullable, no FK)
ALTER TABLE public.ar_bank_accounts ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.ar_bank_accounts ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.ar_invoices ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.ar_invoices ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.ar_payment_history ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.ar_payment_history ADD COLUMN IF NOT EXISTS branch_id  uuid;

COMMENT ON COLUMN public.ar_bank_accounts.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ar_bank_accounts.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ar_invoices.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ar_invoices.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ar_payment_history.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ar_payment_history.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
```
