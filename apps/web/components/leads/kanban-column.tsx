"use client"

import { useMemo } from "react"
import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Flame, Snowflake, Sun, CheckCircle, Plus } from "lucide-react"
import { LeadKanbanCard, type Lead } from "./lead-kanban-card"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"

interface KanbanColumnProps {
  stage: "cold" | "warm" | "hot" | "deal"
  leads: Lead[]
}

export const STAGE_CONFIG: Record<
  string,
  { label: string; icon: typeof Snowflake; color: string; bg: string }
> = {
  cold: {
    label: "Cold",
    icon: Snowflake,
    color: "text-blue-600 border-blue-300",
    bg: "bg-blue-50/60",
  },
  warm: {
    label: "Warm",
    icon: Sun,
    color: "text-orange-600 border-orange-300",
    bg: "bg-orange-50/60",
  },
  hot: {
    label: "Hot",
    icon: Flame,
    color: "text-red-600 border-red-300",
    bg: "bg-red-50/60",
  },
  deal: {
    label: "Deal",
    icon: CheckCircle,
    color: "text-green-600 border-green-300",
    bg: "bg-green-50/60",
  },
}

export function KanbanColumn({ stage, leads }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  const config = STAGE_CONFIG[stage]
  const Icon = config.icon

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
  }, [leads])

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full rounded-lg border ${config.bg} ${
        isOver ? "ring-2 ring-blue-400 border-blue-400" : "bg-[#F1EFEC]"
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b rounded-t-lg ${config.color} border-slate-200`}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="text-sm font-semibold uppercase tracking-wide">
            {config.label}
          </span>
        </div>
        <span className="text-xs font-bold bg-white/80 px-2 py-0.5 rounded-full text-emerald-700 border border-emerald-200">
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedLeads.map((lead) => (
            <LeadKanbanCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="text-center py-6 text-xs text-muted-foreground italic">
            No leads in this stage
          </div>
        )}
      </div>

      {/* Footer: Add link */}
      <div className="p-2 border-t border-slate-200">
        <Link href={`/leads/new?stage=${stage}`}>
          <Button variant="ghost" size="sm" className="w-full text-xs">
            <Plus className="w-3 h-3 mr-1" />
            Add Lead
          </Button>
        </Link>
      </div>
    </div>
  )
}
