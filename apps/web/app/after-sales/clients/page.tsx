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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Users, Phone, Mail, CalendarDays, Star, AlertTriangle, Eye, Plus, Search, Building2, UserCircle, TrendingUp, Clock, FolderOpen } from "lucide-react"
import Link from "next/link"

/* ═════════════════ DUMMY DATA — lastContact & nextFollowUp PER PROJECT ═════════════════ */

const dummyClients = [
  {
    id: 1,
    name: "PT Maju Jaya",
    pic: "Budi Santoso",
    email: "budi@maju.co",
    phone: "0812-3456-7890",
    status: "active",
    relationScore: 85,
    revenue: "Rp 2.100.000.000",
    totalProject: 3,
    retainer: true,
    segment: "Platinum",
    industry: "Teknologi",
    projects: [
      { id: "p1-1", name: "Website Redesign", type: "Website", lastContact: "2026-04-27", nextFollowUp: "2026-05-05" },
      { id: "p1-2", name: "Branding Kit 2026", type: "Branding", lastContact: "2026-04-20", nextFollowUp: "2026-05-10" },
      { id: "p1-3", name: "IoT Sensor Monitoring", type: "IoT", lastContact: "2026-03-15", nextFollowUp: "2026-04-30" },
    ],
  },
  {
    id: 2,
    name: "CV Kreasi Digital",
    pic: "Ani Wijaya",
    email: "ani@kreasi.id",
    phone: "0813-9876-5432",
    status: "warm",
    relationScore: 68,
    revenue: "Rp 850.000.000",
    totalProject: 2,
    retainer: false,
    segment: "Gold",
    industry: "Media & Kreatif",
    projects: [
      { id: "p2-1", name: "Company Profile Video", type: "Video", lastContact: "2026-04-20", nextFollowUp: "2026-04-28" },
      { id: "p2-2", name: "Social Media Kit", type: "Branding", lastContact: "2026-04-10", nextFollowUp: "2026-05-01" },
    ],
  },
  {
    id: 3,
    name: "PT Sinergi Nusantara",
    pic: "Cahyo Pratama",
    email: "cahyo@sinergi.net",
    phone: "0821-1234-5678",
    status: "at_risk",
    relationScore: 22,
    revenue: "Rp 450.000.000",
    totalProject: 1,
    retainer: false,
    segment: "Silver",
    industry: "Logistik",
    projects: [
      { id: "p3-1", name: "Logistics App v2", type: "Mobile App", lastContact: "2026-02-15", nextFollowUp: "2026-04-24" },
    ],
  },
  {
    id: 4,
    name: "PT Global Tech",
    pic: "Dewi Lestari",
    email: "dewi@global.tech",
    phone: "0856-7890-1234",
    status: "cold",
    relationScore: 35,
    revenue: "Rp 1.200.000.000",
    totalProject: 2,
    retainer: true,
    segment: "Gold",
    industry: "Teknologi",
    projects: [
      { id: "p4-1", name: "E-Commerce Platform", type: "Website", lastContact: "2026-04-05", nextFollowUp: "2026-04-30" },
      { id: "p4-2", name: "API Integration", type: "IoT", lastContact: "2026-03-20", nextFollowUp: "2026-05-15" },
    ],
  },
  {
    id: 5,
    name: "CV Media Prima",
    pic: "Eko Hartono",
    email: "eko@media.id",
    phone: "0811-2222-3333",
    status: "active",
    relationScore: 92,
    revenue: "Rp 3.500.000.000",
    totalProject: 5,
    retainer: true,
    segment: "Platinum",
    industry: "Media & Periklanan",
    projects: [
      { id: "p5-1", name: "Digital Ads Campaign", type: "Digital Marketing", lastContact: "2026-04-22", nextFollowUp: "2026-05-02" },
      { id: "p5-2", name: "Brand Refresh", type: "Branding", lastContact: "2026-04-15", nextFollowUp: "2026-05-08" },
      { id: "p5-3", name: "Website Portal", type: "Website", lastContact: "2026-04-01", nextFollowUp: "2026-05-12" },
    ],
  },
  {
    id: 6,
    name: "PT Karya Bersama",
    pic: "Fitri Handayani",
    email: "fitri@karya.id",
    phone: "0852-1111-2222",
    status: "dormant",
    relationScore: 10,
    revenue: "Rp 200.000.000",
    totalProject: 1,
    retainer: false,
    segment: "Silver",
    industry: "Properti",
    projects: [
      { id: "p6-1", name: "Property Listing Website", type: "Website", lastContact: "2025-11-10", nextFollowUp: "2026-05-15" },
    ],
  },
  {
    id: 7,
    name: "PT Energi Terbarukan Indonesia",
    pic: "Hendra Kusuma",
    email: "hendra@eti.co.id",
    phone: "0878-3333-4444",
    status: "warm",
    relationScore: 61,
    revenue: "Rp 1.800.000.000",
    totalProject: 2,
    retainer: true,
    segment: "Gold",
    industry: "Energi",
    projects: [
      { id: "p7-1", name: "Dashboard Monitoring", type: "IoT", lastContact: "2026-04-18", nextFollowUp: "2026-05-10" },
      { id: "p7-2", name: "Mobile App", type: "Mobile App", lastContact: "2026-04-05", nextFollowUp: "2026-05-20" },
    ],
  },
]

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  active:  { label: "Active",   color: "bg-green-100 text-green-800 border-green-300",   dot: "🟢" },
  warm:    { label: "Warm",     color: "bg-yellow-100 text-yellow-800 border-yellow-300", dot: "🟡" },
  cold:    { label: "Cold",     color: "bg-slate-100 text-slate-600 border-slate-300",     dot: "🔴" },
  at_risk: { label: "At Risk", color: "bg-red-100 text-red-800 border-red-300",          dot: "🔴" },
  dormant: { label: "Dormant", color: "bg-zinc-100 text-zinc-600 border-zinc-300",       dot: "⚫" },
}

const picOptions = [
  "Budi Santoso", "Ani Wijaya", "Cahyo Pratama", "Dewi Lestari",
  "Eko Hartono", "Fitri Handayani", "Hendra Kusuma",
]

export default function AfterSalesClientsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [picFilter, setPicFilter] = useState("all")
  const [retainerFilter, setRetainerFilter] = useState("all")
  const [showDialog, setShowDialog] = useState(false)

  // Form state
  const [selectedClientId, setSelectedClientId] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [contactDate, setContactDate] = useState("")
  const [channel, setChannel] = useState("")
  const [summary, setSummary] = useState("")
  const [lastContact, setLastContact] = useState("")
  const [nextFollowUp, setNextFollowUp] = useState("")

  const filtered = dummyClients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || c.status === statusFilter
    const matchPic = picFilter === "all" || c.pic === picFilter
    const matchRetainer = retainerFilter === "all" ||
      (retainerFilter === "aktif" && c.retainer) ||
      (retainerFilter === "nonaktif" && !c.retainer)
    return matchSearch && matchStatus && matchPic && matchRetainer
  })

  const selectedClient = dummyClients.find(c => String(c.id) === selectedClientId)
  const projects = selectedClient?.projects || []

  // Reset project when client changes
  const handleClientChange = (val: string) => {
    setSelectedClientId(val)
    setSelectedProjectId("")
  }

  // Get most urgent next follow-up across all projects of a client
  const getMostUrgentFollowUp = (client: typeof dummyClients[0]) => {
    if (!client.projects.length) return null
    const today = new Date()
    const upcoming = client.projects
      .filter(p => new Date(p.nextFollowUp) >= today)
      .sort((a, b) => new Date(a.nextFollowUp).getTime() - new Date(b.nextFollowUp).getTime())
    return upcoming[0] || null
  }

  // Summary stats
  const totalClients = dummyClients.length
  const activeCount = dummyClients.filter(c => c.status === "active").length
  const atRiskCount = dummyClients.filter(c => c.status === "at_risk").length
  const warmCount = dummyClients.filter(c => c.status === "warm").length

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
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
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

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Clients</span>
                </div>
                <div className="text-2xl font-bold mt-1">{totalClients}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🟢</span>
                  <span className="text-sm text-muted-foreground">Active</span>
                </div>
                <div className="text-2xl font-bold mt-1">{activeCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">At Risk</span>
                </div>
                <div className="text-2xl font-bold mt-1">{atRiskCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🟡</span>
                  <span className="text-sm text-muted-foreground">Warm</span>
                </div>
                <div className="text-2xl font-bold mt-1">{warmCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama client..."
                className="pl-8"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">🟢 Active</SelectItem>
                <SelectItem value="warm">🟡 Warm</SelectItem>
                <SelectItem value="cold">🔴 Cold</SelectItem>
                <SelectItem value="at_risk">🔴 At Risk</SelectItem>
                <SelectItem value="dormant">⚫ Dormant</SelectItem>
              </SelectContent>
            </Select>
            <Select value={picFilter} onValueChange={setPicFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter PIC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua PIC</SelectItem>
                {picOptions.map(pic => (
                  <SelectItem key={pic} value={pic}>{pic}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={retainerFilter} onValueChange={setRetainerFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Retainer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Retainer</SelectItem>
                <SelectItem value="aktif">✅ Retainer Aktif</SelectItem>
                <SelectItem value="nonaktif">❌ Non-Retainer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Client</TableHead>
                    <TableHead>Status Relasi</TableHead>
                    <TableHead>Skor Relasi</TableHead>
                    <TableHead>PIC</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Next Follow-Up</TableHead>
                    <TableHead>Retainer</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>Tidak ada client yang cocok dengan filter</p>
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(client => {
                    const cfg = statusConfig[client.status]
                    const urgentProject = getMostUrgentFollowUp(client)
                    const isUrgent = urgentProject
                      ? new Date(urgentProject.nextFollowUp) <= new Date("2026-05-01")
                      : false

                    return (
                      <TableRow key={client.id} className="hover:bg-muted/50">
                        {/* Nama Client */}
                        <TableCell>
                          <Link href={`/after-sales/clients/${client.id}`} className="font-medium hover:underline">
                            {client.name}
                          </Link>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {client.industry}
                          </div>
                        </TableCell>

                        {/* Status Relasi */}
                        <TableCell>
                          <Badge variant="outline" className={cfg.color}>
                            {cfg.dot} {cfg.label}
                          </Badge>
                        </TableCell>

                        {/* Skor Relasi 0–100 */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  client.relationScore >= 70 ? 'bg-green-500' :
                                  client.relationScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${client.relationScore}%` }}
                              />
                            </div>
                            <span className={`font-semibold text-sm ${
                              client.relationScore >= 70 ? 'text-green-700' :
                              client.relationScore >= 40 ? 'text-yellow-700' : 'text-red-700'
                            }`}>
                              {client.relationScore}
                            </span>
                          </div>
                        </TableCell>

                        {/* PIC */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <UserCircle className="w-4 h-4 text-blue-500" />
                            <span className="text-sm">{client.pic}</span>
                          </div>
                        </TableCell>

                        {/* Project — show count + most urgent */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <FolderOpen className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{client.totalProject} project</span>
                          </div>
                          {urgentProject && (
                            <div className={`text-xs mt-0.5 ${isUrgent ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                              ← {urgentProject.name}: {urgentProject.nextFollowUp}
                            </div>
                          )}
                        </TableCell>

                        {/* Next Follow-Up (most urgent across all projects) */}
                        <TableCell>
                          {urgentProject ? (
                            <div className={`flex items-center gap-1.5 text-sm ${isUrgent ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                              <CalendarDays className="w-3.5 h-3.5" />
                              {urgentProject.nextFollowUp}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Retainer */}
                        <TableCell>
                          {client.retainer ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                              ✅ Aktif
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground">
                              ❌ Tidak
                            </Badge>
                          )}
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className="text-right">
                          <Link href={`/after-sales/clients/${client.id}`}>
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

          {/* Dialog: Tambah Catatan Kontak — dengan Pilih Project */}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Tambah Catatan Kontak</DialogTitle>
                <DialogDescription>
                  Catat interaksi terbaru dengan client. Last Contact & Next Follow-Up akan di-update per project.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                {/* 1. Pilih Client */}
                <div className="grid gap-2">
                  <Label>Pilih Client</Label>
                  <Select value={selectedClientId} onValueChange={handleClientChange}>
                    <SelectTrigger><SelectValue placeholder="Pilih client..." /></SelectTrigger>
                    <SelectContent>
                      {dummyClients.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Pilih Project — only show when client selected */}
                {selectedClientId && (
                  <div className="grid gap-2">
                    <Label>Pilih Project</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger><SelectValue placeholder="Pilih project..." /></SelectTrigger>
                      <SelectContent>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} <span className="text-muted-foreground">({p.type})</span></SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {projects.length} project untuk {selectedClient?.name}
                    </p>
                  </div>
                )}

                {/* 3. Tanggal Kontak */}
                <div className="grid gap-2">
                  <Label>Tanggal Kontak</Label>
                  <Input
                    type="date"
                    value={contactDate}
                    onChange={e => setContactDate(e.target.value)}
                  />
                </div>

                {/* 4. Tipe Channel */}
                <div className="grid gap-2">
                  <Label>Tipe Channel</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger><SelectValue placeholder="Pilih channel..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="telepon">📞 Telepon</SelectItem>
                      <SelectItem value="wa">💬 WhatsApp</SelectItem>
                      <SelectItem value="meeting">🤝 Meeting</SelectItem>
                      <SelectItem value="email">📧 Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 5. Ringkasan */}
                <div className="grid gap-2">
                  <Label>Ringkasan</Label>
                  <Textarea
                    placeholder="Apa yang dibicarakan, hasil diskusi, next step..."
                    value={summary}
                    onChange={e => setSummary(e.target.value)}
                  />
                </div>

                {/* 6 & 7. Last Contact & Next Follow-Up — per project */}
                {selectedProjectId && (
                  <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-muted/30">
                    <div className="grid gap-2">
                      <Label className="text-xs font-medium">Last Contact</Label>
                      <Input
                        type="date"
                        value={lastContact}
                        onChange={e => setLastContact(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Tanggal kontak terakhir</p>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-medium">Next Follow-Up</Label>
                      <Input
                        type="date"
                        value={nextFollowUp}
                        onChange={e => setNextFollowUp(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Jadwal下次 kontak</p>
                    </div>
                    {selectedProjectId && (
                      <p className="col-span-2 text-xs text-blue-600 font-medium">
                        📌 Akan update data untuk project yang dipilih
                      </p>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
                <Button
                  onClick={() => {
                    if (!selectedClientId || !selectedProjectId) {
                      alert("Pilih Client dan Project terlebih dahulu")
                      return
                    }
                    setShowDialog(false)
                    // Reset form
                    setSelectedClientId("")
                    setSelectedProjectId("")
                    setContactDate("")
                    setChannel("")
                    setSummary("")
                    setLastContact("")
                    setNextFollowUp("")
                    alert("Catatan kontak berhasil disimpan!")
                  }}
                  disabled={!selectedClientId || !selectedProjectId}
                >
                  Simpan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
