'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon, CheckIcon, Loader2Icon } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@workspace/ui/components/dialog'
import { toast } from 'sonner'
import { cn } from '@workspace/ui/lib/utils'
import type { Pembayaran, PayStatus } from '@/types/fund-request'
import { PAY_STATUS_LABEL, PAY_STATUS_COLOR, formatRpFR, formatDateFR } from '@/types/fund-request'
import { computeWithholding } from '@/lib/finance/tax-withholding'
import { PphPremiseFields, EMPTY_PPH_PREMISE, type PphPremiseValue } from '@/components/finance/pph-premise-fields'

function PayStatusBadge({ status }: { status: PayStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', PAY_STATUS_COLOR[status])}>
      {PAY_STATUS_LABEL[status]}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? '—'}</p>
    </div>
  )
}

export default function PembayaranDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [pay, setPay] = useState<Pembayaran | null>(null)
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [showExec, setShowExec] = useState(false)
  const [pphPremise, setPphPremise] = useState<PphPremiseValue>(EMPTY_PPH_PREMISE)
  const [dppRefs, setDppRefs] = useState<{ id: string; kode: string; metode: string; faktor: number | null }[]>([])
  const [tarifRefs, setTarifRefs] = useState<{ pph_jenis: string; ber_npwp: boolean; tarif: number }[]>([])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/pembayaran/${id}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Not found'); return }
      setPay(json.data)
    } catch { toast.error('Gagal memuat data') } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [id])

  useEffect(() => {
    fetch('/api/finance/tax/refs')
      .then(r => r.json())
      .then(d => { setDppRefs(d.dpp_kategori ?? []); setTarifRefs(d.pph_tarif ?? []) })
      .catch(() => {})
  }, [])

  const handleExecute = async () => {
    setExecuting(true)
    try {
      const body = pphPremise.enabled
        ? {
            pph_dipotong_oleh: 'kita',
            pph_jenis: 'pph23',
            lawan_punya_npwp: pphPremise.berNpwp,
            pph_dpp_kategori_id: pphPremise.dppKategoriId || undefined,
          }
        : {}
      const res = await fetch(`/api/finance/pembayaran/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Gagal'); return }
      if (json.warning) toast.warning(json.warning)
      toast.success('Pembayaran ditandai LUNAS')
      setShowExec(false)
      fetchData()
    } catch (e) { toast.error(String(e)) } finally { setExecuting(false) }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Memuat data...</div>
  if (!pay) return <div className="p-6 text-destructive">Data tidak ditemukan</div>

  const pu = pay.permintaan_uang

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-mono">{pay.doc_number}</h1>
            <p className="text-sm text-muted-foreground">Pembayaran</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PayStatusBadge status={pay.status} />
          {pay.status !== 'PAID' && pay.status !== 'CANCELLED' && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setShowExec(true)} disabled={executing}>
              <CheckIcon className="h-4 w-4 mr-1" />Tandai Lunas
            </Button>
          )}
        </div>
      </div>

      {/* Ref PU */}
      {pu && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Referensi Permintaan Uang</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
              <div className="flex items-start justify-between">
                <span className="font-mono font-bold text-primary">{pu.doc_number}</span>
                <span className="font-bold">{formatRpFR(pu.nominal, pu.mata_uang)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                <span><strong>Dasar:</strong> {pu.dasar_pengajuan === 'PROJECT' ? (pu as any).project?.project_name ?? 'Project' : 'Internal'}</span>
                <span><strong>Jatuh Tempo:</strong> {formatDateFR(pu.tanggal_kebutuhan)}</span>
                <span><strong>Requestor:</strong> {pu.requestor_name}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Pembayaran */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Detail Pembayaran</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoRow label="Tanggal Pembayaran" value={formatDateFR(pay.tanggal_pembayaran)} />
            <InfoRow label="Nominal Bayar" value={<span className="text-lg font-bold">{formatRpFR(pay.nominal_bayar, pay.mata_uang)}</span>} />
            <InfoRow label="Bank Dari" value={pay.bank_dari_nama ? `${pay.bank_dari_kode} — ${pay.bank_dari_nama}` : '—'} />
          </div>
          <div className="mt-4 border-t pt-4">
            <p className="text-sm font-semibold mb-3">Pembayaran Kepada</p>
            <div className="grid grid-cols-3 gap-4">
              <InfoRow label="Bank" value={pay.bank_tujuan_nama} />
              <InfoRow label="No. Rekening" value={pay.bank_tujuan_nomor} />
              <InfoRow label="Atas Nama" value={pay.bank_tujuan_atas_nama} />
            </div>
          </div>
          {pay.catatan && <p className="mt-4 text-sm text-muted-foreground border-t pt-3">{pay.catatan}</p>}
        </CardContent>
      </Card>

      {/* Biaya Lain-Lain */}
      {pay.biaya_lain.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Biaya Lain-Lain</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2">No</th><th className="text-left py-2">Deskripsi</th><th className="text-left py-2">COA</th><th className="text-right py-2">Nominal</th></tr></thead>
              <tbody>
                {pay.biaya_lain.map(b => (
                  <tr key={b.id} className="border-b">
                    <td className="py-2 text-muted-foreground">{b.urutan}</td>
                    <td className="py-2">{b.deskripsi}</td>
                    <td className="py-2 text-muted-foreground text-xs">{b.coa_kode ? `${b.coa_kode} — ${b.coa_nama}` : '—'}</td>
                    <td className="py-2 text-right">{formatRpFR(b.nominal)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td colSpan={3} className="py-2 text-right text-muted-foreground">Total Biaya:</td>
                  <td className="py-2 text-right">{formatRpFR(pay.biaya_lain.reduce((s, b) => s + b.nominal, 0))}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Audit Trail</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              ['Requestor', pay.requestor_name],
              ['Dept Requestor', pay.requestor_dept],
              ['Jabatan Requestor', pay.requestor_position],
              ['Approver', pay.approver_name],
              ['Dept Approver', pay.approver_dept],
              ['PIC Finance', pay.pic_finance_name],
              ['Dept PIC', pay.pic_finance_dept],
              ['Diajukan', pay.submitted_at ? formatDateFR(pay.submitted_at) : undefined],
              ['Disetujui', pay.approved_at ? formatDateFR(pay.approved_at) : undefined],
              ['Dibayar', pay.paid_at ? formatDateFR(pay.paid_at) : undefined],
            ].filter(([, v]) => v).map(([lbl, val]) => (
              <InfoRow key={String(lbl)} label={String(lbl)} value={String(val)} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Execute (mark paid) dialog with optional PPh 23 withholding */}
      <Dialog open={showExec} onOpenChange={setShowExec}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tandai Pembayaran LUNAS</DialogTitle>
          </DialogHeader>
          {(() => {
            const nominalBayar = Number(pay.nominal_bayar || 0)
            const biayaTotal = pay.biaya_lain.reduce((s, b) => s + b.nominal, 0)
            const gross = nominalBayar + biayaTotal
            const kategori = dppRefs.find(k => k.id === pphPremise.dppKategoriId) || null
            const tarif = tarifRefs.find(t => t.pph_jenis === 'pph23' && t.ber_npwp === pphPremise.berNpwp)?.tarif ?? (pphPremise.berNpwp ? 2 : 4)
            const wh = computeWithholding({
              grossSettled: gross,
              base: nominalBayar,
              dipotongOleh: pphPremise.enabled ? 'kita' : 'tidak_ada',
              tarif,
              kategori: kategori ? { metode: kategori.metode as any, faktor: kategori.faktor } : null,
            })
            return (
              <div className="space-y-4 py-2 text-sm">
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-3">
                  <div><p className="text-xs text-muted-foreground">Nominal Bayar</p><p className="font-semibold tabular-nums">{formatRpFR(nominalBayar, pay.mata_uang)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Biaya Lain</p><p className="font-semibold tabular-nums">{formatRpFR(biayaTotal, pay.mata_uang)}</p></div>
                  <div className="col-span-2 border-t pt-2 flex justify-between"><span className="text-xs text-muted-foreground">Total (gross)</span><span className="font-bold tabular-nums">{formatRpFR(gross, pay.mata_uang)}</span></div>
                </div>

                <PphPremiseFields value={pphPremise} onChange={setPphPremise} context="ap" />

                {pphPremise.enabled && (
                  <div className="grid grid-cols-2 gap-2 rounded-md bg-muted/40 p-3">
                    <div><p className="text-xs text-muted-foreground">DPP</p><p className="font-semibold tabular-nums">{formatRpFR(wh.dpp, pay.mata_uang)}</p></div>
                    <div><p className="text-xs text-muted-foreground">PPh ({tarif}%)</p><p className="font-semibold tabular-nums text-amber-700">{formatRpFR(wh.pphAmount, pay.mata_uang)}</p></div>
                    <div className="col-span-2 border-t pt-2 flex justify-between"><span className="text-xs text-muted-foreground">Kas keluar (neto)</span><span className="font-bold tabular-nums">{formatRpFR(wh.kasNeto, pay.mata_uang)}</span></div>
                  </div>
                )}
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExec(false)} disabled={executing}>Batal</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleExecute} disabled={executing}>
              {executing ? <Loader2Icon className="h-4 w-4 animate-spin" /> : 'Tandai Lunas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
