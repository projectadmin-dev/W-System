# FINANCE — Permintaan Uang & Pembayaran — Full Specification

**Module:** Finance & Accounting → Cash Disbursement → Money Request (Permintaan Uang) + Payment (Pembayaran)
**Routes:** `/finance/permintaan-uang` · `/finance/permintaan-uang?status=PENDING_APPROVAL` · `/finance/permintaan-uang/new` · `/finance/permintaan-uang/[id]` · `/finance/pembayaran` · `/finance/pembayaran/new` · `/finance/pembayaran/[id]`
**Stack:** Next.js 16 (App Router) · shadcn/ui · Tailwind v4 · Supabase Postgres 17
**Tenant:** `00000000-0000-0000-0000-000000000001` (hard-coded, single-tenant)
**Last updated:** 2026-06-08

> Companion: **`FINANCE-PERMINTAAN_UANG-MIGRATION.md`** — migration steps, ADRs, anti-patterns, and the full live dataseed (Appendix A).

---

## Table of Contents

1. [Goal & Scope](#1-goal--scope)
2. [User Stories](#2-user-stories)
3. [Domain Model & Business Rules](#3-domain-model--business-rules)
4. [Database Schema](#4-database-schema)
5. [API Contract](#5-api-contract)
6. [Screens & Components](#6-screens--components)
7. [Known Gaps & Risks](#7-known-gaps--risks)
8. [Testing](#8-testing)

---

## 1. Goal & Scope

A two-stage cash-disbursement workflow: an employee raises a **Permintaan Uang** (money request) — either tied to a **project** or for an **internal** itemised need — which is routed for **approval**; once approved, Finance records a **Pembayaran** (payment) against it and marks it paid.

**In scope**

- Money-request lifecycle: draft → submit → approve/reject.
- Project-based or internal (itemised) requests with a searchable requestor (employee) picker.
- Payment creation against an approved request, with source-bank (COA) selection, destination bank details, and extra costs (biaya lain-lain).
- Single-level approval audit trail (`pu_approval_steps`).

**Out of scope / not implemented (see §7)**

- Journal / GL posting (no double-entry is written by this module).
- Multi-level/sequential approval chains.
- Pembayaran approval states (payment goes straight DRAFT → PAID).
- Authentication / RBAC (routes use the service-role client).

---

## 2. User Stories

| ID | Story |
|---|---|
| **US-PU-01** | As an employee, create a money request (project or internal) and save it as draft or submit it for approval. |
| **US-PU-02** | As an employee, view a filterable list of requests (by status, requestor/doc-number search, date range) — incl. the `?status=PENDING_APPROVAL` approvals queue. |
| **US-PU-03** | As an approver, approve or reject a pending request (reject requires a note); the decision is recorded as an approval step. |
| **US-PU-04** | As Finance, create a payment against an approved request, choosing the source bank (COA) and destination bank, plus any extra costs. |
| **US-PU-05** | As Finance, mark a payment as paid ("Tandai Lunas"), which also flips the linked request to PAID. |
| **US-PU-06** | See overdue indicators when an approved request passes its `tanggal_kebutuhan`. |

---

## 3. Domain Model & Business Rules

### 3.1 Document numbers

Generated server-side per year-month, zero-padded to 4 digits (count-based — see §7 race caveat):

- Permintaan Uang: **`PU-YYYY-MM-NNNN`** (e.g. `PU-2026-06-0001`)
- Pembayaran: **`PAY-YYYY-MM-NNNN`**

`UNIQUE (tenant_id, doc_number)` on both tables.

### 3.2 Status state machine

**Permintaan Uang** (`status`):

```
DRAFT ──submit (or POST submit:true)──► PENDING_APPROVAL
PENDING_APPROVAL ──approve──► APPROVED
PENDING_APPROVAL ──reject (note required)──► REJECTED
APPROVED ──(payment /execute)──► PAID
```

- Enum: `DRAFT | PENDING_APPROVAL | APPROVED | REJECTED | PAID | CANCELLED` (default `DRAFT`).
- PATCH (edit) allowed **only** while `DRAFT`.
- `CANCELLED` is defined but never set by any endpoint.

**Pembayaran** (`status`):

```
(create) DRAFT ──execute──► PAID   (+ cascades linked permintaan_uang → PAID)
```

- Enum: `DRAFT | PENDING_APPROVAL | APPROVED | PAID | CANCELLED` (default `DRAFT`; **no REJECTED**).
- Creation requires the referenced request to be `APPROVED` (else 422).
- `PENDING_APPROVAL`/`APPROVED`/`CANCELLED` and the `submitted_at`/`approved_at`/`approver_*` columns are **dead** — payment goes straight DRAFT → PAID.

**Approval steps** (`pu_approval_steps.status`): `PENDING | APPROVED | REJECTED` (default `PENDING`). Single level: approve/reject inserts exactly one `level: 1` row.

### 3.3 Request basis (`dasar_pengajuan`)

- `PROJECT` → requires `project_id` (FK → `projects`).
- `INTERNAL` → requires ≥1 `permintaan_uang_items` row (deskripsi + optional nominal).

### 3.4 Amounts & currency

- `nominal NUMERIC(18,2)` with `CHECK (nominal > 0)`; `mata_uang CHAR(3)` default `IDR` (IDR/USD/EUR/SGD in UI).
- Payment `nominal_bayar > 0`; defaults from the request nominal but is freely editable (no cross-document reconciliation — see §7).

### 3.5 Overdue

UI-only: a request is overdue when `status = APPROVED` and `tanggal_kebutuhan` is in the past (`isOverdueFR`).

---

## 4. Database Schema

Migration: `supabase/migrations/20260529000003_fund_request_payment_schema.sql` (DDL only — no RLS, triggers, or seed rows). Five tables.

### 4.1 `permintaan_uang`

Identity (`id`, `tenant_id`, `doc_number`), `status`, `tanggal_permintaan` (default `CURRENT_DATE`), `tanggal_kebutuhan`, `nominal` (`> 0`), `mata_uang`, `catatan`, `dasar_pengajuan` (`CHECK IN (PROJECT, INTERNAL)`), `project_id` (FK → `projects`), requestor snapshot (`requestor_id` FK → `user_profiles`, `requestor_nik/name/dept/position/grade`), lifecycle timestamps (`submitted_at/approved_at/rejected_at/paid_at`), audit (`created_at/updated_at/deleted_at/created_by`), and `expense_coa_id`.
- `UNIQUE (tenant_id, doc_number)` · indexes on `(tenant_id) WHERE deleted_at IS NULL`, `(tenant_id, status) WHERE deleted_at IS NULL`, `(requestor_id)`.

### 4.2 `permintaan_uang_items`

`id`, `permintaan_uang_id` (FK **ON DELETE CASCADE**), `urutan` (default 1), `deskripsi` (NOT NULL), `nominal` (nullable), `created_at`. Index `(permintaan_uang_id)`.

### 4.3 `pu_approval_steps`

`id`, `tenant_id`, `permintaan_uang_id` (FK **CASCADE**), `level` (default 1), `approver_id` (FK → `user_profiles`), `approver_name/dept`, `status` (`CHECK IN (PENDING, APPROVED, REJECTED)`), `notes`, `actioned_at`, `created_at`. Index `(permintaan_uang_id)`.

### 4.4 `pembayaran`

Identity + `status`, `permintaan_uang_id` (FK, **no cascade**), `tanggal_pembayaran`, `nominal_bayar` (`> 0`), `mata_uang`, source bank (`bank_dari_coa_id` FK → `coa`, `bank_dari_nama/kode`), destination bank (`bank_tujuan_nama` NOT NULL, `bank_tujuan_nomor` NOT NULL, `bank_tujuan_atas_nama`), requestor/approver/pic_finance snapshots, `catatan`, lifecycle timestamps, audit columns, plus tax fields (`pph_jenis`, `lawan_punya_npwp`, `pph_tarif`, `pph_amount`, `kas_neto`, `pph_dpp_kategori_id`, `pph_dpp`) and `journal_entry_id` (unused).
- `UNIQUE (tenant_id, doc_number)` · indexes on tenant, `(tenant_id, status)`, `(permintaan_uang_id)`, `(tenant_id, tanggal_pembayaran)`.

### 4.5 `pembayaran_biaya_lain`

`id`, `pembayaran_id` (FK **CASCADE**), `urutan`, `deskripsi`, `nominal` (default 0), `coa_id` (FK → `coa`), `coa_kode/nama`, `created_at`. Index `(pembayaran_id)`.

---

## 5. API Contract

All routes: hard-coded `TENANT`, `createAdminClient()` (service role, no auth), filter `deleted_at IS NULL` on reads.

### Permintaan Uang

| Method · Path | Purpose |
|---|---|
| `GET /api/finance/permintaan-uang` | List. Query: `status`, `search` (requestor_name / doc_number), `date_from`/`date_to` (on `tanggal_permintaan`), `page`, `size` (≤100). Returns `{ data, meta }`; joins `project`, attaches `items`, `approval_steps: []`. |
| `POST /api/finance/permintaan-uang` | Create. Validates `tanggal_kebutuhan/nominal/dasar_pengajuan/requestor_id`; PROJECT needs `project_id`; INTERNAL needs items. `submit:true` → `PENDING_APPROVAL` (+ `submitted_at`). 201. |
| `GET /api/finance/permintaan-uang/[id]` | Detail (+ project, items by `urutan`, approval_steps by `level`). 404 if missing. |
| `PATCH /api/finance/permintaan-uang/[id]` | Edit (whitelisted fields; optional `internal_items` replace). **422 unless DRAFT.** |
| `POST /…/[id]/submit` | DRAFT → PENDING_APPROVAL. 422 otherwise. |
| `POST /…/[id]/approve` | PENDING_APPROVAL → APPROVED; inserts level-1 APPROVED step. 422 otherwise. |
| `POST /…/[id]/reject` | PENDING_APPROVAL → REJECTED; **`notes` required (400)**; inserts level-1 REJECTED step. |

### Pembayaran

| Method · Path | Purpose |
|---|---|
| `GET /api/finance/pembayaran` | List. Query: `status`, `search` (doc_number / bank_tujuan_nama), `page`, `size`. Joins `permintaan_uang`, attaches `biaya_lain`. (Note: `meta.total` = page row count, not a true count.) |
| `POST /api/finance/pembayaran` | Create. Requires `permintaan_uang_id/tanggal_pembayaran/nominal_bayar/bank_tujuan_nama/bank_tujuan_nomor`; **422 unless referenced request is APPROVED**. Inserts `biaya_lain`. Created as DRAFT. 201. |
| `GET /api/finance/pembayaran/[id]` | Detail (+ nested request & project, biaya_lain). |
| `POST /…/[id]/execute` | DRAFT → PAID **and** cascades linked request → PAID (no status guard). |

---

## 6. Screens & Components

All pages are client components; all UI primitives come from `@workspace/ui/*` (no `apps/web/components` imports). Helper widgets (`SearchableSelect`, `EmployeePicker`, `InternalItemsBuilder`, `BiayaLainBuilder`, status badges, `ActionModal`) are defined **inline** per page. Types/helpers in `apps/web/types/fund-request.ts` (`formatRpFR`, `formatDateFR`, `isOverdueFR`, status label/color maps).

- **`/permintaan-uang`** — list with search + status + date filters; columns: doc no., tgl, basis (PROJECT/INTERNAL badge), due date (overdue red), nominal, status, requestor. Row → detail.
- **`/permintaan-uang/new`** — create form; PROJECT (project SearchableSelect) vs INTERNAL (items builder); `EmployeePicker` (debounced `/api/finance/employees`); "Simpan Draft" vs "Simpan & Ajukan".
- **`/permintaan-uang/[id]`** — detail + status-conditional actions (Ajukan / Approve / Tolak / Buat Pembayaran); approval history.
- **`/pembayaran`** — payment list (search + status); Ref PU, penerima, nominal, status, source bank.
- **`/pembayaran/new`** — pick an APPROVED request (auto-fills nominal); source-bank COA (`?type=asset`), destination bank, biaya-lain builder; audit pickers.
- **`/pembayaran/[id]`** — detail + "Tandai Lunas".

The `?status=PENDING_APPROVAL` URL is the **approvals queue** view of the list.

---

## 7. Known Gaps & Risks

- **No GL posting.** COA references (`bank_dari_coa_id`, biaya-lain `coa_id`) and PIC Finance are captured but never posted to the ledger; `/execute` only flips status. This module does **not** affect financial statements.
- **No auth/RBAC** and a hard-coded tenant; `created_by` is taken from the request body.
- **Race-prone doc numbers** (`count(*)+1`); concurrent inserts can collide with the UNIQUE constraint.
- **`/execute` has no status guard and no undo** — any non-PAID payment can be marked paid; cascades the request to PAID.
- **No nominal reconciliation** — payment amount is editable and multiple payments can be created against one approved request (overpay/double-pay possible).
- **Dead enum states & columns** — pembayaran approval states, `CANCELLED`, and the payment approver/submitted columns are never used.
- **PostgREST filter interpolation** of `search` is unescaped.

---

## 8. Testing

No automated suite ships for this module today (logic lives inline in pages/routes rather than a pure module). Recommended verification is manual against a deployed environment:

1. Create a PROJECT request → submit → appears under `?status=PENDING_APPROVAL`.
2. Approve → status APPROVED + one approval step; reject path requires a note.
3. Create a payment against the approved request → blocked unless APPROVED.
4. "Tandai Lunas" → payment PAID and request PAID.
5. Edit is blocked once status ≠ DRAFT.

The live dataset (3 requests, 1 payment, 3 approval steps) is captured in the MIGRATION doc Appendix A for reproducible fixtures.
