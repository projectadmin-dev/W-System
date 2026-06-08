# FINANCE — Chart of Account — Migration Guide

**Module:** Finance & Accounting → Master Data → Chart of Account
**Audience:** Backend / DBA / DevOps deploying COA schema + seed to a fresh or existing Supabase project
**Companion:** `FINANCE-CHART_OF_ACCOUNT-SPEC.md` (domain, schema, engine, API)
**Tenant:** `00000000-0000-0000-0000-000000000001`
**Last updated:** 2026-06-08

> **Appendix A** at the bottom of this file contains the **complete live dataseed** —
> all **170 accounts** with every PSAK/reporting attribute populated — as a re-runnable
> SQL script.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Migration Order (step-by-step)](#2-migration-order-step-by-step)
3. [Deploy Runbook](#3-deploy-runbook)
4. [Architecture Decision Records (ADR)](#4-architecture-decision-records-adr)
5. [PSAK Attribute Backfill](#5-psak-attribute-backfill)
6. [Anti-Patterns & Pitfalls](#6-anti-patterns--pitfalls)
7. [Rollback](#7-rollback)
8. [Verification Queries](#8-verification-queries)
9. [Appendix A — Full COA Dataseed (170 rows)](#appendix-a--full-coa-dataseed-170-rows)

---

## 1. Overview

The COA schema was built **additively** — every migration uses `ADD COLUMN IF NOT EXISTS` /
`CREATE TABLE IF NOT EXISTS` and is safe to re-run. The base `public.coa` table predates this
module; the migrations below layered on the 5-layer hierarchy, reporting attributes, Sub-DL,
Sub GL, audit, and approvals.

The **final state** is a 38-column `coa` table plus three companion tables
(`coa_audit_log`, `coa_pending_approval`, `coa_sub_gl_value`), seeded with **170 WIT.ID
accounts** that are fully classified for PSAK 1 (statement mapping) and PSAK 2 (cash flow).

---

## 2. Migration Order (step-by-step)

Apply in timestamp order. COA-relevant migrations (others omitted for brevity):

| # | Migration file | What it does |
|---|---|---|
| 1 | `20260425080654_add_cash_flow_category_to_coa.sql` | adds `cash_flow_category` + index + first pattern-based backfill |
| 2 | `20260528000001_coa_layer_flags.sql` | adds `coa_layer`, `sort_order`, report enums (`enum_laporan_keuangan`, `enum_laporan_keuangan_category`), type flags (`contra_account`, `direct_indirect_cost`, `enum_cost_category`), sub-account flags (`enum_cf_section`, `enum_cf_line`, `is_working_capital`, `is_non_cash_item`, `is_budgeted`, `is_tax_deductible`, `is_restricted`), DL flags (`is_trial_balance`, `is_taxation_report`) + reporting indexes |
| 3 | `20260528000007_seed_wit_coa.sql` | original 5-layer WIT.ID seed (TRUNCATEs finance mock data first; parent wiring by `account_code` lookup) |
| 4 | `20260531000001_coa_segments_and_detail_ledger.sql` | adds `coa_full_code`, `segment_code`, `name_en`, DL flags (`required_sub_gl`, `is_washed_out_account`, `required_child`, `child_upstream_id`, `child_source_master_data`) + self-ref FK; backfills full/segment codes |
| 5 | `20260531000002_coa_sub_gl.sql` | adds `sub_gl_config` jsonb + `coa_sub_gl_value` table |
| 6 | `20260531000003_coa_approvals_audit.sql` | creates `coa_audit_log` + `coa_pending_approval` |

> **v3 (this delivery)** added **no new DDL**. It introduced the pure import schema
> (`apps/web/lib/coa-import-schema.ts`), the xlsx import/export, and a **data-only PSAK
> backfill** of the four previously-blank attribute groups (see §5). The authoritative,
> fully-populated result is captured in **Appendix A**.

### 2.1 Column provenance

```
base coa table .................. id, tenant_id, account_code, account_name, account_type,
                                  parent_account_id, level, is_active, normal_balance,
                                  tax_code, description, created_at, updated_at,
                                  created_by, deleted_at
+ add_cash_flow_category ........ cash_flow_category
+ coa_layer_flags ............... coa_layer, sort_order, enum_laporan_keuangan,
                                  enum_laporan_keuangan_category, contra_account,
                                  direct_indirect_cost, enum_cost_category, enum_cf_section,
                                  enum_cf_line, is_working_capital, is_non_cash_item,
                                  is_budgeted, is_tax_deductible, is_restricted,
                                  is_trial_balance, is_taxation_report
+ coa_segments_and_detail_ledger  coa_full_code, segment_code, name_en, required_sub_gl,
                                  is_washed_out_account, required_child, child_upstream_id,
                                  child_source_master_data
+ coa_sub_gl .................... sub_gl_config
```

---

## 3. Deploy Runbook

For the VPS staging box (PM2 process `wsystem-1-staging`):

```bash
# 1. Pull latest application code
cd /home/ubuntu/apps/wsystem-1
git pull origin master

# 2. Apply any new migrations (if using the Supabase CLI against the remote project)
#    — schema migrations are idempotent; safe to re-run.
supabase db push      # or apply the SQL files in supabase/migrations in timestamp order

# 3. (Optional) reseed COA from the canonical dataseed
#    Appendix A is also saved as a standalone file:
#    psql "$DATABASE_URL" -f supabase/seed/coa_full_seed.sql

# 4. Build + restart the web app
cd apps/web
npm run build
pm2 restart wsystem-1-staging
```

> The PSAK backfill (§5) was applied directly to the live project via the Supabase SQL API.
> A fresh environment reaches the same state by running **Appendix A** (which already contains
> the fully-classified values).

---

## 4. Architecture Decision Records (ADR)

### ADR-1 — `account_code` stores the **full** hierarchical code (true segments)

**Decision:** `account_code` = canonical full code (e.g. `1-10002-1`); `coa_full_code` mirrors it
(indexed); `segment_code` holds the per-layer chip.
**Why:** search/sort on a single indexed column; the chip is cheap to derive; round-trip import
needs a stable unique key. **Trade-off:** code uniqueness is enforced by convention (no DB unique
constraint) — the import API and seeds rely on it.

### ADR-2 — Pure logic modules, dynamic XLSX

**Decision:** `coa-logic.ts` and `coa-import-schema.ts` are **pure** (no React/browser/XLSX).
XLSX is loaded via **dynamic `import('xlsx')`** only inside browser components.
**Why:** the same normaliser runs in the API route, the client, and `node:test`; SSR never bundles
SheetJS. **Trade-off:** the schema is duplicated knowledge vs. the DB CHECK constraints — kept in
sync deliberately (the `VALID_*` lists mirror the constraints).

### ADR-3 — Auto-infer blank report enums on import

**Decision:** blank `normal_balance` / `enum_laporan_keuangan` / `enum_laporan_keuangan_category`
are inferred from `account_type`; explicit values always override.
**Why:** a minimal 4-column import still yields accounts that show up in the financial reports
immediately. **Trade-off:** cash-flow / cost attributes are **not** inferred (too account-specific)
— they are set by the PSAK backfill or supplied in the file.

### ADR-4 — Server-side column whitelist from `COA_COLUMNS`

**Decision:** the import API derives `ALLOWED_KEYS` from `COA_COLUMNS` and drops unknown keys.
**Why:** prevents arbitrary-column injection from a crafted payload. **Trade-off:** adding a new
importable column requires updating the single `COA_COLUMNS` source (by design).

### ADR-5 — Round-trip-safe export (DB keys as headers)

**Decision:** export uses **DB column names** as headers (not pretty labels) and serialises booleans
as `TRUE`/`FALSE`.
**Why:** an exported file re-imports with no header mapping. **Trade-off:** headers are less
"pretty"; the **Referensi** sheet in the template carries the human labels instead.

### ADR-6 — Row-by-row insert on import

**Decision:** the import inserts one row at a time and collects per-row errors.
**Why:** one bad row never aborts the whole batch; the user gets a precise failure list.
**Trade-off:** slower than a bulk insert — acceptable for master-data volumes (hundreds of rows).

### ADR-7 — Append-only audit, best-effort

**Decision:** every mutation writes a `coa_audit_log` row; audit failures never block the mutation
(wrapped in try/catch); read endpoints degrade to `{data:[]}` if the table is absent.
**Why:** auditing must not break core CRUD; the workspace still renders on a partially-migrated DB.

### ADR-8 — Two-pass seed (insert, then wire parents by code)

**Decision:** the dataseed inserts all rows with `parent_account_id` null, then wires parents by
matching child→parent `account_code`.
**Why:** UUIDs are environment-specific; matching by code makes the seed portable and order-independent.

---

## 5. PSAK Attribute Backfill

v3 populated the four attribute groups that were blank after the original seed. Applied to all
170 rows; the resulting values are baked into **Appendix A**. Exact statements used:

```sql
-- (a) cash_flow_category — PSAK 2
UPDATE coa SET cash_flow_category = CASE
  WHEN account_code = '1' THEN 'not_applicable'
  WHEN account_code = '1-10001' OR account_code LIKE '1-10001-%' THEN 'not_applicable'  -- Kas
  WHEN account_code = '1-10002' OR account_code LIKE '1-10002-%' THEN 'not_applicable'  -- Bank
  WHEN account_code = '1-10003' OR account_code LIKE '1-10003-%' THEN 'not_applicable'  -- Deposito
  WHEN account_code IN ('1-10100-9','1-20001-9','1-20002-9') THEN 'non_cash'            -- contra
  WHEN account_code = '1-20003-2' THEN 'operating'                                       -- deferred tax
  WHEN account_code = '1-10000' OR account_code LIKE '1-101%' OR account_code LIKE '1-102%'
    OR account_code LIKE '1-103%' OR account_code LIKE '1-104%' THEN 'operating'         -- current assets
  WHEN account_code = '1-20000' OR account_code LIKE '1-2000%' OR account_code LIKE '1-2001%'
    OR account_code LIKE '1-2002%' OR account_code LIKE '1-2003%' THEN 'investing'       -- non-current
  WHEN account_code = '2' THEN 'not_applicable'
  WHEN account_code = '2-10000' OR account_code LIKE '2-101%' OR account_code LIKE '2-102%'
    OR account_code LIKE '2-103%' OR account_code LIKE '2-104%' OR account_code LIKE '2-105%'
    THEN 'operating'                                                                     -- current liab
  WHEN account_code = '2-20000' OR account_code LIKE '2-201%' OR account_code LIKE '2-202%'
    THEN 'financing'                                                                     -- LT liab
  WHEN account_code = '3' OR account_code = '3-10000' OR account_code LIKE '3-10001%'
    THEN 'financing'                                                                     -- modal
  WHEN account_code = '3-20000' OR account_code LIKE '3-2000%' THEN 'not_applicable'      -- saldo laba
  WHEN account_code = '6-60400' OR account_code LIKE '6-60400-%' THEN 'non_cash'          -- deprec/amort
  WHEN account_code LIKE '4%' OR account_code LIKE '5%' OR account_code LIKE '6%'
    OR account_code LIKE '7%' OR account_code LIKE '8%' THEN 'operating'                  -- all P&L
  ELSE cash_flow_category END
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- (b) enum_cf_section — PSAK 2 section (OPERATING/INVESTING/FINANCING/EXCLUDED)
--     Cash, headers, retained earnings, accumulated depreciation → EXCLUDED;
--     non-current assets → INVESTING; LT liabilities & equity-modal → FINANCING;
--     working-capital BS + all P&L → OPERATING.

-- (c) direct_indirect_cost
UPDATE coa SET direct_indirect_cost = 'DIRECT'   WHERE account_code LIKE '5%';  -- COGS
UPDATE coa SET direct_indirect_cost = 'INDIRECT' WHERE account_code LIKE '6%';  -- OpEx

-- (d) enum_cost_category — PERSONNEL/OPERATIONAL/MARKETING/TECHNOLOGY/OVERHEAD for expense GLs;
--     enum_cf_line — PSAK 2 line labels (e.g. 'Perubahan piutang usaha', 'Penyusutan aset tetap',
--     'Setoran modal'); cash/header/equity rows left null.
```

> Full statement (b)/(d) text is reproduced verbatim in the project history; the **net result**
> is what Appendix A contains, so re-running Appendix A alone reproduces the classified state.

### Intentional nulls (correct, not gaps)

- `enum_cf_line` is **null** for cash/bank, aggregate headers, and retained-earnings rows
  (they are the cash balance itself or not a CF line).
- `direct_indirect_cost` & `enum_cost_category` are **null** for non-expense accounts and for
  expense **header** rows (category/type) — only postable expense accounts are classified.

---

## 6. Anti-Patterns & Pitfalls

| ❌ Anti-pattern | ✅ Do instead |
|---|---|
| Importing `xlsx` at module top-level in a client/server component | `const XLSX = await import('xlsx')` inside the handler (avoids SSR bundling / "window is not defined") |
| Exporting from the **FE tree model** (`CoaNode`) | export from raw `DbCoaRow[]` — the tree model drops report columns (`enum_laporan_keuangan`, etc.) |
| Adding a new importable column in 3 places | add it once to `COA_COLUMNS`; the API whitelist, template, and parser all derive from it |
| Seeding `parent_account_id` with hard-coded UUIDs | two-pass: insert, then wire parents by `account_code` (ADR-8) |
| Relying on `account_code` substring math for parent (`'6-60100-10'` vs `'6-60100-2'`) | store/lookup the explicit parent code; segment widths are not fixed across the tree |
| Trusting stale `apps/web/src/types/database.ts` | it lags real migrations; query `information_schema.columns` for the authoritative list |
| Letting the import header `account_code *` break mapping | `buildHeaderMap` strips `*` and trailing `_` — keep that normalisation when editing |
| Auto-inferring cash-flow / cost attributes | don't — they are account-specific (PSAK backfill or explicit file values only) |
| Blocking a CRUD mutation when the audit insert fails | audit is best-effort (try/catch); never couple it to the mutation |
| Re-running the seed without clearing | Appendix A `DELETE`s the tenant's rows first (CASCADE handles journal refs) — review before running on shared data |

---

## 7. Rollback

The schema migrations are additive; a full rollback is rarely needed. To reset **data** only:

```sql
-- Wipe + reseed COA for the tenant (DESTRUCTIVE — clears journal refs via CASCADE)
BEGIN;
DELETE FROM public.coa WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
-- then run Appendix A
COMMIT;
```

To drop the v2/v3 companion tables (only if decommissioning the module):

```sql
DROP TABLE IF EXISTS public.coa_sub_gl_value;
DROP TABLE IF EXISTS public.coa_pending_approval;
DROP TABLE IF EXISTS public.coa_audit_log;
-- coa attribute columns can remain; they are nullable/defaulted and harmless.
```

---

## 8. Verification Queries

```sql
-- Row count + parent wiring
SELECT count(*) total,
       count(*) FILTER (WHERE parent_account_id IS NOT NULL) wired
FROM public.coa WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL;
-- expect: total 170, wired 162

-- No blank PSAK classification where it matters
SELECT count(*) FILTER (WHERE cash_flow_category IS NULL) bad_cfc,
       count(*) FILTER (WHERE enum_cf_section   IS NULL) bad_cfs
FROM public.coa WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL;
-- expect: 0, 0

-- Distinct classifications
SELECT enum_cf_section, count(*) FROM public.coa
WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL
GROUP BY 1 ORDER BY 2 DESC;
```

---

## Appendix A — Full COA Dataseed (170 rows)

Re-runnable, environment-portable seed generated from the live Supabase project. Inserts all
170 accounts with every PSAK/reporting attribute, then wires `parent_account_id` by code
(ADR-8). Also saved standalone at **`supabase/seed/coa_full_seed.sql`**.

```sql
-- =====================================================
-- Seed: WIT.ID Chart of Accounts — FULL 5-Layer + PSAK Attributes
-- Generated from the live Supabase `coa` table (tenant 00000000-0000-0000-0000-000000000001).
-- 170 accounts · all reporting/PSAK attributes populated (PSAK 1 statement mapping + PSAK 2 cash flow).
--
-- Two-pass, environment-portable load (ADR-8):
--   Pass 1 — INSERT all rows (parent_account_id resolved in pass 2).
--   Pass 2 — wire parent_account_id by matching child -> parent account_code.
--
-- Idempotent: clears the tenant's coa rows first (CASCADE clears dependent journal refs).
-- Review before running on shared data — this DELETEs all coa rows for the tenant.
-- =====================================================

BEGIN;

DELETE FROM public.coa WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- == Pass 1: insert all 170 accounts =========================================
INSERT INTO public.coa (
  tenant_id, account_code, coa_full_code, segment_code, account_name, name_en,
  account_type, coa_layer, level, normal_balance, sort_order,
  enum_laporan_keuangan, enum_laporan_keuangan_category,
  cash_flow_category, enum_cf_section, enum_cf_line,
  direct_indirect_cost, enum_cost_category, tax_code,
  contra_account, is_working_capital, is_non_cash_item, is_budgeted,
  is_tax_deductible, is_restricted, is_trial_balance, is_taxation_report,
  required_sub_gl, is_washed_out_account, required_child, is_active
)
SELECT '00000000-0000-0000-0000-000000000001', t.* FROM (VALUES
  ('1', '1', '1', 'AKTIVA', NULL, 'asset', 'category', 1, 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10000', '1-10000', '10000', 'Aktiva Lancar', NULL, 'asset', 'type', 2, 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10001', '1-10001', '10001', 'Kas', NULL, 'asset', 'sub_account', 3, 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, true, false, false, true, false, true, false, false, false, false, true),
  ('1-10001-1', '1-10001-1', '1', 'Kas Kecil IDR', NULL, 'asset', 'general_ledger', 4, 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10002', '1-10002', '10002', 'Bank', NULL, 'asset', 'sub_account', 3, 'debit', 2, 'BALANCE_SHEET', 'ASSET', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10002-1', '1-10002-1', '1', 'BCA Operational 008-044-9739 (Irfan Arsandi)', NULL, 'asset', 'general_ledger', 4, 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10002-2', '1-10002-2', '2', 'BCA Development 008-323-4170 (Irfan Arsandi)', NULL, 'asset', 'general_ledger', 4, 'debit', 2, 'BALANCE_SHEET', 'ASSET', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10002-3', '1-10002-3', '3', 'Mandiri 132-00-2268-3131 (PT. WIT)', NULL, 'asset', 'general_ledger', 4, 'debit', 3, 'BALANCE_SHEET', 'ASSET', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10002-4', '1-10002-4', '4', 'Mandiri 1022 (PT. WIT RSHS)', NULL, 'asset', 'general_ledger', 4, 'debit', 4, 'BALANCE_SHEET', 'ASSET', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10002-5', '1-10002-5', '5', 'Mandiri 5591 (PT. WIT)', NULL, 'asset', 'general_ledger', 4, 'debit', 5, 'BALANCE_SHEET', 'ASSET', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10002-6', '1-10002-6', '6', 'BRI (CV. Warmup)', NULL, 'asset', 'general_ledger', 4, 'debit', 6, 'BALANCE_SHEET', 'ASSET', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10003', '1-10003', '10003', 'Deposito & Investasi JK Pendek', NULL, 'asset', 'sub_account', 3, 'debit', 3, 'BALANCE_SHEET', 'ASSET', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10003-1', '1-10003-1', '1', 'Deposito JK Pendek', NULL, 'asset', 'general_ledger', 4, 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10100', '1-10100', '10100', 'Piutang Usaha', NULL, 'asset', 'sub_account', 3, 'debit', 4, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', 'Perubahan piutang usaha', NULL, NULL, NULL, false, true, false, false, true, false, true, false, false, false, false, true),
  ('1-10100-1', '1-10100-1', '1', 'Piutang Usaha - Lokal', NULL, 'asset', 'general_ledger', 4, 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', 'Perubahan piutang usaha', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10100-2', '1-10100-2', '2', 'Piutang Usaha - Luar Negeri', NULL, 'asset', 'general_ledger', 4, 'debit', 2, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', 'Perubahan piutang usaha', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10100-9', '1-10100-9', '9', 'Penyisihan Piutang Tak Tertagih', NULL, 'asset', 'general_ledger', 4, 'credit', 9, 'BALANCE_SHEET', 'ASSET', 'non_cash', 'OPERATING', 'Penyisihan kerugian piutang', NULL, NULL, NULL, true, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10200', '1-10200', '10200', 'Piutang Lain-lain', NULL, 'asset', 'sub_account', 3, 'debit', 5, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', 'Perubahan piutang lain-lain', NULL, NULL, NULL, false, true, false, false, true, false, true, false, false, false, false, true),
  ('1-10200-1', '1-10200-1', '1', 'Piutang Karyawan', NULL, 'asset', 'general_ledger', 4, 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', 'Perubahan piutang lain-lain', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10200-9', '1-10200-9', '9', 'Piutang Lain-lain', NULL, 'asset', 'general_ledger', 4, 'debit', 9, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', 'Perubahan piutang lain-lain', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10300', '1-10300', '10300', 'Uang Muka & Biaya Dibayar Dimuka', NULL, 'asset', 'sub_account', 3, 'debit', 6, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', 'Perubahan uang muka dan biaya dibayar dimuka', NULL, NULL, NULL, false, true, false, false, true, false, true, false, false, false, false, true),
  ('1-10300-1', '1-10300-1', '1', 'Biaya Dibayar Dimuka', NULL, 'asset', 'general_ledger', 4, 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', 'Perubahan biaya dibayar dimuka', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10300-2', '1-10300-2', '2', 'Uang Muka Vendor', NULL, 'asset', 'general_ledger', 4, 'debit', 2, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', 'Perubahan uang muka', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10400', '1-10400', '10400', 'Pajak Dibayar Dimuka', NULL, 'asset', 'sub_account', 3, 'debit', 7, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', 'Perubahan pajak dibayar dimuka', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10400-1', '1-10400-1', '1', 'PPN Masukan', NULL, 'asset', 'general_ledger', 4, 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', 'Perubahan pajak dibayar dimuka', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10400-2', '1-10400-2', '2', 'PPh 25 Dibayar Dimuka', NULL, 'asset', 'general_ledger', 4, 'debit', 2, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', 'Perubahan pajak dibayar dimuka', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-10400-3', '1-10400-3', '3', 'PPh 23 Dibayar Dimuka', NULL, 'asset', 'general_ledger', 4, 'debit', 3, 'BALANCE_SHEET', 'ASSET', 'operating', NULL, NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-20000', '1-20000', '20000', 'Aktiva Tidak Lancar', NULL, 'asset', 'type', 2, 'debit', 2, 'BALANCE_SHEET', 'ASSET', 'investing', 'INVESTING', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-20001', '1-20001', '20001', 'Aset Tetap Berwujud', NULL, 'asset', 'sub_account', 3, 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'investing', 'INVESTING', 'Perubahan aset tetap berwujud', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-20001-1', '1-20001-1', '1', 'Peralatan & Komputer', NULL, 'asset', 'general_ledger', 4, 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'investing', 'INVESTING', 'Pembelian/(penjualan) aset tetap', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-20001-2', '1-20001-2', '2', 'Kendaraan', NULL, 'asset', 'general_ledger', 4, 'debit', 2, 'BALANCE_SHEET', 'ASSET', 'investing', 'INVESTING', 'Pembelian/(penjualan) aset tetap', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-20001-3', '1-20001-3', '3', 'Inventaris Kantor', NULL, 'asset', 'general_ledger', 4, 'debit', 3, 'BALANCE_SHEET', 'ASSET', 'investing', 'INVESTING', 'Pembelian/(penjualan) aset tetap', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-20001-9', '1-20001-9', '9', 'Akumulasi Penyusutan Aset Tetap', NULL, 'asset', 'general_ledger', 4, 'credit', 9, 'BALANCE_SHEET', 'ASSET', 'non_cash', 'EXCLUDED', 'Penyusutan aset tetap', NULL, NULL, NULL, true, false, false, false, true, false, true, false, false, false, false, true),
  ('1-20002', '1-20002', '20002', 'Aset Tak Berwujud', NULL, 'asset', 'sub_account', 3, 'debit', 2, 'BALANCE_SHEET', 'ASSET', 'investing', 'INVESTING', 'Perubahan aset tak berwujud', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-20002-1', '1-20002-1', '1', 'Software & Lisensi', NULL, 'asset', 'general_ledger', 4, 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'investing', 'INVESTING', 'Pembelian/(penjualan) perangkat lunak & lisensi', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-20002-9', '1-20002-9', '9', 'Akumulasi Amortisasi', NULL, 'asset', 'general_ledger', 4, 'credit', 9, 'BALANCE_SHEET', 'ASSET', 'non_cash', 'EXCLUDED', 'Amortisasi aset tak berwujud', NULL, NULL, NULL, true, false, false, false, true, false, true, false, false, false, false, true),
  ('1-20003', '1-20003', '20003', 'Aset Lain-lain', NULL, 'asset', 'sub_account', 3, 'debit', 3, 'BALANCE_SHEET', 'ASSET', 'investing', 'INVESTING', 'Perubahan aset lain-lain', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-20003-1', '1-20003-1', '1', 'Deposito Jaminan', NULL, 'asset', 'general_ledger', 4, 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'investing', 'INVESTING', 'Perubahan deposito jaminan', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('1-20003-2', '1-20003-2', '2', 'Aset Pajak Tangguhan', NULL, 'asset', 'general_ledger', 4, 'debit', 2, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', 'Perubahan aset pajak tangguhan', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2', '2', '2', 'KEWAJIBAN', NULL, 'liability', 'category', 1, 'credit', 2, 'BALANCE_SHEET', 'LIABILITY', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-10000', '2-10000', '10000', 'Kewajiban Lancar', NULL, 'liability', 'type', 2, 'credit', 1, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-10100', '2-10100', '10100', 'Hutang Usaha', NULL, 'liability', 'sub_account', 3, 'credit', 1, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', 'Perubahan hutang usaha', NULL, NULL, NULL, false, true, false, false, true, false, true, false, false, false, false, true),
  ('2-10100-1', '2-10100-1', '1', 'Hutang Vendor', NULL, 'liability', 'general_ledger', 4, 'credit', 1, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', 'Perubahan hutang usaha', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-10100-2', '2-10100-2', '2', 'Hutang Partner', NULL, 'liability', 'general_ledger', 4, 'credit', 2, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', 'Perubahan hutang usaha', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-10200', '2-10200', '10200', 'Hutang Pajak', NULL, 'liability', 'sub_account', 3, 'credit', 2, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', 'Perubahan hutang pajak', NULL, NULL, NULL, false, true, false, false, true, false, true, false, false, false, false, true),
  ('2-10200-1', '2-10200-1', '1', 'Hutang PPh 21', NULL, 'liability', 'general_ledger', 4, 'credit', 1, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', 'Perubahan hutang pajak', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-10200-2', '2-10200-2', '2', 'Hutang PPh 23', NULL, 'liability', 'general_ledger', 4, 'credit', 2, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', 'Perubahan hutang pajak', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-10200-3', '2-10200-3', '3', 'Hutang PPh 4(2)', NULL, 'liability', 'general_ledger', 4, 'credit', 3, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', 'Perubahan hutang pajak', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-10200-4', '2-10200-4', '4', 'Hutang PPN', NULL, 'liability', 'general_ledger', 4, 'credit', 4, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', 'Perubahan hutang pajak', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-10200-5', '2-10200-5', '5', 'Hutang PPh 25', NULL, 'liability', 'general_ledger', 4, 'credit', 5, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', 'Perubahan hutang pajak', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-10300', '2-10300', '10300', 'Hutang Gaji & Tunjangan', NULL, 'liability', 'sub_account', 3, 'credit', 3, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', 'Perubahan hutang gaji dan tunjangan', NULL, NULL, NULL, false, true, false, false, true, false, true, false, false, false, false, true),
  ('2-10300-1', '2-10300-1', '1', 'Hutang Gaji', NULL, 'liability', 'general_ledger', 4, 'credit', 1, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', 'Perubahan hutang gaji dan tunjangan', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-10300-2', '2-10300-2', '2', 'Hutang THR Akrual', NULL, 'liability', 'general_ledger', 4, 'credit', 2, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', 'Perubahan hutang gaji dan tunjangan', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-10400', '2-10400', '10400', 'Pendapatan Diterima Dimuka', NULL, 'liability', 'sub_account', 3, 'credit', 4, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', 'Perubahan pendapatan diterima dimuka', NULL, NULL, NULL, false, true, false, false, true, false, true, false, false, false, false, true),
  ('2-10400-1', '2-10400-1', '1', 'DP Project Belum Diakui', NULL, 'liability', 'general_ledger', 4, 'credit', 1, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', 'Perubahan pendapatan diterima dimuka', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-10500', '2-10500', '10500', 'Biaya Masih Harus Dibayar', NULL, 'liability', 'sub_account', 3, 'credit', 5, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', 'Perubahan biaya masih harus dibayar', NULL, NULL, NULL, false, true, false, false, true, false, true, false, false, false, false, true),
  ('2-10500-1', '2-10500-1', '1', 'Biaya Masih Harus Dibayar', NULL, 'liability', 'general_ledger', 4, 'credit', 1, 'BALANCE_SHEET', 'LIABILITY', 'operating', 'OPERATING', 'Perubahan biaya masih harus dibayar', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-20000', '2-20000', '20000', 'Kewajiban Jangka Panjang', NULL, 'liability', 'type', 2, 'credit', 2, 'BALANCE_SHEET', 'LIABILITY', 'financing', 'FINANCING', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-20100', '2-20100', '20100', 'Hutang Bank JK Panjang', NULL, 'liability', 'sub_account', 3, 'credit', 1, 'BALANCE_SHEET', 'LIABILITY', 'financing', 'FINANCING', 'Penerimaan/(pelunasan) hutang bank jangka panjang', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-20100-1', '2-20100-1', '1', 'Hutang Bank BCA', NULL, 'liability', 'general_ledger', 4, 'credit', 1, 'BALANCE_SHEET', 'LIABILITY', 'financing', 'FINANCING', 'Penerimaan/(pelunasan) hutang bank jangka panjang', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-20200', '2-20200', '20200', 'Hutang Pemegang Saham', NULL, 'liability', 'sub_account', 3, 'credit', 2, 'BALANCE_SHEET', 'LIABILITY', 'financing', 'FINANCING', 'Penerimaan/(pelunasan) hutang pemegang saham', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('2-20200-1', '2-20200-1', '1', 'Hutang Pemegang Saham', NULL, 'liability', 'general_ledger', 4, 'credit', 1, 'BALANCE_SHEET', 'LIABILITY', 'financing', 'FINANCING', 'Penerimaan/(pelunasan) hutang pemegang saham', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('3', '3', '3', 'EKUITAS', NULL, 'equity', 'category', 1, 'credit', 3, 'BALANCE_SHEET', 'EQUITY', 'financing', 'FINANCING', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('3-10000', '3-10000', '10000', 'Modal', NULL, 'equity', 'type', 2, 'credit', 1, 'BALANCE_SHEET', 'EQUITY', 'financing', 'FINANCING', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('3-10001', '3-10001', '10001', 'Modal Disetor', NULL, 'equity', 'sub_account', 3, 'credit', 1, 'BALANCE_SHEET', 'EQUITY', 'financing', 'FINANCING', 'Setoran modal', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('3-10001-1', '3-10001-1', '1', 'Modal Saham PT. WIT', NULL, 'equity', 'general_ledger', 4, 'credit', 1, 'BALANCE_SHEET', 'EQUITY', 'financing', 'FINANCING', 'Setoran modal', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('3-20000', '3-20000', '20000', 'Saldo Laba', NULL, 'equity', 'type', 2, 'credit', 2, 'BALANCE_SHEET', 'EQUITY', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('3-20001', '3-20001', '20001', 'Saldo Laba Ditahan', NULL, 'equity', 'sub_account', 3, 'credit', 1, 'BALANCE_SHEET', 'EQUITY', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('3-20001-1', '3-20001-1', '1', 'Akumulasi Laba Ditahan', NULL, 'equity', 'general_ledger', 4, 'credit', 1, 'BALANCE_SHEET', 'EQUITY', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('3-20002', '3-20002', '20002', 'Laba Tahun Berjalan', NULL, 'equity', 'sub_account', 3, 'credit', 2, 'BALANCE_SHEET', 'EQUITY', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('3-20002-1', '3-20002-1', '1', 'Laba Bersih Periode Berjalan', NULL, 'equity', 'general_ledger', 4, 'credit', 1, 'BALANCE_SHEET', 'EQUITY', 'not_applicable', 'EXCLUDED', NULL, NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('4', '4', '4', 'PENDAPATAN', NULL, 'revenue', 'category', 1, 'credit', 10, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40000', '4-40000', '40000', 'Project Based Revenue', NULL, 'revenue', 'type', 2, 'credit', 1, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40000-1', '4-40000-1', '1', 'Project Based - Project Revenue', NULL, 'revenue', 'sub_account', 3, 'credit', 1, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40000-2', '4-40000-2', '2', 'Project Based - MaaS Revenue', NULL, 'revenue', 'sub_account', 3, 'credit', 2, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40000-3', '4-40000-3', '3', 'Project Based - WMS Revenue', NULL, 'revenue', 'sub_account', 3, 'credit', 3, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40000-4', '4-40000-4', '4', 'Project Based - Procurement Revenue', NULL, 'revenue', 'sub_account', 3, 'credit', 4, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40000-5', '4-40000-5', '5', 'Project Based - Website Revenue', NULL, 'revenue', 'sub_account', 3, 'credit', 5, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40000-6', '4-40000-6', '6', 'Project Based - Hosting Revenue', NULL, 'revenue', 'sub_account', 3, 'credit', 6, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40000-7', '4-40000-7', '7', 'Project Based - Domain Revenue', NULL, 'revenue', 'sub_account', 3, 'credit', 7, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40000-8', '4-40000-8', '8', 'Project Based - Consultant Revenue', NULL, 'revenue', 'sub_account', 3, 'credit', 8, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40000-9', '4-40000-9', '9', 'Project Based - Add on / Change Request', NULL, 'revenue', 'sub_account', 3, 'credit', 9, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40000-99', '4-40000-99', '99', 'Project Based - Lain Lain', NULL, 'revenue', 'sub_account', 3, 'credit', 99, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40100', '4-40100', '40100', 'Maintenance / Recurring Revenue', NULL, 'revenue', 'type', 2, 'credit', 2, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40100-1', '4-40100-1', '1', 'MTN/R - Project Revenue', NULL, 'revenue', 'sub_account', 3, 'credit', 1, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40100-2', '4-40100-2', '2', 'MTN/R - WMS Revenue', NULL, 'revenue', 'sub_account', 3, 'credit', 2, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40100-3', '4-40100-3', '3', 'MTN/R - Spa Management System Revenue', NULL, 'revenue', 'sub_account', 3, 'credit', 3, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40100-4', '4-40100-4', '4', 'MTN/R - Leisure & Park Mgmt System Revenue', NULL, 'revenue', 'sub_account', 3, 'credit', 4, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40100-5', '4-40100-5', '5', 'MTN/R - Website Revenue', NULL, 'revenue', 'sub_account', 3, 'credit', 5, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40100-6', '4-40100-6', '6', 'MTN/R - Manage Service', NULL, 'revenue', 'sub_account', 3, 'credit', 6, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('4-40700', '4-40700', '40700', 'Sales Discount', NULL, 'revenue', 'type', 2, 'credit', 3, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', 'Penerimaan dari pelanggan', NULL, NULL, NULL, true, false, false, true, true, false, true, false, false, false, false, true),
  ('5', '5', '5', 'BEBAN POKOK PENDAPATAN', NULL, 'expense', 'category', 1, 'debit', 20, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000', '5-50000', '50000', 'Beban Pokok Pendapatan', NULL, 'expense', 'type', 2, 'debit', 1, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-1', '5-50000-1', '1', 'Fee / Bonus', NULL, 'expense', 'sub_account', 3, 'debit', 1, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'PERSONNEL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-1-3', '5-50000-1-3', '3', 'Fee / Bonus - Project Member', NULL, 'expense', 'general_ledger', 4, 'debit', 3, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'PERSONNEL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-2', '5-50000-2', '2', '3rd Party - Vendor / Partner', NULL, 'expense', 'sub_account', 3, 'debit', 2, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'OPERATIONAL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-2-10', '5-50000-2-10', '10', 'Partner - Artisun', NULL, 'expense', 'general_ledger', 4, 'debit', 10, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'OPERATIONAL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-2-11', '5-50000-2-11', '11', 'Partner - WHITE', NULL, 'expense', 'general_ledger', 4, 'debit', 11, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'OPERATIONAL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-2-2', '5-50000-2-2', '2', 'Partner - Plabs', NULL, 'expense', 'general_ledger', 4, 'debit', 2, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'OPERATIONAL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-2-4', '5-50000-2-4', '4', 'Partner - Reza Pahlevi', NULL, 'expense', 'general_ledger', 4, 'debit', 4, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'OPERATIONAL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-2-6', '5-50000-2-6', '6', 'Partner - PT. MAST', NULL, 'expense', 'general_ledger', 4, 'debit', 6, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'OPERATIONAL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-2-8', '5-50000-2-8', '8', 'Partner - PT. Jaya Integrasi Nusantara (JIN)', NULL, 'expense', 'general_ledger', 4, 'debit', 8, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'OPERATIONAL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-3', '5-50000-3', '3', '3rd Party - Server / Hosting', NULL, 'expense', 'sub_account', 3, 'debit', 3, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'TECHNOLOGY', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-3-1', '5-50000-3-1', '1', 'Server / Hosting - Niagahoster', NULL, 'expense', 'general_ledger', 4, 'debit', 1, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'TECHNOLOGY', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-3-10', '5-50000-3-10', '10', 'Server / Hosting - Google Cloud Platform (GCP)', NULL, 'expense', 'general_ledger', 4, 'debit', 10, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'TECHNOLOGY', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-3-12', '5-50000-3-12', '12', 'Server / Hosting - Jakarta Web Hosting', NULL, 'expense', 'general_ledger', 4, 'debit', 12, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'TECHNOLOGY', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-3-13', '5-50000-3-13', '13', 'Server / Hosting - Microsoft Azure', NULL, 'expense', 'general_ledger', 4, 'debit', 13, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'TECHNOLOGY', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-3-2', '5-50000-3-2', '2', 'Server / Hosting - Idcloudhost', NULL, 'expense', 'general_ledger', 4, 'debit', 2, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'TECHNOLOGY', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-3-4', '5-50000-3-4', '4', 'Server / Hosting - Dracoola', NULL, 'expense', 'general_ledger', 4, 'debit', 4, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'TECHNOLOGY', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-4', '5-50000-4', '4', 'Other COGS', NULL, 'expense', 'sub_account', 3, 'debit', 4, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'OPERATIONAL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-4-1', '5-50000-4-1', '1', '3rd Party - Biaya Domain', NULL, 'expense', 'general_ledger', 4, 'debit', 1, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'TECHNOLOGY', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-5', '5-50000-5', '5', 'Other COGS - Miscellaneous', NULL, 'expense', 'sub_account', 3, 'debit', 5, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'OPERATIONAL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-5-1', '5-50000-5-1', '1', 'Other COGS - Procurement', NULL, 'expense', 'general_ledger', 4, 'debit', 1, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'OPERATIONAL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-5-3', '5-50000-5-3', '3', 'Other COGS - Plugin / Add Ons', NULL, 'expense', 'general_ledger', 4, 'debit', 3, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'TECHNOLOGY', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-5-4', '5-50000-5-4', '4', 'Other COGS - Lain Lain', NULL, 'expense', 'general_ledger', 4, 'debit', 4, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'OPERATIONAL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('5-50000-5-5', '5-50000-5-5', '5', 'Other COGS - Google Workspace / GSuite', NULL, 'expense', 'general_ledger', 4, 'debit', 5, 'INCOME_STATEMENT', 'COGS', 'operating', 'OPERATING', 'Pembayaran kepada pemasok dan kontraktor', 'DIRECT', 'TECHNOLOGY', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6', '6', '6', 'BEBAN OPERASIONAL', NULL, 'expense', 'category', 1, 'debit', 30, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran beban operasional', 'INDIRECT', NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100', '6-60100', '60100', 'General & Administrative Expenses', NULL, 'expense', 'type', 2, 'debit', 1, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-1', '6-60100-1', '1', 'Gaji Pokok (Payroll/Salary)', NULL, 'expense', 'sub_account', 3, 'debit', 1, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'PERSONNEL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-10', '6-60100-10', '10', 'BPJS', NULL, 'expense', 'sub_account', 3, 'debit', 10, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'PERSONNEL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-11', '6-60100-11', '11', 'Electricity', NULL, 'expense', 'sub_account', 3, 'debit', 11, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'OPERATIONAL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-12', '6-60100-12', '12', 'Phone', NULL, 'expense', 'sub_account', 3, 'debit', 12, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'OPERATIONAL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-13', '6-60100-13', '13', 'Biznet Sukakarya', NULL, 'expense', 'sub_account', 3, 'debit', 13, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'OPERATIONAL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-15', '6-60100-15', '15', 'Cleanliness / Kebersihan', NULL, 'expense', 'sub_account', 3, 'debit', 15, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'OVERHEAD', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-16', '6-60100-16', '16', 'Parking', NULL, 'expense', 'sub_account', 3, 'debit', 16, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'OVERHEAD', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-17', '6-60100-17', '17', 'Cicilan Rent Office / Kontrakan', NULL, 'expense', 'sub_account', 3, 'debit', 17, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'OPERATIONAL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-18', '6-60100-18', '18', 'Marketing Fee External - Nix', NULL, 'expense', 'sub_account', 3, 'debit', 18, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'MARKETING', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-19', '6-60100-19', '19', 'Olahraga', NULL, 'expense', 'sub_account', 3, 'debit', 19, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'OVERHEAD', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-2', '6-60100-2', '2', 'Tunjangan Hari Raya (THR)', NULL, 'expense', 'sub_account', 3, 'debit', 2, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'PERSONNEL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-20', '6-60100-20', '20', 'Surat Perintah Perjalanan Dinas', NULL, 'expense', 'sub_account', 3, 'debit', 20, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'OPERATIONAL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-21', '6-60100-21', '21', 'Biaya Entertainment', NULL, 'expense', 'sub_account', 3, 'debit', 21, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'OVERHEAD', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-23', '6-60100-23', '23', 'Biaya Inventaris Kantor', NULL, 'expense', 'sub_account', 3, 'debit', 23, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'OVERHEAD', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-4', '6-60100-4', '4', 'Marketing Expenses', NULL, 'expense', 'sub_account', 3, 'debit', 4, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'MARKETING', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-6', '6-60100-6', '6', 'Asisten Rumah Tangga (ART)', NULL, 'expense', 'sub_account', 3, 'debit', 6, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'OVERHEAD', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-7', '6-60100-7', '7', 'Security', NULL, 'expense', 'sub_account', 3, 'debit', 7, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'OVERHEAD', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-8', '6-60100-8', '8', 'Infaq', NULL, 'expense', 'sub_account', 3, 'debit', 8, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'OVERHEAD', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-9', '6-60100-9', '9', 'Insurance', NULL, 'expense', 'sub_account', 3, 'debit', 9, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'PERSONNEL', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60100-99', '6-60100-99', '99', 'Biaya Lain-lain', NULL, 'expense', 'sub_account', 3, 'debit', 99, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran gaji dan beban umum administrasi', 'INDIRECT', 'OVERHEAD', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60200', '6-60200', '60200', '3rd Party Expenses', NULL, 'expense', 'type', 2, 'debit', 2, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran pihak ketiga', 'INDIRECT', NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60200-1', '6-60200-1', '1', '3rd Party - BBF Agensi Pajak', NULL, 'expense', 'sub_account', 3, 'debit', 1, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran pihak ketiga', 'INDIRECT', 'OVERHEAD', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60200-2', '6-60200-2', '2', '3rd Party - Postman', NULL, 'expense', 'sub_account', 3, 'debit', 2, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran pihak ketiga', 'INDIRECT', 'TECHNOLOGY', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60200-3', '6-60200-3', '3', '3rd Party - Figma', NULL, 'expense', 'sub_account', 3, 'debit', 3, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran pihak ketiga', 'INDIRECT', 'TECHNOLOGY', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60200-4', '6-60200-4', '4', '3rd Party - Google Workspace (Internal WIT.ID)', NULL, 'expense', 'sub_account', 3, 'debit', 4, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran pihak ketiga', 'INDIRECT', 'TECHNOLOGY', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60200-99', '6-60200-99', '99', '3rd Party Expenses - Lain Lain', NULL, 'expense', 'sub_account', 3, 'debit', 99, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran pihak ketiga', 'INDIRECT', 'TECHNOLOGY', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60221', '6-60221', '60221', 'Beban Pajak', NULL, 'expense', 'type', 2, 'debit', 5, 'INCOME_STATEMENT', 'TAX_EXPENSE', 'operating', 'OPERATING', 'Pembayaran pajak penghasilan dan PPN', 'INDIRECT', NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('6-60222', '6-60222', '60222', 'Beban Pajak - PPh 21', NULL, 'expense', 'sub_account', 3, 'debit', 1, 'INCOME_STATEMENT', 'TAX_EXPENSE', 'operating', 'OPERATING', 'Pembayaran pajak penghasilan dan PPN', 'INDIRECT', 'PERSONNEL', NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('6-60223', '6-60223', '60223', 'Beban Pajak - PPh 23', NULL, 'expense', 'sub_account', 3, 'debit', 2, 'INCOME_STATEMENT', 'TAX_EXPENSE', 'operating', 'OPERATING', 'Pembayaran pajak penghasilan dan PPN', 'INDIRECT', 'OVERHEAD', NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('6-60224', '6-60224', '60224', 'Beban Pajak - PPh 4(2)', NULL, 'expense', 'sub_account', 3, 'debit', 3, 'INCOME_STATEMENT', 'TAX_EXPENSE', 'operating', 'OPERATING', 'Pembayaran pajak penghasilan dan PPN', 'INDIRECT', 'OVERHEAD', NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('6-60225', '6-60225', '60225', 'Beban Pajak - PPN', NULL, 'expense', 'sub_account', 3, 'debit', 4, 'INCOME_STATEMENT', 'TAX_EXPENSE', 'operating', 'OPERATING', 'Pembayaran pajak penghasilan dan PPN', 'INDIRECT', 'OVERHEAD', NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('6-60226', '6-60226', '60226', 'Beban Pajak - PPh 25', NULL, 'expense', 'sub_account', 3, 'debit', 5, 'INCOME_STATEMENT', 'TAX_EXPENSE', 'operating', 'OPERATING', 'Pembayaran pajak penghasilan dan PPN', 'INDIRECT', 'OVERHEAD', NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('6-60300', '6-60300', '60300', 'Fee / Bonus', NULL, 'expense', 'type', 2, 'debit', 3, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran fee dan bonus', 'INDIRECT', NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60300-1', '6-60300-1', '1', 'Fee / Bonus - Marketing Fee External', NULL, 'expense', 'sub_account', 3, 'debit', 1, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran fee dan bonus', 'INDIRECT', 'MARKETING', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60300-2', '6-60300-2', '2', 'Fee / Bonus - Marketing Internal', NULL, 'expense', 'sub_account', 3, 'debit', 2, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran fee dan bonus', 'INDIRECT', 'MARKETING', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60300-5', '6-60300-5', '5', 'Fee / Bonus - Management Fee', NULL, 'expense', 'sub_account', 3, 'debit', 5, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', 'Pembayaran fee dan bonus', 'INDIRECT', 'OVERHEAD', NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60400', '6-60400', '60400', 'Depresiasi & Amortisasi', NULL, 'expense', 'type', 2, 'debit', 4, 'INCOME_STATEMENT', 'OPEX', 'non_cash', 'OPERATING', 'Penyusutan dan amortisasi', 'INDIRECT', NULL, NULL, false, false, false, true, true, false, true, false, false, false, false, true),
  ('6-60400-1', '6-60400-1', '1', 'Depresiasi Aset Tetap', NULL, 'expense', 'sub_account', 3, 'debit', 1, 'INCOME_STATEMENT', 'OPEX', 'non_cash', 'OPERATING', 'Penyusutan aset tetap', 'INDIRECT', 'OVERHEAD', NULL, false, false, true, true, true, false, true, false, false, false, false, true),
  ('6-60400-2', '6-60400-2', '2', 'Amortisasi Aset Tak Berwujud', NULL, 'expense', 'sub_account', 3, 'debit', 2, 'INCOME_STATEMENT', 'OPEX', 'non_cash', 'OPERATING', 'Amortisasi aset tak berwujud', 'INDIRECT', 'OVERHEAD', NULL, false, false, true, true, true, false, true, false, false, false, false, true),
  ('7', '7', '7', 'PENDAPATAN LAIN-LAIN', NULL, 'revenue', 'category', 1, 'credit', 40, 'INCOME_STATEMENT', 'OTHER_INCOME', 'operating', 'OPERATING', 'Penerimaan pendapatan lain-lain', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('7-70000', '7-70000', '70000', 'Interest Income - Bank', NULL, 'revenue', 'type', 2, 'credit', 1, 'INCOME_STATEMENT', 'OTHER_INCOME', 'operating', 'OPERATING', 'Penerimaan pendapatan lain-lain', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('7-70099', '7-70099', '70099', 'Pendapatan Non Operasional - Lain-Lain', NULL, 'revenue', 'type', 2, 'credit', 2, 'INCOME_STATEMENT', 'OTHER_INCOME', 'operating', 'OPERATING', 'Penerimaan pendapatan lain-lain', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('8', '8', '8', 'BEBAN LAIN-LAIN', NULL, 'expense', 'category', 1, 'debit', 50, 'INCOME_STATEMENT', 'OTHER_EXPENSE', 'operating', 'OPERATING', 'Pembayaran beban non-operasional', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('8-80000', '8-80000', '80000', 'Beban Non Operasional', NULL, 'expense', 'type', 2, 'debit', 1, 'INCOME_STATEMENT', 'OTHER_EXPENSE', 'operating', 'OPERATING', 'Pembayaran beban non-operasional', NULL, NULL, NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('8-80003', '8-80003', '80003', 'Bank Taxes', NULL, 'expense', 'sub_account', 3, 'debit', 1, 'INCOME_STATEMENT', 'OTHER_EXPENSE', 'operating', 'OPERATING', 'Pembayaran beban non-operasional', NULL, 'OVERHEAD', NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('8-80006', '8-80006', '80006', 'Employee Loan', NULL, 'expense', 'sub_account', 3, 'debit', 2, 'INCOME_STATEMENT', 'OTHER_EXPENSE', 'operating', 'OPERATING', 'Pembayaran beban non-operasional', NULL, 'OVERHEAD', NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('8-80007', '8-80007', '80007', 'Office Renovation', NULL, 'expense', 'sub_account', 3, 'debit', 3, 'INCOME_STATEMENT', 'OTHER_EXPENSE', 'operating', 'OPERATING', 'Pembayaran beban non-operasional', NULL, 'OVERHEAD', NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('8-80009', '8-80009', '80009', 'Bank Administration', NULL, 'expense', 'sub_account', 3, 'debit', 4, 'INCOME_STATEMENT', 'OTHER_EXPENSE', 'operating', 'OPERATING', 'Pembayaran beban non-operasional', NULL, 'OVERHEAD', NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('8-80010', '8-80010', '80010', 'WWW Coffee', NULL, 'expense', 'sub_account', 3, 'debit', 5, 'INCOME_STATEMENT', 'OTHER_EXPENSE', 'operating', 'OPERATING', 'Pembayaran beban non-operasional', NULL, 'OVERHEAD', NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('8-80012', '8-80012', '80012', 'Ultah WIT.ID', NULL, 'expense', 'sub_account', 3, 'debit', 6, 'INCOME_STATEMENT', 'OTHER_EXPENSE', 'operating', 'OPERATING', 'Pembayaran beban non-operasional', NULL, 'OVERHEAD', NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('8-80013', '8-80013', '80013', 'Hampers WIT.ID', NULL, 'expense', 'sub_account', 3, 'debit', 7, 'INCOME_STATEMENT', 'OTHER_EXPENSE', 'operating', 'OPERATING', 'Pembayaran beban non-operasional', NULL, 'OVERHEAD', NULL, false, false, false, false, true, false, true, false, false, false, false, true),
  ('8-80014', '8-80014', '80014', 'Buka Bersama', NULL, 'expense', 'sub_account', 3, 'debit', 8, 'INCOME_STATEMENT', 'OTHER_EXPENSE', 'operating', 'OPERATING', 'Pembayaran beban non-operasional', NULL, 'OVERHEAD', NULL, false, false, false, false, true, false, true, false, false, false, false, true)
) AS t(
  account_code, coa_full_code, segment_code, account_name, name_en,
  account_type, coa_layer, level, normal_balance, sort_order,
  enum_laporan_keuangan, enum_laporan_keuangan_category,
  cash_flow_category, enum_cf_section, enum_cf_line,
  direct_indirect_cost, enum_cost_category, tax_code,
  contra_account, is_working_capital, is_non_cash_item, is_budgeted,
  is_tax_deductible, is_restricted, is_trial_balance, is_taxation_report,
  required_sub_gl, is_washed_out_account, required_child, is_active
);

-- == Pass 2: wire parent_account_id by code (ADR-8) ==========================
WITH pairs(child_code, parent_code) AS (VALUES
  ('1-10000', '1'),
  ('1-10001', '1-10000'),
  ('1-10001-1', '1-10001'),
  ('1-10002', '1-10000'),
  ('1-10002-1', '1-10002'),
  ('1-10002-2', '1-10002'),
  ('1-10002-3', '1-10002'),
  ('1-10002-4', '1-10002'),
  ('1-10002-5', '1-10002'),
  ('1-10002-6', '1-10002'),
  ('1-10003', '1-10000'),
  ('1-10003-1', '1-10003'),
  ('1-10100', '1-10000'),
  ('1-10100-1', '1-10100'),
  ('1-10100-2', '1-10100'),
  ('1-10100-9', '1-10100'),
  ('1-10200', '1-10000'),
  ('1-10200-1', '1-10200'),
  ('1-10200-9', '1-10200'),
  ('1-10300', '1-10000'),
  ('1-10300-1', '1-10300'),
  ('1-10300-2', '1-10300'),
  ('1-10400', '1-10000'),
  ('1-10400-1', '1-10400'),
  ('1-10400-2', '1-10400'),
  ('1-10400-3', '1-10400'),
  ('1-20000', '1'),
  ('1-20001', '1-20000'),
  ('1-20001-1', '1-20001'),
  ('1-20001-2', '1-20001'),
  ('1-20001-3', '1-20001'),
  ('1-20001-9', '1-20001'),
  ('1-20002', '1-20000'),
  ('1-20002-1', '1-20002'),
  ('1-20002-9', '1-20002'),
  ('1-20003', '1-20000'),
  ('1-20003-1', '1-20003'),
  ('1-20003-2', '1-20003'),
  ('2-10000', '2'),
  ('2-10100', '2-10000'),
  ('2-10100-1', '2-10100'),
  ('2-10100-2', '2-10100'),
  ('2-10200', '2-10000'),
  ('2-10200-1', '2-10200'),
  ('2-10200-2', '2-10200'),
  ('2-10200-3', '2-10200'),
  ('2-10200-4', '2-10200'),
  ('2-10200-5', '2-10200'),
  ('2-10300', '2-10000'),
  ('2-10300-1', '2-10300'),
  ('2-10300-2', '2-10300'),
  ('2-10400', '2-10000'),
  ('2-10400-1', '2-10400'),
  ('2-10500', '2-10000'),
  ('2-10500-1', '2-10500'),
  ('2-20000', '2'),
  ('2-20100', '2-20000'),
  ('2-20100-1', '2-20100'),
  ('2-20200', '2-20000'),
  ('2-20200-1', '2-20200'),
  ('3-10000', '3'),
  ('3-10001', '3-10000'),
  ('3-10001-1', '3-10001'),
  ('3-20000', '3'),
  ('3-20001', '3-20000'),
  ('3-20001-1', '3-20001'),
  ('3-20002', '3-20000'),
  ('3-20002-1', '3-20002'),
  ('4-40000', '4'),
  ('4-40000-1', '4-40000'),
  ('4-40000-2', '4-40000'),
  ('4-40000-3', '4-40000'),
  ('4-40000-4', '4-40000'),
  ('4-40000-5', '4-40000'),
  ('4-40000-6', '4-40000'),
  ('4-40000-7', '4-40000'),
  ('4-40000-8', '4-40000'),
  ('4-40000-9', '4-40000'),
  ('4-40000-99', '4-40000'),
  ('4-40100', '4'),
  ('4-40100-1', '4-40100'),
  ('4-40100-2', '4-40100'),
  ('4-40100-3', '4-40100'),
  ('4-40100-4', '4-40100'),
  ('4-40100-5', '4-40100'),
  ('4-40100-6', '4-40100'),
  ('4-40700', '4'),
  ('5-50000', '5'),
  ('5-50000-1', '5-50000'),
  ('5-50000-1-3', '5-50000-1'),
  ('5-50000-2', '5-50000'),
  ('5-50000-2-10', '5-50000-2'),
  ('5-50000-2-11', '5-50000-2'),
  ('5-50000-2-2', '5-50000-2'),
  ('5-50000-2-4', '5-50000-2'),
  ('5-50000-2-6', '5-50000-2'),
  ('5-50000-2-8', '5-50000-2'),
  ('5-50000-3', '5-50000'),
  ('5-50000-3-1', '5-50000-3'),
  ('5-50000-3-10', '5-50000-3'),
  ('5-50000-3-12', '5-50000-3'),
  ('5-50000-3-13', '5-50000-3'),
  ('5-50000-3-2', '5-50000-3'),
  ('5-50000-3-4', '5-50000-3'),
  ('5-50000-4', '5-50000'),
  ('5-50000-4-1', '5-50000-4'),
  ('5-50000-5', '5-50000'),
  ('5-50000-5-1', '5-50000-5'),
  ('5-50000-5-3', '5-50000-5'),
  ('5-50000-5-4', '5-50000-5'),
  ('5-50000-5-5', '5-50000-5'),
  ('6-60100', '6'),
  ('6-60100-1', '6-60100'),
  ('6-60100-10', '6-60100'),
  ('6-60100-11', '6-60100'),
  ('6-60100-12', '6-60100'),
  ('6-60100-13', '6-60100'),
  ('6-60100-15', '6-60100'),
  ('6-60100-16', '6-60100'),
  ('6-60100-17', '6-60100'),
  ('6-60100-18', '6-60100'),
  ('6-60100-19', '6-60100'),
  ('6-60100-2', '6-60100'),
  ('6-60100-20', '6-60100'),
  ('6-60100-21', '6-60100'),
  ('6-60100-23', '6-60100'),
  ('6-60100-4', '6-60100'),
  ('6-60100-6', '6-60100'),
  ('6-60100-7', '6-60100'),
  ('6-60100-8', '6-60100'),
  ('6-60100-9', '6-60100'),
  ('6-60100-99', '6-60100'),
  ('6-60200', '6'),
  ('6-60200-1', '6-60200'),
  ('6-60200-2', '6-60200'),
  ('6-60200-3', '6-60200'),
  ('6-60200-4', '6-60200'),
  ('6-60200-99', '6-60200'),
  ('6-60221', '6'),
  ('6-60222', '6-60221'),
  ('6-60223', '6-60221'),
  ('6-60224', '6-60221'),
  ('6-60225', '6-60221'),
  ('6-60226', '6-60221'),
  ('6-60300', '6'),
  ('6-60300-1', '6-60300'),
  ('6-60300-2', '6-60300'),
  ('6-60300-5', '6-60300'),
  ('6-60400', '6'),
  ('6-60400-1', '6-60400'),
  ('6-60400-2', '6-60400'),
  ('7-70000', '7'),
  ('7-70099', '7'),
  ('8-80000', '8'),
  ('8-80003', '8-80000'),
  ('8-80006', '8-80000'),
  ('8-80007', '8-80000'),
  ('8-80009', '8-80000'),
  ('8-80010', '8-80000'),
  ('8-80012', '8-80000'),
  ('8-80013', '8-80000'),
  ('8-80014', '8-80000')
)
UPDATE public.coa c
SET parent_account_id = p.id
FROM pairs, public.coa p
WHERE c.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND p.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND c.account_code = pairs.child_code
  AND p.account_code = pairs.parent_code;

COMMIT;

```


---

## Appendix B — Forward Schema (new repo): `company_id` & `branch_id`

All 4 table(s) of this module gain two **nullable** scoping columns in the new repository, to isolate data per **company** (PT / legal entity) and **branch** (kantor cabang):

| Column | Type | Nullable | Now | Final (new repo) |
|---|---|---|---|---|
| `company_id` | uuid | yes | no FK/index/RLS | FK → `companies`/`entities(id)` + index + RLS |
| `branch_id` | uuid | yes | no FK/index/RLS | FK → `branches(id)` + index + RLS |

`tenant_id` is **kept unchanged**; these are new independent columns. They are nullable so the Appendix A dataseed loads without modification (existing rows simply have NULL company/branch). FK wiring, backfill, and RLS are deferred to the new-repo final migration (see `PRD_Task_Management.md`, Phase 5). Combined SQL for all modules: `docs/finance/new-repo/0001_finance_add_company_branch.sql`.

```sql
-- Chart of Account — add company_id + branch_id (nullable, no FK)
ALTER TABLE public.coa ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.coa ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.coa_audit_log ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.coa_audit_log ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.coa_pending_approval ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.coa_pending_approval ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.coa_sub_gl_value ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.coa_sub_gl_value ADD COLUMN IF NOT EXISTS branch_id  uuid;

COMMENT ON COLUMN public.coa.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.coa.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.coa_audit_log.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.coa_audit_log.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.coa_pending_approval.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.coa_pending_approval.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.coa_sub_gl_value.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.coa_sub_gl_value.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
```
