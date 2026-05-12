"use client"

import { useState, useEffect } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Progress } from "@workspace/ui/components/progress"
import { FolderKanban, TrendingUp, AlertTriangle, Clock, Briefcase, Layers } from "lucide-react"

interface CommercialProject {
  id: string
  name: string
  client: string
  contractValue: number
  milestone: string
  milestoneDate: string
  progress: number
  risk: "Low" | "Medium" | "High"
  status: "On Track" | "At Risk" | "Delayed"
}

interface DeliveryProject {
  id: string
  name: string
  pm: string
  sprint: string
  tasksDone: number
  tasksTotal: number
  blocked: number
  dueDate: string
  status: "On Track" | "At Risk" | "Delayed"
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)

const mockCommercial: CommercialProject[] = [
  { id: "PRJ-001", name: "ERP System", client: "PT. Maju Jaya Sejahtera", contractValue: 850000000, milestone: "Fase 2 — Modul Finance", milestoneDate: "2026-06-01", progress: 65, risk: "Low", status: "On Track" },
  { id: "PRJ-002", name: "HRIS Upgrade", client: "PT. Berkah Mandiri", contractValue: 350000000, milestone: "Fase 1 — Core HR", milestoneDate: "2026-05-25", progress: 40, risk: "Low", status: "On Track" },
  { id: "PRJ-003", name: "Mobile App", client: "CV. Digital Nusantara", contractValue: 280000000, milestone: "MVP Launch", milestoneDate: "2026-07-15", progress: 25, risk: "Medium", status: "At Risk" },
  { id: "PRJ-004", name: "E-Commerce Platform", client: "PT. Ritel Nasional", contractValue: 620000000, milestone: "Fase 1 — Checkout", milestoneDate: "2026-05-30", progress: 55, risk: "Low", status: "On Track" },
]

const mockDelivery: DeliveryProject[] = [
  { id: "PRJ-001", name: "ERP System", pm: "Andi Pratama", sprint: "Sprint 4", tasksDone: 18, tasksTotal: 24, blocked: 2, dueDate: "2026-05-20", status: "At Risk" },
  { id: "PRJ-002", name: "HRIS Upgrade", pm: "Budi Santoso", sprint: "Sprint 2", tasksDone: 12, tasksTotal: 20, blocked: 0, dueDate: "2026-05-25", status: "On Track" },
  { id: "PRJ-003", name: "Mobile App", pm: "Dewi Rahayu", sprint: "Sprint 1", tasksDone: 5, tasksTotal: 18, blocked: 3, dueDate: "2026-06-01", status: "At Risk" },
  { id: "PRJ-004", name: "E-Commerce Platform", pm: "Fani Susanti", sprint: "Sprint 3", tasksDone: 21, tasksTotal: 30, blocked: 0, dueDate: "2026-05-28", status: "On Track" },
  { id: "PRJ-005", name: "BI Dashboard", pm: "Citra Lestari", sprint: "Sprint 1", tasksDone: 2, tasksTotal: 15, blocked: 5, dueDate: "2026-06-10", status: "Delayed" },
]

function statusBadge(status: "On Track" | "At Risk" | "Delayed") {
  const map: Record<string, string> = {
    "On Track": "bg-emerald-100 text-emerald-700",
    "At Risk": "bg-amber-100 text-amber-700",
    "Delayed": "bg-red-100 text-red-700",
  }
  return <Badge className={`${map[status]} hover:${map[status]}`}>{status}</Badge>
}

function riskBadge(risk: "Low" | "Medium" | "High") {
  const map: Record<string, string> = {
    Low: "bg-blue-100 text-blue-700",
    Medium: "bg-amber-100 text-amber-700",
    High: "bg-red-100 text-red-700",
  }
  return <Badge className={`${map[risk]} hover:${map[risk]}`}>{risk}</Badge>
}

export default function ProjectDashboardPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => { setTimeout(() => setLoading(false), 500) }, [])

  const onTrack = mockDelivery.filter(p => p.status === "On Track").length
  const atRisk = mockDelivery.filter(p => p.status === "At Risk").length
  const delayed = mockDelivery.filter(p => p.status === "Delayed").length

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Project Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visibilitas proyek — Commercial View & Delivery View</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><FolderKanban className="h-4 w-4" /> Total Projects</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{mockDelivery.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /> On Track</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600">{onTrack}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> At Risk</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{atRisk}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-red-500" /> Delayed</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{delayed}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="commercial">
        <TabsList>
          <TabsTrigger value="commercial" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Commercial View
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Delivery View
          </TabsTrigger>
        </TabsList>

        {/* Commercial Tab — card grid */}
        <TabsContent value="commercial" className="mt-4">
          <div className="mb-3 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
            <strong>Commercial View</strong> — hanya menampilkan visibilitas bisnis: client, kontrak, milestone, dan risk level. Detail teknikal tidak ditampilkan di sini.
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {mockCommercial.map(p => (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <CardDescription>{p.client}</CardDescription>
                    </div>
                    {statusBadge(p.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Nilai Kontrak</p>
                      <p className="font-semibold">{formatRupiah(p.contractValue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Risk Level</p>
                      {riskBadge(p.risk)}
                    </div>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs">Milestone Berikutnya</p>
                    <p className="font-medium">{p.milestone}</p>
                    <p className="text-xs text-muted-foreground">{p.milestoneDate}</p>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{p.progress}%</span>
                    </div>
                    <Progress value={p.progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Delivery Tab — table */}
        <TabsContent value="delivery" className="mt-4">
          <div className="mb-3 p-3 rounded-lg bg-violet-50 border border-violet-100 text-xs text-violet-700">
            <strong>Delivery View</strong> — sprint progress, task completion, blocked issues, dan due date. Digunakan oleh PM, PIC, dan tim teknikal.
          </div>
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>PM</TableHead>
                    <TableHead>Sprint Aktif</TableHead>
                    <TableHead>Task Done/Total</TableHead>
                    <TableHead>Blocked</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockDelivery.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.pm}</TableCell>
                      <TableCell><Badge variant="outline">{p.sprint}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{p.tasksDone}/{p.tasksTotal}</span>
                          <Progress value={(p.tasksDone / p.tasksTotal) * 100} className="h-1.5 w-16" />
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.blocked > 0
                          ? <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{p.blocked} blocked</Badge>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">{p.dueDate}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
