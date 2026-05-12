"use client"

import { useState } from "react"
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
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/ui/components/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@workspace/ui/components/dialog"
import { ArrowLeft, Megaphone, Eye, Plus, Search, Send, PenLine, Archive } from "lucide-react"
import Link from "next/link"

/* ═════════════════ DUMMY DATA ═════════════════ */

const dummyAnnouncements = [
  { id: 1, title: "Fitur Baru: Auto-Report Dashboard", slug: "auto-report-dashboard", content: "Senang mengumumkan fitur baru Auto-Report Dashboard yang memudahkan client melihat performa project secara real-time tanpa request manual.", category: "feature_update", priority: "high", status: "published", target: "all", sent: "2026-04-20", read: 12, total: 15, publisher: "Aziz" },
  { id: 2, title: "Maintenance Sistem 25 April 2026", slug: "maintenance-25-april", content: "Akan ada maintenance sistem pada tanggal 25 April 2026 pukul 02:00-05:00 WIB. Mohon simpan pekerjaan sebelum waktu tersebut.", category: "maintenance_notice", priority: "urgent", status: "published", target: "all", sent: "2026-04-22", read: 14, total: 15, publisher: "Aziz" },
  { id: 3, title: "Program Retainer Diskon 20%", slug: "retainer-diskon-20", content: "Khusus client yang melanjutkan retainer tahun ini, dapatkan diskon 20% untuk semua request support.", category: "new_offering", priority: "normal", status: "draft", target: "at_risk", sent: null, read: 0, total: 3, publisher: "Aziz" },
  { id: 4, title: "Undangan Gathering Client 15 Mei", slug: "gathering-15-mei", content: "Kami mengundang semua client untuk hadir dalam acara gathering bertema Networking & Tech Updates.", category: "event_invitation", priority: "normal", status: "scheduled", target: "all", sent: null, read: 0, total: 15, publisher: "Aziz" },
  { id: 5, title: "Perubahan SLA Support", slug: "perubahan-sla-support", content: "Mulai 1 Mei 2026, SLA response untuk support level enterprise berubah menjadi 2 jam.", category: "service_change", priority: "high", status: "published", target: "enterprise", sent: "2026-04-18", read: 4, total: 4, publisher: "Aziz" },
]

const catLabels: Record<string, string> = {
  feature_update: "Fitur Baru",
  service_change: "Perubahan Layanan",
  maintenance_notice: "Pemeliharaan",
  new_offering: "Penawaran Baru",
  announcement: "Pengumuman",
  event_invitation: "Undangan Event",
}

export default function AfterSalesPengumumanPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showCreate, setShowCreate] = useState(false)

  const filtered = dummyAnnouncements.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || a.status === statusFilter
    return matchSearch && matchStatus
  })

  const publishedCount = dummyAnnouncements.filter(a => a.status === "published").length
  const totalReads = dummyAnnouncements.reduce((s, a) => s + a.read, 0)
  const totalTargets = dummyAnnouncements.reduce((s, a) => s + a.total, 0)

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
                <BreadcrumbItem><BreadcrumbPage>Pengumuman</BreadcrumbPage></BreadcrumbItem>
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
                <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Pengumuman & Feature Update</h1>
                <p className="text-muted-foreground text-sm">Kirim update ke client via email + portal</p>
              </div>
            </div>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Buat Pengumuman Baru
            </Button>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Terkirim</CardTitle>
                <Send className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{publishedCount}</div>
                <p className="text-xs text-muted-foreground">Sudah diterbitkan</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Dibaca</CardTitle>
                <Eye className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalReads}</div>
                <p className="text-xs text-muted-foreground">Dari {totalTargets} client</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Draft</CardTitle>
                <PenLine className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dummyAnnouncements.filter(a => a.status === "draft").length}</div>
                <p className="text-xs text-muted-foreground">Belum terbit</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Archie</CardTitle>
                <Archive className="h-4 w-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Sudah tidak aktif</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari judul pengumuman..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Terjadwal</SelectItem>
                <SelectItem value="published">Terkirim</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Dibaca</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(a => (
                    <TableRow key={a.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="font-medium">{a.title}</div>
                        <div className="text-xs text-muted-foreground">Oleh {a.publisher}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{catLabels[a.category]}</Badge></TableCell>
                      <TableCell>
                        <Badge className={
                          a.priority === "urgent" ? "bg-red-100 text-red-800" :
                          a.priority === "high" ? "bg-orange-100 text-orange-800" :
                          "bg-zinc-100 text-zinc-800"
                        }>{a.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.status === "published" ? "default" : a.status === "scheduled" ? "secondary" : "outline"}>
                          {a.status === "published" ? "Terkirim" : a.status === "scheduled" ? "Terjadwal" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{a.target}</TableCell>
                      <TableCell className="text-sm">{a.sent || "—"}</TableCell>
                      <TableCell>
                        {a.status === "published" ? (
                          <div className="flex items-center gap-2">
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm">{a.read}/{a.total}</span>
                            <div className="w-20 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.round((a.read / a.total) * 100)}%` }} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost"><ArrowLeft className="w-4 h-4 rotate-180" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Create Dialog */}
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Buat Pengumuman Baru</DialogTitle>
                <DialogDescription>Kirim update ke semua client yang dipilih.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label>Judul *</Label>
                  <Input placeholder="e.g., Fitur Baru: Auto-Report Dashboard" />
                </div>
                <div className="grid gap-2">
                  <Label>Ringkasan (muncul di email subject)</Label>
                  <Input placeholder="Satu kalimat menarik..." />
                </div>
                <div className="grid gap-2">
                  <Label>Isi Pengumuman *</Label>
                  <Textarea rows={5} placeholder="Jelaskan detailnya kepada client..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Kategori</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feature_update">Fitur Baru</SelectItem>
                        <SelectItem value="service_change">Perubahan Layanan</SelectItem>
                        <SelectItem value="maintenance_notice">Pemeliharaan</SelectItem>
                        <SelectItem value="new_offering">Penawaran Baru</SelectItem>
                        <SelectItem value="announcement">Pengumuman</SelectItem>
                        <SelectItem value="event_invitation">Undangan Event</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Priority</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Target Client</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Client</SelectItem>
                      <SelectItem value="enterprise">Enterprise Only</SelectItem>
                      <SelectItem value="active_retainer">Retainer Aktif</SelectItem>
                      <SelectItem value="at_risk">At Risk / Cold</SelectItem>
                      <SelectItem value="specific">Pilih Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Tanggal Terbit</Label>
                    <Input type="date" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select defaultValue="draft">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Simpan Draft</SelectItem>
                        <SelectItem value="published">Publikasikan Sekarang</SelectItem>
                        <SelectItem value="scheduled">Jadwalkan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Batal</Button>
                <Button onClick={() => setShowCreate(false)}><Send className="w-4 h-4 mr-2" />Simpan & Kirim</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
