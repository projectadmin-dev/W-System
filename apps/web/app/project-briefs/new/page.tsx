"use client"

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { Label } from "@workspace/ui/components/label"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Badge } from "@workspace/ui/components/badge"
import { ArrowLeft, Save, AlertCircle, CheckCircle, Calculator, TrendingUp } from "lucide-react"
import Link from "next/link"

interface Lead {
  id: string
  name: string
  company_name: string
  contact_email: string
  contact_phone: string
  stage: string
  total_score: number
}

interface Client {
  id: string
  name: string
  code: string
}

interface ProjectBrief {
  title: string
  executive_summary: string
  scope_of_work: string
  estimated_revenue: number
  estimated_cost: number
  client_id: string
  lead_id?: string
  tenant_id: string
  commercial_pic_id: string
}

const profile = {
  user: {
    name: "User",
    email: "user@wit.id",
    avatar: "/avatars/user.jpg",
  },
}

export default function NewProjectBriefPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const leadId = searchParams.get('leadId')
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const [lead, setLead] = useState<Lead | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  
  const [formData, setFormData] = useState<ProjectBrief>({
    title: '',
    executive_summary: '',
    scope_of_work: '',
    estimated_revenue: 0,
    estimated_cost: 0,
    client_id: '',
    lead_id: leadId || undefined,
    tenant_id: '', // Will be set from user context
    commercial_pic_id: '' // Will be set from user context
  })

  useEffect(() => {
    if (leadId) {
      fetchLead(leadId)
    }
    fetchClients()
  }, [leadId])

  const fetchLead = async (id: string) => {
    try {
      const response = await fetch(`/api/leads/${id}`)
      const result = await response.json()
      
      if (response.ok) {
        setLead(result)
        setFormData(prev => ({
          ...prev,
          title: `Project Brief - ${result.name}`,
          client_id: result.client_id || ''
        }))
      }
    } catch (err) {
      console.error('Error fetching lead:', err)
    }
  }

  const fetchClients = async () => {
    try {
      // TODO: Implement clients API
      // For now, mock data
      setClients([
        { id: '1', name: 'Sample Client', code: 'CLT-001' }
      ])
    } catch (err) {
      console.error('Error fetching clients:', err)
    }
  }

  const calculateMargin = () => {
    const revenue = formData.estimated_revenue || 0
    const cost = formData.estimated_cost || 0
    const margin = revenue - cost
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0
    return { margin, marginPct }
  }

  const getApprovalTier = (marginPct: number) => {
    if (marginPct >= 30) return { tier: 'PM', sla: 1, color: 'text-green-600' }
    if (marginPct >= 20) return { tier: 'Commercial Director', sla: 2, color: 'text-blue-600' }
    if (marginPct >= 10) return { tier: 'CEO', sla: 3, color: 'text-orange-600' }
    return { tier: 'CEO + CFO (Dual)', sla: 5, color: 'text-red-600' }
  }

  const { margin, marginPct } = calculateMargin()
  const approvalInfo = getApprovalTier(marginPct)

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      
      // TODO: Get actual user context
      const briefData = {
        ...formData,
        tenant_id: 'default-tenant-id', // Replace with actual tenant ID
        commercial_pic_id: 'current-user-id' // Replace with actual user ID
      }
      
      const response = await fetch('/api/project-briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(briefData)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/project-briefs/${result.id}`)
        }, 2000)
      } else {
        setError(result.error || 'Failed to create project brief')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Save error:', err)
    } finally {
      setSaving(false)
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
                  <BreadcrumbLink href="/project-briefs">
                    Project Briefs
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>New Brief</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <NavUser user={profile.user} />
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/project-briefs">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Create Project Brief</h1>
                  <p className="text-muted-foreground">
                    {lead ? `From Hot Lead: ${lead.name}` : 'New project brief'}
                  </p>
                </div>
              </div>
            </div>

            {success && (
              <Card className="border-green-300 bg-green-50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <CardTitle className="text-base">Project Brief Created!</CardTitle>
                  </div>
                  <CardDescription className="text-green-700">
                    Redirecting to brief details...
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {error && (
              <Card className="border-red-300 bg-red-50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-5 w-5" />
                    <CardTitle className="text-base">Error</CardTitle>
                  </div>
                  <CardDescription className="text-red-700">{error}</CardDescription>
                </CardHeader>
              </Card>
            )}

            {lead && (
              <Card className="border-blue-300 bg-blue-50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-blue-800">
                    <TrendingUp className="h-5 w-5" />
                    <CardTitle className="text-base">Lead Information (Pre-filled)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-2 md:grid-cols-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Lead:</span> {lead.name}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Company:</span> {lead.company_name || 'N/A'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stage:</span>{' '}
                    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                      {lead.stage.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Score:</span>{' '}
                    <span className="font-semibold">{lead.total_score}/100</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Brief Content */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Brief Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Project Brief Title"
                    />
                  </div>
                  <div>
                    <Label>Executive Summary *</Label>
                    <Textarea
                      value={formData.executive_summary}
                      onChange={(e) => setFormData({ ...formData, executive_summary: e.target.value })}
                      rows={4}
                      placeholder="Brief overview of the project..."
                    />
                  </div>
                  <div>
                    <Label>Scope of Work *</Label>
                    <Textarea
                      value={formData.scope_of_work}
                      onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })}
                      rows={6}
                      placeholder="Detailed scope of work..."
                    />
                  </div>
                  <div>
                    <Label>Client *</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} ({client.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Details */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Financial Details
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Enter revenue and cost to calculate margin
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Estimated Revenue (IDR)</Label>
                    <Input
                      type="number"
                      value={formData.estimated_revenue || ''}
                      onChange={(e) => setFormData({ ...formData, estimated_revenue: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label>Estimated Cost (IDR)</Label>
                    <Input
                      type="number"
                      value={formData.estimated_cost || ''}
                      onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2 p-4 bg-muted rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Estimated Margin:</span>
                      <span className="font-semibold">{margin.toLocaleString('id-ID')} IDR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Margin Percentage:</span>
                      <span className={`font-bold ${marginPct >= 30 ? 'text-green-600' : marginPct >= 20 ? 'text-blue-600' : marginPct >= 10 ? 'text-orange-600' : 'text-red-600'}`}>
                        {marginPct.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border-2 ${
                    marginPct >= 30 ? 'border-green-300 bg-green-50' :
                    marginPct >= 20 ? 'border-blue-300 bg-blue-50' :
                    marginPct >= 10 ? 'border-orange-300 bg-orange-50' :
                    'border-red-300 bg-red-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className={`h-5 w-5 ${approvalInfo.color}`} />
                      <span className="font-semibold">Approval Required</span>
                    </div>
                    <div className="text-sm">
                      <div className="flex justify-between">
                        <span>Approver:</span>
                        <span className="font-semibold">{approvalInfo.tier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SLA:</span>
                        <span className="font-semibold">{approvalInfo.sla} day{approvalInfo.sla > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    {marginPct < 10 && (
                      <p className="text-xs text-red-600 mt-2">
                        ⚠️ Critical margin - requires CFO (Arie Anggono) approval
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Additional Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Assumptions (one per line)</Label>
                    <Textarea
                      rows={4}
                      placeholder="- Client will provide all necessary assets&#10;- Timeline starts from contract signing"
                    />
                  </div>
                  <div>
                    <Label>Exclusions (one per line)</Label>
                    <Textarea
                      rows={4}
                      placeholder="- Third-party licensing fees&#10;- Travel expenses"
                    />
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Creating...' : 'Create Project Brief'}
              </Button>
            </div>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
