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
import { ArrowLeft, Send, CheckCircle2, Clock, XCircle, Eye, Search, CalendarDays, Smile, Meh, Frown } from "lucide-react"
import Link from "next/link"

/* ═════════════════ DUMMY DATA ═════════════════ */

const dummySurveys = [
  {
    id: 1,
    client: "PT Maju Jaya",
    sourceType: "Project",
    sourceName: "Website Company Profile",
    sentDate: "2026-04-20",
    answeredDate: "2026-04-21",
    avgScore: 4.8,
    sentiment: "positive",
    status: "answered",
    picFollowUp: "Andi Supriyadi",
    needFollowUp: false,
    answers: {
      stars: [5, 5, 5, 4, 5],
      yesNo: "Ya",
      texts: [
        "Sangat puas dengan hasil dan waktu pengerjaan. Tim very responsive!",
        "Pelayanan sangat profesional dan helpful",
        "Semoga bisa kerja sama lagi untuk project berikutnya 🙏",
      ],
    },
  },
  {
    id: 2,
    client: "CV Kreasi Digital",
    sourceType: "Tiket",
    sourceName: "Bug Login Mobile",
    sentDate: "2026-04-18",
    answeredDate: "2026-04-19",
    avgScore: 2.3,
    sentiment: "negative",
    status: "answered",
    picFollowUp: "Dewi Kumalasari",
    needFollowUp: true,
    answers: {
      stars: [2, 3, 2, 2, 2],
      yesNo: "Mungkin",
      texts: [
        "Waktu perbaikan terlalu lama, 3 hari untuk bug simple",
        "Respon awal cepat tapi solving lamban",
        "Semoga ke depannya lebih cepat ya",
      ],
    },
  },
  {
    id: 3,
    client: "PT Sinergi Nusantara",
    sourceType: "Tiket",
    sourceName: "Error Laporan Bulanan",
    sentDate: "2026-04-15",
    answeredDate: null,
    avgScore: null,
    sentiment: null,
    status: "sent",
    picFollowUp: null,
    needFollowUp: false,
    answers: null,
  },
  {
    id: 4,
    client: "PT Global Tech",
    sourceType: "Project",
    sourceName: "Dashboard Analytics",
    sentDate: "2026-04-10",
    answeredDate: "2026-04-12",
    avgScore: 4.2,
    sentiment: "positive",
    status: "answered",
    picFollowUp: null,
    needFollowUp: false,
    answers: {
      stars: [4, 4, 5, 4, 4],
      yesNo: "Ya",
      texts: [
        "Desain modern dan data real-time, suka banget!",
        "Export PDF bisa lebih bagus lagi styling-nya",
        "Overall memuaskan, tim sangat cooperate",
      ],
    },
  },
  {
    id: 5,
    client: "CV Media Prima",
    sourceType: "Tiket",
    sourceName: "Update Konten Website",
    sentDate: "2026-04-12",
    answeredDate: null,
    avgScore: null,
    sentiment: null,
    status: "expired",
    picFollowUp: null,
    needFollowUp: false,
    answers: null,
  },
  {
    id: 6,
    client: "PT Energi Terbarukan Indonesia",
    sourceType: "Project",
    sourceName: "Sistem Monitoring Solar",
    sentDate: "2026-04-05",
    answeredDate: "2026-04-07",
    avgScore: 3.6,
    sentiment: "neutral",
    status: "answered",
    picFollowUp: null,
    needFollowUp: false,
    answers: {
      stars: [4, 3, 4, 3, 4],
      yesNo: "Ya",
      texts: [
        "Hasil bagus, sesuai ekspektasi",
        "Dokumentasi teknis kurang lengkap",
        "Netral saja, bukan yang terbaik tapi也不算差",
      ],
    },
  },
  {
    id: 7,
    client: "PT Karya Bersama",
    sourceType: "Tiket",
    sourceName: "Reset Password User",
    sentDate: "2026-03-28",
    answeredDate: null,
    avgScore: null,
    sentiment: null,
    status: "expired",
    picFollowUp: null,
    needFollowUp: false,
    answers: null,
  },
]

const sentimentConfig: Record<string, { label: string; color: string; icon: string }> = {
  positive: { label: "Positif", color: "bg-green-100 text-green-800 border-green-300", icon: "🟢" },
  neutral:  { label: "Netral",  color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: "🟡" },
  negative: { label: "Negatif", color: "bg-red-100 text-red-800 border-red-300", icon: "🔴" },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  sent:     { label: "Terkirim",  color: "bg-blue-100 text-blue-800 border-blue-300" },
  answered: { label: "Dijawab",   color: "bg-green-100 text-green-800 border-green-300" },
  expired:  { label: "Kadaluarsa", color: "bg-zinc-100 text-zinc-600 border-zinc-300" },
}

export default function AfterSalesSurveysPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sentimentFilter, setSentimentFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const filtered = dummySurveys.filter(s => {
    const matchSearch = s.client.toLowerCase().includes(search.toLowerCase()) ||
      s.sourceName.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || s.status === statusFilter
    const matchSentiment = sentimentFilter === "all" || s.sentiment === sentimentFilter
    const matchDateFrom = !dateFrom || s.sentDate >= dateFrom
    const matchDateTo = !dateTo || s.sentDate <= dateTo
    return matchSearch && matchStatus && matchSentiment && matchDateFrom && matchDateTo
  })

  // Summary stats
  const totalSent = dummySurveys.length
  const answeredCount = dummySurveys.filter(s => s.status === "answered").length
  const pendingCount = dummySurveys.filter(s => s.status === "sent").length
  const expiredCount = dummySurveys.filter(s => s.status === "expired").length

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
                <BreadcrumbItem><BreadcrumbPage>Auto Survey</BreadcrumbPage></BreadcrumbItem>
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
                <h1 className="text-2xl font-bold tracking-tight">Auto Survey</h1>
                <p className="text-muted-foreground text-sm">Survey otomatis pasca project selesai atau tiket ditutup</p>
              </div>
            </div>
            <Link href="/after-sales/surveys/preview">
              <Button variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Preview Form Client
              </Button>
            </Link>
          </div>

          {/* Summary Cards: Total Terkirim, Sudah Dijawab, Belum Dijawab, Kadaluarsa */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Total Terkirim</span>
                </div>
                <div className="text-2xl font-bold mt-1">{totalSent}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Sudah Dijawab</span>
                </div>
                <div className="text-2xl font-bold mt-1">{answeredCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-muted-foreground">Belum Dijawab</span>
                </div>
                <div className="text-2xl font-bold mt-1">{pendingCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm text-muted-foreground">Kadaluarsa</span>
                </div>
                <div className="text-2xl font-bold mt-1">{expiredCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari client..."
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
                <SelectItem value="sent">Terkirim</SelectItem>
                <SelectItem value="answered">Dijawab</SelectItem>
                <SelectItem value="expired">Kadaluarsa</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter Sentimen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Sentimen</SelectItem>
                <SelectItem value="positive">🟢 Positif</SelectItem>
                <SelectItem value="neutral">🟡 Netral</SelectItem>
                <SelectItem value="negative">🔴 Negatif</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="w-[150px]"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              placeholder="Dari tanggal"
            />
            <Input
              type="date"
              className="w-[150px]"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              placeholder="Sampai tanggal"
            />
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Client</TableHead>
                    <TableHead>Sumber</TableHead>
                    <TableHead>Tanggal Kirim</TableHead>
                    <TableHead>Tanggal Jawab</TableHead>
                    <TableHead>Skor Rata-rata</TableHead>
                    <TableHead>Sentimen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <p>Tidak ada survey yang cocok dengan filter</p>
                      </TableCell>
                    </TableRow>
                  ) : filtered.map(sv => {
                    const st = statusConfig[sv.status]
                    const sentCfg = sv.sentiment ? sentimentConfig[sv.sentiment] : null

                    return (
                      <TableRow key={sv.id} className="hover:bg-muted/50">
                        <TableCell>
                          <Link href={`/after-sales/surveys/${sv.id}`} className="font-medium hover:underline">
                            {sv.client}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <Badge variant="outline" className="text-xs">
                              {sv.sourceType === "Project" ? "📁 Project" : "🎫 Tiket"}
                            </Badge>
                            <div className="text-muted-foreground mt-0.5">{sv.sourceName}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {sv.sentDate}
                          </div>
                        </TableCell>
                        <TableCell>
                          {sv.answeredDate ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              {sv.answeredDate}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {sv.avgScore ? (
                            <div className="flex items-center gap-2">
                              <div className="flex">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span key={i} className={`text-sm ${i < Math.round(sv.avgScore!) ? 'text-yellow-400' : 'text-zinc-300'}`}>★</span>
                                ))}
                              </div>
                              <span className={`font-semibold text-sm ${sv.avgScore >= 4 ? 'text-green-700' : sv.avgScore >= 3 ? 'text-yellow-700' : 'text-red-700'}`}>
                                {sv.avgScore.toFixed(1)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {sentCfg ? (
                            <Badge variant="outline" className={sentCfg.color}>
                              {sentCfg.icon} {sentCfg.label}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={st.color}>
                            {st.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/after-sales/surveys/${sv.id}`}>
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
