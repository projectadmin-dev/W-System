"use client"

import { useState, useEffect } from 'react'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
import { Plus, Search, Filter, TrendingUp, Clock, AlertCircle } from "lucide-react"
import Link from "next/link"

interface Lead {
  id: string
  name: string
  company_name: string
  contact_email: string
  contact_phone: string
  stage: 'cold' | 'warm' | 'hot' | 'deal'
  total_score: number
  sla_deadline_at: string
  sla_breached: boolean
  source: string
  budget_disclosed: string
  authority_level: string
  timeline: string
  marketing_pic_id: string
  commercial_pic_id: string
  created_at: string
  updated_at: string
  client?: {
    id: string
    name: string
    code: string
  }
  marketing_pic?: {
    id: string
    full_name: string
    email: string
  }
  commercial_pic?: {
    id: string
    full_name: string
    email: string
  }
}

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

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLeads()
  }, [stageFilter])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        limit: '50',
        offset: '0'
      })
      
      if (stageFilter !== 'all') {
        params.append('stage', stageFilter)
      }
      
      const response = await fetch(`/api/leads?${params.toString()}`)
      const result = await response.json()
      
      if (response.ok) {
        setLeads(result.data || [])
        setPagination(result.pagination)
      } else {
        setError(result.error || 'Failed to fetch leads')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      cold: 'bg-blue-100 text-blue-800 border-blue-300',
      warm: 'bg-orange-100 text-orange-800 border-orange-300',
      hot: 'bg-red-100 text-red-800 border-red-300',
      deal: 'bg-green-100 text-green-800 border-green-300'
    }
    return colors[stage] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600 font-bold'
    if (score >= 50) return 'text-orange-600 font-semibold'
    return 'text-blue-600'
  }

  const getSLAStatus = (deadline: string, breached: boolean) => {
    if (breached) {
      return { icon: AlertCircle, color: 'text-red-600', label: 'Breached' }
    }
    
    const hoursLeft = (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60)
    if (hoursLeft < 24) {
      return { icon: AlertCircle, color: 'text-orange-600', label: `< 24h` }
    }
    return { icon: Clock, color: 'text-green-600', label: `${Math.floor(hoursLeft / 24)}d left` }
  }

  const filteredLeads = leads.filter(lead => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      lead.name.toLowerCase().includes(query) ||
      lead.company_name?.toLowerCase().includes(query) ||
      lead.contact_email?.toLowerCase().includes(query) ||
      lead.client?.name.toLowerCase().includes(query)
    )
  })

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
                  <BreadcrumbPage>Leads Pipeline</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <NavUser user={profile.user} />
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              
              {/* Header Section */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Leads Pipeline Management</h1>
                  <p className="text-muted-foreground">
                    Manage and track leads through the sales pipeline
                  </p>
                </div>
                <Link href="/leads/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Lead
                  </Button>
                </Link>
              </div>

              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{leads.length}</div>
                    <p className="text-xs text-muted-foreground">
                      All active leads
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
                    <TrendingUp className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {leads.filter(l => l.stage === 'hot').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ready for project brief
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Warm Leads</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {leads.filter(l => l.stage === 'warm').length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      In nurturing phase
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">SLA At Risk</CardTitle>
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {leads.filter(l => !l.sla_breached && 
                        (new Date(l.sla_deadline_at).getTime() - Date.now()) < (24 * 60 * 60 * 1000)
                      ).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Due within 24 hours
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, company, email..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="w-full md:w-48">
                      <Select value={stageFilter} onValueChange={setStageFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by stage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Stages</SelectItem>
                          <SelectItem value="cold">Cold</SelectItem>
                          <SelectItem value="warm">Warm</SelectItem>
                          <SelectItem value="hot">Hot</SelectItem>
                          <SelectItem value="deal">Deal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leads Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Leads List</CardTitle>
                  <CardDescription>
                    {filteredLeads.length} leads found
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading leads...
                    </div>
                  ) : error ? (
                    <div className="text-center py-8 text-red-600">
                      {error}
                    </div>
                  ) : filteredLeads.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No leads found. Create your first lead!
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lead Name</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Stage</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>SLA Status</TableHead>
                            <TableHead>Marketing PIC</TableHead>
                            <TableHead>Commercial PIC</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredLeads.map((lead) => {
                            const slaStatus = getSLAStatus(lead.sla_deadline_at, lead.sla_breached)
                            const SLAIcon = slaStatus.icon
                            
                            return (
                              <TableRow key={lead.id}>
                                <TableCell className="font-medium">
                                  <Link 
                                    href={`/leads/${lead.id}`}
                                    className="hover:underline text-primary"
                                  >
                                    {lead.name}
                                  </Link>
                                  {lead.contact_email && (
                                    <div className="text-xs text-muted-foreground">
                                      {lead.contact_email}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {lead.company_name || lead.client?.name || '-'}
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant="outline" 
                                    className={getStageColor(lead.stage)}
                                  >
                                    {lead.stage.toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <span className={getScoreColor(lead.total_score || 0)}>
                                    {lead.total_score || 0}/100
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">
                                    {lead.source}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className={`flex items-center gap-1 ${slaStatus.color}`}>
                                    <SLAIcon className="h-4 w-4" />
                                    <span className="text-sm">{slaStatus.label}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {lead.marketing_pic?.full_name || '-'}
                                </TableCell>
                                <TableCell>
                                  {lead.commercial_pic?.full_name || '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Link href={`/leads/${lead.id}`}>
                                    <Button variant="ghost" size="sm">
                                      View
                                    </Button>
                                  </Link>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
