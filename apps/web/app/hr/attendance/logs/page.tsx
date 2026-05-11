"use client"

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import { Badge } from "@workspace/ui/components/badge"
import Link from "next/link"
import { useState, useEffect } from "react"
import {
  Search, Calendar, Clock, MapPin, User, ArrowRight,
} from "lucide-react"

// Types
interface AttendanceLog {
  id: string
  employee_id: string
  employee_name: string
  employee_code: string
  department: string
  attendance_date: string
  checkin_time: string | null
  checkout_time: string | null
  checkin_lat: number | null
  checkin_lng: number | null
  checkout_lat: number | null
  checkout_lng: number | null
  status: "present" | "late" | "absent" | "early_leave" | "off_day"
  approved_status: "pending" | "approved" | "rejected"
}

export default function AttendanceLogsPage() {
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  // Mock data
  useEffect(() => {
    const mockLogs: AttendanceLog[] = [
      { id: "1", employee_id: "5504a9d5-...", employee_name: "Budi Santoso", employee_code: "EMP001", department: "Engineering", attendance_date: "2026-05-06", checkin_time: "08:45", checkout_time: null, checkin_lat: -6.9147, checkin_lng: 107.6098, checkout_lat: null, checkout_lng: null, status: "present", approved_status: "approved" },
      { id: "2", employee_id: "6605b2e6-...", employee_name: "Dewi Kusuma", employee_code: "EMP002", department: "HR", attendance_date: "2026-05-06", checkin_time: "08:52", checkout_time: null, checkin_lat: -6.9148, checkin_lng: 107.6099, checkout_lat: null, checkout_lng: null, status: "present", approved_status: "approved" },
      { id: "3", employee_id: "7706c3f7-...", employee_name: "Andi Wijaya", employee_code: "EMP003", department: "Development", attendance_date: "2026-05-06", checkin_time: "09:15", checkout_time: null, checkin_lat: -6.9149, checkin_lng: 107.6100, checkout_lat: null, checkout_lng: null, status: "late", approved_status: "pending" },
      { id: "4", employee_id: "8807d4g8-...", employee_name: "Citra Lestari", employee_code: "EMP004", department: "QA", attendance_date: "2026-05-06", checkin_time: null, checkout_time: null, checkin_lat: null, checkin_lng: null, checkout_lat: null, checkout_lng: null, status: "absent", approved_status: "rejected" },
      { id: "5", employee_id: "9908e5h9-...", employee_name: "Eko Prasetyo", employee_code: "EMP005", department: "Finance", attendance_date: "2026-05-06", checkin_time: "08:30", checkout_time: "17:30", checkin_lat: -6.9150, checkin_lng: 107.6101, checkout_lat: -6.9151, checkout_lng: 107.6102, status: "present", approved_status: "approved" },
    ]
    setTimeout(() => { setLogs(mockLogs); setLoading(false) }, 600)
  }, [])

  const filtered = logs.filter(l => {
    if (!search) return true
    const s = search.toLowerCase()
    return l.employee_name.toLowerCase().includes(s) || l.employee_code.toLowerCase().includes(s)
  })

  const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  function getStatusBadge(status: string) {
    switch (status) {
      case "present": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Hadir</Badge>
      case "late": return <Badge variant="secondary" className="bg-amber-100 text-amber-700">Terlambat</Badge>
      case "absent": return <Badge variant="secondary" className="bg-red-100 text-red-700">Tidak Hadir</Badge>
      case "early_leave": return <Badge variant="secondary" className="bg-orange-100 text-orange-700">Pulang Cepat</Badge>
      case "off_day": return <Badge variant="secondary" className="bg-gray-100 text-gray-700">Libur</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  function getApprovalBadge(status: string) {
    switch (status) {
      case "approved": return <Badge variant="outline" className="border-emerald-300 text-emerald-600">Disetujui</Badge>
      case "pending": return <Badge variant="outline" className="border-amber-300 text-amber-600">Menunggu</Badge>
      case "rejected": return <Badge variant="outline" className="border-red-300 text-red-600">Ditolak</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Logs</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Clock className="h-4 w-4" /> Log Check-in / Check-out Karyawan
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nama atau kode karyawan..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline">Filter Tanggal</Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Log Kehadiran</CardTitle>
          <CardDescription>Semua log check-in dan check-out karyawan</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Tidak ada data log</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Dept</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Lokasi In</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.attendance_date}</TableCell>
                      <TableCell className="font-medium">{log.employee_code}</TableCell>
                      <TableCell>{log.employee_name}</TableCell>
                      <TableCell>{log.department}</TableCell>
                      <TableCell>{log.checkin_time || "—"}</TableCell>
                      <TableCell>{log.checkout_time || "—"}</TableCell>
                      <TableCell>
                        {log.checkin_lat ? (
                          <span className="flex items-center gap-1 text-xs">
                            <MapPin className="h-3 w-3" />{log.checkin_lat.toFixed(4)}, {log.checkin_lng?.toFixed(4)}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{getApprovalBadge(log.approved_status)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/hr/attendance/logs/${log.id}`}>Detail</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Menampilkan {paginated.length} dari {filtered.length} log
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>Previous</Button>
                    <span className="text-sm font-medium">{currentPage} / {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
