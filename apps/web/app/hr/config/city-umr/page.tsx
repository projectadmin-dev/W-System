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
import { MapPin, Plus, Search } from "lucide-react"

interface CityUmr {
  id: string
  city: string
  year: number
  umr_amount: number
  effective_date: string
  source: string
  notes: string
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const mockData: CityUmr[] = [
  { id: "1", city: "DKI Jakarta", year: 2026, umr_amount: 5396760, effective_date: "2026-01-01", source: "Pergub DKI Jakarta No. XX/2025", notes: "" },
  { id: "2", city: "Kota Bandung", year: 2026, umr_amount: 4395000, effective_date: "2026-01-01", source: "SK Gubernur Jabar No. XX/2025", notes: "" },
  { id: "3", city: "Kota Surabaya", year: 2026, umr_amount: 4975000, effective_date: "2026-01-01", source: "SK Gubernur Jatim No. XX/2025", notes: "" },
  { id: "4", city: "Kota Semarang", year: 2026, umr_amount: 3480000, effective_date: "2026-01-01", source: "SK Gubernur Jateng No. XX/2025", notes: "" },
  { id: "5", city: "Kota Medan", year: 2026, umr_amount: 3420000, effective_date: "2026-01-01", source: "SK Gubernur Sumut No. XX/2025", notes: "" },
  { id: "6", city: "Kota Yogyakarta", year: 2026, umr_amount: 2825000, effective_date: "2026-01-01", source: "SK Gubernur DIY No. XX/2025", notes: "Terendah di Jawa" },
]

export default function CityUmrPage() {
  const [data, setData] = useState<CityUmr[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setTimeout(() => { setData(mockData); setLoading(false) }, 500)
  }, [])

  const filtered = useMemo(() => {
    if (!search) return data
    const s = search.toLowerCase()
    return data.filter(d => d.city.toLowerCase().includes(s))
  }, [data, search])

  const maxUmr = data.length > 0 ? Math.max(...data.map(d => d.umr_amount)) : 0
  const minUmr = data.length > 0 ? Math.min(...data.map(d => d.umr_amount)) : 0

  if (loading) {
    return <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">City UMR</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1"><MapPin className="h-4 w-4" /> Upah Minimum Regional per kota tahun 2026</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Tambah Kota</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Kota Terdaftar</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">UMR Tertinggi</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600">{formatRupiah(maxUmr)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">UMR Terendah</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{formatRupiah(minUmr)}</div></CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari kota..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar UMR</CardTitle>
          <CardDescription>Upah Minimum Regional per kota</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kota</TableHead>
                <TableHead>Tahun</TableHead>
                <TableHead>UMR</TableHead>
                <TableHead>Tanggal Efektif</TableHead>
                <TableHead>Dasar Hukum</TableHead>
                <TableHead>Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.city}</TableCell>
                  <TableCell>{item.year}</TableCell>
                  <TableCell className="font-mono">{formatRupiah(item.umr_amount)}</TableCell>
                  <TableCell>{item.effective_date}</TableCell>
                  <TableCell className="text-sm">{item.source}</TableCell>
                  <TableCell className="text-muted-foreground">{item.notes || "-"}</TableCell>
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
