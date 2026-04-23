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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/ui/components/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/dialog"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import { ArrowLeft, Users, Phone, Mail, CalendarDays, Star, TrendingUp, AlertTriangle, CheckCircle2, Clock, Eye, Plus, Search } from "lucide-react"
import Link from "next/link"

/* ═════════════════ DUMMY DATA ═════════════════ */

const dummyClients = [
  { id: 1, name: "PT Maju Jaya", pic: "Budi Santoso", email: "budi@maju.co", phone: "0812-3456-7890", status: "active", score: 92, lastContact: "2 hari lalu", nextFollowUp: "2026-04-28", revenue: "Rp 2.1M", projects: 3, retainer: true, retainerHours: 40 },
  { id: 2, name: "CV Kreasi Digital", pic: "Ani Wijaya", email: "ani@kreasi.id", phone: "0813-9876-5432", status: "warm", score: 68, lastContact: "1 minggu lalu", nextFollowUp: "2026-04-25", revenue: "Rp 850jt", projects: 2, retainer: false, retainerHours: 0 },
  { id: 3, name: "PT Sinergi Nusantara", pic: "Cahyo Pratama", email: "cahyo@sinergi.net", phone: "0821-1234-5678", status: "at_risk", score: 35, lastContact: "2 bulan lalu", nextFollowUp: "2026-04-24", revenue: "Rp 450jt", projects: 1, retainer: false, retainerHours: 0 },
  { id: 4, name: "PT Global Tech", pic: "Dewi Lestari", email: "dewi@global.tech", phone: "0856-7890-1234", status: "cold", score: 48, lastContact: "3 minggu lalu", nextFollowUp: "2026-04-30", revenue: "Rp 1.2M", projects: 2, retainer: true, retainerHours: 20 },
  { id: 5, name: "CV Media Prima", pic: "Eko Hartono", email: "eko@media.id", phone: "0811-2222-3333", status: "active", score: 85, lastContact: "5 hari lalu", nextFollowUp: "2026-05-02", revenue: "Rp 3.5M", projects: 5, retainer: true, retainerHours: 60 },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  active:  { label: "Active",  color: "bg-green-100 text-green-800 border-green-300" },
  warm:    { label: "Warm",    color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  cold:    { label: "Cold",    color: "bg-slate-100 text-slate-600 border-slate-300" },
  at_risk: { label: "At Risk", color: "bg-red-100 text-red-800 border-red-300" },
  dormant: { label: "Dormant", color: "bg-zinc-100 text-zinc-600 border-zinc-300" },
}

export default function AfterSalesClientsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showDialog, setShowDialog] = useState(false)

  const filtered = dummyClients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.pic.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || c.status === statusFilter
    return matchSearch && matchStatus
  })

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
                <BreadcrumbItem><BreadcrumbPage>Client Relationship</BreadcrumbPage></BreadcrumbItem>
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
                <h1 className="text-2xl font-bold tracking-tight">Client Relationship</h1>
                <p className="text-muted-foreground text-sm">Pantau dan kelola relasi client post-sale</p>
              </div>
            </div>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Catatan Kontak
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari client atau PIC..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="cold">Cold</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
                <SelectItem value="dormant">Dormant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>PIC Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Last Contact</TableHead>
                    <TableHead>Next Follow-Up</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Retainer</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(client => {
                    const cfg = statusConfig[client.status]
                    return (
                      <TableRow key={client.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="font-medium">{client.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Mail className="w-3 h-3" />{client.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{client.pic}</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />{client.phone}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${client.score >= 70 ? 'bg-green-500' : client.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                            <span className="font-semibold">{client.score}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{client.lastContact}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className={client.nextFollowUp < '2026-04-25' ? 'text-red-600 font-medium' : ''}>{client.nextFollowUp}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{client.projects} project</TableCell>
                        <TableCell>
                          {client.retainer ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{client.retainerHours} jam/bulan</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{client.revenue}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost"><Eye className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Dialog: Tambah Catatan Kontak */}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Tambah Catatan Kontak</DialogTitle>
                <DialogDescription>Catat interaksi terbaru dengan client.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label>Pilih Client</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Pilih client..." /></SelectTrigger>
                    <SelectContent>
                      {dummyClients.map(c => (<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Tipe Kontak</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Pilih tipe..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="call">Telepon</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="visit">Visit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Tanggal Kontak</Label>
                  <Input type="date" />
                </div>
                <div className="grid gap-2">
                  <Label>Catatan / Ringkasan</Label>
                  <Textarea placeholder="Apa yang dibicarakan, hasil, next step..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
                <Button onClick={() => setShowDialog(false)}>Simpan Catatan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
