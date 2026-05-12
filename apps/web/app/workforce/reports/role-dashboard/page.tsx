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
import {
  Briefcase, Layers, Code2, Users, BarChart3,
  FolderKanban, TrendingUp, AlertTriangle, Clock, CheckCircle2,
} from "lucide-react"

type Role = "Commercial" | "PM" | "Developer" | "QA" | "HR" | "Executive"

interface KpiCard {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color: string
}

const roleKpi: Record<Role, KpiCard[]> = {
  Commercial: [
    { label: "Active Clients", value: 8, icon: <Briefcase className="h-4 w-4" />, color: "text-blue-600" },
    { label: "Open Quotations", value: 5, sub: "Awaiting response", icon: <FolderKanban className="h-4 w-4" />, color: "text-amber-600" },
    { label: "Contracts Won", value: 12, sub: "YTD 2026", icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-600" },
    { label: "Risk Projects", value: 2, sub: "Need attention", icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-600" },
  ],
  PM: [
    { label: "Active Sprints", value: 6, icon: <Layers className="h-4 w-4" />, color: "text-blue-600" },
    { label: "Team Size", value: 24, sub: "assigned resources", icon: <Users className="h-4 w-4" />, color: "text-violet-600" },
    { label: "Blocked Tasks", value: 7, sub: "Need resolution", icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-600" },
    { label: "Delivery Rate", value: "83%", sub: "this sprint", icon: <TrendingUp className="h-4 w-4" />, color: "text-emerald-600" },
  ],
  Developer: [
    { label: "My Tasks", value: 5, sub: "assigned to me", icon: <Code2 className="h-4 w-4" />, color: "text-blue-600" },
    { label: "Due This Week", value: 3, sub: "Urgent", icon: <Clock className="h-4 w-4" />, color: "text-amber-600" },
    { label: "Hours Logged", value: "32h", sub: "this week", icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-600" },
    { label: "Completion Rate", value: "78%", sub: "this sprint", icon: <TrendingUp className="h-4 w-4" />, color: "text-violet-600" },
  ],
  QA: [
    { label: "Test Cases", value: 48, sub: "active", icon: <CheckCircle2 className="h-4 w-4" />, color: "text-blue-600" },
    { label: "Bugs Found", value: 11, sub: "this sprint", icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-600" },
    { label: "Pass Rate", value: "91%", sub: "test results", icon: <TrendingUp className="h-4 w-4" />, color: "text-emerald-600" },
    { label: "Pending Review", value: 4, sub: "awaiting QA", icon: <Clock className="h-4 w-4" />, color: "text-amber-600" },
  ],
  HR: [
    { label: "Total Employees", value: 65, icon: <Users className="h-4 w-4" />, color: "text-blue-600" },
    { label: "Overloaded", value: 12, sub: "Allocation > 100%", icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-600" },
    { label: "Utilization Avg", value: "78%", sub: "company average", icon: <BarChart3 className="h-4 w-4" />, color: "text-amber-600" },
    { label: "Pending Approvals", value: 8, sub: "timesheet / leave", icon: <Clock className="h-4 w-4" />, color: "text-violet-600" },
  ],
  Executive: [
    { label: "Projects Active", value: 24, sub: "+4 this month", icon: <FolderKanban className="h-4 w-4" />, color: "text-blue-600" },
    { label: "Utilization", value: "78%", sub: "company-wide", icon: <BarChart3 className="h-4 w-4" />, color: "text-amber-600" },
    { label: "Revenue Pipeline", value: "Rp 2.4M", sub: "active contracts", icon: <TrendingUp className="h-4 w-4" />, color: "text-emerald-600" },
    { label: "Delayed Tasks", value: 18, sub: "Need attention", icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-600" },
  ],
}

const roleAccess = [
  { role: "Commercial", access: "Project Business Visibility", modules: ["Project Dashboard", "Client & Contract", "Milestone", "Risk Overview"], icon: <Briefcase className="h-4 w-4" /> },
  { role: "PM / PIC", access: "Delivery & Resource Management", modules: ["Sprint Board", "Task Management", "Workload Monitoring", "Resource Allocation"], icon: <Layers className="h-4 w-4" /> },
  { role: "Developer", access: "Task Execution & Worklog", modules: ["My Tasks", "Sprint Board", "Timesheet", "Work Item"], icon: <Code2 className="h-4 w-4" /> },
  { role: "QA", access: "Testing & Quality", modules: ["Task Management", "Sprint Board", "Timesheet", "Bug Tracking"], icon: <CheckCircle2 className="h-4 w-4" /> },
  { role: "HR", access: "Workforce Monitoring", modules: ["Workforce Dashboard", "Workload Monitoring", "Utilization Report", "Timesheet"], icon: <Users className="h-4 w-4" /> },
  { role: "Executive", access: "Executive KPI & Summary", modules: ["Executive Dashboard", "Project Dashboard", "Utilization Report", "All Reports"], icon: <BarChart3 className="h-4 w-4" /> },
]

const roleIcons: Record<Role, React.ReactNode> = {
  Commercial: <Briefcase className="h-4 w-4" />,
  PM: <Layers className="h-4 w-4" />,
  Developer: <Code2 className="h-4 w-4" />,
  QA: <CheckCircle2 className="h-4 w-4" />,
  HR: <Users className="h-4 w-4" />,
  Executive: <BarChart3 className="h-4 w-4" />,
}

export default function RoleDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<Role>("Executive")

  useEffect(() => { setTimeout(() => setLoading(false), 400) }, [])

  const kpis = roleKpi[role]

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Role Dashboard</h1>
          <p className="text-muted-foreground mt-1">KPI dan akses modul berdasarkan role pengguna</p>
        </div>
        <Select value={role} onValueChange={v => setRole(v as Role)}>
          <SelectTrigger className="w-[160px]">
            <div className="flex items-center gap-2">{roleIcons[role]}<SelectValue /></div>
          </SelectTrigger>
          <SelectContent>
            {(["Commercial", "PM", "Developer", "QA", "HR", "Executive"] as Role[]).map(r => (
              <SelectItem key={r} value={r}>
                <div className="flex items-center gap-2">{roleIcons[r]}{r}</div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Role info banner */}
      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 mb-1">
          {roleIcons[role]}
          <span className="font-semibold">{role}</span>
          <span className="text-muted-foreground">—</span>
          <span className="text-sm text-muted-foreground">{roleAccess.find(r => r.role === role || r.role === `${role} / PIC`)?.access}</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {roleAccess.find(r => r.role === role || r.role === `${role} / PIC` || (role === "PM" && r.role === "PM / PIC"))?.modules.map(m => (
            <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
              <div className={kpi.color}>{kpi.icon}</div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
              {kpi.sub && <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role Access Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Access Matrix</CardTitle>
          <CardDescription>Hak akses modul per role pengguna dalam sistem</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Main Access</TableHead>
                <TableHead>Module Akses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roleAccess.map(r => (
                <TableRow key={r.role} className={role === r.role || (role === "PM" && r.role === "PM / PIC") ? "bg-primary/5" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      {r.icon} {r.role}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.access}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.modules.map(m => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
