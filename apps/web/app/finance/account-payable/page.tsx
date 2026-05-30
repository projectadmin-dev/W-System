'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { cn } from '@workspace/ui/lib/utils'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@workspace/ui/components/select'
import {
  ChevronDownIcon, ChevronRightIcon, PlusIcon, XIcon, SearchIcon, RefreshCwIcon,
  WalletIcon, AlertTriangleIcon, CheckCircle2Icon, SendIcon, FileDownIcon, Loader2Icon,
} from 'lucide-react'
import type {
  APInvoice, APItem, APSummary, APStatus, DasarPengajuanAP,
} from '@/types/account-payable'
import {
  AP_STATUS_LABEL, AP_STATUS_COLOR, DASAR_PENGAJUAN_LABEL,
  formatRpAP, formatDateAP, daysToDue, isOverdueAP, displayStatusAP,
} from '@/types/account-payable'

const DASAR_OPTIONS: DasarPengajuanAP[] = ['purchase_order', 'ppn', 'infrastructure', 'overhead', 'server', 'lain_lain']
type Filter = 'semua' | 'open' | 'overdue' | 'paid'

interface ProjectOpt { id: string; project_name: string; client_name: string }
interface EmployeeOpt { id: string; full_name: string; nik?: string; department?: string; position_name?: string }

// ── small helpers ─────────────────────────────────────────────────────────────
function StatusBadge({ inv }: { inv: APInvoice }) {
  const disp = displayStatusAP(inv)
  if (inv.status === 'DRAFT' || inv.status === 'SUBMITTED' || inv.status === 'REJECTED') {
    return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', AP_STATUS_COLOR[inv.status])}>{AP_STATUS_LABEL[inv.status]}</span>
  }
  const map = {
    open:    { t: 'Open',    c: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
    overdue: { t: 'Overdue', c: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    paid:    { t: 'Paid',    c: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  }[disp]
  return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', map.c)}>{map.t}</span>
}

// ── Employee picker (for approver identity → enables auto-journal) ─────────────
function EmployeePicker({ value, onPick }: { value: EmployeeOpt | null; onPick: (e: EmployeeOpt | null) => void }) {
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState<EmployeeOpt[]>([])
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/finance/employees?search=${encodeURIComponent(q)}&size=10`)
        const json = await res.json().catch(() => ({}))
        setOpts(json.data ?? [])
      } catch { /* ignore */ }
    }, 250)
    return () => clearTimeout(t)
  }, [q, open])
  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
        <span>{value.full_name}{value.position_name ? <span className="text-muted-foreground"> · {value.position_name}</span> : null}</span>
        <button onClick={() => onPick(null)} className="text-muted-foreground hover:text-destructive"><XIcon className="w-4 h-4" /></button>
      </div>
    )
  }
  return (
    <div className="relative">
      <Input placeholder="Cari approver..." value={q} onFocus={() => setOpen(true)} onChange={e => { setQ(e.target.value); setOpen(true) }} />
      {open && opts.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-56 overflow-y-auto">
          {opts.map(o => (
            <button key={o.id} onClick={() => { onPick(o); setOpen(false); setQ('') }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted">
              <div className="font-medium">{o.full_name}</div>
              <div className="text-xs text-muted-foreground">{[o.nik, o.department, o.position_name].filter(Boolean).join(' · ')}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AccountPayablePage() {
  const [rows, setRows] = useState<APInvoice[]>([])
  const [summary, setSummary] = useState<APSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('semua')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // modals
  const [createOpen, setCreateOpen] = useState(false)
  const [approveTarget, setApproveTarget] = useState<APInvoice | null>(null)
  const [rejectTarget, setRejectTarget] = useState<APInvoice | null>(null)
  const [payTarget, setPayTarget] = useState<APInvoice | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'semua') params.set('display', filter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/finance/account-payable?${params}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? `Error ${res.status}`); return }
      setRows(json.data ?? [])
      setSummary(json.summary ?? null)
    } catch { toast.error('Gagal memuat data tagihan') } finally { setLoading(false) }
  }, [filter, search])

  useEffect(() => { fetchData() }, [fetchData])

  const toggle = (id: string) => setExpanded(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const exportCsv = () => {
    const head = ['AP Number', 'Vendor', 'No Invoice', 'Tgl Terima', 'Jatuh Tempo', 'Dasar', 'Grand Total', 'Dibayar', 'Sisa', 'Status']
    const lines = rows.map(r => [
      r.ap_number, r.pihak_ketiga, r.no_invoice, r.tgl_terima, r.tgl_jatuh_tempo,
      DASAR_PENGAJUAN_LABEL[r.dasar_pengajuan] ?? r.dasar_pengajuan,
      r.grand_total, r.amount_paid, r.amount_due, displayStatusAP(r),
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `ap-aging-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Account Payable</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola tagihan vendor dan subcon yang harus dibayar oleh WIT.</p>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard icon={<WalletIcon className="w-5 h-5" />} iconBg="bg-amber-500" value={summary ? String(summary.open_count) : '—'} label="Open" loading={loading} />
        <SummaryCard icon={<AlertTriangleIcon className="w-5 h-5" />} iconBg="bg-red-500" value={summary ? String(summary.overdue_count) : '—'} label="Overdue" loading={loading} />
        <SummaryCard icon={<CheckCircle2Icon className="w-5 h-5" />} iconBg="bg-blue-600" value={summary ? formatRpAP(summary.paid_total) : '—'} label="Sudah Dibayar" loading={loading} big />
      </div>

      {/* ── AP Aging Report ── */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">AP Aging Report</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(summary?.aging ?? Array.from({ length: 5 })).map((b: any, i: number) => (
            <div key={i} className="rounded-lg border bg-muted/30 px-4 py-4 text-center">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{b?.label ?? '—'}</p>
              <p className="text-xl font-bold mt-2">{loading ? <Skeleton className="h-6 w-20 mx-auto" /> : formatRpAP(b?.amount ?? 0)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{b?.count ?? 0} tagihan</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Forecast Cash Out ── */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">Forecast Cash Out</h2>
        <ForecastChart buckets={summary?.forecast ?? []} loading={loading} />
      </div>

      {/* ── Daftar Tagihan ── */}
      <div className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            Daftar Tagihan
            <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold w-6 h-6">{rows.length}</span>
          </h2>
          <div className="relative ml-2 w-56">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari vendor / no invoice..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            {(['semua', 'open', 'overdue', 'paid'] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn('rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
                  filter === f
                    ? f === 'overdue' ? 'bg-red-600 text-white border-red-600'
                      : f === 'paid' ? 'bg-green-600 text-white border-green-600'
                      : f === 'open' ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted')}>
                {f === 'semua' ? 'Semua' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <Button variant="outline" size="sm" onClick={exportCsv} className="h-8 gap-1.5"><FileDownIcon className="w-3.5 h-3.5" />CSV</Button>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-8"><RefreshCwIcon className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /></Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 gap-1.5"><PlusIcon className="w-4 h-4" />Input Tagihan Baru</Button>
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                <th className="text-left font-medium px-4 py-3 w-8" />
                <th className="text-left font-medium px-4 py-3">Vendor</th>
                <th className="text-left font-medium px-4 py-3">No Invoice</th>
                <th className="text-left font-medium px-4 py-3">Tgl Terima</th>
                <th className="text-left font-medium px-4 py-3">Jatuh Tempo</th>
                <th className="text-left font-medium px-4 py-3">Dasar</th>
                <th className="text-right font-medium px-4 py-3">Grand Total</th>
                <th className="text-center font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b"><td colSpan={9} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td></tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">Belum ada tagihan. Klik "Input Tagihan Baru" untuk memulai.</td></tr>
              ) : rows.map(r => {
                const overdue = isOverdueAP(r)
                const dd = daysToDue(r.tgl_jatuh_tempo)
                const isOpen = expanded.has(r.id)
                return (
                  <FragmentRow key={r.id}
                    r={r} isOpen={isOpen} overdue={overdue} dd={dd}
                    onToggle={() => toggle(r.id)}
                    onApprove={() => setApproveTarget(r)}
                    onReject={() => setRejectTarget(r)}
                    onPay={() => setPayTarget(r)}
                    onSubmit={async () => {
                      const res = await fetch(`/api/finance/account-payable/${r.id}/submit`, { method: 'POST' })
                      if (res.ok) { toast.success('Tagihan diajukan'); fetchData() } else toast.error('Gagal mengajukan')
                    }}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ── */}
      {createOpen && <CreateBillDialog onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); fetchData() }} />}
      {approveTarget && <ApproveDialog inv={approveTarget} onClose={() => setApproveTarget(null)} onDone={() => { setApproveTarget(null); fetchData() }} />}
      {rejectTarget && <RejectDialog inv={rejectTarget} onClose={() => setRejectTarget(null)} onDone={() => { setRejectTarget(null); fetchData() }} />}
      {payTarget && <PayDialog inv={payTarget} onClose={() => setPayTarget(null)} onDone={() => { setPayTarget(null); fetchData() }} />}
    </div>
  )
}

// ── Summary card ──────────────────────────────────────────────────────────────
function SummaryCard({ icon, iconBg, value, label, loading, big }: { icon: React.ReactNode; iconBg: string; value: string; label: string; loading: boolean; big?: boolean }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4">
      <div className={cn('flex items-center justify-center rounded-lg text-white w-11 h-11 shrink-0', iconBg)}>{icon}</div>
      <div>
        {loading ? <Skeleton className="h-7 w-24" /> : <p className={cn('font-bold', big ? 'text-2xl' : 'text-3xl')}>{value}</p>}
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ── Forecast horizontal bars ──────────────────────────────────────────────────
function ForecastChart({ buckets, loading }: { buckets: APSummary['forecast']; loading: boolean }) {
  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
  const max = Math.max(1, ...buckets.map(b => b.amount))
  if (buckets.length === 0) return <p className="text-sm text-muted-foreground">Tidak ada data forecast.</p>
  return (
    <div className="space-y-2.5">
      {buckets.map((b, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-28 shrink-0 tabular-nums">{b.label}</span>
          <div className="flex-1 h-6 rounded bg-muted/50 overflow-hidden">
            <div className="h-full rounded bg-primary/80 transition-all" style={{ width: `${(b.amount / max) * 100}%`, minWidth: b.amount > 0 ? '2px' : '0' }} />
          </div>
          <span className="text-xs font-medium w-32 text-right tabular-nums">{formatRpAP(b.amount)}</span>
        </div>
      ))}
    </div>
  )
}

// ── A bill row + its expandable detail ─────────────────────────────────────────
function FragmentRow({ r, isOpen, overdue, dd, onToggle, onApprove, onReject, onPay, onSubmit }: {
  r: APInvoice; isOpen: boolean; overdue: boolean; dd: number | null
  onToggle: () => void; onApprove: () => void; onReject: () => void; onPay: () => void; onSubmit: () => void
}) {
  return (
    <>
      <tr className={cn('border-b hover:bg-muted/40 transition-colors', overdue && 'bg-red-50/40 dark:bg-red-950/10')}>
        <td className="px-4 py-3">
          <button onClick={onToggle} className="text-muted-foreground hover:text-foreground">
            {isOpen ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
          </button>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium">{r.pihak_ketiga}</div>
          <div className="text-xs text-muted-foreground">{r.project_name || DASAR_PENGAJUAN_LABEL[r.dasar_pengajuan]}</div>
        </td>
        <td className="px-4 py-3 font-mono text-xs">{r.no_invoice}</td>
        <td className="px-4 py-3">{formatDateAP(r.tgl_terima)}</td>
        <td className="px-4 py-3">
          {formatDateAP(r.tgl_jatuh_tempo)}
          {overdue && dd !== null && <span className="block text-xs text-red-600 font-medium">({Math.abs(dd)} hari lewat)</span>}
        </td>
        <td className="px-4 py-3">{DASAR_PENGAJUAN_LABEL[r.dasar_pengajuan] ?? r.dasar_pengajuan}</td>
        <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatRpAP(r.grand_total, r.mata_uang)}</td>
        <td className="px-4 py-3 text-center"><StatusBadge inv={r} /></td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1.5">
            {(r.status === 'DRAFT' || r.status === 'REJECTED') && (
              <Button size="sm" variant="outline" className="h-7 gap-1" onClick={onSubmit}><SendIcon className="w-3 h-3" />Ajukan</Button>
            )}
            {r.status === 'SUBMITTED' && (
              <>
                <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700" onClick={onApprove}>Approve</Button>
                <Button size="sm" variant="outline" className="h-7 text-destructive" onClick={onReject}>Tolak</Button>
              </>
            )}
            {r.status === 'APPROVED' && (
              <Button size="sm" className="h-7" onClick={onPay}>Bayar</Button>
            )}
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr className="border-b bg-muted/20">
          <td colSpan={9} className="px-4 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Informasi Tagihan */}
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase mb-3">Informasi Tagihan</p>
                <dl className="space-y-1.5 text-sm">
                  {[
                    ['AP Number', r.ap_number],
                    ['No Invoice', r.no_invoice],
                    ['No Ref Dokumen', r.no_ref_dokumen ?? '—'],
                    ['Tgl Terima', formatDateAP(r.tgl_terima)],
                    ['Jatuh Tempo', formatDateAP(r.tgl_jatuh_tempo)],
                    ['Dasar', DASAR_PENGAJUAN_LABEL[r.dasar_pengajuan] ?? r.dasar_pengajuan],
                    ['Pihak Ketiga', r.pihak_ketiga],
                    ['Project', r.project?.project_name ?? r.project_name ?? 'Umum / Overhead'],
                    ['Deskripsi', r.deskripsi ?? '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-dashed border-border/50 pb-1.5">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-medium text-right">{v}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-4 pt-1">
                    <dt className="font-semibold">Grand Total</dt>
                    <dd className="font-bold text-right">{formatRpAP(r.grand_total, r.mata_uang)}</dd>
                  </div>
                  {r.journal_entry_id && (
                    <div className="flex justify-between gap-4 pt-1 text-xs text-green-600">
                      <dt>Journal Entry</dt><dd className="font-mono">✓ Posted ke GL</dd>
                    </div>
                  )}
                </dl>
              </div>
              {/* Detail Transaksi */}
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase mb-3">Detail Transaksi</p>
                <table className="w-full text-sm">
                  <thead><tr className="text-[11px] uppercase text-muted-foreground border-b">
                    <th className="text-left font-medium py-1.5">Deskripsi</th>
                    <th className="text-right font-medium py-1.5">Qty</th>
                    <th className="text-right font-medium py-1.5">Harga @</th>
                    <th className="text-right font-medium py-1.5">Subtotal</th>
                  </tr></thead>
                  <tbody>
                    {(r.items ?? []).map((it, i) => (
                      <tr key={it.id ?? i} className="border-b border-dashed border-border/40">
                        <td className="py-2">{it.deskripsi}</td>
                        <td className="py-2 text-right tabular-nums">{Number(it.qty)}</td>
                        <td className="py-2 text-right tabular-nums">{formatRpAP(it.harga, r.mata_uang)}</td>
                        <td className="py-2 text-right tabular-nums">{formatRpAP((it.subtotal ?? Number(it.qty) * Number(it.harga)), r.mata_uang)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold">
                      <td colSpan={3} className="py-2 text-right text-muted-foreground">Grand Total</td>
                      <td className="py-2 text-right tabular-nums">{formatRpAP(r.grand_total, r.mata_uang)}</td>
                    </tr>
                    {r.amount_paid > 0 && (
                      <tr className="text-xs text-green-600">
                        <td colSpan={3} className="py-1 text-right">Sudah Dibayar</td>
                        <td className="py-1 text-right tabular-nums">{formatRpAP(r.amount_paid, r.mata_uang)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {r.status === 'REJECTED' && r.reject_reason && (
                  <p className="mt-3 text-xs text-red-600 border border-red-200 rounded p-2 bg-red-50 dark:bg-red-950/20">
                    <strong>Ditolak:</strong> {r.reject_reason}
                  </p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Create Bill dialog ─────────────────────────────────────────────────────────
function CreateBillDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    no_invoice: '', no_ref_dokumen: '', tgl_terima: today, tgl_jatuh_tempo: '',
    dasar_pengajuan: 'purchase_order' as DasarPengajuanAP, project_id: '', pihak_ketiga: '', deskripsi: '',
  })
  const [items, setItems] = useState<APItem[]>([{ urutan: 1, deskripsi: '', qty: 1, harga: 0 }])
  const [projects, setProjects] = useState<ProjectOpt[]>([])
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    fetch('/api/ar/projects').then(r => r.json()).then(j => setProjects(j.data ?? [])).catch(() => {})
  }, [])

  const grand = useMemo(() => items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.harga || 0), 0), [items])

  const save = async (submit: boolean) => {
    if (!form.no_invoice.trim() || !form.pihak_ketiga.trim() || !form.tgl_jatuh_tempo) {
      toast.error('No Invoice, Pihak Ketiga, dan Jatuh Tempo wajib diisi'); return
    }
    if (items.some(it => !it.deskripsi.trim())) { toast.error('Deskripsi item tidak boleh kosong'); return }
    setSaving(true)
    try {
      const proj = projects.find(p => p.id === form.project_id)
      const res = await fetch('/api/finance/account-payable', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form, project_id: form.project_id || null, project_name: proj?.project_name ?? null,
          items: items.map(it => ({ deskripsi: it.deskripsi, qty: Number(it.qty), harga: Number(it.harga) })),
          submit,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Gagal menyimpan'); return }
      toast.success(submit ? 'Tagihan disimpan & diajukan' : 'Tagihan tersimpan')
      onSaved()
    } catch (e) { toast.error(String(e)) } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Input Tagihan Baru</DialogTitle>
          <DialogDescription>Catat tagihan dari pihak ketiga (vendor, subcon, DJP, dsb).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <Field label="No Invoice (dari pihak ketiga)" req><Input value={form.no_invoice} onChange={e => set('no_invoice', e.target.value)} placeholder="INV-PLABS-001" /></Field>
            <Field label="No Ref Dokumen"><Input value={form.no_ref_dokumen} onChange={e => set('no_ref_dokumen', e.target.value)} placeholder="PO-2026-XXX" /></Field>
            <Field label="Tanggal Terima Tagihan" req><Input type="date" value={form.tgl_terima} onChange={e => set('tgl_terima', e.target.value)} /></Field>
            <Field label="Tanggal Jatuh Tempo" req><Input type="date" value={form.tgl_jatuh_tempo} onChange={e => set('tgl_jatuh_tempo', e.target.value)} /></Field>
            <Field label="Dasar Pengajuan" req>
              <Select value={form.dasar_pengajuan} onValueChange={v => set('dasar_pengajuan', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DASAR_OPTIONS.map(d => <SelectItem key={d} value={d}>{DASAR_PENGAJUAN_LABEL[d]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Project (Opsional)">
              <Select value={form.project_id || 'none'} onValueChange={v => set('project_id', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Umum / Overhead" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Umum / Overhead</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Pihak Ketiga (Vendor / DJP / dsb)" req>
            <Input value={form.pihak_ketiga} onChange={e => set('pihak_ketiga', e.target.value)} placeholder="PLABS, Google Cloud, DJP, Biznet, dll" />
          </Field>
          <Field label="Deskripsi Tagihan"><Textarea value={form.deskripsi} onChange={e => set('deskripsi', e.target.value)} placeholder="Jelaskan tagihan ini..." rows={2} /></Field>

          {/* Detail Transaksi */}
          <div>
            <p className="text-sm font-semibold mb-2">Detail Transaksi</p>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input className="flex-1" placeholder="Deskripsi item" value={it.deskripsi}
                    onChange={e => setItems(arr => arr.map((x, j) => j === i ? { ...x, deskripsi: e.target.value } : x))} />
                  <Input className="w-20" type="number" placeholder="1" value={it.qty}
                    onChange={e => setItems(arr => arr.map((x, j) => j === i ? { ...x, qty: Number(e.target.value) } : x))} />
                  <Input className="w-32" type="number" placeholder="0" value={it.harga}
                    onChange={e => setItems(arr => arr.map((x, j) => j === i ? { ...x, harga: Number(e.target.value) } : x))} />
                  <button onClick={() => setItems(arr => arr.length > 1 ? arr.filter((_, j) => j !== i) : arr)}
                    className="text-muted-foreground hover:text-destructive p-1"><XIcon className="w-4 h-4" /></button>
                </div>
              ))}
              <button onClick={() => setItems(arr => [...arr, { urutan: arr.length + 1, deskripsi: '', qty: 1, harga: 0 }])}
                className="w-full rounded-md border border-dashed py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
                + Tambah Baris
              </button>
            </div>
            <div className="flex justify-end mt-3 text-sm font-semibold">Grand Total:&nbsp;<span className="tabular-nums">{formatRpAP(grand)}</span></div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button variant="outline" onClick={() => save(false)} disabled={saving}>{saving ? <Loader2Icon className="w-4 h-4 animate-spin" /> : 'Simpan Draft'}</Button>
          <Button onClick={() => save(true)} disabled={saving}>{saving ? <Loader2Icon className="w-4 h-4 animate-spin" /> : 'Simpan & Ajukan'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}{req && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
    </div>
  )
}

// ── Approve dialog (with approver picker → enables auto-journal) ─────────────────
function ApproveDialog({ inv, onClose, onDone }: { inv: APInvoice; onClose: () => void; onDone: () => void }) {
  const [approver, setApprover] = useState<EmployeeOpt | null>(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/finance/account-payable/${inv.id}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver_id: approver?.id, approver_name: approver?.full_name, notes }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Gagal'); return }
      toast.success('Tagihan disetujui')
      if (json.warning) toast.warning(json.warning)
      onDone()
    } catch (e) { toast.error(String(e)) } finally { setBusy(false) }
  }
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Setujui Tagihan</DialogTitle>
          <DialogDescription>{inv.pihak_ketiga} · {formatRpAP(inv.grand_total, inv.mata_uang)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Field label="Approver (untuk journal entry)"><EmployeePicker value={approver} onPick={setApprover} /></Field>
          <Field label="Catatan (opsional)"><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></Field>
          <p className="text-xs text-muted-foreground">Setelah disetujui, journal entry otomatis dibuat (Dr Beban / Cr Hutang Usaha) jika approver dipilih.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Batal</Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={go} disabled={busy}>{busy ? <Loader2Icon className="w-4 h-4 animate-spin" /> : 'Setujui'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Reject dialog ───────────────────────────────────────────────────────────────
function RejectDialog({ inv, onClose, onDone }: { inv: APInvoice; onClose: () => void; onDone: () => void }) {
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async () => {
    if (!notes.trim()) { toast.error('Alasan penolakan wajib diisi'); return }
    setBusy(true)
    try {
      const res = await fetch(`/api/finance/account-payable/${inv.id}/reject`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Gagal'); return }
      toast.success('Tagihan ditolak')
      onDone()
    } catch (e) { toast.error(String(e)) } finally { setBusy(false) }
  }
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tolak Tagihan</DialogTitle>
          <DialogDescription>{inv.pihak_ketiga} · {inv.no_invoice}</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Field label="Alasan Penolakan" req><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Jelaskan alasan penolakan..." /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Batal</Button>
          <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={go} disabled={busy}>{busy ? <Loader2Icon className="w-4 h-4 animate-spin" /> : 'Tolak'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Pay dialog ──────────────────────────────────────────────────────────────────
function PayDialog({ inv, onClose, onDone }: { inv: APInvoice; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(String(inv.amount_due))
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async () => {
    const a = Number(amount)
    if (a <= 0) { toast.error('Nominal harus > 0'); return }
    setBusy(true)
    try {
      const res = await fetch(`/api/finance/account-payable/${inv.id}/pay`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: a, notes }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Gagal'); return }
      toast.success('Pembayaran tercatat')
      onDone()
    } catch (e) { toast.error(String(e)) } finally { setBusy(false) }
  }
  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bayar Tagihan</DialogTitle>
          <DialogDescription>{inv.pihak_ketiga} · Sisa {formatRpAP(inv.amount_due, inv.mata_uang)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3 text-sm rounded-lg border bg-muted/30 p-3">
            <div><p className="text-xs text-muted-foreground">Grand Total</p><p className="font-semibold tabular-nums">{formatRpAP(inv.grand_total, inv.mata_uang)}</p></div>
            <div><p className="text-xs text-muted-foreground">Dibayar</p><p className="font-semibold tabular-nums">{formatRpAP(inv.amount_paid, inv.mata_uang)}</p></div>
            <div><p className="text-xs text-muted-foreground">Sisa</p><p className="font-semibold tabular-nums text-red-600">{formatRpAP(inv.amount_due, inv.mata_uang)}</p></div>
          </div>
          <Field label="Nominal Bayar" req><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
          <Field label="Catatan (opsional)"><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Batal</Button>
          <Button onClick={go} disabled={busy}>{busy ? <Loader2Icon className="w-4 h-4 animate-spin" /> : 'Catat Pembayaran'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
