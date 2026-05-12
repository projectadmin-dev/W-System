"use client"

import { useState, useEffect } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/ui/components/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import { BarChart3, AlertTriangle, TrendingUp, Users } from "lucide-react"

interface DeptUtilization {
  dept: string
  employees: number
  utilization: number
  trend: "up" | "down" | "stable"
}

interface TrendEntry {
  dept: string
  mar: number
  apr: number
  may: number
}

const mockDepts: DeptUtilization[] = [
  { dept: "Engineering", employees: 12, utilization: 89, trend: "up" },
  { dept: "Backend", employees: 8, utilization: 102, trend: "up" },
  { dept: "QA", employees: 5, utilization: 68, trend: "stable" },
  { dept: "Design", employees: 4, utilization: 35, trend: "down" },
  { dept: "DevOps", employees: 3, utilization: 75, trend: "stable" },
  { dept: "Business Analyst", employees: 3, utilization: 60, trend: "up" },
]

const mockTrend: TrendEntry[] = [
  { dept: "Engineering", mar: 82, apr: 85, may: 89 },
  { dept: "Backend", mar: 94, apr: 98, may: 102 },
  { dept: "QA", mar: 70, apr: 68, may: 68 },
  { dept: "Design", mar: 55, apr: 45, may: 35 },
  { dept: "DevOps", mar: 72, apr: 74, may: 75 },
  { dept: "Business Analyst", mar: 50, apr: 55, may: 60 },
]

function utilizationLabel(pct: number): { label: string; color: string; badge: string } {
  if (pct > 100) return { label: "Overload", color: "text-red-600", badge: "bg-red-100 text-red-700" }
  if (pct >= 80) return { label: "High", color: "text-amber-600", badge: "bg-amber-100 text-amber-700" }
  if (pct >= 60) return { label: "Optimal", color: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" }
  return { label: "Available", color: "text-blue-600", badge: "bg-blue-100 text-blue-700" }
}

function trendIcon(t: DeptUtilization["trend"]) {
  if (t === "up") return <span className="text-red-500 text-xs font-bold">↑</span>
  if (t === "down") return <span className="text-blue-500 text-xs font-bold">↓</span>
  return <span className="text-muted-foreground text-xs">→</span>
}

function UtilBar({ pct }: { pct: number }) {
  const color = pct > 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : pct >= 60 ? "bg-emerald-500" : "bg-blue-400"
  return (
    <div className="flex items-center gap-3">
      <div className="h-3 rounded-full bg-muted overflow-hidden flex-1 max-w-[200px]">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-sm font-mono font-bold min-w-[44px] ${utilizationLabel(pct).color}`}>{pct}%</span>
    </div>
  )
}

export default function UtilizationReportPage() {
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState("05")
  const [year, setYear] = useState("2026")

  useEffect(() => { setTimeout(() => setLoading(false), 500) }, [])

  const totalEmployees = mockDepts.reduce((s, d) => s + d.employees, 0)
  const avgUtil = Math.round(mockDepts.reduce((s, d) => s + d.utilization * d.employees, 0) / totalEmployees)
  const overloadDepts = mockDepts.filter(d => d.utilization > 100).length
  const availableDepts = mockDepts.filter(d => d.utilization < 60).length

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utilization Report</h1>
          <p className="text-muted-foreground mt-1">Tingkat utilisasi manpower per departemen</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["01","02","03","04","05","06"].map(m => (
                <SelectItem key={m} value={m}>{new Date(2026, Number(m)-1).toLocaleString("id-ID", { month: "long" })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Company Avg</CardTitle></CardHeader><CardContent><div className={`text-3xl font-bold ${avgUtil > 100 ? "text-red-600" : avgUtil >= 80 ? "text-amber-600" : "text-emerald-600"}`}>{avgUtil}%</div><p className="text-xs text-muted-foreground mt-1">{totalEmployees} karyawan</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Overloaded</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-600">{mockDepts.reduce((s, d) => d.utilization > 100 ? s + d.employees : s, 0)}</div><p className="text-xs text-muted-foreground">{overloadDepts} departemen</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /> Optimal</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-emerald-600">{mockDepts.reduce((s, d) => d.utilization >= 60 && d.utilization <= 100 ? s + d.employees : s, 0)}</div><p className="text-xs text-muted-foreground">60% – 100%</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" /> Available</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-blue-600">{mockDepts.reduce((s, d) => d.utilization < 60 ? s + d.employees : s, 0)}</div><p className="text-xs text-muted-foreground">{availableDepts} departemen</p></CardContent></Card>
      </div>

      {/* Per Department Bars */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Utilisasi Per Departemen</CardTitle>
          <CardDescription>Mei 2026</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockDepts.sort((a, b) => b.utilization - a.utilization).map(dept => {
            const info = utilizationLabel(dept.utilization)
            return (
              <div key={dept.dept} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium w-40">{dept.dept}</span>
                    <span className="text-xs text-muted-foreground">{dept.employees} orang</span>
                    {trendIcon(dept.trend)}
                  </div>
                  <Badge className={`${info.badge} hover:${info.badge} text-xs`}>{info.label}</Badge>
                </div>
                <UtilBar pct={dept.utilization} />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Trend Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tren 3 Bulan Terakhir</CardTitle>
          <CardDescription>Mar – Mei 2026</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Departemen</TableHead>
                <TableHead className="text-center">Maret</TableHead>
                <TableHead className="text-center">April</TableHead>
                <TableHead className="text-center">Mei</TableHead>
                <TableHead className="text-center">Tren</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTrend.map(row => {
                const delta = row.may - row.mar
                return (
                  <TableRow key={row.dept}>
                    <TableCell className="font-medium">{row.dept}</TableCell>
                    <TableCell className="text-center font-mono text-sm">{row.mar}%</TableCell>
                    <TableCell className="text-center font-mono text-sm">{row.apr}%</TableCell>
                    <TableCell className={`text-center font-mono text-sm font-bold ${utilizationLabel(row.may).color}`}>{row.may}%</TableCell>
                    <TableCell className="text-center">
                      <span className={`text-sm font-semibold ${delta > 0 ? "text-red-600" : delta < 0 ? "text-blue-600" : "text-muted-foreground"}`}>
                        {delta > 0 ? `+${delta}` : delta}%
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
