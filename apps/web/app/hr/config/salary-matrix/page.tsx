"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import { Grid3X3, Plus, Search } from "lucide-react"

interface SalaryMatrixEntry {
  id: string
  grade_code: string
  grade_name: string
  step: number
  amount: number
  effective_date: string
  notes: string
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const mockData: SalaryMatrixEntry[] = [
  { id: "1", grade_code: "G1", grade_name: "Staff", step: 1, amount: 5000000, effective_date: "2026-01-01", notes: "Entry level" },
  { id: "2", grade_code: "G1", grade_name: "Staff", step: 2, amount: 5500000, effective_date: "2026-01-01", notes: "1 tahun" },
  { id: "3", grade_code: "G1", grade_name: "Staff", step: 3, amount: 6000000, effective_date: "2026-01-01", notes: "2 tahun" },
  { id: "4", grade_code: "G1", grade_name: "Staff", step: 4, amount: 6500000, effective_date: "2026-01-01", notes: "3 tahun" },
  { id: "5", grade_code: "G1", grade_name: "Staff", step: 5, amount: 7000000, effective_date: "2026-01-01", notes: "4 tahun" },
  { id: "6", grade_code: "G2", grade_name: "Senior Staff", step: 1, amount: 8000000, effective_date: "2026-01-01", notes: "Entry level" },
  { id: "7", grade_code: "G2", grade_name: "Senior Staff", step: 2, amount: 9000000, effective_date: "2026-01-01", notes: "1 tahun" },
  { id: "8", grade_code: "G2", grade_name: "Senior Staff", step: 3, amount: 10000000, effective_date: "2026-01-01", notes: "2 tahun" },
  { id: "9", grade_code: "G2", grade_name: "Senior Staff", step: 4, amount: 11000000, effective_date: "2026-01-01", notes: "3 tahun" },
  { id: "10", grade_code: "G2", grade_name: "Senior Staff", step: 5, amount: 12000000, effective_date: "2026-01-01", notes: "4 tahun" },
  { id: "11", grade_code: "M1", grade_name: "Supervisor", step: 1, amount: 12000000, effective_date: "2026-01-01", notes: "Entry level" },
  { id: "12", grade_code: "M1", grade_name: "Supervisor", step: 2, amount: 13500000, effective_date: "2026-01-01", notes: "1 tahun" },
  { id: "13", grade_code: "M1", grade_name: "Supervisor", step: 3, amount: 15000000, effective_date: "2026-01-01", notes: "2 tahun" },
  { id: "14", grade_code: "M1", grade_name: "Supervisor", step: 4, amount: 16500000, effective_date: "2026-01-01", notes: "3 tahun" },
  { id: "15", grade_code: "M1", grade_name: "Supervisor", step: 5, amount: 18000000, effective_date: "2026-01-01", notes: "4 tahun" },
]

export default function SalaryMatrixPage() {
  const [data, setData] = useState<SalaryMatrixEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterGrade, setFilterGrade] = useState("all")

  useEffect(() => {
    setTimeout(() => { setData(mockData); setLoading(false) }, 500)
  }, [])

  const grades = useMemo(() => [...new Set(data.map(d => d.grade_code))], [data])

  const filtered = useMemo(() => {
    let result = data
    if (filterGrade !== "all") result = result.filter(d => d.grade_code === filterGrade)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(d => d.grade_name.toLowerCase().includes(s) || d.grade_code.toLowerCase().includes(s))
    }
    return result
  }, [data, search, filterGrade])

  if (loading) {
    return <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Salary Matrix</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1"><Grid3X3 className="h-4 w-4" /> Step gaji per grade jabatan</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Tambah Entri</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Entri</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Grade Terdaftar</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{grades.length}</div></CardContent></Card>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari grade..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
          <option value="all">Semua Grade</option>
          {grades.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Salary Matrix</CardTitle>
          <CardDescription>Step kenaikan gaji per grade</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Step</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Tanggal Efektif</TableHead>
                <TableHead>Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm">{entry.grade_code}</TableCell>
                  <TableCell className="font-medium">{entry.grade_name}</TableCell>
                  <TableCell>Step {entry.step}</TableCell>
                  <TableCell className="font-mono">{formatRupiah(entry.amount)}</TableCell>
                  <TableCell>{entry.effective_date}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.notes}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
