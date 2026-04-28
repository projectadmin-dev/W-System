"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  LayoutGrid,
  Plus,
  Calendar,
  Users,
  ChevronRight,
  Building2,
  Clock,
} from "lucide-react"
import Link from "next/link"

const profile = {
  user: {
    name: "User",
    email: "user@wit.id",
    avatar: "/avatars/user.jpg",
  },
}

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  on_hold: "bg-orange-100 text-orange-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-zinc-100 text-zinc-600",
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/projects?limit=200&offset=0")
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

  const filteredProjects = statusFilter === "all"
    ? projects
    : projects.filter((p) => p.status === statusFilter)

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

  const isOverdue = (endDate: string | null) => {
    if (!endDate) return false
    return new Date(endDate) < new Date()
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
                <BreadcrumbItem>
                  <BreadcrumbPage>Projects</BreadcrumbPage>
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

        <div className="p-4 md:p-6 space-y-4">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
              <p className="text-muted-foreground">
                Manage and track all your projects
              </p>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {["all", "planning", "active", "on_hold", "completed", "cancelled"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className="capitalize text-xs"
              >
                {status === "all" ? "All" : status.replace("_", " ")}
                {status !== "all" && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
                    {projects.filter((p) => p.status === status).length}
                  </span>
                )}
              </Button>
            ))}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total", key: "all", icon: LayoutGrid },
              { label: "Planning", key: "planning", icon: Clock },
              { label: "Active", key: "active", icon: LayoutGrid },
              { label: "On Hold", key: "on_hold", icon: Clock },
              { label: "Completed", key: "completed", icon: LayoutGrid },
            ].map(({ label, key, icon: Icon }) => (
              <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setStatusFilter(key === "all" ? "all" : key)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className="text-xl font-bold mt-0.5">
                        {key === "all" ? projects.length : projects.filter((p) => p.status === key).length}
                      </p>
                    </div>
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Projects Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Loading projects…
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-600">
              {error}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
              <LayoutGrid className="w-12 h-12" />
              <p>No projects found</p>
              <Link href="/project-briefs/new">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Create First Project
                </Button>
              </Link>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Project Code</TableHead>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>PM</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead>Timeline</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project.id} className="group">
                        <TableCell>
                          <span className="font-mono text-xs font-medium text-muted-foreground">
                            {project.project_code}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{project.project_name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            {project.client?.name || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            {project.pm?.full_name || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(project.budget_amount)}
                        </TableCell>
                        <TableCell>
                          <div className={`text-xs ${isOverdue(project.end_date) && project.status !== 'completed' ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                            {formatDate(project.start_date)} — {formatDate(project.end_date)}
                            {isOverdue(project.end_date) && project.status !== 'completed' && ' ⚠️'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[project.status] || "bg-gray-100"}>
                            <span className="capitalize">{project.status.replace("_", " ")}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/projects/${project.id}/kanban`}>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                <LayoutGrid className="w-3 h-3 mr-1" />
                                Kanban
                              </Button>
                            </Link>
                            <Link href={`/projects/${project.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                <ChevronRight className="w-3 h-3" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
