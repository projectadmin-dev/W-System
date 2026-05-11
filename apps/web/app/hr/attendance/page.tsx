"use client"

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import { Badge } from "@workspace/ui/components/badge"
import { Progress } from "@workspace/ui/components/progress"
import Link from "next/link"
import { useState, useEffect } from "react"
import {
  Users, Clock, MapPin, AlertTriangle, CheckCircle2,
  Calendar, ArrowRight, Settings, FileCheck,
} from "lucide-react"

// Types
interface AttendanceStat {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  bg: string
}

interface TodayLog {
  id: string
  employee_name: string
  employee_code: string
  department: string
  checkin_time: string
  status: 'present' | 'late' | 'absent' | 'early_leave' | 'off_day'
  approved_status: 'pending' | 'approved' | 'rejected'
}

export default function AttendanceDashboardPage() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    earlyLeave: 0,
    offDay: 0,
    attendanceRate: 0,
  })
  const [todayLogs, setTodayLogs] = useState<TodayLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulasi fetch data — nanti ganti ke API real
    const mockStats = {
      totalEmployees: 127,
      presentToday: 98,
      lateToday: 12,
      absentToday: 7,
      earlyLeave: 5,
      offDay: 5,
      attendanceRate: 86,
    }
    const mockLogs: TodayLog[] = [
      { id: '1', employee_name: 'Budi Santoso', employee_code: 'EMP001', department: 'Engineering', checkin_time: '08:45', status: 'present', approved_status: 'approved' },
      { id: '2', employee_name: 'Dewi Kusuma', employee_code: 'EMP002', department: 'HR', checkin_time: '08:52', status: 'present', approved_status: 'approved' },
      { id: '3', employee_name: 'Andi Wijaya', employee_code: 'EMP003', department: 'Development', checkin_time: '09:15', status: 'late', approved_status: 'approved' },
      { id: '4', employee_name: 'Citra Lestari', employee_code: 'EMP004', department: 'QA', checkin_time: '', status: 'late', approved_status: 'pending' },
      { id: '5', employee_name: 'Eko Prasetyo', employee_code: 'EMP005', department: 'Finance', checkin_time: '', status: 'absent', approved_status: 'rejected' },
      { id: '6', employee_name: 'Fajar Nugroho', employee_code: 'EMP006', department: 'Sales', checkin_time: '08:30', status: 'present', approved_status: 'approved' },
      { id: '7', employee_name: 'Gita Maharani', employee_code: 'EMP007', department: 'Operations', checkin_time: '08:55', status: 'present', approved_status: 'approved' },
      { id: '8', employee_name: 'Hadi Susanto', employee_code: 'EMP008', department: 'Engineering', checkin_time: '', status: 'off_day', approved_status: 'approved' },
    ]

    setTimeout(() => {
      setStats(mockStats)
      setTodayLogs(mockLogs)
      setLoading(false)
    }, 500)
  }, [])

  const statCards: AttendanceStat[] = [
    { label: "Total Karyawan", value: stats.totalEmployees, icon: <Users className="h-4 w-4" />, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Hadir Hari Ini", value: stats.presentToday, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Terlambat", value: stats.lateToday, icon: <Clock className="h-4 w-4" />, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Tidak Hadir", value: stats.absentToday, icon: <AlertTriangle className="h-4 w-4" />, color: "text-red-600", bg: "bg-red-50" },
  ]

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  function getStatusBadge(status: string) {
    switch (status) {
      case 'present': return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Hadir</Badge>
      case 'late': return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Terlambat</Badge>
      case 'absent': return <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100">Tidak Hadir</Badge>
      case 'early_leave': return <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">Pulang Cepat</Badge>
      case 'off_day': return <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">Libur</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  function getApprovalBadge(status: string) {
    switch (status) {
      case 'approved': return <Badge variant="outline" className="border-emerald-300 text-emerald-600">Disetujui</Badge>
      case 'pending': return <Badge variant="outline" className="border-amber-300 text-amber-600">Menunggu</Badge>
      case 'rejected': return <Badge variant="outline" className="border-red-300 text-red-600">Ditolak</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Dashboard</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="h-4 w-4" /> {today}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/hr/attendance/settings">
              <Settings className="h-4 w-4 mr-2" /> Settings
            </Link>
          </Button>
          <Button asChild>
            <Link href="/hr/attendance/logs">
              <FileCheck className="h-4 w-4 mr-2" /> Lihat Log
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <div className={`${s.bg} ${s.color} p-2 rounded-md`}>{s.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loading ? "—" : s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attendance Rate + Detail Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Tingkat Kehadiran</CardTitle>
            <CardDescription>Persentase kehadiran hari ini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold text-center">
              {loading ? "—" : `${stats.attendanceRate}%`}
            </div>
            <Progress value={loading ? 0 : stats.attendanceRate} className="h-3" />
            <div className="grid grid-cols-2 gap-4 text-center text-sm mt-4">
              <div className="bg-emerald-50 rounded-lg p-2">
                <div className="font-bold text-emerald-600">{stats.presentToday}</div>
                <div className="text-muted-foreground">Hadir</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-2">
                <div className="font-bold text-amber-600">{stats.lateToday}</div>
                <div className="text-muted-foreground">Terlambat</div>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <div className="font-bold text-red-600">{stats.absentToday}</div>
                <div className="text-muted-foreground">Absen</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="font-bold text-gray-600">{stats.earlyLeave + stats.offDay}</div>
                <div className="text-muted-foreground">Lainnya</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Attendance Table */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Kehadiran Hari Ini</CardTitle>
              <CardDescription>Log check-in karyawan hari ini</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/hr/attendance/logs">
                Lihat Semua <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
            ) : todayLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Belum ada data kehadiran hari ini</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approval</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.employee_code}</TableCell>
                      <TableCell>{log.employee_name}</TableCell>
                      <TableCell>{log.department}</TableCell>
                      <TableCell>{log.checkin_time || "—"}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{getApprovalBadge(log.approved_status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Button variant="outline" className="h-auto py-4 justify-start gap-3" asChild>
          <Link href="/hr/attendance/logs">
            <Clock className="h-5 w-5 text-blue-500" />
            <div className="text-left">
              <div className="font-medium">Attendance Logs</div>
              <div className="text-xs text-muted-foreground">Lihat semua log kehadiran</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start gap-3" asChild>
          <Link href="/hr/attendance/settings">
            <Settings className="h-5 w-5 text-purple-500" />
            <div className="text-left">
              <div className="font-medium">Settings</div>
              <div className="text-xs text-muted-foreground">Atur jam kerja & lokasi</div>
            </div>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 justify-start gap-3" asChild>
          <Link href="/hr/attendance/approvals">
            <FileCheck className="h-5 w-5 text-amber-500" />
            <div className="text-left">
              <div className="font-medium">Approvals</div>
              <div className="text-xs text-muted-foreground">Persetujuan koreksi absen</div>
            </div>
          </Link>
        </Button>
      </div>
    </div>
  )
}
