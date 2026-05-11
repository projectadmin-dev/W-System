"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import { FileText, Plus, Search, Eye, Edit } from "lucide-react"

interface EmployeeContract {
  id: string
  nik: string
  employee_name: string
  contract_type: "PKWT" | "PKWTT" | "Probation" | "Freelance"
  start_date: string
  end_date: string | null
  status: "active" | "expired" | "terminated" | "renewed"
  department: string
}

const mockContracts: EmployeeContract[] = [
  { id: "1", nik: "WIT-001", employee_name: "Ahmad Rizky", contract_type: "PKWTT", start_date: "2024-03-15", end_date: null, status: "active", department: "Engineering" },
  { id: "2", nik: "WIT-002", employee_name: "Siti Nurhaliza", contract_type: "PKWT", start_date: "2025-06-01", end_date: "2026-05-31", status: "active", department: "Marketing" },
  { id: "3", nik: "WIT-003", employee_name: "Budi Santoso", contract_type: "PKWT", start_date: "2025-09-01", end_date: "2026-08-31", status: "active", department: "Finance" },
  { id: "4", nik: "WIT-004", employee_name: "Dewi Lestari", contract_type: "Probation", start_date: "2026-04-01", end_date: "2026-07-01", status: "active", department: "HR" },
  { id: "5", nik: "WIT-005", employee_name: "Rendi Pratama", contract_type: "PKWT", start_date: "2024-01-01", end_date: "2025-12-31", status: "expired", department: "Engineering" },
  { id: "6", nik: "WIT-006", employee_name: "Mega Puspita", contract_type: "Freelance", start_date: "2026-01-01", end_date: "2026-06-30", status: "active", department: "Design" },
]

const statusColor: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  expired: "bg-red-100 text-red-700",
  terminated: "bg-gray-100 text-gray-700",
  renewed: "bg-blue-100 text-blue-700",
}

const typeColor: Record<string, string> = {
  PKWT: "bg-amber-100 text-amber-700",
  PKWTT: "bg-blue-100 text-blue-700",
  Probation: "bg-purple-100 text-purple-700",
  Freelance: "bg-gray-100 text-gray-700",
}

export default function EmployeeContractsPage() {
  const [contracts, setContracts] = useState<EmployeeContract[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setTimeout(() => { setContracts(mockContracts); setLoading(false) }, 500)
  }, [])

  const filtered = useMemo(() => {
    if (!search) return contracts
    const s = search.toLowerCase()
    return contracts.filter(c => c.employee_name.toLowerCase().includes(s) || c.nik.toLowerCase().includes(s) || c.department.toLowerCase().includes(s))
  }, [contracts, search])

  const activeCount = contracts.filter(c => c.status === "active").length
  const expiringCount = contracts.filter(c => {
    if (!c.end_date) return false
    const diff = new Date(c.end_date).getTime() - new Date().getTime()
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
  }).length

  if (loading) {
    return <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Contracts</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1"><FileText className="h-4 w-4" /> Kelola kontrak kerja karyawan</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Tambah Kontrak</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Kontrak</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{contracts.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Kontrak Aktif</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600">{activeCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Akan Berakhir (&lt;30 hari)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{expiringCount}</div></CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari karyawan atau NIK..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Kontrak</CardTitle>
          <CardDescription>Kontrak kerja karyawan aktif & historis</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIK</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Tipe Kontrak</TableHead>
                <TableHead>Mulai</TableHead>
                <TableHead>Berakhir</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm">{c.nik}</TableCell>
                  <TableCell className="font-medium">{c.employee_name}</TableCell>
                  <TableCell>{c.department}</TableCell>
                  <TableCell><Badge className={typeColor[c.contract_type]}>{c.contract_type}</Badge></TableCell>
                  <TableCell>{c.start_date}</TableCell>
                  <TableCell>{c.end_date || "Tidak Terbatas"}</TableCell>
                  <TableCell><Badge className={statusColor[c.status]}>{c.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Tidak ada data kontrak</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
