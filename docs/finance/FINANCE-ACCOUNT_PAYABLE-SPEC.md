# FINANCE — Account Payable (AP) — Full Specification

**Module:** Finance & Accounting → Accounts Payable (Pengelolaan Tagihan / Hutang Usaha)
**Routes:** `/finance/ap-aging` (aging report) · `/finance/account-payable` (data management — referenced by tests)
**Stack:** Next.js 16 (App Router) · shadcn/ui · Tailwind v4 · Supabase Postgres 17
**Tenant:** `00000000-0000-0000-0000-000000000001`
**Last updated:** 2026-06-08

> Companion: **`FINANCE-ACCOUNT_PAYABLE-MIGRATION.md`** — migration steps, ADRs, anti-patterns, full live dataseed (Appendix A).

---

## ⚠️ Architectural note (read first)

`/finance/ap-aging` renders a **hard-coded mock** array (fixed "as of 2026-04-22") and does not call the API. The **real** AP logic lives in `apps/web/lib/ap-logic.ts` (pure engine, unit-tested) and the `/api/finance/account-payable` routes. `GET /api/finance/ap-aging` is a **stub** that reads `contacts` and returns all-zero buckets. This spec documents the real engine + routes as primary.

---

## Table of Contents

1. [Goal & Scope](#1-goal--scope) · 2. [User Stories](#2-user-stories) · 3. [Domain Model & State Machine](#3-domain-model--state-machine) · 4. [Pure Engine (`ap-logic.ts`)](#4-pure-engine-ap-logicts) · 5. [Database Schema](#5-database-schema) · 6. [API Contract](#6-api-contract) · 7. [GL Posting](#7-gl-posting) · 8. [Known Gaps & Risks](#8-known-gaps--risks) · 9. [Testing](#9-testing)

---

## 1. Goal & Scope

Manage vendor bills end-to-end: capture a bill (header + line items), run it through **submit → approve/reject → pay** with an audit trail, post a **best-effort GL journal** on approval, and report **aging** + a **4-week cash-out forecast**.

**In scope:** bill capture with items & duplicate guard, workflow state machine, partial/full payment, aging buckets, cash-out forecast, double-entry GL posting on approval.
**Out of scope:** PPh withholding (none); multi-level approval; the `fin_vendors` master (vendors are free text — see Vendor module).

## 2. User Stories

(From `docs/qa/account-payable-test-plan.md`; 58 cases, 96.55% pass, 2 env-blocked.)

| ID | Story |
|---|---|
| **US-001** | Input a bill with items, header/item tax & discount; reject duplicates; auto `AP-YYYY-MM-NNNN`; generated `amount_due`. |
| **US-002** | Approval & payment: state machine, partial & full payment, overpay/non-positive guards, audit steps. |
| **US-003** | AP Aging: Current/1-30/31-60/61-90/>90 buckets; exclude PAID/REJECTED; sums & counts. |
| **US-004** | Cash-out forecast: 4 weekly buckets, APPROVED-only, exclude overdue/non-approved. |
| **US-005** | GL posting: per-item net debit, drop zero/no-COA, fallback line, balance to `grand_total` (PSAK double-entry). |

## 3. Domain Model & State Machine

### 3.1 Status (`ap_invoices.status`, CHECK)
`DRAFT | SUBMITTED | APPROVED | PAID | REJECTED` (default `DRAFT`).

```
DRAFT ──submit──► SUBMITTED ──approve──► APPROVED ──pay(full)──► PAID
  ▲                  │                       │
  │                  └──reject──► REJECTED    └──pay(partial)──► APPROVED (stays)
  └─────── edit / resubmit ◄──────┘
```

Guards (pure, in `ap-logic.ts`): `canEdit`/`canSubmit` = DRAFT|REJECTED; `canApprove`/`canReject` = SUBMITTED; `canPay` = APPROVED; `canDelete` = any except PAID. Route violations return **422** (or **400** when `reject` has no `notes`).

### 3.2 Approval audit (`ap_approval_steps`)
Each action appends a row with `action ∈ {SUBMIT, APPROVE, REJECT, PAY}` and a `step` integer (SUBMIT=1, APPROVE/REJECT=2, PAY=3). **Single approver** — not a multi-level chain.

### 3.3 Classification (`dasar_pengajuan`)
`purchase_order | ppn | infrastructure | overhead | server | lain_lain` (default `lain_lain`). **Comment-only — no DB CHECK.** PPN here is a classification label, not a computed tax.

### 3.4 Money math (`computeTotals`)
```
grand_total = subtotal − (header discount + Σ item diskon) + (header tax + Σ item pajak)
amount_due  = grand_total − amount_paid       -- DB generated column
```
Rounding tolerance `EPS = 0.009` for all money comparisons. **No PPh/withholding.**

### 3.5 Aging buckets (`AGING_DEFS`)
`overdueDays = round((today − tgl_jatuh_tempo)/86,400,000)`: `Current (≤0)`, `1-30`, `31-60`, `61-90`, `>90`. REJECTED excluded; PAID/zero-due skipped.

## 4. Pure Engine (`ap-logic.ts`)

`apps/web/lib/ap-logic.ts` — side-effect-free, framework-agnostic; the single source of truth shared by create/approval/payment routes and the dashboard, unit-tested via `node:test` (`apps/web/lib/__tests__/ap-logic.test.ts`). Internal `n(v)` coerces any value to a finite number.

| Function | Signature | Purpose |
|---|---|---|
| `startOfDay` | `(d?) => Date` | clone with time zeroed |
| `addDays` | `(base, days) => Date` | date arithmetic |
| `ymd` / `dlabel` | `(d) => string` | ISO `YYYY-MM-DD` / `dd/mm` (id-ID) |
| `apNumberPrefix` | `(now?) => string` | `AP-{YYYY}-{MM}-` |
| `formatApNumber` | `(now, countForMonth) => string` | prefix + `(count+1)` padded to 4 |
| `duplicateKey` | `(pihak_ketiga, no_invoice, tgl_terima) => string` | `vendor\|invoice\|date` dup identity (US-001) |
| `computeTotals` | `(items, headerDiscount?, headerTax?) => APTotals` | `{ subtotal, discount_amount, tax_amount, grand_total }` |
| `isPaid` / `isOverdue` / `isOpen` | `(row, today?) => boolean` | dashboard classification |
| `computeAging` | `(rows, today) => AgingBucket[]` | bucket active unpaid rows by overdue days |
| `computeForecast` | `(rows, today, weeks=4) => ForecastBucket[]` | weekly cash-out windows, **APPROVED-only** unpaid |
| `computeSummary` | `(rows, today) => APSummary` | open/overdue counts, paid_total, total_due, aging, forecast |
| `canEdit/canSubmit/canApprove/canReject/canPay/canDelete` | `(status) => boolean` | workflow guards |
| `applyPayment` | `(inv, amount?) => PaymentResult` | validate APPROVED, default=full due, reject ≤0 / overpay (`> due + EPS`); fully paid when `paid >= grand_total − EPS` |
| `buildDebitLines` | `(items, grand_total, fallbackCoaId?) => JournalDebitLine[]` | per-item net debit, drop zero/no-COA, force sum = `grand_total` |

## 5. Database Schema

Migration `20260529000005_account_payable_schema.sql` (mirrors the AR pattern; no RLS/triggers/seed in-migration). **`ap_payment_history` is not defined** — payments are `PAY` rows in `ap_approval_steps`.

### 5.1 `ap_invoices`
`id`, `tenant_id`, `ap_number` (internal `AP-YYYY-MM-NNNN`), `no_invoice` (vendor's), `no_ref_dokumen`, `tgl_terima`, `tgl_jatuh_tempo`, `dasar_pengajuan` (default `lain_lain`, no CHECK), `pihak_ketiga` (vendor free text, NOT NULL), `vendor_id` (optional, **no FK**), `project_id` (FK → `projects` SET NULL), `project_name`, `deskripsi`, `mata_uang`/`kurs`, `subtotal`/`discount_amount`/`tax_amount`/`grand_total`/`amount_paid`, **`amount_due` GENERATED** (`grand_total − amount_paid`), `status` (CHECK), `journal_entry_id` (FK → `journal_entries`), `attachment_url`, lifecycle (`submitted_at`/`approved_at`/`approved_by`/`approver_name`/`rejected_at`/`reject_reason`/`paid_at`), audit, plus tax fields (`ppn_dipungut_oleh`, `pph_*`).
- `UNIQUE (tenant_id, pihak_ketiga, no_invoice, tgl_terima)` (dup guard, US-001). Indexes on tenant, `(tenant_id, status)`, due date, vendor, project.

### 5.2 `ap_invoice_items`
`id`, `ap_invoice_id` (FK **CASCADE**), `urutan`, `deskripsi`, `qty`, `harga`, **`subtotal` GENERATED** (`qty*harga`), `diskon`, `pajak`, `coa_id` (FK → `coa` SET NULL), `coa_kode`/`coa_nama`, `created_at`. Indexes on `(ap_invoice_id)`, `(coa_id)`.

### 5.3 `ap_approval_steps`
`id`, `ap_invoice_id` (FK **CASCADE**), `step`, `action` (`CHECK SUBMIT|APPROVE|REJECT|PAY`), `actor_id`, `actor_name`, `notes`, `created_at`. Index `(ap_invoice_id)`.

## 6. API Contract

`TENANT` hard-coded; `createAdminClient()` (service role, no auth/RBAC).

| Method · Path | Purpose |
|---|---|
| `GET /api/finance/account-payable` | List + dashboard `summary` (`computeSummary` over full set). Query: `display` (open/overdue/paid), `status`, `search` (pihak_ketiga/no_invoice/ap_number), date ranges. Attaches `items`. |
| `POST /api/finance/account-payable` | Create. Required `no_invoice/tgl_terima/tgl_jatuh_tempo/pihak_ketiga` (400); ≥1 item (400); dup → 409. `submit:true` → SUBMITTED + step-1 SUBMIT. 201. |
| `GET /…/[id]` | Detail (+ project, items, approval_steps). 404 if missing. |
| `PATCH /…/[id]` | Edit. **422 unless DRAFT/REJECTED.** `items` array → recompute + replace. |
| `DELETE /…/[id]` | Soft delete. **422 if PAID.** |
| `POST /…/[id]/submit` | DRAFT/REJECTED → SUBMITTED; clears reject fields; step-1 SUBMIT. |
| `POST /…/[id]/approve` | SUBMITTED → APPROVED; **best-effort GL** (see §7); step-2 APPROVE. Returns `{ data, journal_entry_id, warning }`. |
| `POST /…/[id]/reject` | SUBMITTED → REJECTED; **`notes` required (400)**; step-2 REJECT. |
| `POST /…/[id]/pay` | APPROVED → (PAID if fully paid, else stays APPROVED); reject ≤0 (400) / overpay (400); step-3 PAY. |
| `GET /api/finance/ap-aging` | **Stub** — reads `contacts`, returns all-zero buckets. |

## 7. GL Posting

On **approve**, `tryCreateJournal` (best-effort, never throws):
- Resolves AP control account `account_code = '2-10100'` (Hutang Usaha); fallback expense = first `account_type='expense'`.
- Builds per-item net debit lines (`qty·harga − diskon + pajak`), drops zero/no-COA lines, adds a fallback line if empty, then **forces the debit total to equal `grand_total`** (absorbs the rounding difference into the last line when `|diff| > EPS`).
- Inserts `journal_entries` (`status='posted'`, `source_type='invoice'`, `source_id=inv.id`, `JE-YYYY-MM-NNNN`) + balanced `journal_lines` (Dr expense, Cr AP control).
- **Skips silently** (invoice still APPROVED, `journal_entry_id=null`, returns a `warning`) when: no `approver_id`, AP account `2-10100` missing, `grand_total <= 0`, no expense account, or insert failure.

## 8. Known Gaps & Risks

- **`/finance/ap-aging` is mock; `GET /api/finance/ap-aging` is a zero stub.** Real aging math is `computeAging` consumed by the account-payable list route.
- **Logic duplicated in routes** — `/pay`, PATCH totals, and `/approve` GL reimplement the engine inline (same `EPS`), risking drift; only POST-create imports the engine.
- **No auth/RBAC**, hard-coded tenant, RLS-bypassing admin client.
- **`dasar_pengajuan` enum is comment-only** (no CHECK); **`vendor_id` has no FK**; **no PPh** support.
- **GL posting degrades silently** — an approval can succeed with no journal entry; callers must inspect `warning`.
- **Edit can change identity fields** (no_invoice/pihak_ketiga/tgl_terima) on DRAFT/REJECTED bills → may hit `uq_ap_duplicate` as a raw 500.

## 9. Testing

Automated: `node --experimental-strip-types --test apps/web/lib/__tests__/ap-logic.test.ts` (exercises `computeTotals`, `duplicateKey`, aging, forecast, guards, `applyPayment`, `buildDebitLines`). API/DB rules verified by code review. QA: 58 cases, 56 pass, 2 env-blocked (live VPS E2E), 96.55% — logged to `/finance/qa` via `supabase/seed/qa_account_payable_seed.sql`; full plan in `docs/qa/account-payable-test-plan.md`. The live AP dataset (28 bills across all states + items + approval steps) is in the MIGRATION doc Appendix A.
