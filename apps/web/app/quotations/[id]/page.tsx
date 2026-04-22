"use client"

import { useState, useEffect } from "react"
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/dialog"
import { Textarea } from "@workspace/ui/components/textarea"
import { Label } from "@workspace/ui/components/label"
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  RotateCcw,
  Printer,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react"
import Link from "next/link"

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface QuotationDetail {
  id: string
  quotation_number: string
  version: string
  title: string
  description: string | null
  status: string
  line_items: LineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_percent: number
  discount_amount: number
  total_amount: number
  currency: string
  payment_terms: string | null
  valid_until: string
  rejection_reason: string | null
  accepted_by: string | null
  accepted_by_title: string | null
  accepted_by_email: string | null
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  created_at: string
  client?: { id: string; name: string; code: string; contact_email: string | null; contact_phone: string | null } | null
  brief?: { id: string; title: string; estimated_revenue: number; estimated_cost: number } | null
  commercial_pic?: { id: string; full_name: string; email: string } | null
  created_by_user?: { id: string; full_name: string } | null
  parent?: { id: string; quotation_number: string; version: string } | null
}

const STATUS_FLOW: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["viewed", "rejected"],
  viewed: ["accepted", "rejected"],
  rejected: ["revised"],
  accepted: ["revised"],
  expired: ["revised"],
  revised: ["sent"],
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Send }> = {
  draft: { label: "Draft", color: "bg-zinc-100 text-zinc-800", icon: Pencil },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-800", icon: Send },
  viewed: { label: "Viewed", color: "bg-indigo-100 text-indigo-800", icon: CheckCircle },
  accepted: { label: "Accepted", color: "bg-green-100 text-green-800", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
  expired: { label: "Expired", color: "bg-orange-100 text-orange-800", icon: XCircle },
  revised: { label: "Revised", color: "bg-purple-100 text-purple-800", icon: RotateCcw },
}

const profile = { user: { name: "User", email: "user@wit.id", avatar: "/avatars/user.jpg" } }

export default function QuotationDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [showRejectDialog, setShowRejectDialog] = useState(false)

  useEffect(() => {
    if (id) fetchQuotation()
  }, [id])

  const fetchQuotation = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/quotations/${id}`)
      const data = await res.json()
      if (res.ok) {
        setQuotation(data)
      } else {
        setError(data.error || "Failed to fetch quotation")
      }
    } catch (err) {
      setError("Network error")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (newStatus: string, extra?: Record<string, any>) => {
    try {
      setActionLoading(true)
      const body: Record<string, any> = { status: newStatus, ...extra }
      const res = await fetch(`/api/quotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setQuotation(data)
        setShowRejectDialog(false)
        setRejectReason("")
      } else {
        setError(data.error || "Failed to update status")
      }
    } catch (err) {
      setError("Failed to update status")
    } finally {
      setActionLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "IDR") return `Rp ${(amount).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    return `${currency} ${amount.toLocaleString()}`
  }

  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"

  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading…</div>
  if (error || !quotation) return <div className="flex items-center justify-center h-screen text-red-600">{error || "Not found"}</div>

  const cfg = STATUS_CONFIG[quotation.status] || STATUS_CONFIG.draft
  const nextActions = STATUS_FLOW[quotation.status] || []

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
                <BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="/quotations">Quotations</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem><BreadcrumbPage>{quotation.quotation_number}</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/quotations"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
            <NavUser user={profile.user} />
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{quotation.title}</h1>
                <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                {quotation.version !== "v1.0" && (
                  <Badge variant="secondary">{quotation.version}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                #{quotation.quotation_number} · Created {fmtDate(quotation.created_at)} · by {quotation.created_by_user?.full_name || "-"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {<Button variant="outline" size="sm"><Printer className="w-4 h-4 mr-1" />Print</Button>}
              {<Button variant="outline" size="sm"><Copy className="w-4 h-4 mr-1" />Duplicate</Button>}
            </div>
          </div>

          {/* Workflow Actions */}
          {nextActions.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-muted-foreground mr-2">Actions:</span>
                  {nextActions.includes("sent") && (
                    <Button size="sm" onClick={() => updateStatus("sent")} disabled={actionLoading}>
                      <Send className="w-4 h-4 mr-1" /> Mark as Sent
                    </Button>
                  )}
                  {nextActions.includes("viewed") && (
                    <Button size="sm" variant="secondary" onClick={() => updateStatus("viewed")} disabled={actionLoading}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Mark Viewed
                    </Button>
                  )}
                  {nextActions.includes("accepted") && (
                    <Button size="sm" variant="default" onClick={() => updateStatus("accepted")} disabled={actionLoading}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Accept
                    </Button>
                  )}
                  {nextActions.includes("rejected") && (
                    <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="destructive" disabled={actionLoading}>
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject Quotation</DialogTitle>
                          <DialogDescription>Please provide a reason for rejection.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                          <Label>Reason</Label>
                          <Textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g., Price too high, scope unclear, etc."
                          />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
                          <Button
                            variant="destructive"
                            onClick={() => updateStatus("rejected", { rejection_reason: rejectReason })}
                            disabled={!rejectReason.trim() || actionLoading}
                          >
                            Confirm Reject
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                  {nextActions.includes("revised") && (
                    <Button size="sm" variant="outline" onClick={() => {
                      // Navigate to create new version with parent ref
                      router.push(`/quotations/new?parent=${quotation.id}`)
                    }} disabled={actionLoading}>
                      <RotateCcw className="w-4 h-4 mr-1" /> Create Revision
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="items">Line Items</TabsTrigger>
              <TabsTrigger value="client">Client &amp; Brief</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Financial Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(quotation.subtotal, quotation.currency)}</span></div>
                    <div className="flex justify-between"><span>Tax ({quotation.tax_rate}%)</span><span>{formatCurrency(quotation.tax_amount, quotation.currency)}</span></div>
                    {quotation.discount_percent > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount ({quotation.discount_percent}%)</span>
                        <span>-{formatCurrency(quotation.discount_amount, quotation.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total</span>
                      <span>{formatCurrency(quotation.total_amount, quotation.currency)}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Validity</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    <div className="flex justify-between"><span>Valid Until</span><span>{fmtDate(quotation.valid_until)}</span></div>
                    <div className="flex justify-between"><span>Payment Terms</span><span>{quotation.payment_terms || "-"}</span></div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Commercial PIC</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    <div>{quotation.commercial_pic?.full_name || "-"}</div>
                    <div className="text-sm text-muted-foreground">{quotation.commercial_pic?.email || "-"}</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="items">
              <Card>
                <CardHeader><CardTitle>Line Items</CardTitle></CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {(quotation.line_items || []).map((item: LineItem, i: number) => (
                      <div key={i} className="flex items-center justify-between py-3">
                        <div className="flex-1">
                          <div className="font-medium">{item.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.quantity} x {formatCurrency(item.unit_price, quotation.currency)}
                          </div>
                        </div>
                        <div className="font-semibold">{formatCurrency(item.total, quotation.currency)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="client">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle>Client</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div><span className="font-medium">Name:</span> {quotation.client?.name || "-"}</div>
                    <div><span className="font-medium">Code:</span> {quotation.client?.code || "-"}</div>
                    <div><span className="font-medium">Email:</span> {quotation.client?.contact_email || "-"}</div>
                    <div><span className="font-medium">Phone:</span> {quotation.client?.contact_phone || "-"}</div>
                  </CardContent>
                </Card>
                {quotation.brief && (
                  <Card>
                    <CardHeader><CardTitle>Project Brief</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      <div><span className="font-medium">Title:</span> {quotation.brief.title}</div>
                      <div><span className="font-medium">Est. Revenue:</span> {formatCurrency(quotation.brief.estimated_revenue, "IDR")}</div>
                      <div><span className="font-medium">Est. Cost:</span> {formatCurrency(quotation.brief.estimated_cost, "IDR")}</div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
