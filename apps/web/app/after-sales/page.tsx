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
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  HeartHandshake, Users, AlertTriangle, MailOpen, Megaphone, CalendarDays,
  Star, TrendingUp, ArrowRight, CheckCircle2, Clock, Eye
} from "lucide-react"
import Link from "next/link"

/* ═══════════════════════════════════════════════
   DUMMY DATA
   ═══════════════════════════════════════════════ */

const clientRelationships = [
  { id: 1, client: "PT Maju Jaya", status: "active", score: 92, lastContact: "2 hari lalu", nextFollowUp: "2026-04-28", type: "meeting", owner: "Aziz", revenue: "Rp 2.1M", retainer: true },
  { id: 2, client: "CV Kreasi Digital", status: "warm", score: 68, lastContact: "1 minggu lalu", nextFollowUp: "2026-04-25", type: "whatsapp", owner: "Aziz", revenue: "Rp 850jt", retainer: false },
  { id: 3, client: "PT Sinergi Nusantara", status: "at_risk", score: 35, lastContact: "2 bulan lalu", nextFollowUp: "2026-04-24", type: "email", owner: "Aziz", revenue: "Rp 450jt", retainer: false },
  { id: 4, client: "PT Global Tech", status: "cold", score: 48, lastContact: "3 minggu lalu", nextFollowUp: "2026-04-30", type: "call", owner: "Aziz", revenue: "Rp 1.2M", retainer: true },
  { id: 5, client: "CV Media Prima", status: "active", score: 85, lastContact: "5 hari lalu", nextFollowUp: "2026-05-02", type: "visit", owner: "Aziz", revenue: "Rp 3.5M", retainer: true },
]

const surveys = [
  { id: 1, client: "PT Maju Jaya", type: "Project Completion", rating: 5, status: "responded", sent: "2026-04-20", answered: "2026-04-21", followUp: false },
  { id: 2, client: "CV Kreasi Digital", type: "Ticket Resolution", rating: 3, status: "responded", sent: "2026-04-18", answered: "2026-04-19", followUp: true, reason: "Waktu pengerjaan lambat" },
  { id: 3, client: "PT Sinergi Nusantara", type: "Relationship Pulse", rating: null, status: "sent", sent: "2026-04-15", answered: null, followUp: false },
  { id: 4, client: "PT Global Tech", type: "Project Completion", rating: 4, status: "responded", sent: "2026-04-10", answered: "2026-04-12", followUp: false },
  { id: 5, client: "CV Media Prima", type: "Ticket Resolution", rating: null, status: "reminded", sent: "2026-04-12", answered: null, followUp: false },
]

const announcements = [
  { id: 1, title: "Fitur Baru: Auto-Report Dashboard", category: "feature_update", priority: "high", status: "published", target: "Semua Client", sent: "2026-04-20", read: 12, total: 15 },
  { id: 2, title: "Maintenance Sistem 25 April", category: "maintenance_notice", priority: "urgent", status: "published", target: "Semua Client", sent: "2026-04-22", read: 14, total: 15 },
  { id: 3, title: "Program Retainer Diskon 20%", category: "new_offering", priority: "normal", status: "draft", target: "At Risk Clients", sent: "—", read: 0, total: 3 },
]

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active:    { label: "Active",    color: "bg-green-100 text-green-800 border-green-300",    icon: TrendingUp },
  warm:      { label: "Warm",      color: "bg-yellow-100 text-yellow-800 border-yellow-300",  icon: HeartHandshake },
  cold:      { label: "Cold",      color: "bg-slate-100 text-slate-600 border-slate-300",     icon: Clock },
  at_risk:   { label: "At Risk",   color: "bg-red-100 text-red-800 border-red-300",           icon: AlertTriangle },
  dormant:   { label: "Dormant",   color: "bg-zinc-100 text-zinc-600 border-zinc-300",         icon: Clock },
}

const surveyStatusConfig: Record<string, { label: string; color: string }> = {
  responded:  { label: "Sudah Jawab",  color: "bg-green-100 text-green-800" },
  sent:       { label: "Dikirim",      color: "bg-blue-100 text-blue-800" },
  reminded:   { label: "Di-reminder",   color: "bg-orange-100 text-orange-800" },
  expired:    { label: "Kadaluarsa",   color: "bg-zinc-100 text-zinc-600" },
}

/* ═══════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════ */

export default function AfterSalesDashboardPage() {
  const [search, setSearch] = useState("")

  const filteredClients = clientRelationships.filter(c =>
    c.client.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = clientRelationships.filter(c => c.status === "active").length
  const atRiskCount = clientRelationships.filter(c => c.status === "at_risk").length
  const pendingSurveys = surveys.filter(s => s.status === "sent" || s.status === "reminded").length
  const negativeFeedback = surveys.filter(s => s.rating && s.rating <= 2).length

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
                  <BreadcrumbPage>After Sales Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <NavUser user={{ name: "Aziz", email: "aziz@wit.id", avatar: "/avatars/user.jpg" }} />
          </div>
        </header>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">

            {/* Page Title */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <HeartHandshake className="w-6 h-6 text-rose-600" />
                  After Sales Dashboard
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Pantau relasi client, survey feedback, dan kirim update terbaru
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/after-sales/pengumuman">
                  <Button variant="outline">
                    <Megaphone className="w-4 h-4 mr-2" />
                    Buat Pengumuman
                  </Button>
                </Link>
              </div>
            </div>

            {/* ═══════ Stats Cards ═══════ */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Client Active</CardTitle>
                  <Users className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeCount}</div>
                  <p className="text-xs text-muted-foreground">Hubungan dalam kondisi baik</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">At Risk</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{atRiskCount}</div>
                  <p className="text-xs text-muted-foreground">Butuh perhatian segera</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Survey Pending</CardTitle>
                  <MailOpen className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingSurveys}</div>
                  <p className="text-xs text-muted-foreground">Belum dijawab client</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Feedback Negatif</CardTitle>
                  <Star className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{negativeFeedback}</div>
                  <p className="text-xs text-muted-foreground">Perlu tindak lanjut</p>
                </CardContent>
              </Card>
            </div>

            {/* ═══════ Tabs: Client / Survey / Pengumuman ═══════ */}
            <Tabs defaultValue="clients" className="w-full">
              <TabsList className="grid w-full md:w-auto grid-cols-3 md:inline-flex">
                <TabsTrigger value="clients" className="flex items-center gap-2">
                  <Users className="w-4 h-4" /> Client Relationship
                </TabsTrigger>
                <TabsTrigger value="surveys" className="flex items-center gap-2">
                  <MailOpen className="w-4 h-4" /> Survey & Feedback
                </TabsTrigger>
                <TabsTrigger value="announcements" className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> Pengumuman
                </TabsTrigger>
              </TabsList>

              {/* ─── Tab: Client Relationship ─── */}
              <TabsContent value="clients" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
                    <div>
                      <CardTitle className="text-lg">Client Relationship Tracking</CardTitle>
                      <p className="text-sm text-muted-foreground">Pantau kondisi relasi setiap client post-sale</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Cari client..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-64"
                      />
                      <Link href="/after-sales/clients">
                        <Button variant="outline" size="sm">
                          Lihat Semua <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Last Contact</TableHead>
                          <TableHead>Next Follow-Up</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Retainer</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClients.map((client) => {
                          const cfg = statusConfig[client.status]
                          return (
                            <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50">
                              <TableCell className="font-medium">{client.client}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cfg.color}>
                                  <cfg.icon className="w-3 h-3 mr-1" />
                                  {cfg.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${client.score >= 70 ? 'bg-green-500' : client.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                  <span className="font-semibold">{client.score}</span>/100
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{client.lastContact}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className={`text-sm ${client.nextFollowUp < '2026-04-25' ? 'text-red-600 font-medium' : ''}`}>
                                    {client.nextFollowUp}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{client.revenue}</TableCell>
                              <TableCell>
                                {client.retainer ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Aktif</Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
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
              </TabsContent>

              {/* ─── Tab: Survey & Feedback ─── */}
              <TabsContent value="surveys" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
                    <div>
                      <CardTitle className="text-lg">Survey & Feedback</CardTitle>
                      <p className="text-sm text-muted-foreground">Auto-survey setelah project selesai / ticket closed</p>
                    </div>
                    <Link href="/after-sales/surveys">
                      <Button variant="outline" size="sm">
                        Lihat Semua <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Tipe Survey</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Tanggal Kirim</TableHead>
                          <TableHead>Tanggal Jawab</TableHead>
                          <TableHead>Follow-Up</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {surveys.map((sv) => {
                          const stCfg = surveyStatusConfig[sv.status] || surveyStatusConfig.sent
                          return (
                            <TableRow key={sv.id} className="cursor-pointer hover:bg-muted/50">
                              <TableCell className="font-medium">{sv.client}</TableCell>
                              <TableCell className="text-sm">{sv.type}</TableCell>
                              <TableCell>
                                {sv.rating ? (
                                  <div className="flex items-center gap-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star key={i} className={`w-4 h-4 ${i < sv.rating! ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-300'}`} />
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={stCfg.color}>{stCfg.label}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">{sv.sent}</TableCell>
                              <TableCell className="text-sm">{sv.answered || "—"}</TableCell>
                              <TableCell>
                                {sv.followUp ? (
                                  <Badge variant="destructive" className="gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Perlu
                                  </Badge>
                                ) : (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ─── Tab: Pengumuman ─── */}
              <TabsContent value="announcements" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
                    <div>
                      <CardTitle className="text-lg">Pengumuman / Feature Update</CardTitle>
                      <p className="text-sm text-muted-foreground">Kirim update ke semua client via email + portal</p>
                    </div>
                    <Link href="/after-sales/pengumuman">
                      <Button variant="outline" size="sm">
                        Lihat Semua <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Judul</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Target</TableHead>
                          <TableHead>Terbit</TableHead>
                          <TableHead>Dibaca</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {announcements.map((an) => (
                          <TableRow key={an.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="font-medium">{an.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {an.category.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  an.priority === "urgent"
                                    ? "bg-red-100 text-red-800"
                                    : an.priority === "high"
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-zinc-100 text-zinc-800"
                                }
                              >
                                {an.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={an.status === "published" ? "default" : "secondary"}>
                                {an.status === "published" ? "Terkirim" : "Draft"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{an.target}</TableCell>
                            <TableCell className="text-sm">{an.sent}</TableCell>
                            <TableCell>
                              {an.status === "published" ? (
                                <div className="flex items-center gap-1">
                                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-sm">{an.read}/{an.total}</span>
                                  <div className="w-16 h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${(an.read / an.total) * 100}%` }} />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
