# Journal Automation — Revision Tech Spec

> Companion to `docs/JOURNAL-AUTOMATION-PLAN.md` and the original
> `SDD-JURNAL-OTOMATIS`. Documents every deviation made during implementation
> (Phases 1–7) and the reasoning, so the spec reflects what was actually built.
>
> Branch: `claude/serene-galileo-kwyFL` · Status: implemented & DB-verified ·
> Live HTTP route execution pending deployed-env verification.

## 1. Context shift vs the original SDD

| Original SDD assumption | Actual system | Decision |
|---|---|---|
| MySQL, WMS/retail (POS, inventory, HPP, produksi, transfer, retur) | Postgres/Supabase, project-services finance (AR/AP/cash, no inventory) | Scope narrowed to the **5 finance use cases**; the 28 WMS config codes dropped as irrelevant |
| New tables `jurnal`, `jurnal_detail` | Existing `journal_entries` / `journal_lines` (PSAK core already present) | **Reused** the existing journal core instead of building parallel tables |
| Integer PKs, single-tenant | UUID PKs, `tenant_id`, soft-delete, `user_profiles` FKs | All new objects follow existing conventions |

## 2. Database deviations

- **`konfigurasi_jurnal` + `konfigurasi_jurnal_detail`** built as designed, but with a **hybrid account model not in the SDD**: each detail line references **either** a fixed `coa_id` **or** a `dynamic_source` token resolved from the source document at runtime (`invoice_revenue_coa`, `ap_line_coa`, `ap_bank_coa`, `pmb_expense_coa`, `pmb_bank_coa`, `pmb_biaya_lain_coa`, `ar_bank_coa`). Enforced by a CHECK constraint. This was required because expense/revenue/bank accounts vary per document.
- **`ap_payment_history`** — new table (mirrors `ar_payment_history`) so AP supports partial payments and each payment carries its own `bank_coa_id` → becomes the journal source for UC#4. (SDD had no AP payment-history concept.)
- **`jurnal_error_log`** — built as specified.
- **New columns:** `ar_invoices.revenue_coa_id`, `ar_invoices.journal_entry_id`, `ar_payment_history.journal_entry_id`, `permintaan_uang.expense_coa_id`, `pembayaran.journal_entry_id`, `ar_bank_accounts.coa_id`.
- **`journal_entries.source_type`** CHECK extended with `ar_invoice, ar_payment, ap_invoice, ap_payment, pembayaran`.
- **No `jenis_pembayaran` table** (SDD §4.3). Cash/bank accounts resolve from existing structures: `pembayaran.bank_dari_coa_id`, `ar_bank_accounts.coa_id` (newly mapped), `ap_payment_history.bank_coa_id`.

## 3. COA mapping corrections (vs the codes Finance first supplied)

| Item | Supplied | Used | Reason |
|---|---|---|---|
| Hutang Usaha | `2-20100` "Trade Payable" | **`2-10100` Hutang Usaha** | `2-20100` is actually "Hutang Bank JK Panjang" |
| PPN Keluaran | create `2-20500` | **`2-10200-4` Hutang PPN** | dedicated account didn't exist; reused existing tax payable |
| PPN Masukan | create `1-10500` | **`1-10400-1` PPN Masukan** | already existed; avoided duplicate COA |
| Piutang | `1-10100` | `1-10100` | as supplied |
| Revenue | 14 project/MTN accounts | **per-invoice picker** (`revenue_coa_id`), default `4-40000-1` | revenue is dynamic per invoice |

No new COA accounts were created.

## 4. Engine deviations (vs SDD §4)

- **Draft → post** instead of inserting directly as `posted`. Required because the DB enforces journal immutability (`prevent_posted_modification`) and validates balance only on the draft→posted transition (`validate_journal_entry_balance`). Posting a draft after lines exist also lets `createJournalEntry` roll back on line-insert failure.
- **Idempotency** keyed on `(source_type, source_id)` for active (draft/posted, non-reversal) journals.
- **Default-COA fallbacks** (`journal-defaults.ts`) — not in SDD. If a document hasn't specified an account (picker left blank), the engine falls back to a sensible default (`4-40000-1` revenue, `1-10002` bank, first expense account) so journals still post balanced. Finance can override per document.
- **Fiscal period** is auto-assigned by an existing DB trigger (`auto_assign_fiscal_period`); the engine also resolves it best-effort.
- **Actor FK:** journal actor columns FK to `user_profiles`; a valid `SYSTEM_USER` constant is used as fallback when a route has no actor id.
- **Entry number** format `JE-{YYYYMM}-{6-digit}` (matches the existing manual route), not the SDD `JRN-{YYYYMMDD}-{seq}`.

## 5. Trigger-point decisions (vs SDD §6)

| UC | Event chosen | Notes |
|---|---|---|
| 1 AR invoice | on invoice create (`ar-service.createInvoice`) | one journal per generated row (handles recurring) |
| 2 AR receipt | on payment record (`ar-service.updatePayment`) | source = `ar_payment_history` row |
| 3 AP bill | on **approve** (replaced a pre-existing hardcoded journal) | avoids journaling bills that get rejected |
| 4 AP pay | on `ap_invoices/[id]/pay` (+ new `ap_payment_history`) | supports partial payments |
| 5 internal payout | on `pembayaran/[id]/execute` | `grand_total = nominal_bayar + Σ biaya_lain` — **assumes biaya lain adds to cash out** (confirm with Finance) |

## 6. Bugs found & fixed in existing code

1. **`createReversalEntry`** built reversal lines without `tenant_id`/`created_by` (both NOT NULL) → would always fail. Fixed.
2. **`createJournalEntry`** never populated `debit_amount_base`/`credit_amount_base`. The balance trigger sums the *base* columns, so unbalanced entries could post undetected. Now defaulted to `amount × exchange_rate`. This closes the integrity gap and makes the DB trigger effective (defense in depth with the engine's own balance check).

## 7. Reversal / void (Phase 5)

- New `reverseJournalsForSource()` (swap Dr/Cr, post, idempotent) + `POST /api/finance/journal/reverse-source`.
- Wired into **AP void (DELETE)** → reverses the bill journal and any payment journals.
- **Gap:** AR invoices and `pembayaran` have **no cancel/void endpoint** in the app, so reversal isn't auto-wired there. The generic `reverse-source` endpoint is available to wire when those endpoints exist.

## 8. UI (Phase 4b)

Account pickers added to the AR invoice form (revenue), money-request form (expense), and AP pay dialog (cash/bank). All optional — defaults apply if left blank. Code-review + typecheck verified; visual interaction pending deployed-env.

## 9. Known limitations / open items

- **AP header-level discount:** the AP-BILL mapping balances `Σ item subtotal + tax = grand_total`. No current AP bill uses `discount_amount > 0`; when one does, debit lines need net allocation (or a discount line). Not yet handled.
- **AR/pembayaran cancellation reversal** not auto-wired (no endpoint).
- **Live HTTP execution** of the 5 routes wasn't run in CI (no Next runtime / service-role key in the container). All logic is DB-verified via SQL + unit tests; end-to-end route execution should be confirmed in the deployed env.
- **Multi-currency:** base amounts use `amount × exchange_rate` with the entry's rate (default 1). FX revaluation out of scope.
- **Historical backfill** of the existing 13 AR / 33 AP documents was **not** run — retroactive journal dating/period is a Finance decision. The engine + `reverse-source` endpoint can perform it on demand.
- **PMB biaya-lain sign assumption** — confirm with Finance whether "biaya lain" adds to or reduces the cash disbursed.

## 10. Testing

All phases logged to the QA module (`/finance/qa`, module `journal-automation`): Phase 3, 4, 4b, 5, 6, 7 runs. Engine unit suite: `node --test --experimental-strip-types apps/web/lib/finance/__tests__/journal-engine-core.test.ts` (13 tests). Live integration/acceptance executed against the database with test journals cleaned up afterward.
