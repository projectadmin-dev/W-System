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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/ui/components/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import { ArrowLeft, MailOpen, Star, CheckCircle2, AlertTriangle, Clock, Eye, Filter, Send, RotateCcw } from "lucide-react"
import Link from "next/link"

/* ═════════════════ DUMMY DATA ═════════════════ */

const dummySurveys = [
  { id: 1, client: "PT Maju Jaya", type: "Project Completion", project: "Website Company Profile", rating: 5, status: "responded", sent: "2026-04-20", answered: "2026-04-21", positive: "Sangat puas dengan hasil, komunikasi sangat baik", improvement: "—", followUp: false },
  { id: 2, client: "CV Kreasi Digital", type: "Ticket Resolution", project: "Bug Login Mobile", rating: 3, status: "responded", sent: "2026-04-18", answered: "2026-04-19", positive: "—", improvement: "Waktu perbaikan terlalu lama (3 hari)", followUp: true },
  { id: 3, client: "PT Sinergi Nusantara", type: "Relationship Pulse", project: null, rating: null, status: "sent", sent: "2026-04-15", answered: null, positive: "—", improvement: "—", followUp: false },
  { id: 4, client: "PT Global Tech", type: "Project Completion", project: "Dashboard Analytics", rating: 4, status: "responded", sent: "2026-04-10", answered: "2026-04-12", positive: "Desain modern, data real-time", improvement: "Export PDF bisa lebih bagus", followUp: false },
  { id: 5, client: "CV Media Prima", type: "Ticket Resolution", project: "Update Konten", rating: null, status: "reminded", sent: "2026-04-12", answered: null, positive: "—", improvement: "—", followUp: false },
  { id: 6, client: "PT Maju Jaya", type: "Relationship Pulse", project: null, rating: 5, status: "responded", sent: "2026-03-25", answered: "2026-03-26", positive: "Sangat loyal, berharap retainer tahun depan", improvement: "—", followUp: false },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  responded:  { label: "Sudah Jawab", color: "bg-green-100 text-green-800" },
  sent:       { label: "Dikirim", color: "bg-blue-100 text-blue-800" },
  reminded:   { label: "Di-reminder", color: "bg-orange-100 text-orange-800" },
  expired:    { label: "Kadaluarsa", color: "bg-zinc-100 text-zinc-600" },
}

export default function AfterSalesSurveysPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showDetail, setShowDetail] = useState(false)
  const [selectedSurvey, setSelectedSurvey] = useState(null)

  const filtered = dummySurveys.filter(s => {
    const matchSearch = s.client.toLowerCase().includes(search.toLowerCase()) || s.type.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || s.status === statusFilter
    return matchSearch && matchStatus
  })

  const pendingCount = dummySurveys.filter(s => s.status === "sent" || s.status === "reminded").length
  const negativeCount = dummySurveys.filter(s => s.rating && s.rating <= 2).length
  const avgRating = dummySurveys.filter(s => s.rating).reduce((a, c) => a + c.rating, 0) / dummySurveys.filter(s => s.rating).length

  const openDetail = (survey: any) => {
    setSelectedSurvey(survey)
    setShowDetail(true)
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
                <BreadcrumbItem><BreadcrumbPage>Survey & Feedback</BreadcrumbPage></BreadcrumbItem>
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
                <h1 className="text-2xl font-bold tracking-tight">Survey & Feedback</h1>
                <p className="text-muted-foreground text-sm">Auto-survey setelah project selesai atau ticket ditutup</p>
              </div>
            </div>
            <Button variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Jalankan Scanner
            </Button>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Survey Dikirim</CardTitle>
                <MailOpen className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dummySurveys.length}</div>
                <p className="text-xs text-muted-foreground">Sejak awal</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending (Belum Jawab)</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <p className="text-xs text-muted-foreground">Dikirim / Di-reminder</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
                <Star className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgRating.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Dari {dummySurveys.filter(s => s.rating).length} jawaban</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Feedback Negatif</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{negativeCount}</div>
                <p className="text-xs text-muted-foreground">Rating ≤ 2, perlu follow-up</p>
              </CardContent>
            </Card>
          </div>

          {/* Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MailOpen className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari client atau tipe survey..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="sent">Dikirim</SelectItem>
                <SelectItem value="reminded">Di-reminder</SelectItem>
                <SelectItem value="responded">Sudah Jawab</SelectItem>
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
                    <TableHead>Tipe Survey</TableHead>
                    <TableHead>Project/Ticket</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal Kirim</TableHead>
                    <TableHead>Follow-Up</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(sv => {
                    const st = statusConfig[sv.status] || statusConfig.sent
                    return (
                      <TableRow key={sv.id} className="hover:bg-muted/50 cursor-pointer">
                        <TableCell className="font-medium">{sv.client}</TableCell>
                        <TableCell className="text-sm">{sv.type}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{sv.project || "—"}</TableCell>
                        <TableCell>
                          {sv.rating ? (
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < sv.rating ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-300'}`} />
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell><Badge className={st.color}>{st.label}</Badge></TableCell>
                        <TableCell className="text-sm">{sv.sent}</TableCell>
                        <TableCell>
                          {sv.followUp ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="w-3 h-3" /> Perlu
                            </Badge>
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => openDetail(sv)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Detail Dialog */}
          <Dialog open={showDetail} onOpenChange={setShowDetail}>
            <DialogContent className="sm:max-w-lg">
              {selectedSurvey && (
                <>
                  <DialogHeader>
                    <DialogTitle>Detail Survey</DialogTitle>
                    <DialogDescription>{selectedSurvey.client} — {selectedSurvey.type}</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Status</Label>
                        <div className="font-medium">{(statusConfig[selectedSurvey.status]?.label) || selectedSurvey.status}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Rating</Label>
                        <div>
                          {selectedSurvey.rating ? (
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < selectedSurvey.rating ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-300'}`} />
                              ))}
                            </div>
                          ) : "Belum dijawab"}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Masukan Positif</Label>
                      <div className="text-sm mt-1 p-2 bg-green-50 rounded-md">{selectedSurvey.positive || "—"}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Saran Perbaikan</Label>
                      <div className="text-sm mt-1 p-2 bg-orange-50 rounded-md">{selectedSurvey.improvement || "—"}</div>
                    </div>
                    {selectedSurvey.followUp && (
                      <div className="p-3 bg-red-50 rounded-md border border-red-200">
                        <div className="flex items-center gap-2 text-red-800 font-medium text-sm">
                          <AlertTriangle className="w-4 h-4" /> Perlu Tindak Lanjut
                        </div>
                        <div className="text-sm text-red-700 mt-1">{selectedSurvey.improvement}</div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDetail(false)}>Tutup</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
