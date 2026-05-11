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
import { Clock, Plus, Search, Edit, Trash2 } from "lucide-react"

interface WorkShift {
  id: string
  code: string
  name: string
  start_time: string
  end_time: string
  break_start: string
  break_end: string
  break_duration_minutes: number
  grace_period_minutes: number
  is_active: boolean
  is_default: boolean
}

const mockShifts: WorkShift[] = [
  { id: "1", code: "SHIFT-AM", name: "Shift Pagi", start_time: "08:00", end_time: "17:00", break_start: "12:00", break_end: "13:00", break_duration_minutes: 60, grace_period_minutes: 15, is_active: true, is_default: true },
  { id: "2", code: "SHIFT-PM", name: "Shift Siang", start_time: "13:00", end_time: "22:00", break_start: "17:00", break_end: "18:00", break_duration_minutes: 60, grace_period_minutes: 15, is_active: true, is_default: false },
  { id: "3", code: "SHIFT-NT", name: "Shift Malam", start_time: "22:00", end_time: "07:00", break_start: "02:00", break_end: "03:00", break_duration_minutes: 60, grace_period_minutes: 10, is_active: true, is_default: false },
]

export default function WorkShiftsPage() {
  const [shifts, setShifts] = useState<WorkShift[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    setTimeout(() => { setShifts(mockShifts); setLoading(false) }, 500)
  }, [])

  const filtered = useMemo(() => {
    if (!search) return shifts
    const s = search.toLowerCase()
    return shifts.filter(sh => sh.name.toLowerCase().includes(s) || sh.code.toLowerCase().includes(s))
  }, [shifts, search])

  const activeCount = shifts.filter(s => s.is_active).length
  const defaultCount = shifts.filter(s => s.is_default).length

  if (loading) {
    return <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Shifts</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1"><Clock className="h-4 w-4" /> Kelola jadwal shift kerja karyawan</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Tambah Shift</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Shift</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{shifts.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Shift Aktif</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Shift Default</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{defaultCount}</div></CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari shift..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Shift</CardTitle>
          <CardDescription>Konfigurasi jam kerja per shift</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Shift</TableHead>
                <TableHead>Jam Masuk</TableHead>
                <TableHead>Jam Keluar</TableHead>
                <TableHead>Istirahat</TableHead>
                <TableHead>Toleransi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Default</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(shift => (
                <TableRow key={shift.id}>
                  <TableCell className="font-mono text-sm">{shift.code}</TableCell>
                  <TableCell className="font-medium">{shift.name}</TableCell>
                  <TableCell>{shift.start_time}</TableCell>
                  <TableCell>{shift.end_time}</TableCell>
                  <TableCell>{shift.break_start} - {shift.break_end}</TableCell>
                  <TableCell>{shift.grace_period_minutes} menit</TableCell>
                  <TableCell>
                    <Badge className={shift.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}>
                      {shift.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {shift.is_default && <Badge className="bg-blue-100 text-blue-700">Default</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Tidak ada data shift</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
