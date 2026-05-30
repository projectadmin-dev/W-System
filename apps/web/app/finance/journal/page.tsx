'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  PlusIcon,
  Loader2Icon,
  CheckCircleIcon,
  FileTextIcon,
  ClockIcon,
  RotateCcwIcon,
  ScaleIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { SearchableSelect } from '@/components/finance/searchable-select'
import {
  JOURNAL_STATUSES,
  KATEGORI_JURNAL,
  SOURCE_TYPES,
  labelOf,
} from '@/lib/finance/journal-constants'

interface JournalEntry {
  id: string
  entry_number: string
  transaction_date: string
  posting_date: string | null
  description: string
  reference_number: string | null
  total_debit: number
  total_credit: number
  status: string
  source_type: string | null
  kategori_jurnal: string
  reversal_of_id: string | null
  fiscal_periods?: { period_name: string; status: string } | null
}

interface FiscalPeriod {
  id: string
  period_name: string
  status: string
}

// ── First & last day of the current month (mandatory default scope) ───────────
function monthRange() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const iso = (d: Date) => d.toISOString().split('T')[0]
  return { start: iso(first), end: iso(last) }
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [periods, setPeriods] = useState<FiscalPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [postingId, setPostingId] = useState<string | null>(null)

  // ── Mandatory / scoping filters ─────────────────────────────────────────────
  const defaults = useMemo(monthRange, [])
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [periodId, setPeriodId] = useState('')
  const [status, setStatus] = useState('')
  const [kategori, setKategori] = useState('')
  const [sourceType, setSourceType] = useState('')
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')

  useEffect(() => {
    fetch('/api/finance/periods')
      .then((r) => r.json())
      .then((d) => setPeriods(Array.isArray(d) ? d : []))
      .catch(() => setPeriods([]))
  }, [])

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (periodId) params.set('fiscalPeriodId', periodId)
      if (status) params.set('status', status)
      if (kategori) params.set('kategoriJurnal', kategori)
      if (sourceType) params.set('sourceType', sourceType)
      if (appliedSearch) params.set('search', appliedSearch)
      const res = await fetch(`/api/finance/journal?${params.toString()}`)
      const data = await res.json()
      setEntries(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Gagal memuat jurnal')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, periodId, status, kategori, sourceType, appliedSearch])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  async function handlePost(id: string) {
    if (!confirm('Post jurnal ini? Setelah diposting tidak dapat diubah (kepatuhan PSAK).')) return
    setPostingId(id)
    try {
      const res = await fetch(`/api/finance/journal/post?id=${id}`, { method: 'POST' })
      if (res.ok) {
        toast.success('Jurnal berhasil diposting')
        await loadEntries()
      } else {
        const d = await res.json()
        toast.error(d.message || 'Gagal memposting')
      }
    } catch {
      toast.error('Kesalahan jaringan')
    } finally {
      setPostingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus draft jurnal ini?')) return
    try {
      const res = await fetch(`/api/finance/journal?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Draft dihapus')
        await loadEntries()
      } else {
        const d = await res.json()
        toast.error(d.message || 'Gagal menghapus')
      }
    } catch {
      toast.error('Kesalahan jaringan')
    }
  }

  function resetFilters() {
    setStartDate(defaults.start)
    setEndDate(defaults.end)
    setPeriodId('')
    setStatus('')
    setKategori('')
    setSourceType('')
    setSearch('')
    setAppliedSearch('')
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(v || 0)

  // ── KPI aggregates (in scope) ───────────────────────────────────────────────
  const k = useMemo(() => {
    const posted = entries.filter((e) => e.status === 'posted')
    const draft = entries.filter((e) => e.status === 'draft')
    const reversed = entries.filter((e) => e.status === 'reversed' || e.status === 'void')
    const totalDebit = entries.reduce((s, e) => s + (Number(e.total_debit) || 0), 0)
    const totalCredit = entries.reduce((s, e) => s + (Number(e.total_credit) || 0), 0)
    const postedValue = posted.reduce((s, e) => s + (Number(e.total_debit) || 0), 0)
    // Control KPI: entries whose own debit/credit don't balance (data integrity)
    const unbalanced = entries.filter(
      (e) => Math.abs((Number(e.total_debit) || 0) - (Number(e.total_credit) || 0)) > 0.01,
    ).length
    return {
      total: entries.length,
      postedCount: posted.length,
      postedValue,
      draftCount: draft.length,
      reversedCount: reversed.length,
      totalDebit,
      totalCredit,
      unbalanced,
      balanced: Math.abs(totalDebit - totalCredit) < 0.01,
    }
  }, [entries])

  const statusBadge = (s: string) => {
    if (s === 'posted')
      return (
        <Badge variant="default">
          <CheckCircleIcon className="mr-1 h-3 w-3" />
          Posted
        </Badge>
      )
    if (s === 'draft') return <Badge variant="secondary">Draft</Badge>
    if (s === 'reversed') return <Badge variant="outline">Reversed</Badge>
    if (s === 'void') return <Badge variant="outline">Void</Badge>
    return <Badge variant="secondary">{s}</Badge>
  }

  const periodOptions = periods.map((p) => ({
    value: p.id,
    label: p.period_name,
    description: `Status: ${p.status}`,
  }))

  const activeFilterCount =
    (periodId ? 1 : 0) +
    (status ? 1 : 0) +
    (kategori ? 1 : 0) +
    (sourceType ? 1 : 0) +
    (appliedSearch ? 1 : 0)

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jurnal Umum</h1>
          <p className="text-muted-foreground">
            Catat dan kelola transaksi keuangan (double-entry, PSAK compliant).
          </p>
        </div>
        <Link href="/finance/journal/new">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            Jurnal Baru
          </Button>
        </Link>
      </div>

      {/* ── KPI grid ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          icon={<FileTextIcon className="h-4 w-4" />}
          label="Total Jurnal"
          value={k.total.toString()}
          hint="Dalam rentang filter"
        />
        <KpiCard
          icon={<CheckCircleIcon className="h-4 w-4" />}
          label="Posted"
          value={k.postedCount.toString()}
          hint={`Rp ${fmt(k.postedValue)}`}
          tone="positive"
        />
        <KpiCard
          icon={<ClockIcon className="h-4 w-4" />}
          label="Draft"
          value={k.draftCount.toString()}
          hint="Menunggu posting"
          tone={k.draftCount > 0 ? 'warn' : undefined}
        />
        <KpiCard
          icon={<RotateCcwIcon className="h-4 w-4" />}
          label="Reversed / Void"
          value={k.reversedCount.toString()}
          hint="Koreksi & pembatalan"
        />
        <KpiCard
          icon={<ArrowDownLeftIcon className="h-4 w-4" />}
          label="Total Debit"
          value={fmt(k.totalDebit)}
          tone="positive"
        />
        <KpiCard
          icon={<ArrowUpRightIcon className="h-4 w-4" />}
          label="Total Credit"
          value={fmt(k.totalCredit)}
          tone="warn"
          badge={
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                k.balanced ? 'text-emerald-600' : 'text-destructive'
              }`}
            >
              <ScaleIcon className="h-3 w-3" />
              {k.balanced ? 'Balanced' : `${k.unbalanced} tidak balance`}
            </span>
          }
        />
      </div>

      {/* ── Mandatory filter bar ──────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">
                Dari Tanggal <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">
                Sampai Tanggal <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Periode Fiskal</Label>
              <SearchableSelect
                options={periodOptions}
                value={periodId}
                onValueChange={setPeriodId}
                placeholder="Semua periode"
                searchPlaceholder="Cari periode…"
                clearable
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <SearchableSelect
                options={JOURNAL_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                value={status}
                onValueChange={setStatus}
                placeholder="Semua status"
                searchPlaceholder="Cari status…"
                clearable
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Kategori Jurnal</Label>
              <SearchableSelect
                options={KATEGORI_JURNAL.map((s) => ({
                  value: s.value,
                  label: s.label,
                  description: s.description,
                }))}
                value={kategori}
                onValueChange={setKategori}
                placeholder="Semua kategori"
                searchPlaceholder="Cari kategori…"
                clearable
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Sumber (Source)</Label>
              <SearchableSelect
                options={SOURCE_TYPES.map((s) => ({
                  value: s.value,
                  label: s.label,
                  description: s.description,
                }))}
                value={sourceType}
                onValueChange={setSourceType}
                placeholder="Semua sumber"
                searchPlaceholder="Cari sumber…"
                clearable
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setAppliedSearch(search)}
                placeholder="Cari nomor jurnal, deskripsi, atau referensi…"
                className="h-9 pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setAppliedSearch(search)}>
                <SearchIcon className="mr-1 h-4 w-4" />
                Cari
              </Button>
              <Button variant="outline" size="sm" onClick={resetFilters}>
                <XIcon className="mr-1 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>

          {activeFilterCount > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {activeFilterCount} filter aktif · {entries.length} hasil
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Table ─────────────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">No. Jurnal</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Tanggal</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Deskripsi</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Kategori</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                    Debit
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-muted-foreground">
                    Credit
                  </th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <Loader2Icon className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      Tidak ada jurnal pada rentang/filter ini.{' '}
                      <Link href="/finance/journal/new" className="text-primary hover:underline">
                        Buat jurnal baru →
                      </Link>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-6 py-3 font-mono text-sm font-medium text-primary">
                        {entry.entry_number}
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">
                        {entry.transaction_date
                          ? new Date(entry.transaction_date).toLocaleDateString('id-ID')
                          : '—'}
                      </td>
                      <td className="max-w-xs truncate px-6 py-3 text-sm text-muted-foreground">
                        {entry.description || '—'}
                      </td>
                      <td className="px-6 py-3 text-xs text-muted-foreground">
                        {labelOf(KATEGORI_JURNAL, entry.kategori_jurnal)}
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-emerald-600">
                        {fmt(entry.total_debit)}
                      </td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-destructive">
                        {fmt(entry.total_credit)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex gap-1">
                          {statusBadge(entry.status)}
                          {entry.reversal_of_id && <Badge variant="secondary">Reversal</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/finance/journal/${entry.id}`}>
                            <Button variant="ghost" size="sm">
                              Lihat
                            </Button>
                          </Link>
                          {entry.status === 'draft' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePost(entry.id)}
                                disabled={postingId === entry.id}
                                className="text-emerald-600 hover:text-emerald-700"
                              >
                                {postingId === entry.id ? 'Posting…' : 'Post'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(entry.id)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                Hapus
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone,
  badge,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  tone?: 'positive' | 'warn'
  badge?: React.ReactNode
}) {
  const valueColor =
    tone === 'positive' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : ''
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <p className={`mt-2 text-xl font-bold tabular-nums ${valueColor}`}>{value}</p>
        {badge ? <div className="mt-1">{badge}</div> : hint ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
