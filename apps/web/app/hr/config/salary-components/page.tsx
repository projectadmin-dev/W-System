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
import { Layers, Plus, Search, Edit, Trash2 } from "lucide-react"

interface SalaryComponent {
  id: string
  code: string
  name: string
  component_type: "earning" | "deduction"
  category: string
  amount_type: "fixed" | "percentage" | "formula" | "variable"
  fixed_amount: number | null
  percentage: number | null
  is_taxable: boolean
  is_bpjs_base: boolean
  is_fixed: boolean
  display_order: number
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const mockData: SalaryComponent[] = [
  { id: "1", code: "BSC", name: "Gaji Pokok", component_type: "earning", category: "basic", amount_type: "fixed", fixed_amount: null, percentage: null, is_taxable: true, is_bpjs_base: true, is_fixed: true, display_order: 1 },
  { id: "2", code: "ALW-JAB", name: "Tunjangan Jabatan", component_type: "earning", category: "allowance", amount_type: "fixed", fixed_amount: 2000000, percentage: null, is_taxable: true, is_bpjs_base: false, is_fixed: true, display_order: 2 },
  { id: "3", code: "ALW-TRP", name: "Tunjangan Transport", component_type: "earning", category: "allowance", amount_type: "fixed", fixed_amount: 500000, percentage: null, is_taxable: true, is_bpjs_base: false, is_fixed: true, display_order: 3 },
  { id: "4", code: "OVT", name: "Lembur", component_type: "earning", category: "overtime", amount_type: "formula", fixed_amount: null, percentage: null, is_taxable: true, is_bpjs_base: false, is_fixed: false, display_order: 4 },
  { id: "5", code: "BNS", name: "Bonus", component_type: "earning", category: "bonus", amount_type: "variable", fixed_amount: null, percentage: null, is_taxable: true, is_bpjs_base: false, is_fixed: false, display_order: 5 },
  { id: "6", code: "DED-BPJSTK", name: "BPJS Ketenagakerjaan", component_type: "deduction", category: "bpjs_tk", amount_type: "percentage", fixed_amount: null, percentage: 2.0, is_taxable: false, is_bpjs_base: false, is_fixed: true, display_order: 10 },
  { id: "7", code: "DED-BPJSKES", name: "BPJS Kesehatan", component_type: "deduction", category: "bpjs_kes", amount_type: "percentage", fixed_amount: null, percentage: 1.0, is_taxable: false, is_bpjs_base: false, is_fixed: true, display_order: 11 },
  { id: "8", code: "DED-PPH21", name: "PPh21", component_type: "deduction", category: "pph21", amount_type: "formula", fixed_amount: null, percentage: null, is_taxable: false, is_bpjs_base: false, is_fixed: false, display_order: 12 },
]

const categoryLabel: Record<string, string> = {
  basic: "Gaji Pokok", allowance: "Tunjangan", overtime: "Lembur", bonus: "Bonus",
  thr: "THR", bpjs_tk: "BPJS TK", bpjs_kes: "BPJS Kes", pph21: "PPh21", loan: "Pinjaman", other: "Lainnya",
}

export default function SalaryComponentsPage() {
  const [data, setData] = useState<SalaryComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string>("all")

  useEffect(() => {
    setTimeout(() => { setData(mockData); setLoading(false) }, 500)
  }, [])

  const filtered = useMemo(() => {
    let result = data
    if (filterType !== "all") result = result.filter(d => d.component_type === filterType)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(d => d.name.toLowerCase().includes(s) || d.code.toLowerCase().includes(s))
    }
    return result
  }, [data, search, filterType])

  const earningCount = data.filter(d => d.component_type === "earning").length
  const deductionCount = data.filter(d => d.component_type === "deduction").length
  const taxableCount = data.filter(d => d.is_taxable).length

  if (loading) {
    return <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Salary Components</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1"><Layers className="h-4 w-4" /> Komponen pendapatan & potongan slip gaji</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Tambah Komponen</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Komponen</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pendapatan</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600">{earningCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Potongan</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{deductionCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Kena Pajak</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{taxableCount}</div></CardContent></Card>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari komponen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">Semua Tipe</option>
          <option value="earning">Pendapatan</option>
          <option value="deduction">Potongan</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Komponen Gaji</CardTitle>
          <CardDescription>Master komponen untuk slip gaji</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Tipe Jumlah</TableHead>
                <TableHead>Jumlah/Persen</TableHead>
                <TableHead>Pajak</TableHead>
                <TableHead>BPJS</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(comp => (
                <TableRow key={comp.id}>
                  <TableCell className="font-mono text-sm">{comp.code}</TableCell>
                  <TableCell className="font-medium">{comp.name}</TableCell>
                  <TableCell>
                    <Badge className={comp.component_type === "earning" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                      {comp.component_type === "earning" ? "Pendapatan" : "Potongan"}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge className="bg-gray-100 text-gray-700">{categoryLabel[comp.category] || comp.category}</Badge></TableCell>
                  <TableCell className="capitalize">{comp.amount_type}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {comp.fixed_amount ? formatRupiah(comp.fixed_amount) : comp.percentage ? `${comp.percentage}%` : "-"}
                  </TableCell>
                  <TableCell>{comp.is_taxable ? "Ya" : "Tidak"}</TableCell>
                  <TableCell>{comp.is_bpjs_base ? "Ya" : "Tidak"}</TableCell>
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
