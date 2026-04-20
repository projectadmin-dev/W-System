"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { ArrowLeft, Save, AlertCircle, CheckCircle, TrendingUp } from "lucide-react"
import Link from "next/link"

const profile = {
  user: {
    name: "User",
    email: "user@wit.id",
    avatar: "/avatars/user.jpg",
  },
}

export default function NewLeadPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [createdLeadId, setCreatedLeadId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    contact_email: '',
    contact_phone: '',
    job_title: '',
    source: 'inbound',
    budget_disclosed: 'unknown',
    authority_level: 'influencer',
    need_definition: 0,
    timeline: 'unknown',
    engagement_score: 0,
    notes: '',
    tags: '' as string,
  })

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Validate required fields
      if (!formData.name || !formData.source) {
        setError('Name and Source are required fields')
        setSaving(false)
        return
      }

      const payload = {
        ...formData,
        need_definition: parseInt(formData.need_definition as any) || 0,
        engagement_score: parseInt(formData.engagement_score as any) || 0,
        tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()) : [],
      }

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(true)
        setCreatedLeadId(result.id)
        
        // Auto-redirect after 2 seconds
        setTimeout(() => {
          router.push(`/leads/${result.id}`)
        }, 2000)
      } else {
        setError(result.error || 'Failed to create lead')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const calculateScore = () => {
    let score = 0
    
    if (formData.budget_disclosed === 'exact') score += 25
    else if (formData.budget_disclosed === 'range') score += 15
    
    if (formData.authority_level === 'c_level') score += 25
    else if (formData.authority_level === 'manager') score += 15
    else if (formData.authority_level === 'influencer') score += 5
    
    score += Math.min(parseInt(formData.need_definition as any) || 0, 20)
    
    if (formData.timeline === 'within_3mo') score += 15
    else if (formData.timeline === 'within_6mo') score += 8
    
    score += Math.min(parseInt(formData.engagement_score as any) || 0, 15)
    
    return score
  }

  const currentScore = calculateScore()

  const getStageFromScore = (score: number) => {
    if (score >= 75) return 'hot'
    if (score >= 50) return 'warm'
    return 'cold'
  }

  const predictedStage = getStageFromScore(currentScore)

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
                  <BreadcrumbPage>New Lead</BreadcrumbPage>
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
                  <h1 className="text-2xl font-bold tracking-tight">Create New Lead</h1>
                  <p className="text-muted-foreground">
                    Add a new lead to the sales pipeline
                  </p>
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Creating...' : 'Create Lead'}
              </Button>
            </div>

            {/* Success Message */}
            {success && (
              <Card className="border-green-300 bg-green-50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <CardTitle className="text-base">Lead Created Successfully!</CardTitle>
                  </div>
                  <CardDescription className="text-green-700">
                    Redirecting to lead details...
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            {/* Error Message */}
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
                  <CardDescription>Basic details about the lead</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label>Job Title</Label>
                    <Input
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                      placeholder="Marketing Director"
                    />
                  </div>
                  <div>
                    <Label>Company Name</Label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      placeholder="PT Example Company"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="+62 812 3456 7890"
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
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={currentScore >= 75 ? 'bg-green-100 text-green-800' : currentScore >= 50 ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}>
                        Score: {currentScore}/100
                      </Badge>
                      <Badge variant="outline" className={
                        predictedStage === 'hot' ? 'bg-red-100 text-red-800' :
                        predictedStage === 'warm' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }>
                        {predictedStage.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    Score determines pipeline stage automatically
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Budget Disclosed</Label>
                    <Select
                      value={formData.budget_disclosed}
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
                      value={formData.authority_level}
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
                      value={formData.need_definition}
                      onChange={(e) => setFormData({ ...formData, need_definition: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Timeline</Label>
                    <Select
                      value={formData.timeline}
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
                      value={formData.engagement_score}
                      onChange={(e) => setFormData({ ...formData, engagement_score: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Source & Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Source & Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Lead Source *</Label>
                    <Select
                      value={formData.source}
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
                    <Label>Tags (comma-separated)</Label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="enterprise, priority, q1-2026"
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes about this lead..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Info Panel */}
              <Card>
                <CardHeader>
                  <CardTitle>Pipeline Stages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span className="text-sm font-medium">Cold</span>
                    <span className="text-xs text-muted-foreground">0-49 pts</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                    <span className="text-sm font-medium">Warm</span>
                    <span className="text-xs text-muted-foreground">50-74 pts</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <span className="text-sm font-medium">Hot 🔥</span>
                    <span className="text-xs text-muted-foreground">75-100 pts</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="text-sm font-medium">Deal</span>
                    <span className="text-xs text-muted-foreground">Signed contract</span>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      <strong>SLA Timelines:</strong>
                    </p>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                      <li>• Cold → Warm: 7 days</li>
                      <li>• Warm → Hot: 14 days</li>
                      <li>• Hot → Deal: 30 days</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

            </div>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
