'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon, CheckIcon } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { toast } from 'sonner'
import { cn } from '@workspace/ui/lib/utils'
import type { Pembayaran, PayStatus } from '@/types/fund-request'
import { PAY_STATUS_LABEL, PAY_STATUS_COLOR, formatRpFR, formatDateFR } from '@/types/fund-request'

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

  const handleExecute = async () => {
    if (!confirm('Tandai pembayaran ini sebagai LUNAS?')) return
    setExecuting(true)
    try {
      const res = await fetch(`/api/finance/pembayaran/${id}/execute`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Gagal'); return }
      toast.success('Pembayaran ditandai LUNAS')
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
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleExecute} disabled={executing}>
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
    </div>
  )
}
