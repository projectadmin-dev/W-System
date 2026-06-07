/* ═══════════════════════════════════════════════════════════
   BI DASHBOARD — MOCK DATA + PERIOD/BENCHMARK SELECTORS
   (single source of truth; all KPI cards & charts derive from here)
   ═══════════════════════════════════════════════════════════ */

export type PeriodPreset = "month" | "quarter" | "ytd" | "custom"
export type BenchmarkMode = "previous" | "last_year" | "custom" | "off"

export interface DateRange {
  from: string // ISO yyyy-mm-dd
  to: string
}

/* ─── COLORS ─── */
export const COLORS = {
  emerald: ["#10b981", "#34d399", "#059669", "#6ee7b7", "#0d9488"],
  red: ["#ef4444", "#f87171", "#dc2626", "#fca5a5", "#b91c1c"],
  blue: ["#3b82f6", "#60a5fa", "#2563eb", "#93c5fd", "#1d4ed8"],
  amber: ["#f59e0b", "#fbbf24", "#d97706", "#fcd34d", "#b45309"],
  purple: ["#a855f7", "#c084fc", "#9333ea", "#d8b4fe", "#7e22ce"],
}

export const PIE_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7",
  "#06b6d4", "#f97316", "#8b5cf6", "#ec4899", "#14b8a6",
]

/* ─── FORMATTERS ─── */
export const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(n)

export const fmtFull = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n)

export const fmtM = (n: number) => `Rp ${(n / 1_000_000).toFixed(0)} M`

export const fmtPct = (n: number) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`

/* ═══════════════════════════════════════════════════════════
   MONTHLY CASHFLOW SERIES (Jan 2025 → Apr 2026)
   Real Jan–Apr 2026 figures from PDF; 2025 synthesized for benchmark.
   ═══════════════════════════════════════════════════════════ */

export interface MonthPoint {
  key: string       // "2026-04"
  year: number
  month: number     // 1-12
  short: string     // "Apr"
  long: string      // "April 2026"
  inflow: number
  outflow: number
  balance: number   // running ending balance (computed)
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

/* opening balance chosen so end-of-Apr-2026 == 101,532,075.82 */
const OPENING_BALANCE = 1_019_969_553.82

const RAW_MONTHS: { y: number; m: number; inflow: number; outflow: number }[] = [
  { y: 2025, m: 1, inflow: 820_000_000, outflow: 990_000_000 },
  { y: 2025, m: 2, inflow: 900_000_000, outflow: 1_030_000_000 },
  { y: 2025, m: 3, inflow: 990_000_000, outflow: 730_000_000 },
  { y: 2025, m: 4, inflow: 1_050_000_000, outflow: 1_275_000_000 },
  { y: 2025, m: 5, inflow: 880_000_000, outflow: 910_000_000 },
  { y: 2025, m: 6, inflow: 1_100_000_000, outflow: 1_180_000_000 },
  { y: 2025, m: 7, inflow: 950_000_000, outflow: 1_000_000_000 },
  { y: 2025, m: 8, inflow: 1_020_000_000, outflow: 1_090_000_000 },
  { y: 2025, m: 9, inflow: 1_130_000_000, outflow: 870_000_000 },
  { y: 2025, m: 10, inflow: 990_000_000, outflow: 1_210_000_000 },
  { y: 2025, m: 11, inflow: 1_080_000_000, outflow: 1_150_000_000 },
  { y: 2025, m: 12, inflow: 1_240_000_000, outflow: 1_320_000_000 },
  { y: 2026, m: 1, inflow: 950_000_000, outflow: 1_150_000_000 },
  { y: 2026, m: 2, inflow: 1_050_000_000, outflow: 1_200_000_000 },
  { y: 2026, m: 3, inflow: 1_150_000_000, outflow: 850_000_000 },
  { y: 2026, m: 4, inflow: 1_221_375_976, outflow: 1_484_813_454.9 },
]

export const MONTHS: MonthPoint[] = (() => {
  let bal = OPENING_BALANCE
  return RAW_MONTHS.map((r) => {
    bal = bal + r.inflow - r.outflow
    return {
      key: `${r.y}-${String(r.m).padStart(2, "0")}`,
      year: r.y,
      month: r.m,
      short: MONTH_SHORT[r.m - 1]!,
      long: `${MONTH_LONG[r.m - 1]} ${r.y}`,
      inflow: r.inflow,
      outflow: r.outflow,
      balance: bal,
    }
  })
})()

const monthIndex = (key: string) => MONTHS.findIndex((m) => m.key === key)
const lastIdx = MONTHS.length - 1

/* ═══════════════════════════════════════════════════════════
   PERIOD WINDOW RESOLUTION
   ═══════════════════════════════════════════════════════════ */

function windowFromRange(range: DateRange): MonthPoint[] {
  const from = range.from.slice(0, 7)
  const to = range.to.slice(0, 7)
  const sel = MONTHS.filter((m) => m.key >= from && m.key <= to)
  return sel.length ? sel : [MONTHS[lastIdx]!]
}

export function resolveCurrentWindow(preset: PeriodPreset, custom?: DateRange): MonthPoint[] {
  switch (preset) {
    case "month":
      return [MONTHS[lastIdx]!]
    case "quarter":
      return MONTHS.slice(lastIdx - 2, lastIdx + 1)
    case "ytd": {
      const y = MONTHS[lastIdx]!.year
      return MONTHS.filter((m) => m.year === y)
    }
    case "custom":
      return custom ? windowFromRange(custom) : MONTHS.filter((m) => m.year === MONTHS[lastIdx]!.year)
  }
}

export function resolveBenchmarkWindow(
  mode: BenchmarkMode,
  current: MonthPoint[],
  custom?: DateRange,
): MonthPoint[] | null {
  if (mode === "off" || current.length === 0) return null
  if (mode === "custom") return custom ? windowFromRange(custom) : null

  if (mode === "previous") {
    const firstIdx = monthIndex(current[0]!.key)
    const len = current.length
    const start = firstIdx - len
    if (start < 0) return null
    return MONTHS.slice(start, firstIdx)
  }

  // last_year: shift each month back 12 months
  if (mode === "last_year") {
    const mapped = current
      .map((m) => MONTHS.find((x) => x.year === m.year - 1 && x.month === m.month))
      .filter((x): x is MonthPoint => !!x)
    return mapped.length ? mapped : null
  }
  return null
}

/* ═══════════════════════════════════════════════════════════
   PERIOD AGGREGATES (KPI numbers)
   ═══════════════════════════════════════════════════════════ */

export interface PeriodAgg {
  inflow: number
  outflow: number
  net: number
  endingBalance: number // stock at end of window
  months: MonthPoint[]
  asOf: string // long label of last month
}

export function aggregate(window: MonthPoint[]): PeriodAgg {
  const inflow = window.reduce((s, m) => s + m.inflow, 0)
  const outflow = window.reduce((s, m) => s + m.outflow, 0)
  const last = window[window.length - 1]!
  return {
    inflow,
    outflow,
    net: inflow - outflow,
    endingBalance: last.balance,
    months: window,
    asOf: last.long,
  }
}

export const deltaPct = (cur: number, base: number) =>
  base === 0 ? 0 : ((cur - base) / Math.abs(base)) * 100

/* ═══════════════════════════════════════════════════════════
   CASH INFLOW — revenue streams (base = YTD Jan–Apr 2026)
   ═══════════════════════════════════════════════════════════ */

export interface InflowStream {
  stream: string
  amount: number
  percentage: number
}

const CASH_INFLOW_BASE: InflowStream[] = [
  { stream: "Project Based - Project Revenue", amount: 2_966_470_705, percentage: 67.9 },
  { stream: "Project Based - Procurement Revenue", amount: 402_615_278, percentage: 9.2 },
  { stream: "MTN/R - WMS Revenue", amount: 344_360_000, percentage: 7.9 },
  { stream: "MTN/R - Manage Service", amount: 264_556_784, percentage: 6.1 },
  { stream: "MTN/R - Project Revenue", amount: 107_213_963.5, percentage: 2.5 },
  { stream: "Project Based - Website Revenue", amount: 75_949_500, percentage: 1.7 },
  { stream: "Project Based - MaaS Revenue", amount: 60_000_000, percentage: 1.4 },
  { stream: "Project Based - Lain Lain", amount: 58_500_000, percentage: 1.3 },
  { stream: "Project Based - WMS Revenue", amount: 46_512_000, percentage: 1.1 },
  { stream: "Pendapatan Non Operasional - Lain-Lain", amount: 33_872_074, percentage: 0.8 },
  { stream: "MTN/R - Website Revenue", amount: 9_819_816.5, percentage: 0.2 },
  { stream: "Project Based - Domain Revenue", amount: 750_000, percentage: 0.02 },
  { stream: "Surat Perintah Perjalanan Dinas", amount: 497_000, percentage: 0.01 },
  { stream: "Interest Income - Bank", amount: 258_855, percentage: 0.006 },
]

const INFLOW_BASE_SUM = CASH_INFLOW_BASE.reduce((s, r) => s + r.amount, 0)

/** scale streams so the total matches the selected period's inflow */
export function scaledInflow(periodInflow: number): InflowStream[] {
  const factor = periodInflow / INFLOW_BASE_SUM
  return CASH_INFLOW_BASE.map((r) => ({
    ...r,
    amount: r.amount * factor,
    percentage: (r.amount / INFLOW_BASE_SUM) * 100,
  }))
}

/* ═══════════════════════════════════════════════════════════
   CASH OUTFLOW — expense categories (top 15 of 56)
   ═══════════════════════════════════════════════════════════ */

export interface OutflowCategory {
  category: string
  amount: number
  trend: "up" | "down" | "same"
}

const CASH_OUTFLOW_BASE: OutflowCategory[] = [
  { category: "Gaji Pokok (Payroll/Salary)", amount: 1_466_527_378, trend: "up" },
  { category: "Fee/Bonus - Project Member", amount: 680_265_896, trend: "up" },
  { category: "3rd Party Expenses - Lain Lain", amount: 445_046_666, trend: "up" },
  { category: "Tunjangan Hari Raya (THR)", amount: 331_039_914, trend: "up" },
  { category: "Other COGS - Procurement", amount: 208_245_500, trend: "up" },
  { category: "Partner - PT. Jaya Integrasi Nusantara (JIN)", amount: 207_129_700, trend: "up" },
  { category: "Beban Pajak - PPN", amount: 176_531_622, trend: "up" },
  { category: "Partner - Artisun", amount: 145_871_560, trend: "up" },
  { category: "Partner - Plabs", amount: 134_110_000, trend: "up" },
  { category: "Surat Perintah Perjalanan Dinas", amount: 125_342_682, trend: "up" },
  { category: "Server/Hosting - Google Cloud Platform", amount: 124_897_210, trend: "up" },
  { category: "Other COGS - Google Workspace / GSuite", amount: 73_328_578, trend: "down" },
  { category: "Fee/Bonus - Marketing Fee External", amount: 67_702_500, trend: "down" },
  { category: "Fee/Bonus - Marketing Internal", amount: 60_643_250, trend: "down" },
  { category: "Biaya Entertainment", amount: 58_552_415, trend: "same" },
]

/* YTD 2026 outflow used to derive a period scaling factor */
const OUTFLOW_YTD = 4_684_813_454.9

export function scaledOutflow(periodOutflow: number): OutflowCategory[] {
  const factor = periodOutflow / OUTFLOW_YTD
  return CASH_OUTFLOW_BASE.map((r) => ({ ...r, amount: r.amount * factor }))
}

/* ═══════════════════════════════════════════════════════════
   A/R AGING — outstanding invoices (snapshot)
   ═══════════════════════════════════════════════════════════ */

export interface ARRow {
  company: string
  project: string
  invoice_date: string
  age: number
  nominal: number
}

export const AR_AGING: ARRow[] = [
  { company: "PT. Untung Bersama Sejahtera", project: "Scada Kalung UBS GOLD", invoice_date: "Apr 13, 2026", age: 17, nominal: 818_374_500 },
  { company: "BSM", project: "BSM Enterprise System", invoice_date: "Apr 20, 2026", age: 10, nominal: 67_751_220.47 },
  { company: "Annathaya", project: "Spa Management System Annathaya", invoice_date: "Mar 30, 2026", age: 31, nominal: 60_000_000 },
  { company: "Annathaya", project: "Spa Management System Annathaya", invoice_date: "Apr 30, 2026", age: 0, nominal: 60_000_000 },
  { company: "PT. Untung Bersama Sejahtera", project: "Chimney Monitoring UBS", invoice_date: "Feb 3, 2026", age: 86, nominal: 51_893_712 },
  { company: "PT. Bening Guru Semesta", project: "CSMS Manpower March Bening", invoice_date: "Apr 22, 2026", age: 8, nominal: 44_962_500 },
  { company: "Warren Brown", project: "Maintenance Website Warren Brown", invoice_date: "Apr 1, 2026", age: 29, nominal: 44_321_000 },
  { company: "DInez Montana", project: "Development ERP Prologue Wounderla…", invoice_date: "Mar 30, 2026", age: 31, nominal: 30_100_000 },
  { company: "DInez Montana", project: "Development ERP Prologue Wounderla…", invoice_date: "Apr 27, 2026", age: 3, nominal: 30_100_000 },
  { company: "PT. Bening Guru Semesta", project: "Additional CSMS Development Bening", invoice_date: "Apr 27, 2026", age: 3, nominal: 29_702_500 },
  { company: "PT. Untung Bersama Sejahtera", project: "POC Phase O2 System UBS", invoice_date: "Oct 16, 2025", age: 196, nominal: 28_230_000 },
  { company: "Royal Medika Pharmalab", project: "Additional Procurement & Installation…", invoice_date: "Apr 17, 2026", age: 13, nominal: 27_707_800 },
  { company: "PT. Habitat Untuk Jakarta", project: "Manpower Maintenance Habitat", invoice_date: "Dec 1, 2025", age: 150, nominal: 27_250_000 },
  { company: "PT Habitat Untuk Jakarta", project: "Manpower Maintenance Habitat", invoice_date: "Jan 1, 2026", age: 119, nominal: 27_250_000 },
]

/* ═══════════════════════════════════════════════════════════
   A/P AGING — outstanding vendor bills (snapshot)
   ═══════════════════════════════════════════════════════════ */

export interface APRow {
  vendor: string
  bill: string
  bill_date: string
  due_date: string
  age: number
  outstanding: number
}

export const AP_AGING: APRow[] = [
  { vendor: "PT Sumber Supplier Indah", bill: "BILL-2001", bill_date: "Apr 1, 2026", due_date: "Apr 15, 2026", age: 7, outstanding: 18_500_000 },
  { vendor: "PT Sumber Supplier Indah", bill: "BILL-2002", bill_date: "Mar 10, 2026", due_date: "Mar 25, 2026", age: 28, outstanding: 22_000_000 },
  { vendor: "CV Maju Bersama", bill: "BILL-2006", bill_date: "Mar 20, 2026", due_date: "Apr 5, 2026", age: 11, outstanding: 11_500_000 },
  { vendor: "PT Abadi Teknologi", bill: "BILL-2003", bill_date: "Feb 20, 2026", due_date: "Mar 5, 2026", age: 48, outstanding: 28_000_000 },
  { vendor: "PT Karya Mandiri", bill: "BILL-2007", bill_date: "Jan 15, 2026", due_date: "Jan 30, 2026", age: 83, outstanding: 9_000_000 },
  { vendor: "UD Sahabat Jaya", bill: "BILL-2008", bill_date: "Apr 18, 2026", due_date: "May 2, 2026", age: 0, outstanding: 10_700_000 },
]

/* ─── Aging bucket calculators (single source of truth) ─── */

export interface ARBuckets {
  total: number
  current: number
  d1_30: number
  d31_60: number
  d61_90: number
  d91_180: number
  over180: number
}

export function arBuckets(rows: ARRow[] = AR_AGING): ARBuckets {
  const b: ARBuckets = { total: 0, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_180: 0, over180: 0 }
  for (const r of rows) {
    b.total += r.nominal
    if (r.age <= 0) b.current += r.nominal
    else if (r.age <= 30) b.d1_30 += r.nominal
    else if (r.age <= 60) b.d31_60 += r.nominal
    else if (r.age <= 90) b.d61_90 += r.nominal
    else if (r.age <= 180) b.d91_180 += r.nominal
    else b.over180 += r.nominal
  }
  return b
}

export interface APBuckets {
  total: number
  current: number
  d1_30: number
  d31_60: number
  d61_90: number
  over90: number
}

export function apBuckets(rows: APRow[] = AP_AGING): APBuckets {
  const b: APBuckets = { total: 0, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, over90: 0 }
  for (const r of rows) {
    b.total += r.outstanding
    if (r.age <= 0) b.current += r.outstanding
    else if (r.age <= 30) b.d1_30 += r.outstanding
    else if (r.age <= 60) b.d31_60 += r.outstanding
    else if (r.age <= 90) b.d61_90 += r.outstanding
    else b.over90 += r.outstanding
  }
  return b
}

/* which aging bucket label a row falls into (for drill-down) */
export const arBucketLabel = (age: number) =>
  age <= 0 ? "Current" : age <= 30 ? "1–30 hari" : age <= 60 ? "31–60 hari"
    : age <= 90 ? "61–90 hari" : age <= 180 ? "91–180 hari" : ">180 hari"

export const apBucketLabel = (age: number) =>
  age <= 0 ? "Current" : age <= 30 ? "1–30 hari" : age <= 60 ? "31–60 hari"
    : age <= 90 ? "61–90 hari" : ">90 hari"

/* ═══════════════════════════════════════════════════════════
   SALES HEATMAP — monthly revenue by project category
   ═══════════════════════════════════════════════════════════ */

export interface HeatmapRow {
  category: string
  values: Record<string, number> // keyed by month short label
}

const HEATMAP_RAW: { category: string; jan: number; feb: number; mar: number; apr: number }[] = [
  { category: "Development", jan: 800_000_000, feb: 1_200_000_000, mar: 950_000_000, apr: 1_100_000_000 },
  { category: "Procurement", jan: 400_000_000, feb: 450_000_000, mar: 380_000_000, apr: 420_000_000 },
  { category: "Manpower", jan: 350_000_000, feb: 380_000_000, mar: 420_000_000, apr: 390_000_000 },
  { category: "MaaS", jan: 200_000_000, feb: 220_000_000, mar: 260_000_000, apr: 280_000_000 },
  { category: "Maintenance", jan: 150_000_000, feb: 160_000_000, mar: 175_000_000, apr: 185_000_000 },
  { category: "Consultation", jan: 100_000_000, feb: 120_000_000, mar: 110_000_000, apr: 130_000_000 },
]

const MONTH_KEY: Record<string, "jan" | "feb" | "mar" | "apr"> = {
  Jan: "jan", Feb: "feb", Mar: "mar", Apr: "apr",
}

/** build heatmap for the months present in the current window (2026 only) */
export function buildHeatmap(window: MonthPoint[]): { months: string[]; rows: HeatmapRow[] } {
  const months = window
    .filter((m) => m.year === 2026 && MONTH_KEY[m.short])
    .map((m) => m.short)
  const cols = months.length ? months : ["Jan", "Feb", "Mar", "Apr"]
  const rows: HeatmapRow[] = HEATMAP_RAW.map((r) => {
    const values: Record<string, number> = {}
    for (const c of cols) values[c] = r[MONTH_KEY[c]!]
    return { category: r.category, values }
  })
  return { months: cols, rows }
}

/* per-category breakdown for a heatmap cell drill-down (mock split) */
export function heatmapCellBreakdown(category: string, amount: number) {
  const splits: Record<string, { label: string; pct: number }[]> = {
    Development: [
      { label: "Web & ERP Build", pct: 0.45 },
      { label: "Mobile App", pct: 0.25 },
      { label: "Integration / API", pct: 0.18 },
      { label: "QA & UAT", pct: 0.12 },
    ],
    Procurement: [
      { label: "Hardware", pct: 0.5 },
      { label: "Licenses", pct: 0.3 },
      { label: "Logistics", pct: 0.2 },
    ],
    Manpower: [
      { label: "On-site Engineers", pct: 0.6 },
      { label: "Remote Support", pct: 0.4 },
    ],
    MaaS: [
      { label: "Monitoring", pct: 0.55 },
      { label: "Managed Hosting", pct: 0.45 },
    ],
    Maintenance: [
      { label: "Preventive", pct: 0.6 },
      { label: "Corrective", pct: 0.4 },
    ],
    Consultation: [
      { label: "Advisory", pct: 0.7 },
      { label: "Training", pct: 0.3 },
    ],
  }
  const parts = splits[category] ?? [{ label: "Revenue", pct: 1 }]
  return parts.map((p) => ({ label: p.label, amount: amount * p.pct }))
}
