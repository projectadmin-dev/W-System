"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { NavUser } from "@/components/nav-user"
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { Separator } from "@workspace/ui/components/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@workspace/ui/components/sidebar"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/dialog"
import { Textarea } from "@workspace/ui/components/textarea"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  ArrowLeft, Lock, Unlock, Play, ShieldAlert, FilePlus, History, CheckCircle, Clock,
} from "lucide-react"
import Link from "next/link"

interface ChangeRequest {
  id: string
  title: string
  change_type: string
  status: string
  created_at: string
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [kickoffLoading, setKickoffLoading] = useState(false)
  const [signLoading, setSignLoading] = useState(false)
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([])
  const [showChangeDialog, setShowChangeDialog] = useState(false)

  useEffect(() => { if (id) { fetchProject(); fetchChangeRequests() } }, [id])

  const fetchProject = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${id}`)
      const data = await res.json()
      setProject(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const fetchChangeRequests = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/change-requests`)
      const data = await res.json()
      setChangeRequests(data.data || [])
    } catch (e) { console.error(e) }
  }

  const signAddendum = async () => {
    try {
      setSignLoading(true)
      const res = await fetch(`/api/projects/${id}/sign-addendum`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signed_at: new Date().toISOString() }) })
      if (res.ok) { fetchProject() }
    } finally { setSignLoading(false) }
  }

  const kickoff = async () => {
    try {
      setKickoffLoading(true)
      const res = await fetch(`/api/projects/${id}/kickoff`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) { fetchProject() }
      else { alert(data.error || 'Kickoff blocked') }
    } finally { setKickoffLoading(false) }
  }

  const submitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    const body = {
      title: fd.get('title'),
      description: fd.get('description'),
      change_type: fd.get('change_type'),
    }
    try {
      const res = await fetch(`/api/projects/${id}/change-requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { setShowChangeDialog(false); fetchChangeRequests() }
    } catch (e) { console.error(e) }
  }

  const isBlocked = project && !project.signed_addendum && project.kickoff_status !== 'started'

  if (loading) return <div className="flex items-center justify-center h-screen">Loading…</div>
  if (!project) return <div className="flex items-center justify-center h-screen">Project not found</div>

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
                <BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block"><BreadcrumbLink href="/projects/kanban">Projects</BreadcrumbLink></BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem><BreadcrumbPage>{project.project_code}</BreadcrumbPage></BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/projects/kanban"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Back</Button></Link>
            <NavUser user={{ name: "User", email: "user@wit.id", avatar: "/avatars/user.jpg" }} />
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-6">
          {/* Project Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{project.project_name}</h1>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>{project.status}</Badge>
                {project.signed_addendum ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" /> Signed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <ShieldAlert className="w-3 h-3 mr-1" /> No Addendum
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {project.project_code} · Deal: Rp {(project.deal_value || 0).toLocaleString('id-ID')} · Kickoff: {project.kickoff_status}
              </p>
            </div>
          </div>

          {/* BLOCK ALERT — Hard Rule */}
          {isBlocked && (
            <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-900">
              <div className="flex items-center gap-2 font-semibold">
                <Lock className="h-4 w-4" /> Execution Blocked
              </div>
              <p className="text-sm mt-1">
                Hard rule: <strong>NO execution without signed addendum.</strong> Please sign the addendum before starting this project.
              </p>
              {project.execution_blocked_reason && <p className="text-sm mt-1">{project.execution_blocked_reason}</p>}
            </div>
          )}

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Addendum Card */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Addendum Status</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  {project.signed_addendum ? (
                    <><CheckCircle className="w-5 h-5 text-green-600" /><span className="text-green-600 font-medium">Signed</span></>
                  ) : (
                    <><ShieldAlert className="w-5 h-5 text-red-600" /><span className="text-red-600 font-medium">Not Signed</span></>
                  )}
                </div>
                {project.addendum_signed_at && <p className="text-xs text-muted-foreground">Signed at: {new Date(project.addendum_signed_at).toLocaleDateString('id-ID')}</p>}
                {!project.signed_addendum && (
                  <Button size="sm" className="w-full mt-2" onClick={signAddendum} disabled={signLoading}>
                    {signLoading ? 'Signing…' : <><Unlock className="w-4 h-4 mr-1" /> Sign Addendum</>}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Kickoff Card */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Kickoff</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="capitalize">{project.kickoff_status}</span>
                </div>
                {project.kickoff_date && <p className="text-xs text-muted-foreground">Date: {project.kickoff_date}</p>}
                <Button
                  size="sm" className="w-full mt-2"
                  onClick={kickoff}
                  disabled={kickoffLoading || !project.signed_addendum || project.kickoff_status === 'started'}
                >
                  {kickoffLoading ? 'Starting…' : <><Play className="w-4 h-4 mr-1" /> Start Kickoff</>}
                </Button>
              </CardContent>
            </Card>

            {/* Change Request Card */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Change Requests</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">{changeRequests.length}</div>
                <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="w-full"><FilePlus className="w-4 h-4 mr-1" />New Request</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>New Change Request</DialogTitle><DialogDescription>Submit scope/timeline/cost/resource change.</DialogDescription></DialogHeader>
                    <form onSubmit={submitChangeRequest} className="space-y-3">
                      <div><Label>Title</Label><Input name="title" required /></div>
                      <div><Label>Description</Label><Textarea name="description" /></div>
                      <div><Label>Type</Label>
                        <select name="change_type" className="w-full border rounded px-2 py-1 text-sm">
                          <option value="scope">Scope</option>
                          <option value="timeline">Timeline</option>
                          <option value="cost">Cost</option>
                          <option value="resource">Resource</option>
                        </select>
                      </div>
                      <DialogFooter><Button type="submit">Submit</Button></DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>

          {/* Change Requests List */}
          <Card>
            <CardHeader><CardTitle>Change Request History</CardTitle></CardHeader>
            <CardContent>
              {changeRequests.length === 0 ? (
                <p className="text-muted-foreground text-sm">No change requests yet.</p>
              ) : (
                <div className="divide-y">
                  {changeRequests.map((cr) => (
                    <div key={cr.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{cr.title}</div>
                        <div className="text-sm text-muted-foreground">{cr.change_type} · {new Date(cr.created_at).toLocaleDateString('id-ID')}</div>
                      </div>
                      <Badge variant="outline">{cr.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
