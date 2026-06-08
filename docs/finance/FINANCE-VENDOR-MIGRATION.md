# FINANCE — Vendor Master — Migration Guide

**Module:** Finance → Master Data → Vendor
**Companion:** `FINANCE-VENDOR-SPEC.md`
**Tenant:** `00000000-0000-0000-0000-000000000001`
**Last updated:** 2026-06-08

> **No dataseed appendix:** `fin_vendors` has **0 live rows**. The table is an orphaned master not yet wired into transactions (see SPEC §7). Appendix A documents how to populate + integrate it instead of dumping data.

---

## Table of Contents

1. [Overview](#1-overview) · 2. [Migration Order](#2-migration-order) · 3. [Deploy Runbook](#3-deploy-runbook) · 4. [ADRs](#4-architecture-decision-records-adr) · 5. [Anti-Patterns](#5-anti-patterns--pitfalls) · 6. [Rollback](#6-rollback) · 7. [Verification](#7-verification-queries) · 8. [Appendix A — Populating & Integrating](#appendix-a--populating--integrating-fin_vendors)

---

## 1. Overview

`fin_vendors` was created generically and later enhanced with finance/tax/bank/PIC fields. It has no RLS, no CHECK constraints, and no seed. It is functionally complete as a CRUD but **disconnected** from AP and payments.

## 2. Migration Order

| # | Migration file | What it does |
|---|---|---|
| 1 | `20260426010000_create_all_missing_tables.sql` | `CREATE TABLE fin_vendors` (identity, contact, bank, npwp, notes, is_active, audit) + `idx_fv_tenant`. |
| 2 | `20260529000004_vendor_master_enhancement.sql` | Adds `payment_terms_days`, `coa_id` (FK → coa), `pic_*`, `website`, `vendor_category`, `tax_type`, `currency`, `payment_method`, `credit_limit`, `created_by`; indexes on category/active/tenant. |

### Dependency graph

```
tenants ──► fin_vendors.tenant_id   (CASCADE)
coa ──────► fin_vendors.coa_id       (SET NULL)
(intended, not wired) fin_vendors.id ◄── ap_invoices.vendor_id
```

## 3. Deploy Runbook

```bash
cd /home/ubuntu/apps/wsystem-1 && git pull origin master
supabase db push
cd apps/web && npm run build && pm2 restart wsystem-1-staging
```

## 4. Architecture Decision Records (ADR)

### ADR-1 — Build the master before wiring it into transactions
The CRUD and schema shipped ahead of integration into AP/payments.
**Why:** lets Finance curate vendors early. **Trade-off:** today it is orphaned — AP carries the vendor as free text, so the master has no consumers and can silently diverge from reality.

### ADR-2 — Free-TEXT "enums" (no CHECK)
`vendor_type`, `vendor_category`, `tax_type`, `payment_method`, `currency` are unconstrained text.
**Why:** flexibility / speed. **Trade-off:** the DB accepts any value; only the UI constrains them, and the DB default `vendor_type='supplier'` is itself outside the UI's `company|individual` set.

### ADR-3 — Optional COA link (`coa_id`)
A nullable FK to `coa` (SET NULL) for future ledger mapping.
**Why:** anticipates posting vendor activity to a control/expense account. **Trade-off:** half-wired — the API reads/writes it but the form never sets it and the table never displays it.

### ADR-4 — Soft delete
DELETE sets `deleted_at`.
**Why:** preserve history/audit. **Trade-off:** UI copy says "permanently deleted"; code generation counts soft-deleted rows.

## 5. Anti-Patterns & Pitfalls

| ❌ Anti-pattern | ✅ Do instead / note |
|---|---|
| Assuming AP uses `fin_vendors` | It does not — AP uses free-text `pihak_ketiga`; `vendor_id` is never set. Wire it before relying on the master. |
| Relying on DB to reject bad enum values | No CHECK constraints — validate in app, or add CHECKs (see Appendix A). |
| `vendor_code` per-tenant uniqueness | The UNIQUE is **global**; per-tenant generation can collide across tenants. |
| `count(*)+1` code generation | Race/gap-prone and counts soft-deleted rows — prefer a sequence. |
| Trusting "inactive ⇒ not selectable" | Unenforced; no transaction selects from this table. |
| Passing user `search` with commas | Unescaped `.or()` interpolation. |

## 6. Rollback

```sql
-- Data reset (none needed today — table is empty).
DELETE FROM public.fin_vendors WHERE tenant_id='00000000-0000-0000-0000-000000000001';
-- DROP TABLE public.fin_vendors;  -- only when decommissioning
```

## 7. Verification Queries

```sql
SELECT count(*) total,
       count(*) FILTER (WHERE is_active) aktif,
       count(*) FILTER (WHERE tax_type='pkp') pkp
FROM public.fin_vendors
WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL;   -- currently 0/0/0

-- the real vendor list today (free text on AP)
SELECT DISTINCT pihak_ketiga FROM public.ap_invoices
WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL ORDER BY 1;
```

---

## Appendix A — Populating & Integrating `fin_vendors`

There is no live data to dump. To make this master useful:

1. **Backfill from the de-facto list.** Seed vendors from the distinct AP free-text names:

```sql
INSERT INTO public.fin_vendors (tenant_id, vendor_code, vendor_name, vendor_type, vendor_category, tax_type, is_active)
SELECT '00000000-0000-0000-0000-000000000001',
       'VND-2026-' || lpad((row_number() OVER (ORDER BY pihak_ketiga))::text, 4, '0'),
       pihak_ketiga, 'company', 'supplier', 'non_pkp', true
FROM (SELECT DISTINCT pihak_ketiga FROM public.ap_invoices
      WHERE tenant_id='00000000-0000-0000-0000-000000000001' AND deleted_at IS NULL) v;
```

2. **Link AP bills to the master** (set `ap_invoices.vendor_id`):

```sql
UPDATE public.ap_invoices a SET vendor_id = v.id
FROM public.fin_vendors v
WHERE a.tenant_id = v.tenant_id AND a.pihak_ketiga = v.vendor_name AND a.vendor_id IS NULL;
```

3. **(Optional) harden the schema** — add CHECK constraints to match the UI enums, make `UNIQUE(vendor_code)` per-tenant, and replace count-based code generation with a sequence.

Until steps 1–2 are done, the Vendor Master remains a standalone screen with no transactional effect.


---

## Appendix B — Forward Schema (new repo): `company_id` & `branch_id`

All 1 table(s) of this module gain two **nullable** scoping columns in the new repository, to isolate data per **company** (PT / legal entity) and **branch** (kantor cabang):

| Column | Type | Nullable | Now | Final (new repo) |
|---|---|---|---|---|
| `company_id` | uuid | yes | no FK/index/RLS | FK → `companies`/`entities(id)` + index + RLS |
| `branch_id` | uuid | yes | no FK/index/RLS | FK → `branches(id)` + index + RLS |

`tenant_id` is **kept unchanged**; these are new independent columns. They are nullable so the Appendix A dataseed loads without modification (existing rows simply have NULL company/branch). FK wiring, backfill, and RLS are deferred to the new-repo final migration (see `PRD_Task_Management.md`, Phase 5). Combined SQL for all modules: `docs/finance/new-repo/0001_finance_add_company_branch.sql`.

```sql
-- Vendor Master — add company_id + branch_id (nullable, no FK)
ALTER TABLE public.fin_vendors ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.fin_vendors ADD COLUMN IF NOT EXISTS branch_id  uuid;

COMMENT ON COLUMN public.fin_vendors.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.fin_vendors.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
```
