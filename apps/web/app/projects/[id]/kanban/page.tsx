"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { NavUser } from "@/components/nav-user"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  LayoutGrid,
  ArrowLeft,
  Plus,
  GripVertical,
  Calendar,
  Users,
  MoreHorizontal,
  X,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

const profile = { user: { name: "User", email: "user@wit.id", avatar: "/avatars/user.jpg" } }

export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done"

const COLUMNS: { id: TaskStatus; label: string; color: string; icon: typeof Circle }[] = [
  { id: "backlog", label: "Backlog", color: "bg-zinc-100 border-zinc-300", icon: Circle },
  { id: "todo", label: "Todo", color: "bg-slate-100 border-slate-300", icon: Circle },
  { id: "in_progress", label: "In Progress", color: "bg-blue-100 border-blue-300", icon: Clock },
  { id: "in_review", label: "In Review", color: "bg-amber-100 border-amber-300", icon: AlertCircle },
  { id: "done", label: "Done", color: "bg-green-100 border-green-300", icon: CheckCircle2 },
]

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
}

interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: string
  position: number
  assignee_id: string | null
  assignee?: { full_name: string } | null
  due_date: string | null
  started_at: string | null
  completed_at: string | null
  created_by: string
}

export default function ProjectKanbanPage() {
  const { id } = useParams()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectName, setProjectName] = useState("")
  const [showAddTask, setShowAddTask] = useState<TaskStatus | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [savingTask, setSavingTask] = useState(false)
  const [dragError, setDragError] = useState<string | null>(null)
  const previousTasksRef = useRef<Task[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    fetchTasks()
    fetchProject()
  }, [id])

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`)
      if (res.ok) {
        const data = await res.json()
        setProjectName(data.project_name || "Project")
      }
    } catch {}
  }

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${id}/tasks`)
      const result = await res.json()
      if (res.ok) {
        setTasks(result.data || [])
      } else {
        setError(result.error || "Failed to load tasks")
      }
    } catch (err) {
      setError("Network error")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over) return

      const taskId = active.id as string
      const overId = over.id as string

      // Determine target column
      let targetStatus: TaskStatus | null = null
      if (COLUMNS.some((c) => c.id === overId)) {
        targetStatus = overId as TaskStatus
      } else {
        // Dropped on another task — find its column
        const overTask = tasks.find((t) => t.id === overId)
        if (overTask) targetStatus = overTask.status
      }

      if (!targetStatus) return

      const task = tasks.find((t) => t.id === taskId)
      if (!task || task.status === targetStatus) return

      // Optimistic update
      const previousTasks = [...tasks]
      previousTasksRef.current = previousTasks

      const updated = tasks.map((t) =>
        t.id === taskId ? { ...t, status: targetStatus! } : t
      )
      setTasks(updated)
      setDragError(null)

      try {
        const res = await fetch(`/api/projects/${id}/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: targetStatus }),
        })
        if (!res.ok) {
          const detail = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
          throw new Error(detail.error || "Failed to update")
        }
      } catch (err: any) {
        setDragError(err.message || "Failed to update task")
        setTasks(previousTasksRef.current)
      }
    },
    [tasks, id]
  )

  const addTask = async (status: TaskStatus) => {
    if (!newTaskTitle.trim()) return
    setSavingTask(true)
    try {
      const res = await fetch(`/api/projects/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          status,
          priority: "medium",
          position: tasks.filter((t) => t.status === status).length + 1,
        }),
      })
      if (res.ok) {
        const result = await res.json()
        setTasks((prev) => [...prev, result.data])
        setNewTaskTitle("")
        setShowAddTask(null)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingTask(false)
    }
  }

  const tasksByStatus = (status: TaskStatus) =>
    tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position)

  const formatDue = (date: string | null) => {
    if (!date) return null
    const d = new Date(date)
    const now = new Date()
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return { text: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }), overdue: diff < 0, urgent: diff >= 0 && diff <= 2 }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 w-full bg-white dark:bg-zinc-800 shrink-0 items-center justify-between gap-2 px-4 border-b">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{projectName}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/projects/${id}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Detail
              </Button>
            </Link>
            <NavUser user={profile.user} />
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                <LayoutGrid className="inline w-5 h-5 mr-2 text-blue-600" />
                {projectName} — Kanban
              </h1>
              <p className="text-muted-foreground text-sm">
                Drag tasks between columns to update status
              </p>
            </div>
          </div>

          {/* Drag Error Banner */}
          {dragError && (
            <div className="px-4 py-2 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
              {dragError} — Position reverted.
            </div>
          )}

          {/* Kanban Board */}
          {loading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Loading tasks…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-600">{error}</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
                {COLUMNS.map((col) => (
                  <div key={col.id} className="flex flex-col">
                    {/* Column Header */}
                    <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border-b ${col.color.split(" ")[0]} border ${col.color.split(" ")[1]}`}>
                      <div className="flex items-center gap-2">
                        <col.icon className="w-4 h-4" />
                        <span className="text-sm font-semibold">{col.label}</span>
                      </div>
                      <span className="text-xs font-bold bg-white/70 px-2 py-0.5 rounded-full">
                        {tasksByStatus(col.id).length}
                      </span>
                    </div>

                    {/* Column Body */}
                    <div className={`flex-1 p-2 space-y-2 rounded-b-lg border min-h-[120px] ${col.color}`}>
                      <SortableContext
                        items={tasksByStatus(col.id).map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {tasksByStatus(col.id).map((task) => (
                          <TaskCard key={task.id} task={task} formatDue={formatDue} />
                        ))}
                      </SortableContext>

                      {tasksByStatus(col.id).length === 0 && (
                        <div className="text-center py-4 text-xs text-muted-foreground italic">
                          No tasks
                        </div>
                      )}

                      {/* Add Task */}
                      {showAddTask === col.id ? (
                        <div className="space-y-2 p-2 bg-white rounded-lg border shadow-sm">
                          <input
                            autoFocus
                            className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            placeholder="Task title…"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addTask(col.id)
                              if (e.key === "Escape") { setShowAddTask(null); setNewTaskTitle("") }
                            }}
                          />
                          <div className="flex gap-1">
                            <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => addTask(col.id)} disabled={savingTask}>
                              {savingTask ? "…" : "Add"}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setShowAddTask(null); setNewTaskTitle("") }}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAddTask(col.id)}
                          className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-muted-foreground hover:bg-white/50 rounded border border-dashed border-transparent hover:border-gray-300 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add task
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </DndContext>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// Task Card Component
function TaskCard({ task, formatDue }: { task: Task; formatDue: (d: string | null) => { text: string; overdue: boolean; urgent: boolean } | null }) {
  const due = formatDue(task.due_date)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, transition, opacity: isDragging ? 0.5 : 1 }
    : {}

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group bg-white rounded-lg border shadow-sm p-2.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-medium text-sm leading-tight">{task.title}</span>
        <GripVertical className="w-3 h-3 text-gray-300 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100" />
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mt-2 gap-1">
        <Badge className={`${PRIORITY_COLORS[task.priority]} text-[10px] px-1.5 py-0`}>
          {task.priority}
        </Badge>

        {due && (
          <span className={`text-[10px] flex items-center gap-0.5 ${due.overdue ? "text-red-600 font-medium" : due.urgent ? "text-orange-600 font-medium" : "text-muted-foreground"}`}>
            <Calendar className="w-2.5 h-2.5" />
            {due.text}
          </span>
        )}
      </div>
    </div>
  )
}
