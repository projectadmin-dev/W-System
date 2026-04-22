"use client"

import { useState, useCallback, useMemo } from "react"
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { KanbanColumn, type Lead } from "./kanban-column"

export type Stage = "cold" | "warm" | "hot" | "deal"

interface KanbanBoardProps {
  initialLeads: Lead[]
}

export function KanbanBoard({ initialLeads }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const stageLeads = useMemo(() => {
    return {
      cold: leads.filter((l) => l.stage === "cold"),
      warm: leads.filter((l) => l.stage === "warm"),
      hot: leads.filter((l) => l.stage === "hot"),
      deal: leads.filter((l) => l.stage === "deal"),
    }
  }, [leads])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return

      const leadId = active.id as string
      const targetStage = over.id as Stage

      if (targetStage === leadId) return // dropped on itself

      // Find the lead being moved
      const leadIndex = leads.findIndex((l) => l.id === leadId)
      if (leadIndex === -1) return

      const lead = leads[leadIndex]
      if (lead.stage === targetStage) return

      const newStage = targetStage as Stage

      // Optimistic update
      const updated = [...leads]
      updated[leadIndex] = { ...lead, stage: newStage }
      setLeads(updated)
      setError(null)

      // Call API to persist
      try {
        const res = await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: newStage }),
        })

        if (!res.ok) {
          throw new Error(`Failed to move lead: ${res.status}`)
        }

        // Optionally: show toast success
      } catch (err: any) {
        setError("Failed to update lead stage. Reverting…")
        // Revert optimistic update
        setLeads(leads)
        console.error(err)
      }
    },
    [leads]
  )

  return (
    <div className="flex flex-col h-full">
      {error && (
        <div className="mb-3 px-4 py-2 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
          {error}
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-[calc(100vh-220px)]">
          <KanbanColumn stage="cold" leads={stageLeads.cold} />
          <KanbanColumn stage="warm" leads={stageLeads.warm} />
          <KanbanColumn stage="hot" leads={stageLeads.hot} />
          <KanbanColumn stage="deal" leads={stageLeads.deal} />
        </div>
      </DndContext>
    </div>
  )
}
