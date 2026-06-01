# Chart of Account — Test Plan v2

**Module:** `chart-of-account` · **Route:** `/finance/coa` (+ `/finance/coa/[id]`)
**Scope:** 5-layer COA Explorer revamp — Phases 0–5 (foundations, explorer/tree, Sub Akun, Sub GL, Audit/Approvals, Import/Export) + v2 bug fixes (Download Template, Inspector toolbar removal, Pending Approvals removal, Audit Trail + Import/Export history verification).
**Dashboard:** results logged to **/finance/qa** (module `chart-of-account`).
**Last run:** 2026-06-01

## How it was executed

| Method | Tool | What it covers |
|---|---|---|
| **Automated** | `node --experimental-strip-types --test apps/web/lib/__tests__/coa-logic.test.ts` | Pure domain logic in `apps/web/lib/coa-logic.ts` (36 cases). |
| **Integration** | Supabase Postgres 17 (`execute_sql`) | Live schema accepts the feature payloads (DL flags, Sub-DL FK, `sub_gl_config`, audit, approvals) + backfill. |
| **Code Review** | `tsc --noEmit` (0 errors in `finance/coa`) + manual review | API routes, explorer/inspector/modals wiring, audit-on-mutation, bug-fix verifications. |
| **Manual (deploy)** | Browser | Pixel/interaction parity vs. prototype — **NA in CI** (no browser/Supabase env); verify post-deploy. |

Reproduce the automated suite:

```bash
node --experimental-strip-types --test apps/web/lib/__tests__/coa-logic.test.ts
# → tests 36 · pass 36 · fail 0
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

## Results summary

**59 cases · 56 PASS · 0 FAIL · 3 NA (manual/browser)** · pass-rate 94.92% · status **PARTIAL**.

The 3 NA cases are visual/interaction parity checks that require a running browser
against a Supabase environment (not available in CI); they are listed for the
post-deploy manual pass. Everything logic-, schema-, and code-level was executed.

## v2 Bug fixes verified (TC-053–TC-059)

| Bug | Fix | TC |
|---|---|---|
| **#1** Import modal has no Download Template | Added `downloadTemplate()` + "Download Template" button in `ImportModal` footer | TC-053 |
| **#2** Inspector toolbar button is useless | Removed `PanelRight` toolbar button; inspector still opens on row click | TC-054 |
| **#3a** Pending Approval component not relevant | Removed `PendingApprovalsModal` from `coa-explorer.tsx`, `layer-panel.tsx`, `quick-modals.tsx` | TC-055 |
| **#3b** Audit Trail filter wiring | Verified `GET /api/finance/coa/audit` passes action/severity/q to Supabase correctly | TC-056, TC-057 |
| **#3b** Import audit trail | Verified `POST /api/finance/coa/import` writes `action=IMPORT` entry; `ImportHistoryModal` fetches it | TC-058, TC-059 |

## Audit Trail & Import/Export History — manual verification steps (post-deploy)

After deploying to VPS, open `/finance/coa` and verify:

1. **CRUD audit entries** — Create a new account → open Audit Trail → filter `action=CREATE` → row appears with correct name, code, actor.
2. **Edit audit entries** — Edit an account name → filter `action=EDIT` → before/after diff shows old vs new name.
3. **Delete audit entries** — Delete a leaf account → filter `action=DELETE` → row appears; deleted account code shown.
4. **Import + history** — Click Import → Download Template → fill in 1 row → commit → filter `action=IMPORT` in Audit Trail → entry appears. Also open "Import/Export history" (layer panel) → entry listed with success count.
5. **Export** — Click Export → CSV file downloads → open in spreadsheet → columns are ID, Layer, Parent ID, Code, COA Full Code, Name, D/K, Active.
6. **Severity filters** — In Audit Trail, change filter to `high` → only CREATE/DELETE/CONFIG rows shown (EDIT is medium, low is view-only ops).

## Case ledger (abridged)

| Code | Story | Title | Method | Status |
|---|---|---|---|---|
| TC-001–010 | US-COA-01 | full-code build, segment derive, per-layer code width, layer mapping | Automated | PASS |
| TC-011–019 | US-COA-02 | batch validation: blanks, dup in-batch/vs-existing, width, max-count | Automated | PASS |
| TC-020–024 | US-COA-03 | sub-DL depth, MAX_SUB_DL_LEVEL guard, deepest-leaf | Automated | PASS |
| TC-025–027 | US-COA-04 | contra flip, nb↔dk round-trip | Automated | PASS |
| TC-028–036 | US-COA-05 | hierarchy build/flatten/_depth, search auto-expand, layer trim, ancestry | Automated | PASS |
| TC-037–042 | US-COA-06..10 | live schema: DL flags, Sub-DL FK, `sub_gl_config` jsonb, audit insert, approval insert, segment backfill (169 rows) | Integration | PASS |
| TC-043–049 | US-COA-06..10 | explorer/tree render, layer filter+counts, searchable-parent (no raw UUID), Sub Akun gating, Sub GL deepest-only gating, audit-on-mutation, import preview/commit | Code Review | PASS |
| TC-053–059 | US-COA-06..10 | v2 bug fixes: Download Template, Inspector toolbar removed, PendingApprovals removed, Audit Trail filter wiring, Import audit log, ImportHistoryModal | Code Review | PASS |
| TC-050–052 | US-COA-06/07/09 | visual parity vs prototype, keyboard nav, value-catalog drawer in browser | Manual | NA |

Full machine-readable ledger: `supabase/seed/qa_coa_seed.sql` (and the live rows on /finance/qa).
