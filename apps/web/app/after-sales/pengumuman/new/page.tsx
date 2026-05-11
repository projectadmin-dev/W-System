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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Users, CalendarClock, Send, Save, Search } from "lucide-react"
import Link from "next/link"

/* ═════════════════ DUMMY CLIENTS FOR CHECKBOX ═════════════════ */

const allClients = [
  { id: 1, name: "PT Maju Jaya", segment: "Platinum", status: "active" },
  { id: 2, name: "CV Kreasi Digital", segment: "Gold", status: "warm" },
  { id: 3, name: "PT Sinergi Nusantara", segment: "Silver", status: "at_risk" },
  { id: 4, name: "PT Global Tech", segment: "Gold", status: "cold" },
  { id: 5, name: "CV Media Prima", segment: "Platinum", status: "active" },
  { id: 6, name: "PT Karya Bersama", segment: "Silver", status: "dormant" },
  { id: 7, name: "PT Energi Terbarukan Indonesia", segment: "Gold", status: "warm" },
]

export default function BuatPengumumanPage() {
  const [title, setTitle] = useState("")
  const [jenis, setJenis] = useState("")
  const [content, setContent] = useState("")
  const [targetMode, setTargetMode] = useState<"all" | "enterprise" | "retainer" | "at_risk" | "manual">("all")
  const [selectedClients, setSelectedClients] = useState<number[]>([])
  const [clientSearch, setClientSearch] = useState("")
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now")
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("09:00")
  const [savedDraft, setSavedDraft] = useState(false)

  // Calculate recipient count
  const getRecipientCount = () => {
    if (targetMode === "manual") return selectedClients.length
    if (targetMode === "all") return allClients.length
    if (targetMode === "enterprise") return allClients.filter(c => c.segment === "Platinum" || c.segment === "Gold").length
    if (targetMode === "retainer") return allClients.filter(c => ["PT Maju Jaya", "CV Media Prima", "PT Global Tech", "PT Energi Terbarukan Indonesia"].includes(c.name)).length
    if (targetMode === "at_risk") return allClients.filter(c => c.status === "at_risk" || c.status === "dormant").length
    return 0
  }

  const toggleClient = (id: number) => {
    setSelectedClients(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const filteredClients = allClients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const handleSaveDraft = () => {
    setSavedDraft(true)
    setTimeout(() => setSavedDraft(false), 3000)
    alert("Draft disimpan!")
  }

  const handleSchedule = () => {
    if (!scheduleDate) {
      alert("Pilih tanggal jadwal pengiriman terlebih dahulu")
      return
    }
    alert(`Pengumuman dijadwalkan untuk ${scheduleDate} ${scheduleTime}`)
  }

  const handleSendNow = () => {
    alert(`Pengumuman "${title}" sedang dikirim ke ${getRecipientCount()} client!`)
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
                <BreadcrumbItem><BreadcrumbPage>Buat Baru</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <NavUser user={{ name: "Aziz", email: "aziz@wit.id", avatar: "/avatars/user.jpg" }} />
        </header>

        <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6 max-w-4xl">

          {/* Back */}
          <div className="flex items-center gap-3">
            <Link href="/after-sales/pengumuman">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Buat Pengumuman Baru</h1>
              <p className="text-muted-foreground text-sm">Buat dan kirim pengumuman ke client</p>
            </div>
          </div>

          <div className="space-y-4">

            {/* Section 1: Info Pengumuman */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informasi Pengumuman</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Judul Pengumuman</Label>
                  <Input
                    placeholder="Contoh: Fitur Baru Auto-Report Dashboard"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Jenis</Label>
                  <Select value={jenis} onValueChange={setJenis}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fitur_baru">🔵 Fitur Baru</SelectItem>
                      <SelectItem value="pelayanan_baru">🟢 Pelayanan Baru</SelectItem>
                      <SelectItem value="info_pemeliharaan">🟡 Info Pemeliharaan</SelectItem>
                      <SelectItem value="undangan_event">🟣 Undangan Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Isi Pengumuman</Label>
                  <Textarea
                    placeholder="Tulis isi pengumuman di sini..."
                    className="min-h-[160px]"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tips: Pisahkan paragraf dengan enter untuk keterbacaan yang lebih baik.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Target Penerima */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Target Penerima
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Radio Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[
                    { value: "all", label: "Semua Client" },
                    { value: "enterprise", label: "Enterprise" },
                    { value: "retainer", label: "Retainer" },
                    { value: "at_risk", label: "At Risk" },
                    { value: "manual", label: "Pilih Manual" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTargetMode(opt.value as typeof targetMode)}
                      className={`p-3 rounded-lg border text-center text-sm font-medium transition-all ${
                        targetMode === opt.value
                          ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-950"
                          : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Manual Client Selection */}
                {targetMode === "manual" && (
                  <div className="border rounded-lg p-4 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari client..."
                        className="pl-8"
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      {filteredClients.map(client => (
                        <label
                          key={client.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedClients.includes(client.id)}
                            onChange={() => toggleClient(client.id)}
                            className="w-4 h-4 rounded border-zinc-400"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium">{client.name}</span>
                            <div className="flex gap-2 mt-0.5">
                              <Badge variant="outline" className="text-xs">{client.segment}</Badge>
                              <Badge variant="outline" className={`text-xs ${
                                client.status === "active" ? "bg-green-50 text-green-700" :
                                client.status === "warm" ? "bg-yellow-50 text-yellow-700" :
                                client.status === "cold" ? "bg-slate-50 text-slate-600" :
                                client.status === "at_risk" ? "bg-red-50 text-red-700" :
                                "bg-zinc-50 text-zinc-600"
                              }`}>
                                {client.status}
                              </Badge>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview Count */}
                <div className={`p-3 rounded-lg border ${targetMode === "manual" && selectedClients.length === 0 ? "bg-muted/50" : "bg-blue-50 border-blue-200"}`}>
                  <p className="text-sm">
                    <strong>{getRecipientCount()}</strong> client akan menerima pengumuman ini
                    {targetMode === "manual" && selectedClients.length === 0 && (
                      <span className="text-orange-600 ml-1">— pilih client terlebih dahulu</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Jadwal Kirim */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="w-4 h-4" />
                  Jadwal Pengiriman
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Radio Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSendMode("now")}
                    className={`p-3 rounded-lg border text-center text-sm font-medium transition-all ${
                      sendMode === "now"
                        ? "bg-green-50 border-green-400 text-green-700 dark:bg-green-950"
                        : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    🚀 Kirim Sekarang
                  </button>
                  <button
                    onClick={() => setSendMode("schedule")}
                    className={`p-3 rounded-lg border text-center text-sm font-medium transition-all ${
                      sendMode === "schedule"
                        ? "bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-950"
                        : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    📅 Jadwalkan
                  </button>
                </div>

                {/* Date & Time Picker */}
                {sendMode === "schedule" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Tanggal</Label>
                      <Input
                        type="date"
                        value={scheduleDate}
                        onChange={e => setScheduleDate(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Jam</Label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={e => setScheduleTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button variant="outline" onClick={handleSaveDraft}>
                <Save className="w-4 h-4 mr-2" />
                Simpan Draft
              </Button>
              {sendMode === "schedule" ? (
                <Button onClick={handleSchedule} disabled={!scheduleDate || !title || !jenis}>
                  <CalendarClock className="w-4 h-4 mr-2" />
                  Jadwalkan
                </Button>
              ) : (
                <Button onClick={handleSendNow} disabled={!title || !jenis || (targetMode === "manual" && selectedClients.length === 0)}>
                  <Send className="w-4 h-4 mr-2" />
                  Kirim Sekarang ({getRecipientCount()} client)
                </Button>
              )}
            </div>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
