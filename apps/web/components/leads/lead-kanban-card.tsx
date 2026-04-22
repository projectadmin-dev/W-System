/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Flame, AlertCircle, Clock, Hash, Phone } from "lucide-react"
import Link from "next/link"

export interface Lead {
  id: string
  name: string
  company_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  stage: "cold" | "warm" | "hot" | "deal"
  total_score: number
  sla_deadline_at: string
  sla_breached: boolean
  source: string
  marketing_pic?: {
    id: string
    full_name: string
    email: string
  } | null
  commercial_pic?: {
    id: string
    full_name: string
    email: string
  } | null
}

interface LeadKanbanCardProps {
  lead: Lead
}

export function LeadKanbanCard({ lead }: LeadKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600 bg-green-50 border-green-200"
    if (score >= 50) return "text-orange-600 bg-orange-50 border-orange-200"
    return "text-blue-600 bg-blue-50 border-blue-200"
  }

  const getScoreLabel = (score: number) => {
    if (score >= 75) return "HOT"
    if (score >= 50) return "WARM"
    return "COLD"
  }

  const slaInfo = () => {
    if (lead.sla_breached) {
      return { icon: AlertCircle, color: "text-red-500", text: "OVERDUE" }
    }
    const hoursLeft = Math.max(
      0,
      (new Date(lead.sla_deadline_at).getTime() - Date.now()) / (1000 * 60 * 60)
    )
    if (hoursLeft < 24) {
      return { icon: Flame, color: "text-orange-500", text: `${Math.ceil(hoursLeft)}h` }
    }
    return { icon: Clock, color: "text-zinc-500", text: `${Math.floor(hoursLeft / 24)}d` }
  }

  const sla = slaInfo()
  const SlaIcon = sla.icon

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Link href={`/leads/${lead.id}`} className="block">
        <Card
          className={`cursor-grab hover:shadow-md transition-shadow border-l-4 ${
            lead.stage === "deal"
              ? "border-l-green-500"
              : lead.stage === "hot"
              ? "border-l-red-500"
              : lead.stage === "warm"
              ? "border-l-orange-500"
              : lead.total_score >= 70
              ? "border-l-red-400"
              : lead.total_score >= 50
              ? "border-l-orange-400"
              : "border-l-blue-400"
          }`}
        >
          <CardContent className="p-3 space-y-2">
            {/* Top row: Name & Score */}
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-semibold leading-tight line-clamp-2">
                {lead.name}
              </h4>
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 shrink-0 ${getScoreColor(
                  lead.total_score
                )}`}
              >
                {lead.total_score}
              </Badge>
            </div>

            {/* Company */}
            {lead.company_name && (
              <p className="text-xs text-muted-foreground">{lead.company_name}</p>
            )}

            {/* Bottom row: Info */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100">
              <div className="flex items-center gap-2 text-muted-foreground">
                {lead.contact_phone && (
                  <span className="flex items-center gap-0.5">
                    <Phone className="w-3 h-3" />
                  </span>
                )}
                {/* PIC Initials */}
                <span className="font-medium">
                  {lead.marketing_pic?.full_name
                    ? lead.marketing_pic.full_name
                        .split(" ")
                        .map((w: string) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()
                    : "?"}
                </span>
                {lead.commercial_pic?.full_name && (
                  <span className="opacity-50">
                    {lead.commercial_pic.full_name
                      .split(" ")
                      .map((w: string) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                )}
              </div>
              <div className={`flex items-center gap-0.5 ${sla.color}`}>
                <SlaIcon className="w-3 h-3" />
                <span>{sla.text}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
