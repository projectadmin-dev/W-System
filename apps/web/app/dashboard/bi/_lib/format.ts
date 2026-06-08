/* shared formatters, colors & filter types (data-agnostic) */

export type PeriodPreset = "month" | "quarter" | "ytd" | "custom"
export type BenchmarkMode = "previous" | "last_year" | "custom" | "off"

export interface DateRange {
  from: string // "YYYY-MM"
  to: string
}

export const COLORS = {
  emerald: ["#10b981", "#34d399", "#059669", "#6ee7b7", "#0d9488"],
  red: ["#ef4444", "#f87171", "#dc2626", "#fca5a5", "#b91c1c"],
  blue: ["#3b82f6", "#60a5fa", "#2563eb", "#93c5fd", "#1d4ed8"],
  amber: ["#f59e0b", "#fbbf24", "#d97706", "#fcd34d", "#b45309"],
  purple: ["#a855f7", "#c084fc", "#9333ea", "#d8b4fe", "#7e22ce"],
}

export const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(n || 0)

export const fmtFull = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n || 0)

export const fmtM = (n: number) => `Rp ${((n || 0) / 1_000_000).toFixed(0)} M`

export const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`

export const deltaPct = (cur: number, base: number) =>
  base === 0 ? 0 : ((cur - base) / Math.abs(base)) * 100
