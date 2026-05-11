"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import { Clock, Download, BarChart3 } from "lucide-react"

interface AttendanceSummary {
  id: string
  nik: string
  name: string
  department: string
  present_days: number
  late_days: number
  absent_days: number
  leave_days: number
  overtime_hours: number
  attendance_rate: number
}

const mockData: AttendanceSummary[] = [
  { id: "1", nik: "WIT-001", name: "Ahmad Rizky", department: "Engineering", present_days: 21, late_days: 1, absent_days: 0, leave_days: 0, overtime_hours: 12, attendance_rate: 95.5 },
  { id: "2", nik: "WIT-002", name: "Siti Nurhaliza", department: "Marketing", present_days: 22, late_days: 0, absent_days: 0, leave_days: 0, overtime_hours: 0, attendance_rate: 100 },
  { id: "3", nik: "WIT-003", name: "Budi Santoso", department: "Finance", present_days: 19, late_days: 2, absent_days: 1, leave_days: 0, overtime_hours: 8, attendance_rate: 86.4 },
  { id: "4", nik: "WIT-004", name: "Dewi Lestari", department: "HR", present_days: 20, late_days: 0, absent_days: 0, leave_days: 2, overtime_hours: 0, attendance_rate: 90.9 },
  { id: "5", nik: "WIT-005", name: "Rendi Pratama", department: "Engineering", present_days: 18, late_days: 3, absent_days: 1, leave_days: 0, overtime_hours: 20, attendance_rate: 81.8 },
  { id: "6", nik: "WIT-006", name: "Mega Puspita", department: "Design", present_days: 22, late_days: 0, absent_days: 0, leave_days: 0, overtime_hours: 4, attendance_rate: 100 },
]

export default function AttendanceReportsPage() {
  const [data, setData] = useState<AttendanceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState("all")
  const [month, setMonth] = useState("05")
  const [year, setYear] = useState("2026")

  useEffect(() => {
    setTimeout(() => { setData(mockData); setLoading(false) }, 500)
  }, [])

  const departments = useMemo(() => [...new Set(data.map(d => d.department))], [data])

  const filtered = useMemo(() => {
    if (filterDept === "all") return data
    return data.filter(d => d.department === filterDept)
  }, [data, filterDept])

  const avgRate = filtered.length > 0 ? (filtered.reduce((s, d) => s + d.attendance_rate, 0) / filtered.length).toFixed(1) : "0"
  const totalPresent = filtered.reduce((s, d) => s + d.present_days, 0)
  const totalLate = filtered.reduce((s, d) => s + d.late_days, 0)
  const totalAbsent = filtered.reduce((s, d) => s + d.absent_days, 0)

  if (loading) {
    return <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Reports</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1"><Clock className="h-4 w-4" /> Laporan kehadiran karyawan</p>
        </div>
        <Button variant="outline"><Download className="h-4 w-4 mr-2" /> Export Excel</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={month} onChange={e => setMonth(e.target.value)}>
          <option value="01">Januari</option><option value="02">Februari</option><option value="03">Maret</option>
          <option value="04">April</option><option value="05">Mei</option><option value="06">Juni</option>
          <option value="07">Juli</option><option value="08">Agustus</option><option value="09">September</option>
          <option value="10">Oktober</option><option value="11">November</option><option value="12">Desember</option>
        </select>
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={year} onChange={e => setYear(e.target.value)}>
          <option value="2026">2026</option><option value="2025">2025</option>
        </select>
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="all">Semua Departemen</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Rata-rata Kehadiran</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{avgRate}%</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Hadir</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600">{totalPresent} hari</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Terlambat</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{totalLate} hari</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Tidak Hadir</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{totalAbsent} hari</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <div>
              <CardTitle className="text-base">Ringkasan Kehadiran - {month}/{year}</CardTitle>
              <CardDescription>Rekap per karyawan</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIK</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Hadir</TableHead>
                <TableHead>Terlambat</TableHead>
                <TableHead>Alpha</TableHead>
                <TableHead>Cuti</TableHead>
                <TableHead>Lembur (jam)</TableHead>
                <TableHead>% Kehadiran</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm">{entry.nik}</TableCell>
                  <TableCell className="font-medium">{entry.name}</TableCell>
                  <TableCell>{entry.department}</TableCell>
                  <TableCell className="text-emerald-600 font-medium">{entry.present_days}</TableCell>
                  <TableCell className={entry.late_days > 0 ? "text-amber-600 font-medium" : ""}>{entry.late_days}</TableCell>
                  <TableCell className={entry.absent_days > 0 ? "text-red-600 font-medium" : ""}>{entry.absent_days}</TableCell>
                  <TableCell>{entry.leave_days}</TableCell>
                  <TableCell>{entry.overtime_hours}</TableCell>
                  <TableCell>
                    <Badge className={
                      entry.attendance_rate >= 95 ? "bg-emerald-100 text-emerald-700" :
                      entry.attendance_rate >= 85 ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }>
                      {entry.attendance_rate}%
                    </Badge>
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
