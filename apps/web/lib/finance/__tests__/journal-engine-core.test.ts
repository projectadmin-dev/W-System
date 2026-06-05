import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveJournalLines,
  computeBalance,
  resolveScalarNominal,
  type ConfigDetailRow,
  type JournalAutomationPayload,
} from '../journal-engine-core.ts'

// ── helpers ───────────────────────────────────────────────────────────────────
let seq = 0
function row(p: Partial<ConfigDetailRow>): ConfigDetailRow {
  return {
    id: String(++seq),
    coa_id: null,
    dynamic_source: null,
    posisi: 'debit',
    sumber_nominal: 'grand_total',
    urutan: seq,
    keterangan_baris: null,
    is_optional: false,
    ...p,
  }
}
function payload(p: Partial<JournalAutomationPayload>): JournalAutomationPayload {
  return {
    triggerCode: 'T', sourceType: 's', sourceId: 'id', tenantId: 't',
    transactionDate: '2026-06-05', createdBy: 'u', ...p,
  }
}
function lines(r: ReturnType<typeof resolveJournalLines>) {
  assert.equal(r.ok, true)
  return (r as { ok: true; lines: any[] }).lines
}

// ── resolveScalarNominal ────────────────────────────────────────────────────────
describe('resolveScalarNominal', () => {
  it('returns the mapped nominal or 0', () => {
    const pl = payload({ nominals: { subtotal: 1000, pajak: 0 } })
    assert.equal(resolveScalarNominal('subtotal', pl), 1000)
    assert.equal(resolveScalarNominal('pajak', pl), 0)
    assert.equal(resolveScalarNominal('grand_total', pl), 0) // missing -> 0
  })
})

// ── computeBalance ──────────────────────────────────────────────────────────────
describe('computeBalance', () => {
  it('balanced when debit==credit and >=2 lines', () => {
    const b = computeBalance([
      { coa_id: 'a', posisi: 'debit', amount: 100 },
      { coa_id: 'b', posisi: 'credit', amount: 100 },
    ])
    assert.equal(b.balanced, true)
    assert.equal(b.totalDebit, 100)
    assert.equal(b.totalCredit, 100)
  })
  it('not balanced when debit!=credit', () => {
    const b = computeBalance([
      { coa_id: 'a', posisi: 'debit', amount: 100 },
      { coa_id: 'b', posisi: 'credit', amount: 90 },
    ])
    assert.equal(b.balanced, false)
  })
  it('not balanced with a single line', () => {
    assert.equal(computeBalance([{ coa_id: 'a', posisi: 'debit', amount: 100 }]).balanced, false)
  })
})

// ── resolveJournalLines: behavior ───────────────────────────────────────────────
describe('resolveJournalLines behavior', () => {
  it('skips zero-nominal lines', () => {
    const rows = [
      row({ coa_id: 'PIUTANG', posisi: 'debit', sumber_nominal: 'total_piutang' }),
      row({ coa_id: 'REV', posisi: 'credit', sumber_nominal: 'subtotal' }),
      row({ coa_id: 'PPN', posisi: 'credit', sumber_nominal: 'pajak', is_optional: true }),
    ]
    const r = lines(resolveJournalLines(rows, payload({ nominals: { total_piutang: 1000, subtotal: 1000, pajak: 0 } })))
    assert.equal(r.length, 2) // PPN line skipped
  })

  it('errors when a single dynamic account is missing', () => {
    const rows = [
      row({ coa_id: 'PIUTANG', posisi: 'debit', sumber_nominal: 'total_piutang' }),
      row({ dynamic_source: 'invoice_revenue_coa', posisi: 'credit', sumber_nominal: 'subtotal' }),
    ]
    const r = resolveJournalLines(rows, payload({ nominals: { total_piutang: 1000, subtotal: 1000 } }))
    assert.equal(r.ok, false)
    assert.equal((r as any).errorCode, 'MISSING_ACCOUNT')
  })

  it('expands a multi-line dynamic source into N lines', () => {
    const rows = [
      row({ dynamic_source: 'ap_line_coa', posisi: 'debit', sumber_nominal: 'line_amount' }),
      row({ coa_id: 'HUTANG', posisi: 'credit', sumber_nominal: 'grand_total' }),
    ]
    const r = lines(resolveJournalLines(rows, payload({
      nominals: { grand_total: 1000 },
      dynamicLines: { ap_line_coa: [
        { coaId: 'E1', amount: 600 }, { coaId: 'E2', amount: 400 }, { coaId: 'E3', amount: 0 },
      ] },
    })))
    assert.equal(r.length, 3) // 2 expanded (zero skipped) + HUTANG
    assert.equal(r.filter((l) => l.posisi === 'debit').length, 2)
  })

  it('errors when a multi-line item is missing its account', () => {
    const rows = [row({ dynamic_source: 'ap_line_coa', posisi: 'debit', sumber_nominal: 'line_amount' })]
    const r = resolveJournalLines(rows, payload({ dynamicLines: { ap_line_coa: [{ coaId: null, amount: 500 }] } }))
    assert.equal(r.ok, false)
  })
})

// ── The 5 seeded trigger mappings produce balanced journals ─────────────────────
describe('trigger mappings balance', () => {
  it('AR-INV-ISSUE: Dr Piutang / Cr Pendapatan + PPN', () => {
    const rows = [
      row({ coa_id: 'PIUTANG', posisi: 'debit', sumber_nominal: 'total_piutang' }),
      row({ dynamic_source: 'invoice_revenue_coa', posisi: 'credit', sumber_nominal: 'subtotal' }),
      row({ coa_id: 'PPNOUT', posisi: 'credit', sumber_nominal: 'pajak', is_optional: true }),
    ]
    const r = lines(resolveJournalLines(rows, payload({
      nominals: { total_piutang: 1110, subtotal: 1000, pajak: 110 },
      dynamicAccounts: { invoice_revenue_coa: 'REV' },
    })))
    assert.equal(computeBalance(r).balanced, true)
    assert.equal(computeBalance(r).totalDebit, 1110)
  })

  it('AR-PAY-RCV: Dr Bank / Cr Piutang', () => {
    const rows = [
      row({ dynamic_source: 'ar_bank_coa', posisi: 'debit', sumber_nominal: 'bayar_sekarang' }),
      row({ coa_id: 'PIUTANG', posisi: 'credit', sumber_nominal: 'bayar_sekarang' }),
    ]
    const r = lines(resolveJournalLines(rows, payload({
      nominals: { bayar_sekarang: 500 }, dynamicAccounts: { ar_bank_coa: 'BANK' },
    })))
    assert.equal(computeBalance(r).balanced, true)
  })

  it('AP-BILL-RCV: Dr items + PPN / Cr Hutang', () => {
    const rows = [
      row({ dynamic_source: 'ap_line_coa', posisi: 'debit', sumber_nominal: 'line_amount' }),
      row({ coa_id: 'PPNIN', posisi: 'debit', sumber_nominal: 'pajak', is_optional: true }),
      row({ coa_id: 'HUTANG', posisi: 'credit', sumber_nominal: 'grand_total' }),
    ]
    const r = lines(resolveJournalLines(rows, payload({
      nominals: { pajak: 110, grand_total: 1110 },
      dynamicLines: { ap_line_coa: [{ coaId: 'E1', amount: 600 }, { coaId: 'E2', amount: 400 }] },
    })))
    assert.equal(computeBalance(r).balanced, true)
    assert.equal(computeBalance(r).totalCredit, 1110)
  })

  it('AP-PAY: Dr Hutang / Cr Bank', () => {
    const rows = [
      row({ coa_id: 'HUTANG', posisi: 'debit', sumber_nominal: 'bayar_sekarang' }),
      row({ dynamic_source: 'ap_bank_coa', posisi: 'credit', sumber_nominal: 'bayar_sekarang' }),
    ]
    const r = lines(resolveJournalLines(rows, payload({
      nominals: { bayar_sekarang: 1110 }, dynamicAccounts: { ap_bank_coa: 'BANK' },
    })))
    assert.equal(computeBalance(r).balanced, true)
  })

  it('PMB-INTERNAL: Dr Beban + biaya lain / Cr Bank', () => {
    const rows = [
      row({ dynamic_source: 'pmb_expense_coa', posisi: 'debit', sumber_nominal: 'nominal_bayar' }),
      row({ dynamic_source: 'pmb_biaya_lain_coa', posisi: 'debit', sumber_nominal: 'biaya_lain_amount' }),
      row({ dynamic_source: 'pmb_bank_coa', posisi: 'credit', sumber_nominal: 'grand_total' }),
    ]
    const r = lines(resolveJournalLines(rows, payload({
      nominals: { nominal_bayar: 1000, grand_total: 1050 },
      dynamicAccounts: { pmb_expense_coa: 'EXP', pmb_bank_coa: 'BANK' },
      dynamicLines: { pmb_biaya_lain_coa: [{ coaId: 'FEE', amount: 50 }] },
    })))
    assert.equal(computeBalance(r).balanced, true)
    assert.equal(computeBalance(r).totalDebit, 1050)
  })
})
