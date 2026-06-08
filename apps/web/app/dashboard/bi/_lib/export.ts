/* Export the loaded dashboard data to a multi-sheet .xlsx workbook (client-side) */
import * as XLSX from "xlsx"
import type { BIData } from "./api"

const num = (n: number) => Math.round((n || 0) * 100) / 100

export function exportDashboardXlsx(data: BIData, periodLabel: string) {
  const wb = XLSX.utils.book_new()
  const k = data.kpis
  const b = k.bench

  /* Summary */
  const summary: (string | number)[][] = [
    ["Executive Financial Dashboard"],
    ["Period", `${data.meta.current.from} → ${data.meta.current.to}`],
    ["Benchmark", data.meta.benchmark ? `${data.meta.benchmark.from} → ${data.meta.benchmark.to}` : "—"],
    ["Aging as of", data.meta.asOf],
    [],
    ["KPI", "Current", "Benchmark", "Δ %"],
    ...(["endingBalance", "inflow", "outflow", "net"] as const).map((key) => {
      const label = { endingBalance: "Ending Balance", inflow: "Cash Inflow", outflow: "Cash Outflow", net: "Net Cash Flow" }[key]
      const cur = num(k[key])
      const base = b ? num(b[key]) : null
      const delta = b && base ? Math.round(((k[key] - b[key]) / Math.abs(b[key])) * 1000) / 10 : null
      return [label, cur, base ?? "—", delta ?? "—"]
    }),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary")

  /* Cashflow */
  const cf: (string | number)[][] = [
    ["Month", "Inflow", "Outflow", "Ending Balance", "Benchmark Balance"],
    ...data.cashflow.map((p) => [p.label, num(p.inflow), num(p.outflow), num(p.balance), p.benchBalance != null ? num(p.benchBalance) : "—"]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cf), "Cashflow")

  /* Inflow streams */
  const inflow: (string | number)[][] = [
    ["Revenue Stream", "Amount", "Share %"],
    ...data.inflowStreams.map((r) => [r.stream, num(r.amount), Math.round(r.percentage * 100) / 100]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inflow), "Cash Inflow")

  /* Outflow categories */
  const outflow: (string | number)[][] = [
    ["Expense Category", "Amount", "Trend"],
    ...data.outflowCategories.map((r) => [r.category, num(r.amount), r.trend]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(outflow), "Cash Outflow")

  /* AR aging */
  const arB = data.arAging.buckets
  const ar: (string | number)[][] = [
    ["A/R Aging — as of", data.arAging.asOf],
    ["Total", "Current", "1-30", "31-60", "61-90", "91-180", ">180"],
    [num(arB.total), num(arB.current), num(arB.d1_30), num(arB.d31_60), num(arB.d61_90), num(arB.d91_180), num(arB.over180)],
    [],
    ["Company", "Project / Invoice", "Invoice Date", "Age (days)", "Outstanding"],
    ...data.arAging.rows.map((r) => [r.company, r.project, r.invoice_date ?? "—", r.age, num(r.nominal)]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ar), "AR Aging")

  /* AP aging */
  const apB = data.apAging.buckets
  const ap: (string | number)[][] = [
    ["A/P Aging — as of", data.apAging.asOf],
    ["Total", "Current", "1-30", "31-60", "61-90", ">90"],
    [num(apB.total), num(apB.current), num(apB.d1_30), num(apB.d31_60), num(apB.d61_90), num(apB.over90)],
    [],
    ["Vendor", "Bill", "Bill Date", "Due Date", "Age (days)", "Outstanding"],
    ...data.apAging.rows.map((r) => [r.vendor, r.bill, r.bill_date ?? "—", r.due_date ?? "—", r.age, num(r.outstanding)]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ap), "AP Aging")

  /* Heatmap (category × month matrix) */
  const months = data.heatmap.months
  const heat: (string | number)[][] = [
    ["Category", ...months, "Total"],
    ...data.heatmap.rows.map((r) => {
      const vals = months.map((m) => num(r.values[m] || 0))
      return [r.category, ...vals, num(vals.reduce((s, v) => s + v, 0))]
    }),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(heat), "Sales Heatmap")

  const safe = periodLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase()
  XLSX.writeFile(wb, `executive-financial-${safe}-${data.meta.asOf}.xlsx`)
}
