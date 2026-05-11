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
import { Timer, Plus, Search, Edit, Trash2 } from "lucide-react"

interface OvertimeRule {
  id: string
  code: string
  name: string
  min_overtime_minutes: number
  overtime_multiplier: number
  max_overtime_hours_per_day: number
  max_overtime_hours_per_month: number
  is_active: boolean
  description: string
}

const mockRules: OvertimeRule[] = [
  { id: "1", code: "OT-WD", name: "Lembur Hari Kerja", min_overtime_minutes: 30, overtime_multiplier: 1.5, max_overtime_hours_per_day: 3, max_overtime_hours_per_month: 40, is_active: true, description: "Jam pertama 1.5x, selanjutnya 2x" },
  { id: "2", code: "OT-WE", name: "Lembur Hari Libur/Weekend", min_overtime_minutes: 60, overtime_multiplier: 2.0, max_overtime_hours_per_day: 8, max_overtime_hours_per_month: 40, is_active: true, description: "Sesuai UU Ketenagakerjaan" },
  { id: "3", code: "OT-HD", name: "Lembur Hari Besar", min_overtime_minutes: 60, overtime_multiplier: 3.0, max_overtime_hours_per_day: 8, max_overtime_hours_per_month: 40, is_active: true, description: "Hari libur nasional/keagamaan" },
]

export default function OvertimeRulesPage() {
  const [rules, setRules] = useState<OvertimeRule[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setTimeout(() => { setRules(mockRules); setLoading(false) }, 500)
  }, [])

  const filtered = useMemo(() => {
    if (!search) return rules
    const s = search.toLowerCase()
    return rules.filter(r => r.name.toLowerCase().includes(s) || r.code.toLowerCase().includes(s))
  }, [rules, search])

  const activeCount = rules.filter(r => r.is_active).length

  if (loading) {
    return <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overtime Rules</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1"><Timer className="h-4 w-4" /> Aturan perhitungan lembur karyawan</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Tambah Aturan</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Aturan</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{rules.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Aturan Aktif</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{activeCount}</div></CardContent></Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari aturan lembur..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Aturan Lembur</CardTitle>
          <CardDescription>Konfigurasi multiplier dan batas lembur</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Min Lembur</TableHead>
                <TableHead>Multiplier</TableHead>
                <TableHead>Max/Hari</TableHead>
                <TableHead>Max/Bulan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(rule => (
                <TableRow key={rule.id}>
                  <TableCell className="font-mono text-sm">{rule.code}</TableCell>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>{rule.min_overtime_minutes} menit</TableCell>
                  <TableCell><Badge className="bg-blue-100 text-blue-700">{rule.overtime_multiplier}x</Badge></TableCell>
                  <TableCell>{rule.max_overtime_hours_per_day} jam</TableCell>
                  <TableCell>{rule.max_overtime_hours_per_month} jam</TableCell>
                  <TableCell>
                    <Badge className={rule.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}>
                      {rule.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{rule.description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
