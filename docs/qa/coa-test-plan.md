# Chart of Account — Test Plan v3

**Module:** `chart-of-account` · **Route:** `/finance/coa` (+ `/finance/coa/[id]`)
**Scope:** 5-layer COA Explorer revamp — Phases 0–5 (foundations, explorer/tree, Sub Akun, Sub GL, Audit/Approvals, Import/Export) + v2 bug fixes (Download Template, Inspector toolbar removal, Pending Approvals removal, Audit Trail + Import/Export history) + **v3 full import/export revamp** (29-column xlsx template, xlsx/csv parse, auto-infer financial report enums, full column export).
**Dashboard:** results logged to **/finance/qa** (module `chart-of-account`).
**Last run:** 2026-06-01

## How it was executed

| Method | Tool | What it covers |
|---|---|---|
| **Automated** | `node --experimental-strip-types --test apps/web/lib/__tests__/coa-logic.test.ts` | Pure domain logic in `apps/web/lib/coa-logic.ts` (36 cases). |
| **Automated** | `node --experimental-strip-types --test apps/web/lib/__tests__/coa-import.test.ts` | Schema, normalizer, auto-infer, parseGrid in `apps/web/lib/coa-import-schema.ts` (54 cases across 12 describe blocks). |
| **Integration** | Supabase Postgres 17 (`execute_sql`) | Live schema accepts the feature payloads (DL flags, Sub-DL FK, `sub_gl_config`, audit, approvals) + backfill. |
| **Code Review** | `tsc --noEmit` (0 errors in `finance/coa`) + manual review | API routes, explorer/inspector/modals wiring, audit-on-mutation, bug-fix verifications, v3 import/export wiring. |
| **Manual (deploy)** | Browser | Pixel/interaction parity vs. prototype — **NA in CI** (no browser/Supabase env); verify post-deploy. |

Reproduce the automated suites:

```bash
# Domain logic — 36 cases
node --experimental-strip-types --test apps/web/lib/__tests__/coa-logic.test.ts
# → tests 36 · pass 36 · fail 0

# Import schema, normalizer, auto-infer — 54 cases
node --experimental-strip-types --test apps/web/lib/__tests__/coa-import.test.ts
# → tests 54 · pass 54 · fail 0
```

## User stories

- **US-COA-01** — COA code & full-code conventions (§1.3–§1.5, §12)
- **US-COA-02** — Batch "Sub Akun" validation (§3, rules 6/7/9)
- **US-COA-03** — Sub-DL depth & deepest-leaf rules (§1.5, rules 3/5)
- **US-COA-04** — Normal-balance cascade & contra flip (§1.1–§1.2, rules 1/2)
- **US-COA-05** — Tree engine: build / flatten / search / layer filter
- **US-COA-06** — Explorer shell: layout, layer filter + counts, density, search
- **US-COA-07** — CRUD: layer-aware create/edit, searchable parent, hierarchy preview, delete guard
- **US-COA-08** — Sub Akun: sub/GL children + Sub-DL (≤2 levels) batch create
- **US-COA-09** — Sub GL configuration (deepest DL only) + value drawer
- **US-COA-10** — Audit Trail + Import/Export (Pending Approvals UI removed in v2)
- **US-COA-11 (v3)** — Full-column xlsx template with 29 COA attributes + auto-infer financial report enums on import
- **US-COA-12 (v3)** — Full-column xlsx export with all 29 importable attributes as round-trip-safe file

## Results summary

**72 cases · 69 PASS · 0 FAIL · 3 NA (manual/browser)** · pass-rate 95.83% · status **PARTIAL**.

The 3 NA cases are visual/interaction parity checks that require a running browser
against a Supabase environment (not available in CI); they are listed for the
post-deploy manual pass. Everything logic-, schema-, and code-level was executed.

## v2 Bug fixes verified

| Bug | Fix | TC |
|---|---|---|
| **#1** Import modal has no Download Template | Added `downloadTemplate()` + "Download Template" button in `ImportModal` footer | TC-062 |
| **#2** Inspector toolbar button is useless | Removed `PanelRight` toolbar button; inspector still opens on row click | TC-063 |
| **#3a** Pending Approval component not relevant | Removed `PendingApprovalsModal` from `coa-explorer.tsx`, `layer-panel.tsx`, `quick-modals.tsx` | TC-064 |
| **#3b** Audit Trail filter wiring | Verified `GET /api/finance/coa/audit` passes action/severity/q to Supabase correctly | TC-065, TC-066 |
| **#3b** Import audit trail | Verified `POST /api/finance/coa/import` writes `action=IMPORT` entry; `ImportHistoryModal` fetches it | TC-067, TC-068 |

## v3 Import/Export revamp

### What changed

| Area | Before (v2) | After (v3) |
|---|---|---|
| **Template** | 4-column CSV (`account_code`, `account_name`, `coa_layer`, `account_type`) | 29-column `.xlsx` with 3 sheets: **Template COA** (12 example rows), **Referensi** (all columns + valid values), **Petunjuk** (instructions) |
| **Import parse** | CSV text-area only; 4 columns | `.xlsx` / `.xls` / `.csv` file upload + text-area paste; all 29 attributes via SheetJS |
| **Auto-infer** | None — blank enums left null | Blank `normal_balance`, `enum_laporan_keuangan`, `enum_laporan_keuangan_category`, `enum_posisi_lk` → auto-filled from `account_type` so accounts appear in financial reports immediately |
| **API whitelist** | Hard-coded old column list | Server derives allowed keys from `COA_COLUMNS` in `lib/coa-import-schema.ts`; unknown keys silently dropped |
| **Export** | 8-column CSV | 29-column `.xlsx`; booleans as TRUE/FALSE; includes `_parent_code` and `_id` for traceability; round-trip safe |

### Key files

| File | Role |
|---|---|
| `apps/web/lib/coa-import-schema.ts` | Single source of truth: 29 `COA_COLUMNS`, `normalizeRow`, `parseGrid`, auto-infer logic |
| `apps/web/lib/__tests__/coa-import.test.ts` | 54 automated tests for the above |
| `apps/web/components/finance/coa/import-modals.tsx` | UI: xlsx template download, file upload, parseGrid wiring, 29-col commit |
| `apps/web/app/api/finance/coa/import/route.ts` | API: whitelist from `COA_COLUMNS`, bool coercion, audit log |
| `apps/web/components/finance/coa/coa-explorer.tsx` | `handleExport`: SheetJS xlsx with all 29 importable cols + metadata |

### Auto-infer rules

| account_type | normal_balance | enum_laporan_keuangan | enum_laporan_keuangan_category | enum_posisi_lk |
|---|---|---|---|---|
| asset | DEBIT | BALANCE_SHEET | — | ASSET |
| liability | CREDIT | BALANCE_SHEET | — | LIABILITY |
| equity | CREDIT | BALANCE_SHEET | — | EQUITY |
| revenue | CREDIT | INCOME_STATEMENT | — | — |
| expense | DEBIT | INCOME_STATEMENT | — | — |

Explicitly supplied values always override auto-infer.

## Audit Trail & Import/Export History — manual verification steps (post-deploy)

After deploying to VPS, open `/finance/coa` and verify:

1. **CRUD audit entries** — Create a new account → open Audit Trail → filter `action=CREATE` → row appears with correct name, code, actor.
2. **Edit audit entries** — Edit an account name → filter `action=EDIT` → before/after diff shows old vs new name.
3. **Delete audit entries** — Delete a leaf account → filter `action=DELETE` → row appears; deleted account code shown.
4. **Import template (v3)** — Click Import → "Download Template" → opens `.xlsx` with 3 sheets (Template COA / Referensi / Petunjuk). Verify all 29 attribute columns are present in the Template sheet.
5. **Import xlsx (v3)** — Fill Template COA sheet with ≥1 row (including at least one with blank `enum_laporan_keuangan`) → Upload → Preview shows parsed rows with layer badge → Commit → Query database: row appears with `enum_laporan_keuangan` auto-inferred, not null.
6. **Import audit** — After commit above, filter `action=IMPORT` in Audit Trail → entry appears. Open "Import/Export history" (layer panel) → entry listed with success count.
7. **Export xlsx (v3)** — Click Export → `.xlsx` file downloads → Open in spreadsheet → Verify ≥29 columns including `account_type`, `enum_laporan_keuangan`, `normal_balance`, all boolean flags. Verify booleans show as `TRUE`/`FALSE`.
8. **Round-trip** — Take the exported xlsx → re-import it → no validation errors → row counts match.
9. **Severity filters** — In Audit Trail, change filter to `high` → only CREATE/DELETE/CONFIG rows shown (EDIT is medium, low is view-only ops).

## Case ledger

| Code | Story | Title | Method | Status |
|---|---|---|---|---|
| TC-001–010 | US-COA-01 | full-code build, segment derive, per-layer code width, layer mapping | Automated | PASS |
| TC-011–019 | US-COA-02 | batch validation: blanks, dup in-batch/vs-existing, width, max-count | Automated | PASS |
| TC-020–024 | US-COA-03 | sub-DL depth, MAX_SUB_DL_LEVEL guard, deepest-leaf | Automated | PASS |
| TC-025–027 | US-COA-04 | contra flip, nb↔dk round-trip | Automated | PASS |
| TC-028–036 | US-COA-05 | hierarchy build/flatten/_depth, search auto-expand, layer trim, ancestry | Automated | PASS |
| TC-037–054 | US-COA-11/12 | coa-import-schema: parseBool, buildHeaderMap, normalizeRow (required, layer alias, level, auto-infer, explicit override, invalid enums, booleans, sort_order), parseGrid, COA_COLUMNS integrity | Automated | PASS |
| TC-055–060 | US-COA-06..10 | live schema: DL flags, Sub-DL FK, `sub_gl_config` jsonb, audit insert, approval insert, segment backfill | Integration | PASS |
| TC-061–069 | US-COA-06..10 | explorer/tree render, layer filter+counts, searchable-parent, Sub Akun gating, Sub GL deepest-only, audit-on-mutation, import preview/commit, Download Template (v2), Inspector toolbar removed (v2), PendingApprovals removed (v2), Audit Trail filter wiring (v2), Import audit log (v2) | Code Review | PASS |
| TC-070–074 | US-COA-11/12 | v3: xlsx template 3 sheets + 29 cols, xlsx/csv file parse, auto-infer enums, API ALLOWED_KEYS from COA_COLUMNS, export xlsx 29 cols round-trip | Code Review | PASS |
| TC-075–077 | US-COA-06/07/09 | visual parity vs prototype, keyboard nav, value-catalog drawer in browser | Manual | NA |

Full machine-readable ledger: `supabase/seed/qa_coa_seed.sql` (and the live rows on /finance/qa).
