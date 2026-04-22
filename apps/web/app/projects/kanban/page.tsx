"use client"

import { useState, useEffect } from "react"
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
import { ProjectKanbanBoard } from "@/components/project-kanban-board"
import { Plus, LayoutGrid, ClipboardList } from "lucide-react"
import Link from "next/link"
import type { Project } from "@/components/project-kanban-card"

const profile = {
  user: {
    name: "User",
    email: "user@wit.id",
    avatar: "/avatars/user.jpg",
  },
}

export default function ProjectsKanbanPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/projects?limit=200&offset=0`)
      const result = await response.json()

      if (response.ok) {
        setProjects(result.data || [])
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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 w-full bg-white dark:bg-zinc-800 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 px-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">
                    Dashboard
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Project Kanban</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/project-briefs/new">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                New Project
              </Button>
            </Link>
            <NavUser user={profile.user} />
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-4" >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Project Kanban Board</h1>
              <p className="text-muted-foreground">
                Manage projects lifecycle — drag &amp; drop to change status
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-400" /> Planning
              <span className="inline-block w-3 h-3 rounded-full bg-green-400" /> Active
              <span className="inline-block w-3 h-3 rounded-full bg-orange-400" /> On Hold
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" /> Completed
              <span className="inline-block w-3 h-3 rounded-full bg-zinc-400" /> Cancelled
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
              Loading projects…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-[60vh] text-red-600">
              {error}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-muted-foreground">
              <ClipboardList className="w-12 h-12" />
              <p>No projects found. Create your first project! 🚀</p>
              <Link href="/project-briefs/new">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  New Project
                </Button>
              </Link>
            </div>
          ) : (
            <ProjectKanbanBoard initialProjects={projects} />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
