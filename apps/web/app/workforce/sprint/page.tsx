"use client"

import { useState, useEffect } from "react"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/ui/components/select"
import { Plus, Calendar, Users, AlertCircle } from "lucide-react"

type Priority = "High" | "Medium" | "Low"
type Column = "Backlog" | "In Progress" | "Review" | "Done"

interface SprintCard {
  id: string
  name: string
  project: string
  pic: string
  priority: Priority
  dueDate: string
  column: Column
}

const sprintData: Record<string, { label: string; dateRange: string; cards: SprintCard[] }> = {
  "sprint-4": {
    label: "Sprint 4",
    dateRange: "12 – 25 Mei 2026",
    cards: [
      { id: "WI-001", name: "API Integration Payment", project: "ERP System", pic: "Andi Pratama", priority: "High", dueDate: "2026-05-20", column: "In Progress" },
      { id: "WI-008", name: "Mobile App Onboarding UI", project: "Mobile App", pic: "Dewi Rahayu", priority: "High", dueDate: "2026-05-25", column: "In Progress" },
      { id: "WI-010", name: "Production Incident — API Timeout", project: "ERP System", pic: "Eko Prasetyo", priority: "High", dueDate: "2026-05-12", column: "In Progress" },
      { id: "WI-004", name: "Bug Fix Login Session", project: "HRIS Upgrade", pic: "Budi Santoso", priority: "High", dueDate: "2026-05-13", column: "Review" },
      { id: "WI-006", name: "Helpdesk Ticket — Email Config", project: "—", pic: "Gilang Ramadan", priority: "Medium", dueDate: "2026-05-14", column: "Review" },
      { id: "WI-002", name: "UI Dashboard HR", project: "HRIS Upgrade", pic: "Budi Santoso", priority: "Medium", dueDate: "2026-05-21", column: "Done" },
      { id: "WI-007", name: "Database Indexing Optimization", project: "ERP System", pic: "Andi Pratama", priority: "Medium", dueDate: "2026-05-28", column: "Backlog" },
      { id: "WI-005", name: "Code Refactor Auth Module", project: "HRIS Upgrade", pic: "Dewi Rahayu", priority: "Low", dueDate: "2026-05-30", column: "Backlog" },
      { id: "WI-003", name: "Server Maintenance", project: "—", pic: "Citra Lestari", priority: "Low", dueDate: "2026-05-22", column: "Backlog" },
      { id: "WI-009", name: "Backup & DR Test", project: "—", pic: "Eko Prasetyo", priority: "Medium", dueDate: "2026-05-31", column: "Backlog" },
      { id: "WI-011", name: "API Documentation Update", project: "BI Dashboard", pic: "Fani Susanti", priority: "Low", dueDate: "2026-05-24", column: "Done" },
      { id: "WI-012", name: "Regression Test Suite", project: "ERP System", pic: "Citra Lestari", priority: "Medium", dueDate: "2026-05-19", column: "Done" },
    ],
  },
  "sprint-3": {
    label: "Sprint 3",
    dateRange: "28 Apr – 11 Mei 2026",
    cards: [],
  },
}

const columns: Column[] = ["Backlog", "In Progress", "Review", "Done"]

const columnStyles: Record<Column, { header: string; dot: string }> = {
  Backlog: { header: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  "In Progress": { header: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  Review: { header: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  Done: { header: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
}

const priorityColors: Record<Priority, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-slate-100 text-slate-600",
}

export default function SprintBoardPage() {
  const [sprint, setSprint] = useState("sprint-4")
  const [loading, setLoading] = useState(true)

  useEffect(() => { setTimeout(() => setLoading(false), 400) }, [])

  const current = sprintData[sprint]
  const cardsByColumn = (col: Column) => current?.cards.filter(c => c.column === col) ?? []

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sprint Board</h1>
          <p className="text-muted-foreground mt-1">Kanban board untuk delivery tracking per sprint</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sprint} onValueChange={setSprint}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sprint-4">Sprint 4</SelectItem>
              <SelectItem value="sprint-3">Sprint 3</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Calendar className="h-4 w-4" /> {current.dateRange}
          </Button>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Task</Button>
        </div>
      </div>

      {/* Sprint summary */}
      <div className="flex flex-wrap gap-4">
        {columns.map(col => {
          const cards = cardsByColumn(col)
          return (
            <div key={col} className="flex items-center gap-2 text-sm">
              <span className={`inline-block w-2 h-2 rounded-full ${columnStyles[col].dot}`} />
              <span className="text-muted-foreground">{col}</span>
              <span className="font-semibold">{cards.length}</span>
            </div>
          )
        })}
        <div className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" /> {[...new Set(current.cards.map(c => c.pic))].length} anggota
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map(col => {
          const cards = cardsByColumn(col)
          return (
            <div key={col} className="flex flex-col gap-3">
              {/* Column Header */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${columnStyles[col].header}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${columnStyles[col].dot}`} />
                  <span className="font-semibold text-sm">{col}</span>
                </div>
                <span className="text-xs font-mono bg-white/50 px-1.5 py-0.5 rounded">{cards.length}</span>
              </div>

              {/* Cards */}
              {cards.length === 0 ? (
                <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center text-xs text-muted-foreground">
                  Tidak ada task
                </div>
              ) : (
                cards.map(card => (
                  <Card key={card.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground">{card.id}</span>
                        <Badge className={`${priorityColors[card.priority]} hover:${priorityColors[card.priority]} text-xs shrink-0`}>{card.priority}</Badge>
                      </div>
                      <p className="text-sm font-semibold leading-snug">{card.name}</p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {card.project !== "—" && (
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            {card.project}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 shrink-0" /> {card.pic}
                        </div>
                        <div className={`flex items-center gap-1 ${card.dueDate <= "2026-05-12" && card.column !== "Done" ? "text-red-600 font-semibold" : ""}`}>
                          {card.dueDate <= "2026-05-12" && card.column !== "Done" && <AlertCircle className="h-3 w-3 shrink-0" />}
                          <Calendar className="h-3 w-3 shrink-0" /> {card.dueDate}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
