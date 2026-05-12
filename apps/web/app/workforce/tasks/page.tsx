"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from "@workspace/ui/components/select"
import { Search, ListTodo } from "lucide-react"

type Category = "Project Task" | "Operational Task" | "Support Task" | "Improvement" | "Incident"
type Priority = "High" | "Medium" | "Low"
type Status = "In Progress" | "Pending" | "Done" | "Blocked"

interface WorkItem {
  id: string
  name: string
  category: Category
  project: string
  pic: string
  priority: Priority
  status: Status
  dueDate: string
}

const mockItems: WorkItem[] = [
  { id: "WI-001", name: "API Integration Payment", category: "Project Task", project: "ERP System", pic: "Andi Pratama", priority: "High", status: "In Progress", dueDate: "2026-05-20" },
  { id: "WI-002", name: "UI Dashboard HR", category: "Project Task", project: "HRIS Upgrade", pic: "Budi Santoso", priority: "Medium", status: "Done", dueDate: "2026-05-21" },
  { id: "WI-003", name: "Server Maintenance", category: "Operational Task", project: "—", pic: "Citra Lestari", priority: "Low", status: "Pending", dueDate: "2026-05-22" },
  { id: "WI-004", name: "Bug Fix Login Session", category: "Incident", project: "HRIS Upgrade", pic: "Budi Santoso", priority: "High", status: "In Progress", dueDate: "2026-05-13" },
  { id: "WI-005", name: "Code Refactor Auth Module", category: "Improvement", project: "HRIS Upgrade", pic: "Dewi Rahayu", priority: "Low", status: "Pending", dueDate: "2026-05-30" },
  { id: "WI-006", name: "Helpdesk Ticket — Email Config", category: "Support Task", project: "—", pic: "Gilang Ramadan", priority: "Medium", status: "In Progress", dueDate: "2026-05-14" },
  { id: "WI-007", name: "Database Indexing Optimization", category: "Improvement", project: "ERP System", pic: "Andi Pratama", priority: "Medium", status: "Pending", dueDate: "2026-05-28" },
  { id: "WI-008", name: "Mobile App Onboarding UI", category: "Project Task", project: "Mobile App", pic: "Dewi Rahayu", priority: "High", status: "In Progress", dueDate: "2026-05-25" },
  { id: "WI-009", name: "Backup & DR Test", category: "Operational Task", project: "—", pic: "Eko Prasetyo", priority: "Medium", status: "Pending", dueDate: "2026-05-31" },
  { id: "WI-010", name: "Production Incident — API Timeout", category: "Incident", project: "ERP System", pic: "Eko Prasetyo", priority: "High", status: "Blocked", dueDate: "2026-05-12" },
]

const categoryColors: Record<Category, string> = {
  "Project Task": "bg-blue-100 text-blue-700",
  "Operational Task": "bg-gray-100 text-gray-700",
  "Support Task": "bg-violet-100 text-violet-700",
  "Improvement": "bg-emerald-100 text-emerald-700",
  "Incident": "bg-red-100 text-red-700",
}

const priorityColors: Record<Priority, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-slate-100 text-slate-600",
}

const statusColors: Record<Status, string> = {
  "In Progress": "bg-blue-100 text-blue-700",
  "Pending": "bg-amber-100 text-amber-700",
  "Done": "bg-emerald-100 text-emerald-700",
  "Blocked": "bg-red-100 text-red-700",
}

const categories: Category[] = ["Project Task", "Operational Task", "Support Task", "Improvement", "Incident"]

export default function TaskManagementPage() {
  const [data, setData] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  const [priorityFilter, setPriorityFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("ALL")

  useEffect(() => { setTimeout(() => { setData(mockItems); setLoading(false) }, 500) }, [])

  const filtered = useMemo(() => {
    let r = [...data]
    if (search) { const s = search.toLowerCase(); r = r.filter(i => i.name.toLowerCase().includes(s) || i.pic.toLowerCase().includes(s) || i.project.toLowerCase().includes(s)) }
    if (categoryFilter !== "ALL") r = r.filter(i => i.category === categoryFilter)
    if (priorityFilter !== "ALL") r = r.filter(i => i.priority === priorityFilter)
    if (statusFilter !== "ALL") r = r.filter(i => i.status === statusFilter)
    return r
  }, [data, search, categoryFilter, priorityFilter, statusFilter])

  const counts = {
    "Project Task": data.filter(i => i.category === "Project Task").length,
    "Operational Task": data.filter(i => i.category === "Operational Task").length,
    "Support Task": data.filter(i => i.category === "Support Task").length,
    "Improvement": data.filter(i => i.category === "Improvement").length,
    "Incident": data.filter(i => i.category === "Incident").length,
  }

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Management</h1>
          <p className="text-muted-foreground mt-1">Semua pekerjaan dicatat sebagai Work Item — bukan hanya project task</p>
        </div>
        <Button><ListTodo className="h-4 w-4 mr-2" /> Buat Work Item</Button>
      </div>

      {/* Category Stats */}
      <div className="grid gap-3 md:grid-cols-5">
        {categories.map(cat => (
          <Card
            key={cat}
            className={`cursor-pointer transition-all hover:shadow-md ${categoryFilter === cat ? "ring-2 ring-primary" : ""}`}
            onClick={() => setCategoryFilter(categoryFilter === cat ? "ALL" : cat)}
          >
            <CardContent className="pt-4 pb-3">
              <Badge className={`${categoryColors[cat]} hover:${categoryColors[cat]} mb-2 text-xs`}>{cat}</Badge>
              <div className="text-2xl font-bold">{counts[cat]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari task, PIC, atau project..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectGroup><SelectLabel>Kategori</SelectLabel>
              <SelectItem value="ALL">Semua Kategori</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectGroup><SelectLabel>Priority</SelectLabel>
              <SelectItem value="ALL">Semua</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectGroup><SelectLabel>Status</SelectLabel>
              <SelectItem value="ALL">Semua</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Done">Done</SelectItem>
              <SelectItem value="Blocked">Blocked</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Work Item</CardTitle>
          <CardDescription>Menampilkan {filtered.length} dari {data.length} work item</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Task Name</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>PIC</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell><Badge className={`${categoryColors[item.category]} hover:${categoryColors[item.category]} text-xs`}>{item.category}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.project}</TableCell>
                  <TableCell className="text-sm">{item.pic}</TableCell>
                  <TableCell><Badge className={`${priorityColors[item.priority]} hover:${priorityColors[item.priority]} text-xs`}>{item.priority}</Badge></TableCell>
                  <TableCell><Badge className={`${statusColors[item.status]} hover:${statusColors[item.status]} text-xs`}>{item.status}</Badge></TableCell>
                  <TableCell className="text-sm font-mono">{item.dueDate}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Tidak ada work item</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
