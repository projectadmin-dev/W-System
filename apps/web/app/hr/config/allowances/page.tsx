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
import { Gift, Plus, Search, Edit, Trash2 } from "lucide-react"

interface AllowanceType {
  id: string
  code: string
  name: string
  type: "FIXED" | "ATTENDANCE_BASED" | "CONDITIONAL" | "PRORATED"
  default_nominal: number
  is_taxable: boolean
  deduct_on_alpha: boolean
  deduct_on_sick_leave: boolean
  deduct_on_paid_leave: boolean
  is_active: boolean
  description: string
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const mockData: AllowanceType[] = [
  { id: "1", code: "TTRANSPORT", name: "Tunjangan Transport", type: "FIXED", default_nominal: 500000, is_taxable: true, deduct_on_alpha: false, deduct_on_sick_leave: false, deduct_on_paid_leave: false, is_active: true, description: "Tunjangan transportasi bulanan" },
  { id: "2", code: "TMAKAN", name: "Tunjangan Makan", type: "ATTENDANCE_BASED", default_nominal: 35000, is_taxable: true, deduct_on_alpha: true, deduct_on_sick_leave: true, deduct_on_paid_leave: false, is_active: true, description: "Per hari kehadiran" },
  { id: "3", code: "TKEHADIRAN", name: "Tunjangan Kehadiran", type: "ATTENDANCE_BASED", default_nominal: 300000, is_taxable: true, deduct_on_alpha: true, deduct_on_sick_leave: false, deduct_on_paid_leave: false, is_active: true, description: "Full jika tidak alpha" },
  { id: "4", code: "TKOMM", name: "Tunjangan Komunikasi", type: "FIXED", default_nominal: 200000, is_taxable: false, deduct_on_alpha: false, deduct_on_sick_leave: false, deduct_on_paid_leave: false, is_active: true, description: "Pulsa & internet" },
  { id: "5", code: "TPROYEK", name: "Tunjangan Proyek", type: "CONDITIONAL", default_nominal: 1000000, is_taxable: true, deduct_on_alpha: false, deduct_on_sick_leave: false, deduct_on_paid_leave: false, is_active: true, description: "Hanya jika assigned ke proyek" },
]

const typeLabel: Record<string, string> = { FIXED: "Tetap", ATTENDANCE_BASED: "Kehadiran", CONDITIONAL: "Kondisional", PRORATED: "Pro-Rata" }
const typeColor: Record<string, string> = { FIXED: "bg-blue-100 text-blue-700", ATTENDANCE_BASED: "bg-amber-100 text-amber-700", CONDITIONAL: "bg-purple-100 text-purple-700", PRORATED: "bg-emerald-100 text-emerald-700" }

export default function AllowanceTypesPage() {
  const [data, setData] = useState<AllowanceType[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setTimeout(() => { setData(mockData); setLoading(false) }, 500)
  }, [])

  const filtered = useMemo(() => {
    if (!search) return data
    const s = search.toLowerCase()
    return data.filter(d => d.name.toLowerCase().includes(s) || d.code.toLowerCase().includes(s))
  }, [data, search])

  const fixedCount = data.filter(d => d.type === "FIXED").length
  const attendanceCount = data.filter(d => d.type === "ATTENDANCE_BASED").length
  const conditionalCount = data.filter(d => d.type === "CONDITIONAL").length

  if (loading) {
    return <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Allowance Types</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1"><Gift className="h-4 w-4" /> Jenis tunjangan & aturan pemotongan</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Tambah Tunjangan</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Tunjangan</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tetap (Fixed)</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{fixedCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Berbasis Kehadiran</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{attendanceCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Kondisional</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{conditionalCount}</div></CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari tunjangan..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Tunjangan</CardTitle>
          <CardDescription>Konfigurasi jenis tunjangan karyawan</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Nominal Default</TableHead>
                <TableHead>Kena Pajak</TableHead>
                <TableHead>Potong Alpha</TableHead>
                <TableHead>Potong Sakit</TableHead>
                <TableHead>Potong Cuti</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.code}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell><Badge className={typeColor[item.type]}>{typeLabel[item.type]}</Badge></TableCell>
                  <TableCell className="font-mono">{formatRupiah(item.default_nominal)}</TableCell>
                  <TableCell>{item.is_taxable ? "Ya" : "Tidak"}</TableCell>
                  <TableCell>{item.deduct_on_alpha ? "Ya" : "-"}</TableCell>
                  <TableCell>{item.deduct_on_sick_leave ? "Ya" : "-"}</TableCell>
                  <TableCell>{item.deduct_on_paid_leave ? "Ya" : "-"}</TableCell>
                  <TableCell>
                    <Badge className={item.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}>
                      {item.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
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
