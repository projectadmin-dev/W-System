# FINANCE — Vendor Master — Full Specification

**Module:** Finance & Accounting → Master Data → Vendor (Master Data Vendor)
**Route:** `/finance/vendors`
**Stack:** Next.js 16 (App Router) · shadcn/ui · Tailwind v4 · Supabase Postgres 17
**Tenant:** `00000000-0000-0000-0000-000000000001`
**Last updated:** 2026-06-08

> Companion: **`FINANCE-VENDOR-MIGRATION.md`** — migration steps, ADRs, anti-patterns. (No dataseed appendix — the `fin_vendors` table is currently empty; see §7.)

---

## ⚠️ Architectural note (read first)

`fin_vendors` is currently an **orphaned master**: it has **0 rows** and is **not** wired into the transaction flow. Accounts Payable carries the vendor as **free text** (`ap_invoices.pihak_ketiga`); `ap_invoices.vendor_id` (the optional link to `fin_vendors`) is **never set**. The Vendor Master CRUD works in isolation but populating it has no downstream effect today. See §7.

---

## Table of Contents

1. [Goal & Scope](#1-goal--scope) · 2. [User Stories](#2-user-stories) · 3. [Domain Model & Business Rules](#3-domain-model--business-rules) · 4. [Database Schema](#4-database-schema) · 5. [API Contract](#5-api-contract) · 6. [Screens & Components](#6-screens--components) · 7. [Data-Source Reality & Risks](#7-data-source-reality--risks) · 8. [Testing](#8-testing)

---

## 1. Goal & Scope

A master-data CRUD for suppliers, technology partners, and service providers — identity, contact/PIC, tax (NPWP/PKP), payment terms, and bank details — intended to back vendor selection in AP and payments.

**In scope:** vendor list with stats/search/filter, create/edit (Sheet), activate/deactivate toggle, soft delete, optional COA link.
**Out of scope / not realised:** any transaction actually selecting from `fin_vendors` (AP uses free text); server-side search/paging from the UI; COA link surfaced in the form.

## 2. User Stories

| ID | Story |
|---|---|
| **US-VND-01** | Create/edit a vendor with identity, category, contact/PIC, tax, payment, and bank fields. |
| **US-VND-02** | Browse vendors with stat cards (Total/Aktif/Nonaktif/PKP) and filter by status & category, search by name/code/email/NPWP. |
| **US-VND-03** | Activate/deactivate a vendor (inactive intended to be unselectable in new transactions — currently unenforced). |
| **US-VND-04** | Soft-delete a vendor. |

## 3. Domain Model & Business Rules

- **Vendor code**: `VND-{YYYY}-{NNNN}` (4-digit), generated server-side when blank (count-based — race/gap-prone). `UNIQUE (vendor_code)` — **global, not per-tenant**.
- **`vendor_type`** (UI): `company | individual`. DB default `'supplier'` (legacy; overridden to `company` on POST). **No CHECK.**
- **`vendor_category`** (UI): `software, cloud_services, hardware, consulting, freelancer, service, supplier, other`. DB default `'supplier'`. **No CHECK.**
- **Tax**: `npwp` (free text); `tax_type` = `pkp | non_pkp` (default `non_pkp`; drives the PKP stat/chip). **No CHECK.**
- **Payment**: `payment_terms_days` (default 30); `payment_method` = `transfer|cash|check|virtual_account` (default `transfer`); `currency` = `IDR|USD|SGD|EUR` (default `IDR`); `credit_limit` (nullable). **No CHECK.**
- **Bank**: `bank_name`, `bank_account_number`, `bank_account_name`.
- **Required**: only `vendor_name`.
- **Soft delete**: DELETE sets `deleted_at` (despite UI copy saying "permanently deleted").
- All "enums" above are **application conventions only** — the DB has **no CHECK constraints** on this table.

## 4. Database Schema

`fin_vendors` — created in `20260426010000_create_all_missing_tables.sql`, extended by `20260529000004_vendor_master_enhancement.sql`. Schema `public`.

| Column | Type | Default | Source |
|---|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` | create |
| `tenant_id` | uuid | — (FK → `tenants` CASCADE) | create |
| `vendor_code` | text | — (UNIQUE) | create |
| `vendor_name` | text | **NOT NULL** | create |
| `vendor_type` | text | `'supplier'` | create |
| `email`, `phone`, `address` | text | — | create |
| `bank_name`, `bank_account_name`, `bank_account_number` | text | — | create |
| `npwp`, `notes` | text | — | create |
| `is_active` | boolean | `true` | create |
| `created_at`, `updated_at`, `deleted_at` | timestamptz | now()/now()/— | create |
| `payment_terms_days` | integer | `30` | enhancement |
| `coa_id` | uuid | — (FK → `coa` SET NULL) | enhancement |
| `pic_name`, `pic_email`, `pic_phone`, `website` | text | — | enhancement |
| `vendor_category` | text | `'supplier'` | enhancement |
| `tax_type` | text | `'non_pkp'` | enhancement |
| `currency` | text | `'IDR'` | enhancement |
| `payment_method` | text | `'transfer'` | enhancement |
| `credit_limit` | numeric(18,2) | — | enhancement |
| `created_by` | uuid | — (never written) | enhancement |

**Constraints:** PK `id`; `UNIQUE (vendor_code)` (global); FK `tenant_id → tenants` (CASCADE), `coa_id → coa` (SET NULL). **No CHECK constraints.**
**Indexes:** `idx_fv_tenant(tenant_id)`, `idx_fin_vendors_category(vendor_category)`, `idx_fin_vendors_active(is_active)`, `idx_fin_vendors_tenant(tenant_id)` (duplicate of `idx_fv_tenant`).

## 5. API Contract

Base `/api/finance/vendors`; `createAdminClient()` (service role, no auth); hard-coded `TENANT`.

| Method · Path | Purpose |
|---|---|
| `GET /api/finance/vendors` | List. Query: `search` (ilike name/code/email/npwp), `status` (active/inactive), `category`, `page`, `size` (≤200). Joins `coa`. Returns `{ data, meta }`. |
| `POST /api/finance/vendors` | Create. `vendor_name` required (400). Auto-generates `vendor_code` if blank; empty strings → null. 201. |
| `GET /api/finance/vendors/[id]` | Single (+ COA). 404 if missing. |
| `PATCH /api/finance/vendors/[id]` | Update (whitelisted fields; empty → null; sets `updated_at`). Also used by the active toggle. |
| `DELETE /api/finance/vendors/[id]` | Soft delete (`deleted_at = now()`). |

## 6. Screens & Components

`apps/web/app/finance/vendors/page.tsx` — single client component; all UI from `@workspace/ui/*` (no `apps/web/components`). Local helpers: `CategoryBadge`, `StatusBadge`, `FormField`, `SectionTitle`.

- **Header** + "Tambah Vendor".
- **Stat cards**: Total / Aktif / Nonaktif / PKP (client-computed).
- **Toolbar**: search (client-side), status segmented filter, category Select, row counter, refresh.
- **Table**: Kode, Nama (company/individual icon), Kategori, Kontak, NPWP/Pajak, Term Bayar, Bank Tujuan, Status + row actions (Edit / Aktifkan-Nonaktifkan / Hapus).
- **Create/Edit**: right-side **Sheet** with sections — Identitas, Kontak & Alamat (+ PIC), Perpajakan (NPWP, PKP/Non-PKP), Informasi Keuangan (terms, method, currency, bank), Lainnya (notes + active switch). `coa_id` is **not** exposed in the form.
- **Delete**: AlertDialog.

The list fetches `?size=200` once and filters/searches **client-side** (never uses the server's search/status/category/paging params).

## 7. Data-Source Reality & Risks

- **Orphaned table.** `fin_vendors` = 0 rows; referenced in code only by the vendors routes and `payment-vouchers.ts`. AP, ap-aging, payment-reconciliation, vendor-bills do **not** read it.
- **Vendor identity lives on AP as free text.** `ap_invoices.pihak_ketiga` (NOT NULL) is the real vendor field (14 distinct values live); `ap_invoices.vendor_id` is never set (0 rows). The dup key uses `pihak_ketiga`, not `vendor_id`.
- **`GET /api/finance/ap-aging`** groups `contacts.name` (also empty) — not `fin_vendors`.
- **"Inactive can't be used in transactions" is unenforced** — no transaction selects from this master.
- **No DB-level validation** — all enums are free TEXT; the DB default `vendor_type='supplier'` is itself outside the UI enum.
- **Code generation** is `count(*)+1` (race/gap-prone, counts soft-deleted); **`vendor_code` UNIQUE is global** despite per-tenant generation.
- **No auth/RBAC**; hard-coded tenant; unescaped `.or()` search interpolation; soft delete vs "permanent" UI copy; `coa_id` half-wired; duplicate tenant index.

## 8. Testing

No automated suite. Manual verification: create a vendor (auto-code), edit, toggle active, soft-delete; confirm stat cards and filters. **There is no live data to seed** (0 rows) — to make the master meaningful it must first be populated and then wired into AP (set `ap_invoices.vendor_id` and select vendors from `fin_vendors`).
