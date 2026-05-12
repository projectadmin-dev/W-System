"use client"

import { useState, useMemo } from "react"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import {
  Building2, ChevronRight, ChevronDown, Search, Plus, Edit, Trash2, Loader2,
} from "lucide-react"
import type { Department, Division, JobTitle, JobLevel, WorkArea } from "./org-structure/data"
import {
  initialDepartments, initialDivisions, initialJobTitles, initialJobLevels, initialWorkAreas,
  getCompanyName, formatRupiah,
} from "./org-structure/data"

type OrgTab = "departments" | "divisions" | "job-titles" | "job-levels" | "work-areas"
type Entity = { id: string; code: string; name: string }

interface OrgStructureTabProps {
  entity: Entity | null
}

export function OrgStructureTab({ entity }: OrgStructureTabProps) {
  const [activeTab, setActiveTab] = useState<OrgTab>("departments")
  const [search, setSearch] = useState("")
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({})

  // CRUD State
  const [departments, setDepartments] = useState(initialDepartments)
  const [divisions, setDivisions] = useState(initialDivisions)
  const [jobTitles, setJobTitles] = useState(initialJobTitles)
  const [jobLevels, setJobLevels] = useState(initialJobLevels)
  const [workAreas, setWorkAreas] = useState(initialWorkAreas)

  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; type: OrgTab; id: string; name: string }>({ show: false, type: "departments", id: "", name: "" })

  const toggleDept = (id: string) =>
    setExpandedDepts(prev => ({ ...prev, [id]: !prev[id] }))

  const handleDelete = (type: OrgTab, id: string, name: string) => {
    setDeleteConfirm({ show: true, type, id, name })
  }

  const confirmDelete = () => {
    const { type, id } = deleteConfirm
    if (type === "departments") setDepartments(departments.filter(d => d.id !== id))
    else if (type === "divisions") setDivisions(divisions.filter(d => d.id !== id))
    else if (type === "job-titles") setJobTitles(jobTitles.filter(j => j.id !== id))
    else if (type === "job-levels") setJobLevels(jobLevels.filter(l => l.id !== id))
    else if (type === "work-areas") setWorkAreas(workAreas.filter(w => w.id !== id))
    setDeleteConfirm({ show: false, type, id: "", name: "" })
  }

  if (!entity) return null

  const filteredDepartments = useMemo(() => {
    if (!search) return departments
    const s = search.toLowerCase()
    return departments.filter(d =>
      d.name.toLowerCase().includes(s) || d.code.toLowerCase().includes(s)
    )
  }, [search, departments])

  const filteredDivisions = useMemo(() => {
    if (!search) return divisions
    const s = search.toLowerCase()
    return divisions.filter(d =>
      d.name.toLowerCase().includes(s) || d.code.toLowerCase().includes(s)
    )
  }, [search, divisions])

  const filteredJobTitles = useMemo(() => {
    if (!search) return jobTitles
    const s = search.toLowerCase()
    return jobTitles.filter(j =>
      j.name.toLowerCase().includes(s) || j.code.toLowerCase().includes(s)
    )
  }, [search, jobTitles])

  const filteredJobLevels = useMemo(() => {
    if (!search) return jobLevels
    const s = search.toLowerCase()
    return jobLevels.filter(l =>
      l.name.toLowerCase().includes(s) || l.code.toLowerCase().includes(s)
    )
  }, [search, jobLevels])

  const filteredWorkAreas = useMemo(() => {
    if (!search) return workAreas
    const s = search.toLowerCase()
    return workAreas.filter(w =>
      w.name.toLowerCase().includes(s) || w.code.toLowerCase().includes(s)
    )
  }, [search, workAreas])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{entity.name}</h3>
          <p className="text-sm text-muted-foreground">{entity.code} — Struktur Organisasi</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari..."
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
          <Button className="gap-2"><Plus className="h-4 w-4" /> Tambah Departemen</Button>
          {filteredDepartments.map(dept => (
            <Card key={dept.id}>
              <Collapsible open={expandedDepts[dept.id] || false} onOpenChange={() => toggleDept(dept.id)}>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <div className="flex items-center gap-2 flex-1">
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
                    <Button variant="ghost" size="sm" onClick={() => handleDelete("departments", dept.id, dept.name)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    <div className="pl-8 space-y-1 text-sm">
                      <div><span className="text-muted-foreground">Head:</span> {dept.head || "—"}</div>
                      <div><span className="text-muted-foreground">Deskripsi:</span> {dept.description || "—"}</div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
          {filteredDepartments.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Tidak ada data</p>}
        </TabsContent>

        {/* Divisions */}
        <TabsContent value="divisions" className="space-y-4 mt-4">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Tambah Divisi</Button>
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
                      <TableCell className="text-right flex justify-end gap-1">
                        <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete("divisions", div.id, div.name)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Job Titles */}
        <TabsContent value="job-titles" className="space-y-4 mt-4">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Tambah Jabatan</Button>
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
                  {filteredJobTitles.map(jt => (
                    <TableRow key={jt.id}>
                      <TableCell className="font-mono text-sm">{jt.code}</TableCell>
                      <TableCell className="font-medium">{jt.name}</TableCell>
                      <TableCell>{getCompanyName(jt.companyId)}</TableCell>
                      <TableCell className="text-right flex justify-end gap-1">
                        <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete("job-titles", jt.id, jt.name)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Job Levels */}
        <TabsContent value="job-levels" className="space-y-4 mt-4">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Tambah Level</Button>
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobLevels.map(lv => (
                    <TableRow key={lv.id}>
                      <TableCell className="font-mono text-sm">{lv.code}</TableCell>
                      <TableCell className="font-medium">{lv.name}</TableCell>
                      <TableCell>{lv.grade}</TableCell>
                      <TableCell className="text-right flex justify-end gap-1">
                        <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete("job-levels", lv.id, lv.name)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Areas */}
        <TabsContent value="work-areas" className="space-y-4 mt-4">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Tambah Area Kerja</Button>
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
                      <TableCell className="text-right flex justify-end gap-1">
                        <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete("work-areas", wa.id, wa.name)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm.show} onOpenChange={(show) => !show && setDeleteConfirm({ ...deleteConfirm, show: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus <strong>{deleteConfirm.name}</strong>. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              <Trash2 className="h-4 w-4 mr-2" /> Hapus
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
