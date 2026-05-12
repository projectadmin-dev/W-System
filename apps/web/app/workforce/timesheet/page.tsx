"use client"

import { useState, useEffect } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from "@workspace/ui/components/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Textarea } from "@workspace/ui/components/textarea"
import { Clock, Plus, Calendar, CheckCircle2 } from "lucide-react"

interface WorkLog {
  id: string
  date: string
  employee: string
  workItem: string
  project: string
  hours: number
  description: string
  status: "Approved" | "Pending" | "Rejected"
}

const mockLogs: WorkLog[] = [
  { id: "WL-001", date: "2026-05-12", employee: "Andi Pratama", workItem: "API Integration Payment", project: "ERP System", hours: 6, description: "Integration testing dengan payment gateway", status: "Approved" },
  { id: "WL-002", date: "2026-05-12", employee: "Budi Santoso", workItem: "Code Review", project: "HRIS Upgrade", hours: 4, description: "PR review frontend module", status: "Pending" },
  { id: "WL-003", date: "2026-05-11", employee: "Citra Lestari", workItem: "Regression Testing", project: "ERP System", hours: 5, description: "Test regresi modul inventory", status: "Approved" },
  { id: "WL-004", date: "2026-05-11", employee: "Andi Pratama", workItem: "Database Optimization", project: "ERP System", hours: 3, description: "Query optimization tabel transaksi", status: "Approved" },
  { id: "WL-005", date: "2026-05-10", employee: "Dewi Rahayu", workItem: "UI Wireframe", project: "Mobile App", hours: 7, description: "Wireframe onboarding flow", status: "Approved" },
  { id: "WL-006", date: "2026-05-10", employee: "Eko Prasetyo", workItem: "Server Maintenance", project: "Operational", hours: 2, description: "Update server dependencies", status: "Pending" },
  { id: "WL-007", date: "2026-05-09", employee: "Fani Susanti", workItem: "API Documentation", project: "BI Dashboard", hours: 4, description: "Dokumentasi endpoint analytics", status: "Approved" },
  { id: "WL-008", date: "2026-05-09", employee: "Budi Santoso", workItem: "Bug Fix Login", project: "HRIS Upgrade", hours: 3, description: "Fix session timeout issue", status: "Approved" },
  { id: "WL-009", date: "2026-05-08", employee: "Gilang Ramadan", workItem: "Test Case Writing", project: "E-Commerce Platform", hours: 5, description: "Menulis test case checkout flow", status: "Pending" },
  { id: "WL-010", date: "2026-05-08", employee: "Hani Puspita", workItem: "Design System Update", project: "HRIS Upgrade", hours: 6, description: "Update komponen shadcn/ui", status: "Rejected" },
]

const workItems = ["API Integration Payment", "Code Review", "Regression Testing", "Database Optimization", "UI Wireframe", "Server Maintenance", "API Documentation", "Bug Fix Login", "Test Case Writing"]
const projects = ["ERP System", "HRIS Upgrade", "Mobile App", "E-Commerce Platform", "BI Dashboard", "Operational"]

function statusBadge(status: WorkLog["status"]) {
  const map: Record<string, string> = {
    Approved: "bg-emerald-100 text-emerald-700",
    Pending: "bg-amber-100 text-amber-700",
    Rejected: "bg-red-100 text-red-700",
  }
  return <Badge className={`${map[status]} hover:${map[status]}`}>{status}</Badge>
}

export default function TimesheetPage() {
  const [logs, setLogs] = useState<WorkLog[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [month, setMonth] = useState("05")
  const [year, setYear] = useState("2026")
  const [newLog, setNewLog] = useState({ date: "2026-05-13", employee: "", workItem: "", project: "", hours: "", description: "" })
  const [saved, setSaved] = useState(false)

  useEffect(() => { setTimeout(() => { setLogs(mockLogs); setLoading(false) }, 500) }, [])

  const totalHours = logs.reduce((s, l) => s + l.hours, 0)
  const pendingCount = logs.filter(l => l.status === "Pending").length
  const workingDays = 13
  const avgHours = (totalHours / workingDays).toFixed(1)

  function handleSave() {
    if (!newLog.employee || !newLog.workItem || !newLog.project || !newLog.hours) return
    const entry: WorkLog = {
      id: `WL-${String(logs.length + 1).padStart(3, "0")}`,
      date: newLog.date,
      employee: newLog.employee,
      workItem: newLog.workItem,
      project: newLog.project,
      hours: Number(newLog.hours),
      description: newLog.description,
      status: "Pending",
    }
    setLogs(prev => [entry, ...prev])
    setSaved(true)
    setTimeout(() => { setSaved(false); setDialogOpen(false); setNewLog({ date: "2026-05-13", employee: "", workItem: "", project: "", hours: "", description: "" }) }, 1200)
  }

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timesheet</h1>
          <p className="text-muted-foreground mt-1">Log aktivitas dan worklog harian karyawan</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
                <SelectItem key={m} value={m}>{new Date(2026, Number(m)-1).toLocaleString("id-ID", { month: "long" })}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Log Activity</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Aktivitas Baru</DialogTitle>
                <DialogDescription>Input worklog untuk hari ini</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Tanggal</Label>
                    <Input type="date" value={newLog.date} onChange={e => setNewLog(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Karyawan</Label>
                    <Input placeholder="Nama karyawan" value={newLog.employee} onChange={e => setNewLog(p => ({ ...p, employee: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Work Item</Label>
                  <Select value={newLog.workItem} onValueChange={v => setNewLog(p => ({ ...p, workItem: v }))}>
                    <SelectTrigger><SelectValue placeholder="Pilih work item..." /></SelectTrigger>
                    <SelectContent>{workItems.map(wi => <SelectItem key={wi} value={wi}>{wi}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Project</Label>
                    <Select value={newLog.project} onValueChange={v => setNewLog(p => ({ ...p, project: v }))}>
                      <SelectTrigger><SelectValue placeholder="Pilih project..." /></SelectTrigger>
                      <SelectContent>{projects.map(pr => <SelectItem key={pr} value={pr}>{pr}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Hours</Label>
                    <Input type="number" min="0.5" max="12" step="0.5" placeholder="0" value={newLog.hours} onChange={e => setNewLog(p => ({ ...p, hours: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Deskripsi</Label>
                  <Textarea placeholder="Deskripsi singkat aktivitas..." rows={3} value={newLog.description} onChange={e => setNewLog(p => ({ ...p, description: e.target.value }))} />
                </div>
                {saved && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-md px-3 py-2">
                    <CheckCircle2 className="h-4 w-4" /> Log berhasil disimpan!
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
                <Button onClick={handleSave} disabled={saved}>Simpan Log</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" /> Total Hours</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalHours}h</div><p className="text-xs text-muted-foreground">bulan ini</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> Working Days</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{workingDays}</div><p className="text-xs text-muted-foreground">hari kerja</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Hours/Day</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{avgHours}h</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pending Approval</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{pendingCount}</div></CardContent></Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Worklog Entries</CardTitle>
          <CardDescription>{logs.length} entri worklog</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead>Work Item</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{log.id}</TableCell>
                  <TableCell className="text-sm">{log.date}</TableCell>
                  <TableCell className="font-medium">{log.employee}</TableCell>
                  <TableCell className="text-sm">{log.workItem}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{log.project}</Badge></TableCell>
                  <TableCell className="font-mono text-sm">{log.hours}h</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{log.description}</TableCell>
                  <TableCell>{statusBadge(log.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
