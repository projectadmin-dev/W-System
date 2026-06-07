# FINANCE · Journal Automation + Tax Withholding (PPh 23) — MIGRATION

> **Purpose.** The operational playbook to **port / deploy / verify** the
> journal automation + PPh 23 module on a fresh system (or re-apply on this one).
> Covers the ordered migration list, the **deploy-ordering rule** that keeps the
> books balanced during rollout, integration wiring, verification SQL, and
> rollback.
>
> **Companion:** `FINANCE-JOURNAL_AUTOMATION-SPEC.md` (the *what & why* — schema,
> engine rules, anti-patterns). Read it first.
>
> Stack: Supabase/Postgres · Next.js 16 App Router · single tenant
> `00000000-0000-0000-0000-000000000001`. System user (actor fallback) is a
> valid `user_profiles` UUID.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Migration File Index (apply in order)](#2-migration-file-index-apply-in-order)
3. [The Deploy-Ordering Rule (critical)](#3-the-deploy-ordering-rule-critical)
4. [Phased Rollout Playbook](#4-phased-rollout-playbook)
5. [Integration Wiring Checklist](#5-integration-wiring-checklist)
6. [Verification (post-migration SQL)](#6-verification-post-migration-sql)
7. [Rollback](#7-rollback)
8. [Pre-existing Bugs Fixed (port these too)](#8-pre-existing-bugs-fixed-port-these-too)
9. [Migrating to a Different Stack](#9-migrating-to-a-different-stack)

---

## 1. Prerequisites

Before applying anything, confirm the target DB already has:

- **`journal_entries` / `journal_lines`** double-entry core, with triggers:
  - `validate_journal_entry_balance` (balance on draft→post),
  - `prevent_posted_modification` (immutability),
  - `auto_assign_fiscal_period`.
  - Columns `debit_amount_base` / `credit_amount_base` (the balance trigger sums
    the **base** columns — see §8).
- **`coa`** with the required accounts (resolved by `account_code`):
  `1-10100`, `2-10200-4`, `1-10400-1`, `2-10100`, `2-10200-2`, and parent
  `1-10400` (the tax migration creates child `1-10400-3`).
- **`ar_invoices`, `ap_invoices`, `ar_payment_history`, `ar_bank_accounts`,
  `permintaan_uang`, `pembayaran`, `pembayaran_biaya_lain`, `ap_invoice_items`,
  `fiscal_periods`, `user_profiles`.**
- A repository layer exposing `createJournalEntry()` + `postJournalEntry()` (the
  engine reuses these for PSAK-validated insert + post).

If any are absent, port them first — this module sits on top of them.

---

## 2. Migration File Index (apply in order)

All under `supabase/migrations/`. **Additive & idempotent** unless noted. The
numeric prefix is the apply order.

| # | File | What it does | Coupled to code? |
|---|---|---|---|
| 1 | `20260605000001_journal_automation_schema.sql` | Core tables (`konfigurasi_jurnal`, `..._detail`, `jurnal_error_log`, `ap_payment_history`), column adds, `source_type` whitelist, RLS. | no |
| 2 | `20260605000002_seed_journal_automation_config.sql` | Seed the 5 trigger configs (pre-withholding mapping). Idempotent upsert + rebuild. | no |
| 3 | `20260605000003_map_ar_bank_coa.sql` | Backfill `ar_bank_accounts.coa_id` (heuristic kas→`1-10001`, else `1-10002`). | no |
| 4 | `20260605000004_journal_automation_indexes.sql` | Indexes on new FK columns + `reversal_of_id`. | no |
| 5 | `20260606000001_tax_withholding_coa_and_rates.sql` | Create COA `1-10400-3`; create + seed `pph_tarif_default` (2%/4%). | no |
| 6 | `20260606000002_tax_withholding_premise_columns.sql` | PPh premise columns on ar/ap_invoices + pembayaran + payment_history; CHECK constraints. | no |
| 7 | `20260606000003_tax_withholding_engine_tokens.sql` | Extend `chk_sumber_nominal` with `pph_amount`, `kas_neto`. | no |
| 8 | `20260606000004_tax_withholding_dpp_categories.sql` | Create + seed `dpp_kategori` (PENUH/NL-10/MANUAL); add `pph_dpp_kategori_id`. | no |
| 9 | `20260606000005_ap_pay_config_pph.sql` | **Flip** `AP-PAY` to 3-row (adds PPh line, bank reads `kas_neto`). | **YES — after route deploy** |
| 10 | `20260606000006_ar_pay_config_pph.sql` | **Flip** `AR-PAY-RCV` to 3-row (PPh Dibayar Dimuka, bank reads `kas_neto`). | **YES — after route deploy** |
| 11 | `20260606000007_bukti_potong_columns.sql` | Slip number/date on payment_history; partial indexes for the register. | no |
| 12 | `20260606000008_pmb_internal_config_pph.sql` | **Flip** `PMB-INTERNAL` to 4-row (PPh line, bank reads `kas_neto`). | **YES — after route deploy** |

> Migrations **1–8 and 11 are safe to apply anytime** (purely additive; defaults
> preserve old behavior). Migrations **9, 10, 12 are config flips** that read
> `kas_neto` and must follow the deploy-ordering rule below.

---

## 3. The Deploy-Ordering Rule (critical)

A config flip (#9, #10, #12) changes the bank line from gross to `kas_neto` and
adds an optional PPh line. **`kas_neto` is only sent by the updated route.**

```
                  config reads kas_neto?   route sends kas_neto?   result
  Old route + old config        no                  no             ✅ balanced (legacy)
  New route + old config        no                  yes            ✅ balanced (PPh in
                                                                     payment_history,
                                                                     not yet split in journal)
  Old route + NEW config        YES                 no             ❌ bank line = 0 →
                                                                     unbalanced → journal
                                                                     SKIPPED (non-blocking)
  New route + NEW config        YES                 yes            ✅ balanced + PPh split
```

**Therefore the only safe sequence is:**
1. Ship the route code that computes + sends `kas_neto`.
2. **Deploy** it (route is live).
3. **Then** apply the config-flip migration.

The reverse window (new route + old config, between steps 2 and 3) stays
balanced — `kas_neto` is simply ignored by the old config; PPh is recorded in
`ap/ar_payment_history` but not yet split into the journal. No corruption.

When `pph_amount = 0` (no withholding), the flipped config is **byte-for-byte
identical** to the old one (PPh line skipped, `kas_neto = gross`).

---

## 4. Phased Rollout Playbook

Map of the build phases to migrations (matches the live system):

| Fase | Scope | Migrations | Code prerequisite |
|---|---|---|---|
| **Base** | Engine + 5 configs + reversal | 1–4 | engine + 5 routes wired |
| **A** | PPh foundation: COA `1-10400-3`, rate table, premise columns, engine tokens | 5,6,7 | none (additive) |
| **A.2** | Dynamic DPP categories | 8 | none (additive) |
| **B** | AP withholding (we withhold vendor) | **9 (after route)** | AP pay route sends `kas_neto` |
| **C** | AR withholding (customer withholds us) | **10 (after route)** | AR payment service sends `kas_neto` |
| **E** | Internal disbursement withholding | **12 (after route)** | pembayaran execute route sends `kas_neto` |
| **F** | Bukti potong + PPh report | 11 | report routes + `/finance/pph` UI |

Each phase is backward-compatible, idempotent, and non-blocking.

**Recommended sequence on a fresh system:**
```
1. Apply migrations 1–8, 11   (all additive, any order within)
2. Deploy the app (engine + all 5 routes + withholding-aware routes)
3. Apply migrations 9, 10, 12 (config flips — routes are now live)
4. Run verification SQL (§6)
5. Live smoke test each trigger in the UI (TC-014)
```

---

## 5. Integration Wiring Checklist

The engine does nothing until a route calls it. Wire each trigger **after the
business transaction commits**, non-blocking. Reference impl:
`app/api/finance/account-payable/[id]/pay/route.ts` (see SPEC §7.2).

| Trigger | File | Source row inserted | Engine call |
|---|---|---|---|
| `AR-INV-ISSUE` | `lib/services/ar-service.ts` → `createInvoice` | `ar_invoices` | one per generated row (recurring) |
| `AR-PAY-RCV` | `lib/services/ar-service.ts` → `updatePayment` | `ar_payment_history` | sends `kas_neto` |
| `AP-BILL-RCV` | AP approve route | `ap_invoices` | multi-line `ap_line_coa` |
| `AP-PAY` | `account-payable/[id]/pay/route.ts` | `ap_payment_history` | sends `kas_neto` |
| `PMB-INTERNAL` | `pembayaran/[id]/execute/route.ts` | `pembayaran` | sends `kas_neto` |

**Reversal wiring:**
- AP void (DELETE) → `reverseJournalsForSource('ap_invoice', …)` + payment journals.
- AR invoice archive → `reverseJournalsForSource` for `ar_invoice` + `ar_payment`
  (added in `archiveInvoice`).
- Generic `POST /api/finance/journal/reverse-source` available for new endpoints.

**UI account pickers** (so dynamic_source tokens resolve):
- AR invoice form → `revenue_coa_id`
- money-request form → `expense_coa_id`
- AR bank account → `coa_id`
- AP pay dialog → bank/cash account
- All optional; `journal-defaults.ts` provides sensible fallbacks.

**Withholding UI:** `components/finance/pph-premise-fields.tsx` (reusable premise
block) wired into AP/AR create forms + the pay/execute dialogs. Sidebar links:
"Konfigurasi Jurnal", "Laporan PPh 23".

---

## 6. Verification (post-migration SQL)

Run these after applying. All should return the expected shape; none should error.

**6.1 — All 5 configs active with the right line counts**
```sql
select kj.kode_konfigurasi, kj.is_aktif, count(d.*) as lines
from konfigurasi_jurnal kj
left join konfigurasi_jurnal_detail d on d.konfigurasi_id = kj.id
where kj.tenant_id = '00000000-0000-0000-0000-000000000001'
  and kj.deleted_at is null
group by 1,2 order by 1;
-- Expect: AP-BILL-RCV 3, AP-PAY 3, AR-INV-ISSUE 3, AR-PAY-RCV 3, PMB-INTERNAL 4
```

**6.2 — Hybrid-account invariant holds (must return 0 rows)**
```sql
select id from konfigurasi_jurnal_detail
where (coa_id is null) = (dynamic_source is null);  -- both or neither = violation
```

**6.3 — Config flips actually read kas_neto (Fase B/C/E applied)**
```sql
select kj.kode_konfigurasi, d.urutan, d.sumber_nominal, d.is_optional
from konfigurasi_jurnal kj join konfigurasi_jurnal_detail d on d.konfigurasi_id = kj.id
where kj.kode_konfigurasi in ('AP-PAY','AR-PAY-RCV','PMB-INTERNAL')
order by 1, d.urutan;
-- Expect a kas_neto bank line and an optional pph_amount line in each.
```

**6.4 — Required COA exist (incl. the new 1-10400-3)**
```sql
select account_code from coa
where tenant_id = '00000000-0000-0000-0000-000000000001'
  and account_code in ('1-10100','2-10200-4','1-10400-1','2-10100','2-10200-2','1-10400-3')
order by 1;  -- Expect all 6.
```

**6.5 — Rate + DPP seeds present**
```sql
select pph_jenis, ber_npwp, tarif from pph_tarif_default order by 1,2;   -- pph23 t 2.00 / f 4.00
select kode, metode, faktor from dpp_kategori order by kode;            -- MANUAL/NL-10/PENUH
```

**6.6 — No unexpected engine errors logged**
```sql
select error_code, count(*) from jurnal_error_log
where created_at > now() - interval '1 day'
group by 1 order by 2 desc;
```

**6.7 — Spot-check a real journal balances (after a live txn)**
```sql
select je.entry_number, je.source_type,
       sum(jl.debit_amount) d, sum(jl.credit_amount) c
from journal_entries je join journal_lines jl on jl.journal_entry_id = je.id
where je.source_type in ('ar_invoice','ar_payment','ap_invoice','ap_payment','pembayaran')
  and je.deleted_at is null
group by 1,2 having sum(jl.debit_amount) <> sum(jl.credit_amount);  -- Expect 0 rows.
```

---

## 7. Rollback

The module is **opt-in and additive**, so most of it can be left in place
harmlessly. To roll back behavior without dropping data:

**7.1 — Disable a trigger (safest, instant, reversible)**
```sql
update konfigurasi_jurnal set is_aktif = false, updated_at = now()
where kode_konfigurasi = 'AP-PAY'
  and tenant_id = '00000000-0000-0000-0000-000000000001';
-- Engine logs NO_CONFIG and skips; business txns continue unaffected.
```

**7.2 — Revert a config flip to pre-withholding mapping**
Re-run the *base* seed (`20260605000002`) — it rebuilds the detail rows to the
gross-bank, no-PPh mapping. Safe because it's an idempotent DELETE+INSERT.

**7.3 — Withholding off, keep engine**
Set every `pph_dipotong_oleh` default back to `tidak_ada` (it already is) and
stop sending PPh premise from the forms. `pph_amount=0` → flips behave like the
old configs. No migration needed.

**7.4 — Correcting already-posted journals**
**Never edit/delete.** Use `reverseJournalsForSource(sourceType, sourceId,
reason, userId)` — it posts a Dr/Cr-swapped reversal (idempotent).

**7.5 — Full teardown (last resort)**
Drop in reverse FK order: `jurnal_error_log`, `konfigurasi_jurnal_detail`,
`konfigurasi_jurnal`, `ap_payment_history`, `dpp_kategori`, `pph_tarif_default`;
then drop the added columns. The added COA `1-10400-3` and the
`source_type` whitelist extension can stay. Posted journals must be reversed,
not dropped.

---

## 8. Pre-existing Bugs Fixed (port these too)

These were latent defects in the *existing* journal core, found while building
the engine. Any migration of this module must carry the fixes or the books can
silently go wrong:

1. **`createReversalEntry`** built reversal lines without `tenant_id` /
   `created_by` (both NOT NULL) → reversals always failed. **Fixed.**
2. **`createJournalEntry`** never populated `debit_amount_base` /
   `credit_amount_base`. The DB balance trigger sums the **base** columns, so an
   unbalanced entry could post undetected. Now defaulted to
   `amount × exchange_rate`. This closes the integrity gap and makes the DB
   trigger effective (defense in depth with the engine's own balance check).

---

## 9. Migrating to a Different Stack

If the target is not Supabase/Postgres + Next.js:

**Keep verbatim (the irreducible core):**
- The **pure** `journal-engine-core.ts` resolution + balance logic.
- The **pure** `tax-withholding.ts` DPP/PPh math.
- The **config schema** (header + hybrid-account detail) and its three CHECK
  invariants (`chk_account_source`, `chk_dynamic_source`, `chk_sumber_nominal`).
- The **four hard rules**: always-balanced, non-blocking, idempotent, skip-zero.
- The **golden rule** of withholding (we remit → liability; counterparty
  withholds → asset).

**Re-implement per platform:**
- The orchestrator's DB calls (`journal-engine.ts`) — swap the Supabase client
  for the target's data layer; preserve draft→post and the idempotency query
  `(source_type, source_id, is_reversal=false, status in draft/posted)`.
- RLS → the target's auth model.
- Entry-number format (`JE-{YYYYMM}-{6 digits}`) — adapt to local convention.

**Replicate the guardrails:**
- Keep `validateConfig()` shared between API and UI (token sets mirror the DB
  CHECKs) so the editor can never produce an invalid config.
- Keep the **deploy-ordering rule** (§3) for any config change that reads a
  nominal only a new route can supply.

**Re-confirm with a tax consultant** before go-live: rates, DPP categories, and
applicability are legal decisions; the system models the mechanism, not binding
rates.

---

### Appendix · Source map

| Concern | File |
|---|---|
| Pure resolver/balance | `apps/web/lib/finance/journal-engine-core.ts` |
| Orchestrator (DB, post, reversal, error log) | `apps/web/lib/finance/journal-engine.ts` |
| Shared config vocab + validateConfig | `apps/web/lib/finance/journal-config-options.ts` |
| Pure PPh math | `apps/web/lib/finance/tax-withholding.ts` |
| Server withholding resolver | `apps/web/lib/finance/tax-withholding-server.ts` |
| Premise UI block | `apps/web/components/finance/pph-premise-fields.tsx` |
| Config CRUD UI | `apps/web/app/finance/journal-config/page.tsx` |
| PPh report UI | `apps/web/app/finance/pph/page.tsx` |
| Unit tests | `apps/web/lib/finance/__tests__/*.test.ts` |
| Migrations | `supabase/migrations/2026060500000{1..4}_*`, `2026060600000{1..8}_*` |
