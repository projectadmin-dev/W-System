"use client"

import * as React from "react"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/ui/components/select"
import { Badge } from "@workspace/ui/components/badge"
import { CalendarRangeIcon, GitCompareArrowsIcon } from "lucide-react"
import type { PeriodPreset, BenchmarkMode, DateRange } from "../_lib/format"

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "ytd", label: "YTD" },
  { id: "custom", label: "Custom" },
]

export function PeriodBar({
  preset, onPreset, customRange, onCustomRange,
  benchmark, onBenchmark, benchCustom, onBenchCustom,
}: {
  preset: PeriodPreset
  onPreset: (p: PeriodPreset) => void
  customRange: DateRange
  onCustomRange: (r: DateRange) => void
  benchmark: BenchmarkMode
  onBenchmark: (b: BenchmarkMode) => void
  benchCustom: DateRange
  onBenchCustom: (r: DateRange) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Current period */}
      <div className="flex items-center gap-2">
        <CalendarRangeIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex rounded-lg border bg-muted p-1 text-xs">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => onPreset(p.id)}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                preset === p.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {preset === "custom" && (
        <div className="flex items-center gap-1.5 text-xs">
          <input
            type="date"
            value={customRange.from}
            onChange={(e) => onCustomRange({ ...customRange, from: e.target.value })}
            className="rounded-md border bg-card px-2 py-1.5"
          />
          <span className="text-muted-foreground">→</span>
          <input
            type="date"
            value={customRange.to}
            onChange={(e) => onCustomRange({ ...customRange, to: e.target.value })}
            className="rounded-md border bg-card px-2 py-1.5"
          />
        </div>
      )}

      <div className="h-6 w-px bg-border" />

      {/* Benchmark */}
      <div className="flex items-center gap-2">
        <GitCompareArrowsIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground hidden sm:inline">vs</span>
        <Select value={benchmark} onValueChange={(v) => onBenchmark(v as BenchmarkMode)}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="previous">Periode sebelumnya</SelectItem>
            <SelectItem value="last_year">Tahun lalu (YoY)</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
            <SelectItem value="off">Tanpa benchmark</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {benchmark === "custom" && (
        <div className="flex items-center gap-1.5 text-xs">
          <input
            type="date"
            value={benchCustom.from}
            onChange={(e) => onBenchCustom({ ...benchCustom, from: e.target.value })}
            className="rounded-md border bg-card px-2 py-1.5"
          />
          <span className="text-muted-foreground">→</span>
          <input
            type="date"
            value={benchCustom.to}
            onChange={(e) => onBenchCustom({ ...benchCustom, to: e.target.value })}
            className="rounded-md border bg-card px-2 py-1.5"
          />
        </div>
      )}

      {benchmark !== "off" && (
        <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
          benchmarking aktif
        </Badge>
      )}
    </div>
  )
}
