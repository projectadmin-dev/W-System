# PRD & Task Management — Migrasi Modul `/finance` ke Repository Baru

**Status:** Ready for execution by AI Agent
**Owner doc set:** `docs/finance/` (12 module docs + 5 seeds + 1 forward-schema SQL)
**Source system:** W-System (Next.js 16 + Supabase Postgres 17, tenant `00000000-0000-0000-0000-000000000001`)
**Last updated:** 2026-06-08

> **Konteks (ID):** Seluruh modul `/finance` akan dipindahkan ke repository baru oleh AI Agent. Dokumen ini adalah **urutan development** + acceptance criteria agar migrasi terurut, lengkap, dan aman. Bahasa teknis ditulis dalam Inggris agar konsisten dengan 12 dokumen SPEC/MIGRATION; istilah domain tetap Bahasa Indonesia.

---

## Table of Contents

1. [Objective & Scope](#1-objective--scope)
2. [Source-of-Truth Documents](#2-source-of-truth-documents)
3. [Global Conventions (MUST READ FIRST)](#3-global-conventions-must-read-first)
4. [Module Dependency Map](#4-module-dependency-map)
5. [Development Sequence (Phases 0–5)](#5-development-sequence-phases-05)
6. [Per-Module Task Cards](#6-per-module-task-cards)
7. [company_id / branch_id Rollout Plan](#7-company_id--branch_id-rollout-plan)
8. [Cross-Cutting Backlog (known issues to fix)](#8-cross-cutting-backlog-known-issues-to-fix)
9. [Definition of Done](#9-definition-of-done)
10. [Risks & Open Questions](#10-risks--open-questions)

---

## 1. Objective & Scope

Migrate the six documented `/finance` modules from W-System into a clean new repository, preserving behaviour and data shape, while introducing **per-company / per-branch data isolation** (`company_id` + `branch_id`).

**In scope (the 6 documented modules):**

1. **Chart of Account (COA)** — 5-layer master + import/export + audit.
2. **Permintaan Uang & Pembayaran** — money-request → approval → payment.
3. **Accounts Receivable (AR)** — project receivables, invoices, payments, aging.
4. **Account Payable (AP)** — vendor bills, approval workflow, aging, GL posting.
5. **Vendor Master** — supplier master data.
6. **Laporan Keuangan** — PSAK statements (IS/BS/CF/EQ/TB/BB/GL).

**Explicitly carried as dependencies (not re-specced here, but required to exist):** `tenants`, `entities` (→ companies), `branches`, `user_profiles`, `projects`, `clients`, and the **journal** core (`journal_entries`, `journal_lines`) + **fiscal periods** that COA/AP/Laporan Keuangan rely on.

**Out of scope:** other finance surfaces not documented (expenses, cost centers, petty cash, payment vouchers, receipts, bank reconciliation) — migrate later using the same pattern.

---

## 2. Source-of-Truth Documents

For each module read the SPEC (what/why/contract) **and** the MIGRATION (schema, ADRs, anti-patterns, dataseed). All under `docs/finance/`.

| Module | SPEC | MIGRATION (+ Appendix A seed, Appendix B company/branch) | Standalone seed |
|---|---|---|---|
| COA | `FINANCE-CHART_OF_ACCOUNT-SPEC.md` | `FINANCE-CHART_OF_ACCOUNT-MIGRATION.md` | `supabase/seed/coa_full_seed.sql` (170 rows) |
| Permintaan Uang | `FINANCE-PERMINTAAN_UANG-SPEC.md` | `FINANCE-PERMINTAAN_UANG-MIGRATION.md` | `supabase/seed/permintaan_uang_seed.sql` |
| AR | `FINANCE-AR-SPEC.md` | `FINANCE-AR-MIGRATION.md` | `supabase/seed/ar_seed.sql` |
| AP | `FINANCE-ACCOUNT_PAYABLE-SPEC.md` | `FINANCE-ACCOUNT_PAYABLE-MIGRATION.md` | `supabase/seed/account_payable_seed.sql` |
| Vendor | `FINANCE-VENDOR-SPEC.md` | `FINANCE-VENDOR-MIGRATION.md` | (none — table empty; backfill playbook in Appendix A) |
| Laporan Keuangan | `FINANCE-LAPORAN_KEUANGAN-SPEC.md` | `FINANCE-LAPORAN_KEUANGAN-MIGRATION.md` | `supabase/seed/lk_reports_seed.sql` |

**Forward-schema SQL (all modules):** `docs/finance/new-repo/0001_finance_add_company_branch.sql` — adds `company_id`/`branch_id` to all 21 tables (nullable, no FK). Copy into the new repo's `supabase/migrations/` with that repo's timestamp.

QA references: `docs/qa/coa-test-plan.md`, `docs/qa/account-payable-test-plan.md`, `docs/qa/laporan-keuangan-test-plan.md`; logic tests `apps/web/lib/__tests__/coa-logic.test.ts`, `coa-import.test.ts`, `ap-logic.test.ts`.

---

## 3. Global Conventions (MUST READ FIRST)

These apply to **every** finance table/module in the new repo.

### 3.1 Tenancy & isolation
- **Keep `tenant_id`** on every table (unchanged).
- **Add `company_id uuid` + `branch_id uuid`** to every finance table — **nullable, no FK, no index, no RLS in this first pass** (see §7 for the phased hardening).
  - `company_id` → **company / PT** (legal entity). W-System reference table: `public.entities` (e.g. live rows *"WIT WORKSHOP"*, *"Divisi Technology"*). The new repo may name this `companies`.
  - `branch_id` → **branch / kantor cabang**. W-System reference table: `public.branches` (has `entity_id`, `is_headquarters`).
- Isolation intent: a user only sees data for their company (and optionally branch). Enforced later via FK + RLS (Phase 5), not now.

### 3.2 Identity, audit & soft delete
- PK `id uuid DEFAULT gen_random_uuid()`.
- Audit columns: `created_at`, `updated_at`, `created_by`, `deleted_at` (soft delete via `deleted_at`; all list reads filter `deleted_at IS NULL`).
- Document numbers (`PU-`, `PAY-`, `AP-`, `INV-`, `JE-`, `VND-`): **replace the legacy `count(*)+1` generation with a real sequence / `doc_sequences`** — the count approach is race- and gap-prone (see backlog B-3).

### 3.3 Money & tax
- Amounts `NUMERIC(…,2)` (or `(24,6)` for AR). Prefer **DB generated columns** for derived amounts (AR `total_piutang`/`sisa_piutang`, AP `amount_due`, item `subtotal`).
- PPN is **11%** (currently hardcoded). Tax-withholding (PPh) columns exist but logic is mostly inert — carry the columns; treat PPh logic as future work.
- Currency: IDR default; multi-currency is not implemented (`amount_base` is a stub).

### 3.4 Auth, RBAC & RLS
- W-System routes use the **service-role admin client with a hard-coded tenant and no auth** — this is the single biggest gap. In the new repo, **add real auth + tenant/company/branch resolution + RLS** (Phase 5). Until then, replicate behaviour but gate behind auth.

### 3.5 Accounting integrity
- COA `enum_*` classification (`enum_laporan_keuangan`, `enum_laporan_keuangan_category`, `enum_cf_section`, `contra_account`, `normal_balance`, cash-flow attrs) is the **backbone of all reports** — migrate COA + its classification first and keep it complete.
- Journals are **posted-immutable** (triggers `prevent_posted_modification` / `prevent_posted_lines_modification`). Preserve these.

---

## 4. Module Dependency Map

```
                 tenants · entities(company) · branches · user_profiles · projects · clients   (Phase 0 prereqs)
                                              │
                                   ┌──────────┴───────────┐
                                   ▼                      ▼
                         COA (classification)        Vendor master
                                   │                      │ (optional link)
                 ┌─────────────────┼──────────────────────┤
                 ▼                 ▼                       ▼
        Journal + Fiscal     AR (no GL)            AP (posts to Journal on approve)
        periods (ledger)         │                       │
                 │               (Permintaan Uang / Pembayaran — no GL)
                 ▼
        Laporan Keuangan (reads Journal + COA + periods + snapshots)
                 │
                 ▼
        company_id/branch_id FK + RLS + Auth/RBAC  (Phase 5 hardening)
```

**Rule of thumb:** master data → ledger → transactions → reporting → isolation/hardening.

---

## 5. Development Sequence (Phases 0–5)

Execute phases in order. Each phase has an exit gate; do not start the next phase until the gate passes.

### Phase 0 — Foundation & conventions
- [ ] Scaffold the new repo (Next.js 16 + shadcn/ui + Tailwind v4 + Supabase), Turborepo if applicable.
- [ ] Provision Supabase; create the **prerequisite tables** the finance FKs need: `tenants`, `entities` (companies), `branches`, `user_profiles`, `projects`, `clients`.
- [ ] Adopt the global conventions (§3) as a shared migration template: `id`, audit cols, soft delete, `tenant_id` + `company_id` + `branch_id`.
- [ ] Port shared helpers: `lib/finance/tenant.ts` (resolve tenant/company/branch), money/format utils.
- **Exit gate:** prerequisite tables exist; a smoke migration runs clean; a tenant/company/branch can be resolved for a logged-in user.

### Phase 1 — Master data
- [ ] **COA** — schema (38 cols), 5-layer logic (`coa-logic.ts`), import/export (`coa-import-schema.ts`), audit/companion tables; load `coa_full_seed.sql` (170 rows); run `coa-logic.test.ts` + `coa-import.test.ts`.
- [ ] **Vendor master** — `fin_vendors` schema; optionally run the Vendor backfill playbook (Vendor MIGRATION Appendix A) to populate from AP free-text names.
- **Exit gate:** COA tree renders; all `enum_*` populated (run COA verification queries); 36 + 54 logic tests pass.

### Phase 2 — Core accounting (ledger)
- [ ] **Journal** — `journal_entries`, `journal_lines` (+ posted-immutability triggers), `journal_line_cost_centers` if needed.
- [ ] **Fiscal periods** — `fiscal_periods` (+ `approval_status`), `trial_balance_snapshots`, `fiscal_period_journal_locks`.
- [ ] Load `lk_reports_seed.sql` (3 periods, 52 entries, 141 lines) — mind the posted-journal trigger note in the seed header.
- **Exit gate:** posted journals balance (Dr = Cr per entry); periods selectable; COA accounts referenced by journals all carry a statement classification.

### Phase 3 — Transactions
- [ ] **AR** — `ar_bank_accounts`, `ar_invoices` (generated money cols), `ar_payment_history`; recurring series; load `ar_seed.sql`.
- [ ] **AP** — `ap_invoices`/`items`/`approval_steps`; port `ap-logic.ts` (engine) and **import it in routes** (don't re-inline); best-effort GL posting on approve; load `account_payable_seed.sql`; run `ap-logic.test.ts`.
- [ ] **Permintaan Uang & Pembayaran** — 5 tables; submit/approve/reject + pay/execute; load `permintaan_uang_seed.sql`.
- **Exit gate:** create→approve→pay works per module; AP approval posts a balanced journal; AR generated totals consistent; PU `/execute` cascades to PAID.

### Phase 4 — Reporting
- [ ] **Laporan Keuangan** — port the **live** engine `report-engine.ts` (enum-driven; opening balances; period locks; contra/sign; current-earnings injection). Do **not** port the legacy `reports/*` stack (dead, won't balance).
- [ ] Implement period-close that **writes** `trial_balance_snapshots` + `fiscal_period_journal_locks` on APPROVED (currently missing — backlog B-7).
- **Exit gate:** IS waterfall correct; **Neraca balanced (selisih 0)**; CF/TB/GL render; matches the verified QA numbers (Laba Bersih 86,000,000 for FY2026-Q2).

### Phase 5 — Isolation & hardening
- [ ] Apply `0001_finance_add_company_branch.sql` (nullable `company_id`/`branch_id` on all 21 tables).
- [ ] **Backfill** company/branch from `entities`/`branches` ownership; then add FKs + indexes.
- [ ] Add **RLS policies** scoped by tenant + company (+ branch) on every finance table; enable RLS on the currently-exposed tables.
- [ ] Add **auth + RBAC** (replace hard-coded tenant + service-role-everywhere).
- [ ] Work the cross-cutting backlog (§8).
- **Exit gate:** a user in company A cannot read company B's finance rows; RLS verified; no route uses an unauthenticated admin client.

---

## 6. Per-Module Task Cards

Each card: source docs · tables · seed · dependencies · acceptance · module-specific fixes.

### 6.1 COA
- **Docs:** COA SPEC + MIGRATION. **Tables:** `coa` (+ `coa_audit_log`, `coa_pending_approval`, `coa_sub_gl_value`). **Seed:** `coa_full_seed.sql`.
- **Depends on:** tenant/company/branch. **Acceptance:** 5-layer tree; import xlsx with auto-infer; export round-trips; audit log on mutations; logic tests green.
- **Fixes:** none critical; keep `enum_*` complete.

### 6.2 Permintaan Uang & Pembayaran
- **Docs:** PU SPEC + MIGRATION. **Tables:** `permintaan_uang`, `permintaan_uang_items`, `pu_approval_steps`, `pembayaran`, `pembayaran_biaya_lain`. **Seed:** `permintaan_uang_seed.sql`.
- **Depends on:** `projects`, `user_profiles`, `coa`. **Acceptance:** DRAFT→submit→approve/reject; payment only vs APPROVED request; `/execute` → both PAID.
- **Fixes:** add `/execute` status guard; sequence-based doc numbers; consider GL posting (today none).

### 6.3 AR
- **Docs:** AR SPEC + MIGRATION. **Tables:** `ar_bank_accounts`, `ar_invoices`, `ar_payment_history`. **Seed:** `ar_seed.sql`.
- **Depends on:** `projects`, `clients`, `user_profiles`, `coa`. **Acceptance:** one-time + recurring invoices; partial/full payment with history + overpay block; KPIs/DSO; aging.
- **Fixes:** replace the mock `ar-aging` page with the live aging; remove/!use the orphaned `/api/finance/ar-aging`; derive `status_bayar`/overdue consistently; wrap recurring create in a transaction.

### 6.4 AP
- **Docs:** AP SPEC + MIGRATION + `ap-logic.ts`. **Tables:** `ap_invoices`, `ap_invoice_items`, `ap_approval_steps`. **Seed:** `account_payable_seed.sql`.
- **Depends on:** `coa` (acct `2-10100` + an expense acct for GL), `projects`, journal, `fin_vendors` (optional). **Acceptance:** state machine; partial/full pay; aging + forecast; approval posts a balanced journal; `ap-logic.test.ts` green.
- **Fixes:** import the engine in `/pay`, PATCH, `/approve` (stop inlining); replace the mock `ap-aging` page + zero-stub API; wire `vendor_id` to the Vendor master; surface GL `warning`.

### 6.5 Vendor
- **Docs:** Vendor SPEC + MIGRATION. **Tables:** `fin_vendors`. **Seed:** none (empty) — use the backfill playbook.
- **Depends on:** `coa` (optional `coa_id`). **Acceptance:** CRUD + filters; vendors populated and **linked into AP** (`ap_invoices.vendor_id`).
- **Fixes:** add CHECK constraints to match UI enums; per-tenant `vendor_code` uniqueness + sequence; server-side search/paging; honour soft-delete copy.

### 6.6 Laporan Keuangan
- **Docs:** LK SPEC + MIGRATION. **Reads:** `journal_entries`, `journal_lines`, `coa`, `fiscal_periods`, `trial_balance_snapshots`, `fiscal_period_journal_locks`. **Seed:** `lk_reports_seed.sql`.
- **Depends on:** COA classification + Journal + Fiscal periods (Phases 1–2). **Acceptance:** all 7 reports; Neraca balances; comparison columns; matches QA numbers.
- **Fixes:** implement snapshot/lock population on period-approval; drop the legacy `reports/*` stack; remove module-scope admin client; add CSV/Excel export (currently print-only).

---

## 7. `company_id` / `branch_id` Rollout Plan

Phased to stay safe; only step A happens in the first migration pass.

| Step | When | Action |
|---|---|---|
| **A. Add columns** | Phase 5 start | Run `0001_finance_add_company_branch.sql` — nullable `company_id`/`branch_id` on all 21 tables. No FK/index/RLS. Existing seeds load unchanged (NULL). |
| **B. Backfill** | Phase 5 | Populate `company_id` (from the owning `entities`/company) and `branch_id` where known. Default single-company installs to the primary entity. |
| **C. Constrain** | Phase 5 | Add FKs (`company_id → companies/entities(id)`, `branch_id → branches(id)`), indexes on `(tenant_id, company_id)` / `(company_id, branch_id)`, and (optionally) `NOT NULL` once backfilled. |
| **D. RLS** | Phase 5 | RLS policies filtering by tenant + company (+ branch); enable RLS on finance tables. |

**21 tables covered** (per the combined SQL): COA 4, PU 5, AR 3, AP 3, Vendor 1, Laporan Keuangan sources 5. Child/line tables also carry the columns (explicit isolation, simpler RLS — no parent join needed). Each module's MIGRATION **Appendix B** has the module-scoped ALTER block.

---

## 8. Cross-Cutting Backlog (known issues to fix)

Surfaced during documentation; fold into the migration (mostly Phase 5).

| ID | Issue | Severity | Where |
|---|---|---|---|
| **B-1** | No auth/RBAC; service-role admin client + hard-coded tenant on every finance route | High | all modules |
| **B-2** | RLS disabled on `coa_audit_log`, `coa_pending_approval`, `coa_sub_gl_value` (+ `roles`, `user_profiles`, `doc_sequences`); permissive `USING(true)` on `ar_*` | High | COA, AR |
| **B-3** | Document numbers via `count(*)+1` — race/gap-prone | Medium | PU, AP, AR, Vendor |
| **B-4** | Mock/prototype pages presented as real: `/finance/ar-aging`, `/finance/ap-aging` (fixed "2026-04-22") | Medium | AR, AP |
| **B-5** | Orphaned/stub APIs: `/api/finance/ar-aging` (wrong table), `/api/finance/ap-aging` (zero stub over `contacts`) | Medium | AR, AP |
| **B-6** | `fin_vendors` orphaned/empty; AP vendor is free-text `pihak_ketiga`, `vendor_id` never set | Medium | Vendor, AP |
| **B-7** | `trial_balance_snapshots` / `fiscal_period_journal_locks` never written (no period-close population) | High (reporting) | Laporan Keuangan |
| **B-8** | Two report engines; legacy `reports/*` won't balance + module-scope admin client crashes builds without `SUPABASE_SERVICE_ROLE_KEY` | Medium | Laporan Keuangan |
| **B-9** | AP routes re-inline engine math (`/pay`, PATCH, `/approve`) instead of importing `ap-logic.ts` | Low | AP |
| **B-10** | PU `/execute` has no status guard / no undo; no nominal reconciliation vs request | Medium | PU |
| **B-11** | Unescaped PostgREST `.or()` search interpolation | Low | PU, AR, Vendor |
| **B-12** | PPN 11% hardcoded (SQL + client); PPh largely inert; no multi-currency | Low | AR, AP |

---

## 9. Definition of Done

The migration is complete when:

- [ ] All 6 modules build and run in the new repo against a fresh Supabase project.
- [ ] All seeds load cleanly (COA 170; AR 4/13/7; AP 28 + items/steps; PU 3/3/3/1; LK 3/52/141).
- [ ] Logic test suites pass (COA 36 + 54; AP engine).
- [ ] Laporan Keuangan: Neraca balanced; numbers match the QA baseline.
- [ ] `company_id`/`branch_id` present on all 21 tables; backfilled; FK + RLS enforced (Phase 5).
- [ ] No finance route uses an unauthenticated admin client; tenant/company/branch resolved from the session.
- [ ] Backlog B-1, B-2, B-7 (the High items) resolved or explicitly deferred with sign-off.

---

## 10. Risks & Open Questions

1. **company vs tenant semantics** — confirmed: `tenant_id` retained; `company_id` ≈ `entities` (PT), `branch_id` ≈ `branches`. If the new repo renames `entities` → `companies`, update the FK target in Phase 5.
2. **Single vs multi-company data** — live data is one tenant / two entities; backfill defaults need a decision (which entity owns historical finance rows?).
3. **Child-table scoping** — columns are added to child/line tables too. If the team prefers parent-only scoping (children inherit via join), drop the child columns before Phase 5-C.
4. **Journal ownership of company/branch** — a single journal entry may span companies in theory; confirm whether journals are strictly per-company (recommended) before enforcing NOT NULL.
5. **Period-close implementation** (B-7) is a prerequisite for correct opening balances across periods — schedule within Phase 4.
6. **PPh/withholding & multi-currency** — carried as columns only; confirm whether the new repo must implement them or keep deferred.
