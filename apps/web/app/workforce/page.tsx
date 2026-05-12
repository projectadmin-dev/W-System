"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import { Progress } from "@workspace/ui/components/progress"
import {
  FolderKanban, TrendingUp, AlertTriangle, Clock,
  Users, BarChart3, Calendar, Layers, ArrowRight,
} from "lucide-react"

interface TopEmployee {
  id: string
  name: string
  department: string
  activeTasks: number
  allocation: number
  status: "Overload" | "Normal" | "Available"
}

const mockTopEmployees: TopEmployee[] = [
  { id: "EMP-001", name: "Andi Pratama", department: "Engineering", activeTasks: 8, allocation: 120, status: "Overload" },
  { id: "EMP-005", name: "Eko Prasetyo", department: "Backend", activeTasks: 9, allocation: 135, status: "Overload" },
  { id: "EMP-002", name: "Budi Santoso", department: "Engineering", activeTasks: 6, allocation: 85, status: "Normal" },
  { id: "EMP-006", name: "Fani Susanti", department: "Backend", activeTasks: 5, allocation: 80, status: "Normal" },
  { id: "EMP-003", name: "Citra Lestari", department: "QA", activeTasks: 3, allocation: 45, status: "Available" },
]

const quickLinks = [
  { label: "Workload Monitoring", href: "/workforce/workload", icon: <Users className="h-5 w-5" />, desc: "Monitor beban kerja karyawan" },
  { label: "Resource Allocation", href: "/workforce/resources", icon: <Layers className="h-5 w-5" />, desc: "Alokasi per proyek" },
  { label: "Timesheet", href: "/workforce/timesheet", icon: <Calendar className="h-5 w-5" />, desc: "Log aktivitas harian" },
  { label: "Project Dashboard", href: "/workforce/projects", icon: <FolderKanban className="h-5 w-5" />, desc: "Visibilitas proyek" },
]

function statusBadge(status: TopEmployee["status"]) {
  const map: Record<string, string> = {
    Overload: "bg-red-100 text-red-700",
    Normal: "bg-emerald-100 text-emerald-700",
    Available: "bg-blue-100 text-blue-700",
  }
  return <Badge className={`${map[status]} hover:${map[status]}`}>{status}</Badge>
}

function allocationBar(pct: number) {
  const color = pct > 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-sm font-mono">{pct}%</span>
    </div>
  )
}

export default function WorkforceDashboardPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => { setTimeout(() => setLoading(false), 400) }, [])

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workforce Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview utilisasi manpower dan visibilitas proyek — PT. Wira Inovasi Teknologi</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">24</div>
            <p className="text-xs text-emerald-600 mt-1">+4 project bulan ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">78%</div>
            <p className="text-xs text-amber-600 mt-1">Need balancing</p>
            <Progress value={78} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overloaded Employees</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">12</div>
            <p className="text-xs text-red-600 mt-1">Allocation &gt; 100%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delayed Tasks</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">18</div>
            <p className="text-xs text-orange-600 mt-1">Need PM Attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map(link => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">{link.icon}</div>
                  <span className="font-semibold text-sm">{link.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{link.desc}</p>
                <div className="flex items-center gap-1 mt-3 text-xs text-primary font-medium">
                  Lihat <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Top Workload Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Top Workload — Karyawan Terpadat</CardTitle>
            <CardDescription>5 karyawan dengan allocation tertinggi saat ini</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/workforce/workload">Lihat Semua <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Active Tasks</TableHead>
                <TableHead>Allocation</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTopEmployees.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell className="text-muted-foreground">{emp.department}</TableCell>
                  <TableCell>{emp.activeTasks}</TableCell>
                  <TableCell>{allocationBar(emp.allocation)}</TableCell>
                  <TableCell>{statusBadge(emp.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
