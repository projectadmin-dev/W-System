"use client"

import { useMemo } from "react"
import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  ClipboardList,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Plus,
} from "lucide-react"
import { ProjectKanbanCard, type Project } from "./project-kanban-card"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"

interface ProjectKanbanColumnProps {
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled"
  projects: Project[]
}

export const STATUS_CONFIG: Record<
  string,
  {
    label: string
    icon: typeof ClipboardList
    color: string
    border: string
    bg: string
  }
> = {
  planning: {
    label: "Planning",
    icon: ClipboardList,
    color: "text-blue-600 border-blue-300",
    border: "border-slate-200",
    bg: "bg-blue-50/50",
  },
  active: {
    label: "Active",
    icon: Play,
    color: "text-green-600 border-green-300",
    border: "border-slate-200",
    bg: "bg-green-50/50",
  },
  on_hold: {
    label: "On Hold",
    icon: Pause,
    color: "text-orange-600 border-orange-300",
    border: "border-slate-200",
    bg: "bg-orange-50/50",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    color: "text-emerald-600 border-emerald-300",
    border: "border-slate-200",
    bg: "bg-emerald-50/50",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-zinc-500 border-zinc-300",
    border: "border-slate-200",
    bg: "bg-zinc-50/50",
  },
}

export function ProjectKanbanColumn({
  status,
  projects,
}: ProjectKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  const sortedProjects = useMemo(() => {
    return [...projects].sort(
      (a, b) => (b.budget_amount || 0) - (a.budget_amount || 0)
    )
  }, [projects])

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full rounded-lg border ${config.bg} ${
        isOver ? "ring-2 ring-blue-400 border-blue-400" : "bg-[#F1EFEC]"
      }`}
    >
      <div
        className={`flex items-center justify-between px-3 py-2 border-b rounded-t-lg ${config.color}`}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="text-sm font-semibold uppercase tracking-wide">
            {config.label}
          </span>
        </div>
        <span className="text-xs font-bold bg-white/80 px-2 py-0.5 rounded-full text-emerald-700 border border-emerald-200"
        >
          {projects.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
        <SortableContext
          items={projects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedProjects.map((project) => (
            <ProjectKanbanCard key={project.id} project={project} />
          ))}
        </SortableContext>
        {projects.length === 0 && (
          <div className="text-center py-6 text-xs text-muted-foreground italic"
          >
            No projects in this stage
          </div>
        )}
      </div>

      <div className="p-2 border-t border-slate-200">
        <Link href="/project-briefs/new">
          <Button variant="ghost" size="sm" className="w-full text-xs">
            <Plus className="w-3 h-3 mr-1" />
            New Project
          </Button>
        </Link>
      </div>
    </div>
  )
}
