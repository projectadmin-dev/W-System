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
import { useState, useEffect } from "react"
import { Search, FileCheck, CheckCircle2, XCircle, Clock } from "lucide-react"

interface ApprovalRequest {
  id: string
  employee_name: string
  employee_code: string
  department: string
  request_type: "late" | "early_leave" | "absent" | "off_day"
  reason: string
  attendance_date: string
  status: "pending" | "approved" | "rejected"
  requested_at: string
}

export default function AttendanceApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const mock: ApprovalRequest[] = [
      { id: "a1", employee_name: "Andi Wijaya", employee_code: "EMP003", department: "Development", request_type: "late", reason: "Macet parah di tol Cikampek", attendance_date: "2026-05-06", status: "pending", requested_at: "2026-05-06 09:30" },
      { id: "a2", employee_name: "Citra Lestari", employee_code: "EMP004", department: "QA", request_type: "absent", reason: "Sakit demam, lampirkan surat dokter", attendance_date: "2026-05-05", status: "pending", requested_at: "2026-05-05 10:00" },
      { id: "a3", employee_name: "Fajar Nugroho", employee_code: "EMP006", department: "Sales", request_type: "early_leave", reason: "Keluarga ada kecelakaan", attendance_date: "2026-05-04", status: "approved", requested_at: "2026-05-04 14:00" },
      { id: "a4", employee_name: "Gita Maharani", employee_code: "EMP007", department: "Operations", request_type: "off_day", reason: "Cuti liburan tahunan", attendance_date: "2026-05-03", status: "rejected", requested_at: "2026-04-28 09:00" },
      { id: "a5", employee_name: "Hadi Susanto", employee_code: "EMP008", department: "Engineering", request_type: "late", reason: "Kendala transportasi umum", attendance_date: "2026-05-06", status: "pending", requested_at: "2026-05-06 09:15" },
    ]
    setTimeout(() => { setRequests(mock); setLoading(false) }, 500)
  }, [])

  const filtered = requests.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      r.employee_name.toLowerCase().includes(s) ||
      r.employee_code.toLowerCase().includes(s) ||
      r.reason.toLowerCase().includes(s)
    )
  })

  function getTypeLabel(t: string) {
    switch (t) {
      case "late": return (<><Clock className="h-3 w-3 inline mr-1" />Terlambat</>)
      case "early_leave": return <span><CheckCircle2 className="h-3 w-3 inline mr-1" />Pulang Cepat</span>
      case "absent": return <span><XCircle className="h-3 w-3 inline mr-1" />Tidak Hadir</span>
      case "off_day": return <span><Clock className="h-3 w-3 inline mr-1" />Libur</span>
      default: return t
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "pending": return <Badge variant="outline" className="border-amber-300 text-amber-600">Menunggu</Badge>
      case "approved": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Disetujui</Badge>
      case "rejected": return <Badge variant="secondary" className="bg-red-100 text-red-700">Ditolak</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  function handleApprove(id: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "approved" as const } : r))
  }

  function handleReject(id: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" as const } : r))
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Persetujuan Absensi</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <FileCheck className="h-4 w-4" /> Review & approve request koreksi absensi
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama, kode, atau alasan..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Request</CardTitle>
          <CardDescription>Request koreksi absensi dari karyawan yang perlu ditinjau</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Tidak ada request</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Dept</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.attendance_date}</TableCell>
                    <TableCell className="font-medium">{r.employee_code}</TableCell>
                    <TableCell>{r.employee_name}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell>{getTypeLabel(r.request_type)}</TableCell>
                    <TableCell className="max-w-xs truncate" title={r.reason}>{r.reason}</TableCell>
                    <TableCell>{getStatusBadge(r.status)}</TableCell>
                    <TableCell className="text-right">
                      {r.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={() => handleApprove(r.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleReject(r.id)}>
                            <XCircle className="h-4 w-4 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
