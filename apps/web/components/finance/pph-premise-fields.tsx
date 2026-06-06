'use client'

import { useEffect, useState } from 'react'
import { Checkbox } from '@workspace/ui/components/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@workspace/ui/components/select'

/**
 * Reusable PPh-withholding premise fields for the AP bill / AR invoice
 * creation forms. Captures *intent* only — the actual pph_amount / kas_neto
 * are resolved from the document subtotal at payment time (PSAK timing).
 * Direction is fixed by context: AP = we withhold (`kita`); AR = counterparty
 * withholds from us (`lawan_transaksi`).
 */
export interface PphPremiseValue {
  enabled: boolean
  berNpwp: boolean
  dppKategoriId: string
}

export const EMPTY_PPH_PREMISE: PphPremiseValue = {
  enabled: false,
  berNpwp: true,
  dppKategoriId: '',
}

/** Map the UI premise to the API fields a create endpoint expects. */
export function pphPremiseToPayload(v: PphPremiseValue, context: 'ap' | 'ar') {
  if (!v.enabled) return { pph_dipotong_oleh: 'tidak_ada' as const }
  return {
    pph_dipotong_oleh: (context === 'ap' ? 'kita' : 'lawan_transaksi') as 'kita' | 'lawan_transaksi',
    pph_jenis: 'pph23',
    lawan_punya_npwp: v.berNpwp,
    pph_dpp_kategori_id: v.dppKategoriId || undefined,
  }
}

interface DppKategoriRef { id: string; kode: string; nama: string; metode: string; faktor: number | null }

export function PphPremiseFields({
  value,
  onChange,
  context,
}: {
  value: PphPremiseValue
  onChange: (v: PphPremiseValue) => void
  context: 'ap' | 'ar'
}) {
  const [dppList, setDppList] = useState<DppKategoriRef[]>([])

  useEffect(() => {
    fetch('/api/finance/tax/refs')
      .then((r) => r.json())
      .then((d) => setDppList(d.dpp_kategori ?? []))
      .catch(() => {})
  }, [])

  const penuhId = dppList.find((k) => k.kode === 'PENUH')?.id ?? ''
  const label = context === 'ap'
    ? 'Potong PPh 23 dari vendor (saat bayar)'
    : 'Customer memotong PPh 23 (saat bayar)'
  const npwpLabel = context === 'ap' ? 'Vendor ber-NPWP' : 'Perusahaan ber-NPWP'

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <Checkbox
          checked={value.enabled}
          onCheckedChange={(c) =>
            onChange({ ...value, enabled: !!c, dppKategoriId: value.dppKategoriId || penuhId })
          }
        />
        {label}
      </label>
      {value.enabled && (
        <div className="space-y-3 pt-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={value.berNpwp} onCheckedChange={(c) => onChange({ ...value, berNpwp: !!c })} />
            {npwpLabel}
            <span className="text-xs text-muted-foreground">(tarif {value.berNpwp ? '2%' : '4% (tanpa NPWP)'})</span>
          </label>
          <div>
            <label className="text-xs font-medium">Kategori DPP (Dasar Pengenaan)</label>
            <Select value={value.dppKategoriId} onValueChange={(v) => onChange({ ...value, dppKategoriId: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih kategori DPP..." /></SelectTrigger>
              <SelectContent>
                {dppList.map((k) => (
                  <SelectItem key={k.id} value={k.id}>{k.kode} — {k.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Nilai PPh dihitung otomatis dari DPP saat pembayaran. Default ini bisa diubah lagi di dialog bayar.
          </p>
        </div>
      )}
    </div>
  )
}
