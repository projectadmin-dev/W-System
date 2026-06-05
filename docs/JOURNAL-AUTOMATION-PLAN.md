# Journal Automation — Implementation Plan

> Status: **Phases 1–7 implemented & DB-verified** (live HTTP route execution pending deployed-env). Branch: `claude/serene-galileo-kwyFL`
> See `JOURNAL-AUTOMATION-REVISION-SPEC.md` for deviations from this plan.
> Scope: 5 finance use cases + reversal/void · Engine: full config-driven (DB-stored mappings) · Posting: auto-post, non-blocking

## 1. Goal

Auto-generate balanced, PSAK-compliant double-entry journals whenever a finance
stakeholder performs one of five actions, driven by **editable database
configuration** (not hard-coded mappings).

| UC | Event | Journal |
|----|-------|---------|
| 1 | Terbit invoice baru (AR) | Dr Piutang / Cr Pendapatan + PPN Keluaran |
| 2 | Terima pembayaran invoice dari customer | Dr Kas/Bank / Cr Piutang |
| 3 | Terima/input tagihan dari pihak ketiga (AP) | Dr Beban/Aset + PPN Masukan / Cr Hutang |
| 4 | Bayar tagihan pihak ketiga | Dr Hutang / Cr Kas/Bank |
| 5 | Transfer uang atas permintaan internal department | Dr Beban / Cr Kas/Bank |

## 2. What already exists (reuse)

- `journal_entries` / `journal_lines` — double-entry core with `source_type` + `source_id` linkage.
- `createJournalEntry()` / `createReversalEntry()` in `apps/web/lib/repositories/finance-journal.ts` — balance validation, reversal, ≥2-line enforcement.
- `coa` (169 accounts), `fiscal_periods`, `fiscal_period_journal_locks`.
- `pembayaran.bank_dari_coa_id`, `pembayaran_biaya_lain.coa_id`, `ap_invoice_items.coa_id` — already COA-linked.
- `ap_invoices.journal_entry_id` — column exists (currently unused).

## 3. Locked COA mapping

| Trigger | Debit | Credit | Nominal source(s) |
|---------|-------|--------|-------------------|
| `AR-INV-ISSUE` | `1-10100` Piutang Usaha *(fixed)* | `{ar_invoices.revenue_coa_id}` *(dynamic)* + `2-10200-4` Hutang PPN *(fixed, if PPN>0)* | `total_piutang`, `subtotal`, `ppn_amount` |
| `AR-PAY-RCV` | `{ar_bank_accounts.coa_id}` *(dynamic, new col)* | `1-10100` Piutang Usaha *(fixed)* | `bayar_sekarang` |
| `AP-BILL-RCV` | `{ap_invoice_items.coa_id}` per line *(dynamic)* + `1-10400-1` PPN Masukan *(fixed, if tax>0)* | `2-10100` Hutang Usaha *(fixed)* | line subtotal, `tax_amount`, `grand_total` |
| `AP-PAY` | `2-10100` Hutang Usaha *(fixed)* | `{ap_payment_history.bank_coa_id}` *(dynamic, new table)* | payment amount |
| `PMB-INTERNAL` | `{permintaan_uang.expense_coa_id}` *(dynamic, new col)* + `{pembayaran_biaya_lain.coa_id}` per line *(dynamic)* | `{pembayaran.bank_dari_coa_id}` *(dynamic, exists)* | `nominal_bayar`, line `nominal` |

**Hybrid rule:** each config detail row references *either* a fixed `coa_id`
*or* a `dynamic_source` token (`invoice_revenue_coa`, `ar_bank_coa`,
`ap_line_coa`, `ap_bank_coa`, `pmb_expense_coa`, `pmb_bank_coa`,
`pmb_biaya_lain_coa`). No new COA accounts required.

## 4. Phases

### Phase 1 — Database schema (Supabase migrations)
- `konfigurasi_jurnal` (trigger_code, nama_fitur, modul, tipe_jurnal, is_aktif, keterangan, audit, tenant_id).
- `konfigurasi_jurnal_detail` (config FK, `coa_id` nullable, `dynamic_source` nullable, `posisi`, `sumber_nominal`, `urutan`; CHECK exactly one of coa_id/dynamic_source).
- `jurnal_error_log` (trigger_code, source_type, source_id, pesan_error, payload jsonb).
- `ap_payment_history` (mirror `ar_payment_history` + `bank_coa_id`).
- ALTER: `ar_bank_accounts` + `coa_id`; `ar_invoices` + `revenue_coa_id`, `journal_entry_id`; `permintaan_uang` + `expense_coa_id`.
- Extend `journal_entries.source_type` values: `ar_invoice`, `ar_payment`, `ap_invoice`, `ap_payment`, `pembayaran`.
- RLS on all new tables (finance roles); `get_advisors` check.

### Phase 2 — Engine service (`apps/web/lib/finance/journal-engine.ts`)
- `process(triggerCode, sourceType, sourceId, payload)`:
  load active config → resolve each detail (account resolver + nominal resolver, skip zero lines) → validate balance → `createJournalEntry()` with source linkage → auto-post → write back `journal_entry_id`.
- **Idempotent:** no-op if an active (non-reversed) journal already exists for (source_type, source_id).
- **Non-blocking:** on failure write `jurnal_error_log`, return failure, never roll back the business transaction (NFR-02).

### Phase 3 — Config seed + read API
- Seed migration for the 5 trigger codes using the locked mapping.
- `GET /api/finance/journal-config` + toggle endpoint. Full editor UI deferred.

### Phase 4 — Wire triggers (call engine after successful commit)
- `ar/invoices` (issue) · `ar/invoices/[id]/payment` · `account-payable` (submit/approve) · `account-payable/[id]/pay` (+ bank field + `ap_payment_history`) · `pembayaran/[id]/execute`.
- Add UI pickers: AR `revenue_coa_id`, money-request `expense_coa_id`, AR bank `coa_id`, AP-pay bank account.

### Phase 5 — Reversal / void propagation
- On source-doc cancel/void/archive, find journals by `source_id` and call `createReversalEntry()`.

### Phase 6 — Tests
- Unit: resolver, balance, skip-zero, idempotent, not-balanced → error log.
- Integration: one end-to-end per trigger.
- Acceptance: one per UC#1–5.

### Phase 7 — Hardening
- Advisors/RLS review; optional backfill of existing 13 AR / 33 AP docs.

## 5. Open follow-ups (non-blocking)
- Config caching (Redis/in-memory TTL) — deferred.
- Full Finance-facing config editor UI — deferred to a later phase.
- Partial-payment rounding tolerance policy.
