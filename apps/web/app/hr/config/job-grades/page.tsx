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
import { Award, Plus, Search, Edit, Trash2 } from "lucide-react"

interface JobGrade {
  id: string
  code: string
  name: string
  level: number
  salary_min: number
  salary_mid: number
  salary_max: number
  leave_quota: number
  is_overtime_eligible: boolean
  is_bonus_eligible: boolean
  is_car_allowance_eligible: boolean
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const mockGrades: JobGrade[] = [
  { id: "1", code: "G1", name: "Staff", level: 6, salary_min: 5000000, salary_mid: 7000000, salary_max: 9000000, leave_quota: 12, is_overtime_eligible: true, is_bonus_eligible: true, is_car_allowance_eligible: false },
  { id: "2", code: "G2", name: "Senior Staff", level: 5, salary_min: 8000000, salary_mid: 10000000, salary_max: 13000000, leave_quota: 12, is_overtime_eligible: true, is_bonus_eligible: true, is_car_allowance_eligible: false },
  { id: "3", code: "M1", name: "Supervisor", level: 4, salary_min: 12000000, salary_mid: 15000000, salary_max: 18000000, leave_quota: 14, is_overtime_eligible: true, is_bonus_eligible: true, is_car_allowance_eligible: false },
  { id: "4", code: "M2", name: "Manager", level: 3, salary_min: 18000000, salary_mid: 22000000, salary_max: 28000000, leave_quota: 14, is_overtime_eligible: false, is_bonus_eligible: true, is_car_allowance_eligible: true },
  { id: "5", code: "S1", name: "Senior Manager", level: 2, salary_min: 28000000, salary_mid: 35000000, salary_max: 45000000, leave_quota: 16, is_overtime_eligible: false, is_bonus_eligible: true, is_car_allowance_eligible: true },
  { id: "6", code: "S2", name: "Director", level: 1, salary_min: 45000000, salary_mid: 60000000, salary_max: 80000000, leave_quota: 18, is_overtime_eligible: false, is_bonus_eligible: true, is_car_allowance_eligible: true },
]

export default function JobGradesPage() {
  const [grades, setGrades] = useState<JobGrade[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setTimeout(() => { setGrades(mockGrades); setLoading(false) }, 500)
  }, [])

  const filtered = useMemo(() => {
    if (!search) return grades
    const s = search.toLowerCase()
    return grades.filter(g => g.name.toLowerCase().includes(s) || g.code.toLowerCase().includes(s))
  }, [grades, search])

  const otEligible = grades.filter(g => g.is_overtime_eligible).length
  const carEligible = grades.filter(g => g.is_car_allowance_eligible).length

  if (loading) {
    return <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Grades</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1"><Award className="h-4 w-4" /> Definisi grade jabatan & rentang gaji</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Tambah Grade</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Grade</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{grades.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Eligible Lembur</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{otEligible}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tunjangan Mobil</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{carEligible}</div></CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari grade..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Job Grades</CardTitle>
          <CardDescription>Grade jabatan dengan rentang gaji dan benefit</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Gaji Min</TableHead>
                <TableHead>Gaji Mid</TableHead>
                <TableHead>Gaji Max</TableHead>
                <TableHead>Cuti</TableHead>
                <TableHead>Lembur</TableHead>
                <TableHead>Bonus</TableHead>
                <TableHead>Mobil</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="font-mono text-sm">{g.code}</TableCell>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell>{g.level}</TableCell>
                  <TableCell className="font-mono text-sm">{formatRupiah(g.salary_min)}</TableCell>
                  <TableCell className="font-mono text-sm">{formatRupiah(g.salary_mid)}</TableCell>
                  <TableCell className="font-mono text-sm">{formatRupiah(g.salary_max)}</TableCell>
                  <TableCell>{g.leave_quota} hari</TableCell>
                  <TableCell>{g.is_overtime_eligible ? <Badge className="bg-emerald-100 text-emerald-700">Ya</Badge> : <Badge className="bg-gray-100 text-gray-700">Tidak</Badge>}</TableCell>
                  <TableCell>{g.is_bonus_eligible ? <Badge className="bg-emerald-100 text-emerald-700">Ya</Badge> : <Badge className="bg-gray-100 text-gray-700">Tidak</Badge>}</TableCell>
                  <TableCell>{g.is_car_allowance_eligible ? <Badge className="bg-blue-100 text-blue-700">Ya</Badge> : <Badge className="bg-gray-100 text-gray-700">Tidak</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
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
