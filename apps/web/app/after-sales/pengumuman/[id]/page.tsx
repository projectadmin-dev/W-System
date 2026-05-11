"use client"

import { useState, useEffect } from "react"
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
// Tabs custom via state — no external Tabs component needed
import { ArrowLeft, Send, Eye, Clock, MousePointer, Archive, Bell, Mail, CalendarDays } from "lucide-react"
import Link from "next/link"

/* ═════════════════ DUMMY DATA ═════════════════ */

const announcementsData: Record<number, {
  id: number
  title: string
  jenis: string
  content: string
  target: string
  targetLabel: string
  scheduledAt: string | null
  sentAt: string | null
  status: string
  publisher: string
  totalClient: number
  recipients: {
    id: number
    name: string
    email: string
    readAt: string | null
    clickedAt: string | null
  }[]
}> = {
  1: {
    id: 1,
    title: "Fitur Baru: Auto-Report Dashboard",
    jenis: "fitur_baru",
    content: "Senang mengumumkan fitur baru Auto-Report Dashboard yang memudahkan client melihat performa project secara real-time tanpa perlu request manual ke tim kami.\n\nFitur ini tersedia mulai 1 Mei 2026 untuk semua client dengan paket Enterprise dan Retainer.\n\nUntuk aktivasi, silakan hubungi tim support kami.",
    target: "all",
    targetLabel: "Semua Client",
    scheduledAt: "2026-04-20 09:00",
    sentAt: "2026-04-20",
    status: "terkirim",
    publisher: "Aziz",
    totalClient: 15,
    recipients: [
      { id: 1, name: "PT Maju Jaya", email: "budi@maju.co", readAt: "2026-04-20 10:15", clickedAt: "2026-04-20 10:17" },
      { id: 2, name: "CV Kreasi Digital", email: "ani@kreasi.id", readAt: "2026-04-20 11:30", clickedAt: "2026-04-20 11:32" },
      { id: 3, name: "PT Sinergi Nusantara", email: "cahyo@sinergi.net", readAt: null, clickedAt: null },
      { id: 4, name: "PT Global Tech", email: "dewi@global.tech", readAt: "2026-04-20 09:45", clickedAt: "2026-04-20 09:48" },
      { id: 5, name: "CV Media Prima", email: "eko@media.id", readAt: "2026-04-21 08:00", clickedAt: "2026-04-21 08:05" },
      { id: 6, name: "PT Karya Bersama", email: "fitri@karya.id", readAt: null, clickedAt: null },
      { id: 7, name: "PT Energi Terbarukan Indonesia", email: "hendra@eti.co.id", readAt: "2026-04-20 14:20", clickedAt: null },
      { id: 8, name: "PT Cerdas Indonesia", email: "info@cerdas.id", readAt: "2026-04-20 16:00", clickedAt: "2026-04-20 16:03" },
      { id: 9, name: "CV Digital Solusi", email: "admin@digitalsolusi.web.id", readAt: "2026-04-21 09:00", clickedAt: "2026-04-21 09:02" },
      { id: 10, name: "PT Netindo Jaya", email: "jaya@netindo.co.id", readAt: "2026-04-20 20:15", clickedAt: "2026-04-20 20:18" },
      { id: 11, name: "PT Sentosa Tekno", email: "sentosa@teknologi.co.id", readAt: "2026-04-21 07:30", clickedAt: null },
      { id: 12, name: "CV IndoWeb Studio", email: "studio@indoweb.id", readAt: "2026-04-20 18:45", clickedAt: "2026-04-20 18:47" },
      { id: 13, name: "PT Logis Tech", email: "logis@logistech.co.id", readAt: null, clickedAt: null },
      { id: 14, name: "PT Bina Informatika", email: "bina@info.co.id", readAt: "2026-04-21 10:00", clickedAt: "2026-04-21 10:05" },
      { id: 15, name: "CV Media Kreatif", email: "media@mediakreatif.id", readAt: "2026-04-20 22:30", clickedAt: "2026-04-20 22:33" },
    ],
  },
  2: {
    id: 2,
    title: "Maintenance Sistem 25 April 2026",
    jenis: "info_pemeliharaan",
    content: "Akan ada maintenance sistem terencana pada:\n\n📅 Tanggal: 25 April 2026\n🕐 Waktu: 02:00 - 05:00 WIB\n\nDurante maintenance, sistem tidak dapat diakses. Mohon simpan pekerjaan Anda sebelum jam tersebut.\n\nTerima kasih atas pengertiannya.",
    target: "all",
    targetLabel: "Semua Client",
    scheduledAt: "2026-04-22 08:00",
    sentAt: "2026-04-22",
    status: "terkirim",
    publisher: "Aziz",
    totalClient: 15,
    recipients: [
      { id: 1, name: "PT Maju Jaya", email: "budi@maju.co", readAt: "2026-04-22 08:15", clickedAt: "2026-04-22 08:15" },
      { id: 2, name: "CV Kreasi Digital", email: "ani@kreasi.id", readAt: "2026-04-22 09:00", clickedAt: "2026-04-22 09:01" },
      { id: 3, name: "PT Sinergi Nusantara", email: "cahyo@sinergi.net", readAt: "2026-04-22 10:00", clickedAt: null },
      { id: 4, name: "PT Global Tech", email: "dewi@global.tech", readAt: "2026-04-22 08:30", clickedAt: "2026-04-22 08:32" },
      { id: 5, name: "CV Media Prima", email: "eko@media.id", readAt: "2026-04-22 11:00", clickedAt: "2026-04-22 11:05" },
      { id: 6, name: "PT Karya Bersama", email: "fitri@karya.id", readAt: "2026-04-22 09:30", clickedAt: null },
      { id: 7, name: "PT Energi Terbarukan Indonesia", email: "hendra@eti.co.id", readAt: "2026-04-22 12:00", clickedAt: null },
      { id: 8, name: "PT Cerdas Indonesia", email: "info@cerdas.id", readAt: null, clickedAt: null },
      { id: 9, name: "CV Digital Solusi", email: "admin@digitalsolusi.web.id", readAt: "2026-04-22 13:00", clickedAt: null },
      { id: 10, name: "PT Netindo Jaya", email: "jaya@netindo.co.id", readAt: "2026-04-22 14:00", clickedAt: null },
      { id: 11, name: "PT Sentosa Tekno", email: "sentosa@teknologi.co.id", readAt: "2026-04-22 08:45", clickedAt: "2026-04-22 08:47" },
      { id: 12, name: "CV IndoWeb Studio", email: "studio@indoweb.id", readAt: "2026-04-22 15:00", clickedAt: null },
      { id: 13, name: "PT Logis Tech", email: "logis@logistech.co.id", readAt: "2026-04-22 09:15", clickedAt: null },
      { id: 14, name: "PT Bina Informatika", email: "bina@info.co.id", readAt: "2026-04-22 16:00", clickedAt: null },
      { id: 15, name: "CV Media Kreatif", email: "media@mediakreatif.id", readAt: "2026-04-22 17:00", clickedAt: null },
    ],
  },
  4: {
    id: 4,
    title: "Undangan Gathering Client 15 Mei 2026",
    jenis: "undangan_event",
    content: "Kami mengundang semua client untuk hadir dalam acara gathering bertema 'Networking & Tech Updates 2026'.\n\n📅 Tanggal: 15 Mei 2026\n🕐 Waktu: 09:00 - 14:00 WIB\n📍 Tempat: Hotel Indonesia Kempinski, Jakarta\n\nRSVP sebelum 10 Mei 2026.",
    target: "all",
    targetLabel: "Semua Client",
    scheduledAt: "2026-04-28 10:00",
    sentAt: null,
    status: "terjadwal",
    publisher: "Aziz",
    totalClient: 15,
    recipients: [],
  },
}

const jenisConfig: Record<string, { label: string; color: string; icon: string }> = {
  fitur_baru:        { label: "Fitur Baru",          color: "bg-blue-100 text-blue-800 border-blue-300",   icon: "🔵" },
  pelayanan_baru:     { label: "Pelayanan Baru",       color: "bg-green-100 text-green-800 border-green-300", icon: "🟢" },
  info_pemeliharaan: { label: "Info Pemeliharaan",   color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: "🟡" },
  undangan_event:    { label: "Undangan Event",       color: "bg-purple-100 text-purple-800 border-purple-300", icon: "🟣" },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft:     { label: "Draft",     color: "bg-zinc-100 text-zinc-600 border-zinc-300" },
  terjadwal: { label: "Terjadwal", color: "bg-blue-100 text-blue-700 border-blue-300" },
  terkirim:  { label: "Terkirim", color: "bg-green-100 text-green-700 border-green-300" },
  archived:  { label: "Archived",  color: "bg-zinc-100 text-zinc-500 border-zinc-300 opacity-70" },
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PengumumanDetailPage({ params }: PageProps) {
  const [annId, setAnnId] = useState<number | null>(null)
  const [ann, setAnn] = useState<typeof announcementsData[number] | null>(null)
  const [activeTab, setActiveTab] = useState("sudah_baca")
  const [archived, setArchived] = useState(false)

  useEffect(() => {
    params.then(p => {
      const nid = Number(p.id)
      setAnnId(nid)
      setAnn(announcementsData[nid] || announcementsData[1])
      setArchived(announcementsData[nid]?.status === "archived" || false)
    })
  }, [params])

  if (!ann) {
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

  const jCfg = jenisConfig[ann.jenis] || jenisConfig.fitur_baru
  const stCfg = statusConfig[ann.status] || statusConfig.draft

  const readCount = ann.recipients.filter(r => r.readAt !== null).length
  const unreadCount = ann.recipients.filter(r => r.readAt === null).length
  const clickedCount = ann.recipients.filter(r => r.clickedAt !== null).length
  const readPercent = ann.totalClient > 0 ? Math.round((readCount / ann.totalClient) * 100) : 0

  const handleArchive = () => {
    if (confirm("Arsipkan pengumuman ini?")) {
      setArchived(true)
      alert("Pengumuman berhasil diarsipkan!")
    }
  }

  const handleSendReminder = (clientName: string) => {
    alert(`Reminder dikirim ke ${clientName}!`)
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
                <BreadcrumbItem><BreadcrumbLink href="/after-sales/pengumuman">Pengumuman & Update</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>Detail</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <NavUser user={{ name: "Aziz", email: "aziz@wit.id", avatar: "/avatars/user.jpg" }} />
        </header>

        <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">

          {/* Back + Title + Archive Button */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/after-sales/pengumuman">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight">{ann.title}</h1>
                  <Badge variant="outline" className={jCfg.color}>{jCfg.icon} {jCfg.label}</Badge>
                  <Badge variant="outline" className={stCfg.color}>{stCfg.label}</Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{ann.sentAt || ann.scheduledAt || "—"}</span>
                  <span>·</span>
                  <span>{ann.totalClient} target</span>
                  <span>·</span>
                  <span>by {ann.publisher}</span>
                </div>
              </div>
            </div>
            {ann.status === "terkirim" && !archived && (
              <Button variant="outline" onClick={handleArchive}>
                <Archive className="w-4 h-4 mr-2" />
                Arsipkan
              </Button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Terkir m</span>
                </div>
                <div className="text-2xl font-bold mt-1">{ann.totalClient}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Sudah Baca</span>
                </div>
                <div className="text-2xl font-bold mt-1">{readCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-muted-foreground">Belum Baca</span>
                </div>
                <div className="text-2xl font-bold mt-1">{unreadCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Klik Link</span>
                </div>
                <div className="text-2xl font-bold mt-1">{clickedCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Read Progress Bar */}
          {ann.status === "terkirim" && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Persentase Pembaca</span>
                  <span className="text-sm font-bold text-green-600">{readPercent}%</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-700"
                    style={{ width: `${readPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span>{readCount} dari {ann.totalClient} client</span>
                  <span>100%</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab Buttons */}
          {ann.status === "terkirim" && (
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("sudah_baca")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  activeTab === "sudah_baca"
                    ? "bg-green-50 border-green-400 text-green-700"
                    : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Sudah Baca ({readCount})
              </button>
              <button
                onClick={() => setActiveTab("belum_baca")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  activeTab === "belum_baca"
                    ? "bg-orange-50 border-orange-400 text-orange-700"
                    : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Belum Baca ({unreadCount})
              </button>
            </div>
          )}

          {/* Tab Content */}
          {ann.status === "terkirim" && activeTab === "sudah_baca" && (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <div className="min-w-[500px]">
                  {ann.recipients.filter(r => r.readAt !== null).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Eye className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>Belum ada yang baca</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Client</th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Email</th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Waktu Baca</th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Klik Link</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ann.recipients.filter(r => r.readAt !== null).map(r => (
                          <tr key={r.id} className="border-b hover:bg-muted/50">
                            <td className="px-4 py-3 font-medium">{r.name}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{r.email}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="flex items-center gap-1 text-green-600">
                                <Eye className="w-3.5 h-3.5" />
                                {r.readAt}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {r.clickedAt ? (
                                <span className="flex items-center gap-1 text-purple-600">
                                  <MousePointer className="w-3.5 h-3.5" />
                                  {r.clickedAt}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {ann.status === "terkirim" && activeTab === "belum_baca" && (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <div className="min-w-[500px]">
                  {ann.recipients.filter(r => r.readAt === null).length === 0 ? (
                    <div className="text-center py-8 text-green-600">
                      <Eye className="w-10 h-10 mx-auto mb-2 opacity-70" />
                      <p>Semua client sudah baca! 🎉</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Client</th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Email</th>
                          <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ann.recipients.filter(r => r.readAt === null).map(r => (
                          <tr key={r.id} className="border-b hover:bg-muted/50">
                            <td className="px-4 py-3 font-medium">{r.name}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{r.email}</td>
                            <td className="px-4 py-3 text-right">
                              <Button size="sm" variant="outline" onClick={() => handleSendReminder(r.name)}>
                                <Bell className="w-3.5 h-3.5 mr-1" />
                                Kirim Reminder
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Isi Pengumuman</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {ann.content}
              </div>
            </CardContent>
          </Card>

        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
