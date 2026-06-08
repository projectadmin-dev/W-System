# FINANCE — Fiscal Periods / Tutup Buku — Full Specification

**Module:** Finance & Accounting → Period Management (Fiscal Periods / Tutup Buku)
**Route:** `/finance/periods`
**Stack:** Next.js 16 (App Router) · shadcn/ui · Tailwind v4 · Supabase Postgres 17
**Tenant:** `00000000-0000-0000-0000-000000000001`
**Last updated:** 2026-06-08

> Companion: **`FINANCE-PERIODS-MIGRATION.md`** — migration steps, ADRs, anti-patterns, dataseed (Appendix A) + company/branch note (Appendix B).

---

## ⚠️ Architectural note (read first)

The period module has **two state columns** and a **largely-unimplemented approval workflow**:

- **`status`** (`open | soft_close | closed`) — the **only** column the app actually mutates (via Close/Reopen).
- **`approval_status`** (`DRAFT | PENDING_APPROVAL | APPROVED | LOCKED`) — fully schematized + read by the reporting engine, but **never written by any code**. There is **no submit/approve/lock endpoint**.

Consequently **period close writes NO `trial_balance_snapshots` and NO `fiscal_period_journal_locks`** — the snapshot/lock tables exist and are read by `report-engine.ts`, but are never populated. Implementing this is the single most important enhancement for the new repo (PRD backlog **B-7**). The current UI Close/Reopen actions are also **broken** (param/body mismatch — see §7).

---

## Table of Contents

1. [Goal & Scope](#1-goal--scope) · 2. [User Stories](#2-user-stories) · 3. [Domain Model & Lifecycle](#3-domain-model--lifecycle) · 4. [Snapshot & Lock Behaviour](#4-snapshot--lock-behaviour) · 5. [Database Schema](#5-database-schema) · 6. [API Contract](#6-api-contract) · 7. [Known Gaps & Bugs](#7-known-gaps--bugs) · 8. [Target Enhancement](#8-target-enhancement-new-repo) · 9. [Testing](#9-testing)

---

## 1. Goal & Scope

Manage accounting periods (monthly/quarterly/annual): create periods, control whether journals may post into them, and (intended) close + approve a period so its ending balances become the next period's opening balances.

**In scope (implemented):** period CRUD; Close/Reopen of `status`; posting-date validation; period auto-assignment to journals via DB trigger.
**Schematized but NOT implemented:** the `approval_status` workflow (submit→approve→lock), `grace_days`, and the **population** of `trial_balance_snapshots` + `fiscal_period_journal_locks` on approval.

## 2. User Stories

| ID | Story | State |
|---|---|---|
| **US-PER-01** | Create/edit/delete fiscal periods (with date-overlap guard). | ✅ implemented (modal has enum bug, §7) |
| **US-PER-02** | Close an open period; reopen a closed one with a reason. | ⚠️ implemented in repo, **broken from UI** (§7) |
| **US-PER-03** | Block journal posting outside an open period. | ✅ via `validatePostingDate` + `assign_fiscal_period` trigger (lenient, §7) |
| **US-PER-04** | Approve/lock a period; snapshot ending balances; lock its journals. | ❌ **not implemented** (target, §8) |

## 3. Domain Model & Lifecycle

### 3.1 Two state columns
- **`status`** — `DEFAULT 'open'`, `CHECK IN ('open','soft_close','closed')`. App mutates only `open`↔`closed`; `soft_close` is dead.
- **`approval_status`** — `NOT NULL DEFAULT 'DRAFT'`, `CHECK IN ('DRAFT','PENDING_APPROVAL','APPROVED','LOCKED')`. **Never updated** — permanently `DRAFT`.

### 3.2 Implemented transitions (operate on `status` only)
```
open ──close (status='closed', closed_by/at)──► closed ──reopen (status='open', reason)──► open
```
- **Close** (`closeFiscalPeriod`): sets `status='closed'`, `closed_by`, `closed_at`. **No validation, no snapshot, no locks, no approval_status change.** Any authenticated user (no role check).
- **Reopen** (`reopenFiscalPeriod`): intends `status='open'` + reason/audit — but writes to columns `reopening_reason`/`reopened_by`/`reopened_at` that **do not exist** (runtime error, §7).

### 3.3 Intended (unbuilt) workflow
`DRAFT (open) → PENDING_APPROVAL → APPROVED (write snapshots + locks) → LOCKED`. Documented in the migration comments only; no code path performs submit/approve/lock.

### 3.4 Posting guards
- `validatePostingDate(date)` → error if no period covers the date or that period's `status !== 'open'`.
- DB trigger `assign_fiscal_period` auto-fills `journal_entries.fiscal_period_id` from a period with `status != 'closed'` (allows `soft_close`) and only `RAISE NOTICE` (not error) when none found → a journal can post with `fiscal_period_id = NULL`.
- Update blocked if the period has **posted** journals; delete blocked if **any** journal references it (soft delete).

## 4. Snapshot & Lock Behaviour

**Intended:** on APPROVED, write one `trial_balance_snapshots` row per COA (`saldo_akhir`) and lock the period's journals in `fiscal_period_journal_locks`; the reporting engine then uses the prior approved period's `saldo_akhir` as **saldo awal** and excludes journals locked to other periods.

**Actual:** nothing writes these tables. `report-engine.ts` reads them (it's built), but they're always empty, so:
- Opening balances always fall back to `BEGINNING_BALANCE` journals.
- The journal lock-exclusion `NOT IN (…)` list is always empty (no double-count protection).

→ **Closing a period currently has zero effect on financial reports.**

## 5. Database Schema

Base table in `20260421015823_create_journal_entries.sql`; approval columns in `20260528000005_fiscal_period_approval.sql`; snapshot/lock tables in `20260528000006_period_locks_trial_balance.sql`.

### 5.1 `fiscal_periods`
`id`, `tenant_id` (FK→tenants CASCADE), `period_name`, `period_type` (`CHECK monthly|quarterly|annual`), `start_date`, `end_date`, `status` (`CHECK open|soft_close|closed`, default `open`), `closed_at`/`closed_by`/`close_notes`, audit (`created_at`/`updated_at`/`created_by`/`updated_by`/`deleted_at`). **Added by …0005:** `approval_status` (`CHECK DRAFT|PENDING_APPROVAL|APPROVED|LOCKED`), `grace_days` (`>=0`), `is_grace_allowed`, `submitted_by/at`, `approved_by/at`, `locked_by/at`, `approval_notes`. Constraint `chk_fiscal_period_dates (end_date >= start_date)`.
- Indexes: tenant; `(tenant_id,start_date,end_date)`; `(tenant_id,status) WHERE deleted_at IS NULL`; `(tenant_id,approval_status) WHERE deleted_at IS NULL`. Trigger `fiscal_periods_updated_at`.
- RLS: `finance_manage_fiscal_periods` (finance/cfo/admin/super_admin) + `others_read_fiscal_periods` (read) — **bypassed** by the service-role client.
- **Columns referenced by code but absent in schema:** `entity_id`, `reopening_reason`, `reopened_by`, `reopened_at` (cause no-op filters / runtime errors — §7).

### 5.2 `trial_balance_snapshots`
`id`, `tenant_id` (FK CASCADE), `fiscal_period_id` (FK), `coa_id` (FK), `saldo_akhir numeric(20,4)` (signed), `saldo_akhir_base numeric(20,4)` (IDR), `created_at`, `created_by`. **UNIQUE (fiscal_period_id, coa_id)**. RLS: manage (finance roles) + read-all. **0 rows (never written).**

### 5.3 `fiscal_period_journal_locks`
`id`, `tenant_id` (FK CASCADE), `journal_entry_id` (FK), `fiscal_period_id` (FK), `locked_at`, `locked_by`. **UNIQUE (journal_entry_id, fiscal_period_id)**. RLS: manage (finance roles). **0 rows (never written).**

## 6. API Contract

Base `/api/finance/periods`. CRUD + validate use the **service-role admin client with no auth**; close/reopen require a logged-in user (no role check).

| Method · Path | Purpose / notes |
|---|---|
| `GET /api/finance/periods` | `?id` / `?name` / `?current=true` / `?date=` / `?entityId=`. Returns a single object or a **bare array** (UI reads `data.data` → mismatch, §7). |
| `POST /api/finance/periods` | Create. Requires `period_name/start_date/end_date/period_type`; `fiscal_year` is **stripped** (not in schema); date-overlap guard. Resolves tenant from a system profile / fallback `…0001`. 201. |
| `PUT /api/finance/periods?id=` | Update. Blocked if posted journals exist; re-checks overlap. |
| `DELETE /api/finance/periods?id=` | Soft delete. Blocked if any journal references the period. |
| `POST /api/finance/periods/close` | Body `{ id }` (400 if missing). `auth.getUser()` (401). Sets `status='closed'`. |
| `POST /api/finance/periods/reopen` | Body `{ id, reason }` (400 if missing). Intends to reopen — **errors** on non-existent columns. |
| `POST /api/finance/periods/validate` | Body `{ date }`. Returns `{valid}` (400 when invalid). Checks only that an **open** period covers the date — **no** unbalanced/unposted journal checks. |

## 7. Known Gaps & Bugs

- **Snapshots/locks never populated** (§4) — period-close has no reporting effect; opening balances rely on `BEGINNING_BALANCE` journals.
- **No approve/submit/lock path** — `approval_status` stuck at `DRAFT`; `grace_days` unused.
- **Close/Reopen broken from the UI** — the page sends `id` as a **query param** but the routes read `id` from the **JSON body** → 400; Reopen also needs a `reason` the UI never collects.
- **Reopen writes non-existent columns** (`reopening_reason`/`reopened_by`/`reopened_at`) → SQL error even with correct input.
- **List contract mismatch** — `GET` returns a bare array; the page reads `data.data` → table renders empty.
- **Enum mismatches** — UI offers `period_type='yearly'` (DB wants `annual`) and a `status='locked'` that isn't valid for `status` → CHECK failures / dead states.
- **RLS bypassed** (service-role client); CRUD/validate have **no auth**; close/reopen check only "logged in", not role.
- **Lenient posting guard** — `assign_fiscal_period` allows `soft_close` and lets a journal post with `fiscal_period_id = NULL` when no period matches.
- **`entity_id` filter is a no-op** (column absent); repo types `FiscalPeriod = any`.

## 8. Target Enhancement (new repo)

Implement the real close→approve→lock cycle (PRD Phase 4 / backlog B-7):
1. **Validate** (pre-close): assert all in-period journals are **posted & balanced**; no orphan `fiscal_period_id = NULL` entries.
2. **Approve**: in one transaction, compute signed ending balances per COA (using `report-engine` sign rules) → insert `trial_balance_snapshots`; insert `fiscal_period_journal_locks` for every posted journal in the period; set `approval_status='APPROVED'`, `approved_by/at`.
3. **Lock**: set `approval_status='LOCKED'`; block new journals (extend `assign_fiscal_period` / posting guard).
4. Fix the UI param/body contract, the `period_type`/`status` enums, and add the missing `reopen` columns (or drop those writes).

## 9. Testing

No automated suite today. Manual verification (post-fix) per `docs/qa/laporan-keuangan-test-plan.md` interplay: create period → post balanced journals → close/approve → confirm `trial_balance_snapshots` populated → next period's report shows correct **saldo awal**. The 3 live periods (FY2026 Q1/Q2 …) are in the MIGRATION doc Appendix A (and shared with `lk_reports_seed.sql`).
