'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  TrendingUpIcon,
  ScaleIcon,
  Waves,
  BarChart3,
  TableIcon,
  BookOpenCheckIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  RefreshCwIcon,
  PrinterIcon,
  DownloadIcon,
  FilterIcon,
  BuildingIcon,
  CalendarIcon,
  ChevronsUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from 'lucide-react'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { toast } from 'sonner'
import { cn } from '@workspace/ui/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const REPORT_TYPES = [
  {
    tier: 'Tier 1 — Utama',
    items: [
      { id: 'IS', label: 'Laba Rugi', subLabel: 'Income Statement', icon: TrendingUpIcon, color: 'text-emerald-500' },
      { id: 'BS', label: 'Neraca', subLabel: 'Balance Sheet', icon: ScaleIcon, color: 'text-blue-500' },
      { id: 'CF', label: 'Arus Kas', subLabel: 'Cash Flow', icon: Waves, color: 'text-cyan-500' },
      { id: 'EQ', label: 'Perubahan Ekuitas', subLabel: 'Equity Changes', icon: BarChart3, color: 'text-purple-500' },
    ],
  },
  {
    tier: 'Tier 2 — Detail',
    items: [
      { id: 'TB', label: 'Neraca Saldo', subLabel: 'Trial Balance', icon: TableIcon, color: 'text-amber-500' },
      { id: 'BB', label: 'Saldo Awal', subLabel: 'Beginning Balance', icon: BookOpenCheckIcon, color: 'text-rose-500' },
    ],
  },
] as const

type ReportId = 'IS' | 'BS' | 'CF' | 'EQ' | 'TB' | 'BB'

const COA_LAYER_BADGE: Record<string, { label: string; className: string }> = {
  category:      { label: 'CAT',  className: 'bg-slate-700 text-slate-100 border-slate-600' },
  type:          { label: 'TYPE', className: 'bg-blue-900 text-blue-100 border-blue-700' },
  sub_account:   { label: 'SUB',  className: 'bg-purple-900 text-purple-100 border-purple-700' },
  general_ledger:{ label: 'GL',   className: 'bg-emerald-900 text-emerald-100 border-emerald-700' },
  detail_ledger: { label: 'DET',  className: 'bg-orange-900 text-orange-100 border-orange-700' },
}

const LKC_COLOR: Record<string, string> = {
  ASSET:         'text-blue-400',
  LIABILITY:     'text-red-400',
  EQUITY:        'text-purple-400',
  REVENUE:       'text-emerald-400',
  COGS:          'text-orange-400',
  OPEX:          'text-amber-400',
  OTHER_INCOME:  'text-cyan-400',
  OTHER_EXPENSE: 'text-rose-400',
  TAX_EXPENSE:   'text-pink-400',
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ReportLine {
  id: string
  account_code: string
  account_name: string
  coa_layer: string | null
  level: number
  enum_laporan_keuangan_category: string | null
  enum_cf_section: string | null
  enum_cost_category: string | null
  is_non_cash_item: boolean
  is_working_capital: boolean
  is_computed: boolean
  children: ReportLine[]
  amount: number
  amount_base: number
  opening_balance: number
  benchmark_amount: number
  budget_amount: number
  variance: number
  variance_pct: number
}

interface Period {
  id: string
  name: string
  start_date: string
  end_date: string
  approval_status: string
  fiscal_year: number
  period_number: number
}

interface CcValue {
  id: string
  kode: string
  nama: string
  level_number: number
  parent_value_id: string | null
}

interface ReportResult {
  period: Period
  benchmark_period?: Period
  lines: ReportLine[]
  summary: Record<string, number>
  generated_at: string
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtIDR(v: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(v))
}

function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT LINE ROW (recursive)
// ─────────────────────────────────────────────────────────────────────────────

interface LineRowProps {
  line: ReportLine
  showBenchmark: boolean
  depth?: number
  defaultExpanded?: boolean
}

function LineRow({ line, showBenchmark, depth = 0, defaultExpanded = true }: LineRowProps) {
  const [expanded, setExpanded] = useState(defaultExpanded || depth < 2)
  const hasChildren = line.children.length > 0
  const isZero = line.amount === 0 && line.benchmark_amount === 0

  const layerBadge = line.coa_layer ? COA_LAYER_BADGE[line.coa_layer] : null
  const lkcColor = line.enum_laporan_keuangan_category
    ? LKC_COLOR[line.enum_laporan_keuangan_category] ?? ''
    : ''

  const isNegative = line.amount < 0
  const varPositive = line.variance >= 0

  return (
    <>
      <tr
        className={cn(
          'group border-b border-border/40 hover:bg-muted/30 transition-colors',
          line.is_computed && 'bg-muted/50 font-semibold',
          isZero && !line.is_computed && 'opacity-40',
          depth === 0 && !line.is_computed && 'bg-background',
        )}
      >
        {/* Account name + code */}
        <td className="py-2 pr-2" style={{ paddingLeft: `${16 + depth * 20}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? (
                  <ChevronDownIcon className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <span className="w-3.5 flex-shrink-0" />
            )}

            <div className="flex items-center gap-1.5 min-w-0">
              {layerBadge && (
                <Badge
                  variant="outline"
                  className={cn('text-[10px] px-1 py-0 font-mono leading-4 flex-shrink-0', layerBadge.className)}
                >
                  {layerBadge.label}
                </Badge>
              )}
              <span
                className={cn(
                  'text-sm truncate',
                  line.is_computed ? 'font-bold uppercase tracking-wide text-xs' : '',
                  lkcColor && depth === 0 ? lkcColor : '',
                  depth === 0 && !line.is_computed ? 'font-medium' : '',
                )}
              >
                {line.account_name}
              </span>
            </div>
          </div>
        </td>

        {/* Account code */}
        <td className="py-2 px-2 text-xs text-muted-foreground font-mono whitespace-nowrap">
          {line.account_code || '—'}
        </td>

        {/* Amount */}
        <td className={cn(
          'py-2 px-3 text-right text-sm font-mono whitespace-nowrap',
          isNegative ? 'text-red-400' : '',
          line.is_computed ? 'font-bold' : '',
        )}>
          {isNegative && <span className="text-red-400 mr-0.5">(</span>}
          {fmtIDR(line.amount)}
          {isNegative && <span className="text-red-400">)</span>}
        </td>

        {/* Benchmark + Variance */}
        {showBenchmark && (
          <>
            <td className="py-2 px-3 text-right text-sm font-mono text-muted-foreground whitespace-nowrap">
              {fmtIDR(line.benchmark_amount)}
            </td>
            <td className={cn(
              'py-2 px-3 text-right text-sm font-mono whitespace-nowrap',
              varPositive ? 'text-emerald-400' : 'text-red-400',
            )}>
              <div className="flex items-center justify-end gap-1">
                {varPositive
                  ? <ArrowUpIcon className="w-3 h-3" />
                  : <ArrowDownIcon className="w-3 h-3" />}
                {fmtPct(line.variance_pct)}
              </div>
            </td>
          </>
        )}

        {/* Opening balance (TB/BB only) */}
        {!showBenchmark && line.opening_balance !== 0 && (
          <td className="py-2 px-3 text-right text-xs font-mono text-muted-foreground whitespace-nowrap">
            {fmtIDR(line.opening_balance)}
          </td>
        )}
      </tr>

      {expanded && hasChildren && line.children.map(child => (
        <LineRow
          key={child.id}
          line={child}
          showBenchmark={showBenchmark}
          depth={depth + 1}
          defaultExpanded={depth < 1}
        />
      ))}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY CARDS
// ─────────────────────────────────────────────────────────────────────────────

function SummaryCards({ result, reportType }: { result: ReportResult; reportType: ReportId }) {
  const s = result.summary

  const cards: Array<{ label: string; value: number; positive?: boolean }> = []

  if (reportType === 'IS') {
    cards.push(
      { label: 'Gross Profit', value: s.gross_profit ?? 0 },
      { label: 'Operating Profit', value: s.operating_profit ?? 0 },
      { label: 'Net Profit', value: s.net_profit ?? 0, positive: (s.net_profit ?? 0) >= 0 },
    )
  } else if (reportType === 'BS') {
    cards.push(
      { label: 'Total Aktiva', value: s.total_assets ?? 0 },
      { label: 'Total Kewajiban + Ekuitas', value: s.total_liab_equity ?? 0 },
      { label: 'Selisih (harus 0)', value: s.balance_check ?? 0, positive: Math.abs(s.balance_check ?? 0) < 1 },
    )
  } else if (reportType === 'CF') {
    cards.push(
      { label: 'Arus Operasional', value: s.operating ?? 0 },
      { label: 'Arus Investasi', value: s.investing ?? 0 },
      { label: 'Net Cash Change', value: s.net_change ?? 0 },
    )
  } else if (reportType === 'TB') {
    cards.push(
      { label: 'Total Debit', value: s.total_debit ?? 0 },
      { label: 'Total Kredit', value: s.total_credit ?? 0 },
    )
  }

  if (cards.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
      {cards.map(card => (
        <Card key={card.label} className="py-3">
          <CardContent className="px-4 py-0">
            <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
            <p className={cn(
              'text-lg font-bold font-mono',
              card.positive === true ? 'text-emerald-400' :
              card.positive === false ? 'text-red-400' : '',
            )}>
              {fmtIDR(card.value)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function LaporanKeuanganPage() {
  const [activeReport, setActiveReport] = useState<ReportId>('IS')
  const [periods, setPeriods] = useState<Period[]>([])
  const [ccValues, setCcValues] = useState<CcValue[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [benchmarkPeriod, setBenchmarkPeriod] = useState<string>('')
  const [selectedCc, setSelectedCc] = useState<string>('')
  const [result, setResult] = useState<ReportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Load periods and cost center values on mount
  useEffect(() => {
    Promise.all([loadPeriods(), loadCostCenters()]).finally(() => setInitialLoading(false))
  }, [])

  // Auto-load when filter changes
  useEffect(() => {
    if (selectedPeriod) {
      loadReport()
    }
  }, [activeReport, selectedPeriod, benchmarkPeriod, selectedCc])

  async function loadPeriods() {
    try {
      const res = await fetch('/api/finance/periods')
      if (!res.ok) return
      const json = await res.json()
      const data: Period[] = json.data ?? json ?? []
      setPeriods(data)
      if (data.length > 0 && !selectedPeriod) {
        setSelectedPeriod(data[0].id)
      }
    } catch {
      toast.error('Gagal memuat daftar periode')
    }
  }

  async function loadCostCenters() {
    try {
      const res = await fetch('/api/finance/cost-centers/values')
      if (!res.ok) return
      const json = await res.json()
      setCcValues(json.data ?? json ?? [])
    } catch {
      // Cost center is optional — silent fail
    }
  }

  const loadReport = useCallback(async () => {
    if (!selectedPeriod) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ type: activeReport, period_id: selectedPeriod })
      if (benchmarkPeriod) params.set('benchmark_period_id', benchmarkPeriod)
      if (selectedCc) params.set('cost_center_value_id', selectedCc)

      const res = await fetch(`/api/finance/laporan-keuangan?${params}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to load report')
      }
      const data: ReportResult = await res.json()
      setResult(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memuat laporan')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [activeReport, selectedPeriod, benchmarkPeriod, selectedCc])

  const showBenchmark = !!benchmarkPeriod && !!result?.benchmark_period

  // Build period label
  const periodLabel = (p: Period) =>
    `${p.name} (FY${p.fiscal_year})`

  // CC values grouped by level
  const ccLevel3 = ccValues.filter(v => v.level_number === 3)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Header bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-16 z-10">
        <div>
          <h1 className="text-lg font-semibold leading-tight">Laporan Keuangan</h1>
          <p className="text-xs text-muted-foreground">Financial Reporting · PSAK Compliant</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadReport}
            disabled={loading || !selectedPeriod}
          >
            <RefreshCwIcon className={cn('w-4 h-4 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            <PrinterIcon className="w-4 h-4 mr-1.5" />
            Print
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Left sidebar: report types ───────────────────────── */}
        <aside className="w-56 flex-shrink-0 border-r border-border bg-sidebar overflow-y-auto py-3 hidden lg:flex flex-col gap-1">
          {REPORT_TYPES.map(group => (
            <div key={group.tier} className="mb-2">
              <p className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {group.tier}
              </p>
              {group.items.map(item => {
                const Icon = item.icon
                const active = activeReport === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveReport(item.id as ReportId)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors rounded-sm mx-1 my-0.5 text-left',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'hover:bg-sidebar-accent/50 text-sidebar-foreground',
                    )}
                  >
                    <Icon className={cn('w-4 h-4 flex-shrink-0', item.color)} />
                    <div className="min-w-0">
                      <div className="truncate leading-tight">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{item.subLabel}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </aside>

        {/* ── Main content ─────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-[5]">
            {/* Period selector */}
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="h-8 text-xs w-[200px]">
                  <SelectValue placeholder="Pilih Periode" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {periodLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Benchmark period */}
            <div className="flex items-center gap-1.5">
              <ChevronsUpDownIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <Select value={benchmarkPeriod} onValueChange={setBenchmarkPeriod}>
                <SelectTrigger className="h-8 text-xs w-[180px]">
                  <SelectValue placeholder="Bandingkan dengan…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" className="text-xs text-muted-foreground">— Tidak ada —</SelectItem>
                  {periods
                    .filter(p => p.id !== selectedPeriod)
                    .map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {periodLabel(p)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cost center filter */}
            {ccLevel3.length > 0 && (
              <div className="flex items-center gap-1.5">
                <BuildingIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <Select value={selectedCc} onValueChange={setSelectedCc}>
                  <SelectTrigger className="h-8 text-xs w-[180px]">
                    <SelectValue placeholder="Semua Divisi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" className="text-xs text-muted-foreground">— Semua Divisi —</SelectItem>
                    {ccLevel3.map(cc => (
                      <SelectItem key={cc.id} value={cc.id} className="text-xs">
                        {cc.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Active filters badges */}
            {selectedCc && (
              <Badge variant="outline" className="text-xs h-6 gap-1">
                <FilterIcon className="w-3 h-3" />
                {ccValues.find(c => c.id === selectedCc)?.nama ?? 'CC Filter'}
                <button
                  onClick={() => setSelectedCc('')}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </Badge>
            )}

            {/* Generated at */}
            {result && (
              <span className="ml-auto text-[10px] text-muted-foreground hidden sm:block">
                {new Date(result.generated_at).toLocaleString('id-ID')}
              </span>
            )}
          </div>

          {/* ── Report content ──────────────────────────────────── */}
          <div className="px-4 py-4">
            {/* Mobile report type selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 lg:hidden">
              {REPORT_TYPES.flatMap(g => g.items).map(item => {
                const Icon = item.icon
                const active = activeReport === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveReport(item.id as ReportId)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    <Icon className={cn('w-3.5 h-3.5', active ? '' : item.color)} />
                    {item.label}
                  </button>
                )
              })}
            </div>

            {/* Period info */}
            {result && (
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-semibold">
                  {REPORT_TYPES.flatMap(g => g.items).find(i => i.id === activeReport)?.label}
                </h2>
                <Badge variant="outline" className="text-xs">
                  {result.period.name}
                </Badge>
                {result.benchmark_period && (
                  <>
                    <span className="text-muted-foreground text-xs">vs</span>
                    <Badge variant="outline" className="text-xs opacity-70">
                      {result.benchmark_period.name}
                    </Badge>
                  </>
                )}
                <Badge
                  className={cn(
                    'text-[10px] ml-auto',
                    result.period.approval_status === 'APPROVED' ? 'bg-emerald-700' :
                    result.period.approval_status === 'LOCKED'   ? 'bg-slate-700' :
                    result.period.approval_status === 'PENDING_APPROVAL' ? 'bg-amber-700' :
                    'bg-muted',
                  )}
                >
                  {result.period.approval_status}
                </Badge>
              </div>
            )}

            {/* Summary cards */}
            {result && !loading && (
              <SummaryCards result={result} reportType={activeReport} />
            )}

            {/* Loading skeleton */}
            {(loading || (initialLoading && !result)) && (
              <div className="space-y-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" style={{ opacity: 1 - i * 0.06 }} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && !initialLoading && !result && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <TableIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Pilih periode untuk menampilkan laporan</p>
              </div>
            )}

            {/* Report table */}
            {result && !loading && result.lines.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="py-2.5 px-4 text-left text-xs font-medium text-muted-foreground">
                          Akun
                        </th>
                        <th className="py-2.5 px-2 text-left text-xs font-medium text-muted-foreground font-mono">
                          Kode
                        </th>
                        <th className="py-2.5 px-3 text-right text-xs font-medium text-muted-foreground">
                          {activeReport === 'TB' ? 'Saldo' : 'Jumlah'}
                        </th>
                        {showBenchmark && (
                          <>
                            <th className="py-2.5 px-3 text-right text-xs font-medium text-muted-foreground">
                              Pembanding
                            </th>
                            <th className="py-2.5 px-3 text-right text-xs font-medium text-muted-foreground">
                              Δ%
                            </th>
                          </>
                        )}
                        {!showBenchmark && activeReport === 'TB' && (
                          <th className="py-2.5 px-3 text-right text-xs font-medium text-muted-foreground">
                            Saldo Awal
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {result.lines.map(line => (
                        <LineRow
                          key={line.id}
                          line={line}
                          showBenchmark={showBenchmark}
                          depth={0}
                          defaultExpanded={true}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty lines */}
            {result && !loading && result.lines.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed border-border">
                <TableIcon className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">Tidak ada data untuk periode ini</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Pastikan jurnal sudah diposting pada periode yang dipilih
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
