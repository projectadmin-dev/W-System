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
import { Plus, Search, FileText, Eye, CheckCircle, XCircle, Clock } from "lucide-react"
import Link from "next/link"

interface Quotation {
  id: string
  quotation_number: string
  version: string
  title: string
  status: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  currency: string
  valid_until: string
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  created_at: string
  client?: { id: string; name: string; code: string } | null
  brief?: { id: string; title: string } | null
  commercial_pic?: { id: string; full_name: string; email: string } | null
}

const profile = {
  user: {
    name: "User",
    email: "user@wit.id",
    avatar: "/avatars/user.jpg",
  },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-zinc-100 text-zinc-800 border-zinc-300" },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-800 border-blue-300" },
  viewed: { label: "Viewed", color: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-800 border-green-300" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800 border-red-300" },
  expired: { label: "Expired", color: "bg-orange-100 text-orange-800 border-orange-300" },
  revised: { label: "Revised", color: "bg-purple-100 text-purple-800 border-purple-300" },
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchQuotations()
  }, [statusFilter])

  const fetchQuotations = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ limit: "50", offset: "0" })
      if (statusFilter !== "all") params.append("status", statusFilter)

      const response = await fetch(`/api/quotations?${params.toString()}`)
      const result = await response.json()
      if (response.ok) {
        setQuotations(result.data || [])
      } else {
        setError(result.error || "Failed to fetch quotations")
      }
    } catch (err) {
      setError("Network error. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "IDR") {
      return `Rp ${(amount / 1_000_000).toFixed(1)}jt`
    }
    return `${currency} ${amount.toLocaleString()}`
  }

  const getDaysLeft = (validUntil: string) => {
    const days = Math.ceil((new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days < 0) return `${Math.abs(days)}d overdue`
    return `${days}d left`
  }

  const filtered = quotations.filter((q) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      q.quotation_number.toLowerCase().includes(query) ||
      q.title.toLowerCase().includes(query) ||
      q.client?.name?.toLowerCase().includes(query)
    )
  })

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 w-full bg-white dark:bg-zinc-800 shrink-0 items-center justify-between gap-2 px-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Quotations</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/quotations/new">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                New Quotation
              </Button>
            </Link>
            <NavUser user={profile.user} />
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
                  <p className="text-muted-foreground">Manage proposals, versions, and client approvals</p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {[
                  { label: "Draft", key: "draft", icon: FileText, color: "text-zinc-600" },
                  { label: "Sent", key: "sent", icon: Eye, color: "text-blue-600" },
                  { label: "Viewed", key: "viewed", icon: Clock, color: "text-indigo-600" },
                  { label: "Accepted", key: "accepted", icon: CheckCircle, color: "text-green-600" },
                  { label: "Rejected", key: "rejected", icon: XCircle, color: "text-red-600" },
                ].map(({ label, key, icon: Icon, color }) => (
                  <Card key={key}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{label}</CardTitle>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {quotations.filter((q) => q.status === key).length}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Filters */}
              <Card>
                <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by number, title, client..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="w-full md:w-48">
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="viewed">Viewed</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="revised">Revised</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Quotation List</CardTitle>
                  <CardDescription>{filtered.length} quotations found</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading…</div>
                  ) : error ? (
                    <div className="text-center py-8 text-red-600">{error}</div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No quotations found. Create your first quotation!
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Number</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Valid Until</TableHead>
                            <TableHead>Commercial PIC</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((q) => {
                            const cfg = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft
                            return (
                              <TableRow key={q.id}>
                                <TableCell className="font-medium">
                                  <Link href={`/quotations/${q.id}`} className="hover:underline text-primary">
                                    {q.quotation_number}
                                  </Link>
                                  {q.version !== "v1.0" && (
                                    <Badge variant="outline" className="ml-1 text-[10px]">{q.version}</Badge>
                                  )}
                                </TableCell>
                                <TableCell>{q.title}</TableCell>
                                <TableCell>{q.client?.name || "-"}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(q.total_amount, q.currency)}
                                </TableCell>
                                <TableCell>
                                  <span className={q.valid_until && new Date(q.valid_until) < new Date() ? "text-red-600" : ""}>
                                    {q.valid_until ? getDaysLeft(q.valid_until) : "-"}
                                  </span>
                                </TableCell>
                                <TableCell>{q.commercial_pic?.full_name || "-"}</TableCell>
                                <TableCell className="text-right">
                                  <Link href={`/quotations/${q.id}`}>
                                    <Button variant="ghost" size="sm">View</Button>
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
