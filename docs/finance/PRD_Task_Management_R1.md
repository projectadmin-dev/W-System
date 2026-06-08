# PRD & Task Management R1 — Migrasi Modul `/finance` ke Repository Baru

**Status:** Ready for execution by AI Agent · **Revision:** R1 (supersedes `PRD_Task_Management.md`)
**Owner doc set:** `docs/finance/` (18 module docs + 8 seeds + 2 forward-schema SQL)
**Source system:** W-System (Next.js 16 + Supabase Postgres 17, tenant `00000000-0000-0000-0000-000000000001`)
**Last updated:** 2026-06-08

> **Konteks (ID):** Seluruh modul `/finance` dipindahkan ke repository baru oleh AI Agent. R1 menambah tiga modul inti — **Journal + Auto-Journal Engine, Fiscal Periods, Cash/Bank Register** — termasuk **usulan arsitektur enhanced** untuk Cash Register (menjadi proyeksi dari seluruh journal entry + integrasi AR & AP). Bahasa teknis: Inggris (konsisten dengan dokumen SPEC/MIGRATION); istilah domain: Indonesia.

### What's new in R1
- **+3 documented modules:** Journal (+ config-driven auto-journal engine), Fiscal Periods, Cash/Bank Register.
- **Cash-Register enhanced architecture** (§7) — the integration design: register = projection of posted cash/bank journal lines, auto-fed by the engine for AR/AP/internal payments.
- **Phases re-sequenced** to put the **ledger (Journal + Periods)** as an explicit Phase 2 (it's the hub everything posts to).
- **`0002` forward-schema SQL** for the new modules' tables; backlog extended to **B-1…B-20**.

---

## Table of Contents

1. [Objective & Scope](#1-objective--scope)
2. [Source-of-Truth Documents](#2-source-of-truth-documents)
3. [Global Conventions (MUST READ FIRST)](#3-global-conventions-must-read-first)
4. [Module Dependency Map](#4-module-dependency-map)
5. [Development Sequence (Phases 0–5)](#5-development-sequence-phases-05)
6. [Per-Module Task Cards](#6-per-module-task-cards)
7. [Cash-Register Enhanced Architecture](#7-cash-register-enhanced-architecture)
8. [company_id / branch_id Rollout Plan](#8-company_id--branch_id-rollout-plan)
9. [Cross-Cutting Backlog](#9-cross-cutting-backlog)
10. [Definition of Done](#10-definition-of-done)
11. [Risks & Open Questions](#11-risks--open-questions)

---

## 1. Objective & Scope

Migrate the documented `/finance` modules into a clean new repository, preserving behaviour + data shape, introducing per-company/per-branch isolation, and **closing the integration gaps** (the ledger as the single source of truth; cash-register fed from it).

**In scope (9 documented modules):**
1. **Chart of Account (COA)** · 2. **Permintaan Uang & Pembayaran** · 3. **Accounts Receivable (AR)** · 4. **Account Payable (AP)** · 5. **Vendor Master** · 6. **Laporan Keuangan** · 7. **Journal + Auto-Journal Engine** *(R1)* · 8. **Fiscal Periods** *(R1)* · 9. **Cash/Bank Register** *(R1)*.

**Prerequisites (carried, not re-specced):** `tenants`, `entities`(→companies), `branches`, `user_profiles`, `projects`, `clients`, `cost_center_*` (org structure).

**Out of scope:** expenses, payment vouchers, receipts, bank reconciliation, after-sales — migrate later with the same pattern.

---

## 2. Source-of-Truth Documents

| Module | SPEC | MIGRATION (+ Appendix A seed, Appendix B company/branch) | Standalone seed |
|---|---|---|---|
| COA | `FINANCE-CHART_OF_ACCOUNT-SPEC.md` | `FINANCE-CHART_OF_ACCOUNT-MIGRATION.md` | `coa_full_seed.sql` (170) |
| Permintaan Uang | `FINANCE-PERMINTAAN_UANG-SPEC.md` | `FINANCE-PERMINTAAN_UANG-MIGRATION.md` | `permintaan_uang_seed.sql` |
| AR | `FINANCE-AR-SPEC.md` | `FINANCE-AR-MIGRATION.md` | `ar_seed.sql` |
| AP | `FINANCE-ACCOUNT_PAYABLE-SPEC.md` | `FINANCE-ACCOUNT_PAYABLE-MIGRATION.md` | `account_payable_seed.sql` |
| Vendor | `FINANCE-VENDOR-SPEC.md` | `FINANCE-VENDOR-MIGRATION.md` | (none — empty) |
| Laporan Keuangan | `FINANCE-LAPORAN_KEUANGAN-SPEC.md` | `FINANCE-LAPORAN_KEUANGAN-MIGRATION.md` | `lk_reports_seed.sql` (3/52/141) |
| **Journal** *(R1)* | `FINANCE-JOURNAL-SPEC.md` | `FINANCE-JOURNAL-MIGRATION.md` | `journal_automation_seed.sql` (5 cfg / 16 lines) |
| **Fiscal Periods** *(R1)* | `FINANCE-PERIODS-SPEC.md` | `FINANCE-PERIODS-MIGRATION.md` | `periods_seed.sql` (3) |
| **Cash Register** *(R1)* | `FINANCE-CASH_REGISTER-SPEC.md` | `FINANCE-CASH_REGISTER-MIGRATION.md` | `cash_register_seed.sql` |

**Forward-schema SQL:** `docs/finance/new-repo/0001_finance_add_company_branch.sql` (21 tables, v1 modules + journal/period tables) **and** `0002_finance_add_company_branch_journal_cashreg.sql` (9 more: journal config/cost-center-link/error-log + cash-register stack).

---

## 3. Global Conventions (MUST READ FIRST)

### 3.1 Tenancy & isolation
- Keep `tenant_id` on every table. Add **`company_id`/`branch_id`** (nullable, no FK first pass) to every finance table — `company → entities`(PT), `branch → branches`. FK + index + RLS = Phase 5.
- **`cash_register_entries` has no `tenant_id` today** — add `tenant_id` + company/branch together and enable real RLS.

### 3.2 The ledger is the source of truth
- **All money movement posts a balanced journal** via the config-driven engine (`konfigurasi_jurnal`), not ad-hoc balance mutations. AR/AP/internal payments already do (`AR-PAY-RCV`/`AP-PAY`/`PMB-INTERNAL`).
- **Cash/bank balances derive from posted `journal_lines` on COA `1-10001*`/`1-10002*`** — the cash-flow report already proves this. Cash-Register becomes a projection (§7), not a parallel ledger.
- **Posted journals are immutable**; correct via reversal (`/reverse-source`). Preserve the immutability + balance triggers.

### 3.3 Identity, audit, numbering, money, tax
- PK uuid; audit `created_at/updated_at/created_by/deleted_at`; soft delete.
- Replace `count(*)+1` document numbers (`JE-/PU-/PAY-/AP-/INV-/VND-`) with real sequences (race/gap-prone today).
- Derived amounts via DB generated columns; PPN 11% (hardcoded); PPh at payment, server-computed, optional lines vanish at 0; IDR only (multi-currency deferred).

### 3.4 Auth, RBAC & RLS
- Today most routes use the **service-role admin client + hardcoded tenant/user, no auth**, and several RLS policies are `USING(true)`. The new repo must add **real auth + tenant/company/branch resolution + RLS** (Phase 5).

### 3.5 Accounting backbone
- COA `enum_*` classification drives all reports — migrate COA first and keep it complete.
- **Implement period close→approve→snapshot/lock** (currently unbuilt) so opening balances + period locks actually work.

---

## 4. Module Dependency Map

```
   tenants · entities(company) · branches · user_profiles · projects · clients · cost_center_*   (Phase 0)
                                          │
                            ┌─────────────┴───────────────┐
                            ▼                             ▼
                     COA (classification)            Vendor master
                            │                             │
              ┌─────────────┴─────────────────────────────┤
              ▼                                            ▼
   Journal + Auto-Journal Engine  ◄───────────────  Fiscal Periods        (Phase 2 — the LEDGER)
   (konfigurasi_jurnal)                              (status / approval)
              ▲  posts cash/bank + Dr/Cr for:                 │ close→approve writes snapshots/locks
              │                                               ▼
   ┌──────────┼───────────────┬───────────────┐       Laporan Keuangan (reads journals+COA+snapshots)
   ▼          ▼               ▼               ▼               │  (Phase 4)
  AR        AP        Permintaan Uang/      (manual                ▼
(receipt) (payment)    Pembayaran            journals)     Cash/Bank Register = projection of
   └──────────┴───────────────┴──────────────┘            posted cash/bank journal lines (Phase 4)
                       (Phase 3 — transactions)                    │
                                                                   ▼
                              company/branch FK + RLS + Auth/RBAC + backlog  (Phase 5)
```

---

## 5. Development Sequence (Phases 0–5)

### Phase 0 — Foundation & conventions
- [ ] Scaffold repo + Supabase; create prerequisite tables (`tenants`, `entities`, `branches`, `user_profiles`, `projects`, `clients`, `cost_center_*`).
- [ ] Shared migration template (§3.1–3.3); port `lib/finance/tenant.ts`, money/format utils.
- **Gate:** prereqs exist; tenant/company/branch resolvable for a user.

### Phase 1 — Master data
- [ ] **COA** (+ classification, import/export); load `coa_full_seed.sql`; pass `coa-logic` + `coa-import` tests.
- [ ] **Vendor** (backfill from AP free-text if desired).
- **Gate:** COA tree + complete `enum_*`; 36+54 logic tests pass.

### Phase 2 — Core ledger (Journal + Periods) ⭐ R1
- [ ] **Journal**: `journal_entries`/`journal_lines` + balance & posted-immutability triggers; manual CRUD/post/void/reverse.
- [ ] **Auto-Journal Engine**: `konfigurasi_jurnal`(+detail) + pure `journal-engine-core` + `processJournalAutomation`; load `journal_automation_seed.sql`; unit-test the 5 use cases (PPh on/off) + idempotency + error paths.
- [ ] **Fiscal Periods**: `fiscal_periods` + `assign_fiscal_period`; load `periods_seed.sql`. **Implement close→approve→snapshot/lock** (B-7) and fix the close/reopen UI/API contract (B-14).
- [ ] Load `lk_reports_seed.sql` (entries/lines).
- **Gate:** posted journals balance; engine auto-posts a balanced journal for each of the 5 events; period approve writes `trial_balance_snapshots` + `fiscal_period_journal_locks`.

### Phase 3 — Transactions
- [ ] **AR** (receipt → `AR-PAY-RCV`), **AP** (approve → `AP-BILL-RCV`, pay → `AP-PAY`; import `ap-logic`), **Permintaan Uang/Pembayaran** (execute → `PMB-INTERNAL`). Load their seeds.
- **Gate:** each create→approve→pay posts the correct balanced journal; cash/bank legs land on `1-1000x`.

### Phase 4 — Reporting + Cash projection ⭐ R1
- [ ] **Laporan Keuangan** — live `report-engine.ts` (enum-driven; now backed by real snapshots from Phase 2). Drop the legacy `reports/*` stack.
- [ ] **Cash/Bank Register** — build the **`v_cash_register` projection** over posted cash/bank journal lines (§7); repoint the API; retire the 3 legacy ad-hoc writers.
- **Gate:** Neraca balanced; `v_cash_register` per-account totals reconcile to COA cash/bank balances; AR receipt shows IN, AP/internal payment shows OUT automatically.

### Phase 5 — Isolation & hardening
- [ ] Apply `0001` + `0002` (company/branch columns) → backfill → FK + indexes → **RLS** on every finance table (+ `tenant_id` on `cash_register_entries`).
- [ ] **Auth + RBAC** (remove hardcoded tenant + service-role-everywhere). Work backlog §9.
- **Gate:** company A cannot read company B's finance rows; no unauthenticated admin-client route.

---

## 6. Per-Module Task Cards

(v1 cards for COA, Permintaan Uang, AR, AP, Vendor, Laporan Keuangan are unchanged — see their SPEC/MIGRATION. R1 adds:)

### 6.7 Journal + Auto-Journal Engine
- **Docs:** Journal SPEC+MIGRATION. **Tables:** journal_entries, journal_lines, journal_line_cost_centers, konfigurasi_jurnal(+detail), jurnal_error_log. **Seed:** `journal_automation_seed.sql` (config) + `lk_reports_seed.sql` (entries/lines).
- **Depends on:** COA, Fiscal Periods. **Acceptance:** balanced manual entries; post/void/reverse; engine auto-posts the 5 use cases (idempotent, non-blocking, balanced); config CRUD.
- **Fixes (backlog):** write `posted_at` (B-15); tenant-scope `konfigurasi_*`/`jurnal_error_log` RLS (B-16); real `entry_number` sequence (B-3); populate `journal_line_cost_centers` or drop it; import engine in any new caller; respect PPh deploy-order.

### 6.8 Fiscal Periods
- **Docs:** Periods SPEC+MIGRATION. **Tables:** fiscal_periods, trial_balance_snapshots, fiscal_period_journal_locks. **Seed:** `periods_seed.sql`.
- **Depends on:** Journal. **Acceptance:** create/close/reopen works **from the UI**; approve writes snapshots + locks; reports use real saldo awal.
- **Fixes:** implement approve→snapshot/lock (B-7); fix close/reopen param-vs-body + missing reopen columns + list `data.data` mismatch + `period_type`/`status` enum mismatches (B-14); tighten `assign_fiscal_period` (B-17).

### 6.9 Cash/Bank Register
- **Docs:** Cash Register SPEC (§5 target) + MIGRATION. **Tables:** cash_register_entries, money_requests, bank_accounts, petty_cash_*. **Seed:** `cash_register_seed.sql`.
- **Depends on:** Journal (cash/bank lines), AR/AP/Pembayaran (Phase 3). **Acceptance:** register reflects every posted cash/bank journal line; AR receipt=IN, AP/internal=OUT automatically; per-account balances reconcile to COA; opening balances.
- **Fixes:** build the projection §7; consolidate duplicate `bank_accounts` (B-18); add `tenant_id`+RLS (B-19); retire legacy writers (B-6/B-20); fix `money_requests.purpose_type` malformed enum.

---

## 7. Cash-Register Enhanced Architecture

**Problem:** `cash_register_entries` is today a standalone, manual, single-global-balance ledger with no link to the GL, COA, or the AR/AP modules. Meanwhile the auto-journal engine already posts correct cash/bank Dr/Cr lines for AR receipts, AP payments, and internal disbursements.

**Target principle:** the **general ledger is the single source of truth**; the Cash/Bank Register is a **projection of posted `journal_lines` on cash/bank COA** (`1-10001*` Kas, `1-10002*` Bank).

**Design (see Cash Register SPEC §5 for detail):**
- **Projection** `v_cash_register`: each posted cash/bank journal line → an entry; `entry_type = debit>0 ? 'in' : 'out'`; `amount = debit+credit`; `account = coa_id`; date/desc/source from `journal_entries`; `running_balance = SUM(debit−credit) OVER (PARTITION BY coa_id ORDER BY date, created_at)`. Implement as a VIEW (cleanest) or a trigger-materialized mirror if annotations/attachments are needed (then each row links a `journal_line_id`).
- **Account dimension:** replace free-text `account_name` with `coa_id` / `bank_account_id` (FK). Per-account balances reconcile to the cash-flow report.
- **Module integration is already wired at the journal layer** — no new writers needed: AR `AR-PAY-RCV` → IN; AP `AP-PAY` → OUT; Pembayaran `PMB-INTERNAL` → OUT; manual journals on `1-1000x` → IN/OUT.
- **Migration path:** (1) `coa.is_cash_account` (or code prefix) + consolidate `bank_accounts`; (2) build `v_cash_register` + repoint API (per-account, date-aware, authed); (3) convert the 3 legacy writers to post journals; (4) `tenant_id`+RLS + opening-balance journals; (5) reconcile petty-cash/bank balances to COA.

**Acceptance:** `SUM(v_cash_register)` per `coa_id` == COA cash/bank balance from posted journals; AR/AP/internal payments appear automatically; no ad-hoc balance mutation outside the GL.

---

## 8. `company_id` / `branch_id` Rollout Plan

| Step | When | Action |
|---|---|---|
| **A. Add columns** | Phase 5 start | Run `0001_…sql` (21 tables) **and** `0002_…sql` (9 tables) — nullable `company_id`/`branch_id`. Seeds load unchanged (NULL). |
| **B. Backfill** | Phase 5 | Populate from owning `entities`/company; default single-company installs to the primary entity. Add `tenant_id` to `cash_register_entries` here too. |
| **C. Constrain** | Phase 5 | FKs (`company_id → companies/entities(id)`, `branch_id → branches(id)`) + indexes `(tenant_id, company_id)`. |
| **D. RLS** | Phase 5 | Policies filtering tenant + company (+ branch) on every finance table; enable RLS where currently `USING(true)`. |

**30 tables total** carry the columns: 21 in `0001` (6 v1 modules + journal_entries/journal_lines + the 3 period tables) + 9 in `0002` (journal config/cost-center-link/error-log + cash-register stack). Each MIGRATION doc's **Appendix B** lists its module's tables.

---

## 9. Cross-Cutting Backlog

| ID | Issue | Severity | Module(s) |
|---|---|---|---|
| **B-1** | No auth/RBAC; service-role admin client + hardcoded tenant everywhere | High | all |
| **B-2** | RLS disabled / `USING(true)` on several tables (coa audit/approval/sub_gl, ar_*, konfigurasi_*, jurnal_error_log, cash_register) | High | COA, AR, Journal, Cash Reg |
| **B-3** | `count(*)+1` document numbers — race/gap-prone | Medium | PU, AP, AR, Vendor, Journal |
| **B-4** | Mock/prototype pages as real: `/finance/ar-aging`, `/finance/ap-aging` | Medium | AR, AP |
| **B-5** | Orphaned/stub APIs: `/api/finance/ar-aging`, `/api/finance/ap-aging` | Medium | AR, AP |
| **B-6** | `fin_vendors` orphaned; AP vendor free-text; cash-register legacy writers post no journals | Medium | Vendor, AP, Cash Reg |
| **B-7** | Period close/approve never writes `trial_balance_snapshots`/`fiscal_period_journal_locks` | High (reporting) | Periods, Laporan Keuangan |
| **B-8** | Two report engines; legacy `reports/*` won't balance + module-scope admin client crashes builds | Medium | Laporan Keuangan |
| **B-9** | AP routes re-inline engine math instead of importing `ap-logic.ts` | Low | AP |
| **B-10** | PU `/execute` no status guard / no reconciliation | Medium | PU |
| **B-11** | Unescaped PostgREST `.or()` search interpolation | Low | PU, AR, Vendor |
| **B-12** | PPN 11% hardcoded; PPh largely inert; no multi-currency | Low | AR, AP, Journal |
| **B-13** *(R1)* | Cash-register orphaned from GL/AR/AP; single global balance; free-text account | High | Cash Reg |
| **B-14** *(R1)* | Periods close/reopen broken from UI (param vs body); reopen writes non-existent columns; list `data.data` + enum mismatches | Medium | Periods |
| **B-15** *(R1)* | `journal_entries.posted_at` never written; `'reversed'` status dead; `/reverse` leaves unposted draft | Low | Journal |
| **B-16** *(R1)* | `konfigurasi_*` + `jurnal_error_log` RLS `USING(true)`, no `tenants` FK | High | Journal |
| **B-17** *(R1)* | `assign_fiscal_period` lenient (posts to `soft_close`/NULL period) | Medium | Periods, Journal |
| **B-18** *(R1)* | `bank_accounts` defined twice (one lacks `coa_id`); `cash_register_entries`/`money_requests` duplicate migrations | Medium | Cash Reg |
| **B-19** *(R1)* | `cash_register_entries` has no `tenant_id` | High | Cash Reg |
| **B-20** *(R1)* | Two money-request stacks + three unreconciled balance stores (register / custodian / GL) | Medium | Cash Reg, PU |

---

## 10. Definition of Done

- [ ] All 9 modules build + run in the new repo on a fresh Supabase.
- [ ] All seeds load (COA 170; AR 4/13/7; AP 28+; PU 3/3/3/1; LK 3/52/141; journal cfg 5/16; periods 3; cash-register 1+1).
- [ ] Logic tests pass (COA 36+54; AP engine; journal-engine-core for the 5 use cases).
- [ ] Journal: 5 auto-journal events post balanced journals; reversal works.
- [ ] Periods: approve writes snapshots + locks; LK Neraca balanced; numbers match QA baseline.
- [ ] Cash-Register projection reconciles to COA cash/bank; AR/AP/internal payments reflected automatically.
- [ ] `company_id`/`branch_id` on all 30 tables; backfilled; FK + RLS enforced; `cash_register_entries` has `tenant_id`.
- [ ] No finance route uses an unauthenticated admin client.
- [ ] High backlog (B-1, B-2, B-7, B-13, B-16, B-19) resolved or signed-off as deferred.

---

## 11. Risks & Open Questions

1. **company ↔ tenant** — confirmed: keep `tenant_id`; `company_id ≈ entities` (PT), `branch_id ≈ branches`. Rename target if the new repo uses `companies`.
2. **Single vs multi-company backfill** — which entity owns historical finance rows? (default single → primary entity.)
3. **Child-table scoping** — columns added to child/line tables too; switch to parent-only if preferred before Phase 5-C.
4. **Cash-register: VIEW vs materialized mirror** — VIEW is cleanest (always consistent); choose a mirror only if manual annotations/attachments per entry are required.
5. **Period-close is a prerequisite** for correct cross-period opening balances (B-7) — must land in Phase 2.
6. **Legacy stack retirement** — converting `money_requests`/`vendor_bills`/`payment_vouchers` writers to journals (B-6/B-20) may need data migration for existing rows.
7. **PPh deploy-order coupling** — apply the PPh config migrations after the matching route code, else journals skip silently.
