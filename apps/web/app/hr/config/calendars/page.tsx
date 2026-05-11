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
import { CalendarDays, Plus, Search } from "lucide-react"

interface WorkCalendar {
  id: string
  date: string
  name: string
  type: "national_holiday" | "cuti_bersama" | "company_holiday" | "weekend"
  is_paid: boolean
  description: string
}

const mockCalendars: WorkCalendar[] = [
  { id: "1", date: "2026-01-01", name: "Tahun Baru Masehi", type: "national_holiday", is_paid: true, description: "Hari libur nasional" },
  { id: "2", date: "2026-03-20", name: "Isra Mi'raj Nabi Muhammad SAW", type: "national_holiday", is_paid: true, description: "" },
  { id: "3", date: "2026-03-29", name: "Hari Raya Nyepi", type: "national_holiday", is_paid: true, description: "Tahun Baru Saka" },
  { id: "4", date: "2026-04-03", name: "Wafat Isa Al-Masih", type: "national_holiday", is_paid: true, description: "" },
  { id: "5", date: "2026-05-01", name: "Hari Buruh Internasional", type: "national_holiday", is_paid: true, description: "" },
  { id: "6", date: "2026-05-16", name: "Kenaikan Isa Al-Masih", type: "national_holiday", is_paid: true, description: "" },
  { id: "7", date: "2026-06-17", name: "Idul Fitri 1447H (Hari 1)", type: "national_holiday", is_paid: true, description: "" },
  { id: "8", date: "2026-06-18", name: "Idul Fitri 1447H (Hari 2)", type: "national_holiday", is_paid: true, description: "" },
  { id: "9", date: "2026-06-15", name: "Cuti Bersama Idul Fitri", type: "cuti_bersama", is_paid: true, description: "Cuti bersama sebelum Idul Fitri" },
  { id: "10", date: "2026-06-16", name: "Cuti Bersama Idul Fitri", type: "cuti_bersama", is_paid: true, description: "Cuti bersama sebelum Idul Fitri" },
  { id: "11", date: "2026-08-17", name: "Hari Kemerdekaan RI", type: "national_holiday", is_paid: true, description: "" },
  { id: "12", date: "2026-12-25", name: "Hari Natal", type: "national_holiday", is_paid: true, description: "" },
  { id: "13", date: "2026-12-31", name: "Libur Akhir Tahun Perusahaan", type: "company_holiday", is_paid: true, description: "Kebijakan perusahaan" },
]

const typeLabel: Record<string, string> = {
  national_holiday: "Libur Nasional",
  cuti_bersama: "Cuti Bersama",
  company_holiday: "Libur Perusahaan",
  weekend: "Weekend",
}

const typeColor: Record<string, string> = {
  national_holiday: "bg-red-100 text-red-700",
  cuti_bersama: "bg-amber-100 text-amber-700",
  company_holiday: "bg-blue-100 text-blue-700",
  weekend: "bg-gray-100 text-gray-700",
}

export default function WorkCalendarsPage() {
  const [calendars, setCalendars] = useState<WorkCalendar[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string>("all")

  useEffect(() => {
    setTimeout(() => { setCalendars(mockCalendars); setLoading(false) }, 500)
  }, [])

  const filtered = useMemo(() => {
    let result = calendars
    if (filterType !== "all") result = result.filter(c => c.type === filterType)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(c => c.name.toLowerCase().includes(s))
    }
    return result
  }, [calendars, search, filterType])

  const nationalCount = calendars.filter(c => c.type === "national_holiday").length
  const cutiCount = calendars.filter(c => c.type === "cuti_bersama").length
  const companyCount = calendars.filter(c => c.type === "company_holiday").length

  if (loading) {
    return <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Calendars</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1"><CalendarDays className="h-4 w-4" /> Kalender libur & cuti bersama tahun 2026</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Tambah Libur</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Hari Libur</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{calendars.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Libur Nasional</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{nationalCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Cuti Bersama</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{cutiCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Libur Perusahaan</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{companyCount}</div></CardContent></Card>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari hari libur..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">Semua Tipe</option>
          <option value="national_holiday">Libur Nasional</option>
          <option value="cuti_bersama">Cuti Bersama</option>
          <option value="company_holiday">Libur Perusahaan</option>
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kalender Libur 2026</CardTitle>
          <CardDescription>Daftar hari libur dan cuti bersama</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nama Libur</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Dibayar</TableHead>
                <TableHead>Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(cal => (
                <TableRow key={cal.id}>
                  <TableCell className="font-mono text-sm">{cal.date}</TableCell>
                  <TableCell className="font-medium">{cal.name}</TableCell>
                  <TableCell><Badge className={typeColor[cal.type]}>{typeLabel[cal.type]}</Badge></TableCell>
                  <TableCell>{cal.is_paid ? "Ya" : "Tidak"}</TableCell>
                  <TableCell className="text-muted-foreground">{cal.description || "-"}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Tidak ada data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
