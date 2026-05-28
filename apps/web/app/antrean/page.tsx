"use client"

import { useState, useMemo } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { NavUser } from "@/components/nav-user"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@workspace/ui/components/sidebar"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Ticket, Search, ListOrdered, Clock, CheckCircle2, PhoneCall, UserCheck, AlertTriangle
} from "lucide-react"
import Link from "next/link"

// ═══════════════════════════════════════════════
//   DUMMY DATA — Antrean Layanan
//   ═══════════════════════════════════════════════

const antreanData = [
  { id: "A001", nomorUrut: 1, nama: "Supardi", layanan: "Pendaftaran NPWP", waktuDatang: "08:15", status: "menunggu", loket: "-", estimasi: "08:35", kontak: "0812-3456-7890" },
  { id: "A002", nomorUrut: 2, nama: "Siti Aminah", layanan: "Aktivasi EFIN", waktuDatang: "08:22", status: "diproses", loket: "1", estimasi: "08:40", kontak: "0813-2234-5566" },
  { id: "A003", nomorUrut: 3, nama: "Bambang S", layanan: "Pelaporan SPT", waktuDatang: "08:30", status: "selesai", loket: "2", estimasi: "", kontak: "0815-6677-8899" },
  { id: "A004", nomorUrut: 4, nama: "Rina Marlina", layanan: "Pendaftaran NPWP", waktuDatang: "08:45", status: "menunggu", loket: "-", estimasi: "09:00", kontak: "0811-9988-7766" },
  { id: "A005", nomorUrut: 5, nama: "Agus Widodo", layanan: "Konsultasi Pajak", waktuDatang: "08:50", status: "diproses", loket: "3", estimasi: "09:10", kontak: "0814-1122-3344" },
  { id: "A006", nomorUrut: 6, nama: "Dewi Kusuma", layanan: "Restitusi PPN", waktuDatang: "09:00", status: "menunggu", loket: "-", estimasi: "09:25", kontak: "0816-5544-3322" },
  { id: "A007", nomorUrut: 7, nama: "Fajar Nugroho", layanan: "Pengukuhan PKP", waktuDatang: "09:10", status: "dibatalkan", loket: "-", estimasi: "", kontak: "0818-7766-5544" },
  { id: "A008", nomorUrut: 8, nama: "Lestari Indah", layanan: "Perubahan Data WP", waktuDatang: "09:20", status: "menunggu", loket: "-", estimasi: "09:40", kontak: "0819-3322-1155" },
  { id: "A009", nomorUrut: 9, nama: "Herman Tan", layanan: "Aktivasi EFIN", waktuDatang: "09:25", status: "diproses", loket: "1", estimasi: "09:45", kontak: "0821-6655-7788" },
  { id: "A010", nomorUrut: 10, nama: "Nina Wulandari", layanan: "Pelaporan SPT", waktuDatang: "09:30", status: "menunggu", loket: "-", estimasi: "10:00", kontak: "0822-8877-6655" },
]

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  menunggu:   { label: "Menunggu",    color: "bg-blue-100 text-blue-800 border-blue-300",  icon: Clock },
  diproses:   { label: "Diproses",    color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: PhoneCall },
  selesai:    { label: "Selesai",     color: "bg-green-100 text-green-800 border-green-300",    icon: CheckCircle2 },
  dibatalkan: { label: "Dibatalkan",  color: "bg-red-100 text-red-800 border-red-300",           icon: AlertTriangle },
}

// default fallback
const defaultCfg = { label: "Unknown", color: "bg-gray-100 text-gray-800 border-gray-300", icon: Clock }

/* ═══════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════ */

export default function AntreanPage() {
  const [search, setSearch] = useState("")
  const [filterLayanan, setFilterLayanan] = useState<string>("semua")
  const [filterStatus, setFilterStatus] = useState<string>("semua")

  const layananOptions = useMemo(
    () => ["semua", ...Array.from(new Set(antreanData.map(a => a.layanan)))],
    []
  )

  const statusOptions = ["semua", "menunggu", "diproses", "selesai", "dibatalkan"]

  const filtered = antreanData.filter(a => {
    const matchSearch =
      a.nama.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.layanan.toLowerCase().includes(search.toLowerCase()) ||
      a.kontak.toLowerCase().includes(search.toLowerCase())

    const matchLayanan = filterLayanan === "semua" || a.layanan === filterLayanan
    const matchStatus  = filterStatus  === "semua" || a.status   === filterStatus

    return matchSearch && matchLayanan && matchStatus
  })

  const total     = antreanData.length
  const menunggu  = antreanData.filter(a => a.status === "menunggu").length
  const diproses  = antreanData.filter(a => a.status === "diproses").length
  const selesai   = antreanData.filter(a => a.status === "selesai").length
  const dibatalkan = antreanData.filter(a => a.status === "dibatalkan").length

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 w-full bg-white dark:bg-zinc-800 shrink-0 items-center justify-between gap-2 px-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">W.System</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Layanan Antrean</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <NavUser user={{ name: "Reddie", email: "reddie@wit.id", avatar: "/avatars/user.jpg" }} />
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">

            {/* Page Title */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <ListOrdered className="w-6 h-6 text-cyan-600" />
                  Layanan Antrean
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Pantau dan kelola antrean layanan secara real-time
                </p>
              </div>
            </div>

            {/* ═══════ Stats Cards ═══════ */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Antrean</CardTitle>
                  <ListOrdered className="h-4 w-4 text-cyan-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{total}</div>
                  <p className="text-xs text-muted-foreground">Semua nomor antrean</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
                  <Clock className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{menunggu}</div>
                  <p className="text-xs text-muted-foreground">Belum dipanggil</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Diproses</CardTitle>
                  <PhoneCall className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{diproses}</div>
                  <p className="text-xs text-muted-foreground">Sedang dilayani</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Selesai</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{selesai}</div>
                  <p className="text-xs text-muted-foreground">Layanan selesai</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Dibatalkan</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{dibatalkan}</div>
                  <p className="text-xs text-muted-foreground">Batal antrean</p>
                </CardContent>
              </Card>
            </div>

            {/* ═══════ Search & Filters ═══════ */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  Pencarian Antrean
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Cari berdasarkan nama, ID antrean, jenis layanan, atau nomor kontak
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari antrean... (nama, ID, layanan, kontak)"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterLayanan} onValueChange={setFilterLayanan}>
                    <SelectTrigger className="w-full sm:w-56">
                      <SelectValue placeholder="Layanan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semua">Semua Layanan</SelectItem>
                      {layananOptions.filter(o => o !== "semua").map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semua">Semua Status</SelectItem>
                      <SelectItem value="menunggu">Menunggu</SelectItem>
                      <SelectItem value="diproses">Diproses</SelectItem>
                      <SelectItem value="selesai">Selesai</SelectItem>
                      <SelectItem value="dibatalkan">Dibatalkan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* ═══════ Antrean Table ═══════ */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  Daftar Antrean
                  {search && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({filtered.length} hasil untuk &quot;{search}&quot;)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">No</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Layanan</TableHead>
                      <TableHead>Waktu Datang</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Loket</TableHead>
                      <TableHead>Estimasi Selesai</TableHead>
                      <TableHead>Kontak</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          Tidak ada antrean yang cocok dengan pencarian.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((a) => {
                        const cfg = statusConfig[a.status] || defaultCfg
                        return (
                          <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="font-semibold">{a.nomorUrut}</TableCell>
                            <TableCell className="font-mono text-sm">{a.id}</TableCell>
                            <TableCell className="font-medium">{a.nama}</TableCell>
                            <TableCell className="text-sm">{a.layanan}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{a.waktuDatang}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cfg.color}>
                                <cfg.icon className="w-3 h-3 mr-1" />
                                {cfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell>{a.loket !== "-" ? <span className="font-medium text-sm">Loket {a.loket}</span> : <span className="text-muted-foreground text-sm">—</span>}</TableCell>
                            <TableCell className="text-sm">{a.estimasi || <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell className="text-sm font-mono">{a.kontak}</TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
