"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Calendar, User, Hash, AlertTriangle } from "lucide-react"
import Link from "next/link"

export interface Project {
  id: string
  project_name: string
  project_code: string
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled"
  budget_amount: number
  currency: string
  start_date?: string | null
  end_date?: string | null
  client?: {
    id: string
    name: string
    code: string
  } | null
  pm?: {
    id: string
    full_name: string
    email: string
  } | null
}

interface ProjectKanbanCardProps {
  project: Project
}

export function ProjectKanbanCard({ project }: ProjectKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const statusMap: Record<
    string,
    { color: string; border: string }
  > = {
    planning: { color: "text-blue-600", border: "border-l-blue-400" },
    active: { color: "text-green-600", border: "border-l-green-400" },
    on_hold: { color: "text-orange-600", border: "border-l-orange-400" },
    completed: { color: "text-emerald-600", border: "border-l-emerald-500" },
    cancelled: { color: "text-zinc-500", border: "border-l-zinc-400" },
  }

  const cfg = statusMap[project.status] || statusMap.planning
  const fmtDate = (d?: string | null) => {
    if (!d) return null
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    })
  }

  const isOverdue =
    project.end_date && new Date(project.end_date) < new Date() && project.status !== "completed"

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Link href={`/projects/${project.id}`} className="block">
        <Card
          className={`cursor-grab hover:shadow-md transition-shadow border-l-4 ${cfg.border}`}
        >
          <CardContent className="p-3 space-y-2">
            {/* Top row: Name & Code */}
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold leading-tight line-clamp-2">
                {project.project_name}
              </h4>
              {project.project_code && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 shrink-0 bg-slate-100 text-slate-600"
                >
                  <Hash className="w-3 h-3 mr-0.5" />
                  {project.project_code}
                </Badge>
              )}
            </div>

            {/* Client */}
            {project.client?.name && (
              <p className="text-xs text-muted-foreground">{project.client.name}</p>
            )}

            {/* Budget row */}
            {project.budget_amount > 0 && (
              <div className="text-xs font-medium text-emerald-700">
                {project.currency === "IDR"
                  ? `IDR ${(project.budget_amount / 1_000_000).toFixed(1)}jt`
                  : `${project.currency} ${project.budget_amount}`}
              </div>
            )}

            {/* Bottom row: PM + Dates */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <User className="w-3 h-3" />
                  {project.pm?.full_name
                    ? project.pm.full_name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "?"}
                </span>
                {project.start_date && (
                  <span className="flex items-center gap-0.5">
                    <Calendar className="w-3 h-3" />
                    {fmtDate(project.start_date)}
                  </span>
                )}
              </div>
              {isOverdue && (
                <div className="flex items-center gap-0.5 text-red-500">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Overdue</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
