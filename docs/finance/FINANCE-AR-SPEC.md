# FINANCE — Accounts Receivable (AR) — Full Specification

**Module:** Finance & Accounting → Accounts Receivable
**Routes:** `/finance/ar-monitoring` · `/finance/ar-aging`
**Stack:** Next.js 16 (App Router) · shadcn/ui · Tailwind v4 · Supabase Postgres 17
**Tenant:** `00000000-0000-0000-0000-000000000001`
**Last updated:** 2026-06-08

> Companion: **`FINANCE-AR-MIGRATION.md`** — migration steps, ADRs, anti-patterns, full live dataseed (Appendix A).

---

## ⚠️ Architectural note (read first)

The two AR screens are **two separate implementations** and do not share data:

| | `/finance/ar-monitoring` | `/finance/ar-aging` | `GET /api/finance/ar-aging` |
|---|---|---|---|
| Data source | **Live Supabase** via `/api/ar/*` → `lib/services/ar-service.ts` → `ar_invoices` | **Hard-coded mock array** in the page | Live, but queries a different generic `invoices` table |
| Status | Production-shaped, fully wired | UI prototype only (fixed "as of 2026-04-22") | **Orphaned** — no page calls it |

The `ar_*` tables power **only** `ar-monitoring`. This spec documents the live `ar-monitoring` stack as primary and flags the rest.

---

## Table of Contents

1. [Goal & Scope](#1-goal--scope) · 2. [User Stories](#2-user-stories) · 3. [Domain Model & Business Rules](#3-domain-model--business-rules) · 4. [Database Schema](#4-database-schema) · 5. [API Contract](#5-api-contract) · 6. [Screens & Components](#6-screens--components) · 7. [Known Gaps & Risks](#7-known-gaps--risks) · 8. [Testing](#8-testing)

---

## 1. Goal & Scope

Track receivables **per project**: issue one-time and recurring invoices, record (partial) payments with history, monitor collection via KPIs (total/paid/outstanding, overdue count, DSO), and view aging.

**In scope:** project-grouped invoice list, one-time + recurring invoice creation, partial-payment recording with history, archive, bulk "mark sent", AR summary/DSO, aging matrix (prototype).
**Out of scope:** GL posting (AR does not write journals), multi-currency (IDR only), payment reversal/edit.

## 2. User Stories

| ID | Story |
|---|---|
| **US-AR-01** | Issue an invoice (one-time or recurring) against a project, with optional PPN 11%. |
| **US-AR-02** | Auto-generate a recurring series (monthly/quarterly/biannual/annual) from a date range. |
| **US-AR-03** | Record a partial or full payment; capture payment history; block overpayment. |
| **US-AR-04** | Monitor receivables: total piutang, collection %, outstanding %, overdue count, DSO. |
| **US-AR-05** | Filter/search by status (belum/sebagian/lunas/jatuh_tempo/arsip) and project/client. |
| **US-AR-06** | Archive invoices (single or per-project) and bulk-mark recurring invoices as "sent". |
| **US-AR-07** | View an aging matrix by customer (current / 1-30 / 31-60 / 61-90 / >90). |

## 3. Domain Model & Business Rules

### 3.1 Status enums
- **`status_bayar`**: `belum | sebagian | lunas | jatuh_tempo` (default `belum`). **Set manually** by the user — not auto-derived from amounts or dates.
- **`status_kirim`**: `reminder | sent` (default `reminder`). On create: recurring → `reminder`, one-time → `sent`.
- **`tipe_invoice`**: `one_time | recurring`.
- **`recurring_interval`**: `monthly | quarterly | biannual | annual` (or NULL).

### 3.2 Money math — DB generated columns
`subtotal`, `ppn_amount`, `total_piutang`, `sisa_piutang` are **GENERATED ALWAYS … STORED** (authoritative; cannot be written):
```
subtotal      = qty * harga_satuan
ppn_amount    = ppn_11_persen ? subtotal * 0.11 : 0      -- PPN hardcoded 11%
total_piutang = subtotal + ppn_amount
sisa_piutang  = total_piutang - sudah_dibayar
```

### 3.3 Recurring expansion
`previewRecurringDates` iterates start→end adding the interval (+1/+3/+6 months or +1 year), **capped at 60**. `createInvoice` writes one row per date; row 0 is the `recurring_parent_id` for the rest; `recurring_sequence` = 1..N; only sequence 1 carries the initial payment.

### 3.4 Payment rules (`updatePayment`)
Reject `bayar_sekarang <= 0`; reject `> sisa_piutang` (`AR_OVERPAY` → 422); reject archived invoice (`AR_INVOICE_ARCHIVED` → 409). On success: append an `ar_payment_history` row, then `sudah_dibayar += bayar_sekarang` and set `status_bayar = status_baru` (the user-chosen status). Payments are **increment-only** (no reversal/edit).

### 3.5 Overdue & DSO
- **Overdue** = has a deadline, `status_bayar != 'lunas'`, deadline in the past (independent of the `jatuh_tempo` label).
- **DSO** = average `(updated_at − tgl_invoice)` in days over `lunas` invoices (proxy; `updated_at` is not a true paid-date).
- **Collection %** = `sudah_dibayar / total_piutang × 100`; **outstanding %** = `sisa_piutang / total_piutang × 100`.

### 3.6 Aging buckets (two inconsistent schemes)
- **ar-aging page** (5 buckets on `outstanding`, `daysOverdue = today − dueDate`): `current (≤0)`, `1-30`, `31-60`, `61-90`, `>90`.
- **`/api/finance/ar-aging`** (6 buckets, orphaned): `current`, `1-30`, `31-60`, `61-90`, `91-180`, `over_180`.

## 4. Database Schema

Migrations: `20260529000001_ar_schema.sql` (tables) + `20260529000002_ar_seed_mock_data.sql` (mock data). RLS is **enabled but fully permissive** (`USING(true) WITH CHECK(true)`); tenant isolation is enforced in app code only.

### 4.1 `ar_bank_accounts`
`id`, `tenant_id`, `kode`, `nama_bank`, `nama_akun`, `no_rekening`, `is_active` (default TRUE), `created_at`, `coa_id`. `UNIQUE (tenant_id, kode)`. (4 rows seeded: BCA/Mandiri/BRI/Cash.)

### 4.2 `ar_invoices`
Identity + `project_id` (FK → `projects`), denormalized `project_name`/`client_name`/`nilai_kontrak`, `no_invoice` (`UNIQUE (tenant_id, no_invoice)`), `tgl_invoice`, `tipe_invoice` (`CHECK one_time|recurring`), `description`, `qty`, `harga_satuan`, `ppn_11_persen`, **generated** `subtotal`/`ppn_amount`/`total_piutang`/`sisa_piutang`, recurring fields (`recurring_start_date`/`end_date`/`interval` CHECK, `recurring_parent_id` self-FK CASCADE, `recurring_sequence`), `sudah_dibayar`, `note_termin`, `payment_method`, `bank_id` (FK → `ar_bank_accounts`), `bank_label`, `deadline_bayar`, `status_bayar` (CHECK), `status_kirim` (CHECK), `is_archived`/`archived_at`/`archived_by`, audit columns, plus tax fields (`revenue_coa_id`, `journal_entry_id`, `ppn_dipungut_oleh`, `pph_*`). Indexes on tenant, project, status_bayar, deadline, recurring, kirim.

### 4.3 `ar_payment_history`
`id`, `tenant_id`, `invoice_id` (FK **CASCADE**), `sudah_dibayar_lama`, `sisa_piutang_lama`, `bayar_sekarang`, `status_baru` (no CHECK), `bank_id`, `bank_label`, `deadline_baru`, `catatan_pembayaran`, `created_at`, `created_by`, `actor_name`, plus `journal_entry_id`/`pph_amount`/`kas_neto`/`nomor_bukti_potong`/`tanggal_bukti_potong`. Indexes on `(invoice_id)`, `(tenant_id, created_at DESC)`.

## 5. API Contract

`/api/ar/*` resolve the user (401 if none) then tenant from JWT, falling back to the default tenant; data access uses the service-role client.

| Method · Path | Purpose |
|---|---|
| `GET /api/ar/invoices` | List grouped by project. Query: `status_bayar` (+ `arsip`/`semua`), `search`, `page`, `size`. Returns `{ data: ARProjectGroup[], meta, summary }`. |
| `POST /api/ar/invoices` | Create invoice(s). Errors: `AR_DUPLICATE_NO_INVOICE` 409, `AR_INVALID_RECURRING_DATES` 422, `AR_PROJECT_NOT_FOUND` 404, `AR_OVERPAY` 422. 201. |
| `GET /api/ar/invoices/[id]` | Detail + `payment_history` + `days_overdue`. |
| `PUT /api/ar/invoices/[id]/payment` | Record a payment. `AR_OVERPAY` 422, `AR_INVOICE_ARCHIVED` 409. |
| `PATCH /api/ar/invoices/[id]/archive` | Soft-archive one invoice. |
| `PATCH /api/ar/invoices/bulk-archive` | Body `{ project_id }` — archive all of a project's invoices. |
| `PATCH /api/ar/invoices/bulk-kirim` | Body `{ invoice_ids[] }` — set `status_kirim='sent'` for recurring+reminder rows only. |
| `GET /api/ar/invoices/next-number` | `INV-YYYYMMDD-NNN`. |
| `GET /api/ar/projects` | Active projects (dropdown). |
| `GET /api/ar/bank-accounts` | Active banks with composite `label`. |
| `GET /api/ar/summary` | `ARSummary` (also embedded in the invoices list). |
| `GET /api/finance/ar-aging` | **Orphaned** — reads generic `invoices`, no auth, 6-bucket aging. |

## 6. Screens & Components

Both pages import only `@workspace/ui/*` (no `apps/web/components`). All sub-components are inline.

- **`/ar-monitoring`** — 5 KPI cards (Total Piutang, Sudah Dibayar + collection %, Sisa + outstanding %, Jatuh Tempo, DSO); search + filter pills; a 2-layer expand/collapse table (project → invoices); New Invoice + Edit Payment modals; archive + bulk-kirim; no chart.
- **`/ar-aging`** — 6 summary cards + aging matrix by customer + GRAND TOTAL; **mock data**, fixed "as of 2026-04-22".

## 7. Known Gaps & Risks

- **Two incompatible AR implementations** (live monitoring vs mock aging) + an orphaned aging API with a third bucket scheme.
- **Permissive RLS** + service-role access + default-tenant fallback — no real DB tenant isolation.
- **`status_bayar` is manual** — not reconciled with amounts/dates; `jatuh_tempo` is never auto-applied.
- **Increment-only payments** — no reversal; `ar_payment_history.status_baru` lacks a CHECK constraint.
- **Recurring create is N+1 and uncapped-safe at 60** — a mid-loop failure leaves a partial series (no transaction).
- **PPN hardcoded 11%** in both SQL and client preview.

## 8. Testing

No dedicated automated suite for AR today. Manual verification on a deployed environment: create one-time + recurring invoices (verify generated totals & series), record partial then full payment (verify history + overpay block), archive, bulk-kirim, and check KPI math. The live dataset (4 banks, 13 invoices incl. a 6-month recurring series, 7 payment-history rows) is in the MIGRATION doc Appendix A.
