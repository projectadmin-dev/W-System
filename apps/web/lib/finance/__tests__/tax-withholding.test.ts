import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveDpp,
  computePphAmount,
  computeKasNeto,
  computeWithholding,
} from '../tax-withholding.ts'

describe('resolveDpp', () => {
  it('nilai_penuh → full base', () => {
    assert.equal(resolveDpp(1_000_000, { metode: 'nilai_penuh' }), 1_000_000)
  })
  it('persentase → base × faktor, rounded', () => {
    assert.equal(resolveDpp(1_000_000, { metode: 'persentase', faktor: 0.1 }), 100_000)
    assert.equal(resolveDpp(999_999, { metode: 'persentase', faktor: 0.1 }), 100_000) // rounded
  })
  it('manual → entered value, fallback to base', () => {
    assert.equal(resolveDpp(1_000_000, { metode: 'manual' }, 600_000), 600_000)
    assert.equal(resolveDpp(1_000_000, { metode: 'manual' }, null), 1_000_000)
  })
  it('no category → base', () => {
    assert.equal(resolveDpp(500_000, null), 500_000)
  })
})

describe('computePphAmount', () => {
  it('2% of DPP', () => {
    assert.equal(computePphAmount({ dipotongOleh: 'kita', tarif: 2, dpp: 1_000_000 }), 20_000)
  })
  it('4% non-NPWP', () => {
    assert.equal(computePphAmount({ dipotongOleh: 'lawan_transaksi', tarif: 4, dpp: 1_000_000 }), 40_000)
  })
  it('rounds to whole rupiah', () => {
    assert.equal(computePphAmount({ dipotongOleh: 'kita', tarif: 2, dpp: 333_333 }), 6_667)
  })
  it('zero when tidak_ada / no tarif', () => {
    assert.equal(computePphAmount({ dipotongOleh: 'tidak_ada', tarif: 2, dpp: 1_000_000 }), 0)
    assert.equal(computePphAmount({ dipotongOleh: 'kita', tarif: 0, dpp: 1_000_000 }), 0)
  })
})

describe('computeKasNeto', () => {
  it('gross − pph', () => {
    assert.equal(computeKasNeto(1_110_000, 20_000), 1_090_000)
  })
})

describe('computeWithholding end-to-end', () => {
  it('AP jasa 1jt + PPN, PPh 23 2% (DPP penuh)', () => {
    const r = computeWithholding({
      grossSettled: 1_110_000, base: 1_000_000,
      dipotongOleh: 'kita', tarif: 2, kategori: { metode: 'nilai_penuh' },
    })
    assert.deepEqual(r, { dpp: 1_000_000, pphAmount: 20_000, kasNeto: 1_090_000 })
  })

  it('DPP Nilai Lain 10% → PPh on 10% of base', () => {
    const r = computeWithholding({
      grossSettled: 1_110_000, base: 1_000_000,
      dipotongOleh: 'kita', tarif: 2, kategori: { metode: 'persentase', faktor: 0.1 },
    })
    assert.equal(r.dpp, 100_000)
    assert.equal(r.pphAmount, 2_000)
    assert.equal(r.kasNeto, 1_108_000)
  })

  it('tidak_ada → no withholding, cash = gross', () => {
    const r = computeWithholding({
      grossSettled: 1_110_000, base: 1_000_000, dipotongOleh: 'tidak_ada', tarif: 2,
    })
    assert.deepEqual(r, { dpp: 0, pphAmount: 0, kasNeto: 1_110_000 })
  })
})
