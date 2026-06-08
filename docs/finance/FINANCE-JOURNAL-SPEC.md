# FINANCE — Journal / Jurnal Umum + Auto-Journal Engine — Full Specification

**Module:** Finance & Accounting → General Journal (Jurnal Umum) + config-driven Auto-Journal Engine
**Routes:** `/finance/journal` · `/finance/journal/new` · `/finance/journal/[id]` · `/finance/journal-config`
**Stack:** Next.js 16 (App Router) · shadcn/ui · Tailwind v4 · Supabase Postgres 17
**Tenant:** `00000000-0000-0000-0000-000000000001`
**Last updated:** 2026-06-08

> Companion: **`FINANCE-JOURNAL-MIGRATION.md`** — migration steps, ADRs, anti-patterns, dataseed (Appendix A) + company/branch (Appendix B).

---

## Overview

The journal module is the **double-entry ledger core** that every other finance module ultimately writes to. It has three parts:

1. **Manual journals** (`/finance/journal*`) — create/post/void/reverse balanced memorial entries.
2. **Auto-journal engine** (`lib/finance/journal-engine.ts` + pure `journal-engine-core.ts`, configured via `konfigurasi_jurnal`) — turns AR/AP/internal-payment events into balanced posted journals from config templates. This is the integration hub for AR, AP, Permintaan Uang/Pembayaran (and the basis for the Cash-Register enhancement).
3. **Cost-center allocation** — tag journal lines to org units (split-capable schema).

---

## Table of Contents

1. [Goal & Scope](#1-goal--scope) · 2. [User Stories](#2-user-stories) · 3. [Journal Lifecycle & Rules](#3-journal-lifecycle--rules) · 4. [Auto-Journal Engine](#4-auto-journal-engine) · 5. [The 5 Auto-Journal Use Cases](#5-the-5-auto-journal-use-cases) · 6. [Cost-Center Allocation](#6-cost-center-allocation) · 7. [Database Schema](#7-database-schema) · 8. [API Contract](#8-api-contract) · 9. [Known Gaps & Risks](#9-known-gaps--risks) · 10. [Testing](#10-testing)

---

## 1. Goal & Scope

PSAK-compliant double-entry bookkeeping: manual memorial entries plus automatic, config-driven journals for the 5 standard finance events. Balance is enforced at multiple layers; posted entries are immutable; corrections are via reversal.

**In scope:** manual journal CRUD + post/void/reverse + reverse-source (bulk); the auto-journal engine + config CRUD; cost-center tagging; general-ledger query.
**Out of scope / weak today:** `posted_at` write-back, multi-level cost-center split population, true `entry_number` sequencing, auth/RBAC on most routes (see §9).

## 2. User Stories

| ID | Story |
|---|---|
| **US-JRN-01** | Create a balanced manual journal (≥2 lines, Dr=Cr) and save as draft. |
| **US-JRN-02** | Post a draft (immutable thereafter); void an unposted entry; reverse a posted entry. |
| **US-JRN-03** | Auto-generate balanced posted journals from AR/AP/internal events via config (no manual entry). |
| **US-JRN-04** | Configure auto-journal templates (`/finance/journal-config`) without code. |
| **US-JRN-05** | Tag journal lines to cost centers for departmental reporting. |
| **US-JRN-06** | Query a per-account general ledger with running balance. |

## 3. Journal Lifecycle & Rules

### 3.1 Status (`journal_entries.status`)
`CHECK IN ('draft','posted','reversed','void')`, default `draft`.
```
draft ──post──► posted ──reverse──► (new draft reversal entry; original stays posted)
draft ──void──► void
draft ──delete──► soft-deleted (deleted_at)
```
- **`reversed` is dead** — reversal creates a *new* `is_reversal=true` entry; the original remains `posted`.
- **Post** sets `status='posted'` + `posted_by` (**not** `posted_at` — never written, §9).
- **Void** only for non-posted (`'Cannot void posted entry. Use reversal instead'`).
- **Reverse** (single) requires a posted source; builds a **new draft** with swapped Dr/Cr, `is_reversal=true`, `reversal_of_id`, `JE-REV-…` number — **not auto-posted**.
- **Reverse-source** (bulk) reverses **all** posted non-reversal entries for a `(source_type, source_id)`, dated today, `kategori_jurnal='ADJUSTMENT'`, and **auto-posts**; idempotent; never throws (errors → `jurnal_error_log`).

### 3.2 Categories (`kategori_jurnal`)
`CHECK IN ('REGULAR','BEGINNING_BALANCE','CLOSING','ADJUSTMENT')`, default `REGULAR`. `BEGINNING_BALANCE` is the opening-balance source the reporting engine reads when no `trial_balance_snapshot` exists; `CLOSING` = P&L→retained earnings; `ADJUSTMENT` = period-end/reversals.

### 3.3 Balance enforcement (layered)
(a) client `new` page (`|Dr−Cr|<0.01`, ≥2 lines); (b) repo `createJournalEntry` (`|Dr−Cr|>0.0001` throws, ≥2 lines, each line debit XOR credit); (c) DB `CHECK chk_journal_line_single_side`; (d) DB trigger `validate_journal_entry_balance` on the draft→posted transition — **sums `debit_amount_base`/`credit_amount_base`** (not transaction amounts).

### 3.4 Immutability (PSAK)
Triggers `prevent_posted_modification` (entries) + `prevent_posted_lines_modification` (lines) block UPDATE/DELETE when the entry is `posted`. (Consequence: soft-deleting a posted entry errors — §9.)

### 3.5 Fiscal-period link
`fiscal_period_id → fiscal_periods`. Trigger `assign_fiscal_period` auto-fills it from a period covering `transaction_date` with `status != 'closed'` (lenient — only `RAISE NOTICE` if none → entry may post with `fiscal_period_id = NULL`). See `FINANCE-PERIODS-SPEC`.

### 3.6 `source_type` / `source_id`
`CHECK IN ('manual','invoice','payment','expense_claim','payroll','depreciation','adjustment','ar_invoice','ar_payment','ap_invoice','ap_payment','pembayaran')`. Auto-journals set these; used for idempotency + reversal lookup. (Manual UI dropdown only exposes the original 7.)

## 4. Auto-Journal Engine

`apps/web/lib/finance/journal-engine.ts` (DB + side effects) wraps the pure, unit-testable `journal-engine-core.ts` (resolution + balance). Driven by `konfigurasi_jurnal` (header) + `konfigurasi_jurnal_detail` (line templates).

### 4.1 Config model
- **`konfigurasi_jurnal`**: `kode_konfigurasi` (e.g. `AR-INV-ISSUE`), `nama_fitur`, `modul_referensi` (`CHECK penjualan|pembelian|pembayaran_internal`), `tipe_jurnal`, `is_aktif`, `UNIQUE (tenant_id, kode_konfigurasi)`.
- **`konfigurasi_jurnal_detail`** (one row per line template): either `coa_id` (fixed account) **or** `dynamic_source` (runtime token) — mutually exclusive (`chk_account_source`); `posisi` (`CHECK debit|credit`); `sumber_nominal` (which amount); `urutan`; `is_optional` (skip when nominal=0).
  - `dynamic_source` ∈ `invoice_revenue_coa, ar_bank_coa, ap_line_coa, ap_bank_coa, pmb_expense_coa, pmb_bank_coa, pmb_biaya_lain_coa`.
  - `sumber_nominal` ∈ `grand_total, subtotal, pajak, total_piutang, bayar_sekarang, nominal_bayar, line_amount, line_tax, biaya_lain_amount` (+ `pph_amount, kas_neto` added for withholding).

### 4.2 Resolution (`resolveJournalLines`, pure)
- **Multi** token (`ap_line_coa`, `pmb_biaya_lain_coa`): iterate `payload.dynamicLines[token]`, one line per item (`item.amount`, `item.coaId`); skip amount ≤ 0; error `MISSING_ACCOUNT` if a positive item lacks a COA.
- **Scalar**: `amount = round2(payload.nominals[sumber_nominal])`; **skip if ≤ 0** (how optional PPN/PPh lines vanish); account = `coa_id ?? dynamicAccounts[dynamic_source]`; error `MISSING_ACCOUNT` if unresolved.
- `computeBalance`: ≥2 lines and `|Dr−Cr| ≤ 0.01`.

### 4.3 Orchestration (`processJournalAutomation`)
Design rules: **Always-Balanced · Non-blocking (never breaks the business txn) · Idempotent · zero-nominal lines skipped.**
1. **Idempotency** — if an active (draft/posted, non-reversal) journal exists for `(source_type, source_id)` → return `{idempotent:true}`.
2. Load active config by `(tenant_id, kode_konfigurasi)` → `NO_CONFIG` if missing.
3. Resolve lines → `MISSING_ACCOUNT`; 0 lines → `{skipped:true}`; imbalance → `NOT_BALANCED`.
4. Insert as **draft** (`createJournalEntry`, `kategori='REGULAR'`, period via `resolveFiscalPeriod`), then **auto-post** (DB re-validates).
5. Best-effort write-back of `journal_entry_id` to the source row (`SOURCE_LINK`: ar_invoice→ar_invoices, ar_payment→ar_payment_history, ap_invoice→ap_invoices, ap_payment→ap_payment_history, pembayaran→pembayaran).
6. Errors → `jurnal_error_log` (`NO_CONFIG|NO_LINES|MISSING_ACCOUNT|NOT_BALANCED|PERSIST_FAILED`); engine never throws.

Config CRUD: `/api/finance/journal-config` (+ `[kode]`, `[kode]/toggle`); a new config is dormant until a business route calls the engine with its `triggerCode`.

## 5. The 5 Auto-Journal Use Cases

Triggered by the business routes; **PPh timing = at payment** (PSAK), DPP basis = subtotal (service value); withholding computed server-side (`resolveWithholding`), `kas_neto = gross − pph`. Optional lines vanish when `pph_amount = 0` (journal identical to pre-withholding).

| Code · trigger | Where called | Lines (Dr / Cr) |
|---|---|---|
| **AR-INV-ISSUE** (`ar_invoice`) | `ar-service.createInvoice` | Dr Piutang `1-10100` = total_piutang · Cr Pendapatan `invoice_revenue_coa` = subtotal · Cr PPN Keluaran `2-10200-4` (opt) = pajak |
| **AR-PAY-RCV** (`ar_payment`) | `ar-service.updatePayment` | Dr Kas/Bank `ar_bank_coa` = kas_neto · Dr PPh23 prepaid `1-10400-3` (opt) = pph · Cr Piutang `1-10100` = bayar_sekarang |
| **AP-BILL-RCV** (`ap_invoice`) | AP `/approve` | Dr Beban/Aset per item `ap_line_coa` = line_amount · Dr PPN Masukan `1-10400-1` (opt) = pajak · Cr Hutang `2-10100` = grand_total |
| **AP-PAY** (`ap_payment`) | AP `/pay` | Dr Hutang `2-10100` = bayar_sekarang · Cr Hutang PPh23 `2-10200-2` (opt) = pph · Cr Kas/Bank `ap_bank_coa` = kas_neto |
| **PMB-INTERNAL** (`pembayaran`) | Pembayaran `/execute` | Dr Beban `pmb_expense_coa` = nominal_bayar · Dr Biaya Lain `pmb_biaya_lain_coa` (multi) · Cr Hutang PPh23 `2-10200-2` (opt) = pph · Cr Kas/Bank `pmb_bank_coa` = kas_neto |

> The **Kas/Bank legs** (`ar_bank_coa`, `ap_bank_coa`, `pmb_bank_coa` → COA `1-1000x`) are exactly the postings the Cash-Register module should consume — see `FINANCE-CASH_REGISTER-SPEC` §Target Architecture.

## 6. Cost-Center Allocation

Hierarchy: `cost_center_configs → cost_center_levels (1–10) → cost_center_values` (self-ref `parent_value_id` for rollup; `UNIQUE(config_id, kode)`; denormalized `level_number`). Split table **`journal_line_cost_centers`** (`journal_line_id`, `cost_center_value_id`, `cost_center_config_id`, `level_number`, `allocated_pct` `CHECK >0 ≤100`, CASCADE on line). The `new` page sets only the single-column shortcut `journal_lines.cost_center_value_id`; **the split table is never written by any route** and the sum-to-100 rule is unenforced (§9).

## 7. Database Schema

Migrations: `20260421015823_create_journal_entries.sql` (entries+lines+triggers+fiscal_periods), `202605150400_add_posted_at_journal.sql`, `20260528000002_journal_kategori.sql`, `20260528000003_cost_center.sql`, `20260528000004_journal_line_cost_centers.sql`, `20260605000001_journal_automation_schema.sql` (+ `…0002` seed, `…0004` indexes), tax-withholding `20260606000002/3/5/6/8`.

- **`journal_entries`** — see §3 for status/kategori/source_type; `entry_number text UNIQUE`, `transaction_date`, `posting_date`, `currency`/`exchange_rate`, `is_reversal`/`reversal_of_id`/`reversal_reason`, `prepared_by` (NOT NULL), `posted_by`, `posted_at` (nullable, **never written**), audit. **No stored totals** (computed in API). RLS: finance/cfo/admin/super_admin full; ceo read.
- **`journal_lines`** — `coa_id` (NOT NULL), `debit_amount`/`credit_amount` + `*_amount_base` (balance trigger sums the base), `cost_center_value_id`, `project_id`, `client_id`, `tax_code`/`tax_amount`. `CHECK chk_journal_line_single_side`.
- **`journal_line_cost_centers`** — split allocation (write-dead today).
- **`konfigurasi_jurnal` / `konfigurasi_jurnal_detail`** — auto-journal config (see §4). ⚠ `tenant_id` is plain uuid (no FK) and RLS is `USING(true) WITH CHECK(true)` — **open, not tenant-scoped** (§9).
- **`jurnal_error_log`** — `error_code`, `pesan_error`, `payload_json`; RLS `USING(true)` (open).

## 8. API Contract

Base `/api/finance/journal`. **All mutation routes use the service-role admin client with hardcoded tenant/user**, except `/reverse` (requires auth).

| Method · Path | Purpose |
|---|---|
| `GET /api/finance/journal` | Branches: `?coaId=` (general ledger, running balance, `includeReversed`), `?id=` (single + computed totals), `?entryNumber=`, else list (filters: status, fiscalPeriodId, date range, sourceType, sourceId, kategoriJurnal, search). |
| `POST /api/finance/journal` | Create draft. Requires `transaction_date, description, fiscal_period_id, lines(≥2)`. Auto `entry_number`. 201. |
| `PUT /api/finance/journal?id=` | Update draft (rejects posted). |
| `DELETE /api/finance/journal?id=` | Soft delete (no status guard → errors on posted via trigger, §9). |
| `POST /api/finance/journal/post` | `id` (body or query) → status=posted. |
| `POST /api/finance/journal/void` | `{id}` → void (rejects posted). |
| `POST /api/finance/journal/reverse` | `{id, reason}` — **auth required (401)**; creates a draft reversal (not posted). |
| `POST /api/finance/journal/reverse-source` | `{source_type|referensi_tipe, source_id|referensi_id, reason?}` — reverse + auto-post all active journals for the source. |
| `/api/finance/journal-config` (+ `[kode]`, `[kode]/toggle`) | Auto-journal config CRUD; `validateConfig` (≥2 lines, one-of coa/dynamic, known tokens, ≥1 Dr + ≥1 Cr); dup kode → 409. |

## 9. Known Gaps & Risks

- **Auth bypass on writes** — every route except `/reverse` uses the service-role client + hardcoded tenant/user UUIDs; PSAK prepared/posted audit is undermined.
- **`konfigurasi_*` + `jurnal_error_log` RLS = `USING(true)`** — open, not tenant-scoped; config tables have no `tenants` FK.
- **`posted_at` never written** — detail page always shows "—".
- **`'reversed'` status dead**; **`entry_number` has no sequence** (timestamp-suffix collision risk under concurrency).
- **Balance trigger trusts `*_amount_base`** — can disagree with transaction amounts if a caller passes wrong base.
- **Split cost-center table write-dead**; `allocated_pct` sum=100 unenforced.
- **Detail "Void" on posted always fails** (no reverse button in UI) → posted entries un-actionable from `/[id]`.
- **`/reverse` leaves an unposted draft** (vs `/reverse-source` which auto-posts).
- **Deploy-order coupling** for PPh config migrations (`…05/06/08`): apply **after** the route deploy, else the bank line reads `kas_neto=0` → journal skipped (non-blocking) and must be backfilled.
- **Token-vocabulary drift risk** across DB CHECK / `journal-engine-core.ts` / `journal-config-options.ts` (no CI guard).
- **GL date filter** applied on the embedded relation (PostgREST) — can return lines with null-joined entries.

## 10. Testing

Pure engine `journal-engine-core.ts` is unit-testable (resolution + balance). Recommended suite for the new repo: per-use-case config resolution (the 5 cases incl. PPh on/off), idempotency, NO_CONFIG/MISSING_ACCOUNT/NOT_BALANCED paths, reverse-source idempotency. Live data: 52 entries / 141 lines in `lk_reports_seed.sql`; the 5 auto-journal configs + 16 line templates in `journal_automation_seed.sql` (MIGRATION Appendix A).
