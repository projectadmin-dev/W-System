/* client-side fetch + response types for the BI dashboard API */
import type { PeriodPreset, BenchmarkMode, DateRange } from "./format"

export interface ARRow {
  company: string
  project: string
  invoice_date: string | null
  age: number
  nominal: number
}
export interface APRow {
  vendor: string
  bill: string
  bill_date: string | null
  due_date: string | null
  age: number
  outstanding: number
}
export interface InflowStream {
  stream: string
  amount: number
  percentage: number
}
export interface OutflowCategory {
  category: string
  amount: number
  trend: "up" | "down" | "same"
}
export interface CashflowPoint {
  label: string
  inflow: number
  outflow: number
  balance: number
  benchBalance?: number
}
export interface ARBuckets {
  total: number; current: number; d1_30: number; d31_60: number
  d61_90: number; d91_180: number; over180: number
}
export interface APBuckets {
  total: number; current: number; d1_30: number; d31_60: number
  d61_90: number; over90: number
}
export interface KPIs {
  inflow: number; outflow: number; net: number; endingBalance: number
  bench: { inflow: number; outflow: number; net: number; endingBalance: number } | null
}

export interface HeatStream {
  stream: string
  values: Record<string, number>
}
export interface HeatRow {
  category: string
  values: Record<string, number>
  streams: HeatStream[]
}

export interface BIData {
  meta: {
    asOf: string
    benchAsOf: string | null
    current: { months: string[]; from: string; to: string }
    benchmark: { months: string[]; from: string; to: string } | null
  }
  kpis: KPIs
  cashflow: CashflowPoint[]
  inflowStreams: InflowStream[]
  outflowCategories: OutflowCategory[]
  sales: { total: number; months: { key: string; short: string; amount: number }[] }
  heatmap: { months: string[]; rows: HeatRow[] }
  arAging: { buckets: ARBuckets; rows: ARRow[]; asOf: string; bench: ARBuckets | null; benchAsOf: string | null }
  apAging: { buckets: APBuckets; rows: APRow[]; asOf: string; bench: APBuckets | null; benchAsOf: string | null }
}

export interface BIFilters {
  preset: PeriodPreset
  custom: DateRange
  benchmark: BenchmarkMode
  benchCustom: DateRange
}

export async function fetchBIData(f: BIFilters, signal?: AbortSignal): Promise<BIData> {
  const q = new URLSearchParams({
    period: f.preset,
    benchmark: f.benchmark,
    from: f.custom.from,
    to: f.custom.to,
    bfrom: f.benchCustom.from,
    bto: f.benchCustom.to,
  })
  const res = await fetch(`/api/finance/bi-dashboard?${q.toString()}`, { signal, cache: "no-store" })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || `Request failed (${res.status})`)
  }
  const json = await res.json()
  return json.data as BIData
}
