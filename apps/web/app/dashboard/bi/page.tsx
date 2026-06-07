"use client"

import * as React from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
} from "recharts"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  ArrowDownLeftIcon, ArrowUpRightIcon,
  WalletIcon, DownloadIcon, BanknoteIcon, ArrowUpDownIcon, EyeIcon,
  ReceiptTextIcon, FileWarningIcon, SparklesIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  COLORS, fmt, fmtFull, fmtM, deltaPct,
  MONTHS, resolveCurrentWindow, resolveBenchmarkWindow, aggregate,
  scaledInflow, scaledOutflow, buildHeatmap, heatmapCellBreakdown,
  AR_AGING, AP_AGING, arBuckets, apBuckets, arBucketLabel, apBucketLabel,
  type PeriodPreset, type BenchmarkMode, type DateRange,
  type ARRow, type APRow, type InflowStream, type OutflowCategory,
} from "./_lib/data"
import {
  KPICard, AgingBucketCard, ChartCard, Heatmap, DrillDrawer,
} from "./_components/ui-bits"
import { PeriodBar } from "./_components/period-bar"
import { CashflowChart, type CashflowRow } from "./_components/cashflow-chart"

/* ─── drill-down state ─── */
type Drill =
  | { kind: "ar"; row: ARRow }
  | { kind: "ap"; row: APRow }
  | { kind: "inflow"; row: InflowStream }
  | { kind: "outflow"; row: OutflowCategory }
  | { kind: "heat"; category: string; month: string; amount: number }
  | { kind: "arBucket"; label: string; rows: ARRow[] }
  | { kind: "apBucket"; label: string; rows: APRow[] }
  | null

const statusBadge = (days: number) => {
  if (days <= 30) return <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[10px]">Current</Badge>
  if (days <= 60) return <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[10px]">Warning</Badge>
  return <Badge className="bg-red-500/15 text-red-600 border-0 text-[10px]">Overdue</Badge>
}

const KV = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-medium">{v}</span>
  </div>
)

export default function BIDashboardPage() {
  /* ── filters ── */
  const [preset, setPreset] = React.useState<PeriodPreset>("ytd")
  const [customRange, setCustomRange] = React.useState<DateRange>({ from: "2026-01", to: "2026-04" })
  const [benchmark, setBenchmark] = React.useState<BenchmarkMode>("previous")
  const [benchCustom, setBenchCustom] = React.useState<DateRange>({ from: "2025-09", to: "2025-12" })
  const [loading, setLoading] = React.useState(false)
  const [drill, setDrill] = React.useState<Drill>(null)

  // brief skeleton flash on filter change for a responsive feel
  React.useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 320)
    return () => clearTimeout(t)
  }, [preset, benchmark, customRange, benchCustom])

  const handleExport = React.useCallback(() => toast.success("Report exported! (mock)"), [])

  /* ── resolve periods ── */
  const toRange = (r: DateRange): DateRange => ({ from: `${r.from}-01`, to: `${r.to}-28` })
  const current = React.useMemo(
    () => resolveCurrentWindow(preset, toRange(customRange)),
    [preset, customRange],
  )
  const benchWindow = React.useMemo(
    () => resolveBenchmarkWindow(benchmark, current, toRange(benchCustom)),
    [benchmark, current, benchCustom],
  )

  const agg = React.useMemo(() => aggregate(current), [current])
  const benchAgg = React.useMemo(() => (benchWindow ? aggregate(benchWindow) : null), [benchWindow])
  const hasBench = !!benchAgg

  /* ── trailing sparkline series (last ≤6 months up to window end) ── */
  const trailing = React.useMemo(() => {
    const lastKey = current[current.length - 1]!.key
    const idx = MONTHS.findIndex((m) => m.key === lastKey)
    return MONTHS.slice(Math.max(0, idx - 5), idx + 1)
  }, [current])

  /* ── derived datasets ── */
  const inflowData = React.useMemo(() => scaledInflow(agg.inflow), [agg.inflow])
  const outflowData = React.useMemo(() => scaledOutflow(agg.outflow), [agg.outflow])
  const heatmap = React.useMemo(() => buildHeatmap(current), [current])
  const arB = React.useMemo(() => arBuckets(), [])
  const apB = React.useMemo(() => apBuckets(), [])

  const cashflowData: CashflowRow[] = React.useMemo(
    () =>
      current.map((m, i) => ({
        label: m.year === 2026 ? m.short : `${m.short} '${String(m.year).slice(2)}`,
        inflow: m.inflow,
        outflow: m.outflow,
        balance: m.balance,
        benchBalance: benchWindow?.[i]?.balance,
      })),
    [current, benchWindow],
  )

  const dlt = (cur: number, base?: number | null) =>
    hasBench && base != null ? deltaPct(cur, base) : null

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-20 border-b bg-card/70 backdrop-blur-xl px-4 py-3 lg:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-2.5 ring-1 ring-primary/10">
              <WalletIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Executive Financial Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                PT. Wira Inovasi Teknologi Indonesia — {current[0]!.long} → {agg.asOf}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PeriodBar
              preset={preset} onPreset={setPreset}
              customRange={customRange} onCustomRange={setCustomRange}
              benchmark={benchmark} onBenchmark={setBenchmark}
              benchCustom={benchCustom} onBenchCustom={setBenchCustom}
            />
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs">
              <DownloadIcon className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main className="mx-auto max-w-[1600px] space-y-6 p-4 lg:p-6">

        {/* SECTION 1 — CASH & BANKS KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPICard
            loading={loading}
            label="Ending Balance" value={fmt(agg.endingBalance)} sub="Cash & Banks"
            icon={<BanknoteIcon className="h-4 w-4" />} accent="blue"
            deltaPct={dlt(agg.endingBalance, benchAgg?.endingBalance)}
            spark={trailing.map((m) => m.balance)} sparkColor={COLORS.blue[0]}
          />
          <KPICard
            loading={loading}
            label="Cash Inflow" value={fmt(agg.inflow)} sub="Total Credit"
            icon={<ArrowDownLeftIcon className="h-4 w-4" />} accent="emerald"
            deltaPct={dlt(agg.inflow, benchAgg?.inflow)}
            spark={trailing.map((m) => m.inflow)} sparkColor={COLORS.emerald[0]}
          />
          <KPICard
            loading={loading}
            label="Cash Outflow" value={fmt(agg.outflow)} sub="Total Debit"
            icon={<ArrowUpRightIcon className="h-4 w-4" />} accent="red"
            deltaPct={dlt(agg.outflow, benchAgg?.outflow)}
            spark={trailing.map((m) => m.outflow)} sparkColor={COLORS.red[0]}
          />
          <KPICard
            loading={loading}
            label="Net Cash Flow" value={fmt(agg.net)} sub="Inflow − Outflow"
            icon={<ArrowUpDownIcon className="h-4 w-4" />} accent={agg.net >= 0 ? "emerald" : "amber"}
            deltaPct={dlt(agg.net, benchAgg?.net)}
            spark={trailing.map((m) => m.inflow - m.outflow)} sparkColor={COLORS.amber[0]}
          />
        </div>

        {/* SECTION 2 — CASHFLOW STATEMENT */}
        <ChartCard
          title="Cashflow Statement"
          subtitle="Monthly ending balance, inflow & outflow (in IDR)"
          height={360}
          badge={hasBench ? <Badge variant="outline" className="text-[10px]">vs benchmark</Badge> : undefined}
        >
          <CashflowChart data={cashflowData} hasBenchmark={hasBench} />
        </ChartCard>

        {/* SECTION 3 — A/R AGING KPI CARDS */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ReceiptTextIcon className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold">A/R Aging</h2>
              <span className="text-xs text-muted-foreground">Piutang usaha per umur — as of {agg.asOf}</span>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">{fmtFull(arB.total)}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <AgingBucketCard label="Total Piutang" value={fmt(arB.total)} tone="total"
              onClick={() => setDrill({ kind: "arBucket", label: "Semua piutang", rows: AR_AGING })} />
            <AgingBucketCard label="Current" value={fmt(arB.current)} tone="current" share={arB.current / arB.total}
              onClick={() => setDrill({ kind: "arBucket", label: "Current", rows: AR_AGING.filter((r) => r.age <= 0) })} />
            <AgingBucketCard label="1–30 hari" value={fmt(arB.d1_30)} tone="low" share={arB.d1_30 / arB.total}
              onClick={() => setDrill({ kind: "arBucket", label: "1–30 hari", rows: AR_AGING.filter((r) => r.age > 0 && r.age <= 30) })} />
            <AgingBucketCard label="31–60 hari" value={fmt(arB.d31_60)} tone="mid" share={arB.d31_60 / arB.total}
              onClick={() => setDrill({ kind: "arBucket", label: "31–60 hari", rows: AR_AGING.filter((r) => r.age > 30 && r.age <= 60) })} />
            <AgingBucketCard label="61–90 hari" value={fmt(arB.d61_90)} tone="high" share={arB.d61_90 / arB.total}
              onClick={() => setDrill({ kind: "arBucket", label: "61–90 hari", rows: AR_AGING.filter((r) => r.age > 60 && r.age <= 90) })} />
            <AgingBucketCard label="91–180 hari" value={fmt(arB.d91_180)} tone="high" share={arB.d91_180 / arB.total}
              onClick={() => setDrill({ kind: "arBucket", label: "91–180 hari", rows: AR_AGING.filter((r) => r.age > 90 && r.age <= 180) })} />
            <AgingBucketCard label=">180 hari" value={fmt(arB.over180)} tone="high" share={arB.over180 / arB.total}
              onClick={() => setDrill({ kind: "arBucket", label: ">180 hari", rows: AR_AGING.filter((r) => r.age > 180) })} />
          </div>
        </section>

        {/* SECTION 4 — A/P AGING KPI CARDS */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileWarningIcon className="h-4 w-4 text-red-500" />
              <h2 className="text-sm font-semibold">A/P Aging</h2>
              <span className="text-xs text-muted-foreground">Hutang usaha per umur — as of {agg.asOf}</span>
            </div>
            <Badge className="bg-red-500/10 text-red-600 border-0 text-[10px]">{fmtFull(apB.total)}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <AgingBucketCard label="Total Hutang" value={fmt(apB.total)} tone="total"
              onClick={() => setDrill({ kind: "apBucket", label: "Semua hutang", rows: AP_AGING })} />
            <AgingBucketCard label="Current" value={fmt(apB.current)} tone="current" share={apB.current / apB.total}
              onClick={() => setDrill({ kind: "apBucket", label: "Current", rows: AP_AGING.filter((r) => r.age <= 0) })} />
            <AgingBucketCard label="1–30 hari" value={fmt(apB.d1_30)} tone="low" share={apB.d1_30 / apB.total}
              onClick={() => setDrill({ kind: "apBucket", label: "1–30 hari", rows: AP_AGING.filter((r) => r.age > 0 && r.age <= 30) })} />
            <AgingBucketCard label="31–60 hari" value={fmt(apB.d31_60)} tone="mid" share={apB.d31_60 / apB.total}
              onClick={() => setDrill({ kind: "apBucket", label: "31–60 hari", rows: AP_AGING.filter((r) => r.age > 30 && r.age <= 60) })} />
            <AgingBucketCard label="61–90 hari" value={fmt(apB.d61_90)} tone="high" share={apB.d61_90 / apB.total}
              onClick={() => setDrill({ kind: "apBucket", label: "61–90 hari", rows: AP_AGING.filter((r) => r.age > 60 && r.age <= 90) })} />
            <AgingBucketCard label=">90 hari" value={fmt(apB.over90)} tone="high" share={apB.over90 / apB.total}
              onClick={() => setDrill({ kind: "apBucket", label: ">90 hari", rows: AP_AGING.filter((r) => r.age > 90) })} />
          </div>
        </section>

        {/* SECTION 5 — SALES ACHIEVEMENT + CASH INFLOW */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ChartCard title="Sales Achievement" subtitle="Total inflow by period" height={260} className="flex flex-col">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-4xl font-bold text-emerald-500">{fmt(agg.inflow)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Total Cash Inflow — {current[0]!.long} → {agg.asOf}</p>
              {hasBench && benchAgg && (
                <Badge variant="outline" className={`mt-2 text-[10px] ${agg.inflow >= benchAgg.inflow ? "text-emerald-600 border-emerald-500/30" : "text-red-600 border-red-500/30"}`}>
                  {agg.inflow >= benchAgg.inflow ? "▲" : "▼"} vs benchmark {fmt(benchAgg.inflow)}
                </Badge>
              )}
              <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2">
                {current.slice(-6).map((m) => (
                  <div key={m.key} className="text-center">
                    <p className="text-sm font-semibold tabular-nums">{fmt(m.inflow)}</p>
                    <p className="text-[10px] text-muted-foreground">{m.short} {m.year !== 2026 ? `'${String(m.year).slice(2)}` : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          <ChartCard
            title="Cash Inflow" subtitle="Top revenue streams by amount" height={320} className="lg:col-span-2"
            right={<Badge variant="outline" className="text-[10px]">{inflowData.length} streams</Badge>}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inflowData.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 28, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                <XAxis type="number" tickFormatter={fmtM} fontSize={10} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                <YAxis type="category" dataKey="stream" width={95} tick={{ fontSize: 9 }} tickLine={false} axisLine={false}
                  tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 20) + "…" : v)} className="fill-muted-foreground" />
                <RechartsTooltip
                  cursor={{ fill: "currentColor", opacity: 0.05 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const d = payload[0].payload as InflowStream
                    return (
                      <div className="max-w-xs space-y-1 rounded-lg border bg-card/95 backdrop-blur p-3 text-xs shadow-lg">
                        <p className="text-sm font-bold">{d.stream}</p>
                        <p>Amount: <span className="font-medium text-emerald-500">{fmt(d.amount)}</span></p>
                        <p>Share: <span className="font-medium">{d.percentage.toFixed(2)}%</span></p>
                        <p className="text-[10px] text-muted-foreground">klik untuk detail</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]} fill={COLORS.emerald[0]} fillOpacity={0.85}
                  className="cursor-pointer" onClick={(d: any) => setDrill({ kind: "inflow", row: d.payload ?? d })} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* SECTION 6 — CASH OUTFLOW + A/R AGING REPORT */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard
            title="Cash Outflow" subtitle="Top 15 expense categories (of 56 total)" height={440}
            right={<Badge variant="outline" className="text-[10px]">Top 15</Badge>}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outflowData} layout="vertical" margin={{ top: 5, right: 28, left: 120, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                <XAxis type="number" tickFormatter={fmtM} fontSize={10} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                <YAxis type="category" dataKey="category" width={115} tick={{ fontSize: 9 }} tickLine={false} axisLine={false}
                  tickFormatter={(v: string) => (v.length > 26 ? v.slice(0, 24) + "…" : v)} className="fill-muted-foreground" />
                <RechartsTooltip
                  cursor={{ fill: "currentColor", opacity: 0.05 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const d = payload[0].payload as OutflowCategory
                    return (
                      <div className="max-w-xs space-y-1 rounded-lg border bg-card/95 backdrop-blur p-3 text-xs shadow-lg">
                        <p className="text-sm font-bold">{d.category}</p>
                        <p>Amount: <span className="font-medium text-red-500">{fmt(d.amount)}</span></p>
                        <p className="text-[10px] text-muted-foreground">klik untuk detail</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]} className="cursor-pointer"
                  onClick={(d: any) => setDrill({ kind: "outflow", row: d.payload ?? d })}>
                  {outflowData.map((_, i) => (
                    <Cell key={i} fill={COLORS.red[0]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="A/R Aging Report" subtitle="Outstanding invoices by client & age" height={440}
            badge={<Badge className="bg-red-500/15 text-red-500 border-0 text-[10px]">{fmtFull(arB.total)} total</Badge>}
          >
            <div className="h-full overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-muted-foreground">
                    <th className="px-2 py-2 text-left font-medium">Company</th>
                    <th className="px-2 py-2 text-left font-medium">Age</th>
                    <th className="px-2 py-2 text-right font-medium">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {AR_AGING.map((row, i) => (
                    <tr key={i} className="cursor-pointer border-b border-muted/30 transition hover:bg-muted/40"
                      onClick={() => setDrill({ kind: "ar", row })}>
                      <td className="px-2 py-2">
                        <p className="max-w-[140px] truncate font-medium">{row.company}</p>
                        <p className="max-w-[140px] truncate text-muted-foreground">{row.project}</p>
                      </td>
                      <td className="px-2 py-2">{statusBadge(row.age)}</td>
                      <td className="px-2 py-2 text-right font-medium text-red-500">{fmtFull(row.nominal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>

        {/* SECTION 7 — A/P AGING REPORT (mirror of A/R, vendor PoV) */}
        <ChartCard
          title="A/P Aging Report" subtitle="Outstanding vendor bills by vendor & age" height={340}
          badge={<Badge className="bg-amber-500/15 text-amber-600 border-0 text-[10px]">{fmtFull(apB.total)} total</Badge>}
        >
          <div className="h-full overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-muted-foreground">
                  <th className="px-2 py-2 text-left font-medium">Vendor</th>
                  <th className="px-2 py-2 text-left font-medium">Bill</th>
                  <th className="px-2 py-2 text-left font-medium">Due Date</th>
                  <th className="px-2 py-2 text-left font-medium">Age</th>
                  <th className="px-2 py-2 text-right font-medium">Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {AP_AGING.map((row, i) => (
                  <tr key={i} className="cursor-pointer border-b border-muted/30 transition hover:bg-muted/40"
                    onClick={() => setDrill({ kind: "ap", row })}>
                    <td className="px-2 py-2 font-medium">{row.vendor}</td>
                    <td className="px-2 py-2 text-muted-foreground">{row.bill}</td>
                    <td className="px-2 py-2 text-muted-foreground">{row.due_date}</td>
                    <td className="px-2 py-2">{statusBadge(row.age)}</td>
                    <td className="px-2 py-2 text-right font-medium text-amber-600">{fmtFull(row.outstanding)}</td>
                  </tr>
                ))}
                <tr className="bg-muted/40 font-semibold">
                  <td className="px-2 py-2" colSpan={4}>GRAND TOTAL</td>
                  <td className="px-2 py-2 text-right">{fmtFull(apB.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ChartCard>

        {/* SECTION 8 — SALES HEATMAP (matrix) */}
        <ChartCard
          title="Sales Heatmap" subtitle="Monthly revenue by project category — warna = intensitas nominal"
          badge={<Badge className="bg-emerald-500/15 text-emerald-500 border-0 text-[10px]">{current[0]!.short}–{agg.asOf.split(" ")[0]}</Badge>}
        >
          <Heatmap
            months={heatmap.months}
            rows={heatmap.rows}
            onCell={(category, month, amount) => setDrill({ kind: "heat", category, month, amount })}
          />
        </ChartCard>

        {/* AI INSIGHT */}
        <div className="mb-8 rounded-xl border bg-gradient-to-br from-card to-muted/30 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <SparklesIcon className="h-4 w-4 text-primary" /> AI-Generated Insight
          </h3>
          <div className="grid grid-cols-1 gap-4 text-xs text-muted-foreground md:grid-cols-2">
            <div>
              <p className="mb-1 font-medium text-foreground">⚠️ A/R Aging Alert</p>
              <p>Eksposur jatuh tempo &gt;90 hari sebesar {fmt(arB.d91_180 + arB.over180)} ({fmtFull(arB.over180)} di antaranya &gt;180 hari). Disarankan follow-up penagihan segera.</p>
            </div>
            <div>
              <p className="mb-1 font-medium text-foreground">📊 Cash Flow Outlook</p>
              <p>Net cash flow periode ini {agg.net >= 0 ? "positif" : "negatif"} sebesar {fmt(Math.abs(agg.net))}{hasBench && benchAgg ? ` (${agg.net >= benchAgg.net ? "membaik" : "menurun"} vs benchmark)` : ""}. Ending balance {fmt(agg.endingBalance)}.</p>
            </div>
          </div>
        </div>
      </main>

      {/* ── DRILL-DOWN DRAWER ── */}
      <DrillDrawer
        open={!!drill}
        onOpenChange={(v) => !v && setDrill(null)}
        title={<><EyeIcon className="h-4 w-4 text-primary" /> {drillTitle(drill)}</>}
        description={drillDesc(drill)}
      >
        {renderDrill(drill)}
      </DrillDrawer>
    </div>
  )
}

/* ═══════════════ DRILL-DOWN CONTENT ═══════════════ */
function drillTitle(d: Drill): string {
  if (!d) return ""
  switch (d.kind) {
    case "ar": return "A/R Invoice Detail"
    case "ap": return "A/P Bill Detail"
    case "inflow": return "Revenue Stream Detail"
    case "outflow": return "Expense Category Detail"
    case "heat": return "Sales Detail"
    case "arBucket": return `A/R — ${d.label}`
    case "apBucket": return `A/P — ${d.label}`
  }
}
function drillDesc(d: Drill): string | undefined {
  if (!d) return undefined
  switch (d.kind) {
    case "ar": return `${d.row.company} — ${d.row.project}`
    case "ap": return `${d.row.vendor} — ${d.row.bill}`
    case "inflow": return d.row.stream
    case "outflow": return d.row.category
    case "heat": return `${d.category} · ${d.month}`
    case "arBucket": return `${d.rows.length} invoice`
    case "apBucket": return `${d.rows.length} bill`
  }
}
function renderDrill(d: Drill): React.ReactNode {
  if (!d) return null

  if (d.kind === "ar") {
    return (
      <div className="space-y-2.5">
        <KV k="Nominal" v={<span className="font-semibold text-red-500">{fmtFull(d.row.nominal)}</span>} />
        <KV k="Invoice Date" v={d.row.invoice_date} />
        <KV k="Umur" v={`${d.row.age} hari`} />
        <KV k="Bucket" v={arBucketLabel(d.row.age)} />
        <KV k="Status" v={statusBadge(d.row.age)} />
      </div>
    )
  }
  if (d.kind === "ap") {
    return (
      <div className="space-y-2.5">
        <KV k="Outstanding" v={<span className="font-semibold text-amber-600">{fmtFull(d.row.outstanding)}</span>} />
        <KV k="Bill Date" v={d.row.bill_date} />
        <KV k="Due Date" v={d.row.due_date} />
        <KV k="Umur" v={`${d.row.age} hari`} />
        <KV k="Bucket" v={apBucketLabel(d.row.age)} />
        <KV k="Status" v={statusBadge(d.row.age)} />
      </div>
    )
  }
  if (d.kind === "inflow") {
    return (
      <div className="space-y-2.5">
        <KV k="Amount" v={<span className="font-semibold text-emerald-500">{fmtFull(d.row.amount)}</span>} />
        <KV k="Share of total" v={`${d.row.percentage.toFixed(2)}%`} />
        <p className="pt-2 text-[11px] text-muted-foreground">Estimasi kontribusi bulanan (mock split):</p>
        <div className="space-y-1.5">
          {[0.22, 0.26, 0.24, 0.28].map((p, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{["Jan", "Feb", "Mar", "Apr"][i]}</span>
              <span className="font-medium tabular-nums">{fmt(d.row.amount * p)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (d.kind === "outflow") {
    return (
      <div className="space-y-2.5">
        <KV k="Amount" v={<span className="font-semibold text-red-500">{fmtFull(d.row.amount)}</span>} />
        <KV k="Trend" v={d.row.trend === "up" ? "Increasing ▲" : d.row.trend === "down" ? "Decreasing ▼" : "Stable —"} />
        <p className="pt-2 text-[11px] text-muted-foreground">Estimasi kontribusi bulanan (mock split):</p>
        <div className="space-y-1.5">
          {[0.24, 0.25, 0.26, 0.25].map((p, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{["Jan", "Feb", "Mar", "Apr"][i]}</span>
              <span className="font-medium tabular-nums">{fmt(d.row.amount * p)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (d.kind === "heat") {
    const parts = heatmapCellBreakdown(d.category, d.amount)
    return (
      <div className="space-y-2.5">
        <KV k="Revenue" v={<span className="font-semibold text-emerald-500">{fmtFull(d.amount)}</span>} />
        <p className="pt-2 text-[11px] text-muted-foreground">Breakdown sub-kategori:</p>
        <div className="space-y-1.5">
          {parts.map((p) => (
            <div key={p.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{p.label}</span>
              <span className="font-medium tabular-nums">{fmtFull(p.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (d.kind === "arBucket") {
    const total = d.rows.reduce((s, r) => s + r.nominal, 0)
    return (
      <div className="space-y-2">
        <KV k="Total bucket" v={<span className="font-semibold text-red-500">{fmtFull(total)}</span>} />
        <div className="divide-y">
          {d.rows.map((r, i) => (
            <div key={i} className="flex items-start justify-between gap-2 py-2 text-xs">
              <div>
                <p className="font-medium">{r.company}</p>
                <p className="text-muted-foreground">{r.project}</p>
                <p className="text-[10px] text-muted-foreground">{r.invoice_date} · {r.age} hari</p>
              </div>
              <span className="font-medium text-red-500 tabular-nums">{fmtFull(r.nominal)}</span>
            </div>
          ))}
          {d.rows.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Tidak ada data.</p>}
        </div>
      </div>
    )
  }
  if (d.kind === "apBucket") {
    const total = d.rows.reduce((s, r) => s + r.outstanding, 0)
    return (
      <div className="space-y-2">
        <KV k="Total bucket" v={<span className="font-semibold text-amber-600">{fmtFull(total)}</span>} />
        <div className="divide-y">
          {d.rows.map((r, i) => (
            <div key={i} className="flex items-start justify-between gap-2 py-2 text-xs">
              <div>
                <p className="font-medium">{r.vendor}</p>
                <p className="text-muted-foreground">{r.bill} · due {r.due_date}</p>
                <p className="text-[10px] text-muted-foreground">{r.age} hari</p>
              </div>
              <span className="font-medium text-amber-600 tabular-nums">{fmtFull(r.outstanding)}</span>
            </div>
          ))}
          {d.rows.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Tidak ada data.</p>}
        </div>
      </div>
    )
  }
  return null
}
