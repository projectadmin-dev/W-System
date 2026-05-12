"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/ui/components/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Building2, ChevronRight, ChevronDown, Search, Plus, Edit, Trash2,
  Loader2, AlertCircle, GitBranch, Briefcase, Layers, MapPin,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Entity {
  id: string
  code: string
  name: string
  type: string
  status: string
}

type OrgTab = "departments" | "divisions" | "job-titles" | "job-levels" | "work-areas"

const API_MAP: Record<OrgTab, string> = {
  departments: "/api/org-structure/departments",
  divisions: "/api/org-structure/divisions",
  "job-titles": "/api/org-structure/positions",
  "job-levels": "/api/org-structure/job-levels",
  "work-areas": "/api/org-structure/work-areas",
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n || 0)

// ─── Add/Edit Form Configs ────────────────────────────────────────────────────

function DeptForm({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Kode *</Label>
          <Input value={data.code || ""} onChange={e => onChange({ ...data, code: e.target.value })} placeholder="cth. ENG" disabled={!!data.id} />
        </div>
        <div className="space-y-1.5">
          <Label>Nama *</Label>
          <Input value={data.name || ""} onChange={e => onChange({ ...data, name: e.target.value })} placeholder="cth. Engineering" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Deskripsi</Label>
        <Textarea value={data.description || ""} onChange={e => onChange({ ...data, description: e.target.value })} placeholder="Deskripsi departemen..." rows={3} />
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input value={data.email || ""} onChange={e => onChange({ ...data, email: e.target.value })} placeholder="dept@company.com" type="email" />
      </div>
      <div className="space-y-1.5">
        <Label>Telepon</Label>
        <Input value={data.phone || ""} onChange={e => onChange({ ...data, phone: e.target.value })} placeholder="+62..." />
      </div>
    </div>
  )
}

function DivisionForm({ data, onChange, departments }: { data: any; onChange: (d: any) => void; departments: any[] }) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Kode *</Label>
          <Input value={data.code || ""} onChange={e => onChange({ ...data, code: e.target.value })} placeholder="cth. DIV-WEB" disabled={!!data.id} />
        </div>
        <div className="space-y-1.5">
          <Label>Nama *</Label>
          <Input value={data.name || ""} onChange={e => onChange({ ...data, name: e.target.value })} placeholder="cth. Web Development" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Departemen</Label>
        <Select value={data.department_id || ""} onValueChange={v => onChange({ ...data, department_id: v })}>
          <SelectTrigger><SelectValue placeholder="Pilih departemen..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">— Tidak ada —</SelectItem>
            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Deskripsi</Label>
        <Textarea value={data.description || ""} onChange={e => onChange({ ...data, description: e.target.value })} placeholder="Deskripsi divisi..." rows={3} />
      </div>
    </div>
  )
}

function JobTitleForm({ data, onChange, departments, jobLevels }: { data: any; onChange: (d: any) => void; departments: any[]; jobLevels: any[] }) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Kode *</Label>
          <Input value={data.code || ""} onChange={e => onChange({ ...data, code: e.target.value })} placeholder="cth. BE-DEV" disabled={!!data.id} />
        </div>
        <div className="space-y-1.5">
          <Label>Nama *</Label>
          <Input value={data.name || ""} onChange={e => onChange({ ...data, name: e.target.value })} placeholder="cth. Backend Developer" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Departemen</Label>
          <Select value={data.department_id || ""} onValueChange={v => onChange({ ...data, department_id: v })}>
            <SelectTrigger><SelectValue placeholder="Pilih departemen..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">— Tidak ada —</SelectItem>
              {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Level / Grade</Label>
          <Select value={data.grade_id || ""} onValueChange={v => onChange({ ...data, grade_id: v })}>
            <SelectTrigger><SelectValue placeholder="Pilih level..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">— Tidak ada —</SelectItem>
              {jobLevels.map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({l.code})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Deskripsi Pekerjaan</Label>
        <Textarea value={data.job_description || ""} onChange={e => onChange({ ...data, job_description: e.target.value })} placeholder="Tugas dan tanggung jawab..." rows={3} />
      </div>
    </div>
  )
}

function JobLevelForm({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Kode *</Label>
          <Input value={data.code || ""} onChange={e => onChange({ ...data, code: e.target.value })} placeholder="cth. L3" disabled={!!data.id} />
        </div>
        <div className="space-y-1.5">
          <Label>Nama *</Label>
          <Input value={data.name || ""} onChange={e => onChange({ ...data, name: e.target.value })} placeholder="cth. Senior" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Level (angka) *</Label>
        <Input value={data.level || ""} type="number" min="1" onChange={e => onChange({ ...data, level: Number(e.target.value) })} placeholder="cth. 3" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Gaji Minimum (Rp)</Label>
          <Input value={data.salary_min || ""} type="number" onChange={e => onChange({ ...data, salary_min: Number(e.target.value) })} placeholder="cth. 8000000" />
        </div>
        <div className="space-y-1.5">
          <Label>Gaji Maksimum (Rp)</Label>
          <Input value={data.salary_max || ""} type="number" onChange={e => onChange({ ...data, salary_max: Number(e.target.value) })} placeholder="cth. 15000000" />
        </div>
      </div>
    </div>
  )
}

function WorkAreaForm({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Kode *</Label>
          <Input value={data.code || ""} onChange={e => onChange({ ...data, code: e.target.value })} placeholder="cth. HQ-JKT" disabled={!!data.id} />
        </div>
        <div className="space-y-1.5">
          <Label>Nama *</Label>
          <Input value={data.name || ""} onChange={e => onChange({ ...data, name: e.target.value })} placeholder="cth. Kantor Pusat Jakarta" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Lokasi</Label>
          <Input value={data.location || ""} onChange={e => onChange({ ...data, location: e.target.value })} placeholder="cth. Jakarta Selatan" />
        </div>
        <div className="space-y-1.5">
          <Label>Tipe</Label>
          <Select value={data.type || "Office"} onValueChange={v => onChange({ ...data, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Office">Office</SelectItem>
              <SelectItem value="WFH">WFH (Remote)</SelectItem>
              <SelectItem value="Hybrid">Hybrid</SelectItem>
              <SelectItem value="Client Site">Client Site</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Kapasitas (orang)</Label>
        <Input value={data.capacity || ""} type="number" onChange={e => onChange({ ...data, capacity: Number(e.target.value) })} placeholder="cth. 50" />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrgStructurePage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [loadingEntities, setLoadingEntities] = useState(true)
  const [activeTab, setActiveTab] = useState<OrgTab>("departments")
  const [search, setSearch] = useState("")
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({})

  // Data states
  const [departments, setDepartments] = useState<any[]>([])
  const [divisions, setDivisions] = useState<any[]>([])
  const [jobTitles, setJobTitles] = useState<any[]>([])
  const [jobLevels, setJobLevels] = useState<any[]>([])
  const [workAreas, setWorkAreas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dialog states
  const [formDialog, setFormDialog] = useState<{ open: boolean; type: OrgTab; data: any }>({
    open: false, type: "departments", data: {}
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: OrgTab; id: string; name: string }>({
    open: false, type: "departments", id: "", name: ""
  })
  const [deleting, setDeleting] = useState(false)

  // Load entities on mount
  useEffect(() => {
    fetch("/api/entities")
      .then(r => r.json())
      .then(d => { setEntities(Array.isArray(d) ? d : (d.data ?? [])); setLoadingEntities(false) })
      .catch(() => setLoadingEntities(false))
  }, [])

  // Fetch org structure when entity selected
  const fetchOrgData = useCallback(() => {
    if (!selectedEntity) return
    setLoading(true)
    setError(null)
    Promise.all([
      fetch(`/api/org-structure/departments?entity_id=${selectedEntity.id}`).then(r => r.json()),
      fetch(`/api/org-structure/divisions?entity_id=${selectedEntity.id}`).then(r => r.json()),
      fetch(`/api/org-structure/positions?entity_id=${selectedEntity.id}`).then(r => r.json()),
      fetch(`/api/org-structure/job-levels?entity_id=${selectedEntity.id}`).then(r => r.json()),
      fetch(`/api/org-structure/work-areas?entity_id=${selectedEntity.id}`).then(r => r.json()),
    ])
      .then(([depts, divs, titles, levels, areas]) => {
        setDepartments(depts.data || [])
        setDivisions(divs.data || [])
        setJobTitles(titles.data || [])
        setJobLevels(levels.data || [])
        setWorkAreas(areas.data || [])
      })
      .catch(() => setError("Gagal memuat data struktur organisasi"))
      .finally(() => setLoading(false))
  }, [selectedEntity])

  useEffect(() => { fetchOrgData() }, [fetchOrgData])

  // Save (create or update)
  const handleSave = async () => {
    const { type, data } = formDialog
    if (!selectedEntity) return

    setSaving(true)
    setFormError(null)

    try {
      const isEdit = !!data.id
      const url = isEdit ? `${API_MAP[type]}/${data.id}` : API_MAP[type]
      const method = isEdit ? "PATCH" : "POST"
      const payload = isEdit ? { ...data } : { ...data, entity_id: selectedEntity.id }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await res.json()

      if (!result.success) throw new Error(result.error || "Gagal menyimpan data")

      setFormDialog({ open: false, type, data: {} })
      fetchOrgData()
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // Delete
  const handleDelete = async () => {
    const { type, id } = deleteDialog
    setDeleting(true)
    try {
      const res = await fetch(`${API_MAP[type]}/${id}`, { method: "DELETE" })
      const result = await res.json()
      if (!result.success) throw new Error(result.error || "Gagal menghapus")
      setDeleteDialog({ open: false, type, id: "", name: "" })
      fetchOrgData()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  const openAdd = (type: OrgTab) => setFormDialog({ open: true, type, data: {} })
  const openEdit = (type: OrgTab, item: any) => setFormDialog({ open: true, type, data: { ...item } })
  const openDelete = (type: OrgTab, id: string, name: string) => setDeleteDialog({ open: true, type, id, name })

  const s = search.toLowerCase()
  const filteredDepts = useMemo(() =>
    !search ? departments : departments.filter(d => d.name?.toLowerCase().includes(s) || d.code?.toLowerCase().includes(s))
  , [departments, search])
  const filteredDivs = useMemo(() =>
    !search ? divisions : divisions.filter(d => d.name?.toLowerCase().includes(s) || d.code?.toLowerCase().includes(s))
  , [divisions, search])
  const filteredTitles = useMemo(() =>
    !search ? jobTitles : jobTitles.filter(j => j.name?.toLowerCase().includes(s) || j.code?.toLowerCase().includes(s))
  , [jobTitles, search])
  const filteredLevels = useMemo(() =>
    !search ? jobLevels : jobLevels.filter(l => l.name?.toLowerCase().includes(s) || l.code?.toLowerCase().includes(s))
  , [jobLevels, search])
  const filteredAreas = useMemo(() =>
    !search ? workAreas : workAreas.filter(w => w.name?.toLowerCase().includes(s) || w.code?.toLowerCase().includes(s))
  , [workAreas, search])

  const formTitles: Record<OrgTab, string> = {
    departments: "Departemen",
    divisions: "Divisi",
    "job-titles": "Jabatan",
    "job-levels": "Level",
    "work-areas": "Area Kerja",
  }

  const typeBadgeColor = (type: string) =>
    type === "WFH" ? "bg-blue-100 text-blue-700" :
    type === "Hybrid" ? "bg-violet-100 text-violet-700" :
    type === "Office" ? "bg-emerald-100 text-emerald-700" :
    "bg-gray-100 text-gray-700"

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Struktur Organisasi</h1>
          <p className="text-muted-foreground mt-1">Kelola departemen, divisi, jabatan, level, dan area kerja</p>
        </div>
      </div>

      {/* Entity Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pilih Entity</CardTitle>
          <CardDescription>Pilih entity untuk mengelola struktur organisasinya</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingEntities ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat entity...
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {entities.map(e => (
                <Button
                  key={e.id}
                  variant={selectedEntity?.id === e.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSelectedEntity(e); setSearch("") }}
                >
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />
                  {e.name}
                  <span className="ml-1.5 text-xs opacity-70">{e.code}</span>
                </Button>
              ))}
              {entities.length === 0 && (
                <p className="text-sm text-muted-foreground">Tidak ada entity ditemukan</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Org Structure Content */}
      {selectedEntity && (
        <>
          {/* Selected Entity Info + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium">{selectedEntity.name}</span>
              <Badge variant="outline" className="text-xs">{selectedEntity.code}</Badge>
            </div>
            <div className="relative max-w-sm w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={fetchOrgData}>Coba lagi</Button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={v => { setActiveTab(v as OrgTab); setSearch("") }}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="departments" className="gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Departemen
                </TabsTrigger>
                <TabsTrigger value="divisions" className="gap-1.5">
                  <GitBranch className="h-3.5 w-3.5" /> Divisi
                </TabsTrigger>
                <TabsTrigger value="job-titles" className="gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> Jabatan
                </TabsTrigger>
                <TabsTrigger value="job-levels" className="gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> Level
                </TabsTrigger>
                <TabsTrigger value="work-areas" className="gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> Area Kerja
                </TabsTrigger>
              </TabsList>

              {/* ── DEPARTMENTS ───────────────────────────────── */}
              <TabsContent value="departments" className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{filteredDepts.length} departemen</p>
                  <Button size="sm" onClick={() => openAdd("departments")}>
                    <Plus className="h-4 w-4 mr-1" /> Tambah Departemen
                  </Button>
                </div>
                {filteredDepts.length === 0 ? (
                  <Card><CardContent className="text-center py-12 text-muted-foreground text-sm">Belum ada departemen</CardContent></Card>
                ) : (
                  filteredDepts.map(dept => (
                    <Card key={dept.id}>
                      <Collapsible open={expandedDepts[dept.id] || false} onOpenChange={() => setExpandedDepts(p => ({ ...p, [dept.id]: !p[dept.id] }))}>
                        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="p-1 h-auto">
                                {expandedDepts[dept.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            </CollapsibleTrigger>
                            <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{dept.name}</p>
                              <p className="text-xs text-muted-foreground">{dept.code}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge className={dept.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}>
                              {dept.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit("departments", dept)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => openDelete("departments", dept.id, dept.name)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CollapsibleContent>
                          <CardContent className="pt-0 pb-3 px-4">
                            <div className="pl-8 border-t pt-3 text-sm space-y-1 text-muted-foreground">
                              {dept.description && <p><span className="font-medium text-foreground">Deskripsi:</span> {dept.description}</p>}
                              {dept.email && <p><span className="font-medium text-foreground">Email:</span> {dept.email}</p>}
                              {dept.phone && <p><span className="font-medium text-foreground">Telepon:</span> {dept.phone}</p>}
                              {dept.cost_center_code && <p><span className="font-medium text-foreground">Cost Center:</span> {dept.cost_center_code}</p>}
                              {!dept.description && !dept.email && !dept.phone && <p className="italic">Tidak ada detail tambahan</p>}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* ── DIVISIONS ─────────────────────────────────── */}
              <TabsContent value="divisions" className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{filteredDivs.length} divisi</p>
                  <Button size="sm" onClick={() => openAdd("divisions")}>
                    <Plus className="h-4 w-4 mr-1" /> Tambah Divisi
                  </Button>
                </div>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Departemen</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDivs.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">Belum ada divisi</TableCell></TableRow>
                      ) : filteredDivs.map(div => (
                        <TableRow key={div.id}>
                          <TableCell className="font-mono text-sm font-medium">{div.code}</TableCell>
                          <TableCell className="font-medium">{div.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {departments.find(d => d.id === div.department_id)?.name || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={div.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}>
                              {div.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit("divisions", div)}><Edit className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => openDelete("divisions", div.id, div.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {/* ── JOB TITLES ────────────────────────────────── */}
              <TabsContent value="job-titles" className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{filteredTitles.length} jabatan</p>
                  <Button size="sm" onClick={() => openAdd("job-titles")}>
                    <Plus className="h-4 w-4 mr-1" /> Tambah Jabatan
                  </Button>
                </div>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Departemen</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTitles.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Belum ada jabatan</TableCell></TableRow>
                      ) : filteredTitles.map(jt => (
                        <TableRow key={jt.id}>
                          <TableCell className="font-mono text-sm font-medium">{jt.code}</TableCell>
                          <TableCell className="font-medium">{jt.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {departments.find(d => d.id === jt.department_id)?.name || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {jobLevels.find(l => l.id === jt.grade_id)?.name || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={jt.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}>
                              {jt.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit("job-titles", jt)}><Edit className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => openDelete("job-titles", jt.id, jt.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {/* ── JOB LEVELS ────────────────────────────────── */}
              <TabsContent value="job-levels" className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{filteredLevels.length} level</p>
                  <Button size="sm" onClick={() => openAdd("job-levels")}>
                    <Plus className="h-4 w-4 mr-1" /> Tambah Level
                  </Button>
                </div>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Range Gaji</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLevels.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Belum ada level</TableCell></TableRow>
                      ) : filteredLevels.map(lv => (
                        <TableRow key={lv.id}>
                          <TableCell className="font-mono text-sm font-medium">{lv.code}</TableCell>
                          <TableCell className="font-medium">{lv.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">L{lv.level}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {formatRupiah(lv.salary_min)} – {formatRupiah(lv.salary_max)}
                          </TableCell>
                          <TableCell>
                            <Badge className={lv.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}>
                              {lv.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit("job-levels", lv)}><Edit className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => openDelete("job-levels", lv.id, lv.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              {/* ── WORK AREAS ────────────────────────────────── */}
              <TabsContent value="work-areas" className="space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{filteredAreas.length} area kerja</p>
                  <Button size="sm" onClick={() => openAdd("work-areas")}>
                    <Plus className="h-4 w-4 mr-1" /> Tambah Area Kerja
                  </Button>
                </div>
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Kapasitas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAreas.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground text-sm">Belum ada area kerja</TableCell></TableRow>
                      ) : filteredAreas.map(wa => (
                        <TableRow key={wa.id}>
                          <TableCell className="font-mono text-sm font-medium">{wa.code}</TableCell>
                          <TableCell className="font-medium">{wa.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{wa.location || "—"}</TableCell>
                          <TableCell>
                            <Badge className={typeBadgeColor(wa.type)}>{wa.type}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{wa.capacity ? `${wa.capacity} orang` : "—"}</TableCell>
                          <TableCell>
                            <Badge className={wa.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}>
                              {wa.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit("work-areas", wa)}><Edit className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => openDelete("work-areas", wa.id, wa.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </>
      )}

      {!selectedEntity && !loadingEntities && (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Pilih entity di atas untuk melihat dan mengelola struktur organisasinya</p>
        </div>
      )}

      {/* ── ADD / EDIT DIALOG ──────────────────────────────── */}
      <Dialog open={formDialog.open} onOpenChange={open => !saving && setFormDialog(p => ({ ...p, open }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {formDialog.data.id ? "Edit" : "Tambah"} {formTitles[formDialog.type]}
            </DialogTitle>
            <DialogDescription>
              {formDialog.data.id ? "Perbarui data" : "Isi form untuk menambahkan"} {formTitles[formDialog.type].toLowerCase()} baru
              {selectedEntity && ` untuk ${selectedEntity.name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {formDialog.type === "departments" && (
              <DeptForm data={formDialog.data} onChange={data => setFormDialog(p => ({ ...p, data }))} />
            )}
            {formDialog.type === "divisions" && (
              <DivisionForm data={formDialog.data} onChange={data => setFormDialog(p => ({ ...p, data }))} departments={departments} />
            )}
            {formDialog.type === "job-titles" && (
              <JobTitleForm data={formDialog.data} onChange={data => setFormDialog(p => ({ ...p, data }))} departments={departments} jobLevels={jobLevels} />
            )}
            {formDialog.type === "job-levels" && (
              <JobLevelForm data={formDialog.data} onChange={data => setFormDialog(p => ({ ...p, data }))} />
            )}
            {formDialog.type === "work-areas" && (
              <WorkAreaForm data={formDialog.data} onChange={data => setFormDialog(p => ({ ...p, data }))} />
            )}
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialog(p => ({ ...p, open: false }))} disabled={saving}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...</> : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRMATION ────────────────────────────── */}
      <AlertDialog open={deleteDialog.open} onOpenChange={open => !deleting && setDeleteDialog(p => ({ ...p, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {formTitles[deleteDialog.type]}?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus <strong>{deleteDialog.name}</strong>. Tindakan ini tidak dapat dibatalkan dan mungkin mempengaruhi data yang terhubung.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menghapus...</> : <><Trash2 className="h-4 w-4 mr-2" /> Hapus</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
