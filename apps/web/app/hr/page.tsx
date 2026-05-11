"use client"

import { useState, useEffect } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import {
  Users, Building2, Briefcase, Clock, CalendarDays, ChevronRight,
  Settings, FileText, DollarSign, ClipboardList,
} from "lucide-react"
import Link from "next/link"

interface DashboardStats {
  totalEmployees: number
  attendanceToday: number
  openPositions: number
  activeDepartments: number
}

interface RecentActivity {
  id: string
  employee: string
  action: string
  time: string
  status: "present" | "late" | "absent"
}

const mockStats: DashboardStats = {
  totalEmployees: 48,
  attendanceToday: 42,
  openPositions: 5,
  activeDepartments: 8,
}

const mockActivities: RecentActivity[] = [
  { id: "1", employee: "Ahmad Rizky", action: "Check-in", time: "08:02", status: "present" },
  { id: "2", employee: "Siti Nurhaliza", action: "Check-in", time: "08:15", status: "present" },
  { id: "3", employee: "Budi Santoso", action: "Check-in", time: "09:22", status: "late" },
  { id: "4", employee: "Dewi Lestari", action: "Check-in", time: "08:05", status: "present" },
  { id: "5", employee: "Rendi Pratama", action: "Tidak Hadir", time: "-", status: "absent" },
]

const quickLinks = [
  { title: "Master Data", description: "Entity, User, Org Structure", href: "/hr/master/entity", icon: Users, color: "text-blue-500" },
  { title: "Configuration", description: "Shifts, BPJS, PPh21, UMR", href: "/hr/config/shifts", icon: Settings, color: "text-amber-500" },
  { title: "Salary & Benefits", description: "Grades, Components, THR", href: "/hr/config/job-grades", icon: DollarSign, color: "text-emerald-500" },
  { title: "Attendance", description: "Dashboard, Logs, Approvals", href: "/hr/attendance", icon: Clock, color: "text-purple-500" },
  { title: "Contracts", description: "Employee Contracts & Documents", href: "/hr/master/contracts", icon: FileText, color: "text-indigo-500" },
  { title: "Reports", description: "Payroll & Attendance Reports", href: "/hr/reports/payroll", icon: ClipboardList, color: "text-rose-500" },
]

export default function HrDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => {
      setStats(mockStats)
      setActivities(mockActivities)
      setLoading(false)
    }, 500)
  }, [])

  if (loading) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">HR Management</h1>
        <p className="text-muted-foreground">Overview modul Human Resources</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Karyawan</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Karyawan aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kehadiran Hari Ini</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.attendanceToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats ? Math.round((stats.attendanceToday / stats.totalEmployees) * 100) : 0}% hadir
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jabatan Terbuka</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openPositions}</div>
            <p className="text-xs text-muted-foreground">Posisi vacant</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departemen Aktif</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeDepartments}</div>
            <p className="text-xs text-muted-foreground">Departemen terdaftar</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <link.icon className={`h-5 w-5 ${link.color}`} />
                <div className="flex-1">
                  <CardTitle className="text-sm font-medium">{link.title}</CardTitle>
                  <CardDescription className="text-xs">{link.description}</CardDescription>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aktivitas Kehadiran Terbaru</CardTitle>
          <CardDescription>5 aktivitas terakhir hari ini</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activities.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {a.employee.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{a.employee}</p>
                    <p className="text-xs text-muted-foreground">{a.action} - {a.time}</p>
                  </div>
                </div>
                <Badge
                  className={
                    a.status === "present" ? "bg-emerald-100 text-emerald-700" :
                    a.status === "late" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }
                >
                  {a.status === "present" ? "Hadir" : a.status === "late" ? "Terlambat" : "Tidak Hadir"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
