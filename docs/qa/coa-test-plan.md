# Chart of Account — Test Plan v1

**Module:** `chart-of-account` · **Route:** `/finance/coa` (+ `/finance/coa/[id]`)
**Scope:** 5-layer COA Explorer revamp — Phases 0–5 (foundations, explorer/tree, Sub Akun, Sub GL, Audit/Approvals, Import/Export).
**Dashboard:** results logged to **/finance/qa** (module `chart-of-account`).
**Last run:** 2026-05-31

## How it was executed

| Method | Tool | What it covers |
|---|---|---|
| **Automated** | `node --experimental-strip-types --test apps/web/lib/__tests__/coa-logic.test.ts` | Pure domain logic in `apps/web/lib/coa-logic.ts` (36 cases). |
| **Integration** | Supabase Postgres 17 (`execute_sql`) | Live schema accepts the feature payloads (DL flags, Sub-DL FK, `sub_gl_config`, audit, approvals) + backfill. |
| **Code Review** | `tsc --noEmit` (0 errors in `finance/coa`) + manual review | API routes, explorer/inspector/modals wiring, audit-on-mutation. |
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
- **US-COA-10** — Audit Trail + Pending Approvals + Import/Export

## Results summary

**52 cases · 49 PASS · 0 FAIL · 3 NA (manual/browser)** · pass-rate 94.23% · status **PARTIAL**.

The 3 NA cases are visual/interaction parity checks that require a running browser
against a Supabase environment (not available in CI); they are listed for the
post-deploy manual pass. Everything logic-, schema-, and code-level was executed.

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
| TC-050–052 | US-COA-06/07/09 | visual parity vs prototype, keyboard nav, value-catalog drawer in browser | Manual | NA |

Full machine-readable ledger: `supabase/seed/qa_coa_seed.sql` (and the live rows on /finance/qa).
