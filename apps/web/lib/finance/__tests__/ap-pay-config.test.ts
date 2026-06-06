import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveJournalLines,
  computeBalance,
  type ConfigDetailRow,
  type JournalAutomationPayload,
} from '../journal-engine-core.ts'

// The 3-row AP-PAY config after Fase B (20260606000005_ap_pay_config_pph.sql):
//   Dr Hutang Usaha   bayar_sekarang (gross)
//   Cr Hutang PPh 23  pph_amount     (optional → skipped when 0)
//   Cr Bank           kas_neto       (gross − pph)
const AP_PAY_ROWS: ConfigDetailRow[] = [
  { id: '1', coa_id: 'HUTANG', dynamic_source: null, posisi: 'debit', sumber_nominal: 'bayar_sekarang', urutan: 1, keterangan_baris: 'Hutang Usaha', is_optional: false },
  { id: '2', coa_id: 'PPH23', dynamic_source: null, posisi: 'credit', sumber_nominal: 'pph_amount', urutan: 2, keterangan_baris: 'Hutang PPh 23', is_optional: true },
  { id: '3', coa_id: null, dynamic_source: 'ap_bank_coa', posisi: 'credit', sumber_nominal: 'kas_neto', urutan: 3, keterangan_baris: 'Bank', is_optional: false },
]

function pay(nominals: Record<string, number>): JournalAutomationPayload {
  return {
    triggerCode: 'AP-PAY', sourceType: 'ap_payment', sourceId: 'x', tenantId: 't',
    transactionDate: '2026-06-06', createdBy: 'u',
    nominals: nominals as any,
    dynamicAccounts: { ap_bank_coa: 'BANK' },
  }
}

describe('AP-PAY config with PPh', () => {
  it('with PPh: Dr gross = Cr (pph + bank), balanced', () => {
    // jasa 1.000.000 + PPN 110.000 = gross 1.110.000; PPh 23 2% of 1.000.000 = 20.000
    const r = resolveJournalLines(AP_PAY_ROWS, pay({ bayar_sekarang: 1_110_000, pph_amount: 20_000, kas_neto: 1_090_000 }))
    assert.equal(r.ok, true)
    const lines = (r as any).lines
    assert.equal(lines.length, 3)
    const bal = computeBalance(lines)
    assert.equal(bal.balanced, true)
    assert.equal(bal.totalDebit, 1_110_000)
    assert.equal(bal.totalCredit, 1_110_000)
  })

  it('without PPh: line skipped, kas_neto = gross, identical to old behavior', () => {
    const r = resolveJournalLines(AP_PAY_ROWS, pay({ bayar_sekarang: 1_110_000, pph_amount: 0, kas_neto: 1_110_000 }))
    assert.equal(r.ok, true)
    const lines = (r as any).lines
    assert.equal(lines.length, 2) // PPh line skipped
    assert.equal(computeBalance(lines).balanced, true)
  })
})
