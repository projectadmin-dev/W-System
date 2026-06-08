# FINANCE — Fiscal Periods / Tutup Buku — Migration Guide

**Module:** Finance → Period Management
**Companion:** `FINANCE-PERIODS-SPEC.md`
**Tenant:** `00000000-0000-0000-0000-000000000001`
**Last updated:** 2026-06-08

> **Appendix A** seeds the 3 live `fiscal_periods` (shared with `lk_reports_seed.sql`). `trial_balance_snapshots` and `fiscal_period_journal_locks` are **empty** (never populated — the close/approve→snapshot flow is unimplemented; implementing it is the key new-repo task).

---

## Table of Contents

1. [Overview](#1-overview) · 2. [Migration Order](#2-migration-order) · 3. [Deploy Runbook](#3-deploy-runbook) · 4. [ADRs](#4-architecture-decision-records-adr) · 5. [Anti-Patterns](#5-anti-patterns--pitfalls) · 6. [Target Implementation](#6-target-implementation-new-repo) · 7. [Rollback](#7-rollback) · 8. [Verification](#8-verification-queries) · 9. [Appendix A — Dataseed](#appendix-a--dataseed)

---

## 1. Overview

`fiscal_periods` controls which journals may post. The base table ships with the journal migration; an approval-workflow layer + period-lock/snapshot tables were added later but are **schema-only** — no code populates them (see SPEC §4). Closing a period today only flips `status`.

## 2. Migration Order

| # | Migration file | What it does |
|---|---|---|
| 1 | `20260421015823_create_journal_entries.sql` | creates `fiscal_periods` (status `open/soft_close/closed`) + `assign_fiscal_period` trigger + date CHECK. |
| 2 | `20260528000005_fiscal_period_approval.sql` | adds `approval_status` (`DRAFT/PENDING_APPROVAL/APPROVED/LOCKED`), `grace_days`, approval-trail columns. **No trigger/function** — columns only. |
| 3 | `20260528000006_period_locks_trial_balance.sql` | creates `trial_balance_snapshots` + `fiscal_period_journal_locks` (+ RLS, indexes). **Never written by any code.** |

### Dependency graph
```
tenants ─► fiscal_periods ◄─ journal_entries.fiscal_period_id (assign_fiscal_period trigger)
fiscal_periods ─► trial_balance_snapshots (per COA saldo_akhir)   ── read by report-engine (saldo awal)
fiscal_periods ─► fiscal_period_journal_locks (per journal)        ── read by report-engine (exclusion)
```

## 3. Deploy Runbook

```bash
cd /home/ubuntu/apps/wsystem-1 && git pull origin master
supabase db push
# psql "$DATABASE_URL" -f supabase/seed/periods_seed.sql   # 3 fiscal periods (conflict-safe)
cd apps/web && npm run build && pm2 restart wsystem-1-staging
```

## 4. Architecture Decision Records (ADR)

### ADR-1 — Two state columns (`status` vs `approval_status`)
Operational `status` (open/soft_close/closed) is separate from the approval workflow `approval_status`.
**Why:** separate "can journals post?" from "is this period signed off & locked?". **Trade-off:** today only `status` is used; `approval_status` is permanently `DRAFT` (dead), which confuses readers.

### ADR-2 — Period-end snapshots as the saldo-awal source
The design has APPROVED write `trial_balance_snapshots` (per-COA ending balance) consumed by the reporting engine as the next period's opening balance, with `fiscal_period_journal_locks` preventing double-counting.
**Why:** period-over-period continuity without re-summing all history; immutable period ledgers. **Trade-off:** **not implemented** — so reports fall back to `BEGINNING_BALANCE` journals and the lock-exclusion is a no-op (see backlog B-7).

### ADR-3 — Lenient posting guard
`assign_fiscal_period` allows posting into non-`closed` periods and only `RAISE NOTICE` when none matches.
**Why:** avoids hard failures during data entry. **Trade-off:** journals can post with `fiscal_period_id = NULL` or into `soft_close`, weakening the period lock.

## 5. Anti-Patterns & Pitfalls

| ❌ Anti-pattern | ✅ Do instead / note |
|---|---|
| Assuming "Close" snapshots balances / locks journals | It does not — only sets `status='closed'`. Implement the approve→snapshot flow (§6). |
| Calling close/reopen from the current UI | Broken: page sends `id` as query param, routes read it from the **body**; reopen also needs a `reason` + writes non-existent columns. Fix the contract. |
| Using `period_type='yearly'` or `status='locked'` | DB CHECK wants `annual`; `locked` isn't a valid `status` (only an `approval_status`). |
| Reading `GET /api/finance/periods` as `data.data` | It returns a bare array — the current page mismatches and renders empty. |
| Trusting RLS on periods | Service-role client bypasses it; CRUD/validate have no auth, close/reopen check only "logged in". |
| Relying on snapshots for opening balances now | They're empty — seed `BEGINNING_BALANCE` journals until the snapshot flow exists. |

## 6. Target Implementation (new repo)

Implement the real cycle (PRD Phase 4 · backlog B-7):
1. **Pre-close validate** — all in-period journals posted & balanced; no `fiscal_period_id = NULL` orphans.
2. **Approve (one transaction)** — compute signed ending balance per COA (report-engine sign rules) → `INSERT trial_balance_snapshots`; `INSERT fiscal_period_journal_locks` for every posted journal in the period; set `approval_status='APPROVED'` + `approved_by/at`.
3. **Lock** — `approval_status='LOCKED'`; block new postings into the period.
4. **Fix UI/API**: param/body contract, `period_type`/`status` enums, missing `reopen` columns (or remove those writes), and the list `data.data` mismatch.

## 7. Rollback

```sql
-- Periods are referenced by journals; do not bulk-delete. To undo a (future) approve:
-- DELETE FROM fiscal_period_journal_locks WHERE fiscal_period_id = :id;
-- DELETE FROM trial_balance_snapshots     WHERE fiscal_period_id = :id;
-- UPDATE fiscal_periods SET approval_status='DRAFT', status='open' WHERE id = :id;
-- DROP TABLE public.trial_balance_snapshots, public.fiscal_period_journal_locks;  -- only when decommissioning
```

## 8. Verification Queries

```sql
SELECT period_name, status, approval_status, start_date, end_date
FROM fiscal_periods WHERE tenant_id='00000000-0000-0000-0000-000000000001' ORDER BY start_date;

-- snapshot/lock population (currently 0/0 — should be >0 per approved period after §6)
SELECT (SELECT count(*) FROM trial_balance_snapshots)      AS snapshots,
       (SELECT count(*) FROM fiscal_period_journal_locks)  AS locks;

-- journals that posted without a period (lenient-guard leakage)
SELECT count(*) AS orphan_journals FROM journal_entries
WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND status='posted' AND fiscal_period_id IS NULL;
```

---

## Appendix A — Dataseed

3 live fiscal periods (FY2026). Conflict-safe (`ON CONFLICT (id) DO NOTHING`, no DELETE) so it coexists with `lk_reports_seed.sql` (which seeds the same periods + journals). Also at **`supabase/seed/periods_seed.sql`**.

```sql
-- =====================================================
-- Seed: Fiscal Periods (periods module)
-- Captured from live tenant 00000000-0000-0000-0000-000000000001. 3 periods (FY2026 Q1/Q2 ...).
-- trial_balance_snapshots and fiscal_period_journal_locks are EMPTY today
-- (populated on period APPROVE — see the Periods MIGRATION doc).
--
-- Conflict-safe: uses ON CONFLICT (id) DO NOTHING and NO delete, so it can run
-- alongside lk_reports_seed.sql (which also seeds these same fiscal_periods).
-- =====================================================

BEGIN;

INSERT INTO public.fiscal_periods (id, tenant_id, period_name, period_type, start_date, end_date, status, closed_at, closed_by, close_notes, created_at, updated_at, created_by, updated_by, deleted_at, approval_status, grace_days, is_grace_allowed, submitted_by, submitted_at, approved_by, approved_at, locked_by, locked_at, approval_notes) VALUES
  ('299ee939-a7af-40c3-9650-16f4339e36a3', '00000000-0000-0000-0000-000000000001', 'FY2026-Q1', 'quarterly', '2026-01-01', '2026-03-31', 'open', NULL, NULL, NULL, '2026-05-31 14:33:51.160931+00', '2026-05-31 14:33:51.160931+00', '812558af-8be8-4c53-b581-e6a4f1c91147', NULL, NULL, 'DRAFT', '0', 'false', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('78f59c28-eac8-422c-ac49-9ed659fe0ee5', '00000000-0000-0000-0000-000000000001', 'FY2026-Q2', 'quarterly', '2026-04-01', '2026-06-30', 'open', NULL, NULL, NULL, '2026-04-22 12:46:00.162176+00', '2026-04-22 12:46:00.162176+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, NULL, 'DRAFT', '0', 'false', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('04cb248d-a3ab-4e56-b6b1-a42d9d9558a2', '00000000-0000-0000-0000-000000000001', 'Updated Period Name', 'monthly', '2026-04-21', '2026-12-31', 'open', NULL, NULL, NULL, '2026-04-21 09:15:03.43061+00', '2026-04-21 09:15:04.319438+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, '2026-04-21 09:15:04.264+00', 'DRAFT', '0', 'false', NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

COMMIT;

```


---

## Appendix B — Forward Schema (new repo): `company_id` & `branch_id`

All period tables already received `company_id`/`branch_id` in migration 0001 (under the Laporan Keuangan sources).

| Column | Type | Nullable | Final (new repo) |
|---|---|---|---|
| `company_id` | uuid | yes | FK → `companies`/`entities(id)` + index + RLS |
| `branch_id` | uuid | yes | FK → `branches(id)` + index + RLS |

**Already covered by `0001_finance_add_company_branch.sql`:** `fiscal_periods`, `trial_balance_snapshots`, `fiscal_period_journal_locks`.

_No new ALTERs — this module's tables are all in 0001._
