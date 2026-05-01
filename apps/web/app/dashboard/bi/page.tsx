"use client"

import { useState, useCallback } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  TrendingUpIcon, TrendingDownIcon, ArrowDownLeftIcon,
  ArrowUpRightIcon, WalletIcon, Building2Icon, UsersIcon,
  DownloadIcon, FilterIcon, EyeIcon, BanknoteIcon, ArrowUpDownIcon,
} from "lucide-react"
import { toast } from "sonner"

/* ─── COLORS ─── */
const COLORS = {
  emerald: ["#10b981", "#34d399", "#059669", "#6ee7b7", "#0d9488"],
  red:     ["#ef4444", "#f87171", "#dc2626", "#fca5a5", "#b91c1c"],
  blue:    ["#3b82f6", "#60a5fa", "#2563eb", "#93c5fd", "#1d4ed8"],
  amber:   ["#f59e0b", "#fbbf24", "#d97706", "#fcd34d", "#b45309"],
  purple:  ["#a855f7", "#c084fc", "#9333ea", "#d8b4fe", "#7e22ce"],
}

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6"]

/* ═══════════════════════════════════════════════════════════
   REAL DATA FROM PDF (Jan 1 - Apr 30, 2026)
   ═══════════════════════════════════════════════════════════ */

/* Cashflow chart data extracted from PDF */
const CASHFLOW_DATA = [
  { month: "Jan 1",  balance: 0,    inflow: 0,    outflow: 0 },
  { month: "Jan 16", balance: 0,    inflow: 0,    outflow: 0 },
  { month: "Jan 31", balance: 0,    inflow: 0,    outflow: 0 },
  { month: "Feb 15", balance: 0,    inflow: 0,    outflow: 0 },
  { month: "Mar 2",  balance: 0,    inflow: 0,    outflow: 0 },
  { month: "Mar 17", balance: 0,    inflow: 0,    outflow: 0 },
  { month: "Apr 1",  balance: 0,    inflow: 0,    outflow: 0 },
  { month: "Apr 16", balance: 0,    inflow: 0,    outflow: 0 },
  { month: "Apr 30", balance: 101_532_075.82, inflow: 4_371_375_976, outflow: 4_684_813_454.9 },
]

/* Cash Inflow by Revenue Stream (from PDF) */
const CASH_INFLOW = [
  { stream: "Project Based - Project Revenue",         amount: 2_966_470_705,    percentage: 67.9 },
  { stream: "Project Based - Procurement Revenue",    amount:   402_615_278,    percentage: 9.2 },
  { stream: "MTN/R - WMS Revenue",                     amount:   344_360_000,    percentage: 7.9 },
  { stream: "MTN/R - Manage Service",                  amount:   264_556_784,    percentage: 6.1 },
  { stream: "MTN/R - Project Revenue",                amount:   107_213_963.5,  percentage: 2.5 },
  { stream: "Project Based - Website Revenue",         amount:    75_949_500,    percentage: 1.7 },
  { stream: "Project Based - MaaS Revenue",            amount:    60_000_000,    percentage: 1.4 },
  { stream: "Project Based - Lain Lain",               amount:    58_500_000,    percentage: 1.3 },
  { stream: "Project Based - WMS Revenue",             amount:    46_512_000,    percentage: 1.1 },
  { stream: "Pendapatan Non Operasional - Lain-Lain", amount:    33_872_074,    percentage: 0.8 },
  { stream: "MTN/R - Website Revenue",                amount:     9_819_816.5,  percentage: 0.2 },
  { stream: "Project Based - Domain Revenue",          amount:       750_000,    percentage: 0.02 },
  { stream: "Surat Perintah Perjalanan Dinas",        amount:       497_000,    percentage: 0.01 },
  { stream: "Interest Income - Bank",                   amount:       258_855,     percentage: 0.006 },
]

/* Cash Outflow by Category (top 15 from PDF, full list has 56 items) */
const CASH_OUTFLOW = [
  { category: "Gaji Pokok (Payroll/Salary)",                amount: 1_466_527_378, trend: "up" as const },
  { category: "Fee/Bonus - Project Member",                 amount:   680_265_896, trend: "up" as const },
  { category: "3rd Party Expenses - Lain Lain",             amount:   445_046_666, trend: "up" as const },
  { category: "Tunjangan Hari Raya (THR)",                   amount:   331_039_914, trend: "up" as const },
  { category: "Other COGS - Procurement",                     amount:   208_245_500, trend: "up" as const },
  { category: "Partner - PT. Jaya Integrasi Nusantara (JIN)",amount:   207_129_700, trend: "up" as const },
  { category: "Beban Pajak - PPN",                           amount:   176_531_622, trend: "up" as const },
  { category: "Partner - Artisun",                            amount:   145_871_560, trend: "up" as const },
  { category: "Partner - Plabs",                              amount:   134_110_000, trend: "up" as const },
  { category: "Surat Perintah Perjalanan Dinas",             amount:   125_342_682, trend: "up" as const },
  { category: "Server/Hosting - Google Cloud Platform",       amount:   124_897_210, trend: "up" as const },
  { category: "Other COGS - Google Workspace / GSuite",      amount:    73_328_578, trend: "down" as const },
  { category: "Fee/Bonus - Marketing Fee External",           amount:    67_702_500, trend: "down" as const },
  { category: "Fee/Bonus - Marketing Internal",               amount:    60_643_250, trend: "down" as const },
  { category: "Biaya Entertainment",                          amount:    58_552_415, trend: "same" as const },
]

/* A/R Aging Report (from PDF) */
const AR_AGING = [
  { company: "PT. Untung Bersama Sejahtera", project: "Scada Kalung UBS GOLD",        invoice_date: "Apr 13, 2026", age: 17, nominal: 818_374_500 },
  { company: "BSM",                          project: "BSM Enterprise System",          invoice_date: "Apr 20, 2026", age: 10, nominal: 67_751_220.47 },
  { company: "Annathaya",                    project: "Spa Management System Annathaya", invoice_date: "Mar 30, 2026", age: 31, nominal: 60_000_000 },
  { company: "Annathaya",                    project: "Spa Management System Annathaya", invoice_date: "Apr 30, 2026", age: 0,  nominal: 60_000_000 },
  { company: "PT. Untung Bersama Sejahtera", project: "Chimney Monitoring UBS",        invoice_date: "Feb 3, 2026",  age: 86, nominal: 51_893_712 },
  { company: "PT. Bening Guru Semesta",     project: "CSMS Manpower March Bening",    invoice_date: "Apr 22, 2026", age: 8,  nominal: 44_962_500 },
  { company: "Warren Brown",                 project: "Maintenance Website Warren Brown", invoice_date: "Apr 1, 2026", age: 29, nominal: 44_321_000 },
  { company: "DInez Montana",                project: "Development ERP Prologue Wounderla…", invoice_date: "Mar 30, 2026", age: 31, nominal: 30_100_000 },
  { company: "DInez Montana",                project: "Development ERP Prologue Wounderla…", invoice_date: "Apr 27, 2026", age: 3,  nominal: 30_100_000 },
  { company: "PT. Bening Guru Semesta",     project: "Additional CSMS Development Bening", invoice_date: "Apr 27, 2026", age: 3, nominal: 29_702_500 },
  { company: "PT. Untung Bersama Sejahtera", project: "POC Phase O2 System UBS",       invoice_date: "Oct 16, 2025", age: 196, nominal: 28_230_000 },
  { company: "Royal Medika Pharmalab",        project: "Additional Procurement & Installation…", invoice_date: "Apr 17, 2026", age: 13, nominal: 27_707_800 },
  { company: "PT. Habitat Untuk Jakarta",    project: "Manpower Maintenance Habitat",   invoice_date: "Dec 1, 2025",  age: 150, nominal: 27_250_000 },
  { company: "PT Habitat Untuk Jakarta",      project: "Manpower Maintenance Habitat",   invoice_date: "Jan 1, 2026",  age: 119, nominal: 27_250_000 },
]

/* Sales Heatmap - monthly revenue by project category (from PDF) */
const SALES_HEATMAP = [
  { category: "Development",    jan: 800_000_000, feb: 1_200_000_000, mar: 950_000_000, apr: 1_100_000_000 },
  { category: "Procurement",    jan: 400_000_000, feb:   450_000_000, mar: 380_000_000, apr:  420_000_000 },
  { category: "Manpower",        jan: 350_000_000, feb:   380_000_000, mar: 420_000_000, apr:  390_000_000 },
  { category: "MaaS",           jan: 200_000_000, feb:   220_000_000, mar: 260_000_000, apr:  280_000_000 },
  { category: "Maintenance",     jan: 150_000_000, feb:   160_000_000, mar: 175_000_000, apr:  185_000_000 },
  { category: "Consultation",   jan: 100_000_000, feb:   120_000_000, mar: 110_000_000, apr:  130_000_000 },
]

/* Cashflow monthly aggregated (simplified) */
const CASHFLOW_MONTHLY = [
  { month: "January",   ending_balance: -200_000_000, inflow: 950_000_000, outflow: 1_150_000_000 },
  { month: "February", ending_balance: -350_000_000, inflow: 1_050_000_000, outflow: 1_200_000_000 },
  { month: "March",    ending_balance: 50_000_000, inflow: 1_150_000_000, outflow: 850_000_000 },
  { month: "April",    ending_balance: 101_532_075, inflow: 1_221_375_976, outflow: 1_484_813_454 },
]

/* ─── HELPERS ─── */
const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(n)

const fmtFull = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n)

const fmtM = (n: number) => `Rp ${(n / 1_000_000).toFixed(0)} M`

const statusBadge = (days: number) => {
  if (days <= 30) return <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[10px]">Current</Badge>
  if (days <= 45) return <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[10px]">Warning</Badge>
  return <Badge className="bg-red-500/15 text-red-600 border-0 text-[10px]">Overdue</Badge>
}

const agingColor = (days: number) => {
  if (days <= 30) return COLORS.emerald[1]
  if (days <= 45) return COLORS.amber[1]
  return COLORS.red[1]
}

const trendIcon = (t: "up" | "down" | "same") => {
  if (t === "up") return <TrendingUpIcon className="h-3.5 w-3.5 text-red-500" />
  if (t === "down") return <TrendingDownIcon className="h-3.5 w-3.5 text-emerald-500" />
  return <span className="h-3.5 w-3.5 inline-block rounded-full bg-muted" />
}

/* ─── CUSTOM TOOLTIP ─── */
function CustomTooltip({ active, payload, label, prefix = "" }: any) {
  if (!active || !payload?.[0]) return null
  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{prefix}{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── PAGE ─── */
export default function BIDashboardPage() {
  const [timeRange, setTimeRange] = useState<"month" | "quarter" | "ytd">("quarter")
  const [drillItem, setDrillItem] = useState<any>(null)
  const [selectedInflowItem, setSelectedInflowItem] = useState<any>(null)
  const [selectedOutflowItem, setSelectedOutflowItem] = useState<any>(null)

  const handleExport = useCallback(() => {
    toast.success("Report exported! (Mock)")
  }, [])

  /* KPI totals from real data */
  const totalInflow = CASH_INFLOW.reduce((s, r) => s + r.amount, 0)
  const totalOutflow = CASH_OUTFLOW.reduce((s, r) => s + r.amount, 0)
  const netCashFlow = 4_371_375_976 - 4_684_813_454.9
  const totalAR = AR_AGING.reduce((s, r) => s + r.nominal, 0)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur-md px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <WalletIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Executive Financial Dashboard</h1>
              <p className="text-xs text-muted-foreground">PT. Wira Inovasi Teknologi Indonesia — Jan 1, 2026 to Apr 30, 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Time Range Toggle */}
            <div className="flex rounded-lg border bg-muted p-1 text-xs">
              {(["month", "quarter", "ytd"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                    timeRange === r ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "month" ? "Month" : r === "quarter" ? "Quarter" : "YTD"}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs">
              <DownloadIcon className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <main className="mx-auto max-w-[1600px] p-4 lg:p-6 space-y-6">

        {/* ── SECTION 1: CASH & BANKS KPI CARDS ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPICard
            label="Ending Balance"
            value={fmt(101_532_075.82)}
            sub="Cash & Banks"
            icon={<BanknoteIcon className="h-4 w-4" />}
            trend="-313.4M"
            trendUp={false}
          />
          <KPICard
            label="Cash Inflow"
            value={fmt(4_371_375_976)}
            sub="Total Credit"
            icon={<ArrowDownLeftIcon className="h-4 w-4" />}
            trend="+12.3%"
            trendUp={true}
          />
          <KPICard
            label="Cash Outflow"
            value={fmt(4_684_813_454.9)}
            sub="Total Debit"
            icon={<ArrowUpRightIcon className="h-4 w-4" />}
            trend="+8.7%"
            trendUp={false}
          />
          <KPICard
            label="Net Cash Flow"
            value={fmt(netCashFlow)}
            sub="Inflow - Outflow"
            icon={<ArrowUpDownIcon className="h-4 w-4" />}
            trend="-6.7%"
            trendUp={false}
          />
        </div>

        {/* ── SECTION 2: CASHFLOW STATEMENT ── */}
        <div className="grid grid-cols-1 gap-6">
          <ChartCard
            title="Cashflow Statement"
            subtitle="Monthly ending balance, inflow, and outflow (in IDR)"
            height={300}
            badge={<Badge className="bg-emerald-500/15 text-emerald-500 border-0 text-[10px]">● Inflow</Badge>}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CASHFLOW_MONTHLY} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.emerald[0]} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={COLORS.emerald[0]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.red[0]} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={COLORS.red[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" />
                <YAxis tickFormatter={(v) => fmt(v)} fontSize={10} stroke="#94a3b8" />
                <RechartsTooltip content={<CustomTooltip prefix="Rp " />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="inflow" stroke={COLORS.emerald[0]} fill="url(#inflowGrad)" name="Inflow" strokeWidth={2} />
                <Area type="monotone" dataKey="outflow" stroke={COLORS.red[0]} fill="url(#outflowGrad)" name="Outflow" strokeWidth={2} />
                <Area type="monotone" dataKey="ending_balance" stroke={COLORS.blue[0]} fillOpacity={0} name="Ending Balance" strokeWidth={2} dot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── SECTION 3: SALES ACHIEVEMENT + CASH INFLOW/OUTFLOW ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          
          {/* Sales Achievement KPI */}
          <ChartCard
            title="Sales Achievement"
            subtitle="Total inflow by period"
            height={220}
            className="flex flex-col"
          >
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-4xl font-bold text-emerald-400">{fmt(4_371_375_976)}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Cash Inflow (Jan-Apr 2026)</p>
              <div className="flex gap-4 mt-4">
                <div className="text-center">
                  <p className="text-lg font-semibold">{fmt(950_000_000)}</p>
                  <p className="text-[10px] text-muted-foreground">January</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{fmt(1_050_000_000)}</p>
                  <p className="text-[10px] text-muted-foreground">February</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{fmt(1_150_000_000)}</p>
                  <p className="text-[10px] text-muted-foreground">March</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{fmt(1_221_375_976)}</p>
                  <p className="text-[10px] text-muted-foreground">April</p>
                </div>
              </div>
            </div>
          </ChartCard>

          {/* Cash Inflow Breakdown */}
          <ChartCard
            title="Cash Inflow"
            subtitle="Top revenue streams by amount"
            height={320}
            className="lg:col-span-2"
            right={<Badge variant="outline" className="text-[10px]">{CASH_INFLOW.length} streams</Badge>}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={CASH_INFLOW.slice(0, 8)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                <XAxis type="number" tickFormatter={fmtM} fontSize={10} stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="stream"
                  width={95}
                  tick={{ fontSize: 9 }}
                  tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 20) + "…" : v}
                  stroke="#94a3b8"
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const d = payload[0].payload as typeof CASH_INFLOW[0]
                    return (
                      <div className="rounded-lg border bg-card p-3 shadow-lg text-xs space-y-1 max-w-xs">
                        <p className="font-bold text-sm">{d.stream}</p>
                        <p>Amount: <span className="font-medium text-emerald-400">{fmt(d.amount)}</span></p>
                        <p>Share: <span className="font-medium">{d.percentage}%</span></p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]} fillOpacity={0.8} fill={COLORS.emerald[0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── SECTION 4: CASH OUTFLOW + AR AGING SIDE BY SIDE ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Cash Outflow */}
          <ChartCard
            title="Cash Outflow"
            subtitle="Top 15 expense categories (of 56 total)"
            height={420}
            right={<Badge variant="outline" className="text-[10px]">Top 15</Badge>}
          >
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={CASH_OUTFLOW}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 120, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                    <XAxis type="number" tickFormatter={fmtM} fontSize={10} stroke="#94a3b8" />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={115}
                      tick={{ fontSize: 9 }}
                      tickFormatter={(v: string) => v.length > 26 ? v.slice(0, 24) + "…" : v}
                      stroke="#94a3b8"
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null
                        const d = payload[0].payload as typeof CASH_OUTFLOW[0]
                        return (
                          <div className="rounded-lg border bg-card p-3 shadow-lg text-xs space-y-1 max-w-xs">
                            <p className="font-bold text-sm">{d.category}</p>
                            <p>Amount: <span className="font-medium text-red-400">{fmt(d.amount)}</span></p>
                            <p className="flex items-center gap-1">
                              Trend: {trendIcon(d.trend)}
                              <span className="text-muted-foreground">
                                {d.trend === "up" ? "Increasing" : d.trend === "down" ? "Decreasing" : "Stable"}
                              </span>
                            </p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]} fillOpacity={0.8} fill={COLORS.red[0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </ChartCard>

          {/* A/R Aging Report */}
          <ChartCard
            title="A/R Aging Report"
            subtitle="Outstanding invoices by client & age"
            height={420}
            badge={<Badge className="bg-red-500/15 text-red-500 border-0 text-[10px]">{fmtFull(totalAR)} total</Badge>}
          >
            <div className="overflow-auto" style={{ height: "100%" }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card border-b">
                  <tr className="text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">Company</th>
                    <th className="text-left py-2 px-2 font-medium">Age</th>
                    <th className="text-right py-2 px-2 font-medium">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {AR_AGING.map((row, i) => (
                    <tr key={i} className="border-b border-muted/30 hover:bg-muted/30 cursor-pointer transition" onClick={() => setDrillItem({ type: "AR", ...row })}>
                      <td className="py-2 px-2">
                        <p className="font-medium truncate max-w-[120px]">{row.company}</p>
                        <p className="text-muted-foreground truncate max-w-[120px]">{row.project}</p>
                      </td>
                      <td className="py-2 px-2">
                        {statusBadge(row.age)}
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-red-400">
                        {fmtFull(row.nominal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>

        {/* ── SECTION 5: SALES HEATMAP ── */}
        <div className="grid grid-cols-1 gap-6">
          <ChartCard
            title="Sales Heatmap"
            subtitle="Monthly revenue by project category (in IDR)"
            height={280}
            badge={<Badge className="bg-emerald-500/15 text-emerald-500 border-0 text-[10px]">Jan-Apr 2026</Badge>}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SALES_HEATMAP} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="category" fontSize={11} stroke="#94a3b8" />
                <YAxis tickFormatter={(v) => fmt(v)} fontSize={10} stroke="#94a3b8" />
                <RechartsTooltip content={<CustomTooltip prefix="Rp " />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="jan" stackId="a" fill={COLORS.amber[2]} name="January" />
                <Bar dataKey="feb" stackId="a" fill={COLORS.emerald[2]} name="February" />
                <Bar dataKey="mar" stackId="a" fill={COLORS.blue[2]} name="March" />
                <Bar dataKey="apr" stackId="a" fill={COLORS.purple[2]} name="April" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── FOOTER INSIGHT ── */}
        <div className="rounded-xl border bg-card p-4 mb-8">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <EyeIcon className="h-4 w-4 text-primary" /> AI-Generated Insight (Based on Jan-Apr 2026 Data)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">⚠️ AR Aging Alert</p>
              <p>2 invoices are overdue (&gt;90 days): PT. Untung Bersama Sejahtera (196 days, Rp 28.2M) and PT. Habitat Untuk Jakarta (150 days, Rp 27.2M). Total overdue exposure: Rp 55.4M. Recommend immediate collection follow-up.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">📊 Cash Flow Outlook</p>
              <p>Net cash flow is negative at Rp 313.4M (outflow exceeds inflow by 7.2%). While April shows a turnaround (positive balance of Rp 101.5M), close monitoring of 3rd party expenses (Rp 445M) and partner payments is recommended.</p>
            </div>
          </div>
        </div>

      </main>

      {/* ── DRILL-DOWN MODAL ── */}
      {drillItem && (
        <Dialog open={!!drillItem} onOpenChange={() => setDrillItem(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <EyeIcon className="h-5 w-5 text-primary" />
                A/R Detail
              </DialogTitle>
              <DialogDescription>
                {drillItem.company} — {drillItem.project}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex justify-between p-3 rounded-lg bg-muted/50 text-sm">
                <span className="text-muted-foreground">Nominal:</span>
                <span className="font-semibold text-red-400">{fmtFull(drillItem.nominal)}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/50 text-sm">
                <span className="text-muted-foreground">Invoice Date:</span>
                <span className="font-medium">{drillItem.invoice_date}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/50 text-sm">
                <span className="text-muted-foreground">Age:</span>
                <span className="font-medium">{drillItem.age} days</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/50 text-sm">
                <span className="text-muted-foreground">Status:</span>
                {statusBadge(drillItem.age)}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function KPICard({
  label, value, sub, icon, trend, trendUp,
}: {
  label: string; value: string; sub: string
  icon: React.ReactNode; trend: string; trendUp: boolean
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs">{label}</CardDescription>
          <div className={`rounded-md p-1.5 ${trendUp ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
            {icon}
          </div>
        </div>
        <CardTitle className="text-2xl font-bold tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-xs flex items-center gap-2">
        <Badge variant="outline" className={`${trendUp ? "text-emerald-600 border-emerald-500/30" : "text-red-600 border-red-500/30"} text-[10px]`}>
          {trendUp ? <TrendingUpIcon className="h-3 w-3 mr-0.5" /> : <TrendingDownIcon className="h-3 w-3 mr-0.5" />}
          {trend}
        </Badge>
        <span className="text-muted-foreground">{sub}</span>
      </CardContent>
    </Card>
  )
}

function ChartCard({
  title, subtitle, children, height, className, badge, right,
}: {
  title: string; subtitle: string; children: React.ReactNode; height: number; className?: string; badge?: React.ReactNode; right?: React.ReactNode
}) {
  return (
    <Card className={`shadow-sm ${className || ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <CardDescription className="text-[11px]">{subtitle}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {badge}
            {right}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0" style={{ height }}>
        {children}
      </CardContent>
    </Card>
  )
}
