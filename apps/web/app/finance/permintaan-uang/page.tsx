'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusIcon, RefreshCwIcon, SearchIcon } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Badge } from '@workspace/ui/components/badge'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select'
import { toast } from 'sonner'
import { cn } from '@workspace/ui/lib/utils'
import type { PermintaanUang, PUStatus } from '@/types/fund-request'
import { PU_STATUS_LABEL, PU_STATUS_COLOR, formatRpFR, formatDateFR, isOverdueFR } from '@/types/fund-request'

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Semua Status' },
  ...Object.entries(PU_STATUS_LABEL).map(([v, l]) => ({ value: v, label: l })),
]

function PUStatusBadge({ status }: { status: PUStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', PU_STATUS_COLOR[status])}>
      {PU_STATUS_LABEL[status]}
    </span>
  )
}

export default function PermintaanUangPage() {
  const [rows, setRows] = useState<PermintaanUang[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status !== 'all') params.set('status', status)
      if (search) params.set('search', search)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      const res = await fetch(`/api/finance/permintaan-uang?${params}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? `Error ${res.status}`); return }
      setRows(json.data ?? [])
    } catch { toast.error('Gagal memuat data') } finally { setLoading(false) }
  }, [status, search, dateFrom, dateTo])

  useEffect(() => { fetchData() }, [fetchData])

  const resetFilters = () => { setSearch(''); setStatus('all'); setDateFrom(''); setDateTo('') }

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Permintaan Uang</h1>
          <p className="text-sm text-muted-foreground mt-1">Daftar pengajuan dana karyawan</p>
        </div>
        <Link href="/finance/permintaan-uang/new">
          <Button><PlusIcon className="h-4 w-4 mr-2" />Buat PU Baru</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Cari nama, no. dokumen..." className="pl-9" value={search}
                  onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" className="w-[150px]" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              placeholder="Dari tanggal" />
            <Input type="date" className="w-[150px]" value={dateTo} onChange={e => setDateTo(e.target.value)}
              placeholder="Sampai tanggal" />
            <Button variant="outline" size="sm" onClick={resetFilters}>Reset</Button>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCwIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Belum ada permintaan uang</p>
              <Link href="/finance/permintaan-uang/new">
                <Button size="sm"><PlusIcon className="h-4 w-4 mr-1" />Buat PU Pertama</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium">No. Dokumen</th>
                    <th className="px-4 py-3 text-left font-medium">Tgl Permintaan</th>
                    <th className="px-4 py-3 text-left font-medium">Dasar</th>
                    <th className="px-4 py-3 text-left font-medium">Jatuh Tempo</th>
                    <th className="px-4 py-3 text-right font-medium">Nominal</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Requestor</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(pu => {
                    const overdue = isOverdueFR(pu.tanggal_kebutuhan, pu.status)
                    return (
                      <tr key={pu.id} className="border-b hover:bg-muted/20 cursor-pointer"
                        onClick={() => window.location.href = `/finance/permintaan-uang/${pu.id}`}>
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-primary">{pu.doc_number}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDateFR(pu.tanggal_permintaan)}</td>
                        <td className="px-4 py-3">
                          {pu.dasar_pengajuan === 'PROJECT'
                            ? <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded px-1.5 py-0.5">📁 {pu.project?.project_code ?? 'Project'}</span>
                            : <span className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 rounded px-1.5 py-0.5">📝 Internal</span>}
                        </td>
                        <td className={cn('px-4 py-3', overdue ? 'text-red-500 font-semibold' : 'text-muted-foreground')}>
                          {formatDateFR(pu.tanggal_kebutuhan)}
                          {overdue && <span className="ml-1 text-xs">⚠️</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{formatRpFR(pu.nominal, pu.mata_uang)}</td>
                        <td className="px-4 py-3"><PUStatusBadge status={pu.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{pu.requestor_name ?? '—'}</td>
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
