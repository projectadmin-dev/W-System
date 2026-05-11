"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { NavUser } from "@/components/nav-user"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@workspace/ui/components/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  BreadcrumbEllipsis,
} from "@workspace/ui/components/breadcrumb"
import {
  ArrowLeft, Plus, Search, Eye, FileText, CalendarClock, Send, Archive, Megaphone
} from "lucide-react"
import Link from "next/link"

/* ═════════════════ DUMMY DATA ═════════════════ */

const dummyAnnouncements = [
  {
    id: 1,
    title: "Fitur Baru: Auto-Report Dashboard",
    jenis: "fitur_baru",
    content: "Senang mengumumkan fitur baru Auto-Report Dashboard...",
    target: "all",
    targetLabel: "Semua Client",
    scheduledAt: "2026-04-20 09:00",
    sentAt: "2026-04-20",
    status: "terkirim",
    totalClient: 15,
    readCount: 12,
    clickedCount: 8,
  },
  {
    id: 2,
    title: "Maintenance Sistem 25 April 2026",
    jenis: "info_pemeliharaan",
    content: "Akan ada maintenance sistem pada tanggal 25 April...",
    target: "all",
    targetLabel: "Semua Client",
    scheduledAt: "2026-04-22 08:00",
    sentAt: "2026-04-22",
    status: "terkirim",
    totalClient: 15,
    readCount: 14,
    clickedCount: 5,
  },
  {
    id: 3,
    title: "Program Retainer Diskon 20%",
    jenis: "pelayanan_baru",
    content: "Khusus client yang melanjutkan retainer tahun ini...",
    target: "at_risk",
    targetLabel: "At Risk",
    scheduledAt: null,
    sentAt: null,
    status: "draft",
    totalClient: 3,
    readCount: 0,
    clickedCount: 0,
  },
  {
    id: 4,
    title: "Undangan Gathering Client 15 Mei 2026",
    jenis: "undangan_event",
    content: "Kami mengundang semua client untuk hadir dalam acara gathering...",
    target: "all",
    targetLabel: "Semua Client",
    scheduledAt: "2026-04-28 10:00",
    sentAt: null,
    status: "terjadwal",
    totalClient: 15,
    readCount: 0,
    clickedCount: 0,
  },
  {
    id: 5,
    title: "Perubahan SLA Support Mei 2026",
    jenis: "fitur_baru",
    content: "Mulai 1 Mei 2026, SLA response untuk support level enterprise...",
    target: "enterprise",
    targetLabel: "Enterprise",
    scheduledAt: "2026-04-18 09:00",
    sentAt: "2026-04-18",
    status: "terkirim",
    totalClient: 4,
    readCount: 4,
    clickedCount: 3,
  },
  {
    id: 6,
    title: "Rilis Mobile App v2.0",
    jenis: "fitur_baru",
    content: "Mobile app WIT sekarang hadir dengan versi 2.0 yang membawa banyak peningkatan...",
    target: "retainer",
    targetLabel: "Retainer",
    scheduledAt: null,
    sentAt: "2026-03-15",
    status: "archived",
    totalClient: 8,
    readCount: 7,
    clickedCount: 6,
  },
]

const jenisConfig: Record<string, { label: string; color: string; icon: string }> = {
  fitur_baru:        { label: "Fitur Baru",         color: "bg-blue-100 text-blue-800 border-blue-300",   icon: "🔵" },
  pelayanan_baru:     { label: "Pelayanan Baru",      color: "bg-green-100 text-green-800 border-green-300", icon: "🟢" },
  info_pemeliharaan: { label: "Info Pemeliharaan",  color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: "🟡" },
  undangan_event:    { label: "Undangan Event",      color: "bg-purple-100 text-purple-800 border-purple-300", icon: "🟣" },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft:      { label: "Draft",      color: "bg-zinc-100 text-zinc-600 border-zinc-300" },
  terjadwal:  { label: "Terjadwal",  color: "bg-blue-100 text-blue-700 border-blue-300" },
  terkirim:   { label: "Terkirim",  color: "bg-green-100 text-green-700 border-green-300" },
  archived:   { label: "Archived",  color: "bg-zinc-100 text-zinc-500 border-zinc-300 opacity-70" },
}

export default function PengumumanListPage() {
  const [search, setSearch] = useState("")
  const [jenisFilter, setJenisFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const filtered = dummyAnnouncements.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase())
    const matchJenis = jenisFilter === "all" || a.jenis === jenisFilter
    const matchStatus = statusFilter === "all" || a.status === statusFilter
    return matchSearch && matchJenis && matchStatus
  })

  const draftCount = dummyAnnouncements.filter(a => a.status === "draft").length
  const terjadwalCount = dummyAnnouncements.filter(a => a.status === "terjadwal").length
  const terkirimCount = dummyAnnouncements.filter(a => a.status === "terkirim").length
  const archivedCount = dummyAnnouncements.filter(a => a.status === "archived").length

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 w-full bg-white dark:bg-zinc-800 shrink-0 items-center justify-between gap-2 px-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem><BreadcrumbLink href="/after-sales">After Sales</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>Pengumuman & Update</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <NavUser user={{ name: "Aziz", email: "aziz@wit.id", avatar: "/avatars/user.jpg" }} />
        </header>

        <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">

          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/after-sales">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Pengumuman & Update</h1>
                <p className="text-muted-foreground text-sm">Kirim pengumuman & update ke client</p>
              </div>
            </div>
            <Link href="/after-sales/pengumuman/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Buat Pengumuman Baru
              </Button>
            </Link>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-500" />
                  <span className="text-sm text-muted-foreground">Draft</span>
                </div>
                <div className="text-2xl font-bold mt-1">{draftCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Terjadwal</span>
                </div>
                <div className="text-2xl font-bold mt-1">{terjadwalCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Terkirim</span>
                </div>
                <div className="text-2xl font-bold mt-1">{terkirimCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-muted-foreground">Archived</span>
                </div>
                <div className="text-2xl font-bold mt-1">{archivedCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari pengumuman..."
                className="pl-8"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={jenisFilter} onValueChange={setJenisFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="fitur_baru">🔵 Fitur Baru</SelectItem>
                <SelectItem value="pelayanan_baru">🟢 Pelayanan Baru</SelectItem>
                <SelectItem value="info_pemeliharaan">🟡 Info Pemeliharaan</SelectItem>
                <SelectItem value="undangan_event">🟣 Undangan Event</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="terjadwal">Terjadwal</SelectItem>
                <SelectItem value="terkirim">Terkirim</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Jadwal Kirim</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Client</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <Megaphone className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>Tidak ada pengumuman</p>
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(ann => {
                    const jCfg = jenisConfig[ann.jenis]
                    const stCfg = statusConfig[ann.status]

                    return (
                      <TableRow key={ann.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Link href={`/after-sales/pengumuman/${ann.id}`} className="font-medium hover:underline">
                            {ann.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={jCfg.color}>
                            {jCfg.icon} {jCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ann.targetLabel}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            {ann.sentAt ? (
                              <>
                                <Send className="w-3.5 h-3.5 text-green-500" />
                                <span className="text-muted-foreground">{ann.sentAt}</span>
                              </>
                            ) : ann.scheduledAt ? (
                              <>
                                <CalendarClock className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-blue-600">{ann.scheduledAt}</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={stCfg.color}>
                            {stCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{ann.totalClient}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/after-sales/pengumuman/${ann.id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
