"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from "@workspace/ui/components/select"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import {
  Building2, GitBranch, Search, Plus, Edit, Trash2,
  ChevronRight, ChevronDown, ListTree, Loader2,
} from "lucide-react"
import type { Department, Division, JobTitle, JobLevel, WorkArea } from "../org-structure/data"
import {
  initialDepartments, initialDivisions, initialJobTitles, initialJobLevels, initialWorkAreas,
  getCompanyName, formatRupiah,
} from "../org-structure/data"

// ─── Entity list types ────────────────────────────────────────────────────────

type EntityStatus = "active" | "inactive" | "Active" | "Inactive"

interface Entity {
  id: string
  code: string
  name: string
  type: string
  status: EntityStatus
  settings?: {
    city?: string
    [key: string]: unknown
  }
}

// ─── Entity List Tab ──────────────────────────────────────────────────────────

function EntityListTab() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteDialog, setDeleteDialog] = useState<{ show: boolean; entity: Entity | null; deleting: boolean }>({ show: false, entity: null, deleting: false })
  const rowsPerPage = 10

  useEffect(() => {
    fetch("/api/entities")
      .then(r => r.json())
      .then(data => {
        setEntities(Array.isArray(data) ? data : (data.data ?? []))
        setLoading(false)
      })
      .catch(() => { setEntities([]); setLoading(false) })
  }, [])

  async function handleDelete(entity: Entity) {
    setDeleteDialog({ show: true, entity, deleting: false })
  }

  async function confirmDelete() {
    if (!deleteDialog.entity) return
    setDeleteDialog(prev => ({ ...prev, deleting: true }))
    try {
      const res = await fetch(`/api/entities/${deleteDialog.entity.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) {
        setEntities(entities.filter(e => e.id !== deleteDialog.entity!.id))
        setDeleteDialog({ show: false, entity: null, deleting: false })
      } else {
        alert('Gagal menghapus: ' + result.error)
      }
    } catch (error) {
      alert('Error: ' + (error as Error).message)
    } finally {
      setDeleteDialog(prev => ({ ...prev, deleting: false }))
    }
  }

  const filtered = useMemo(() => {
    let result = [...entities]
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(e => e.code.toLowerCase().includes(s) || e.name.toLowerCase().includes(s))
    }
    if (statusFilter !== "ALL") {
      result = result.filter(e => e.status.toLowerCase() === statusFilter.toLowerCase())
    }
    if (typeFilter !== "ALL") {
      result = result.filter(e => e.type.toLowerCase() === typeFilter.toLowerCase())
    }
    return result
  }, [entities, search, statusFilter, typeFilter])

  const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1
  const paginated = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  const activeCount = entities.filter(e => ["active", "Active"].includes(e.status)).length
  const holdingCount = entities.filter(e => e.type === "holding").length
  const subsidiaryCount = entities.filter(e => e.type === "subsidiary").length

  function typeBadge(type: string) {
    if (type === "holding") return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Holding</Badge>
    if (type === "subsidiary") return <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">Subsidiary</Badge>
    return <Badge variant="outline">{type}</Badge>
  }

  function statusBadge(status: EntityStatus) {
    const isActive = ["active", "Active"].includes(status)
    return isActive
      ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
      : <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Inactive</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header + Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Manajemen Entity</h3>
          <p className="text-sm text-muted-foreground">Kelola holding dan subsidiary</p>
        </div>
        <Button asChild>
          <Link href="/hr/master/entity/add"><Plus className="h-4 w-4 mr-2" /> Tambah Entity</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Entity</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{loading ? "—" : entities.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Aktif</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-600">{loading ? "—" : activeCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Holding</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{loading ? "—" : holdingCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Subsidiary</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-violet-600">{loading ? "—" : subsidiaryCount}</div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari kode atau nama..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipe" /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Tipe Entity</SelectLabel>
              <SelectItem value="ALL">Semua Tipe</SelectItem>
              <SelectItem value="holding">Holding</SelectItem>
              <SelectItem value="subsidiary">Subsidiary</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Status</SelectLabel>
              <SelectItem value="ALL">Semua</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Entity</CardTitle>
          <CardDescription>Semua holding dan subsidiary yang terdaftar</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Tidak ada data entity</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(entity => (
                  <TableRow key={entity.id}>
                    <TableCell className="font-mono text-sm">{entity.code}</TableCell>
                    <TableCell className="font-medium">{entity.name}</TableCell>
                    <TableCell>{typeBadge(entity.type)}</TableCell>
                    <TableCell>{statusBadge(entity.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/hr/master/entity/${entity.code}`}>Detail</Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/hr/master/entity/${entity.code}/edit`}>Edit</Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(entity)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {paginated.length} dari {filtered.length} entity
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                <span className="text-sm">Hal {currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.show} onOpenChange={(show) => !deleteDialog.deleting && setDeleteDialog({ ...deleteDialog, show })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Entity?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus entity <strong>{deleteDialog.entity?.name}</strong> ({deleteDialog.entity?.code}). Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel disabled={deleteDialog.deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteDialog.deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteDialog.deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {deleteDialog.deleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Org Structure Tab ────────────────────────────────────────────────────────

type OrgTab = "departments" | "divisions" | "job-titles" | "job-levels" | "work-areas"

function OrgStructureTab() {
  const [activeTab, setActiveTab] = useState<OrgTab>("departments")
  const [search, setSearch] = useState("")
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({})

  const toggleDept = (id: string) =>
    setExpandedDepts(prev => ({ ...prev, [id]: !prev[id] }))

  const filteredDepartments = useMemo(() => {
    if (!search) return initialDepartments
    const s = search.toLowerCase()
    return initialDepartments.filter(d =>
      d.name.toLowerCase().includes(s) ||
      d.code.toLowerCase().includes(s) ||
      (d.head && d.head.toLowerCase().includes(s))
    )
  }, [search])

  const filteredDivisions = useMemo(() => {
    if (!search) return initialDivisions
    const s = search.toLowerCase()
    return initialDivisions.filter(d =>
      d.name.toLowerCase().includes(s) ||
      d.code.toLowerCase().includes(s) ||
      getCompanyName(d.companyId).toLowerCase().includes(s)
    )
  }, [search])

  const filteredJobTitles = useMemo(() => {
    if (!search) return initialJobTitles
    const s = search.toLowerCase()
    return initialJobTitles.filter(j =>
      j.name.toLowerCase().includes(s) ||
      j.code.toLowerCase().includes(s) ||
      getCompanyName(j.companyId).toLowerCase().includes(s)
    )
  }, [search])

  const filteredJobLevels = useMemo(() => {
    if (!search) return initialJobLevels
    const s = search.toLowerCase()
    return initialJobLevels.filter(l =>
      l.name.toLowerCase().includes(s) ||
      l.code.toLowerCase().includes(s) ||
      l.grade.toLowerCase().includes(s)
    )
  }, [search])

  const filteredWorkAreas = useMemo(() => {
    if (!search) return initialWorkAreas
    const s = search.toLowerCase()
    return initialWorkAreas.filter(w =>
      w.name.toLowerCase().includes(s) ||
      w.code.toLowerCase().includes(s) ||
      w.location.toLowerCase().includes(s)
    )
  }, [search])

  function statusBadge(status: string) {
    return status === "Active"
      ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
      : <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Inactive</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari departemen, divisi, jabatan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as OrgTab)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="departments">Departemen</TabsTrigger>
          <TabsTrigger value="divisions">Divisi</TabsTrigger>
          <TabsTrigger value="job-titles">Jabatan</TabsTrigger>
          <TabsTrigger value="job-levels">Level</TabsTrigger>
          <TabsTrigger value="work-areas">Area Kerja</TabsTrigger>
        </TabsList>

        {/* Departments */}
        <TabsContent value="departments" className="space-y-4 mt-4">
          {filteredDepartments.map(dept => (
            <Card key={dept.id}>
              <Collapsible open={expandedDepts[dept.id] || false} onOpenChange={() => toggleDept(dept.id)}>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {expandedDepts[dept.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <Building2 className="h-5 w-5 text-blue-500" />
                    <div>
                      <CardTitle className="text-base">{dept.name}</CardTitle>
                      <CardDescription>{dept.code} • {dept.employees} karyawan</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    <div className="pl-8 space-y-1 text-sm">
                      <div><span className="text-muted-foreground">Head:</span> {dept.head || "—"}</div>
                      <div><span className="text-muted-foreground">Deskripsi:</span> {dept.description || "—"}</div>
                      <div className="pt-1">{statusBadge(dept.status)}</div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
          {filteredDepartments.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Tidak ada data</p>}
        </TabsContent>

        {/* Divisions */}
        <TabsContent value="divisions" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Perusahaan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDivisions.map(div => (
                    <TableRow key={div.id}>
                      <TableCell className="font-mono text-sm">{div.code}</TableCell>
                      <TableCell className="font-medium">{div.name}</TableCell>
                      <TableCell>{getCompanyName(div.companyId)}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Job Titles */}
        <TabsContent value="job-titles" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Perusahaan</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobTitles.map(jt => (
                    <TableRow key={jt.id}>
                      <TableCell className="font-mono text-sm">{jt.code}</TableCell>
                      <TableCell className="font-medium">{jt.name}</TableCell>
                      <TableCell>{getCompanyName(jt.companyId)}</TableCell>
                      <TableCell>{jt.levelId}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Job Levels */}
        <TabsContent value="job-levels" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Range Gaji</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobLevels.map(lv => (
                    <TableRow key={lv.id}>
                      <TableCell className="font-mono text-sm">{lv.code}</TableCell>
                      <TableCell className="font-medium">{lv.name}</TableCell>
                      <TableCell>{lv.grade}</TableCell>
                      <TableCell className="font-mono text-sm">{formatRupiah(lv.minSalary)} – {formatRupiah(lv.maxSalary)}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Areas */}
        <TabsContent value="work-areas" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkAreas.map(wa => (
                    <TableRow key={wa.id}>
                      <TableCell className="font-mono text-sm">{wa.code}</TableCell>
                      <TableCell className="font-medium">{wa.name}</TableCell>
                      <TableCell>{wa.location}</TableCell>
                      <TableCell><Badge variant="outline">{wa.type}</Badge></TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EntityManagementPage() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entity Management</h1>
          <p className="text-muted-foreground mt-1">Kelola entitas perusahaan dan struktur organisasi</p>
        </div>
        <Button asChild>
          <Link href="/hr/master/entity/add">
            <Plus className="h-4 w-4 mr-2" /> Tambah Entity
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="entities">
        <TabsList>
          <TabsTrigger value="entities" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Daftar Entity
          </TabsTrigger>
          <TabsTrigger value="org-structure" className="flex items-center gap-2">
            <ListTree className="h-4 w-4" /> Struktur Organisasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="mt-6">
          <EntityListTab />
        </TabsContent>

        <TabsContent value="org-structure" className="mt-6">
          <OrgStructureTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
