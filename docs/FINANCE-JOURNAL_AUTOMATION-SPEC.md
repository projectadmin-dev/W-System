# FINANCE · Journal Automation + Tax Withholding (PPh 23) — SPEC

> **Purpose.** Single authoritative specification of the config-driven journal
> automation engine and the PPh 23 withholding extension built in the W-System
> finance module. Written for an **AI agent or engineer migrating this module to
> another system** — it states not just *what* exists but *why*, and the
> invariants that must hold for the books to stay correct.
>
> **Companion:** `FINANCE-JOURNAL_AUTOMATION-MIGRATION.md` (the step-by-step
> migration / deploy playbook, rollback, and verification queries).
>
> **Provenance:** consolidates `JOURNAL-AUTOMATION-PLAN.md`,
> `JOURNAL-AUTOMATION-REVISION-SPEC.md`, and `TAX-WITHHOLDING-PLAN.md`.
> Stack: Next.js 16 App Router · Supabase/Postgres · TypeScript · Turborepo.
> Tenant scope: single tenant `00000000-0000-0000-0000-000000000001`.

---

## Table of Contents

1. [Overview & Business Context](#1-overview--business-context)
2. [User Stories & Process Flows](#2-user-stories--process-flows)
3. [Engine Architecture & Design Rules](#3-engine-architecture--design-rules)
4. [Database Schema Reference](#4-database-schema-reference)
5. [Data Seeds & Config Defaults](#5-data-seeds--config-defaults)
6. [Tax Withholding (PPh 23) Model](#6-tax-withholding-pph-23-model)
7. [API / Integration Contracts](#7-api--integration-contracts)
8. [Testing & QA](#8-testing--qa)
9. [Decisions, Deferrals & Anti-Patterns](#9-decisions-deferrals--anti-patterns)
10. [Glossary](#10-glossary)

---

## 1. Overview & Business Context

### 1.1 Problem statement

Finance previously posted journals manually (and one AP path had a hardcoded
journal). This is error-prone, hard to audit, and impossible to change without a
code deploy. We needed **balanced, PSAK-compliant double-entry journals
generated automatically** whenever a finance stakeholder performs one of five
business actions — and the account mappings must be **editable as data**, not
hardcoded.

A second requirement followed: **PPh 23 withholding tax** ("Dibayar/Dipotong
Oleh"). When cash actually moves, one party may withhold income tax from the
other. The books must reflect the *net cash moved* vs *the amount settled*, and
record the tax as either a liability we owe or a creditable prepaid-tax asset.

### 1.2 Stakeholders & roles

| Role | Concern |
|---|---|
| **Finance staff** | Create invoices/bills, record payments, pick the COA per document, set PPh premise, fill bukti potong. |
| **Finance config admin** | Edit the journal config mappings via `/finance/journal-config` (guard-railed CRUD). |
| **System (engine)** | Generate + post balanced journals automatically, non-blocking. |
| **Tax consultant** | Authoritative on rates/applicability (the system models the *mechanism*, not the binding rate). |
| **AI agent / migrator** | The reader of this document. |

### 1.3 Regulatory context

- **PSAK 25** — accounting policy / journal immutability: posted journals are
  immutable; corrections are made by **reversal only**, never edit/delete.
- **UU PPh Pasal 23** — withholding on services. Default **2% (with NPWP)**,
  **4% (without NPWP, 2×)**. Timing = **at payment** (withholding crystallizes
  when cash moves).
- DPP ("Dasar Pengenaan Pajak", the tax base) is **not always the full
  subtotal** — Indonesian rules allow "DPP Nilai Lain" (e.g. 10% for certain
  services). This is modeled as data, not code.

> ⚠️ **Legal disclaimer carried from the design:** specific rates and
> applicability are legal decisions that must be confirmed with a tax
> consultant before go-live. This module implements the *mechanism*.

### 1.4 Scope

**In scope (built & live):**
- 5 trigger codes (AR invoice issue, AR payment receipt, AP bill receipt, AP
  payment, internal disbursement).
- Reversal/void propagation.
- PPh 23 withholding on both AP (we withhold vendor) and AR (customer withholds
  us) and internal disbursement.
- Data-driven PPh rates and DPP categories.
- PPh register / bukti potong report.
- Guard-railed config editor UI.

**Out of scope (deliberately deferred — see §9):** PPN WAPU/DTP, PPh 4(2) final,
multi-jenis PPh in one trigger, historical backfill, multi-currency FX
revaluation, config caching.

---

## 2. User Stories & Process Flows

The engine recognizes **5 trigger codes**. Each maps a business event to a
balanced journal. "Dynamic" accounts are read from the source document at
runtime; "fixed" accounts are locked in the config.

| # | Trigger code | Business event | Module | Journal (Dr / Cr) |
|---|---|---|---|---|
| UC1 | `AR-INV-ISSUE` | Issue a sales invoice | penjualan | **Dr** Piutang Usaha / **Cr** Pendapatan (dynamic) + **Cr** Hutang PPN *(optional)* |
| UC2 | `AR-PAY-RCV` | Receive customer payment | penjualan | **Dr** Bank (dynamic) + **Dr** PPh 23 Dibayar Dimuka *(optional)* / **Cr** Piutang |
| UC3 | `AP-BILL-RCV` | Receive/approve a vendor bill | pembelian | **Dr** Beban/Aset per line (dynamic, multi) + **Dr** PPN Masukan *(optional)* / **Cr** Hutang Usaha |
| UC4 | `AP-PAY` | Pay a vendor bill | pembelian | **Dr** Hutang Usaha / **Cr** Hutang PPh 23 *(optional)* + **Cr** Bank (dynamic) |
| UC5 | `PMB-INTERNAL` | Internal money-request disbursement | pembayaran_internal | **Dr** Beban (dynamic) + **Dr** Biaya Lain (dynamic, multi) / **Cr** Hutang PPh 23 *(optional)* + **Cr** Bank (dynamic) |

### 2.1 Trigger points (where the engine is called)

| UC | Fires on | Source row | Code location |
|---|---|---|---|
| UC1 | invoice create | `ar_invoices` row (one per generated row; handles recurring) | `lib/services/ar-service.ts` → `createInvoice` |
| UC2 | payment recorded | `ar_payment_history` row | `lib/services/ar-service.ts` → `updatePayment` |
| UC3 | bill **approve** (replaced a hardcoded journal) | `ap_invoices` row | AP approve route |
| UC4 | bill pay (partial OK) | `ap_payment_history` row | `app/api/finance/account-payable/[id]/pay/route.ts` |
| UC5 | disbursement execute | `pembayaran` row | `app/api/finance/pembayaran/[id]/execute/route.ts` |

> UC3 fires on **approve**, not on bill creation — so bills that get rejected are
> never journaled.

### 2.2 Worked end-to-end examples

**Scenario A — AP: consultant service Rp1,000,000 + PPN 11% + PPh 23 2%**
```
Receive bill (AP-BILL-RCV, on approve):
  Dr Beban Jasa        1,000,000
  Dr PPN Masukan         110,000
     Cr Hutang Usaha            1,110,000

Pay (AP-PAY, at payment):
  Dr Hutang Usaha      1,110,000
     Cr Hutang PPh 23             20,000   (pph_amount = 1,000,000 × 2%)
     Cr Bank                   1,090,000   (kas_neto = 1,110,000 − 20,000)
```

**Scenario B — AR: we bill service Rp1,000,000 + PPN 11%, customer withholds PPh 23 2%**
```
Issue invoice (AR-INV-ISSUE):  [unchanged by withholding]
  Dr Piutang Usaha     1,110,000
     Cr Pendapatan Jasa        1,000,000
     Cr Hutang PPN               110,000

Receive payment (AR-PAY-RCV):
  Dr Bank              1,090,000   (kas_neto)
  Dr PPh 23 Dibayar Dimuka 20,000   (creditable prepaid-tax asset)
     Cr Piutang Usaha          1,110,000
```

### 2.3 Edge cases the engine must handle (and does)

| Edge case | Behavior |
|---|---|
| **Skip-zero** — an optional line resolves to 0 (e.g. no PPN, no PPh) | Line silently dropped; remaining journal still balances. |
| **No active config** for the trigger | Logged to `jurnal_error_log` as `NO_CONFIG`; business txn proceeds. |
| **Re-trigger** same source | **Idempotent** — no duplicate journal (keyed on `source_type` + `source_id`). |
| **Missing dynamic account** | `MISSING_ACCOUNT` error logged; journal skipped, non-blocking. |
| **Not balanced** | `NOT_BALANCED` logged with the lines; nothing posted. |
| **Source cancelled/voided** | `reverseJournalsForSource()` posts a Dr/Cr-swapped reversal (idempotent). |

---

## 3. Engine Architecture & Design Rules

### 3.1 Layering

```
journal-engine-core.ts   ← PURE. No DB, no imports. Resolves config rows +
                            payload → balanced lines. Unit-tested with node:test.
journal-engine.ts        ← Orchestrator. Loads config from DB, calls the pure
                            core, persists via the PSAK-validated repository,
                            auto-posts, logs errors, links source doc.
journal-config-options.ts ← Shared vocabulary + validateConfig(). Imported by
                            BOTH the API and the UI so the form can never offer a
                            value the DB CHECK would reject.
tax-withholding.ts       ← PURE PPh helpers (resolveDpp, computePphAmount,
                            computeKasNeto, computeWithholding).
tax-withholding-server.ts ← resolveWithholding(): reads rate + DPP category from
                            DB, then calls the pure helpers.
```

**Why a pure core?** It makes the balance/resolution logic unit-testable with
`node --test` — no path aliases, no Supabase. Migrators should preserve this
split: the pure core is the part that must be ported *exactly*.

### 3.2 Config-driven mapping (no hardcoded journals)

A journal config is a header (`konfigurasi_jurnal`) + ordered detail rows
(`konfigurasi_jurnal_detail`). Each detail row says: which **side** (debit/
credit), which **account**, which **nominal**, and whether it's **optional**.

### 3.3 Hybrid account model (the central invariant)

Each detail row references **exactly one of**:
- a **fixed** `coa_id` (a locked account), **OR**
- a **`dynamic_source`** token resolved from the source document at runtime.

Enforced by DB CHECK `chk_account_source`. This is required because
revenue/expense/bank accounts vary per document and cannot be hardcoded.

`dynamic_source` tokens (whitelisted by `chk_dynamic_source`):

| Token | Resolves from | Multi? |
|---|---|---|
| `invoice_revenue_coa` | `ar_invoices.revenue_coa_id` | no |
| `ar_bank_coa` | `ar_bank_accounts.coa_id` (via payment) | no |
| `ap_bank_coa` | `ap_payment_history.bank_coa_id` | no |
| `pmb_expense_coa` | `permintaan_uang.expense_coa_id` | no |
| `pmb_bank_coa` | `pembayaran.bank_dari_coa_id` | no |
| `ap_line_coa` | `ap_invoice_items.coa_id` (per line) | **yes** |
| `pmb_biaya_lain_coa` | `pembayaran_biaya_lain.coa_id` (per line) | **yes** |

A **multi** token expands into N journal lines, one per source-document line
(zero-amount lines skipped).

### 3.4 Nominal vocabulary (`sumber_nominal`)

Whitelisted by DB CHECK `chk_sumber_nominal`. Scalar tokens come from
`payload.nominals`; per-line tokens pair with a multi `dynamic_source`.

| Token | Per-line? | Meaning |
|---|---|---|
| `grand_total` | no | document total |
| `subtotal` | no | before tax (DPP basis) |
| `pajak` | no | PPN amount |
| `total_piutang` | no | AR receivable total |
| `bayar_sekarang` | no | gross amount being settled |
| `nominal_bayar` | no | disbursement principal |
| `line_amount` | **yes** | per-line amount |
| `line_tax` | **yes** | per-line tax |
| `biaya_lain_amount` | **yes** | per-line other-cost |
| `pph_amount` | no | **PPh withheld** (tax extension) |
| `kas_neto` | no | **net cash = gross − pph** (tax extension) |

### 3.5 The four hard rules (NFR contract)

1. **Always balanced.** Persisted only when `|Σdebit − Σcredit| ≤ 0.01` and
   `≥ 2` lines. Validated in the pure core *and* re-validated by the DB
   `validate_journal_entry_balance` trigger on draft→post (defense in depth).
2. **Non-blocking (NFR-02).** Any engine failure is written to
   `jurnal_error_log` and returned to the caller — it must **never** roll back
   the business transaction. The route surfaces a `warning`, not an error.
3. **Idempotent.** A source document with an existing active (draft/posted,
   non-reversal) journal is a no-op. Key = `(source_type, source_id)`.
4. **Skip-zero.** Lines whose resolved nominal is `≤ 0` are dropped silently.
   This is what makes optional PPN/PPh lines disappear cleanly when not present.

### 3.6 Draft → Post (PSAK immutability)

The engine inserts the entry as `status='draft'`, inserts lines, then **posts**.
Reasons:
- The DB enforces immutability on posted entries (`prevent_posted_modification`).
- Balance is validated by the DB on the draft→posted transition.
- A draft can be rolled back if line insertion fails (posted entries cannot).

`createJournalEntry()` also populates `debit_amount_base`/`credit_amount_base`
(`amount × exchange_rate`) — the balance trigger sums the **base** columns, so
omitting them was an integrity gap (fixed; see MIGRATION doc).

### 3.7 Entry numbering & fiscal period

- Entry number: `JE-{YYYYMM}-{last-6-digits-of-epoch-ms}` (matches the manual
  route). *Not* the original SDD `JRN-{YYYYMMDD}-{seq}`.
- Fiscal period auto-assigned by DB trigger `auto_assign_fiscal_period`; the
  engine also resolves a best-effort non-closed period.
- Actor columns FK to `user_profiles`; a `SYSTEM_USER` constant is the fallback
  when a route has no actor id.

---

## 4. Database Schema Reference

> ⚠️ **Migrator: read the CHECK constraints before generating any INSERT.** The
> engine relies on them; a value outside the whitelist is rejected at the DB.

### 4.1 New tables

**`konfigurasi_jurnal`** (config header)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `tenant_id` | uuid | |
| `kode_konfigurasi` | varchar(40) | the trigger code, e.g. `AR-INV-ISSUE` |
| `nama_fitur` | varchar(150) | |
| `modul_referensi` | varchar(30) | CHECK ∈ `penjualan, pembelian, pembayaran_internal` |
| `tipe_jurnal` | varchar(50) | |
| `is_aktif` | bool | engine only loads `is_aktif=true` |
| `keterangan` | text | |
| audit | `created_by/updated_by/created_at/updated_at/deleted_at` | soft-delete |
| | | UNIQUE `(tenant_id, kode_konfigurasi)` |

**`konfigurasi_jurnal_detail`** (config lines)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `tenant_id` | uuid | |
| `konfigurasi_id` | uuid FK → header | ON DELETE CASCADE |
| `coa_id` | uuid FK → coa | **nullable** (fixed account) |
| `dynamic_source` | varchar(40) | **nullable** (dynamic token) |
| `posisi` | varchar(6) | CHECK ∈ `debit, credit` |
| `sumber_nominal` | varchar(40) | CHECK = nominal whitelist (§3.4) |
| `urutan` | smallint | line order |
| `keterangan_baris` | varchar(150) | |
| `is_optional` | bool | skip silently when nominal=0 |

Constraints: `chk_account_source` (exactly one of coa_id/dynamic_source),
`chk_dynamic_source` (token whitelist), `chk_sumber_nominal` (nominal whitelist).

**`jurnal_error_log`** — non-blocking failure log.
Columns: `id, tenant_id, kode_konfigurasi, source_type, source_id, error_code,
pesan_error, payload_json (jsonb), created_at`. Index on `(source_type, source_id)`.

**`ap_payment_history`** — mirrors `ar_payment_history`; each AP payment row
carries its own `bank_coa_id` and becomes the journal source for UC4 (enables
partial payments). Key columns: `ap_invoice_id`, `bayar_sekarang`, `bank_coa_id`,
`journal_entry_id`, plus withholding columns (§6).

**`pph_tarif_default`** — data-driven rate table.
`(tenant_id, pph_jenis, ber_npwp) → tarif`. UNIQUE on that triple. Adding a rate
is a data change.

**`dpp_kategori`** — data-driven DPP category table.
`kode, nama, jenis_pajak (ppn|pph|both), metode (nilai_penuh|persentase|manual),
faktor`. CHECK: `persentase` requires `faktor > 0`.

### 4.2 Column additions on existing tables

| Table | Added columns | Purpose |
|---|---|---|
| `ar_bank_accounts` | `coa_id` | UC2 Dr Bank resolution |
| `ar_invoices` | `revenue_coa_id`, `journal_entry_id` | UC1 Cr revenue + link |
| `ar_payment_history` | `journal_entry_id` | UC2 idempotency link |
| `permintaan_uang` | `expense_coa_id` | UC5 Dr expense |
| `pembayaran` | `journal_entry_id` | UC5 idempotency link |
| `ar_invoices`, `ap_invoices` | PPh premise block (§6.1) + `pph_dpp_kategori_id` | withholding intent |
| `pembayaran` | PPh premise + `kas_neto`, `pph_dpp_kategori_id`, `pph_dpp` | UC5 withholding |
| `ap_payment_history`, `ar_payment_history` | `pph_amount`, `kas_neto`, `nomor_bukti_potong`, `tanggal_bukti_potong` | realized withholding + slip |

`journal_entries.source_type` CHECK extended with:
`ar_invoice, ar_payment, ap_invoice, ap_payment, pembayaran`.

### 4.3 RLS

All new tables: RLS enabled, permissive `USING (true)` read + write policies
(single-tenant app behind service-role server routes). Tighten if porting to a
multi-tenant RLS posture.

---

## 5. Data Seeds & Config Defaults

### 5.1 The 5 trigger configs (locked COA mapping)

> Seed is **idempotent**: it upserts the header (`ON CONFLICT (tenant_id,
> kode_konfigurasi)`) and rebuilds the detail rows (`DELETE` then `INSERT`).
> Fixed COA resolved by `account_code`. Seed aborts loudly if a required COA is
> missing.

Required COA (resolved by code): `1-10100` Piutang Usaha · `2-10200-4` Hutang
PPN · `1-10400-1` PPN Masukan · `2-10100` Hutang Usaha · `2-10200-2` Hutang
PPh 23 · `1-10400-3` PPh 23 Dibayar Dimuka *(created by the tax migration)*.

**`AR-INV-ISSUE`**
| # | Posisi | Account | Nominal | Optional |
|---|---|---|---|---|
| 1 | debit | `1-10100` Piutang Usaha | `total_piutang` | no |
| 2 | credit | *dyn* `invoice_revenue_coa` | `subtotal` | no |
| 3 | credit | `2-10200-4` Hutang PPN | `pajak` | **yes** |

**`AR-PAY-RCV`** *(after Fase C flip)*
| # | Posisi | Account | Nominal | Optional |
|---|---|---|---|---|
| 1 | debit | *dyn* `ar_bank_coa` | `kas_neto` | no |
| 2 | debit | `1-10400-3` PPh 23 Dibayar Dimuka | `pph_amount` | **yes** |
| 3 | credit | `1-10100` Piutang Usaha | `bayar_sekarang` | no |

**`AP-BILL-RCV`**
| # | Posisi | Account | Nominal | Optional |
|---|---|---|---|---|
| 1 | debit | *dyn* `ap_line_coa` (multi) | `line_amount` | no |
| 2 | debit | `1-10400-1` PPN Masukan | `pajak` | **yes** |
| 3 | credit | `2-10100` Hutang Usaha | `grand_total` | no |

**`AP-PAY`** *(after Fase B flip)*
| # | Posisi | Account | Nominal | Optional |
|---|---|---|---|---|
| 1 | debit | `2-10100` Hutang Usaha | `bayar_sekarang` | no |
| 2 | credit | `2-10200-2` Hutang PPh 23 | `pph_amount` | **yes** |
| 3 | credit | *dyn* `ap_bank_coa` | `kas_neto` | no |

**`PMB-INTERNAL`** *(after Fase E flip)*
| # | Posisi | Account | Nominal | Optional |
|---|---|---|---|---|
| 1 | debit | *dyn* `pmb_expense_coa` | `nominal_bayar` | no |
| 2 | debit | *dyn* `pmb_biaya_lain_coa` (multi) | `biaya_lain_amount` | no |
| 3 | credit | `2-10200-2` Hutang PPh 23 | `pph_amount` | **yes** |
| 4 | credit | *dyn* `pmb_bank_coa` | `kas_neto` | no |

> The "after flip" configs read `kas_neto`. They are only safe once the route
> sending `kas_neto` is deployed — see the **deploy-ordering** rule in the
> MIGRATION doc.

### 5.2 PPh rate seed (`pph_tarif_default`)

| pph_jenis | ber_npwp | tarif |
|---|---|---|
| `pph23` | true | **2.00** |
| `pph23` | false | **4.00** (2×) |

### 5.3 DPP category seed (`dpp_kategori`)

| kode | metode | faktor | usage |
|---|---|---|---|
| `PENUH` *(default)* | nilai_penuh | — | DPP = full subtotal |
| `NL-10` | persentase | 0.1000 | travel/freight/courier services (DPP Nilai Lain 10%) |
| `MANUAL` | manual | — | finance enters DPP directly |

---

## 6. Tax Withholding (PPh 23) Model

### 6.1 The premise columns (per module)

Added to `ar_invoices`, `ap_invoices`, `pembayaran` (defaults make every
existing row behave exactly as before — **zero-impact, opt-in per transaction**):

| Column | Default | Meaning |
|---|---|---|
| `ppn_dipungut_oleh` | `kita` | who collects/remits PPN (`kita`/`lawan_transaksi`/`tidak_ada`) |
| `pph_jenis` | NULL | `pph23` … (CHECK whitelist) |
| `lawan_punya_npwp` | `true` | false → rate doubles (2%→4%) |
| `pph_tarif` | NULL | resolved from `(jenis, npwp)`; overridable |
| `pph_dipotong_oleh` | `tidak_ada` | who withholds/remits PPh |
| `pph_dpp` | NULL | resolved DPP snapshot |
| `pph_amount` | `0` | computed = DPP × tarif/100 |
| `pph_dpp_kategori_id` | NULL | FK → `dpp_kategori` |

`ap_payment_history` / `ar_payment_history` carry the **realized** `pph_amount`
+ `kas_neto` (and bukti potong number/date) — these drive the journal.

### 6.2 The golden rule (who remits → which side)

> **We remit → liability** (Hutang Pajak). **Counterparty remits (withholds from
> us) → asset** (Pajak Dibayar Dimuka, a creditable credit). **`tidak_ada` → no
> tax line.**

| Context | Effect (at payment) | Account |
|---|---|---|
| **AP**, `dipotong_oleh = kita` | we withhold vendor; cash out < payable | **Cr** `2-10200-2` Hutang PPh 23 |
| **AR**, customer withholds us | cash in < receivable | **Dr** `1-10400-3` PPh 23 Dibayar Dimuka |
| `tidak_ada` | — | — |

Account direction is **fixed per trigger** (AR vs AP context decides it), so no
new dynamic_source is needed for PPh — just a fixed COA + skip-zero. (Multi-jenis
PPh in one trigger would need a future `pph_payable_coa` dynamic_source.)

### 6.3 "Lunas" ≠ "cash moved"

When we withhold Rp20k from a Rp1,110k settlement:
- **Cash out = Rp1,090k** (`kas_neto`, sent to vendor).
- **Payable cleared = Rp1,110k** (`bayar_sekarang`, gross — vendor is fully
  settled; the Rp20k is remitted to the state on their behalf with a bukti potong).

`amount_paid` on the module increases by the **gross**, not the net, so paid
status stays accurate.

### 6.4 DPP resolution (pure, in `tax-withholding.ts`)

```
base = subtotal (exclude PPN)
dpp  = nilai_penuh → base
       persentase  → round(base × faktor)     // e.g. NL-10 → base × 0.10
       manual      → finance input (fallback base)
pph_amount = roundRupiah(dpp × tarif / 100)    // whole rupiah
kas_neto   = roundRupiah(gross − pph_amount)
```

`computeWithholding({ grossSettled, base, dipotongOleh, tarif, kategori,
manualDpp })` returns `{ dpp, pphAmount, kasNeto }`. When `dipotongOleh ===
'tidak_ada'` everything is 0 and `kas_neto = gross` → journal identical to
pre-withholding behavior.

### 6.5 Server resolution (`resolveWithholding`)

The route **never trusts a client-sent `pph_amount`**. It reads the rate from
`pph_tarif_default` (unless overridden) and the DPP category from `dpp_kategori`,
then calls the pure `computeWithholding`. Both AP and AR routes use the same
function so they compute identically.

---

## 7. API / Integration Contracts

### 7.1 Engine entry point

```ts
processJournalAutomation(payload: JournalAutomationPayload)
  : Promise<JournalAutomationResult>   // never throws
```

`JournalAutomationPayload`:
```ts
{
  triggerCode: string          // e.g. "AP-PAY"
  sourceType: string           // e.g. "ap_payment"
  sourceId: string             // UUID of the source row
  tenantId: string
  transactionDate: string      // YYYY-MM-DD
  createdBy: string            // user UUID (or SYSTEM_USER)
  description?, referenceNumber?, currency?
  nominals?: Partial<Record<ScalarNominalSource, number>>
  dynamicAccounts?: Partial<Record<SingleDynamicSource, string|null>>
  dynamicLines?: Partial<Record<MultiDynamicSource, { coaId, amount, description? }[]>>
}
```

`JournalAutomationResult`: `{ success, journalEntryId?, entryNumber?, skipped?,
idempotent?, errorCode?, message? }`. Error codes: `NO_CONFIG | NO_LINES |
MISSING_ACCOUNT | NOT_BALANCED | PERSIST_FAILED`.

**Reversal:** `reverseJournalsForSource(sourceType, sourceId, reason, userId)` →
`{ reversed, entryIds, errors }`. Swaps Dr/Cr, posts, idempotent (skips entries
already reversed).

### 7.2 Canonical wiring (UC4 — AP pay, the reference example)

```ts
// 1. Resolve withholding authoritatively (never trust the client).
const wh = await resolveWithholding(db, TENANT,
  { dipotongOleh, jenis, berNpwp, tarifOverride, dppKategoriId, manualDpp },
  Number(inv.subtotal),   // DPP basis
  payAmt)                 // gross settled

// 2. Persist the payment row (the journal source) with realized amounts.
const payHist = await db.from('ap_payment_history').insert({
  ..., bayar_sekarang: payAmt, pph_amount: wh.pphAmount, kas_neto: wh.kasNeto,
})

// 3. Fire the engine (non-blocking; surface result.warning, not error).
const result = await processJournalAutomation({
  triggerCode: 'AP-PAY', sourceType: 'ap_payment', sourceId: payHist.id,
  tenantId: TENANT, transactionDate: today, createdBy: actor ?? SYSTEM_USER,
  nominals: { bayar_sekarang: payAmt, pph_amount: wh.pphAmount, kas_neto: wh.kasNeto },
  dynamicAccounts: { ap_bank_coa: bankCoaId },
})
```

Key contract points:
- `bayar_sekarang` = gross (clears Hutang); `kas_neto` = actual cash out;
  `pph_amount` = withheld.
- When no PPh: `pph_amount=0` (line skipped) and `kas_neto=payAmt` → byte-for-byte
  identical to the pre-withholding journal.
- Bank COA falls back to `DEFAULT_CASH_CODE` via `getCoaIdByCode` if not provided.

### 7.3 Config CRUD API (guard-railed)

| Route | Method | Purpose |
|---|---|---|
| `/api/finance/journal-config` | GET, POST | list / create config |
| `/api/finance/journal-config/[kode]` | PUT, DELETE | update / soft-delete |
| `/api/finance/journal-config/[kode]/toggle` | PATCH | activate/deactivate |

Every write validated by `validateConfig()` (the same function the UI uses):
- exactly one of coa_id/dynamic_source per row,
- dynamic_source ∈ whitelist, sumber_nominal ∈ whitelist,
- ≥ 2 rows, ≥ 1 debit and ≥ 1 credit.

UI: `/finance/journal-config` — dropdown-only editor (never free-text for tokens),
live validation, PSAK immutability banners, dormant-trigger warning.

### 7.4 Tax / report API

| Route | Method | Purpose |
|---|---|---|
| `/api/finance/tax/refs` | GET | DPP categories + PPh rates (for forms) |
| `/api/finance/tax/withholding-report` | GET | monthly PPh register + GL balances |
| `/api/finance/tax/bukti-potong` | PATCH | set slip number/date |

UI: `/finance/pph` — month picker, 4 KPI cards, keluaran/masukan registers with
inline bukti-potong editing, CSV export.

---

## 8. Testing & QA

### 8.1 Unit suites (pure, `node --test --experimental-strip-types`)

| File | Coverage |
|---|---|
| `journal-engine-core.test.ts` | balance, skip-zero, missing-account, multi-line expansion, all 5 trigger mappings balance (13 tests) |
| `tax-withholding.test.ts` | resolveDpp (all methods), computePphAmount (2%/4%/rounding/zero), end-to-end incl. NL-10 (12 tests) |
| `ap-pay-config.test.ts` | AP-PAY, AR-PAY-RCV, PMB-INTERNAL configs balanced with and without PPh |

Run:
```bash
node --test --experimental-strip-types apps/web/lib/finance/__tests__/*.test.ts
```

### 8.2 QA module

Runs logged to `/finance/qa` (modules `journal-automation`, `tax-withholding`)
via `POST /api/finance/qa` (`qa_test_runs` + `qa_test_cases`). Status: 13/14 PASS;
**TC-014 (live HTTP smoke test)** pending — end-to-end route→engine→journal by a
Finance user in the deployed UI.

### 8.3 What unit tests do NOT cover (verify in deployed env)

- Live HTTP execution of the 5 routes (no Next runtime / service-role key in CI).
- Real Supabase persistence + the DB balance/immutability triggers firing.
- UI interaction of the config editor and PPh report.

---

## 9. Decisions, Deferrals & Anti-Patterns

### 9.1 Architecture decisions (ADR-style)

| Decision | Rationale |
|---|---|
| **Reuse** `journal_entries`/`journal_lines` (not new `jurnal` tables) | PSAK double-entry core already existed with balance + immutability triggers. |
| **Config-driven** mapping in DB | Account mappings change without a code deploy; Finance can edit. |
| **Hybrid account model** (fixed OR dynamic) | Revenue/expense/bank accounts vary per document. |
| **Skip-zero** for optional lines | Optional PPN/PPh lines disappear cleanly with no branching logic in the engine. |
| **Draft→post** (not direct insert as posted) | DB validates balance on the transition and enforces immutability; allows rollback on line failure. |
| **Data-driven rates + DPP** | Add a tax type/category as a row, not a code change. |
| **PPh account fixed per trigger** | AR/AP context already determines asset-vs-liability direction. |
| **Withholding resolved server-side** | Never trust client-sent tax amounts. |
| **Backward-compatible defaults** | `pph_dipotong_oleh='tidak_ada'`, `ppn_dipungut_oleh='kita'` → existing data unchanged. |

### 9.2 Deliberate deferrals (technical reasons, not "no time")

- **PPN WAPU/DTP (Fase D):** no WAPU customer exists. Proper support needs
  receivable = DPP only, which conflicts with the **generated column**
  `ar_invoices.total_piutang = subtotal + PPN`. Implementing without a real case
  risks misstating PPN. Mechanism is configurable via `/finance/journal-config`
  when needed.
- **PPh 4(2) final (AR side):** final tax is a *cost*, not a creditable asset →
  different treatment + per-jenis accounts. AP-side 4(2) is mechanically like
  PPh 23 but would need `dynamic_source: pph_payable_coa` for multi-jenis.
- **Historical backfill** (13 AR / 33 AP docs): dating/period is a Finance
  decision. Tooling is ready (`reverse-source` + idempotent engine) but not run
  on production data automatically.
- **Multi-currency FX revaluation:** base = `amount × exchange_rate` (default 1).
- **Config caching:** deferred (no Redis/in-memory TTL yet).

### 9.3 ⚠️ Anti-patterns (AI-hallucination guardrails — DO NOT do these)

1. **DO NOT** edit or delete a posted `journal_entries` row. PSAK immutability;
   correct via **reversal only** (`reverseJournalsForSource`).
2. **DO NOT** put both `coa_id` and `dynamic_source` on a detail row, or
   neither. CHECK `chk_account_source` forbids it.
3. **DO NOT** invent a `dynamic_source` or `sumber_nominal` token. Only the
   whitelisted values exist (§3.3, §3.4); the DB CHECK rejects others. To add
   one you must extend **both** the DB CHECK **and** `journal-engine-core.ts` +
   `journal-config-options.ts`.
4. **DO NOT** make the engine roll back the business transaction on failure. It
   is non-blocking by contract (NFR-02) — log to `jurnal_error_log`, return a
   `warning`.
5. **DO NOT** apply a config that reads `kas_neto` before the route sending
   `kas_neto` is deployed. See deploy-ordering (MIGRATION doc). Wrong order →
   bank line = 0 → unbalanced → journal skipped.
6. **DO NOT** trust a client-sent `pph_amount`. Resolve it server-side via
   `resolveWithholding`.
7. **DO NOT** increment `amount_paid` by `kas_neto`. Paid status uses **gross**
   (`bayar_sekarang`); the withheld amount is remitted on the counterparty's behalf.
8. **DO NOT** skip populating `debit_amount_base`/`credit_amount_base`. The DB
   balance trigger sums the **base** columns.
9. **DO NOT** duplicate the PPh math. There is one pure module
   (`tax-withholding.ts`) shared by routes and UI — keep it the single source.

### 9.4 Known limitations

- **AP header-level discount:** current AP-BILL mapping balances `Σ item subtotal
  + tax = grand_total`. A bill with `discount_amount > 0` would need net
  allocation or a discount line (none exist today; not yet handled).
- **AR / pembayaran cancellation reversal** is not auto-wired (those endpoints
  don't exist). The generic `reverse-source` is available to wire when they do.
  *(AR invoice archive reversal was added via `archiveInvoice`.)*

---

## 10. Glossary

| Term | Meaning |
|---|---|
| **Trigger code** | `kode_konfigurasi` identifying a business event → journal mapping. |
| **DPP** | Dasar Pengenaan Pajak — the tax base. Not always the full subtotal. |
| **PPh 23** | Withholding income tax on services; 2% (NPWP) / 4% (non-NPWP). |
| **PPN** | VAT — *added on top* of price (vs PPh, *withheld from* payment). |
| **WAPU** | Wajib Pungut — a counterparty (e.g. BUMN) that collects/remits VAT itself. |
| **kas_neto** | Net cash actually moved = gross − PPh (− future PPN WAPU). |
| **bayar_sekarang** | Gross amount settled (drives "lunas" status). |
| **Bukti potong** | Withholding slip (number + date) — SPT evidence. |
| **Skip-zero** | Engine drops any line whose resolved nominal ≤ 0. |
| **Idempotency key** | `(source_type, source_id)` — prevents duplicate journals. |
| **NFR-02** | Non-blocking contract: engine never rolls back the business txn. |
