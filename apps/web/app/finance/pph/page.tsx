'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2Icon, ReceiptTextIcon, SaveIcon, DownloadIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'

interface Row {
  id: string
  tanggal: string
  no_invoice: string | null
  pihak: string | null
  jenis_pph: string
  tarif: number
  dpp: number | null
  pph_amount: number
  bayar_sekarang: number
  kas_neto: number
  nomor_bukti_potong: string | null
  tanggal_bukti_potong: string | null
}
interface Report {
  periode: string
  keluaran: { rows: Row[]; total_pph: number; count: number }
  masukan: { rows: Row[]; total_pph: number; count: number }
  saldo: { hutang_pph23: number; pph23_dibayar_dimuka: number }
}

const rp = (n: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

function Register({
  title, arah, rows, onSaved,
}: {
  title: string
  arah: 'keluaran' | 'masukan'
  rows: Row[]
  onSaved: () => void
}) {
  const partyHeader = arah === 'keluaran' ? 'Vendor' : 'Customer'
  const [edit, setEdit] = useState<Record<string, { nomor: string; tanggal: string }>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const setField = (id: string, k: 'nomor' | 'tanggal', v: string, row: Row) =>
    setEdit((e) => ({
      ...e,
      [id]: {
        nomor: k === 'nomor' ? v : e[id]?.nomor ?? row.nomor_bukti_potong ?? '',
        tanggal: k === 'tanggal' ? v : e[id]?.tanggal ?? row.tanggal_bukti_potong ?? '',
      },
    }))

  const save = async (row: Row) => {
    const e = edit[row.id]
    setSavingId(row.id)
    try {
      const res = await fetch('/api/finance/tax/bukti-potong', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          arah, payment_id: row.id,
          nomor_bukti_potong: e?.nomor ?? row.nomor_bukti_potong ?? '',
          tanggal_bukti_potong: e?.tanggal ?? row.tanggal_bukti_potong ?? '',
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Gagal')
      toast.success('Bukti potong tersimpan')
      onSaved()
    } catch (err: any) {
      toast.error(err.message ?? 'Gagal menyimpan')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 font-medium text-muted-foreground">Tanggal</th>
                <th className="px-4 py-2 font-medium text-muted-foreground">{partyHeader}</th>
                <th className="px-4 py-2 font-medium text-muted-foreground">Invoice</th>
                <th className="px-4 py-2 font-medium text-muted-foreground text-right">DPP</th>
                <th className="px-4 py-2 font-medium text-muted-foreground text-right">Tarif</th>
                <th className="px-4 py-2 font-medium text-muted-foreground text-right">PPh</th>
                <th className="px-4 py-2 font-medium text-muted-foreground">No. Bukti Potong</th>
                <th className="px-4 py-2 font-medium text-muted-foreground">Tgl Bukti</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Tidak ada pemotongan PPh pada periode ini.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 whitespace-nowrap">{fmtDate(r.tanggal)}</td>
                  <td className="px-4 py-2">{r.pihak ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.no_invoice ?? '—'}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{rp(r.dpp)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.tarif}%</td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-amber-700">{rp(r.pph_amount)}</td>
                  <td className="px-4 py-2">
                    <Input
                      className="h-8 w-36 text-xs"
                      placeholder="No. bukti"
                      defaultValue={r.nomor_bukti_potong ?? ''}
                      onChange={(e) => setField(r.id, 'nomor', e.target.value, r)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      className="h-8 w-36 text-xs"
                      type="date"
                      defaultValue={r.tanggal_bukti_potong ?? ''}
                      onChange={(e) => setField(r.id, 'tanggal', e.target.value, r)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Button variant="ghost" size="sm" disabled={savingId === r.id} onClick={() => save(r)}>
                      {savingId === r.id ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <SaveIcon className="h-3.5 w-3.5" />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PphReportPage() {
  const [periode, setPeriode] = useState(new Date().toISOString().slice(0, 7))
  const [data, setData] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/tax/withholding-report?periode=${periode}`)
      if (!res.ok) throw new Error('Gagal memuat laporan')
      setData(await res.json())
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuat laporan PPh')
    } finally {
      setLoading(false)
    }
  }, [periode])

  useEffect(() => { void load() }, [load])

  function exportCsv() {
    if (!data) return
    const lines = [['Arah', 'Tanggal', 'Pihak', 'Invoice', 'Jenis', 'Tarif', 'DPP', 'PPh', 'No Bukti Potong', 'Tgl Bukti'].join(',')]
    const push = (arah: string, rows: Row[]) => rows.forEach((r) =>
      lines.push([arah, r.tanggal?.slice(0, 10), r.pihak ?? '', r.no_invoice ?? '', r.jenis_pph, r.tarif, r.dpp ?? '', r.pph_amount, r.nomor_bukti_potong ?? '', r.tanggal_bukti_potong ?? ''].join(',')))
    push('keluaran', data.keluaran.rows)
    push('masukan', data.masukan.rows)
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `pph-withholding-${periode}.csv`
    a.click()
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ReceiptTextIcon className="h-6 w-6" />
            Laporan PPh 23 (Pemotongan)
          </h1>
          <p className="text-muted-foreground mt-1">
            Daftar bukti potong & saldo pajak untuk SPT. <span className="font-medium">Keluaran</span> = PPh yang kita potong (disetor),
            {' '}<span className="font-medium">Masukan</span> = PPh yang dipotong dari kita (kredit pajak).
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Masa Pajak</label>
            <Input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} className="mt-1 w-40" />
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={!data}>
            <DownloadIcon className="h-4 w-4 mr-2" />CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">PPh Keluaran (disetor) — masa ini</p>
              <p className="text-xl font-bold mt-1 tabular-nums text-amber-700">{rp(data.keluaran.total_pph)}</p>
              <Badge variant="secondary" className="mt-1 text-xs">{data.keluaran.count} transaksi</Badge>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">PPh Masukan (kredit) — masa ini</p>
              <p className="text-xl font-bold mt-1 tabular-nums text-green-700">{rp(data.masukan.total_pph)}</p>
              <Badge variant="secondary" className="mt-1 text-xs">{data.masukan.count} transaksi</Badge>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Saldo Hutang PPh 23 (kumulatif)</p>
              <p className="text-xl font-bold mt-1 tabular-nums">{rp(data.saldo.hutang_pph23)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">untuk SPT Masa PPh 23</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">PPh 23 Dibayar Dimuka (kumulatif)</p>
              <p className="text-xl font-bold mt-1 tabular-nums">{rp(data.saldo.pph23_dibayar_dimuka)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">kredit pajak — SPT Tahunan</p>
            </CardContent></Card>
          </div>

          <Register title="PPh Keluaran — Kita Memotong Vendor (AP)" arah="keluaran" rows={data.keluaran.rows} onSaved={load} />
          <Register title="PPh Masukan — Dipotong Customer (AR)" arah="masukan" rows={data.masukan.rows} onSaved={load} />
        </>
      ) : null}
    </div>
  )
}
