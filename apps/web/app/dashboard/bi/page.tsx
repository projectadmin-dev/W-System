"use client"

import * as React from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
} from "recharts"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  ArrowDownLeftIcon, ArrowUpRightIcon, WalletIcon, DownloadIcon,
  BanknoteIcon, ArrowUpDownIcon, EyeIcon, ReceiptTextIcon,
  FileWarningIcon, SparklesIcon, AlertCircleIcon, RefreshCwIcon,
} from "lucide-react"
import { toast } from "sonner"

import { COLORS, fmt, fmtFull, fmtM, fmtPct, deltaPct, type PeriodPreset, type BenchmarkMode, type DateRange } from "./_lib/format"
import {
  fetchBIData, type BIData, type ARRow, type APRow, type InflowStream, type OutflowCategory, type HeatStream,
} from "./_lib/api"
import { exportDashboardXlsx } from "./_lib/export"
import { KPICard, AgingBucketCard, ChartCard, Heatmap, DrillDrawer } from "./_components/ui-bits"
import { PeriodBar } from "./_components/period-bar"
import { CashflowChart } from "./_components/cashflow-chart"

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
const arBucketLabel = (age: number) =>
  age <= 0 ? "Current" : age <= 30 ? "1–30 hari" : age <= 60 ? "31–60 hari"
    : age <= 90 ? "61–90 hari" : age <= 180 ? "91–180 hari" : ">180 hari"
const apBucketLabel = (age: number) =>
  age <= 0 ? "Current" : age <= 30 ? "1–30 hari" : age <= 60 ? "31–60 hari"
    : age <= 90 ? "61–90 hari" : ">90 hari"

const KV = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex justify-between rounded-lg bg-muted/50 px-3 py-2.5 text-sm">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-medium">{v}</span>
  </div>
)

const thisYear = new Date().getFullYear()
const thisMonth = `${thisYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}`

export default function BIDashboardPage() {
  const [preset, setPreset] = React.useState<PeriodPreset>("ytd")
  const [customRange, setCustomRange] = React.useState<DateRange>({ from: `${thisYear}-01`, to: thisMonth })
  const [benchmark, setBenchmark] = React.useState<BenchmarkMode>("previous")
  const [benchCustom, setBenchCustom] = React.useState<DateRange>({ from: `${thisYear - 1}-01`, to: `${thisYear - 1}-12` })

  const [data, setData] = React.useState<BIData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [drill, setDrill] = React.useState<Drill>(null)

  React.useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    fetchBIData({ preset, custom: customRange, benchmark, benchCustom }, ctrl.signal)
      .then((d) => setData(d))
      .catch((e) => { if (e.name !== "AbortError") setError(e.message) })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [preset, customRange, benchmark, benchCustom, reloadKey])

  const handleExport = React.useCallback(() => {
    if (!data) return
    try {
      exportDashboardXlsx(data, preset)
      toast.success("Excel report exported")
    } catch (e: any) {
      toast.error(`Export failed: ${e?.message ?? "unknown error"}`)
    }
  }, [data, preset])

  const kpis = data?.kpis
  const hasBench = !!kpis?.bench
  const dlt = (cur?: number, base?: number | null) =>
    hasBench && cur != null && base != null ? deltaPct(cur, base) : null

  const cashflow = data?.cashflow ?? []
  const arB = data?.arAging.buckets
  const apB = data?.apAging.buckets
  const arRows = data?.arAging.rows ?? []
  const apRows = data?.apAging.rows ?? []

  // monthly revenue per stream (for inflow drill-down) + streams per category (for heatmap drill)
  const streamMonthly = React.useMemo(() => {
    const map = new Map<string, Record<string, number>>()
    data?.heatmap.rows.forEach((r) => r.streams.forEach((s) => map.set(s.stream, s.values)))
    return map
  }, [data])
  const catStreams = React.useMemo(() => {
    const map = new Map<string, HeatStream[]>()
    data?.heatmap.rows.forEach((r) => map.set(r.category, r.streams))
    return map
  }, [data])

  // aging totals vs benchmark
  const arTotalDelta = data?.arAging.bench ? deltaPct(data.arAging.buckets.total, data.arAging.bench.total) : null
  const apTotalDelta = data?.apAging.bench ? deltaPct(data.apAging.buckets.total, data.apAging.bench.total) : null

  /* ── error state ── */
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-xl border bg-card p-6 text-center">
          <AlertCircleIcon className="mx-auto h-8 w-8 text-red-500" />
          <h2 className="mt-3 font-semibold">Gagal memuat dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => setReloadKey((k) => k + 1)}>
            <RefreshCwIcon className="h-3.5 w-3.5" /> Coba lagi
          </Button>
        </div>
      </div>
    )
  }

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
                PT. Wira Inovasi Teknologi Indonesia
                {data ? ` — ${data.meta.current.from} → ${data.meta.current.to}` : ""}
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
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!data || loading} className="gap-1.5 text-xs">
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
            loading={loading} label="Ending Balance" value={fmt(kpis?.endingBalance ?? 0)} sub="Cash & Banks"
            icon={<BanknoteIcon className="h-4 w-4" />} accent="blue"
            deltaPct={dlt(kpis?.endingBalance, kpis?.bench?.endingBalance)}
            spark={cashflow.map((p) => p.balance)} sparkColor={COLORS.blue[0]}
          />
          <KPICard
            loading={loading} label="Cash Inflow" value={fmt(kpis?.inflow ?? 0)} sub="Total Credit"
            icon={<ArrowDownLeftIcon className="h-4 w-4" />} accent="emerald"
            deltaPct={dlt(kpis?.inflow, kpis?.bench?.inflow)}
            spark={cashflow.map((p) => p.inflow)} sparkColor={COLORS.emerald[0]}
          />
          <KPICard
            loading={loading} label="Cash Outflow" value={fmt(kpis?.outflow ?? 0)} sub="Total Debit"
            icon={<ArrowUpRightIcon className="h-4 w-4" />} accent="red"
            deltaPct={dlt(kpis?.outflow, kpis?.bench?.outflow)}
            spark={cashflow.map((p) => p.outflow)} sparkColor={COLORS.red[0]}
          />
          <KPICard
            loading={loading} label="Net Cash Flow" value={fmt(kpis?.net ?? 0)} sub="Inflow − Outflow"
            icon={<ArrowUpDownIcon className="h-4 w-4" />} accent={(kpis?.net ?? 0) >= 0 ? "emerald" : "amber"}
            deltaPct={dlt(kpis?.net, kpis?.bench?.net)}
            spark={cashflow.map((p) => p.inflow - p.outflow)} sparkColor={COLORS.amber[0]}
          />
        </div>

        {/* SECTION 2 — CASHFLOW STATEMENT */}
        <ChartCard
          title="Cashflow Statement" subtitle="Monthly ending balance, inflow & outflow (cash basis, in IDR)"
          height={360}
          badge={hasBench ? <Badge variant="outline" className="text-[10px]">vs benchmark</Badge> : undefined}
        >
          {loading ? <ChartSkeleton /> : <CashflowChart data={cashflow} hasBenchmark={hasBench} />}
        </ChartCard>

        {/* SECTION 3 — A/R AGING KPI CARDS */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ReceiptTextIcon className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold">A/R Aging</h2>
              <span className="text-xs text-muted-foreground">Piutang usaha per umur — as of {data?.meta.asOf ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              {arTotalDelta != null && (
                <Badge variant="outline" className={`text-[10px] ${arTotalDelta <= 0 ? "text-emerald-600 border-emerald-500/30" : "text-red-600 border-red-500/30"}`}>
                  {fmtPct(arTotalDelta)} vs {data?.arAging.benchAsOf}
                </Badge>
              )}
              {arB && <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">{fmtFull(arB.total)}</Badge>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <AgingBucketCard label="Total Piutang" value={fmt(arB?.total ?? 0)} tone="total"
              onClick={() => setDrill({ kind: "arBucket", label: "Semua piutang", rows: arRows })} />
            <AgingBucketCard label="Current" value={fmt(arB?.current ?? 0)} tone="current" share={share(arB?.current, arB?.total)}
              onClick={() => setDrill({ kind: "arBucket", label: "Current", rows: arRows.filter((r) => r.age <= 0) })} />
            <AgingBucketCard label="1–30 hari" value={fmt(arB?.d1_30 ?? 0)} tone="low" share={share(arB?.d1_30, arB?.total)}
              onClick={() => setDrill({ kind: "arBucket", label: "1–30 hari", rows: arRows.filter((r) => r.age > 0 && r.age <= 30) })} />
            <AgingBucketCard label="31–60 hari" value={fmt(arB?.d31_60 ?? 0)} tone="mid" share={share(arB?.d31_60, arB?.total)}
              onClick={() => setDrill({ kind: "arBucket", label: "31–60 hari", rows: arRows.filter((r) => r.age > 30 && r.age <= 60) })} />
            <AgingBucketCard label="61–90 hari" value={fmt(arB?.d61_90 ?? 0)} tone="high" share={share(arB?.d61_90, arB?.total)}
              onClick={() => setDrill({ kind: "arBucket", label: "61–90 hari", rows: arRows.filter((r) => r.age > 60 && r.age <= 90) })} />
            <AgingBucketCard label="91–180 hari" value={fmt(arB?.d91_180 ?? 0)} tone="high" share={share(arB?.d91_180, arB?.total)}
              onClick={() => setDrill({ kind: "arBucket", label: "91–180 hari", rows: arRows.filter((r) => r.age > 90 && r.age <= 180) })} />
            <AgingBucketCard label=">180 hari" value={fmt(arB?.over180 ?? 0)} tone="high" share={share(arB?.over180, arB?.total)}
              onClick={() => setDrill({ kind: "arBucket", label: ">180 hari", rows: arRows.filter((r) => r.age > 180) })} />
          </div>
        </section>

        {/* SECTION 4 — A/P AGING KPI CARDS */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileWarningIcon className="h-4 w-4 text-red-500" />
              <h2 className="text-sm font-semibold">A/P Aging</h2>
              <span className="text-xs text-muted-foreground">Hutang usaha per umur — as of {data?.meta.asOf ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              {apTotalDelta != null && (
                <Badge variant="outline" className={`text-[10px] ${apTotalDelta <= 0 ? "text-emerald-600 border-emerald-500/30" : "text-red-600 border-red-500/30"}`}>
                  {fmtPct(apTotalDelta)} vs {data?.apAging.benchAsOf}
                </Badge>
              )}
              {apB && <Badge className="bg-red-500/10 text-red-600 border-0 text-[10px]">{fmtFull(apB.total)}</Badge>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <AgingBucketCard label="Total Hutang" value={fmt(apB?.total ?? 0)} tone="total"
              onClick={() => setDrill({ kind: "apBucket", label: "Semua hutang", rows: apRows })} />
            <AgingBucketCard label="Current" value={fmt(apB?.current ?? 0)} tone="current" share={share(apB?.current, apB?.total)}
              onClick={() => setDrill({ kind: "apBucket", label: "Current", rows: apRows.filter((r) => r.age <= 0) })} />
            <AgingBucketCard label="1–30 hari" value={fmt(apB?.d1_30 ?? 0)} tone="low" share={share(apB?.d1_30, apB?.total)}
              onClick={() => setDrill({ kind: "apBucket", label: "1–30 hari", rows: apRows.filter((r) => r.age > 0 && r.age <= 30) })} />
            <AgingBucketCard label="31–60 hari" value={fmt(apB?.d31_60 ?? 0)} tone="mid" share={share(apB?.d31_60, apB?.total)}
              onClick={() => setDrill({ kind: "apBucket", label: "31–60 hari", rows: apRows.filter((r) => r.age > 30 && r.age <= 60) })} />
            <AgingBucketCard label="61–90 hari" value={fmt(apB?.d61_90 ?? 0)} tone="high" share={share(apB?.d61_90, apB?.total)}
              onClick={() => setDrill({ kind: "apBucket", label: "61–90 hari", rows: apRows.filter((r) => r.age > 60 && r.age <= 90) })} />
            <AgingBucketCard label=">90 hari" value={fmt(apB?.over90 ?? 0)} tone="high" share={share(apB?.over90, apB?.total)}
              onClick={() => setDrill({ kind: "apBucket", label: ">90 hari", rows: apRows.filter((r) => r.age > 90) })} />
          </div>
        </section>

        {/* SECTION 5 — SALES ACHIEVEMENT + CASH INFLOW */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ChartCard title="Sales Achievement" subtitle="Total revenue by period" height={260} className="flex flex-col">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-4xl font-bold text-emerald-500">{fmt(data?.sales.total ?? 0)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Total Revenue — {data ? `${data.meta.current.from} → ${data.meta.current.to}` : "—"}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2">
                {(data?.sales.months ?? []).slice(-6).map((m) => (
                  <div key={m.key} className="text-center">
                    <p className="text-sm font-semibold tabular-nums">{fmt(m.amount)}</p>
                    <p className="text-[10px] text-muted-foreground">{m.short}</p>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          <ChartCard
            title="Cash Inflow" subtitle="Top revenue streams by amount" height={320} className="lg:col-span-2"
            right={data ? <Badge variant="outline" className="text-[10px]">{data.inflowStreams.length} streams</Badge> : undefined}
          >
            {loading ? <ChartSkeleton /> : (data?.inflowStreams.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.inflowStreams.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 28, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" tickFormatter={fmtM} fontSize={10} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                  <YAxis type="category" dataKey="stream" width={95} tick={{ fontSize: 9 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 20) + "…" : v)} className="fill-muted-foreground" />
                  <RechartsTooltip cursor={{ fill: "currentColor", opacity: 0.05 }}
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
                    }} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]} fill={COLORS.emerald[0]} fillOpacity={0.85}
                    className="cursor-pointer" onClick={(d: any) => setDrill({ kind: "inflow", row: d.payload ?? d })} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState label="Belum ada data pendapatan pada periode ini" />)}
          </ChartCard>
        </div>

        {/* SECTION 6 — CASH OUTFLOW + A/R AGING REPORT */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard
            title="Cash Outflow" subtitle="Top expense categories" height={440}
            right={data ? <Badge variant="outline" className="text-[10px]">Top {data.outflowCategories.length}</Badge> : undefined}
          >
            {loading ? <ChartSkeleton /> : (data?.outflowCategories.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.outflowCategories} layout="vertical" margin={{ top: 5, right: 28, left: 120, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" tickFormatter={fmtM} fontSize={10} tickLine={false} axisLine={false} className="fill-muted-foreground" />
                  <YAxis type="category" dataKey="category" width={115} tick={{ fontSize: 9 }} tickLine={false} axisLine={false}
                    tickFormatter={(v: string) => (v.length > 26 ? v.slice(0, 24) + "…" : v)} className="fill-muted-foreground" />
                  <RechartsTooltip cursor={{ fill: "currentColor", opacity: 0.05 }}
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
                    }} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]} className="cursor-pointer"
                    onClick={(d: any) => setDrill({ kind: "outflow", row: d.payload ?? d })}>
                    {data.outflowCategories.map((_, i) => <Cell key={i} fill={COLORS.red[0]} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState label="Belum ada data biaya pada periode ini" />)}
          </ChartCard>

          <ChartCard
            title="A/R Aging Report" subtitle="Outstanding invoices by client & age" height={440}
            badge={arB ? <Badge className="bg-red-500/15 text-red-500 border-0 text-[10px]">{fmtFull(arB.total)} total</Badge> : undefined}
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
                  {arRows.map((row, i) => (
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
                  {!arRows.length && <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">{loading ? "Memuat…" : "Tidak ada piutang outstanding"}</td></tr>}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>

        {/* SECTION 7 — A/P AGING REPORT */}
        <ChartCard
          title="A/P Aging Report" subtitle="Outstanding vendor bills by vendor & age" height={340}
          badge={apB ? <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[10px]">{fmtFull(apB.total)} total</Badge> : undefined}
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
                {apRows.map((row, i) => (
                  <tr key={i} className="cursor-pointer border-b border-muted/30 transition hover:bg-muted/40"
                    onClick={() => setDrill({ kind: "ap", row })}>
                    <td className="px-2 py-2 font-medium">{row.vendor}</td>
                    <td className="px-2 py-2 text-muted-foreground">{row.bill}</td>
                    <td className="px-2 py-2 text-muted-foreground">{row.due_date ?? "—"}</td>
                    <td className="px-2 py-2">{statusBadge(row.age)}</td>
                    <td className="px-2 py-2 text-right font-medium text-amber-600">{fmtFull(row.outstanding)}</td>
                  </tr>
                ))}
                {!apRows.length && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">{loading ? "Memuat…" : "Tidak ada hutang outstanding"}</td></tr>}
                {!!apRows.length && apB && (
                  <tr className="bg-muted/40 font-semibold">
                    <td className="px-2 py-2" colSpan={4}>GRAND TOTAL</td>
                    <td className="px-2 py-2 text-right">{fmtFull(apB.total)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>

        {/* SECTION 8 — SALES HEATMAP */}
        <ChartCard
          title="Sales Heatmap" subtitle="Monthly revenue by business line — warna = intensitas nominal (klik sel untuk rincian stream)"
          badge={data ? <Badge className="bg-emerald-500/15 text-emerald-500 border-0 text-[10px]">{data.meta.current.from.split(" ")[0]}–{data.meta.current.to.split(" ")[0]}</Badge> : undefined}
        >
          {loading ? <ChartSkeleton /> : (data?.heatmap.rows.length ? (
            <Heatmap months={data.heatmap.months} rows={data.heatmap.rows}
              onCell={(category, month, amount) => setDrill({ kind: "heat", category, month, amount })} />
          ) : <EmptyState label="Belum ada data pendapatan untuk heatmap" />)}
        </ChartCard>

        {/* AI INSIGHT */}
        {data && arB && (
          <div className="mb-8 rounded-xl border bg-gradient-to-br from-card to-muted/30 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <SparklesIcon className="h-4 w-4 text-primary" /> Insight
            </h3>
            <div className="grid grid-cols-1 gap-4 text-xs text-muted-foreground md:grid-cols-2">
              <div>
                <p className="mb-1 font-medium text-foreground">⚠️ A/R Aging Alert</p>
                <p>Eksposur jatuh tempo &gt;90 hari sebesar {fmt(arB.d91_180 + arB.over180)} ({fmtFull(arB.over180)} di antaranya &gt;180 hari) dari total piutang {fmtFull(arB.total)}. Disarankan follow-up penagihan.</p>
              </div>
              <div>
                <p className="mb-1 font-medium text-foreground">📊 Cash Flow Outlook</p>
                <p>Net cash flow periode ini {(kpis?.net ?? 0) >= 0 ? "positif" : "negatif"} sebesar {fmt(Math.abs(kpis?.net ?? 0))}{hasBench && kpis?.bench ? ` (${(kpis.net) >= kpis.bench.net ? "membaik" : "menurun"} vs benchmark)` : ""}. Ending balance {fmt(kpis?.endingBalance ?? 0)}.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── DRILL-DOWN DRAWER ── */}
      <DrillDrawer
        open={!!drill}
        onOpenChange={(v) => !v && setDrill(null)}
        title={<><EyeIcon className="h-4 w-4 text-primary" /> {drillTitle(drill)}</>}
        description={drillDesc(drill)}
      >
        {renderDrill(drill, streamMonthly, catStreams)}
      </DrillDrawer>
    </div>
  )
}

/* ─── helpers ─── */
const share = (v?: number, total?: number) => (total && total > 0 ? (v ?? 0) / total : 0)

function ChartSkeleton() {
  return <div className="h-full w-full animate-pulse rounded-lg bg-muted/40" />
}
function EmptyState({ label }: { label: string }) {
  return <div className="flex h-full items-center justify-center text-xs text-muted-foreground">{label}</div>
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
function renderDrill(
  d: Drill,
  streamMonthly: Map<string, Record<string, number>>,
  catStreams: Map<string, HeatStream[]>,
): React.ReactNode {
  if (!d) return null

  if (d.kind === "ar") return (
    <div className="space-y-2.5">
      <KV k="Nominal" v={<span className="font-semibold text-red-500">{fmtFull(d.row.nominal)}</span>} />
      <KV k="Invoice Date" v={d.row.invoice_date ?? "—"} />
      <KV k="Umur" v={`${d.row.age} hari`} />
      <KV k="Bucket" v={arBucketLabel(d.row.age)} />
      <KV k="Status" v={statusBadge(d.row.age)} />
    </div>
  )
  if (d.kind === "ap") return (
    <div className="space-y-2.5">
      <KV k="Outstanding" v={<span className="font-semibold text-amber-600">{fmtFull(d.row.outstanding)}</span>} />
      <KV k="Bill Date" v={d.row.bill_date ?? "—"} />
      <KV k="Due Date" v={d.row.due_date ?? "—"} />
      <KV k="Umur" v={`${d.row.age} hari`} />
      <KV k="Bucket" v={apBucketLabel(d.row.age)} />
      <KV k="Status" v={statusBadge(d.row.age)} />
    </div>
  )
  if (d.kind === "inflow") {
    const monthly = streamMonthly.get(d.row.stream)
    return (
      <div className="space-y-2.5">
        <KV k="Amount" v={<span className="font-semibold text-emerald-500">{fmtFull(d.row.amount)}</span>} />
        <KV k="Share of total" v={`${d.row.percentage.toFixed(2)}%`} />
        {monthly && Object.keys(monthly).length > 0 && (
          <>
            <p className="pt-2 text-[11px] text-muted-foreground">Kontribusi per bulan:</p>
            <div className="space-y-1.5">
              {Object.entries(monthly).map(([m, v]) => (
                <div key={m} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{m}</span>
                  <span className="font-medium tabular-nums">{fmtFull(v)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }
  if (d.kind === "outflow") return (
    <div className="space-y-2.5">
      <KV k="Amount" v={<span className="font-semibold text-red-500">{fmtFull(d.row.amount)}</span>} />
      <KV k="Trend" v={d.row.trend === "up" ? "Increasing ▲" : d.row.trend === "down" ? "Decreasing ▼" : "Stable —"} />
    </div>
  )
  if (d.kind === "heat") {
    const streams = (catStreams.get(d.category) ?? [])
      .map((s) => ({ stream: s.stream, amount: s.values[d.month] || 0 }))
      .filter((s) => s.amount > 0)
      .sort((a, b) => b.amount - a.amount)
    return (
      <div className="space-y-2.5">
        <KV k="Revenue" v={<span className="font-semibold text-emerald-500">{fmtFull(d.amount)}</span>} />
        <KV k="Kategori" v={d.category} />
        <KV k="Bulan" v={d.month} />
        {streams.length > 0 && (
          <>
            <p className="pt-2 text-[11px] text-muted-foreground">Rincian stream:</p>
            <div className="space-y-1.5">
              {streams.map((s) => (
                <div key={s.stream} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{s.stream}</span>
                  <span className="font-medium tabular-nums">{fmtFull(s.amount)}</span>
                </div>
              ))}
            </div>
          </>
        )}
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
                <p className="text-[10px] text-muted-foreground">{r.invoice_date ?? "—"} · {r.age} hari</p>
              </div>
              <span className="font-medium text-red-500 tabular-nums">{fmtFull(r.nominal)}</span>
            </div>
          ))}
          {!d.rows.length && <p className="py-4 text-center text-xs text-muted-foreground">Tidak ada data.</p>}
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
                <p className="text-muted-foreground">{r.bill} · due {r.due_date ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">{r.age} hari</p>
              </div>
              <span className="font-medium text-amber-600 tabular-nums">{fmtFull(r.outstanding)}</span>
            </div>
          ))}
          {!d.rows.length && <p className="py-4 text-center text-xs text-muted-foreground">Tidak ada data.</p>}
        </div>
      </div>
    )
  }
  return null
}
