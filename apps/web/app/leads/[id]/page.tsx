"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import { ArrowLeft, Save, TrendingUp, Clock, AlertCircle, CheckCircle, Bell } from "lucide-react"
import Link from "next/link"

interface Lead {
  id: string
  name: string
  company_name: string
  contact_email: string
  contact_phone: string
  job_title: string
  stage: 'cold' | 'warm' | 'hot' | 'deal'
  total_score: number
  sla_deadline_at: string
  sla_breached: boolean
  source: string
  budget_disclosed: string
  authority_level: string
  need_definition: number
  timeline: string
  engagement_score: number
  marketing_pic_id: string
  commercial_pic_id: string
  notes: string
  tags: string[]
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

const profile = {
  user: {
    name: "User",
    email: "user@wit.id",
    avatar: "/avatars/user.jpg",
  },
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notificationSent, setNotificationSent] = useState(false)

  // Form state
  const [formData, setFormData] = useState<Partial<Lead>>({})

  useEffect(() => {
    fetchLead()
  }, [params.id])

  const fetchLead = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/leads/${params.id}`)
      const result = await response.json()
      
      if (response.ok) {
        setLead(result)
        setFormData(result)
      } else {
        setError(result.error || 'Failed to fetch lead')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      
      const response = await fetch(`/api/leads/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setLead(result)
        setFormData(result)
        
        // Check if hot lead notification was triggered
        if (result.stage === 'hot' && lead?.stage !== 'hot') {
          setNotificationSent(true)
        }
      } else {
        setError(result.error || 'Failed to update lead')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Save error:', err)
    } finally {
      setSaving(false)
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

  const calculateScore = () => {
    let score = 0
    
    if (formData.budget_disclosed === 'exact') score += 25
    else if (formData.budget_disclosed === 'range') score += 15
    
    if (formData.authority_level === 'c_level') score += 25
    else if (formData.authority_level === 'manager') score += 15
    else if (formData.authority_level === 'influencer') score += 5
    
    if (formData.need_definition) score += Math.min(formData.need_definition, 20)
    
    if (formData.timeline === 'within_3mo') score += 15
    else if (formData.timeline === 'within_6mo') score += 8
    
    if (formData.engagement_score) score += Math.min(formData.engagement_score, 15)
    
    return score
  }

  const currentScore = calculateScore()

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="text-muted-foreground">Loading lead details...</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (error && !lead) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex items-center justify-center h-screen">
            <div className="text-red-600">{error}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
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
                  <BreadcrumbPage>{lead?.name}</BreadcrumbPage>
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
                <Link href="/leads">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{lead?.name}</h1>
                  <p className="text-muted-foreground">
                    {lead?.company_name || lead?.client?.name || 'No company'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getStageColor(formData.stage || 'cold')}>
                  {formData.stage?.toUpperCase() || 'COLD'}
                </Badge>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>

            {notificationSent && (
              <Card className="border-green-300 bg-green-50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <CardTitle className="text-base">Hot Lead Notification Sent!</CardTitle>
                  </div>
                  <CardDescription className="text-green-700">
                    Commercial team and PM have been notified about this hot lead.
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

            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Job Title</Label>
                    <Input
                      value={formData.job_title || ''}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Company Name</Label>
                    <Input
                      value={formData.company_name || ''}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.contact_email || ''}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.contact_phone || ''}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Lead Scoring */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Lead Scoring
                    </CardTitle>
                    <Badge variant="outline" className={currentScore >= 75 ? 'bg-green-100 text-green-800' : currentScore >= 50 ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}>
                      Score: {currentScore}/100
                    </Badge>
                  </div>
                  <CardDescription>
                    Score automatically determines pipeline stage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Budget Disclosed</Label>
                    <Select
                      value={formData.budget_disclosed || 'unknown'}
                      onValueChange={(value) => setFormData({ ...formData, budget_disclosed: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unknown">Unknown (0 pts)</SelectItem>
                        <SelectItem value="range">Range disclosed (15 pts)</SelectItem>
                        <SelectItem value="exact">Exact amount (25 pts)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Authority Level</Label>
                    <Select
                      value={formData.authority_level || 'influencer'}
                      onValueChange={(value) => setFormData({ ...formData, authority_level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="influencer">Influencer (5 pts)</SelectItem>
                        <SelectItem value="manager">Manager (15 pts)</SelectItem>
                        <SelectItem value="c_level">C-Level (25 pts)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Need Definition (0-20)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="20"
                      value={formData.need_definition || 0}
                      onChange={(e) => setFormData({ ...formData, need_definition: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Timeline</Label>
                    <Select
                      value={formData.timeline || 'unknown'}
                      onValueChange={(value) => setFormData({ ...formData, timeline: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unknown">Unknown (0 pts)</SelectItem>
                        <SelectItem value="within_6mo">Within 6 months (8 pts)</SelectItem>
                        <SelectItem value="within_3mo">Within 3 months (15 pts)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Engagement Score (0-15)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="15"
                      value={formData.engagement_score || 0}
                      onChange={(e) => setFormData({ ...formData, engagement_score: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Pipeline & SLA */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Pipeline & SLA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Pipeline Stage</Label>
                    <Select
                      value={formData.stage || 'cold'}
                      onValueChange={(value: any) => setFormData({ ...formData, stage: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cold">Cold</SelectItem>
                        <SelectItem value="warm">Warm</SelectItem>
                        <SelectItem value="hot">Hot 🔥</SelectItem>
                        <SelectItem value="deal">Deal</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.stage === 'hot' && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <Bell className="h-3 w-3" />
                        Hot leads trigger notification to Commercial & PM
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Source</Label>
                    <Select
                      value={formData.source || 'inbound'}
                      onValueChange={(value: any) => setFormData({ ...formData, source: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="digital_ads">Digital Ads</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="partner">Partner</SelectItem>
                        <SelectItem value="inbound">Inbound</SelectItem>
                        <SelectItem value="outbound">Outbound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>SLA Deadline</Label>
                    <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                      {lead?.sla_deadline_at ? new Date(lead.sla_deadline_at).toLocaleString() : 'Not set'}
                    </div>
                  </div>
                  {lead?.sla_breached && (
                    <div className="text-red-600 text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      SLA Breached!
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notes & Tags */}
              <Card>
                <CardHeader>
                  <CardTitle>Notes & Tags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={6}
                      placeholder="Add notes about this lead..."
                    />
                  </div>
                  <div>
                    <Label>Tags (comma-separated)</Label>
                    <Input
                      value={formData.tags?.join(', ') || ''}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                      })}
                      placeholder="enterprise, priority, follow-up"
                    />
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              {formData.stage === 'hot' && (
                <Link href={`/project-briefs/new?leadId=${params.id}`} className="flex-1">
                  <Button className="w-full" variant="default">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Create Project Brief from This Lead
                  </Button>
                </Link>
              )}
            </div>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
