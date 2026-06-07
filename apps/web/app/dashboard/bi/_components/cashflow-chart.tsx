"use client"

import * as React from "react"
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Brush,
} from "recharts"
import { COLORS, fmt } from "../_lib/format"

export interface CashflowRow {
  label: string
  inflow: number
  outflow: number
  balance: number
  benchInflow?: number
  benchOutflow?: number
  benchBalance?: number
}

type SeriesKey = "inflow" | "outflow" | "balance"
type ChartType = "area" | "bar" | "composed"

const SERIES: { key: SeriesKey; name: string; color: string }[] = [
  { key: "inflow", name: "Inflow", color: COLORS.emerald[0]! },
  { key: "outflow", name: "Outflow", color: COLORS.red[0]! },
  { key: "balance", name: "Ending Balance", color: COLORS.blue[0]! },
]

function Tip({ active, payload, label, hasBench }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-card/95 backdrop-blur p-3 shadow-lg text-xs min-w-[180px]">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload
        .filter((p: any) => !p.dataKey?.startsWith("bench"))
        .map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-3 py-0.5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke }} />
              {p.name}
            </span>
            <span className="font-medium tabular-nums">{fmt(p.value)}</span>
          </div>
        ))}
      {hasBench && payload.some((p: any) => p.dataKey === "benchBalance") && (
        <div className="mt-1 border-t pt-1 text-[10px] text-muted-foreground">
          Benchmark balance: {fmt(payload.find((p: any) => p.dataKey === "benchBalance")?.value ?? 0)}
        </div>
      )}
    </div>
  )
}

export function CashflowChart({ data, hasBenchmark }: { data: CashflowRow[]; hasBenchmark: boolean }) {
  const [type, setType] = React.useState<ChartType>("composed")
  const [hidden, setHidden] = React.useState<Set<SeriesKey>>(new Set())

  const toggle = (k: SeriesKey) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  const vis = (k: SeriesKey) => !hidden.has(k)
  const showBrush = data.length > 4

  return (
    <div className="flex h-full flex-col">
      {/* controls */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {SERIES.map((s) => (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`flex items-center gap-1.5 text-[11px] font-medium transition-opacity ${vis(s.key) ? "opacity-100" : "opacity-35"}`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex rounded-md border bg-muted p-0.5 text-[10px]">
          {(["area", "bar", "composed"] as ChartType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded px-2 py-1 font-medium capitalize transition-colors ${type === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="cf-inflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.emerald[0]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.emerald[0]} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cf-outflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.red[0]} stopOpacity={0.25} />
                <stop offset="95%" stopColor={COLORS.red[0]} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} className="fill-muted-foreground" />
            <YAxis tickFormatter={(v) => fmt(v)} fontSize={10} tickLine={false} axisLine={false} width={64} className="fill-muted-foreground" />
            <RechartsTooltip
              content={<Tip hasBench={hasBenchmark} />}
              cursor={{ stroke: COLORS.blue[2], strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <ReferenceLine y={0} stroke="currentColor" strokeOpacity={0.35} className="text-muted-foreground" />

            {/* INFLOW */}
            {vis("inflow") && (type === "area" || type === "composed") && (
              <Area type="monotone" dataKey="inflow" name="Inflow" stroke={COLORS.emerald[0]} fill="url(#cf-inflow)" strokeWidth={2} animationDuration={600} />
            )}
            {vis("inflow") && type === "bar" && (
              <Bar dataKey="inflow" name="Inflow" fill={COLORS.emerald[0]} radius={[4, 4, 0, 0]} barSize={14} animationDuration={600} />
            )}

            {/* OUTFLOW */}
            {vis("outflow") && (type === "area" || type === "composed") && (
              <Area type="monotone" dataKey="outflow" name="Outflow" stroke={COLORS.red[0]} fill="url(#cf-outflow)" strokeWidth={2} animationDuration={600} />
            )}
            {vis("outflow") && type === "bar" && (
              <Bar dataKey="outflow" name="Outflow" fill={COLORS.red[0]} radius={[4, 4, 0, 0]} barSize={14} animationDuration={600} />
            )}

            {/* ENDING BALANCE — always a line */}
            {vis("balance") && (
              <Line type="monotone" dataKey="balance" name="Ending Balance" stroke={COLORS.blue[0]} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} animationDuration={700} />
            )}

            {/* BENCHMARK overlay (dashed) */}
            {hasBenchmark && vis("balance") && (
              <Line type="monotone" dataKey="benchBalance" name="Balance (benchmark)" stroke={COLORS.blue[3]} strokeWidth={2} strokeDasharray="5 4" dot={false} animationDuration={700} />
            )}

            {showBrush && (
              <Brush dataKey="label" height={18} travellerWidth={8} stroke={COLORS.blue[2]} className="text-[10px]" />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
