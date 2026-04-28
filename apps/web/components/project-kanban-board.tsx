"use client"

import { useState, useCallback, useMemo, useRef } from "react"
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { ProjectKanbanColumn, type Project } from "./project-kanban-column"

export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled"

interface ProjectKanbanBoardProps {
  initialProjects: Project[]
}

const VALID_STATUSES: ProjectStatus[] = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
]

export function ProjectKanbanBoard({
  initialProjects,
}: ProjectKanbanBoardProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [error, setError] = useState<string | null>(null)
  const previousProjectsRef = useRef<Project[]>(initialProjects)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const statusProjects = useMemo(() => {
    const byStatus: Record<string, Project[]> = {}
    VALID_STATUSES.forEach((s) => (byStatus[s] = []))
    projects.forEach((p) => {
      if (byStatus[p.status]) byStatus[p.status].push(p)
    })
    return byStatus as Record<ProjectStatus, Project[]>
  }, [projects])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return

      const projectId = active.id as string
      const targetStatus = over.id as ProjectStatus

      if (targetStatus === projectId) return
      if (!VALID_STATUSES.includes(targetStatus)) return

      const projectIndex = projects.findIndex((p) => p.id === projectId)
      if (projectIndex === -1) return

      const project = projects[projectIndex]
      if (project.status === targetStatus) return

      // Capture snapshot BEFORE mutation for revert
      const previousProjects = [...projects]
      previousProjectsRef.current = previousProjects

      const updated = [...projects]
      updated[projectIndex] = { ...project, status: targetStatus }
      setProjects(updated)
      setError(null)

      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: targetStatus }),
        })

        if (!res.ok) {
          const detail = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
          throw new Error(detail.error || `HTTP ${res.status}`)
        }
      } catch (err: any) {
        setError(err.message || "Failed to update project status. Reverting…")
        // Revert using ref snapshot — not closure `projects`
        setProjects(previousProjectsRef.current)
        console.error(err)
      }
    },
    [projects]
  )

  return (
    <div className="flex flex-col h-full">
      {error && (
        <div className="mb-3 px-4 py-2 bg-red-50 text-red-700 text-sm rounded-md border border-red-200"
        >
          {error}
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 h-[calc(100vh-220px)]"
        >
          <ProjectKanbanColumn status="planning" projects={statusProjects.planning} />
          <ProjectKanbanColumn status="active" projects={statusProjects.active} />
          <ProjectKanbanColumn status="on_hold" projects={statusProjects.on_hold} />
          <ProjectKanbanColumn status="completed" projects={statusProjects.completed} />
          <ProjectKanbanColumn status="cancelled" projects={statusProjects.cancelled} />
        </div>
      </DndContext>
    </div>
  )
}
