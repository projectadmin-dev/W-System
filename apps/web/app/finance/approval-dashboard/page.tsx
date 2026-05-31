'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@workspace/ui/lib/utils'
import { Button } from '@workspace/ui/components/button'
import { Textarea } from '@workspace/ui/components/textarea'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  CalendarIcon, BoltIcon, HourglassIcon, HistoryIcon, FlagIcon, TimerIcon,
  AlertTriangleIcon, ChevronUpIcon, ChevronDownIcon, ChevronsDownIcon,
  CheckCircle2Icon, ShieldAlertIcon, UserIcon, StoreIcon, ClockIcon,
  CheckIcon, XIcon, EyeIcon, BellRingIcon, RefreshCwIcon,
  InboxIcon, BellIcon, WalletIcon, CircleDollarSignIcon, PlusCircleIcon,
} from 'lucide-react'

// ── types (mirror /api/finance/approval-dashboard) ───────────────────────────
type Priority = 'high' | 'medium' | 'low'
type SLAState = 'ok' | 'risk' | 'breached'
interface ApprovalDoc {
  id: string
  module: 'PU' | 'AP'
  module_label: string
  doc_number: string
  amount: number
  currency: string
  requestor_name: string
  counterparty: string
  status: string
  due_date: string | null
  overdue_days: number | null
  submitted_at: string | null
  created_at: string
  priority: Priority
  sla: SLAState
  sla_hours: number
  detail_url: string
}
interface ActivityItem {
  id: string
  module: 'PU' | 'AP'
  action: string
  actor_name: string
  doc_label: string
  notes: string | null
  at: string
}
interface DashboardData {
  summary: {
    waiting_count: number
    awaiting_count: number
    activity_count: number
    priority: { high: number; medium: number; low: number }
    sla: { ok: number; risk: number; breached: number }
  }
  waiting: ApprovalDoc[]
  awaiting: ApprovalDoc[]
  paid: ApprovalDoc[]
  activity: ActivityItem[]
}

// ── helpers ──────────────────────────────────────────────────────────────────
function formatRp(n: number, currency = 'IDR'): string {
  if (currency !== 'IDR') return `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  return 'IDR ' + n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatDate(d: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days >= 1) return `${days} hari lalu`
  const hours = Math.floor(diff / 3_600_000)
  if (hours >= 1) return `${hours} jam lalu`
  const mins = Math.floor(diff / 60_000)
  return mins <= 1 ? 'baru saja' : `${mins} menit lalu`
}

const PRIO_LABEL: Record<Priority, string> = { high: 'HIGH', medium: 'MEDIUM', low: 'LOW' }
const PRIO_PILL: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
}
const PRIO_BAR: Record<Priority, string> = {
  high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-emerald-500',
}

type TabFilter = 'all' | 'high' | 'atrisk'

// ── KPI card ─────────────────────────────────────────────────────────────────
function Kpi({ tone, icon, num, label, tag }: {
  tone: 'act' | 'ok' | 'info'; icon: React.ReactNode; num: number | string; label: string; tag: React.ReactNode
}) {
  const numColor = tone === 'act' ? 'text-red-600 dark:text-red-400'
    : tone === 'ok' ? 'text-teal-600 dark:text-teal-400'
    : 'text-indigo-600 dark:text-indigo-400'
  return (
    <div className={cn(
      'relative overflow-hidden rounded-xl bg-card border px-4 py-3.5 min-w-[150px] flex flex-col gap-0.5 shadow-sm',
      tone === 'act' && 'ring-2 ring-red-500/70 shadow-red-500/20'
    )}>
      <span className="absolute right-3 top-3.5 opacity-15">{icon}</span>
      <div className={cn('text-3xl font-bold tabular-nums leading-none', numColor)}>{num}</div>
      <div className="text-xs text-muted-foreground font-medium mt-1.5">{label}</div>
      <div className="mt-2">{tag}</div>
    </div>
  )
}

// ── Overview segment ─────────────────────────────────────────────────────────
function OvSeg({ tone, icon, num, label, border }: {
  tone: 'danger' | 'warn' | 'low' | 'ok' | 'info'; icon: React.ReactNode; num: number; label: string; border?: boolean
}) {
  const toneCls: Record<string, string> = {
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    warn: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    ok: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    info: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  }
  return (
    <div className={cn('flex flex-col gap-2 px-4 py-3', border && 'border-l')}>
      <div className="flex items-center gap-2.5">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-none', toneCls[tone])}>{icon}</div>
        <div className="text-2xl font-bold tabular-nums leading-none">{num}</div>
      </div>
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
    </div>
  )
}

// ── Stepper ──────────────────────────────────────────────────────────────────
function Stepper({ stage }: { stage: 'approval' | 'payment' }) {
  // stage=approval → step2 active; stage=payment → step2 done, step3 active
  const steps = [
    { lbl: 'Diajukan', done: true, active: false },
    { lbl: 'Approval', done: stage === 'payment', active: stage === 'approval' },
    { lbl: 'Pembayaran', done: false, active: stage === 'payment' },
  ]
  return (
    <div className="flex items-start pt-3 mt-0.5 border-t border-dashed">
      {steps.map((s, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 relative text-center">
          {i < steps.length - 1 && (
            <span className={cn('absolute top-[11px] left-1/2 w-full h-0.5 z-0', s.done ? 'bg-emerald-500' : 'bg-muted')} />
          )}
          <div className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-[11px] z-[1] border-2 border-background',
            s.done ? 'bg-emerald-500 text-white'
              : s.active ? 'bg-primary text-primary-foreground ring-4 ring-primary/15'
              : 'bg-muted text-muted-foreground'
          )}>
            {s.done ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <div className={cn('text-[10px] leading-tight max-w-[72px]', s.active ? 'text-primary font-semibold' : 'text-muted-foreground')}>
            {s.lbl}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Approval card ────────────────────────────────────────────────────────────
function ApprovalCard({ doc, actionable, onApprove, onReject, onRemind }: {
  doc: ApprovalDoc; actionable: boolean
  onApprove?: (d: ApprovalDoc) => void
  onReject?: (d: ApprovalDoc) => void
  onRemind?: (d: ApprovalDoc) => void
}) {
  const slaChip = doc.sla === 'breached'
    ? { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', label: `SLA ${doc.sla_hours}h / 4h · Breached` }
    : doc.sla === 'risk'
    ? { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', label: `SLA ${doc.sla_hours}h / 4h · At Risk` }
    : { cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300', label: `SLA ${doc.sla_hours}h / 4h · On Track` }

  return (
    <article className="relative overflow-hidden rounded-xl border bg-card p-4 pl-5 transition-shadow hover:shadow-md">
      <span className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l', PRIO_BAR[doc.priority])} />
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-[11px] text-muted-foreground font-semibold tracking-wide">
          {doc.module_label}<b className="text-foreground ml-1.5 text-[13px]">{doc.doc_number}</b>
        </span>
        <span className={cn('ml-auto text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full', PRIO_PILL[doc.priority])}>
          {PRIO_LABEL[doc.priority]}
        </span>
      </div>
      <div className="text-xl font-bold text-foreground tabular-nums tracking-tight">{formatRp(doc.amount, doc.currency)}</div>
      <div className="my-2 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <UserIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
          Diminta oleh <b className="text-foreground font-semibold">{doc.requestor_name}</b>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <StoreIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
          Counterparty <b className="text-foreground font-semibold">{doc.counterparty}</b>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full',
          doc.overdue_days ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300')}>
          {doc.overdue_days
            ? <><HourglassIcon className="h-3 w-3" />Terlambat {doc.overdue_days} hari</>
            : <><CalendarIcon className="h-3 w-3" />Jatuh Tempo: {formatDate(doc.due_date)}</>}
        </span>
        <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full', slaChip.cls)}>
          <ClockIcon className="h-3 w-3" />{slaChip.label}
        </span>
      </div>
      <Stepper stage={actionable ? 'approval' : 'payment'} />
      <div className="flex gap-2 mt-3.5">
        {actionable ? (
          <>
            <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9" onClick={() => onApprove?.(doc)}>
              <CheckIcon className="h-4 w-4" />Setujui
            </Button>
            <Button size="sm" variant="outline" className="h-9 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => onReject?.(doc)}>
              <XIcon className="h-4 w-4" />Tolak
            </Button>
            <Button size="sm" variant="outline" className="h-9" asChild>
              <a href={doc.detail_url}><EyeIcon className="h-4 w-4" />Detail</a>
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" className="h-9" onClick={() => onRemind?.(doc)}>
              <BellRingIcon className="h-4 w-4" />Ingatkan
            </Button>
            <Button size="sm" variant="outline" className="h-9" asChild>
              <a href={doc.detail_url}><EyeIcon className="h-4 w-4" />Detail</a>
            </Button>
          </>
        )}
      </div>
    </article>
  )
}

// ── Queue (with tabs + empty state) ──────────────────────────────────────────
function Queue({ title, icon, docs, primary, actionable, onApprove, onReject, onRemind }: {
  title: string; icon: React.ReactNode; docs: ApprovalDoc[]; primary?: boolean; actionable: boolean
  onApprove?: (d: ApprovalDoc) => void; onReject?: (d: ApprovalDoc) => void; onRemind?: (d: ApprovalDoc) => void
}) {
  const [tab, setTab] = useState<TabFilter>('all')
  const filtered = useMemo(() => docs.filter(d =>
    tab === 'all' ? true : tab === 'high' ? d.priority === 'high' : (d.sla === 'risk' || d.sla === 'breached')
  ), [docs, tab])

  return (
    <div className="rounded-2xl bg-card border shadow-sm flex flex-col overflow-hidden">
      <div className="px-5 pt-5 flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-none flex items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
          <span className="text-base font-bold text-foreground">{title}</span>
          <span className={cn('text-xs font-bold rounded-full px-2.5 py-0.5 tabular-nums',
            primary ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-muted text-muted-foreground')}>
            {docs.length}
          </span>
          {primary && (
            <span className="ml-auto text-[11px] font-semibold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
              <AlertTriangleIcon className="h-3 w-3" />Butuh keputusan Anda
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {([['all', 'Semua'], ['high', 'High Priority'], ['atrisk', 'SLA At Risk']] as [TabFilter, string][]).map(([k, lbl]) => (
            <button key={k} onClick={() => setTab(k)}
              className={cn('text-xs font-semibold px-3.5 py-1.5 rounded-full transition-colors',
                tab === k ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70')}>
              {lbl}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3 max-h-[560px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center text-center py-9 gap-1.5 text-muted-foreground">
            <InboxIcon className="h-8 w-8 opacity-40" />
            <span className="text-sm font-semibold text-foreground/70">Tidak ada dokumen</span>
            <span className="text-xs">Tidak ada dokumen pada filter ini.</span>
          </div>
        ) : filtered.map(d => (
          <ApprovalCard key={`${d.module}-${d.id}`} doc={d} actionable={actionable}
            onApprove={onApprove} onReject={onReject} onRemind={onRemind} />
        ))}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ApprovalDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [ppTab, setPpTab] = useState<'awaiting' | 'paid'>('awaiting')
  const [confirm, setConfirm] = useState<{ doc: ApprovalDoc; kind: 'approve' | 'reject' } | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/approval-dashboard')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Gagal memuat data')
      setData(json)
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const modulePath = (m: 'PU' | 'AP') => m === 'PU' ? 'permintaan-uang' : 'account-payable'

  const doAction = useCallback(async () => {
    if (!confirm) return
    const { doc, kind } = confirm
    if (kind === 'reject' && !rejectNote.trim()) {
      toast.error('Alasan penolakan wajib diisi')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/finance/${modulePath(doc.module)}/${doc.id}/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: rejectNote.trim() || (kind === 'approve' ? 'Disetujui via Approval Dashboard' : undefined),
          approver_name: 'Approval Dashboard',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Aksi gagal')
      toast.success(`${doc.doc_number} ${kind === 'approve' ? 'disetujui' : 'ditolak'}`)
      setConfirm(null)
      setRejectNote('')
      fetchData()
    } catch (e) {
      toast.error(String(e instanceof Error ? e.message : e))
    } finally {
      setSubmitting(false)
    }
  }, [confirm, rejectNote, fetchData])

  const s = data?.summary
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const ppDocs = ppTab === 'awaiting' ? (data?.awaiting ?? []) : (data?.paid ?? [])

  return (
    <div className="p-6 flex flex-col gap-5 max-w-[1400px] mx-auto w-full">

      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 px-7 py-6 flex items-center gap-7 flex-wrap shadow-md">
        <div className="flex-1 min-w-[260px]">
          <div className="text-white/60 text-sm font-medium">Approval Dashboard</div>
          <h1 className="text-white text-2xl font-bold tracking-tight mt-1.5 mb-3 leading-tight">
            Kelola &amp; kontrol approval workflow
          </h1>
          <div className="inline-flex items-center gap-2 text-white/70 text-xs font-medium bg-white/10 px-3 py-1.5 rounded-full">
            <CalendarIcon className="h-3.5 w-3.5" />{today}
          </div>
          <p className="text-white/50 text-xs mt-3 max-w-md leading-relaxed">
            Permintaan Uang &amp; Pengelolaan Tagihan — satu tempat untuk menyetujui, menolak, dan memantau seluruh antrian approval.
          </p>
        </div>
        <div className="flex gap-3.5 flex-wrap">
          <Kpi tone="act" icon={<BoltIcon className="h-6 w-6" />} num={loading ? '·' : s?.waiting_count ?? 0}
            label="Waiting Your Approval"
            tag={<span className="text-[10px] font-bold tracking-wider uppercase inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"><BoltIcon className="h-2.5 w-2.5" />Perlu tindakan</span>} />
          <Kpi tone="ok" icon={<HourglassIcon className="h-6 w-6" />} num={loading ? '·' : s?.awaiting_count ?? 0}
            label="Awaiting Payment"
            tag={<span className="text-[10px] font-bold tracking-wider uppercase inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Dalam proses</span>} />
          <Kpi tone="info" icon={<HistoryIcon className="h-6 w-6" />} num={loading ? '·' : s?.activity_count ?? 0}
            label="Recent Activity"
            tag={<span className="text-[10px] font-bold tracking-wider uppercase inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground">7 hari terakhir</span>} />
        </div>
      </section>

      {/* Overview band */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-card border shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-1">
            <FlagIcon className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-foreground">Distribusi Prioritas</span>
            <span className="ml-auto text-[11px] text-muted-foreground font-medium">Antrian approval aktif</span>
          </div>
          <div className="grid grid-cols-3 mt-2">
            <OvSeg tone="danger" icon={<ChevronUpIcon className="h-4 w-4" />} num={s?.priority.high ?? 0} label="Priority High" />
            <OvSeg tone="warn" icon={<ChevronsDownIcon className="h-4 w-4" />} num={s?.priority.medium ?? 0} label="Priority Medium" border />
            <OvSeg tone="low" icon={<ChevronDownIcon className="h-4 w-4" />} num={s?.priority.low ?? 0} label="Priority Low" border />
          </div>
        </div>
        <div className="rounded-2xl bg-card border shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-1">
            <TimerIcon className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-semibold text-foreground">Status SLA</span>
            <span className="ml-auto text-[11px] text-muted-foreground font-medium">Target 4 jam / dokumen</span>
          </div>
          <div className="grid grid-cols-3 mt-2">
            <OvSeg tone="ok" icon={<CheckCircle2Icon className="h-4 w-4" />} num={s?.sla.ok ?? 0} label="SLA On Track" />
            <OvSeg tone="warn" icon={<AlertTriangleIcon className="h-4 w-4" />} num={s?.sla.risk ?? 0} label="SLA At Risk" border />
            <OvSeg tone="danger" icon={<ShieldAlertIcon className="h-4 w-4" />} num={s?.sla.breached ?? 0} label="SLA Breached" border />
          </div>
        </div>
      </section>

      {/* Work area */}
      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Skeleton className="h-[420px] rounded-2xl" />
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
      ) : (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <Queue title="Waiting Your Approval" icon={<BoltIcon className="h-5 w-5" />} docs={data?.waiting ?? []}
            primary actionable
            onApprove={(d) => { setRejectNote(''); setConfirm({ doc: d, kind: 'approve' }) }}
            onReject={(d) => { setRejectNote(''); setConfirm({ doc: d, kind: 'reject' }) }} />
          <Queue title="Awaiting Payment" icon={<HourglassIcon className="h-5 w-5" />} docs={data?.awaiting ?? []}
            actionable={false}
            onRemind={(d) => toast.info(`Pengingat dikirim untuk ${d.doc_number}`)} />
        </section>
      )}

      {/* Bottom row */}
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_1.3fr] gap-4 items-start">
        {/* Payment pipeline */}
        <div className="rounded-2xl bg-card border shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 pt-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex-none flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                {ppTab === 'awaiting' ? <WalletIcon className="h-5 w-5" /> : <CircleDollarSignIcon className="h-5 w-5" />}
              </div>
              <span className="text-base font-bold text-foreground">{ppTab === 'awaiting' ? 'Awaiting Payment' : 'Paid'}</span>
            </div>
            <div className="flex gap-1.5 bg-muted p-1 rounded-full">
              {([['awaiting', 'Awaiting Payment'], ['paid', 'Paid']] as ['awaiting' | 'paid', string][]).map(([k, lbl]) => (
                <button key={k} onClick={() => setPpTab(k)}
                  className={cn('flex-1 text-xs font-semibold py-1.5 rounded-full transition-colors',
                    ppTab === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 flex flex-col gap-3 max-h-[460px] overflow-y-auto">
            {loading ? <Skeleton className="h-28 rounded-xl" /> : ppDocs.length === 0 ? (
              <div className="flex flex-col items-center text-center py-10 gap-1.5">
                {ppTab === 'awaiting' ? <WalletIcon className="h-12 w-12 text-muted-foreground/30" /> : <CircleDollarSignIcon className="h-12 w-12 text-muted-foreground/30" />}
                <div className="text-sm font-semibold text-foreground/70">Belum ada aktivitas</div>
                <div className="text-xs text-muted-foreground max-w-[230px] leading-relaxed">
                  {ppTab === 'awaiting'
                    ? 'Belum ada dokumen disetujui yang menunggu pembayaran pada periode ini.'
                    : 'Belum ada pembayaran yang tercatat lunas pada periode ini.'}
                </div>
              </div>
            ) : ppDocs.map(d => (
              <a key={`${d.module}-${d.id}`} href={d.detail_url}
                className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow block">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground font-semibold tracking-wide">
                    {d.module_label}<b className="text-foreground ml-1.5 text-[13px]">{d.doc_number}</b>
                  </span>
                  <span className={cn('text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full',
                    ppTab === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300')}>
                    {ppTab === 'paid' ? 'LUNAS' : 'AWAITING'}
                  </span>
                </div>
                <div className="text-lg font-bold tabular-nums mt-1.5">{formatRp(d.amount, d.currency)}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
                  <StoreIcon className="h-3.5 w-3.5 text-muted-foreground/60" />{d.counterparty}
                  <span className="mx-1">·</span>
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground/60" />Jatuh Tempo {formatDate(d.due_date)}
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl bg-card border shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 pt-5 flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex items-center justify-center">
              <BellIcon className="h-4 w-4" />
            </div>
            <h2 className="text-base font-bold text-foreground">Recent Activity</h2>
            <button onClick={fetchData} className="ml-auto text-muted-foreground hover:text-foreground" title="Refresh">
              <RefreshCwIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="p-3 max-h-[430px] overflow-y-auto">
            {loading ? (
              <div className="space-y-2">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
            ) : (data?.activity.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center text-center py-10 gap-1.5 text-muted-foreground">
                <HistoryIcon className="h-8 w-8 opacity-40" />
                <span className="text-sm font-semibold text-foreground/70">Belum ada aktivitas</span>
              </div>
            ) : data?.activity.map(a => {
              const isApprove = a.action === 'APPROVE'
              const isReject = a.action === 'REJECT'
              const isPay = a.action === 'PAY'
              const tone = isApprove ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : isReject ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                : isPay ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              const verb = isApprove ? 'menyetujui' : isReject ? 'menolak' : isPay ? 'membayar' : 'mengajukan'
              return (
                <div key={`${a.module}-${a.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors">
                  <div className={cn('w-9 h-9 rounded-lg flex-none flex items-center justify-center', tone)}>
                    {isApprove ? <CheckCircle2Icon className="h-4 w-4" /> : isReject ? <XIcon className="h-4 w-4" /> : isPay ? <WalletIcon className="h-4 w-4" /> : <PlusCircleIcon className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground leading-snug">
                      <span className={cn('text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded mr-1.5 align-middle', tone)}>{a.action}</span>
                      <b className="font-semibold">{a.actor_name}</b> {verb} <b className="font-semibold">{a.doc_label}</b>
                    </div>
                    {a.notes && <div className="text-xs text-muted-foreground mt-0.5 truncate">{a.notes}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground/70 whitespace-nowrap flex-none">{timeAgo(a.at)}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Confirm dialog */}
      <Dialog open={!!confirm} onOpenChange={(o) => { if (!o) { setConfirm(null); setRejectNote('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className={cn('w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2',
              confirm?.kind === 'approve' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300')}>
              {confirm?.kind === 'approve' ? <CheckCircle2Icon className="h-7 w-7" /> : <XIcon className="h-7 w-7" />}
            </div>
            <DialogTitle className="text-center">
              {confirm?.kind === 'approve' ? 'Setujui Dokumen?' : 'Tolak Dokumen?'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {confirm?.kind === 'approve'
                ? <>Anda akan menyetujui <b className="text-foreground">{confirm?.doc.doc_number}</b>. Dokumen akan diteruskan ke tahap berikutnya.</>
                : <>Anda akan menolak <b className="text-foreground">{confirm?.doc.doc_number}</b>. Pemohon akan menerima notifikasi penolakan ini.</>}
            </DialogDescription>
          </DialogHeader>
          {confirm?.kind === 'reject' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Alasan Penolakan <span className="text-red-500">*</span></label>
              <Textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                placeholder="Jelaskan alasan penolakan..." rows={3} />
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => { setConfirm(null); setRejectNote('') }} disabled={submitting}>Batal</Button>
            <Button onClick={doAction} disabled={submitting}
              className={confirm?.kind === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}>
              {submitting ? 'Memproses...' : confirm?.kind === 'approve' ? 'Ya, Setujui' : 'Ya, Tolak'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
