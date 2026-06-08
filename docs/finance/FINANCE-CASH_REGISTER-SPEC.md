# FINANCE — Cash / Bank Register (Buku Kas/Bank) — Full Specification

**Module:** Finance & Accounting → Cash/Bank Register
**Route:** `/finance/cash-register`
**Stack:** Next.js 16 (App Router) · shadcn/ui · Tailwind v4 · Supabase Postgres 17
**Tenant:** `00000000-0000-0000-0000-000000000001`
**Last updated:** 2026-06-08

> Companion: **`FINANCE-CASH_REGISTER-MIGRATION.md`** — migration steps, ADRs, anti-patterns, dataseed (Appendix A) + company/branch (Appendix B).

---

## ⚠️ Architectural note (read first)

This module ships in **two states** in this spec:
- **§Current** — what exists today: a **standalone, manual, append-only** ledger (`cash_register_entries`) that is **NOT** linked to the general ledger, **NOT** tied to any COA/bank-account, and **does not** reflect AR receipts or modern AP/internal payments. Its running balance is a single global mixed pool computed by a buggy trigger.
- **§Target (Enhanced)** — the architecture the new repo should build: cash-register becomes a **projection / sub-ledger of posted cash & bank journal lines** (COA `1-10001*` Kas, `1-10002*` Bank), automatically fed by the existing **auto-journal engine** that already posts cash/bank legs for AR receipts (`AR-PAY-RCV`), AP payments (`AP-PAY`), and internal disbursements (`PMB-INTERNAL`). This is the user's stated goal: *"integrasi dengan seluruh jurnal entri dan integrasi ke modul AR dan AP."*

---

## Table of Contents

1. [Goal & Scope](#1-goal--scope) · 2. [User Stories](#2-user-stories) · 3. [Current State](#3-current-state-as-is) · 4. [Integration Gap Analysis](#4-integration-gap-analysis) · 5. [Target Enhanced Architecture](#5-target-enhanced-architecture-to-be) · 6. [Database Schema](#6-database-schema) · 7. [API Contract](#7-api-contract) · 8. [Known Gaps & Risks](#8-known-gaps--risks) · 9. [Testing](#9-testing)

---

## 1. Goal & Scope

A real-time cash & bank ledger: every cash/bank movement (in/out), per account, with a correct running balance — and reconcilable to the general ledger and to the AR/AP modules that move money.

**Current scope:** manual entries + a few legacy writers; single global balance.
**Target scope:** auto-fed from posted cash/bank journal lines; per-account balances; AR receipt = IN, AP/internal payment = OUT; opening balances; reconciliation to COA cash/bank balances.

## 2. User Stories

| ID | Story | State |
|---|---|---|
| **US-CR-01** | See daily cash/bank movements (in/out) with running balance + summary. | ✅ (global balance only) |
| **US-CR-02** | Add a manual cash/bank entry (adjustment, opening). | ✅ manual |
| **US-CR-03** | Cash IN appears automatically when an AR payment is received. | ❌ → Target |
| **US-CR-04** | Cash OUT appears automatically on AP payment / internal disbursement. | ❌ → Target |
| **US-CR-05** | Per-account balances (Kas, BCA, Mandiri, …) that reconcile to the COA cash/bank ledger. | ❌ → Target |
| **US-CR-06** | Opening balance per cash/bank account. | ❌ → Target |

## 3. Current State (As-Is)

### 3.1 Screen
`/finance/cash-register` (client): 3 summary cards (Total Masuk, Total Keluar, Saldo Akhir "auto-calculated"), filters (search, type in/out, date range, refresh), an entries table (Date · Type · Source · Account · Reference · Description · Debit(In) · Credit(Out) · Running Balance), and a **fully manual** "Tambah Entry" dialog. The `account_name` dropdown is **hardcoded free text** ("Kas Kecil" / "Bank BCA" / "Bank Mandiri") — not an FK.

### 3.2 Who writes `cash_register_entries`
All plain inserts, **no journal, no COA**:
1. **Manual UI** → `POST /api/finance/cash-register` (blind `insert(body)`).
2. **Legacy `vendor-bills/[id]/record-payment`** → OUT, `account_name='Kas Kecil'`.
3. **Legacy `payment-vouchers/[id]/issue`** → OUT; also mutates `bank_accounts.current_balance` / `petty_cash_custodians.current_balance` directly.
4. **Legacy `money-requests/[id]/pay`** → OUT (code comments mark it *"Legacy: create cash_register entry"*).

The **modern** Indonesian modules (`ar_invoices`, `ap_invoices`, `permintaan_uang`/`pembayaran`) **do not** write here — they post journals instead.

### 3.3 Balance (trigger-maintained, buggy)
`trg_update_cash_balance` (BEFORE INSERT) sets `running_balance = MAX(running_balance)` of prior rows ± amount; `trg_recalc_cash_balance` (AFTER UPDATE) re-walks the whole table. **One global balance** ignoring `account_name`/`coa_id`; no opening balance; `MAX()` (not latest-by-date) is wrong for back-dated/out-of-order rows. `coa_id` exists but is **never populated**.

## 4. Integration Gap Analysis

| # | Gap | Detail |
|---|---|---|
| G-1 | **No journal linkage** | `cash_register_entries` has no `journal_entry_id`/`journal_line_id`; `coa_id` unused. Zero connection to the GL. |
| G-2 | **Balances not derived from the GL** | The true cash position lives in posted `journal_lines` on COA `1-1000x` (the cash-flow report already proves this). The register computes its own (buggy) number. |
| G-3 | **No auto-entry on AR receipt / AP pay / disbursement** | `ar_payment_history`, `ap_payment_history`, `pembayaran` post journals but write nothing to the register; the register's only writers post no journals. |
| G-4 | **`account_name` is free text, not an FK** | Varies per writer ("Bank Transfer" vs "Bank BCA"…); no link to COA or `bank_accounts`. |
| G-5 | **No AR-receipt reflection** | `customer_payment` source label exists but nothing creates such rows. |
| G-6 | **No modern AP/internal reflection** | Only legacy vendor-bills/vouchers write OUT rows. |
| G-7 | **No opening balance** | Starts at 0; `opening_balance` source enum unused; `bank_accounts.opening_balance`/COA unused. |
| G-8 | **Two money-request stacks, three balance stores** | `money_requests` (legacy) vs `permintaan_uang`/`pembayaran`; balances in `cash_register_entries`, `petty_cash_custodians`, and GL cash/bank COA — none reconciled. |
| G-9 | **No tenant scoping** | `cash_register_entries` has no `tenant_id`; RLS `USING(true)`. |
| G-10 | **Summary ignores filters, not per-account** | Global SUM in JS; reads last row's global balance. |

### Building blocks already in place (good news)
- The **auto-journal engine** (`processJournalAutomation`) already posts cash/bank legs: `AR-PAY-RCV` (Dr Kas/Bank), `AP-PAY` (Cr Kas/Bank), `PMB-INTERNAL` (Cr Kas/Bank) — dynamic sources `ar_bank_coa`/`ap_bank_coa`/`pmb_bank_coa`.
- COA cash/bank accounts seeded: `1-10001 Kas` (+ `1-10001-1 Kas Kecil`), `1-10002 Bank` (+ `1-10002-1..6` BCA/Mandiri/BRI). `DEFAULT_CASH_CODE='1-10002'`.
- Every payment row already carries the bank COA + a journal back-link: `ar_bank_accounts.coa_id` + `ar_payment_history.journal_entry_id`; `ap_payment_history.bank_coa_id` + `journal_entry_id`; `pembayaran.bank_dari_coa_id` + `journal_entry_id`. A `bank_transactions` reconciliation table (with `journal_entry_id`) also already exists.

## 5. Target Enhanced Architecture (To-Be)

**Principle:** the **general ledger is the single source of truth** for cash/bank. The cash-register is a **read-projection (or trigger-materialized mirror) of posted journal lines on cash/bank COA**, never a parallel hand-maintained ledger.

### 5.1 Source of truth
A cash/bank movement is any **posted `journal_lines` row whose `coa_id` is a cash/bank account** (COA code prefix `1-10001`/`1-10002`, or flagged via a `coa.is_cash_account` boolean to add). The auto-journal engine already creates these for AR/AP/internal payments; manual journals create the rest.

### 5.2 Projection definition
```
entry            = a posted journal_line on a cash/bank COA
entry_type       = debit_amount > 0 ? 'in' : 'out'
amount           = debit_amount + credit_amount   (one side is 0)
account (coa_id) = the journal_line.coa_id        (Kas / BCA / Mandiri / …)
date             = journal_entries.transaction_date
description      = journal_entries.description
source_type/id   = journal_entries.source_type / source_id  (ar_payment, ap_payment, pembayaran, manual, …)
journal_entry_id = journal_entries.id             (drill-through)
running_balance  = window SUM(debit−credit) OVER (PARTITION BY coa_id ORDER BY transaction_date, created_at)
```
Implement as a **SQL VIEW** `v_cash_register` (cleanest, always consistent) **or** a trigger on `journal_lines` insert that materializes a `cash_register_entries` row when `coa_id` is a cash/bank account (if a writable table is required for annotations/attachments).

### 5.3 Account dimension
Replace free-text `account_name` with **`coa_id`** (FK to the cash/bank COA) and/or **`bank_account_id`** (FK to a consolidated `bank_accounts` that itself has `coa_id`). Per-account balances = per-`coa_id` cumulative sum. Opening balances = `BEGINNING_BALANCE` journals on the cash/bank COA (or `bank_accounts.opening_balance` posted as an opening journal).

### 5.4 Module integration (already wired at the journal layer)
| Event | Existing journal config | Register effect (automatic) |
|---|---|---|
| AR payment received | `AR-PAY-RCV` (Dr `ar_bank_coa`) | **IN** on that bank account |
| AP payment | `AP-PAY` (Cr `ap_bank_coa`) | **OUT** |
| Internal disbursement | `PMB-INTERNAL` (Cr `pmb_bank_coa`) | **OUT** |
| Manual cash/bank journal | manual entry on `1-1000x` | IN/OUT per side |

Because these journals already post, the projection needs **no new writers** — only the view/materialization + retiring the 3 legacy ad-hoc writers (route them through the journal engine instead).

### 5.5 Migration path (incremental, safe)
1. Add `coa.is_cash_account` (or reuse code prefix) + consolidate the duplicate `bank_accounts` (keep the one with `coa_id` + `bank_transactions`).
2. Build `v_cash_register` view over posted cash/bank journal lines; point `GET /cash-register` + `/summary` at it (per-account + date-aware).
3. Backfill: ensure AR/AP/internal payments post their journals (already do); stop the 3 legacy writers from inserting ad-hoc rows — convert them to post journals.
4. Add `tenant_id` + real RLS; add opening-balance journals.
5. (Optional) keep `cash_register_entries` only for manual annotations/attachments, each linked to a `journal_line_id`.

## 6. Database Schema

(Current tables — see MIGRATION doc for full column lists.) `cash_register_entries` (no `tenant_id`, free-text `account_name`, unused `coa_id`, trigger-maintained global `running_balance`); `money_requests` (legacy NIK-based); `bank_accounts` (**defined twice** — one variant has `coa_id`+`opening_balance`+`bank_transactions`, the other doesn't — consolidate); `petty_cash_custodians` / `petty_cash_entries` (proper per-custodian sub-ledger with role-based RLS, but no COA/journal link).

## 7. API Contract

| Method · Path | Purpose |
|---|---|
| `GET /api/finance/cash-register` | List. Query `from`/`to` (entry_date), `type` (in/out), `account` (name; UI never sends it). Service-role, no auth. |
| `POST /api/finance/cash-register` | Create — blind `insert(body)`; no validation beyond DB CHECKs. |
| `GET /api/finance/cash-register/summary` | `{ total_in, total_out, running_balance, net }` — global, **ignores filters**. |

(Target: both reads project from `v_cash_register`, per-account & date-aware, behind auth + tenant RLS.)

## 8. Known Gaps & Risks

- **Orphaned ledger** (G-1…G-10): no GL/COA/AR/AP linkage; buggy single-global running balance; free-text accounts.
- **Duplicate `bank_accounts` + `cash_register_entries`/`money_requests` migrations** — order-dependent, divergent on `coa_id`.
- **Two money-request stacks**; **three unreconciled balance stores** (register, custodian, GL).
- **No auth / no `tenant_id`** on the register; RLS `USING(true)`.
- **Direct balance mutation** in `payment-vouchers/issue` (bank/custodian balances + register row, none transactional, none the GL).
- **`purpose_type` CHECK has a malformed value** `' operational'` (leading space) in `money_requests`.

## 9. Testing

No automated suite today. For the target build: a view-equivalence test (sum of `v_cash_register` per `coa_id` == COA cash/bank balance from posted journals), AR-receipt→IN and AP-pay→OUT projection tests, opening-balance test, and per-account running-balance correctness. Live data: 1 `cash_register_entries` row + 1 `petty_cash_custodians` row in the MIGRATION doc Appendix A.
