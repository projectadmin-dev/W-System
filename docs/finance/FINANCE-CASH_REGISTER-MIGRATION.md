# FINANCE — Cash / Bank Register (Buku Kas/Bank) — Migration Guide

**Module:** Finance → Cash/Bank Register
**Companion:** `FINANCE-CASH_REGISTER-SPEC.md`
**Tenant:** `00000000-0000-0000-0000-000000000001`
**Last updated:** 2026-06-08

> **Appendix A** seeds the 1 live `cash_register_entries` row + 1 `petty_cash_custodians` row. `money_requests` and `bank_accounts` are empty. See the SPEC §5 for the **enhanced target architecture** (cash-register as a projection of posted cash/bank journal lines).

---

## Table of Contents

1. [Overview](#1-overview) · 2. [Migration Order](#2-migration-order) · 3. [Deploy Runbook](#3-deploy-runbook) · 4. [ADRs](#4-architecture-decision-records-adr) · 5. [Anti-Patterns](#5-anti-patterns--pitfalls) · 6. [Target Migration Path](#6-target-migration-path-new-repo) · 7. [Rollback](#7-rollback) · 8. [Verification](#8-verification-queries) · 9. [Appendix A — Dataseed](#appendix-a--dataseed)

---

## 1. Overview

The cash/bank register + the legacy money-request/petty-cash stack. Today these are **standalone** ledgers disconnected from the general ledger. The migration history is messy (duplicate table definitions); the new repo should re-base the register on the GL (SPEC §5).

## 2. Migration Order

| # | Migration file | What it does |
|---|---|---|
| 1 | `20260424060000_money_requests_cash_register.sql` | **canonical** `money_requests` + `cash_register_entries` (+ `coa_id` index, partial deleted_at index, balance triggers). |
| 2 | `20260426000000_money_requests_cash_register.sql` | **near-duplicate** `CREATE TABLE IF NOT EXISTS` (body ignored if #1 ran) — but adds the permissive `*_all` RLS (`USING(true)`). |
| 3 | `20260425000000_money_request_enhancements_petty_cash.sql` | adds `money_requests.tenant_id`, `purpose_type` (⚠ malformed `' operational'`), petty-cash settlement links. |
| 4 | `20260424120000_petty_cash_module.sql` | `petty_cash_custodians` + `petty_cash_entries` (proper per-custodian balances + role-based RLS); seeds 1 custodian/tenant. |
| — | `20260422000000_create_core_transactions.sql` | `bank_accounts` **variant A** (has `coa_id`, `opening_balance`, + `bank_transactions` w/ `journal_entry_id`). |
| — | `20260426010000_create_all_missing_tables.sql` | `bank_accounts` **variant B** (no `coa_id`) — conflicts with A (order-dependent). |

### Dependency graph (current)
```
money_requests ─► cash_register_entries (legacy writers: vendor-bills, payment-vouchers, money-requests/pay)
petty_cash_custodians ─► petty_cash_entries ─► (bank_accounts, money_requests)
(NO link to journal_entries / coa today)   ← the gap the enhancement closes
```

## 3. Deploy Runbook

```bash
cd /home/ubuntu/apps/wsystem-1 && git pull origin master
supabase db push
# psql "$DATABASE_URL" -f supabase/seed/cash_register_seed.sql
cd apps/web && npm run build && pm2 restart wsystem-1-staging
```

## 4. Architecture Decision Records (ADR)

### ADR-1 (current, to be reversed) — Standalone manual register
`cash_register_entries` is a hand-maintained ledger with a trigger-computed running balance, independent of the GL.
**Why (historical):** shipped before the auto-journal engine existed. **Trade-off:** orphaned from the GL/AR/AP; single global balance; free-text accounts. **Decision for new repo:** replace with a GL projection (ADR-2).

### ADR-2 (target) — Register = projection of posted cash/bank journal lines
The GL is the single source of truth; the register is a VIEW (or trigger-materialized mirror) over posted `journal_lines` on cash/bank COA (`1-10001*`/`1-10002*`), per `coa_id`, with a window running balance. AR receipts / AP payments / internal disbursements already post these via the auto-journal engine.
**Why:** one source of truth; automatic AR/AP integration; per-account balances that reconcile to the cash-flow report. **Trade-off:** requires consolidating `bank_accounts`, retiring the 3 legacy ad-hoc writers, and (optionally) keeping `cash_register_entries` only for manual annotations linked to `journal_line_id`.

### ADR-3 (target) — Consolidate the duplicate masters
Pick the `bank_accounts` variant with `coa_id` + `bank_transactions`; drop the other. Choose one money-request stack (the Indonesian `permintaan_uang`/`pembayaran` that posts journals) and treat `money_requests`/petty-cash as sub-ledgers reconciled to specific COA.
**Why:** removes order-dependent, divergent schema. **Trade-off:** data migration for any rows created under the retired tables.

## 5. Anti-Patterns & Pitfalls

| ❌ Anti-pattern | ✅ Do instead / note |
|---|---|
| Treating `cash_register_entries` as the cash truth | It's orphaned from the GL; the real cash position is posted `journal_lines` on `1-1000x` (cash-flow report uses these). |
| Adding another ad-hoc writer to the register | Post a journal via the engine; project the register from it (SPEC §5). |
| Using `account_name` free text | Use `coa_id` / `bank_account_id`; the strings vary per writer and don't aggregate. |
| Trusting the running balance | Single global pool across all accounts; `MAX()`-based trigger is wrong for back-dated rows. |
| Assuming `bank_accounts.coa_id` exists | Two definitions — one lacks it. Consolidate first (ADR-3). |
| Sending `purpose_type='operational'` to money_requests | CHECK value is malformed `' operational'` (leading space) — fix the constraint. |
| Re-running the seed on shared data | Appendix A `DELETE`s this tenant's `cash_register_entries` + `petty_cash_custodians` first. |

## 6. Target Migration Path (new repo)

Incremental + safe (mirrors SPEC §5.5):
1. Add `coa.is_cash_account` (or use code prefix); consolidate `bank_accounts` to the `coa_id`+`bank_transactions` variant.
2. Create `v_cash_register` over posted cash/bank journal lines (per `coa_id`, window running balance); repoint `GET /cash-register` + `/summary` (per-account, date-aware, behind auth + tenant RLS).
3. Convert the 3 legacy writers (vendor-bills, payment-vouchers, money-requests/pay) to post journals via the engine instead of inserting ad-hoc rows.
4. Add `tenant_id` + RLS to `cash_register_entries` (if retained for annotations); seed opening-balance journals.
5. Reconcile `petty_cash_custodians.current_balance` and any `bank_accounts.current_balance` to their COA balances (or derive them).

## 7. Rollback

```sql
BEGIN;
DELETE FROM public.cash_register_entries  WHERE tenant_id IS NULL OR tenant_id='00000000-0000-0000-0000-000000000001';
DELETE FROM public.petty_cash_custodians  WHERE tenant_id='00000000-0000-0000-0000-000000000001';
COMMIT;
-- (cash_register_entries currently has no tenant_id column — the OR clause covers that.)
```

## 8. Verification Queries

```sql
-- Today's (orphaned) register vs the GL cash/bank truth — they will NOT match until the enhancement:
SELECT 'register_global' k, max(running_balance) v FROM cash_register_entries WHERE deleted_at IS NULL
UNION ALL
SELECT 'gl_cash_bank', sum(jl.debit_amount - jl.credit_amount)
FROM journal_lines jl JOIN journal_entries je ON je.id=jl.journal_entry_id JOIN coa c ON c.id=jl.coa_id
WHERE je.status='posted' AND je.deleted_at IS NULL
  AND (c.account_code LIKE '1-10001%' OR c.account_code LIKE '1-10002%');

-- per cash/bank account balance from the GL (the target per-account numbers)
SELECT c.account_code, c.account_name, sum(jl.debit_amount - jl.credit_amount) saldo
FROM journal_lines jl JOIN journal_entries je ON je.id=jl.journal_entry_id JOIN coa c ON c.id=jl.coa_id
WHERE je.status='posted' AND je.deleted_at IS NULL
  AND (c.account_code LIKE '1-10001%' OR c.account_code LIKE '1-10002%')
GROUP BY 1,2 ORDER BY 1;
```

---

## Appendix A — Dataseed

1 live `cash_register_entries` row + 1 `petty_cash_custodians` row (real UUIDs). `money_requests`/`bank_accounts` empty. Also at **`supabase/seed/cash_register_seed.sql`**.

```sql
-- =====================================================
-- Seed: Cash/Bank Register (cash-register module)
-- Captured from live tenant 00000000-0000-0000-0000-000000000001.
-- Tables: cash_register_entries (1), petty_cash_custodians (1).
-- money_requests and bank_accounts are EMPTY today.
--
-- EXTERNAL DEPENDENCIES: coa(id) / bank_accounts(id) where referenced.
-- Idempotent: clears these tables for the tenant first.
-- =====================================================

BEGIN;

DELETE FROM public.cash_register_entries WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
INSERT INTO public.cash_register_entries (id, entry_date, entry_type, source_type, source_id, coa_id, account_name, amount, description, reference_number, running_balance, created_by, created_at, updated_at, deleted_at) VALUES
  ('bfd137ce-41aa-491c-b8b8-d7f71180a7bf', '2026-05-18', 'in', 'vendor_payment', NULL, NULL, 'Kas Kecil', '100000.00', '12320420', '123123123', '0.00', NULL, '2026-05-18 09:32:48.700898+00', '2026-05-18 09:32:48.700898+00', NULL);

DELETE FROM public.petty_cash_custodians WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
INSERT INTO public.petty_cash_custodians (id, tenant_id, user_id, custodian_name, department, account_name, opening_balance, current_balance, max_limit, currency, is_active, notes, created_at, updated_at, created_by, updated_by, deleted_at) VALUES
  ('d638a0ee-878a-4c15-b297-4fbb361c5310', '00000000-0000-0000-0000-000000000001', NULL, 'Kas Kecil Kantor Pusat', 'Finance', 'Kas Kecil', '500000.00', '500000.00', '5000000.00', 'IDR', 'true', NULL, '2026-04-25 06:14:07.377529+00', '2026-04-25 06:14:07.377529+00', NULL, NULL, NULL);

COMMIT;

```


---

## Appendix B — Forward Schema (new repo): `company_id` & `branch_id`

`cash_register_entries` lacks even `tenant_id` today — the new repo should add `tenant_id` + `company_id` + `branch_id` together and enable real RLS (it currently uses `USING(true)`).

| Column | Type | Nullable | Final (new repo) |
|---|---|---|---|
| `company_id` | uuid | yes | FK → `companies`/`entities(id)` + index + RLS |
| `branch_id` | uuid | yes | FK → `branches(id)` + index + RLS |

**Added by `0002_finance_add_company_branch_journal_cashreg.sql`:**

```sql
ALTER TABLE public.cash_register_entries ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.cash_register_entries ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.money_requests ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.money_requests ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.petty_cash_custodians ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.petty_cash_custodians ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.petty_cash_entries ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.petty_cash_entries ADD COLUMN IF NOT EXISTS branch_id  uuid;

COMMENT ON COLUMN public.cash_register_entries.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.cash_register_entries.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.money_requests.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.money_requests.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.bank_accounts.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.bank_accounts.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.petty_cash_custodians.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.petty_cash_custodians.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.petty_cash_entries.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.petty_cash_entries.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
```
