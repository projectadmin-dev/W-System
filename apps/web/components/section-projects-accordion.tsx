"use client"

import { useState, useEffect } from "react"
import { ChevronDown, ChevronRight, LayoutGrid, Users, Building2, Calendar, AlertCircle } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/collapsible"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import Link from "next/link"

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  on_hold: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelled: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
}

interface Task {
  id: number
  task_name: string
  status: string
  priority: string
  assignee?: { full_name: string }
}

interface Project {
  id: number
  project_code: string
  project_name: string
  status: string
  budget_amount: number
  start_date: string | null
  end_date: string | null
  client?: { name: string }
  pm?: { full_name: string }
  tasks?: Task[]
}

interface SectionProjectsAccordionProps {
  maxItems?: number // limit number of projects shown
}

export function SectionProjectsAccordion({ maxItems = 10 }: SectionProjectsAccordionProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/projects?limit=200&offset=0")
      const result = await response.json()
      if (response.ok) {
        // Fetch tasks for each project
        const projectsWithTasks = await Promise.all(
          (result.data || []).slice(0, maxItems).map(async (project: Project) => {
            try {
              const taskRes = await fetch(`/api/projects/${project.id}/tasks`)
              if (taskRes.ok) {
                const taskData = await taskRes.json()
                return { ...project, tasks: taskData.data || [] }
              }
            } catch {
              // ignore task fetch errors
            }
            return { ...project, tasks: [] }
          })
        )
        setProjects(projectsWithTasks)
      } else {
        setError(result.error || "Failed to fetch projects")
      }
    } catch (err) {
      setError("Network error. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleItem = (id: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const formatCurrency = (amount: number) => {
    if (!amount) return "-"
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const isOverdue = (endDate: string | null, status: string) => {
    if (!endDate || status === "completed") return false
    return new Date(endDate) < new Date()
  }

  const getTaskStats = (tasks: Task[]) => {
    const todo = tasks.filter((t) => t.status === "todo" || t.status === "backlog").length
    const inProgress = tasks.filter((t) => t.status === "in_progress").length
    const done = tasks.filter((t) => t.status === "done" || t.status === "completed").length
    return { todo, inProgress, done, total: tasks.length }
  }

  if (loading) {
    return (
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          Loading projects...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-center h-32 text-red-600">
          {error}
        </div>
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <div className="flex flex-col items-center justify-center h-32 gap-3 text-muted-foreground">
          <LayoutGrid className="w-8 h-8" />
          <p className="text-sm">No active projects</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Projects</h2>
          <p className="text-sm text-muted-foreground">
            {projects.length} projects — click to expand details
          </p>
        </div>
        <Link href="/projects">
          <Button variant="outline" size="sm">
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        {projects.map((project) => {
          const isOpen = openItems.has(project.id)
          const taskStats = getTaskStats(project.tasks || [])
          const overdue = isOverdue(project.end_date, project.status)

          return (
            <Collapsible
              key={project.id}
              open={isOpen}
              onOpenChange={() => toggleItem(project.id)}
            >
              {/* Accordion Header */}
              <CollapsibleTrigger asChild>
                <button
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-lg border
                    text-left transition-all duration-200
                    hover:bg-muted/50 hover:shadow-sm
                    ${isOpen
                      ? "bg-muted/30 border-primary/30 shadow-sm"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                    }
                  `}
                >
                  {/* Expand/Collapse Icon */}
                  <div className="flex-shrink-0">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 text-primary" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Project Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">
                        {project.project_code}
                      </span>
                      <span className="font-semibold text-sm truncate">
                        {project.project_name}
                      </span>
                      {overdue && (
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {project.client?.name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {project.client.name}
                        </span>
                      )}
                      {project.pm?.full_name && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {project.pm.full_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(project.start_date)} — {formatDate(project.end_date)}
                      </span>
                    </div>
                  </div>

                  {/* Task Summary Badges */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {taskStats.total > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {taskStats.done}/{taskStats.total} tasks
                        </span>
                        <div className="flex gap-1">
                          {taskStats.inProgress > 0 && (
                            <span className="w-2 h-2 rounded-full bg-yellow-400" title="In Progress" />
                          )}
                          {taskStats.done === taskStats.total && taskStats.total > 0 && (
                            <span className="w-2 h-2 rounded-full bg-green-400" title="All Done" />
                          )}
                        </div>
                      </>
                    )}
                    <Badge className={`${STATUS_COLORS[project.status] || "bg-gray-100"} text-[10px] px-1.5 py-0`}>
                      <span className="capitalize">{project.status.replace("_", " ")}</span>
                    </Badge>
                  </div>
                </button>
              </CollapsibleTrigger>

              {/* Accordion Content */}
              <CollapsibleContent>
                <div className="mt-2 ml-7 p-4 rounded-lg border border-primary/20 bg-muted/20 dark:bg-zinc-900/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Project Details */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                        Details
                      </h4>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Budget</span>
                          <span className="font-medium font-mono">
                            {formatCurrency(project.budget_amount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Start</span>
                          <span>{formatDate(project.start_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">End</span>
                          <span className={overdue ? "text-red-600 font-medium" : ""}>
                            {formatDate(project.end_date)}
                            {overdue && " ⚠️"}
                          </span>
                        </div>
                      </div>
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="outline" size="sm" className="w-full mt-2">
                          View Project
                        </Button>
                      </Link>
                    </div>

                    {/* Task Overview */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                        Tasks Overview
                      </h4>
                      {taskStats.total === 0 ? (
                        <p className="text-xs text-muted-foreground">No tasks found</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all duration-500"
                                style={{ width: `${(taskStats.done / taskStats.total) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">
                              {Math.round((taskStats.done / taskStats.total) * 100)}%
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 rounded bg-zinc-100 dark:bg-zinc-800">
                              <p className="text-lg font-bold">{taskStats.todo}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">To Do</p>
                            </div>
                            <div className="p-2 rounded bg-yellow-50 dark:bg-yellow-900/20">
                              <p className="text-lg font-bold">{taskStats.inProgress}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">Progress</p>
                            </div>
                            <div className="p-2 rounded bg-green-50 dark:bg-green-900/20">
                              <p className="text-lg font-bold">{taskStats.done}</p>
                              <p className="text-[10px] text-muted-foreground uppercase">Done</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <Link href={`/projects/${project.id}/kanban`}>
                        <Button variant="outline" size="sm" className="w-full mt-2">
                          <LayoutGrid className="w-3 h-3 mr-1" />
                          Open Kanban
                        </Button>
                      </Link>
                    </div>

                    {/* Recent Tasks List */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                        Recent Tasks
                      </h4>
                      {project.tasks && project.tasks.length > 0 ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {project.tasks.slice(0, 5).map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center gap-2 p-2 rounded bg-white dark:bg-zinc-800 text-xs"
                            >
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                task.status === "done" || task.status === "completed"
                                  ? "bg-green-400"
                                  : task.status === "in_progress"
                                  ? "bg-yellow-400"
                                  : "bg-zinc-300"
                              }`} />
                              <span className="flex-1 truncate">{task.task_name}</span>
                              <Badge className={`${PRIORITY_COLORS[task.priority] || "bg-zinc-100"} text-[9px] px-1 py-0`}>
                                {task.priority}
                              </Badge>
                            </div>
                          ))}
                          {project.tasks.length > 5 && (
                            <p className="text-[10px] text-center text-muted-foreground">
                              +{project.tasks.length - 5} more tasks
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No tasks</p>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </div>

      {projects.length >= maxItems && (
        <div className="mt-3 text-center">
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              View all {projects.length}+ projects
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
