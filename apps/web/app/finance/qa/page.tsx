'use client'

import * as React from 'react'
import {
  CheckCircle2Icon, XCircleIcon, AlertTriangleIcon, MinusCircleIcon,
  ChevronRightIcon, ClipboardCheckIcon, SearchIcon, RefreshCwIcon,
} from 'lucide-react'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Input } from '@workspace/ui/components/input'
import { Button } from '@workspace/ui/components/button'
import { Progress } from '@workspace/ui/components/progress'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@workspace/ui/components/table'

// ── types ────────────────────────────────────────────────────────────────────
interface QACase {
  id: string
  case_code: string
  user_story: string | null
  title: string
  category: string
  method: string
  priority: string
  expected: string | null
  actual: string | null
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'NA'
  notes: string | null
  seq: number
}
interface QARun {
  id: string
  module: string
  title: string
  description: string | null
  environment: string | null
  executed_by: string | null
  executed_at: string
  total: number
  passed: number
  failed: number
  blocked: number
  skipped: number
  pass_rate: number
  status: 'PASS' | 'FAIL' | 'PARTIAL'
  cases: QACase[]
}

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (s: string) =>
  new Date(s).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const CASE_STATUS: Record<QACase['status'], { label: string; cls: string; Icon: any }> = {
  PASS:    { label: 'Pass',    cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', Icon: CheckCircle2Icon },
  FAIL:    { label: 'Fail',    cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', Icon: XCircleIcon },
  BLOCKED: { label: 'Blocked', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', Icon: AlertTriangleIcon },
  NA:      { label: 'N/A',     cls: 'bg-muted text-muted-foreground', Icon: MinusCircleIcon },
}
const METHOD_CLS: Record<string, string> = {
  Automated:     'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Code Review': 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  Manual:        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
}

export default function QADashboardPage() {
  const [runs, setRuns] = React.useState<QARun[]>([])
  const [loading, setLoading] = React.useState(true)
  const [open, setOpen] = React.useState<Record<string, boolean>>({})
  const [search, setSearch] = React.useState('')
  const [usFilter, setUsFilter] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/qa', { cache: 'no-store' })
      const json = await res.json()
      const data: QARun[] = json.data ?? []
      setRuns(data)
      // auto-expand the most recent run
      if (data[0]) setOpen({ [data[0].id]: true })
    } catch {
      setRuns([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const latest = runs[0]

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ClipboardCheckIcon className="size-6 text-primary" /> QA — Test Plan & Hasil
          </h1>
          <p className="text-sm text-muted-foreground">
            Catatan eksekusi test plan modul Finance. Hasil otomatis (unit/logic) &amp; verifikasi code review.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCwIcon className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Muat ulang
        </Button>
      </div>

      {/* Summary cards from latest run */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : latest ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Pass Rate (terbaru)" value={`${latest.pass_rate}%`} accent="text-green-600">
            <Progress value={latest.pass_rate} className="mt-2 h-2" />
          </StatCard>
          <StatCard label="Total Test Case" value={String(latest.total)} accent="text-foreground" />
          <StatCard label="Pass" value={String(latest.passed)} accent="text-green-600" />
          <StatCard label="Fail / Blocked" value={`${latest.failed} / ${latest.blocked}`} accent={latest.failed ? 'text-red-600' : 'text-amber-600'} />
        </div>
      ) : null}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari test case / kode…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {['US-001', 'US-002', 'US-003', 'US-004', 'US-005'].map((us) => (
          <Button
            key={us}
            size="sm"
            variant={usFilter === us ? 'default' : 'outline'}
            onClick={() => setUsFilter(usFilter === us ? null : us)}
          >
            {us}
          </Button>
        ))}
      </div>

      {/* Runs */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : runs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          Belum ada test run. Jalankan seed QA atau POST ke <code>/api/finance/qa</code>.
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {runs.map((run) => {
            const isOpen = !!open[run.id]
            const cases = run.cases
              .filter((c) => !usFilter || c.user_story === usFilter)
              .filter((c) => {
                if (!search.trim()) return true
                const q = search.toLowerCase()
                return c.title.toLowerCase().includes(q) || c.case_code.toLowerCase().includes(q)
              })
            return (
              <Card key={run.id} className="overflow-hidden">
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
                  onClick={() => setOpen((o) => ({ ...o, [run.id]: !o[run.id] }))}
                >
                  <ChevronRightIcon className={`size-4 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{run.title}</span>
                      <Badge variant="outline" className="font-mono text-xs">{run.module}</Badge>
                      <RunStatusBadge status={run.status} />
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {fmtDate(run.executed_at)} · {run.executed_by ?? '—'} · {run.environment ?? '—'}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-semibold tabular-nums">{run.pass_rate}%</div>
                    <div className="text-xs text-muted-foreground">{run.passed}/{run.total} pass</div>
                  </div>
                </button>

                {isOpen && (
                  <CardContent className="border-t bg-muted/20 p-0">
                    {run.description && (
                      <p className="border-b px-4 py-2 text-xs text-muted-foreground">{run.description}</p>
                    )}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Kode</TableHead>
                            <TableHead className="w-20">Story</TableHead>
                            <TableHead>Test Case</TableHead>
                            <TableHead className="w-28">Metode</TableHead>
                            <TableHead className="w-24">Kategori</TableHead>
                            <TableHead className="w-24 text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cases.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                              Tidak ada case yang cocok.
                            </TableCell></TableRow>
                          ) : cases.map((c) => {
                            const st = CASE_STATUS[c.status]
                            return (
                              <TableRow key={c.id}>
                                <TableCell className="font-mono text-xs">{c.case_code}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{c.user_story ?? '—'}</TableCell>
                                <TableCell>
                                  <div className="text-sm">{c.title}</div>
                                  {c.notes && <div className="mt-0.5 text-xs text-muted-foreground">{c.notes}</div>}
                                </TableCell>
                                <TableCell>
                                  <Badge className={METHOD_CLS[c.method] ?? 'bg-muted'} variant="secondary">{c.method}</Badge>
                                </TableCell>
                                <TableCell className="text-xs capitalize text-muted-foreground">{c.category}</TableCell>
                                <TableCell className="text-right">
                                  <Badge className={st.cls} variant="secondary">
                                    <st.Icon className="mr-1 size-3" />{st.label}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── small components ─────────────────────────────────────────────────────────
function StatCard({ label, value, accent, children }: { label: string; value: string; accent: string; children?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-semibold tabular-nums ${accent}`}>{value}</div>
        {children}
      </CardContent>
    </Card>
  )
}

function RunStatusBadge({ status }: { status: QARun['status'] }) {
  const map = {
    PASS:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    FAIL:    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    PARTIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  }
  return <Badge className={map[status]} variant="secondary">{status}</Badge>
}
