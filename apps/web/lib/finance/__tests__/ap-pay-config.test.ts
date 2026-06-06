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
    dynamicAccounts: { ap_bank_coa: 'BANK', ar_bank_coa: 'BANK' },
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

// The 3-row AR-PAY-RCV config after Fase C (20260606000006_ar_pay_config_pph.sql):
//   Dr Bank                   kas_neto (gross − pph)
//   Dr PPh 23 Dibayar Dimuka  pph_amount (optional → skipped when 0)
//   Cr Piutang Usaha          bayar_sekarang (gross)
const AR_PAY_ROWS: ConfigDetailRow[] = [
  { id: '1', coa_id: null, dynamic_source: 'ar_bank_coa', posisi: 'debit', sumber_nominal: 'kas_neto', urutan: 1, keterangan_baris: 'Bank', is_optional: false },
  { id: '2', coa_id: 'PPH23DD', dynamic_source: null, posisi: 'debit', sumber_nominal: 'pph_amount', urutan: 2, keterangan_baris: 'PPh 23 Dibayar Dimuka', is_optional: true },
  { id: '3', coa_id: 'PIUTANG', dynamic_source: null, posisi: 'credit', sumber_nominal: 'bayar_sekarang', urutan: 3, keterangan_baris: 'Piutang', is_optional: false },
]

// The 4-row PMB-INTERNAL config after Fase E (20260606000008):
//   Dr Beban           nominal_bayar
//   Dr Biaya Lain       biaya_lain_amount (multi)
//   Cr Hutang PPh 23   pph_amount (optional)
//   Cr Bank            kas_neto (grand_total − pph)
const PMB_ROWS: ConfigDetailRow[] = [
  { id: '1', coa_id: null, dynamic_source: 'pmb_expense_coa', posisi: 'debit', sumber_nominal: 'nominal_bayar', urutan: 1, keterangan_baris: 'Beban', is_optional: false },
  { id: '2', coa_id: null, dynamic_source: 'pmb_biaya_lain_coa', posisi: 'debit', sumber_nominal: 'biaya_lain_amount', urutan: 2, keterangan_baris: 'Biaya Lain', is_optional: false },
  { id: '3', coa_id: 'PPH23', dynamic_source: null, posisi: 'credit', sumber_nominal: 'pph_amount', urutan: 3, keterangan_baris: 'Hutang PPh 23', is_optional: true },
  { id: '4', coa_id: null, dynamic_source: 'pmb_bank_coa', posisi: 'credit', sumber_nominal: 'kas_neto', urutan: 4, keterangan_baris: 'Bank', is_optional: false },
]

describe('PMB-INTERNAL config with PPh', () => {
  function pmb(nominals: Record<string, number>, biaya: { coaId: string; amount: number }[]): JournalAutomationPayload {
    return {
      triggerCode: 'PMB-INTERNAL', sourceType: 'pembayaran', sourceId: 'x', tenantId: 't',
      transactionDate: '2026-06-06', createdBy: 'u',
      nominals: nominals as any,
      dynamicAccounts: { pmb_expense_coa: 'EXP', pmb_bank_coa: 'BANK' },
      dynamicLines: { pmb_biaya_lain_coa: biaya },
    }
  }
  it('with PPh: Dr (beban + biaya) = Cr (pph + bank), balanced', () => {
    // beban 1.000.000 + biaya 50.000 = gross 1.050.000; PPh 23 2% of 1.000.000 = 20.000
    const r = resolveJournalLines(PMB_ROWS, pmb(
      { nominal_bayar: 1_000_000, grand_total: 1_050_000, pph_amount: 20_000, kas_neto: 1_030_000 },
      [{ coaId: 'FEE', amount: 50_000 }],
    ))
    assert.equal(r.ok, true)
    const lines = (r as any).lines
    assert.equal(lines.length, 4)
    const bal = computeBalance(lines)
    assert.equal(bal.balanced, true)
    assert.equal(bal.totalDebit, 1_050_000)
  })
  it('without PPh: line skipped, kas_neto = gross, balanced', () => {
    const r = resolveJournalLines(PMB_ROWS, pmb(
      { nominal_bayar: 1_000_000, grand_total: 1_050_000, pph_amount: 0, kas_neto: 1_050_000 },
      [{ coaId: 'FEE', amount: 50_000 }],
    ))
    assert.equal((r as any).lines.length, 3)
    assert.equal(computeBalance((r as any).lines).balanced, true)
  })
})

describe('AR-PAY-RCV config with PPh', () => {
  it('with PPh: Dr (bank + pph) = Cr Piutang gross, balanced', () => {
    const r = resolveJournalLines(AR_PAY_ROWS, pay({ bayar_sekarang: 1_110_000, pph_amount: 20_000, kas_neto: 1_090_000 }))
    assert.equal(r.ok, true)
    const lines = (r as any).lines
    assert.equal(lines.length, 3)
    const bal = computeBalance(lines)
    assert.equal(bal.balanced, true)
    assert.equal(bal.totalDebit, 1_110_000)
    assert.equal(bal.totalCredit, 1_110_000)
  })

  it('without PPh: line skipped, kas_neto = gross, balanced', () => {
    const r = resolveJournalLines(AR_PAY_ROWS, pay({ bayar_sekarang: 1_110_000, pph_amount: 0, kas_neto: 1_110_000 }))
    assert.equal(r.ok, true)
    assert.equal((r as any).lines.length, 2)
    assert.equal(computeBalance((r as any).lines).balanced, true)
  })
})
