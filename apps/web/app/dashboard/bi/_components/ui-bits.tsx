"use client"

import * as React from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import {
  Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle,
} from "@workspace/ui/components/drawer"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react"
import { fmt, fmtPct } from "../_lib/format"

/* ─────────────────────────── Sparkline ─────────────────────────── */
export function Sparkline({
  data, color = "#10b981", width = 96, height = 32,
}: { data: number[]; color?: string; width?: number; height?: number }) {
  const gid = React.useId()
  if (!data || data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const stepX = width / (data.length - 1)
  const pts = data.map((d, i) => {
    const x = i * stepX
    const y = height - ((d - min) / span) * (height - 4) - 2
    return [x, y] as const
  })
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")
  const area = `${line} L${width},${height} L0,${height} Z`
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1]![0]} cy={pts[pts.length - 1]![1]} r={2.5} fill={color} />
    </svg>
  )
}

/* ─────────────────────────── KPI Card ─────────────────────────── */
export function KPICard({
  label, value, sub, icon, deltaPct, accent = "emerald", spark, sparkColor, loading,
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  deltaPct?: number | null
  accent?: "emerald" | "red" | "blue" | "amber"
  spark?: number[]
  sparkColor?: string
  loading?: boolean
}) {
  const up = (deltaPct ?? 0) >= 0
  const accentBg: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    red: "bg-red-500/10 text-red-600 dark:text-red-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  }
  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28 mt-2" />
        </CardHeader>
        <CardContent className="pt-0"><Skeleton className="h-4 w-24" /></CardContent>
      </Card>
    )
  }
  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className={`pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent ${accent === "emerald" ? "via-emerald-500/60" : accent === "red" ? "via-red-500/60" : accent === "blue" ? "via-blue-500/60" : "via-amber-500/60"} to-transparent`} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription className="text-xs">{label}</CardDescription>
          <div className={`rounded-md p-1.5 ${accentBg[accent]}`}>{icon}</div>
        </div>
        <CardTitle className="text-2xl font-bold tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex items-end justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          {deltaPct != null && (
            <Badge variant="outline" className={`${up ? "text-emerald-600 border-emerald-500/30" : "text-red-600 border-red-500/30"} text-[10px] gap-0.5`}>
              {up ? <TrendingUpIcon className="h-3 w-3" /> : <TrendingDownIcon className="h-3 w-3" />}
              {fmtPct(deltaPct)}
            </Badge>
          )}
          <span className="text-muted-foreground">{sub}</span>
        </div>
        {spark && spark.length > 1 && (
          <div className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
            <Sparkline data={spark} color={sparkColor ?? "#10b981"} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ────────────────────── Aging Bucket Card ────────────────────── */
const TONE: Record<string, { ring: string; text: string; bar: string }> = {
  total: { ring: "hover:border-foreground/30", text: "text-foreground", bar: "bg-foreground/40" },
  current: { ring: "hover:border-emerald-500/40", text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" },
  low: { ring: "hover:border-amber-500/40", text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" },
  mid: { ring: "hover:border-orange-500/40", text: "text-orange-500", bar: "bg-orange-500" },
  high: { ring: "hover:border-red-500/40", text: "text-red-600 dark:text-red-500", bar: "bg-red-500" },
}

export function AgingBucketCard({
  label, value, tone, share, onClick,
}: {
  label: string
  value: string
  tone: keyof typeof TONE
  share?: number // 0..1 for mini-bar
  onClick?: () => void
}) {
  const t = TONE[tone]!
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border bg-card p-3.5 transition-all hover:shadow-sm ${t.ring} ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className={`mt-1 text-base font-bold tabular-nums ${t.text}`}>{value}</p>
      {share != null && (
        <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.min(100, share * 100)}%` }} />
        </div>
      )}
    </button>
  )
}

/* ─────────────────────────── Chart Card ─────────────────────────── */
export function ChartCard({
  title, subtitle, children, height, className, badge, right,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  height?: number
  className?: string
  badge?: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <Card className={`shadow-sm ${className ?? ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {subtitle && <CardDescription className="text-[11px]">{subtitle}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">{badge}{right}</div>
        </div>
      </CardHeader>
      <CardContent className="pt-0" style={height ? { height } : undefined}>
        {children}
      </CardContent>
    </Card>
  )
}

/* ─────────────────────────── Matrix Heatmap ─────────────────────────── */
function lerpColor(t: number) {
  // sequential scale: light slate → emerald → deep emerald
  const stops: [number, [number, number, number]][] = [
    [0, [241, 245, 249]],   // slate-100
    [0.4, [167, 243, 208]], // emerald-200
    [0.7, [52, 211, 153]],  // emerald-400
    [1, [5, 150, 105]],     // emerald-600
  ]
  let a = stops[0]!, b = stops[stops.length - 1]!
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i]![0] && t <= stops[i + 1]![0]) { a = stops[i]!; b = stops[i + 1]!; break }
  }
  const range = b[0] - a[0] || 1
  const lt = (t - a[0]) / range
  const c = a[1].map((ch, i) => Math.round(ch + (b[1][i]! - ch) * lt))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

export function Heatmap({
  months, rows, onCell,
}: {
  months: string[]
  rows: { category: string; values: Record<string, number> }[]
  onCell?: (category: string, month: string, amount: number) => void
}) {
  const all = rows.flatMap((r) => months.map((m) => r.values[m] ?? 0))
  const max = Math.max(...all, 1)
  const colTotals = months.map((m) => rows.reduce((s, r) => s + (r.values[m] ?? 0), 0))
  const compact = (n: number) => `${(n / 1_000_000).toFixed(0)}`

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: "4px" }}>
        <thead>
          <tr>
            <th className="text-left text-[11px] font-medium text-muted-foreground px-2 pb-1">Kategori</th>
            {months.map((m) => (
              <th key={m} className="text-center text-[11px] font-medium text-muted-foreground pb-1 min-w-[64px]">{m}</th>
            ))}
            <th className="text-right text-[11px] font-medium text-muted-foreground px-2 pb-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const rowTotal = months.reduce((s, m) => s + (r.values[m] ?? 0), 0)
            return (
              <tr key={r.category}>
                <td className="text-xs font-medium pr-2 whitespace-nowrap">{r.category}</td>
                {months.map((m) => {
                  const v = r.values[m] ?? 0
                  const t = v / max
                  const bg = lerpColor(t)
                  const light = t < 0.55
                  return (
                    <td key={m} className="p-0">
                      <button
                        type="button"
                        onClick={() => onCell?.(r.category, m, v)}
                        title={`${r.category} · ${m}`}
                        className="group relative h-12 w-full rounded-md transition-transform hover:scale-[1.04] hover:ring-2 hover:ring-emerald-500/50 focus:outline-none"
                        style={{ background: bg }}
                      >
                        <span className={`text-[10px] font-semibold tabular-nums ${light ? "text-slate-600" : "text-white"}`}>
                          {compact(v)}
                        </span>
                      </button>
                    </td>
                  )
                })}
                <td className="text-right text-xs font-semibold tabular-nums pl-2 whitespace-nowrap">{fmt(rowTotal)}</td>
              </tr>
            )
          })}
          <tr>
            <td className="text-[11px] font-semibold text-muted-foreground pr-2 pt-1">Total</td>
            {colTotals.map((c, i) => (
              <td key={i} className="text-center text-[10px] font-semibold tabular-nums text-muted-foreground pt-1">{compact(c)}</td>
            ))}
            <td className="text-right text-xs font-bold tabular-nums pl-2 pt-1">{fmt(colTotals.reduce((a, b) => a + b, 0))}</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 px-2">
        <span className="text-[10px] text-muted-foreground">Rendah</span>
        <div className="h-2 flex-1 max-w-[180px] rounded-full" style={{ background: `linear-gradient(to right, ${lerpColor(0)}, ${lerpColor(0.4)}, ${lerpColor(0.7)}, ${lerpColor(1)})` }} />
        <span className="text-[10px] text-muted-foreground">Tinggi</span>
        <span className="text-[10px] text-muted-foreground ml-auto">nilai dalam juta (Rp)</span>
      </div>
    </div>
  )
}

/* ─────────────────────────── Drill Drawer ─────────────────────────── */
export function DrillDrawer({
  open, onOpenChange, title, description, children,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="ml-auto h-full w-full max-w-md rounded-l-2xl rounded-r-none">
        <DrawerHeader className="border-b">
          <DrawerTitle className="flex items-center gap-2 text-base">{title}</DrawerTitle>
          {description && <DrawerDescription className="text-xs">{description}</DrawerDescription>}
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
