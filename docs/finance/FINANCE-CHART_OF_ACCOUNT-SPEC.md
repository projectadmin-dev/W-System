# FINANCE — Chart of Account — Full Specification

**Module:** Finance & Accounting → Master Data → Chart of Account
**Routes:** `/finance/coa` (workspace) · `/finance/coa/[id]` (drill-down) · `/finance/qa` (QA dashboard)
**Stack:** Next.js 16 (App Router) · shadcn/ui · Tailwind v4 · Supabase Postgres 17 · `xlsx` (SheetJS)
**Tenant:** `00000000-0000-0000-0000-000000000001` (single-tenant seed)
**Status:** Phases 0–5 implemented · v2 bug-fixes merged (PR #40) · **v3 full import/export + PSAK attribute backfill** merged (PR #41)
**Last updated:** 2026-06-08

> Companion document: **`FINANCE-CHART_OF_ACCOUNT-MIGRATION.md`** — migration order, ADRs, anti-patterns, and the full 170-row dataseed (Appendix A).

---

## Table of Contents

1. [Goal & Scope](#1-goal--scope)
2. [User Stories](#2-user-stories)
3. [Domain Model & Business Rules](#3-domain-model--business-rules)
4. [Database Schema](#4-database-schema)
5. [Pure Engine (`coa-logic.ts`)](#5-pure-engine-coa-logicts)
6. [Import/Export Schema (`coa-import-schema.ts`)](#6-importexport-schema-coa-import-schemats)
7. [Import / Export Flow (v3)](#7-import--export-flow-v3)
8. [PSAK Attribute Classification](#8-psak-attribute-classification)
9. [API Contract](#9-api-contract)
10. [Audit Trail & History](#10-audit-trail--history)
11. [Component Inventory](#11-component-inventory)
12. [Testing](#12-testing)

---

## 1. Goal & Scope

The Chart of Account (COA) workspace is a **hierarchical 5-layer explorer** that lets the
Finance Controller manage the company's account master data and tag every account with the
attributes required to auto-generate PSAK-compliant financial reports (Neraca / Balance
Sheet, Laba Rugi / Income Statement, Arus Kas / Cash Flow Statement).

**In scope**

- 5-layer hierarchy: **Category → Account Type → Sub Account → General Ledger → Detail Ledger**.
- Layer-aware CRUD with searchable parent selection and hierarchy preview.
- Batch "Sub Akun" creation, Sub-DL (≤2 levels), and Sub GL configuration on the deepest leaf.
- Full-attribute **Import** (xlsx/csv) with auto-infer, and full-attribute **Export** (xlsx).
- Audit Trail (append-only) + Import/Export history.
- All ~29 importable reporting attributes (PSAK report mapping, cash-flow classification, cost classification, boolean flags).

**Out of scope (deferred)**

- Pending-Approvals UI (removed in v2 — table retained for future master-data→DL generation, OQ-3).
- Live Sub GL value resolution (table exists; values lazily created at first journal posting).

---

## 2. User Stories

| ID | Story |
|---|---|
| **US-COA-01** | COA code & full-code conventions (segment widths per layer). |
| **US-COA-02** | Batch "Sub Akun" validation (blanks, dups, width, max-count). |
| **US-COA-03** | Sub-DL depth (≤2) & deepest-leaf rules. |
| **US-COA-04** | Normal-balance cascade & contra flip. |
| **US-COA-05** | Tree engine: build / flatten / search / layer filter. |
| **US-COA-06** | Explorer shell: layout, layer filter + counts, density, search. |
| **US-COA-07** | CRUD: layer-aware create/edit, searchable parent, hierarchy preview, delete guard. |
| **US-COA-08** | Sub Akun: sub/GL children + Sub-DL batch create. |
| **US-COA-09** | Sub GL configuration (deepest DL only) + value drawer. |
| **US-COA-10** | Audit Trail + Import/Export history. |
| **US-COA-11** | Full-column xlsx template with 29 attributes + auto-infer report enums on import. |
| **US-COA-12** | Full-column xlsx export of all 29 importable attributes (round-trip safe). |

---

## 3. Domain Model & Business Rules

### 3.1 The 5 layers

| Level | DB `coa_layer` | FE alias | Segment width | Role |
|---|---|---|---|---|
| 1 | `category` | `category` | 1 digit | Top grouping (AKTIVA, KEWAJIBAN…). |
| 2 | `type` | `type` | 1 digit | Account type (Aktiva Lancar…). |
| 3 | `sub_account` | `sub` | 2 digits (01–99) | Sub account. |
| 4 | `general_ledger` | `gl` | 1 digit (1–9) | GL account. |
| 5 | `detail_ledger` | `detail` | 4 digits (0000–9999) | Postable detail ledger; may nest a Sub-DL ≤2 levels. |

The **FE model uses short layer names** (`sub`, `gl`, `detail`); the **DB uses long names**
(`sub_account`, `general_ledger`, `detail_ledger`). `coa-logic.ts` and `coa-import-schema.ts`
both carry the mapping; the import schema additionally accepts `sub`/`gl`/`detail` as aliases.

### 3.2 Full code anatomy

`account_code` is the **canonical full hierarchical code** (e.g. `1-10002-1`). It is mirrored
to `coa_full_code` (indexed for search/sort) and the trailing segment is stored in
`segment_code` (the per-layer chip shown in the explorer).

```
account_code = parentFullCode + '-' + segment   (buildFullCode)
segment      = last '-' token of the full code  (deriveSegment)
```

### 3.3 Normal balance & contra

- Normal balance is `debit` / `credit` (lowercase in DB; `DEBIT`/`DEBIT` chips in FE).
- `asset` & `expense` default to **debit**; `liability`, `equity`, `revenue` default to **credit**.
- A **contra account** (`contra_account = true`, e.g. Akumulasi Penyusutan) flips its parent's
  normal balance (`effectiveDk`).

### 3.4 Sub-DL depth

- A Detail Ledger may nest further detail children up to **`MAX_SUB_DL_LEVEL = 2`**.
- The **deepest** Detail Ledger (no `detail` child) is the only postable / Sub-GL-capable node.

### 3.5 Per-layer maxima

- `MAX_CHILDREN = { sub: 99, gl: 9 }` — caps batch "Sub Akun" creation per parent.

---

## 4. Database Schema

### 4.1 `public.coa` (38 columns)

Built up additively across migrations (see MIGRATION doc §2). Key groups:

**Identity / hierarchy**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `tenant_id` | uuid | tenant scope |
| `account_code` | text | canonical full code (unique per tenant by convention) |
| `coa_full_code` | text | mirror of `account_code`, indexed |
| `segment_code` | text | per-layer chip code |
| `account_name` | text | Bahasa Indonesia name |
| `name_en` | text | English name (optional) |
| `account_type` | text | `asset \| liability \| equity \| revenue \| expense` |
| `coa_layer` | text | `category \| type \| sub_account \| general_ledger \| detail_ledger` |
| `level` | int | 1–5 (mirrors layer) |
| `parent_account_id` | uuid | layer parent FK (self-ref) |
| `sort_order` | int | sibling display order (default 0) |
| `normal_balance` | text | `debit \| credit` |

**Report mapping (PSAK)**

| Column | CHECK values |
|---|---|
| `enum_laporan_keuangan` | `INCOME_STATEMENT`, `BALANCE_SHEET` |
| `enum_laporan_keuangan_category` | `ASSET, LIABILITY, EQUITY, REVENUE, COGS, OPEX, OTHER_INCOME, OTHER_EXPENSE, TAX_EXPENSE` |
| `cash_flow_category` | `operating, investing, financing, non_cash, not_applicable` |
| `enum_cf_section` | `OPERATING, INVESTING, FINANCING, EXCLUDED` |
| `enum_cf_line` | free text (PSAK 2 line label) |
| `direct_indirect_cost` | `DIRECT, INDIRECT` |
| `enum_cost_category` | `PERSONNEL, OPERATIONAL, MARKETING, TECHNOLOGY, OVERHEAD` |
| `tax_code` | free text |

**Boolean flags** (all `NOT NULL`, defaults noted)

| Column | Default | Meaning |
|---|---|---|
| `contra_account` | false | flips sign vs parent |
| `is_working_capital` | false | short-term BS → CF working-capital change |
| `is_non_cash_item` | false | depreciation/amortisation add-back |
| `is_budgeted` | false | included in budget |
| `is_tax_deductible` | true | deductible expense |
| `is_restricted` | false | not directly postable |
| `is_trial_balance` | true | appears in trial balance |
| `is_taxation_report` | false | appears in tax report |
| `required_sub_gl` | false | journal must supply a Sub GL |
| `is_washed_out_account` | false | clearing/temporary (auto-zeroed) |
| `required_child` | false | must have a Sub-DL before posting |
| `is_active` | true | hidden from journal pickers when false |

**Sub-DL / Sub-GL**

| Column | Type | Notes |
|---|---|---|
| `child_upstream_id` | uuid | self-ref Sub-DL parent (FK `coa_child_upstream_id_fkey`) |
| `child_source_master_data` | text | future master-data source |
| `sub_gl_config` | jsonb | ordered attribute-level config (deepest DL only) |

### 4.2 Related tables

- **`coa_audit_log`** — append-only audit (ISO 27001 / SOX 404; retain 7y).
  `action IN ('CREATE','EDIT','DELETE','CONFIG','STATUS','APPROVAL','IMPORT')`,
  `severity IN ('low','medium','high')`, before/after `jsonb`.
- **`coa_pending_approval`** — queued master-data → Detail-Ledger generation
  (`status IN ('PENDING','APPROVED','REJECTED')`). UI removed in v2; table retained.
- **`coa_sub_gl_value`** — resolved Sub GL composite values
  (`source_type IN ('MASTER_DATA','KEY_IN')`, `UNIQUE(coa_id, composite_kode)`).

### 4.3 Indexes

`idx_coa_full_code`, `idx_coa_layer`, `idx_coa_laporan`, `idx_coa_lk_category`,
`idx_coa_budgeted`, `idx_coa_cash_flow_category`, `idx_coa_child_upstream`,
`idx_coa_audit_tenant_date`, `idx_coa_audit_action`, `idx_coa_approval_status`,
`idx_coa_sub_gl_value_coa`.

---

## 5. Pure Engine (`coa-logic.ts`)

`apps/web/lib/coa-logic.ts` — **zero imports, no React** — so `node:test` can exercise it
(`apps/web/lib/__tests__/coa-logic.test.ts`, 36 cases).

| Function | Purpose |
|---|---|
| `buildFullCode(parent, segment)` | append a segment to the parent full code |
| `deriveSegment(fullCode)` | trailing `-` token |
| `validateSegmentCode(layer, code)` | per-layer width rules (ID error messages) |
| `validateBatchChildren(rows, layer, existing, max)` | batch Sub-Akun validation (blanks, dups in-batch & vs-existing, width, max) |
| `subDlDepth(node, parentOf)` | Sub-DL depth (0 = base DL) |
| `canAcceptSubDl(depth)` | `depth < MAX_SUB_DL_LEVEL` |
| `isDeepestDetailLedger(layer, childLayers)` | postable / Sub-GL-capable leaf |
| `effectiveDk(parentDk, contra)` | contra-flip |
| `nbToDk` / `dkToNb` | DB ↔ chip balance |
| `toFeLayer` / `toDbLayer` | layer name mapping (incl. level fallback) |
| `buildHierarchy` / `flatten` / `trimByLayer` / `filterByQuery` / `ancestryOf` / `allParentIds` | generic tree engine |

---

## 6. Import/Export Schema (`coa-import-schema.ts`)

`apps/web/lib/coa-import-schema.ts` — **pure module** (no browser APIs, no React, no XLSX) —
the **single source of truth** for the 29 importable columns. Imported by the import API route,
the import modal, the export, and `coa-import.test.ts` (54 cases).

### 6.1 The 29 columns (`COA_COLUMNS`)

Template column order = this order. Each `ColSpec` carries: `key` (DB column = Excel header for
round-trip), `label` (ID), `required`, `type` (`text|boolean|integer|enum`), `valid` (canonical
values), `default`, `description` (ID, for the Reference sheet), and `aliases`.

Required: **`account_code`, `account_name`, `coa_layer`, `account_type`**. The rest are optional
and either auto-inferred or defaulted.

### 6.2 Helpers

| Export | Behaviour |
|---|---|
| `buildHeaderMap(rawHeaders)` | case-insensitive header → column index; strips `*`, normalises whitespace/`-`, honours aliases (`coa_full_code`→`account_code`, `sub`→`coa_layer` value, `nb`→`normal_balance`, …) |
| `parseBool(v, def)` | accepts `true/1/yes/ya/y/t/benar` and `false/0/no/tidak/n/f/salah`; else `def` |
| `normalizeRow(raw)` | validates + auto-infers a single cell-map → `{ok, row}` or `{ok:false, reason}` |
| `parseGrid(grid)` | maps the header row, normalises every data row |

### 6.3 Auto-infer (blank optional cells)

| Blank field | Inferred from `account_type` |
|---|---|
| `normal_balance` | asset/expense → `debit`, else `credit` |
| `enum_laporan_keuangan` | asset/liability/equity → `BALANCE_SHEET`, else `INCOME_STATEMENT` |
| `enum_laporan_keuangan_category` | asset→ASSET, liability→LIABILITY, equity→EQUITY, revenue→REVENUE, expense→OPEX |

Explicitly supplied values always override auto-infer. `level` is derived from `coa_layer`
via `LAYER_LEVEL`. Layer aliases (`sub`/`gl`/`detail`) are normalised to DB values.

---

## 7. Import / Export Flow (v3)

### 7.1 Template (`import-modals.tsx` → `downloadTemplate`)

Dynamic `import('xlsx')` builds a real `.xlsx` with **3 sheets**:

1. **Template COA** — 29 headers + 12 example rows spanning all layers/types.
2. **Referensi** — every column with its label, required flag, valid values, and ID description.
3. **Petunjuk** — step-by-step instructions (auto-infer behaviour, layer aliases, booleans).

### 7.2 Import

- File upload (`.xlsx/.xls/.csv`) read via `XLSX.read` → `fileGrid: string[][]`, **or** textarea
  paste → `parseCsvToGrid`. The active grid feeds `parseGrid` (from the pure schema).
- Each parsed row is enriched with `parent_account_id` resolved client-side from the parent's
  full code (`resolveParentId`).
- Preview shows icon · `code · name` · layer · status. Invalid rows show the `reason`.
- Commit POSTs the full 29-column payload to `/api/finance/coa/import`.

### 7.3 Export (`coa-explorer.tsx` → `handleExport`)

Dynamic `import('xlsx')` writes a `.xlsx` from the raw `DbCoaRow[]` state (not the FE tree
model, which lacks report columns). Emits all 29 importable columns as strings + `_parent_code`
+ `_id`; booleans serialised as `TRUE`/`FALSE`. **Round-trip safe** — an exported file re-imports
without header-mapping changes.

---

## 8. PSAK Attribute Classification

The live seed is fully classified per **PSAK 1** (statement mapping) and **PSAK 2** (cash flow).
Rules applied to all 170 accounts (see MIGRATION doc §4 for the exact backfill SQL):

| Attribute | Rule summary |
|---|---|
| `cash_flow_category` | Cash & bank → `not_applicable`; working-capital BS → `operating`; non-current assets → `investing`; long-term liabilities & equity → `financing`; depreciation/provision → `non_cash`; all P&L → `operating`. |
| `enum_cf_section` | Aligns to the PSAK 2 section: `OPERATING` / `INVESTING` / `FINANCING`; cash, headers, retained earnings & accumulated depreciation → `EXCLUDED`. |
| `enum_cf_line` | PSAK 2 standard line label (e.g. *"Perubahan piutang usaha"*, *"Penyusutan aset tetap"*, *"Setoran modal"*); cash/header/equity rows left null (not a CF line). |
| `direct_indirect_cost` | COGS (`5-*`) → `DIRECT`; OpEx (`6-*`) → `INDIRECT`. |
| `enum_cost_category` | Expense GLs tagged `PERSONNEL / OPERATIONAL / MARKETING / TECHNOLOGY / OVERHEAD`; non-expense & header rows left null. |

---

## 9. API Contract

### 9.1 `/api/finance/coa` (CRUD)

| Method | Action |
|---|---|
| `GET` | list / `?id=` / `?code=` / `?type=` / `?tree=true` / `?cashFlowCategory=` (delegates to `lib/repositories/finance-coa`) |
| `POST` | create (requires `account_code, account_name, account_type, level`; 409 on duplicate code) |
| `PUT` | `?id=` update (also writes `sub_gl_config`) |
| `DELETE` | `?id=` soft delete (`deleted_at`) |

### 9.2 `/api/finance/coa/import` (POST)

- Body `{ filename?, rows: CoaImportRow[] }`.
- `ALLOWED_KEYS` derived from `COA_COLUMNS` + `parent_account_id`; unknown keys dropped (anti-injection).
- Server-side boolean coercion (`BOOL_KEYS`); mirrors `account_code` → `coa_full_code`.
- Inserts **row-by-row** (one bad row never aborts the batch); collects per-row errors.
- Writes a single `IMPORT` audit entry (best-effort) with success/failed counts.

### 9.3 `/api/finance/coa/audit` (GET)

- Query `action`, `severity`, `q`. Filters server-side on action/severity; `q` filters
  client-side over `target_name`/`target_coa_code`/`actor_nama`. Degrades to `{data:[]}` if the
  table is absent.

### 9.4 `/api/finance/coa/approvals` (GET/POST)

- `GET` pending approvals; `POST { action, ids[], note? }` resolves. (UI removed in v2; endpoint retained.)

---

## 10. Audit Trail & History

Every CoA mutation appends one `coa_audit_log` row. The workspace surfaces:

- **Audit Trail** modal — filter by action / severity / free-text; before→after diff.
- **Import/Export history** — driven by `IMPORT` audit entries (success/failed counts).

Severity mapping: CREATE/DELETE/CONFIG = high · EDIT = medium · view-only/STATUS = low.

---

## 11. Component Inventory

`apps/web/components/finance/coa/`:

| File | Role |
|---|---|
| `coa-explorer.tsx` | workspace shell, toolbar, tree state, **`handleExport`** |
| `tree-row.tsx`, `tree.ts`, `hierarchy-path.tsx` | tree rendering & paths |
| `layer-panel.tsx` | layer filter + counts, quick actions (history/audit) |
| `inspector.tsx` | per-row inspector (opens on row click) |
| `account-form-modal.tsx` | layer-aware create/edit + hierarchy preview |
| `sub-modals.tsx`, `sub-sections.tsx`, `sub-gl.tsx` | Sub Akun / Sub-DL / Sub GL |
| `import-modals.tsx` | **template + import (xlsx/csv)** |
| `delete-modal.tsx`, `quick-modals.tsx` | delete guard, history/audit modals |
| `searchable-select.tsx`, `density-toggle.tsx`, `primitives.tsx`, `theme.ts`, `types.ts` | shared UI |

Pure logic lives in `apps/web/lib/coa-logic.ts` and `apps/web/lib/coa-import-schema.ts`.

---

## 12. Testing

| Suite | Command | Cases |
|---|---|---|
| Domain logic | `node --experimental-strip-types --test apps/web/lib/__tests__/coa-logic.test.ts` | 36 |
| Import schema | `node --experimental-strip-types --test apps/web/lib/__tests__/coa-import.test.ts` | 54 |

QA ledger seeded to `/finance/qa` via `supabase/seed/qa_coa_seed.sql` (v3: 72 cases, 69 pass,
3 NA). Full plan + manual post-deploy steps: `docs/qa/coa-test-plan.md`.
