"use client"

import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { NavUser } from "@/components/nav-user"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ArrowLeft, Phone, Mail, CalendarDays, Star, AlertTriangle, Clock, Plus, Search,
  Building2, UserCircle, TrendingUp, DollarSign, FolderOpen, ShieldCheck, Edit,
} from "lucide-react"
import Link from "next/link"

/* ═════════════════ DUMMY DATA — lastContact & nextFollowUp PER PROJECT ═════════════════ */

const clientsData: Record<number, {
  id: number
  name: string
  pic: string
  email: string
  phone: string
  status: string
  relationScore: number
  revenue: string
  totalProject: number
  retainer: boolean
  segment: string
  industry: string
  contractEnd: string
  address: string
  notes: string
  projects: {
    id: string
    name: string
    type: string
    lastContact: string
    nextFollowUp: string
    contactLogs: {
      id: number
      date: string
      channel: string
      summary: string
      recordedBy: string
    }[]
  }[]
}> = {
  1: {
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
    contractEnd: "2026-12-31",
    address: "Jl. Sudirman No. 123, Jakarta Selatan",
    notes: "Client sangat puas dengan delivery terakhir. Ada potensi renewal kontrak di Q4. Perlu prepare proposal upsell fitur AI.",
    projects: [
      {
        id: "p1-1",
        name: "Website Redesign",
        type: "Website",
        lastContact: "2026-04-27",
        nextFollowUp: "2026-05-05",
        contactLogs: [
          { id: 1, date: "2026-04-27", channel: "Meeting", summary: "Review progres phase 2. Client puas dengan hasil.", recordedBy: "Aziz" },
          { id: 2, date: "2026-04-15", channel: "WhatsApp", summary: "Follow up dokumen kontrak.", recordedBy: "Aziz" },
          { id: 3, date: "2026-04-01", channel: "Email", summary: "Kirim proposal untuk phase 3.", recordedBy: "Aziz" },
        ],
      },
      {
        id: "p1-2",
        name: "Branding Kit 2026",
        type: "Branding",
        lastContact: "2026-04-20",
        nextFollowUp: "2026-05-10",
        contactLogs: [
          { id: 1, date: "2026-04-20", channel: "Meeting", summary: "Review draft logo baru. Client minta revisi minor.", recordedBy: "Aziz" },
        ],
      },
      {
        id: "p1-3",
        name: "IoT Sensor Monitoring",
        type: "IoT",
        lastContact: "2026-03-15",
        nextFollowUp: "2026-04-30",
        contactLogs: [
          { id: 1, date: "2026-03-15", channel: "Telepon", summary: "Diskusi teknis sensor. Mereka ada issue calibration.", recordedBy: "Aziz" },
          { id: 2, date: "2026-02-28", channel: "Email", summary: "Kirim spesifikasi teknis.", recordedBy: "Aziz" },
        ],
      },
    ],
  },
  2: {
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
    contractEnd: "2026-08-15",
    address: "Jl. Braga No. 45, Bandung",
    notes: "Hubungan baik tapi contract end soon. Perlu approach untuk renewal.",
    projects: [
      {
        id: "p2-1",
        name: "Company Profile Video",
        type: "Video",
        lastContact: "2026-04-20",
        nextFollowUp: "2026-04-28",
        contactLogs: [
          { id: 1, date: "2026-04-20", channel: "Meeting", summary: "Quarterly review. Ani appreciation feedback.", recordedBy: "Aziz" },
        ],
      },
      {
        id: "p2-2",
        name: "Social Media Kit",
        type: "Branding",
        lastContact: "2026-04-10",
        nextFollowUp: "2026-05-01",
        contactLogs: [],
      },
    ],
  },
  3: {
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
    contractEnd: "2026-03-15",
    address: "Jl. Imam Bonjol No. 88, Surabaya",
    notes: "⚠️ Contract expired. Belum ada response dari Cahyo sejak Feb.",
    projects: [
      {
        id: "p3-1",
        name: "Logistics App v2",
        type: "Mobile App",
        lastContact: "2026-02-15",
        nextFollowUp: "2026-04-24",
        contactLogs: [
          { id: 1, date: "2026-02-15", channel: "Telepon", summary: "Complain invoice overdue. Keberatan dengan late delivery.", recordedBy: "Aziz" },
        ],
      },
    ],
  },
  4: {
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
    contractEnd: "2027-01-20",
    address: "Jl. Gatot Subroto No. 200, Jakarta",
    notes: "Relationship cooling down. Dewi busy dengan project lain.",
    projects: [
      {
        id: "p4-1",
        name: "E-Commerce Platform",
        type: "Website",
        lastContact: "2026-04-05",
        nextFollowUp: "2026-04-30",
        contactLogs: [
          { id: 1, date: "2026-04-05", channel: "Email", summary: "Send monthly report. No reply.", recordedBy: "Aziz" },
        ],
      },
      {
        id: "p4-2",
        name: "API Integration",
        type: "IoT",
        lastContact: "2026-03-20",
        nextFollowUp: "2026-05-15",
        contactLogs: [],
      },
    ],
  },
  5: {
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
    contractEnd: "2026-11-30",
    address: "Jl. Asia Afrika No. 12, Bandung",
    notes: "🌟 Top client! Eko sangat satisfied.",
    projects: [
      {
        id: "p5-1",
        name: "Digital Ads Campaign",
        type: "Digital Marketing",
        lastContact: "2026-04-22",
        nextFollowUp: "2026-05-02",
        contactLogs: [
          { id: 1, date: "2026-04-22", channel: "Meeting", summary: "Explorasi project baru. Eko interested di 2 campaign.", recordedBy: "Aziz" },
        ],
      },
      {
        id: "p5-2",
        name: "Brand Refresh",
        type: "Branding",
        lastContact: "2026-04-15",
        nextFollowUp: "2026-05-08",
        contactLogs: [],
      },
      {
        id: "p5-3",
        name: "Website Portal",
        type: "Website",
        lastContact: "2026-04-01",
        nextFollowUp: "2026-05-12",
        contactLogs: [],
      },
    ],
  },
}

const channelIcon: Record<string, string> = {
  Telepon: "📞",
  WhatsApp: "💬",
  Meeting: "🤝",
  Email: "📧",
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  active:  { label: "Active",   color: "bg-green-100 text-green-800 border-green-300",   dot: "🟢" },
  warm:    { label: "Warm",     color: "bg-yellow-100 text-yellow-800 border-yellow-300", dot: "🟡" },
  cold:    { label: "Cold",     color: "bg-slate-100 text-slate-600 border-slate-300",     dot: "🔴" },
  at_risk: { label: "At Risk", color: "bg-red-100 text-red-800 border-red-300",          dot: "🔴" },
  dormant: { label: "Dormant", color: "bg-zinc-100 text-zinc-600 border-zinc-300",       dot: "⚫" },
}

const projectTypeColor: Record<string, string> = {
  Website:          "bg-blue-50 text-blue-700 border-blue-200",
  Branding:         "bg-pink-50 text-pink-700 border-pink-200",
  IoT:              "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Mobile App":     "bg-orange-50 text-orange-700 border-orange-200",
  Video:            "bg-purple-50 text-purple-700 border-purple-200",
  "Digital Marketing": "bg-green-50 text-green-700 border-green-200",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ClientDetailPage({ params }: PageProps) {
  const [id, setId] = useState<number | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [contactDate, setContactDate] = useState("")
  const [channel, setChannel] = useState("")
  const [summary, setSummary] = useState("")
  const [lastContact, setLastContact] = useState("")
  const [nextFollowUp, setNextFollowUp] = useState("")
  const [expandedProject, setExpandedProject] = useState<string | null>(null)

  // Await params on mount
  if (id === null) {
    params.then(p => setId(Number(p.id))).catch(() => setId(1))
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Memuat...</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  const client = clientsData[id] || clientsData[1]
  const cfg = statusConfig[client.status]

  const selectedProject = client.projects.find(p => p.id === selectedProjectId)

  const handleDialogOpen = (projectId?: string) => {
    setSelectedProjectId(projectId || "")
    setContactDate("")
    setChannel("")
    setSummary("")
    setLastContact("")
    setNextFollowUp("")
    setShowDialog(true)
  }

  const handleSave = () => {
    if (!selectedProjectId) {
      alert("Pilih project terlebih dahulu")
      return
    }
    setShowDialog(false)
    alert(`Catatan kontak untuk project "${selectedProject?.name}" berhasil disimpan!`)
  }

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
                <BreadcrumbItem><BreadcrumbLink href="/after-sales/clients">Client Relationship</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>{client.name}</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <NavUser user={{ name: "Aziz", email: "aziz@wit.id", avatar: "/avatars/user.jpg" }} />
        </header>

        <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">

          {/* Back + Title */}
          <div className="flex items-center gap-3">
            <Link href="/after-sales/clients">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
                <Badge variant="outline" className={cfg.color}>
                  {cfg.dot} {cfg.label}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">{client.industry} · {client.address}</p>
            </div>
          </div>

          {/* Section Atas: Info Ringkas Client */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Skor Relasi */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Skor Relasi</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-2xl font-bold ${
                    client.relationScore >= 70 ? 'text-green-600' :
                    client.relationScore >= 40 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {client.relationScore}
                  </span>
                  <span className="text-muted-foreground text-sm">/ 100</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      client.relationScore >= 70 ? 'bg-green-500' :
                      client.relationScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${client.relationScore}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* PIC */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">PIC Client</span>
                </div>
                <div className="font-semibold mt-1">{client.pic}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Phone className="w-3 h-3" />{client.phone}
                </div>
              </CardContent>
            </Card>

            {/* Retainer */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${client.retainer ? 'text-purple-500' : 'text-muted-foreground'}`} />
                  <span className="text-sm text-muted-foreground">Retainer</span>
                </div>
                <div className="mt-1">
                  {client.retainer ? (
                    <Badge className="bg-purple-100 text-purple-800 border-purple-300">✅ Aktif</Badge>
                  ) : (
                    <Badge variant="outline">❌ Tidak</Badge>
                  )}
                </div>
                {client.retainer && (
                  <div className="text-xs text-muted-foreground mt-1">Contract: {client.contractEnd}</div>
                )}
              </CardContent>
            </Card>

            {/* Revenue */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Revenue</span>
                </div>
                <div className="font-semibold mt-1 text-green-700">{client.revenue}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Total revenue</div>
              </CardContent>
            </Card>
          </div>

          {/* Section Project — List dengan last contact & next follow-up per project */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Daftar Project ({client.projects.length})
              </h2>
              <Button size="sm" onClick={() => handleDialogOpen()}>
                <Plus className="w-4 h-4 mr-1" />
                Tambah Catatan Kontak
              </Button>
            </div>

            <div className="space-y-3">
              {client.projects.map(project => {
                const isExpanded = expandedProject === project.id
                const isUrgent = new Date(project.nextFollowUp) <= new Date("2026-05-01")
                const typeColor = projectTypeColor[project.type] || "bg-gray-50 text-gray-700 border-gray-200"

                return (
                  <Card key={project.id} className={isUrgent ? "border-red-300" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-base">{project.name}</CardTitle>
                            <Badge variant="outline" className={typeColor}>
                              {project.type}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className={`text-sm font-medium ${isUrgent ? 'text-red-600' : 'text-muted-foreground'}`}>
                              <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
                              Next: {project.nextFollowUp}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                              <Clock className="w-3 h-3" />
                              Last: {project.lastContact}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                          >
                            {isExpanded ? "▲" : "▼"}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Expanded: Riwayat Log Kontak */}
                    {isExpanded && (
                      <CardContent className="space-y-3">
                        {/* Log Kontak */}
                        {project.contactLogs.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Riwayat Kontak</p>
                            {project.contactLogs.map(log => (
                              <div key={log.id} className="flex gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                                <div className="flex flex-col items-center gap-1 min-w-[50px]">
                                  <span className="text-xl">{channelIcon[log.channel] || "💬"}</span>
                                  <span className="text-xs text-muted-foreground">{log.channel}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-sm font-medium">{log.date}</span>
                                    <span className="text-xs text-muted-foreground">· {log.recordedBy}</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{log.summary}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">Belum ada log kontak untuk project ini</p>
                        )}

                        {/* Action */}
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleDialogOpen(project.id)}>
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Tambah Catatan Kontak
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Section Bawah: Catatan PIC */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">📝 Catatan PIC</CardTitle>
                <Button variant="ghost" size="sm">
                  <Edit className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
            </CardContent>
          </Card>

          {/* Info Tambahan */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${client.email}`} className="hover:underline text-blue-600">{client.email}</a>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span>{client.address}</span>
              </div>
            </CardContent>
          </Card>

          {/* Dialog: Tambah Catatan Kontak */}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Tambah Catatan Kontak</DialogTitle>
                <DialogDescription>
                  {selectedProject ? `Project: ${selectedProject.name}` : "Pilih project terlebih dahulu"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                {/* Pilih Project */}
                <div className="grid gap-2">
                  <Label>Pilih Project</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger><SelectValue placeholder="Pilih project..." /></SelectTrigger>
                    <SelectContent>
                      {client.projects.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} <span className="text-muted-foreground">({p.type})</span></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tanggal Kontak */}
                <div className="grid gap-2">
                  <Label>Tanggal Kontak</Label>
                  <Input
                    type="date"
                    value={contactDate}
                    onChange={e => setContactDate(e.target.value)}
                  />
                </div>

                {/* Tipe Channel */}
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

                {/* Ringkasan */}
                <div className="grid gap-2">
                  <Label>Ringkasan</Label>
                  <Textarea
                    placeholder="Apa yang dibicarakan, hasil diskusi, next step..."
                    value={summary}
                    onChange={e => setSummary(e.target.value)}
                  />
                </div>

                {/* Last Contact & Next Follow-Up — per project */}
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
                    <p className="col-span-2 text-xs text-blue-600 font-medium">
                      📌 Akan update data untuk project: {selectedProject?.name}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
                <Button onClick={handleSave} disabled={!selectedProjectId}>
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
