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
import { ArrowLeft, Save, AlertCircle, CheckCircle } from "lucide-react"
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
    contact_email: '',
    source: 'inbound',
  })

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // Validate required fields
      if (!formData.name || !formData.contact_email || !formData.source) {
        setError('Name, Email, and Source are required')
        setSaving(false)
        return
      }

      const payload = {
        name: formData.name,
        contact_email: formData.contact_email,
        source: formData.source,
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

              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Lead Information</CardTitle>
                  <CardDescription>Basic details</CardDescription>
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
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <Label>Lead Source *</Label>
                    <Select
                      value={formData.source}
                      onValueChange={(value) => setFormData({ ...formData, source: value })}
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
                </CardContent>
              </Card>

              {/* Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Informasi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium mb-1">Status Awal:</p>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">Cold</Badge>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Lead Assign:</p>
                    <Badge variant="outline">Default (Admin)</Badge>
                  </div>
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    Minimal lead creation. Lengkapi data lebih lanjut setelah create.
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
