# FINANCE — Laporan Keuangan (Financial Reporting) — Full Specification

**Module:** Finance & Accounting → Reporting (PSAK-compliant financial statements)
**Route:** `/finance/laporan-keuangan`
**Stack:** Next.js 16 (App Router) · shadcn/ui · Tailwind v4 · Supabase Postgres 17
**Tenant:** `00000000-0000-0000-0000-000000000001` (resolved via JWT → `user_profiles.tenant_id` → default)
**Last updated:** 2026-06-08

> Companion: **`FINANCE-LAPORAN_KEUANGAN-MIGRATION.md`** — migration steps, ADRs, anti-patterns, and the report-source dataseed (Appendix A: fiscal periods + journals).

---

## ⚠️ Architectural note (read first)

There are **two reporting stacks**; they do **not** share code:

| Stack | Engine | API | Used by the UI? |
|---|---|---|---|
| **Primary / live** | `apps/web/lib/services/report-engine.ts` (`buildReport`) | `GET /api/finance/laporan-keuangan` | **YES** |
| **Legacy / parallel** | `apps/web/lib/repositories/finance-reports.ts` | `GET /api/finance/reports[/*]` | **NO** (dead relative to the page) |

The live engine is enum-based (`enum_laporan_keuangan*`, `enum_cf_section`), handles opening balances + period locks + contra accounts, and balances the Neraca. The legacy stack is `account_type`-based, has no opening balances, and won't balance an interim Balance Sheet. This spec documents the **live** engine as primary.

---

## Table of Contents

1. [Goal & Scope](#1-goal--scope) · 2. [User Stories](#2-user-stories) · 3. [Reports & Screen](#3-reports--screen) · 4. [Reporting Engine](#4-reporting-engine-report-enginets) · 5. [Database Schema](#5-database-schema) · 6. [API Contract](#6-api-contract) · 7. [COA Attributes Consumed](#7-coa-attributes-consumed) · 8. [Known Gaps & Risks](#8-known-gaps--risks) · 9. [Testing](#9-testing)

---

## 1. Goal & Scope

Generate PSAK-compliant statements from posted journals + COA classification: **Laba Rugi** (Income Statement), **Neraca** (Balance Sheet), **Arus Kas** (Cash Flow, indirect), **Perubahan Ekuitas**, **Neraca Saldo** (Trial Balance), **Saldo Awal** (Beginning Balance), and **Buku Besar** (General Ledger), with period selection, a comparison/benchmark period, cost-center filtering, and growth columns.

**In scope:** the 7 report types above; opening balances from prior approved period; period-lock exclusion; contra/sign handling; current-earnings injection into the Neraca; print.
**Out of scope:** CSV/PDF/Excel download (print only); multi-currency (`amount_base` is a stub); budget comparison (`budget_amount` always 0); writing `trial_balance_snapshots`/locks (read-only today).

## 2. User Stories

(From `docs/qa/laporan-keuangan-test-plan.md`; 20/20 post-fix pass.)

| ID | Story |
|---|---|
| **US-001** | Open the page and use the filters without crashing. |
| **US-002** | Generate all report types (IS/BS/CF/EQ/TB/BB/GL) without error. |
| **US-003** | Use period / benchmark / cost-center / account filters with readable labels. |
| **US-004** | Accurate numbers — P&L waterfall correct **and Neraca balanced** (selisih 0). |
| **US-005** | Reports reflect real posted transactions. |

## 3. Reports & Screen

`apps/web/app/finance/laporan-keuangan/page.tsx` (client) — sidebar of 7 reports in two tiers:

- **Utama:** `IS` Laba Rugi (default), `BS` Neraca, `CF` Arus Kas, `EQ` Perubahan Ekuitas.
- **Detail:** `GL` Buku Besar, `TB` Neraca Saldo, `BB` Saldo Awal.

**Filters:** period (required; default = newest), benchmark/comparison (hidden for GL), cost center (level-3 values; hidden for GL), account (GL only, leaf accounts). Radix `<SelectItem>` empty-value trap avoided via sentinels (`__none__`/`__all__`/`__all_accounts__` → `''`).

**Rendering:** recursive collapsible tree (`LineRow`) with depth indent, bold uppercase computed subtotals, negatives in red parentheses; `GeneralLedgerView` (per-account running balance); `SummaryCards` per report; comparison columns (Periode Ini · Pembanding · Pertumbuhan Rp/%). **Export = `window.print()` only** (the `DownloadIcon` is unused).

## 4. Reporting Engine (`report-engine.ts`)

`buildReport(params): Promise<ReportResult>` pipeline:

1. Resolve period bounds (+ optional benchmark).
2. Fetch posted journal lines in-period, **excluding journals locked to other periods** (`fiscal_period_journal_locks` where `fiscal_period_id != period.id`) and excluding `kategori_jurnal = 'BEGINNING_BALANCE'`.
3. Add **opening balances**: prior **APPROVED** period's `trial_balance_snapshots.saldo_akhir`; fallback = sum of current-period `BEGINNING_BALANCE` journals.
4. Apply **sign multiplier**: `raw = normal_balance==='debit' ? debit−credit : credit−debit`, negated if `contra_account`.
5. Build the **5-layer COA tree** with leaves-first bottom-up aggregation (`amount`, `benchmark_amount`, `opening_balance`, `variance`, `variance_pct`).
6. Add **computed subtotal rows** (per report).
7. Return typed `ReportResult`.

**Per-report builders:**
- **IS** — `grossProfit = revenue − cogs`; `operatingProfit = grossProfit − opex`; `netBeforeTax = operatingProfit + otherIncome − otherExpense`; `netProfit = netBeforeTax − taxExpense`. Inserts LABA KOTOR / LABA OPERASIONAL / LABA SEBELUM PAJAK / LABA BERSIH rows.
- **BS** — `toEndingBalance()` folds opening into activity (ending = opening + activity); injects **"Laba (Rugi) Periode Berjalan"** (= current net profit) into equity so an interim Neraca balances; appends TOTAL AKTIVA and TOTAL KEWAJIBAN & EKUITAS; `balance_check` should be 0.
- **CF** — **indirect method**; 3 sections from `enum_cf_section` (OPERATING/INVESTING/FINANCING); net profit prepended to OPERATING.
- **TB** — flat list (`is_trial_balance` OR `level >= 4`); shows **period activity** (signed), not cumulative.
- **BB** — same accounts, showing `opening_balance` only.
- **GL** — per-account transactions with running balance + opening/closing.
- **EQ** — BS filtered to EQUITY + total liab/equity.

## 5. Database Schema

The module reads `journal_entries`, `journal_lines`, `coa`, and `fiscal_periods`; the period-close infrastructure is in `20260528000006_period_locks_trial_balance.sql` (+ `…0005_fiscal_period_approval.sql`).

### `fiscal_period_journal_locks`
`id`, `tenant_id` (FK→tenants CASCADE), `journal_entry_id` (FK→journal_entries), `fiscal_period_id` (FK→fiscal_periods), `locked_at`, `locked_by`. `UNIQUE (journal_entry_id, fiscal_period_id)`; indexes on journal/period/tenant+period. RLS: `finance_manage_locks` (finance/cfo/admin/super_admin). **Purpose:** report queries exclude journals locked to *prior* periods (NOT-EXISTS substitute).

### `trial_balance_snapshots`
`id`, `tenant_id`, `fiscal_period_id`, `coa_id`, `saldo_akhir` (signed), `saldo_akhir_base` (IDR), `created_at`, `created_by`. `UNIQUE (fiscal_period_id, coa_id)`. RLS: manage (finance roles) + read-all (tenant members). **Purpose:** a closed period's saldo akhir becomes the next period's **saldo awal**.

### `fiscal_periods` (extended)
`approval_status` (`CHECK DRAFT|PENDING_APPROVAL|APPROVED|LOCKED`, default DRAFT), `grace_days`, `is_grace_allowed`, approval trail (`submitted_/approved_/locked_by/at`, `approval_notes`). **Note:** the real label column is `period_name` (no `name`/`fiscal_year`/`period_number` — the engine maps `period_name → name`, derives `fiscal_year` from `start_date`, sets `period_number = 0`).

> **Population gap:** only `report-engine.ts` references the snapshots/locks tables — **read-only**. No app code writes them yet (intended at period APPROVED). Until then, opening balances come from `BEGINNING_BALANCE` journals and lock-exclusion is a no-op.

## 6. API Contract

### Live — `GET /api/finance/laporan-keuangan`
Auth: `getUser()` (401 if none) → `resolveTenantId(user)`. Query: `type` (`IS|BS|CF|EQ|TB|BB|GL`, default IS; 400 if invalid), **`period_id` (required, 400)**, `benchmark_period_id?`, `cost_center_value_id?`, `account_id?` (GL). Returns `ReportResult` = `{ period, benchmark_period?, lines[], ledger?, summary, generated_at }`. Summary keys vary by type (IS: revenue/gross_profit/operating_profit/net_before_tax/net_profit; BS: total_assets/total_liab_equity/balance_check; CF: operating/investing/financing/net_change; TB: total_debit/total_credit; GL: gl_accounts/gl_entries/gl_total_debit/gl_total_credit).

### Legacy — `GET /api/finance/reports[/*]` (not used by the page)
`reports` dispatcher (`profit-loss|balance-sheet|trial-balance|dashboard-summary`→501) → `finance-reports.ts`. Standalone `reports/profit-loss`, `reports/balance-sheet`, `reports/cash-flow-statement` (`method=indirect|direct`; **direct-method detail is fabricated percentage splits**), `reports/trial-balance`. All four construct a **module-scope** admin client and hard-code the tenant (anti-pattern — see §8).

## 7. COA Attributes Consumed

The live engine selects: `enum_laporan_keuangan` (`INCOME_STATEMENT|BALANCE_SHEET` — top-level scope), `enum_laporan_keuangan_category` (`REVENUE/COGS/OPEX/OTHER_INCOME/OTHER_EXPENSE/TAX_EXPENSE` for IS; `ASSET/LIABILITY/EQUITY` for BS), `enum_cf_section` (`OPERATING/INVESTING/FINANCING` — CF sections), `coa_layer`, `contra_account`, `normal_balance`, `is_trial_balance`, `is_working_capital`, `is_non_cash_item`, `sort_order`. **These are exactly the attributes the COA module classifies** (see `FINANCE-CHART_OF_ACCOUNT-SPEC` §8) — accurate reports depend on them being populated. (`cash_flow_category` is used only by the legacy CF route.)

## 8. Known Gaps & Risks

- **Two divergent engines** — the legacy `/api/finance/reports/*` stack is dead code, `account_type`-based, won't balance interim BS, and its **module-scope admin client crashes builds** when `SUPABASE_SERVICE_ROLE_KEY` is absent.
- **Snapshots/locks are read-only** — not yet written on period approval; opening balances rely on `BEGINNING_BALANCE` journals.
- **Direct-method CF detail is fabricated** (percentage splits) in the legacy route; the live CF is indirect-only.
- **Export is print-only**; `amount_base`/`budget_amount` are stubs (no FX, no budget).
- **`fiscal_periods` column mismatch** — selecting `name/fiscal_year/period_number` 500s (use `period_name`).
- **Lock-exclusion uses unparameterized `NOT IN (ids)`** — can break on very large locked-ID sets.
- **TB shows period activity**, not cumulative saldo akhir.

## 9. Testing

QA: `docs/qa/laporan-keuangan-test-plan.md` — 20/20 post-fix pass on FY2026-Q2; verified Laba Bersih 86,000,000 and Neraca selisih 0. Bugs fixed: Radix empty-value crash (sentinels), API 500 from non-existent period columns (`period_name` mapping), balance-sheet imbalance (signed opening + current-earnings injection), tenant resolution (`lib/finance/tenant.ts`). Seed: 16 balanced posted journals on Q2 (`JE-QA-%`) + 22 on Q1 (`JE-Q1-%`); results on `/finance/qa`. The report-source dataset (3 periods, 52 entries, 141 lines) is in the MIGRATION doc Appendix A.
