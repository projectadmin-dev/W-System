"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from "@workspace/ui/components/select"
import { AlertTriangle, Users, Search } from "lucide-react"

interface Employee {
  id: string
  name: string
  department: string
  activeTasks: number
  totalWI: number
  allocation: number
  status: "Overload" | "Normal" | "Available"
}

const mockEmployees: Employee[] = [
  { id: "EMP-001", name: "Andi Pratama", department: "Engineering", activeTasks: 8, totalWI: 15, allocation: 120, status: "Overload" },
  { id: "EMP-002", name: "Budi Santoso", department: "Engineering", activeTasks: 6, totalWI: 11, allocation: 85, status: "Normal" },
  { id: "EMP-003", name: "Citra Lestari", department: "QA", activeTasks: 3, totalWI: 5, allocation: 45, status: "Available" },
  { id: "EMP-004", name: "Dewi Rahayu", department: "Design", activeTasks: 4, totalWI: 7, allocation: 65, status: "Normal" },
  { id: "EMP-005", name: "Eko Prasetyo", department: "Backend", activeTasks: 9, totalWI: 16, allocation: 135, status: "Overload" },
  { id: "EMP-006", name: "Fani Susanti", department: "Backend", activeTasks: 5, totalWI: 9, allocation: 80, status: "Normal" },
  { id: "EMP-007", name: "Gilang Ramadan", department: "QA", activeTasks: 2, totalWI: 4, allocation: 35, status: "Available" },
  { id: "EMP-008", name: "Hani Puspita", department: "Design", activeTasks: 7, totalWI: 13, allocation: 110, status: "Overload" },
]

function statusBadge(status: Employee["status"]) {
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
      <div className="h-2 w-28 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-sm font-mono font-semibold ${pct > 100 ? "text-red-600" : pct >= 80 ? "text-amber-600" : "text-emerald-600"}`}>{pct}%</span>
    </div>
  )
}

const departments = ["Engineering", "Backend", "QA", "Design"]

export default function WorkloadMonitoringPage() {
  const [data, setData] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")

  useEffect(() => { setTimeout(() => { setData(mockEmployees); setLoading(false) }, 500) }, [])

  const filtered = useMemo(() => {
    let r = [...data]
    if (search) { const s = search.toLowerCase(); r = r.filter(e => e.name.toLowerCase().includes(s) || e.id.toLowerCase().includes(s)) }
    if (deptFilter !== "ALL") r = r.filter(e => e.department === deptFilter)
    if (statusFilter !== "ALL") r = r.filter(e => e.status === statusFilter)
    return r
  }, [data, search, deptFilter, statusFilter])

  const overloadCount = data.filter(e => e.status === "Overload").length
  const normalCount = data.filter(e => e.status === "Normal").length
  const availableCount = data.filter(e => e.status === "Available").length

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workload Monitoring</h1>
          <p className="text-muted-foreground mt-1">Monitor beban kerja dan alokasi setiap karyawan</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Karyawan</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Overload</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{overloadCount}</div><p className="text-xs text-muted-foreground">Allocation &gt; 100%</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Normal</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600">{normalCount}</div><p className="text-xs text-muted-foreground">80% – 100%</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Available</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{availableCount}</div><p className="text-xs text-muted-foreground">Allocation &lt; 80%</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari karyawan..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Departemen" /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Departemen</SelectLabel>
              <SelectItem value="ALL">Semua Dept</SelectItem>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Status</SelectLabel>
              <SelectItem value="ALL">Semua</SelectItem>
              <SelectItem value="Overload">Overload</SelectItem>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Karyawan</CardTitle>
          <CardDescription>Menampilkan {filtered.length} dari {data.length} karyawan</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIK</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Active Tasks</TableHead>
                <TableHead>Total WI</TableHead>
                <TableHead>Allocation</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell className="font-mono text-sm text-muted-foreground">{emp.id}</TableCell>
                  <TableCell className="font-medium">{emp.name}</TableCell>
                  <TableCell>{emp.department}</TableCell>
                  <TableCell className="text-center">{emp.activeTasks}</TableCell>
                  <TableCell className="text-center">{emp.totalWI}</TableCell>
                  <TableCell>{allocationBar(emp.allocation)}</TableCell>
                  <TableCell>{statusBadge(emp.status)}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
