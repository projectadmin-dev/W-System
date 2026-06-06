import { computeWithholding, roundRupiah, type PihakPajak } from './tax-withholding'

/**
 * Server-side withholding resolution: turns a transaction's PPh premise into
 * concrete amounts by reading the data-driven rate table (pph_tarif_default)
 * and DPP category (dpp_kategori). Shared by the AP pay route and AR payment
 * service so both compute identically and never trust client-sent amounts.
 */
export interface WithholdingPremise {
  dipotongOleh: PihakPajak
  jenis: string | null
  berNpwp: boolean
  tarifOverride?: number | null
  dppKategoriId?: string | null
  manualDpp?: number | null
}

export interface ResolvedWithholding {
  pphAmount: number
  kasNeto: number
  dpp: number
  tarif: number
}

export async function resolveWithholding(
  db: any,
  tenantId: string,
  premise: WithholdingPremise,
  base: number, // DPP basis (usually invoice subtotal, exclude PPN)
  grossSettled: number, // gross amount being settled (bayar_sekarang)
): Promise<ResolvedWithholding> {
  if (premise.dipotongOleh === 'tidak_ada' || !premise.jenis) {
    return { pphAmount: 0, kasNeto: roundRupiah(grossSettled), dpp: 0, tarif: 0 }
  }

  // Rate: explicit override → default table (jenis, npwp).
  let tarif = premise.tarifOverride ?? null
  if (tarif == null) {
    const { data: rate } = await db
      .from('pph_tarif_default')
      .select('tarif')
      .eq('tenant_id', tenantId)
      .eq('pph_jenis', premise.jenis)
      .eq('ber_npwp', premise.berNpwp)
      .eq('is_aktif', true)
      .maybeSingle()
    tarif = rate ? Number(rate.tarif) : 0
  }

  // DPP category (metode/faktor) if chosen.
  let kategori: { metode: any; faktor: number | null } | null = null
  if (premise.dppKategoriId) {
    const { data: kat } = await db
      .from('dpp_kategori')
      .select('metode, faktor')
      .eq('id', premise.dppKategoriId)
      .maybeSingle()
    if (kat) kategori = { metode: kat.metode, faktor: kat.faktor != null ? Number(kat.faktor) : null }
  }

  const w = computeWithholding({
    grossSettled,
    base,
    dipotongOleh: premise.dipotongOleh,
    tarif: Number(tarif),
    kategori,
    manualDpp: premise.manualDpp != null ? Number(premise.manualDpp) : null,
  })
  return { ...w, tarif: Number(tarif) }
}
