/**
 * Tax-withholding pure helpers (PPh) — no DB, no side effects.
 *
 * Centralizes the DPP resolution + PPh computation so the AP/AR routes and the
 * input UI compute identical numbers. See docs/TAX-WITHHOLDING-PLAN.md.
 *
 * Pure & unit-testable (like journal-engine-core.ts).
 */

// ── Vocabularies (mirror the DB CHECK constraints) ──
export type PihakPajak = 'kita' | 'lawan_transaksi' | 'tidak_ada'
export type PphJenis = 'pph23' | 'pph42' | 'pph21' | 'pph26' | 'pph22' | 'pph25'
export type DppMetode = 'nilai_penuh' | 'persentase' | 'manual'

/** Round to whole rupiah (Indonesian tax amounts are rounded to integers). */
export const roundRupiah = (n: number): number => Math.round(Number(n) || 0)

export interface DppKategori {
  metode: DppMetode
  faktor?: number | null // required for 'persentase' (e.g. 0.10 = 10%)
}

/**
 * Resolve the DPP (tax base) for a transaction.
 * - nilai_penuh → the full base (subtotal exclude PPN)
 * - persentase  → base × faktor (e.g. DPP Nilai Lain 10%)
 * - manual      → the value finance entered (falls back to base if absent)
 */
export function resolveDpp(
  base: number,
  kategori: DppKategori | null | undefined,
  manualDpp?: number | null,
): number {
  const b = Number(base) || 0
  if (!kategori) return roundRupiah(b)
  switch (kategori.metode) {
    case 'persentase': {
      const f = Number(kategori.faktor) || 0
      return roundRupiah(b * f)
    }
    case 'manual':
      return roundRupiah(manualDpp != null && isFinite(manualDpp) ? manualDpp : b)
    case 'nilai_penuh':
    default:
      return roundRupiah(b)
  }
}

/**
 * PPh amount = DPP × tarif%. Returns whole rupiah.
 * Returns 0 when withholding does not apply (`tidak_ada`, no jenis, or 0 tarif).
 */
export function computePphAmount(params: {
  dipotongOleh: PihakPajak
  tarif: number | null | undefined
  dpp: number
}): number {
  const { dipotongOleh, tarif, dpp } = params
  if (dipotongOleh === 'tidak_ada') return 0
  const t = Number(tarif) || 0
  if (t <= 0 || !dpp) return 0
  return roundRupiah((Number(dpp) || 0) * (t / 100))
}

/**
 * Net cash that actually moves = gross settled − PPh withheld (− future PPN WAPU).
 * On AP this is cash paid to the vendor; on AR it is cash received from the customer.
 */
export function computeKasNeto(grossSettled: number, pphAmount: number, ppnWapu = 0): number {
  return roundRupiah((Number(grossSettled) || 0) - (Number(pphAmount) || 0) - (Number(ppnWapu) || 0))
}

/**
 * Convenience: full computation from inputs typically available at payment time.
 * `base` is usually the invoice subtotal (DPP basis, exclude PPN).
 */
export function computeWithholding(input: {
  grossSettled: number // amount being settled (gross, e.g. bayar_sekarang)
  base: number // DPP basis before category (subtotal exclude PPN)
  dipotongOleh: PihakPajak
  tarif: number | null | undefined
  kategori?: DppKategori | null
  manualDpp?: number | null
}): { dpp: number; pphAmount: number; kasNeto: number } {
  const applies = input.dipotongOleh !== 'tidak_ada'
  const dpp = applies ? resolveDpp(input.base, input.kategori, input.manualDpp) : 0
  const pphAmount = computePphAmount({ dipotongOleh: input.dipotongOleh, tarif: input.tarif, dpp })
  const kasNeto = computeKasNeto(input.grossSettled, pphAmount)
  return { dpp, pphAmount, kasNeto }
}
