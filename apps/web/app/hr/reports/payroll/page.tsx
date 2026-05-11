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
import { DollarSign, Download, FileSpreadsheet } from "lucide-react"

interface PayrollEntry {
  id: string
  nik: string
  name: string
  department: string
  basic_salary: number
  allowances: number
  overtime: number
  bpjs: number
  pph21: number
  net_salary: number
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const mockData: PayrollEntry[] = [
  { id: "1", nik: "WIT-001", name: "Ahmad Rizky", department: "Engineering", basic_salary: 10000000, allowances: 2500000, overtime: 750000, bpjs: 400000, pph21: 350000, net_salary: 12500000 },
  { id: "2", nik: "WIT-002", name: "Siti Nurhaliza", department: "Marketing", basic_salary: 8000000, allowances: 2000000, overtime: 0, bpjs: 320000, pph21: 200000, net_salary: 9480000 },
  { id: "3", nik: "WIT-003", name: "Budi Santoso", department: "Finance", basic_salary: 12000000, allowances: 3000000, overtime: 500000, bpjs: 480000, pph21: 550000, net_salary: 14470000 },
  { id: "4", nik: "WIT-004", name: "Dewi Lestari", department: "HR", basic_salary: 7000000, allowances: 1500000, overtime: 0, bpjs: 280000, pph21: 150000, net_salary: 8070000 },
  { id: "5", nik: "WIT-005", name: "Rendi Pratama", department: "Engineering", basic_salary: 9000000, allowances: 2000000, overtime: 1200000, bpjs: 360000, pph21: 300000, net_salary: 11540000 },
  { id: "6", nik: "WIT-006", name: "Mega Puspita", department: "Design", basic_salary: 8500000, allowances: 1800000, overtime: 0, bpjs: 340000, pph21: 220000, net_salary: 9740000 },
]

export default function PayrollReportsPage() {
  const [data, setData] = useState<PayrollEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState("05")
  const [year, setYear] = useState("2026")
  const [filterDept, setFilterDept] = useState("all")

  useEffect(() => {
    setTimeout(() => { setData(mockData); setLoading(false) }, 500)
  }, [])

  const departments = useMemo(() => [...new Set(data.map(d => d.department))], [data])

  const filtered = useMemo(() => {
    if (filterDept === "all") return data
    return data.filter(d => d.department === filterDept)
  }, [data, filterDept])

  const totalBruto = filtered.reduce((s, d) => s + d.basic_salary + d.allowances + d.overtime, 0)
  const totalDeductions = filtered.reduce((s, d) => s + d.bpjs + d.pph21, 0)
  const totalNeto = filtered.reduce((s, d) => s + d.net_salary, 0)

  if (loading) {
    return <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll Reports</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1"><DollarSign className="h-4 w-4" /> Laporan penggajian karyawan</p>
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
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Gaji Bruto</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-emerald-600">{formatRupiah(totalBruto)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Potongan</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-red-600">{formatRupiah(totalDeductions)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Gaji Neto</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{formatRupiah(totalNeto)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Jumlah Karyawan</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{filtered.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
            <div>
              <CardTitle className="text-base">Ringkasan Payroll - {month}/{year}</CardTitle>
              <CardDescription>Data penggajian per karyawan</CardDescription>
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
                <TableHead>Gaji Pokok</TableHead>
                <TableHead>Tunjangan</TableHead>
                <TableHead>Lembur</TableHead>
                <TableHead>BPJS</TableHead>
                <TableHead>PPh21</TableHead>
                <TableHead>Gaji Neto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm">{entry.nik}</TableCell>
                  <TableCell className="font-medium">{entry.name}</TableCell>
                  <TableCell>{entry.department}</TableCell>
                  <TableCell className="font-mono text-sm">{formatRupiah(entry.basic_salary)}</TableCell>
                  <TableCell className="font-mono text-sm">{formatRupiah(entry.allowances)}</TableCell>
                  <TableCell className="font-mono text-sm">{formatRupiah(entry.overtime)}</TableCell>
                  <TableCell className="font-mono text-sm text-red-600">-{formatRupiah(entry.bpjs)}</TableCell>
                  <TableCell className="font-mono text-sm text-red-600">-{formatRupiah(entry.pph21)}</TableCell>
                  <TableCell className="font-mono text-sm font-bold">{formatRupiah(entry.net_salary)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell colSpan={3}>TOTAL</TableCell>
                <TableCell className="font-mono text-sm">{formatRupiah(filtered.reduce((s, d) => s + d.basic_salary, 0))}</TableCell>
                <TableCell className="font-mono text-sm">{formatRupiah(filtered.reduce((s, d) => s + d.allowances, 0))}</TableCell>
                <TableCell className="font-mono text-sm">{formatRupiah(filtered.reduce((s, d) => s + d.overtime, 0))}</TableCell>
                <TableCell className="font-mono text-sm text-red-600">-{formatRupiah(filtered.reduce((s, d) => s + d.bpjs, 0))}</TableCell>
                <TableCell className="font-mono text-sm text-red-600">-{formatRupiah(filtered.reduce((s, d) => s + d.pph21, 0))}</TableCell>
                <TableCell className="font-mono text-sm font-bold">{formatRupiah(totalNeto)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
