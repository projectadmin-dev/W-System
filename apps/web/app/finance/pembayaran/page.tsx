'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusIcon, RefreshCwIcon, SearchIcon } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select'
import { toast } from 'sonner'
import { cn } from '@workspace/ui/lib/utils'
import type { Pembayaran, PayStatus } from '@/types/fund-request'
import { PAY_STATUS_LABEL, PAY_STATUS_COLOR, formatRpFR, formatDateFR } from '@/types/fund-request'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  ...Object.entries(PAY_STATUS_LABEL).map(([v, l]) => ({ value: v, label: l })),
]

function PayStatusBadge({ status }: { status: PayStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', PAY_STATUS_COLOR[status])}>
      {PAY_STATUS_LABEL[status]}
    </span>
  )
}

export default function PembayaranPage() {
  const [rows, setRows] = useState<Pembayaran[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status !== 'all') params.set('status', status)
      if (search) params.set('search', search)
      const res = await fetch(`/api/finance/pembayaran?${params}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? `Error ${res.status}`); return }
      setRows(json.data ?? [])
    } catch { toast.error('Gagal memuat data') } finally { setLoading(false) }
  }, [status, search])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pembayaran</h1>
          <p className="text-sm text-muted-foreground mt-1">Daftar pembayaran atas Permintaan Uang yang disetujui</p>
        </div>
        <Link href="/finance/pembayaran/new">
          <Button><PlusIcon className="h-4 w-4 mr-2" />Buat Pembayaran</Button>
        </Link>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari no. dokumen, penerima..." className="pl-9" value={search}
                  onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCwIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Belum ada data pembayaran</p>
              <Link href="/finance/pembayaran/new">
                <Button size="sm"><PlusIcon className="h-4 w-4 mr-1" />Buat Pembayaran Pertama</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium">No. Dokumen</th>
                    <th className="px-4 py-3 text-left font-medium">Ref PU</th>
                    <th className="px-4 py-3 text-left font-medium">Tgl Bayar</th>
                    <th className="px-4 py-3 text-left font-medium">Penerima</th>
                    <th className="px-4 py-3 text-right font-medium">Nominal</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Bank Dari</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(pay => {
                    const puDue = pay.permintaan_uang?.tanggal_kebutuhan
                    const isOverdue = puDue && pay.status !== 'PAID' && new Date(puDue) < new Date()
                    return (
                      <tr key={pay.id}
                        className={cn('border-b hover:bg-muted/20 cursor-pointer', isOverdue && 'bg-red-50/40 dark:bg-red-950/20')}
                        onClick={() => window.location.href = `/finance/pembayaran/${pay.id}`}>
                        <td className="px-4 py-3 font-mono font-semibold text-primary">{pay.doc_number}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                          {pay.permintaan_uang?.doc_number ?? '—'}
                          {isOverdue && <span className="ml-1 text-red-500">⚠️</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDateFR(pay.tanggal_pembayaran)}</td>
                        <td className="px-4 py-3">{pay.bank_tujuan_nama}</td>
                        <td className="px-4 py-3 text-right font-semibold">{formatRpFR(pay.nominal_bayar, pay.mata_uang)}</td>
                        <td className="px-4 py-3"><PayStatusBadge status={pay.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{pay.bank_dari_nama ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
