"use client"

import { useState, useCallback } from "react"
// Note: framer-motion not installed — pure CSS transitions used
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
  DownloadIcon, FilterIcon, EyeIcon,
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
   MOCK DATA GENERATORS — replace with real API later
   ═══════════════════════════════════════════════════════════ */

const TOP_AR = [
  { client: "PT Maju Jaya Prima", amount: 2_850_000_000, aging: 15, status: "current" },
  { client: "PT Teknologi Nusantara", amount: 2_120_000_000, aging: 22, status: "current" },
  { client: "CV Sumber Rejeki", amount: 1_780_000_000, aging: 45, status: "warning" },
  { client: "PT Bahtera Jaya", amount: 1_450_000_000, aging: 12, status: "current" },
  { client: "PT Inovasi Digital", amount: 1_200_000_000, aging: 60, status: "overdue" },
  { client: "PT Sejahtera Abadi", amount: 980_000_000, aging: 8, status: "current" },
  { client: "CV Cahaya Gemilang", amount: 850_000_000, aging: 35, status: "warning" },
  { client: "PT Global Mitra", amount: 720_000_000, aging: 18, status: "current" },
  { client: "PT Dinamika Kreasi", amount: 650_000_000, aging: 55, status: "overdue" },
  { client: "CV Harapan Indah", amount: 520_000_000, aging: 5, status: "current" },
]

const TOP_AP = [
  { vendor: "PT Supplier Utama", amount: 1_950_000_000, due_days: 30, status: "current" },
  { vendor: "CV Sukses Jaya", amount: 1_650_000_000, due_days: 15, status: "current" },
  { vendor: "PT Baja Nusantara", amount: 1_320_000_000, due_days: 45, status: "warning" },
  { vendor: "PT Layanan Prima", amount: 980_000_000, due_days: 60, status: "overdue" },
  { vendor: "PT Energi Terbarukan", amount: 850_000_000, due_days: 10, status: "current" },
  { vendor: "CV Cahaya Teknik", amount: 720_000_000, due_days: 25, status: "current" },
  { vendor: "PT Media Nusantara", amount: 650_000_000, due_days: 5, status: "current" },
  { vendor: "PT Konsultan Pro", amount: 580_000_000, due_days: 38, status: "warning" },
  { vendor: "CV Jaya Makmur", amount: 420_000_000, due_days: 55, status: "overdue" },
  { vendor: "PT Digital Indo", amount: 350_000_000, due_days: 12, status: "current" },
]

const TOP_REVENUE = [
  { stream: "Software Licensing", amount: 5_280_000_000, percentage: 28 },
  { stream: "Implementation Service", amount: 3_450_000_000, percentage: 18 },
  { stream: "Support & Maintenance", amount: 2_980_000_000, percentage: 16 },
  { stream: "Custom Development", amount: 2_650_000_000, percentage: 14 },
  { stream: "Training & Consulting", amount: 1_850_000_000, percentage: 10 },
  { stream: "Cloud Hosting", amount: 1_320_000_000, percentage: 7 },
  { stream: "Third-party Reselling", amount: 780_000_000, percentage: 4 },
  { stream: "API Integration Service", amount: 550_000_000, percentage: 3 },
]

const TOP_EXPENSES = [
  { category: "Personnel & Payroll", amount: 4_850_000_000, trend: "up" as const },
  { category: "Office Rent & Utilities", amount: 2_120_000_000, trend: "up" as const },
  { category: "Marketing & Promotion", amount: 1_750_000_000, trend: "down" as const },
  { category: "Software & Tools", amount: 1_320_000_000, trend: "up" as const },
  { category: "Travel & Accommodation", amount: 950_000_000, trend: "up" as const },
  { category: "Professional Services", amount: 780_000_000, trend: "down" as const },
  { category: "Equipment & Hardware", amount: 620_000_000, trend: "down" as const },
  { category: "Insurance & Compliance", amount: 450_000_000, trend: "same" as const },
  { category: "Training & Development", amount: 320_000_000, trend: "up" as const },
  { category: "Miscellaneous", amount: 180_000_000, trend: "down" as const },
]

const FORECAST_INFLOW = [
  { month: "Jan", actual: 2_100, forecast: 2_100, optimistic: 2_300 },
  { month: "Feb", actual: 1_950, forecast: 1_900, optimistic: 2_150 },
  { month: "Mar", actual: 2_250, forecast: 2_200, optimistic: 2_450 },
  { month: "Apr", actual: 2_350, forecast: 2_300, optimistic: 2_500 },
  { month: "Mei", actual: null, forecast: 2_400, optimistic: 2_700 },
  { month: "Jun", actual: null, forecast: 2_550, optimistic: 2_900 },
  { month: "Jul", actual: null, forecast: 2_700, optimistic: 3_100 },
  { month: "Agu", actual: null, forecast: 2_850, optimistic: 3_250 },
  { month: "Sep", actual: null, forecast: 2_900, optimistic: 3_400 },
  { month: "Okt", actual: null, forecast: 3_050, optimistic: 3_550 },
  { month: "Nov", actual: null, forecast: 3_200, optimistic: 3_750 },
  { month: "Des", actual: null, forecast: 3_350, optimistic: 3_900 },
]

const FORECAST_OUTFLOW = [
  { month: "Jan", actual: 1_650, forecast: 1_650, pessimistic: 1_850 },
  { month: "Feb", actual: 1_720, forecast: 1_700, pessimistic: 1_900 },
  { month: "Mar", actual: 1_580, forecast: 1_600, pessimistic: 1_800 },
  { month: "Apr", actual: 1_750, forecast: 1_700, pessimistic: 1_950 },
  { month: "Mei", actual: null, forecast: 1_800, pessimistic: 2_050 },
  { month: "Jun", actual: null, forecast: 1_850, pessimistic: 2_150 },
  { month: "Jul", actual: null, forecast: 1_900, pessimistic: 2_200 },
  { month: "Agu", actual: null, forecast: 1_950, pessimistic: 2_300 },
  { month: "Sep", actual: null, forecast: 2_050, pessimistic: 2_350 },
  { month: "Okt", actual: null, forecast: 2_100, pessimistic: 2_400 },
  { month: "Nov", actual: null, forecast: 2_150, pessimistic: 2_500 },
  { month: "Des", actual: null, forecast: 2_200, pessimistic: 2_600 },
]

/* ─── HELPERS ─── */
const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: n >= 1_000_000_000 ? "compact" : undefined,
    minimumFractionDigits: 0,
  }).format(n)

const fmtM = (n: number) => `Rp ${(n / 1000).toFixed(0)} M`

const statusBadge = (days: number) => {
  if (days <= 30) return <Badge className="bg-emerald-500/15 text-emerald-600">Current</Badge>
  if (days <= 45) return <Badge className="bg-amber-500/15 text-amber-600">Warning</Badge>
  return <Badge className="bg-red-500/15 text-red-600">Overdue</Badge>
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
          <span className="font-medium">{prefix}{fmtM(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function BIDashboardPage() {
  const [timeRange, setTimeRange] = useState<"month" | "quarter" | "ytd">("ytd")
  const [drillItem, setDrillItem] = useState<any>(null)

  const handleExport = useCallback(() => {
    toast.success("Report exported! (Mock)")
  }, [])

  const totalCashIn = FORECAST_INFLOW.reduce((s, d) => s + (d.actual || d.forecast || 0), 0)
  const totalCashOut = FORECAST_OUTFLOW.reduce((s, d) => s + (d.actual || d.forecast || 0), 0)
  const netCashFlow = totalCashIn - totalCashOut

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
              <h1 className="text-xl font-bold">Business Intelligence Dashboard</h1>
              <p className="text-xs text-muted-foreground">Finance Infographic Report — PT. Wira Inovasi Teknologi Indonesia</p>
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
      <main className="mx-auto max-w-[1600px] p-4 lg:p-6">
        {/* KPI CARDS */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KPICard
            label="Total AR Outstanding"
            value={fmtM(TOP_AR.reduce((s, r) => s + r.amount, 0))}
            sub="Top 10 Accounts"
            icon={<UsersIcon className="h-4 w-4" />}
            trend="+5.2%"
            trendUp
          />
          <KPICard
            label="Total AP Outstanding"
            value={fmtM(TOP_AP.reduce((s, r) => s + r.amount, 0))}
            sub="Top 10 Vendors"
            icon={<Building2Icon className="h-4 w-4" />}
            trend="-2.1%"
            trendUp={false}
          />
          <KPICard
            label="Net Cash Flow"
            value={fmtM(netCashFlow)}
            sub="Forecasted"
            icon={<ArrowDownLeftIcon className="h-4 w-4" />}
            trend="+8.7%"
            trendUp
          />
          <KPICard
            label="Total Expenses"
            value={fmtM(TOP_EXPENSES.reduce((s, r) => s + r.amount, 0))}
            sub="Top 10 Categories"
            icon={<ArrowUpRightIcon className="h-4 w-4" />}
            trend="+3.4%"
            trendUp={false}
          />
        </div>

        {/* FIRST ROW: AR + AP */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* TOP 10 AR */}
          <ChartCard
            title="Top 10 Accounts Receivable"
            subtitle="By outstanding balance & aging status"
            right={<Badge variant="outline" className="text-xs">Click bar to drill-down</Badge>}
            height={420}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={TOP_AR}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                <XAxis type="number" tickFormatter={fmtM} fontSize={11} stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="client"
                  width={120}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 16) + "…" : v)}
                  stroke="#94a3b8"
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length || !payload[0]) return null
                    const d = payload[0].payload as typeof TOP_AR[0]
                    return (
                      <div className="rounded-lg border bg-card p-3 shadow-lg text-xs space-y-1">
                        <p className="font-bold text-sm">{d.client}</p>
                        <p>Amount: <span className="font-medium text-emerald-400">{fmt(d.amount)}</span></p>
                        <p>Aging: <span className="font-medium">{d.aging} days</span></p>
                        <p>Status: {statusBadge(d.aging)}</p>
                      </div>
                    )
                  }}
                />
                <Bar
                  dataKey="amount"
                  radius={[0, 6, 6, 0]}
                  fillOpacity={0.85}
                >
                  {TOP_AR.map((entry, i) => {
                    const fill = entry.aging > 45 ? COLORS.red[1] : entry.aging > 30 ? COLORS.amber[1] : COLORS.emerald[1]
                    return <Cell key={i} fill={fill} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* TOP 10 AP */}
          <ChartCard
            title="Top 10 Accounts Payable"
            subtitle="By outstanding balance & due date"
            right={<Badge variant="outline" className="text-xs">Click bar to drill-down</Badge>}
            height={420}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={TOP_AP}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                <XAxis type="number" tickFormatter={fmtM} fontSize={11} stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="vendor"
                  width={120}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 16) + "…" : v)}
                  stroke="#94a3b8"
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const d = payload[0].payload as typeof TOP_AP[0]
                    return (
                      <div className="rounded-lg border bg-card p-3 shadow-lg text-xs space-y-1">
                        <p className="font-bold text-sm">{d.vendor}</p>
                        <p>Amount: <span className="font-medium text-red-400">{fmt(d.amount)}</span></p>
                        <p>Due in: <span className="font-medium">{d.due_days} days</span></p>
                        <p>Status: {statusBadge(d.due_days)}</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]} fillOpacity={0.85}>
                  {TOP_AP.map((entry, i) => {
                    const fill = entry.due_days > 45 ? COLORS.red[1] : entry.due_days > 30 ? COLORS.amber[1] : COLORS.emerald[1]
                    return <Cell key={i} fill={fill} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* SECOND ROW: Revenue + Expenses */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* REVENUE DONUT */}
          <ChartCard
            title="Top Revenue Streams"
            subtitle="Share of total revenue by segment"
            height={380}
            className="lg:col-span-1"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={TOP_REVENUE}
                  dataKey="amount"
                  nameKey="stream"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={3}
                  className="cursor-pointer"
                >
                  {TOP_REVENUE.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const d = payload[0].payload as typeof TOP_REVENUE[0]
                    return (
                      <div className="rounded-lg border bg-card p-3 shadow-lg text-xs space-y-1">
                        <p className="font-bold">{d.stream}</p>
                        <p>Amount: <span className="font-medium text-emerald-400">{fmt(d.amount)}</span></p>
                        <p>Share: <span className="font-medium">{d.percentage}%</span></p>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend list */}
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 px-4 pb-3 text-xs">
              {TOP_REVENUE.map((r, i) => (
                <button
                  key={r.stream}
                  onClick={() => setDrillItem({ type: "Revenue", ...r })}
                  className="flex items-center gap-1.5 text-left hover:bg-muted/50 rounded px-1 py-0.5 transition"
                >
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                  <span className="truncate">{r.stream}</span>
                  <span className="text-muted-foreground ml-auto">{r.percentage}%</span>
                </button>
              ))}
            </div>
          </ChartCard>

          {/* TOP 10 EXPENSES */}
          <ChartCard
            title="Top 10 Expense Categories"
            subtitle="By monthly spend with MoM trend"
            height={380}
            className="lg:col-span-2"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={TOP_EXPENSES}
                layout="vertical"
                margin={{ top: 5, right: 80, left: 60, bottom: 5 }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                <XAxis type="number" tickFormatter={fmtM} fontSize={11} stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={120}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 16) + "…" : v)}
                  stroke="#94a3b8"
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const d = payload[0].payload as typeof TOP_EXPENSES[0]
                    return (
                      <div className="rounded-lg border bg-card p-3 shadow-lg text-xs space-y-1">
                        <p className="font-bold">{d.category}</p>
                        <p>Amount: <span className="font-medium text-red-400">{fmt(d.amount)}</span></p>
                        <p className="flex items-center gap-1">
                          Trend MoM: {trendIcon(d.trend)}
                          <span className="text-muted-foreground">
                            {d.trend === "up" ? "Increasing" : d.trend === "down" ? "Decreasing" : "Stable"}
                          </span>
                        </p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]} fill={COLORS.red[1]} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* THIRD ROW: FORECASTS */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* CASH INFLOW */}
          <ChartCard
            title="Forecasted Cash Inflow"
            subtitle="Projected collections vs actual receipts (in millions IDR)"
            badge={<Badge className="bg-emerald-500/15 text-emerald-500 text-[10px]">● Forecast</Badge>}
            height={340}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={FORECAST_INFLOW} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="greenArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.emerald[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.emerald[0]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="greenAreaOpt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.emerald[3]} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={COLORS.emerald[3]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" />
                <YAxis tickFormatter={(v) => `${v}`} fontSize={11} stroke="#94a3b8" />
                <RechartsTooltip content={<CustomTooltip prefix="" />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="optimistic" stroke={COLORS.emerald[3]} strokeDasharray="4 4" fill="url(#greenAreaOpt)" name="Optimistic" />
                <Area type="monotone" dataKey="forecast" stroke={COLORS.emerald[0]} fill="url(#greenArea)" name="Forecast" strokeWidth={2} />
                <Area type="monotone" dataKey="actual" stroke={COLORS.blue[0]} fillOpacity={0} name="Actual" strokeWidth={2} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* CASH OUTFLOW */}
          <ChartCard
            title="Forecasted Cash Outflow"
            subtitle="Projected spending vs actual payments (in millions IDR)"
            badge={<Badge className="bg-red-500/15 text-red-500 text-[10px]">● Forecast</Badge>}
            height={340}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={FORECAST_OUTFLOW} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="redArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.red[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.red[0]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="redAreaPess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.red[3]} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={COLORS.red[3]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" />
                <YAxis tickFormatter={(v) => `${v}`} fontSize={11} stroke="#94a3b8" />
                <RechartsTooltip content={<CustomTooltip prefix="" />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="pessimistic" stroke={COLORS.red[3]} strokeDasharray="4 4" fill="url(#redAreaPess)" name="Pessimistic" />
                <Area type="monotone" dataKey="forecast" stroke={COLORS.red[0]} fill="url(#redArea)" name="Forecast" strokeWidth={2} />
                <Area type="monotone" dataKey="actual" stroke={COLORS.blue[0]} fillOpacity={0} name="Actual" strokeWidth={2} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ── FOOTER INSIGHT ── */}
        <div className="rounded-xl border bg-card p-4 mb-8">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <EyeIcon className="h-4 w-4 text-primary" /> AI-Generated Insight (Mock)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">AR Aging Alert</p>
              <p>2 clients (PT Inovasi Digital & PT Dinamika Kreasi) have aging exceeding 50 days with total exposure of Rp 1.85B. Recommend escalation to collections team.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Cash Flow Outlook</p>
              <p>Net cash flow trend shows positive trajectory (+8.7%). Forecasted inflow for Q3-Q4 exceeds outflow by Rp 2.5B providing healthy liquidity buffer.</p>
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
                Drill-Down Detail
              </DialogTitle>
              <DialogDescription>
                {drillItem.type === "AR" && `Accounts Receivable — ${drillItem.client}`}
                {drillItem.type === "AP" && `Accounts Payable — ${drillItem.vendor}`}
                {drillItem.type === "Revenue" && `Revenue Stream — ${drillItem.stream}`}
                {drillItem.type === "Expense" && `Expense Category — ${drillItem.category}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex justify-between p-3 rounded-lg bg-muted/50 text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold">{fmt(drillItem.amount || drillItem.amount)}</span>
              </div>
              {drillItem.aging !== undefined && (
                <div className="flex justify-between p-3 rounded-lg bg-muted/50 text-sm">
                  <span className="text-muted-foreground">Aging:</span>
                  <span className="font-medium">{drillItem.aging} days</span>
                </div>
              )}
              {drillItem.due_days !== undefined && (
                <div className="flex justify-between p-3 rounded-lg bg-muted/50 text-sm">
                  <span className="text-muted-foreground">Due In:</span>
                  <span className="font-medium">{drillItem.due_days} days</span>
                </div>
              )}
              {drillItem.percentage !== undefined && (
                <div className="flex justify-between p-3 rounded-lg bg-muted/50 text-sm">
                  <span className="text-muted-foreground">Share:</span>
                  <span className="font-medium">{drillItem.percentage}%</span>
                </div>
              )}
              {drillItem.trend && (
                <div className="flex justify-between p-3 rounded-lg bg-muted/50 text-sm">
                  <span className="text-muted-foreground">MoM Trend:</span>
                  <span className="flex items-center gap-1 font-medium">
                    {trendIcon(drillItem.trend)}
                    {drillItem.trend === "up" ? "Increasing" : drillItem.trend === "down" ? "Decreasing" : "Stable"}
                  </span>
                </div>
              )}
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
        <Badge variant="outline" className={`${trendUp ? "text-emerald-600" : "text-red-600"} text-[10px]`}>
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
