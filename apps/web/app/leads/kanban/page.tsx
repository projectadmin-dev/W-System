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
import { KanbanBoard } from "@/components/leads/kanban-board"
import { Plus, LayoutGrid, List } from "lucide-react"
import Link from "next/link"
import type { Lead } from "@/components/leads/lead-kanban-card"

interface PaginationInfo {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

const profile = {
  user: {
    name: "User",
    email: "user@wit.id",
    avatar: "/avatars/user.jpg",
  },
}

export default function LeadsKanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/leads?limit=200&offset=0`)
      const result = await response.json()

      if (response.ok) {
        setLeads(result.data || [])
        setPagination(result.pagination)
      } else {
        setError(result.error || "Failed to fetch leads")
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
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/leads">
                    Leads
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Pipeline Board</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/leads">
              <Button variant="outline" size="sm">
                <List className="w-4 h-4 mr-1" />
                List View
              </Button>
            </Link>
            <Link href="/leads/new">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Lead
              </Button>
            </Link>
            <NavUser user={profile.user} />
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-4" style={{ maxHeight: "calc(100vh - 64px)" }} >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Leads Pipeline</h1>
              <p className="text-muted-foreground">
                Drag &amp; drop leads to move between stages
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className="inline-block w-3 h-3 rounded-full bg-blue-400" /> Cold
                <span className="inline-block w-3 h-3 rounded-full bg-orange-400" /> Warm
                <span className="inline-block w-3 h-3 rounded-full bg-red-500" /> Hot
                <span className="inline-block w-3 h-3 rounded-full bg-green-500" /> Deal
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
              Loading leads…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-[60vh] text-red-600">
              {error}
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-muted-foreground">
              <LayoutGrid className="w-12 h-12" />
              <p>No leads found. Create your first lead! 🎯</p>
              <Link href="/leads/new">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add New Lead
                </Button>
              </Link>
            </div>
          ) : (
            <KanbanBoard initialLeads={leads} />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
