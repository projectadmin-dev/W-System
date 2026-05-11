"use client"

import { useEffect, useState } from "react"
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { Label } from "@workspace/ui/components/label"
import { ArrowLeft, CalendarDays, CheckCircle2, Star, Smile, Meh, Frown, AlertTriangle, Save, Clock } from "lucide-react"
import Link from "next/link"

/* ═════════════════ DUMMY DATA ═════════════════ */

const surveyAnswersData: Record<number, {
  id: number
  client: string
  sourceType: string
  sourceName: string
  sentDate: string
  answeredDate: string
  avgScore: number
  sentiment: string
  status: string
  needFollowUp: boolean
  picFollowUp: string | null
  answers: {
    stars: number[]
    yesNo: string
    texts: string[]
  }
}> = {
  1: {
    id: 1,
    client: "PT Maju Jaya",
    sourceType: "Project",
    sourceName: "Website Company Profile",
    sentDate: "2026-04-20",
    answeredDate: "2026-04-21",
    avgScore: 4.8,
    sentiment: "positive",
    status: "answered",
    needFollowUp: false,
    picFollowUp: "Andi Supriyadi",
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
  2: {
    id: 2,
    client: "CV Kreasi Digital",
    sourceType: "Tiket",
    sourceName: "Bug Login Mobile",
    sentDate: "2026-04-18",
    answeredDate: "2026-04-19",
    avgScore: 2.3,
    sentiment: "negative",
    status: "answered",
    needFollowUp: true,
    picFollowUp: "Dewi Kumalasari",
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
  3: {
    id: 3,
    client: "PT Sinergi Nusantara",
    sourceType: "Tiket",
    sourceName: "Error Laporan Bulanan",
    sentDate: "2026-04-15",
    answeredDate: null as unknown as string,
    avgScore: 0,
    sentiment: "",
    status: "sent",
    needFollowUp: false,
    picFollowUp: null,
    answers: null as unknown as { stars: number[]; yesNo: string; texts: string[] },
  },
  4: {
    id: 4,
    client: "PT Global Tech",
    sourceType: "Project",
    sourceName: "Dashboard Analytics",
    sentDate: "2026-04-10",
    answeredDate: "2026-04-12",
    avgScore: 4.2,
    sentiment: "positive",
    status: "answered",
    needFollowUp: false,
    picFollowUp: null,
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
  5: {
    id: 5,
    client: "CV Media Prima",
    sourceType: "Tiket",
    sourceName: "Update Konten Website",
    sentDate: "2026-04-12",
    answeredDate: null as unknown as string,
    avgScore: 0,
    sentiment: "",
    status: "expired",
    needFollowUp: false,
    picFollowUp: null,
    answers: null as unknown as { stars: number[]; yesNo: string; texts: string[] },
  },
  6: {
    id: 6,
    client: "PT Energi Terbarukan Indonesia",
    sourceType: "Project",
    sourceName: "Sistem Monitoring Solar",
    sentDate: "2026-04-05",
    answeredDate: "2026-04-07",
    avgScore: 3.6,
    sentiment: "neutral",
    status: "answered",
    needFollowUp: false,
    picFollowUp: null,
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
  7: {
    id: 7,
    client: "PT Karya Bersama",
    sourceType: "Tiket",
    sourceName: "Reset Password User",
    sentDate: "2026-03-28",
    answeredDate: null as unknown as string,
    avgScore: 0,
    sentiment: "",
    status: "expired",
    needFollowUp: false,
    picFollowUp: null,
    answers: null as unknown as { stars: number[]; yesNo: string; texts: string[] },
  },
}

const starQuestions = [
  "Kualitas produk/jasa yang diberikan",
  "Ketepatan waktu pengerjaan",
  "Komunikasi dan responsiveness tim",
  "Kesesuaian dengan kebutuhan",
  "Pelayanan after-sales/support",
]

const textQuestions = [
  "Apa yang kamu suka dari layanan kami?",
  "Apa yang bisa kami tingkatkan?",
  "Kritik, saran, atau masukan lainnya",
]

const sentimentConfig: Record<string, { label: string; color: string; icon: string }> = {
  positive: { label: "Positif", color: "bg-green-100 text-green-800 border-green-300", icon: "🟢" },
  neutral:  { label: "Netral",  color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: "🟡" },
  negative: { label: "Negatif", color: "bg-red-100 text-red-800 border-red-300", icon: "🔴" },
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function SurveyDetailPage({ params }: PageProps) {
  const [surveyId, setSurveyId] = useState<number | null>(null)
  const [survey, setSurvey] = useState<typeof surveyAnswersData[number] | null>(null)
  const [followUp, setFollowUp] = useState(false)
  const [picFollowUp, setPicFollowUp] = useState("")
  const [sentiment, setSentiment] = useState("")

  useEffect(() => {
    params.then(p => {
      const nid = Number(p.id)
      setSurveyId(nid)
      const data = surveyAnswersData[nid] || surveyAnswersData[1]
      setSurvey(data)
      setFollowUp(data.needFollowUp)
      setPicFollowUp(data.picFollowUp || "")
      setSentiment(data.sentiment || "")
    })
  }, [params])

  if (!survey) {
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

  const sentCfg = sentimentConfig[survey.sentiment] || { label: "—", color: "bg-muted", icon: "" }

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
                <BreadcrumbItem><BreadcrumbLink href="/after-sales/surveys">Auto Survey</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem><BreadcrumbPage>{survey.client}</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <NavUser user={{ name: "Aziz", email: "aziz@wit.id", avatar: "/avatars/user.jpg" }} />
        </header>

        <div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">

          {/* Back */}
          <div className="flex items-center gap-3">
            <Link href="/after-sales/surveys">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Detail Jawaban Survey</h1>
              <p className="text-muted-foreground text-sm">{survey.client}</p>
            </div>
          </div>

          {/* Info Header Card */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="font-semibold">{survey.client}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sumber</p>
                  <Badge variant="outline" className="mt-1">
                    {survey.sourceType === "Project" ? "📁" : "🎫"} {survey.sourceName}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal Kirim</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium">{survey.sentDate}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tanggal Jawab</p>
                  <div className="flex items-center gap-1 mt-1">
                    {survey.answeredDate ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        <span className="font-medium">{survey.answeredDate}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Skor Rata-rata</p>
                  {survey.avgScore > 0 ? (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < Math.round(survey.avgScore) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-300'}`} />
                        ))}
                      </div>
                      <span className={`font-bold text-lg ${survey.avgScore >= 4 ? 'text-green-600' : survey.avgScore >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {survey.avgScore.toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Jawaban per Pertanyaan */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Kiri: Jawaban */}
            <div className="lg:col-span-2 space-y-4">

              {/* 5 Pertanyaan Bintang */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Rating Questions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {starQuestions.map((q, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex-1">{q}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, si) => (
                            <Star key={si} className={`w-5 h-5 ${si < survey.answers.stars[i] ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-200'}`} />
                          ))}
                        </div>
                        <span className={`font-bold text-lg w-8 text-right ${
                          survey.answers.stars[i] >= 4 ? 'text-green-600' :
                          survey.answers.stars[i] === 3 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {survey.answers.stars[i]}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Pertanyaan Ya/Tidak/Mungkin */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Rekomendasi</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Apakah kamu akan merekomendasikan WIT ke orang lain?
                  </p>
                  <div className="flex gap-2">
                    {["Ya", "Mungkin", "Tidak"].map(opt => (
                      <div
                        key={opt}
                        className={`px-4 py-2 rounded-full font-medium text-sm border ${
                          survey.answers.yesNo === opt
                            ? opt === "Ya"
                              ? "bg-green-100 text-green-800 border-green-300"
                              : opt === "Mungkin"
                              ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                              : "bg-red-100 text-red-800 border-red-300"
                            : "bg-muted text-muted-foreground border-transparent"
                        }`}
                      >
                        {opt === "Ya" ? "✅" : opt === "Mungkin" ? "🤔" : "❌"} {opt}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 3 Pertanyaan Teks Bebas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Jawaban Teks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {textQuestions.map((q, i) => (
                    <div key={i} className="p-3 bg-muted/40 rounded-lg border">
                      <p className="text-xs font-medium text-muted-foreground mb-1">{q}</p>
                      <p className="text-sm">{survey.answers.texts[i]}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Kanan: Sentimen + Follow-Up */}
            <div className="space-y-4">

              {/* Sentimen */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    {survey.sentiment === "positive" ? (
                      <Smile className="w-4 h-4 text-green-500" />
                    ) : survey.sentiment === "neutral" ? (
                      <Meh className="w-4 h-4 text-yellow-500" />
                    ) : survey.sentiment === "negative" ? (
                      <Frown className="w-4 h-4 text-red-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                    )}
                    Sentimen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Sentimen Otomatis</Label>
                    <Badge variant="outline" className={`mt-1 ${sentCfg.color}`}>
                      {sentCfg.icon} {sentCfg.label}
                    </Badge>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs text-muted-foreground">Sentimen (Edit Manual)</Label>
                    <Select value={sentiment} onValueChange={setSentiment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="positive">🟢 Positif</SelectItem>
                        <SelectItem value="neutral">🟡 Netral</SelectItem>
                        <SelectItem value="negative">🔴 Negatif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Follow-Up */}
              <Card className={followUp ? 'border-red-300 bg-red-50 dark:bg-red-950' : ''}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${followUp ? 'text-red-500' : 'text-muted-foreground'}`} />
                    Follow-Up
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Perlu Follow-Up?</Label>
                      <p className="text-xs text-muted-foreground">
                        {followUp ? "⚠️ Ya, perlu ditindaklanjuti" : "Tidak perlu follow-up"}
                      </p>
                    </div>
                    <Switch checked={followUp} onCheckedChange={setFollowUp} />
                  </div>
                  {followUp && (
                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">PIC Follow-Up</Label>
                      <Select value={picFollowUp} onValueChange={setPicFollowUp}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih PIC..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Andi Supriyadi">Andi Supriyadi</SelectItem>
                          <SelectItem value="Dewi Kumalasari">Dewi Kumalasari</SelectItem>
                          <SelectItem value="Rudi Hermawan">Rudi Hermawan</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="w-full mt-2" onClick={() => alert("Follow-up saved!")}>
                        <Save className="w-4 h-4 mr-2" />
                        Simpan
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary */}
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        ✅ Dijawab
                      </Badge>
                    </div>
                    {survey.avgScore > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avg Score</span>
                        <span className="font-semibold">{survey.avgScore.toFixed(1)} / 5</span>
                      </div>
                    )}
                    {survey.answers && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rekomendasi</span>
                        <span className="font-semibold">{survey.answers.yesNo || "—"}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
