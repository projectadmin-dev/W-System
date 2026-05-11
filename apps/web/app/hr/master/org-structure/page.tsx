"use client"

import { useState, useMemo } from "react"
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
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  ChevronRight, ChevronDown, Building2, Search, Plus, Edit, Trash2,
} from "lucide-react"
import type { Department, Division, JobTitle, JobLevel, WorkArea } from "./data"
import {
  companies, initialDepartments, initialDivisions, initialJobTitles, initialJobLevels, initialWorkAreas,
  getCompanyName, getCompanyCode, formatRupiah,
} from "./data"

type OrgTab = "departments" | "divisions" | "job-titles" | "job-levels" | "work-areas"

export default function OrgStructurePage() {
  const [activeTab, setActiveTab] = useState<OrgTab>("departments")
  const [search, setSearch] = useState("")
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({})

  const toggleDept = (id: string) =>
    setExpandedDepts((prev) => ({ ...prev, [id]: !prev[id] }))

  // Filter by search
  const filteredDepartments = useMemo(() => {
    if (!search) return initialDepartments
    const s = search.toLowerCase()
    return initialDepartments.filter(
      (d) =>
        d.name.toLowerCase().includes(s) ||
        d.code.toLowerCase().includes(s) ||
        (d.head && d.head.toLowerCase().includes(s))
    )
  }, [search])

  const filteredDivisions = useMemo(() => {
    if (!search) return initialDivisions
    const s = search.toLowerCase()
    return initialDivisions.filter(
      (d) =>
        d.name.toLowerCase().includes(s) ||
        d.code.toLowerCase().includes(s) ||
        getCompanyName(d.companyId).toLowerCase().includes(s)
    )
  }, [search])

  const filteredJobTitles = useMemo(() => {
    if (!search) return initialJobTitles
    const s = search.toLowerCase()
    return initialJobTitles.filter(
      (j) =>
        j.name.toLowerCase().includes(s) ||
        j.code.toLowerCase().includes(s) ||
        getCompanyName(j.companyId).toLowerCase().includes(s)
    )
  }, [search])

  const filteredJobLevels = useMemo(() => {
    if (!search) return initialJobLevels
    const s = search.toLowerCase()
    return initialJobLevels.filter(
      (l) =>
        l.name.toLowerCase().includes(s) ||
        l.code.toLowerCase().includes(s) ||
        l.grade.toLowerCase().includes(s)
    )
  }, [search])

  const filteredWorkAreas = useMemo(() => {
    if (!search) return initialWorkAreas
    const s = search.toLowerCase()
    return initialWorkAreas.filter(
      (w) =>
        w.name.toLowerCase().includes(s) ||
        w.code.toLowerCase().includes(s) ||
        w.location.toLowerCase().includes(s)
    )
  }, [search])

  function getStatusBadge(status: string) {
    switch (status) {
      case "Active": return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Active</Badge>
      case "Inactive": return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Inactive</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Structure</h1>
          <p className="text-muted-foreground">Struktur organisasi perusahaan</p>
        </div>
        <Button asChild>
          <a href="/hr/master/org-structure/add">+ Add New</a>
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search departments, divisions, titles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OrgTab)}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="divisions">Divisions</TabsTrigger>
          <TabsTrigger value="job-titles">Job Titles</TabsTrigger>
          <TabsTrigger value="job-levels">Job Levels</TabsTrigger>
          <TabsTrigger value="work-areas">Work Areas</TabsTrigger>
        </TabsList>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          {filteredDepartments.map((dept) => (
            <Card key={dept.id}>
              <Collapsible
                open={expandedDepts[dept.id] || false}
                onOpenChange={() => toggleDept(dept.id)}
              >
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        {expandedDepts[dept.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <Building2 className="h-5 w-5 text-blue-500" />
                    <div>
                      <CardTitle className="text-base">{dept.name}</CardTitle>
                      <CardDescription>{dept.code} • {dept.employees} employees</CardDescription>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/hr/master/entity/${dept.code}/edit`}><Edit className="h-4 w-4" /></a>
                      </Button>
                      <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pb-4">
                    <div className="pl-8 space-y-2 text-sm">
                      <div><strong>Head:</strong> {dept.head || "—"}</div>
                      <div><strong>Description:</strong> {dept.description || "—"}</div>
                      <div className="flex gap-2 mt-2">
                        {getStatusBadge(dept.status)}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </TabsContent>

        {/* Divisions Tab */}
        <TabsContent value="divisions" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDivisions.map((div) => (
                <TableRow key={div.id}>
                  <TableCell className="font-medium">{div.code}</TableCell>
                  <TableCell>{div.name}</TableCell>
                  <TableCell>{getCompanyName(div.companyId)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/hr/master/entity/${div.code}/edit`}><Edit className="h-4 w-4" /></a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Job Titles Tab */}
        <TabsContent value="job-titles" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobTitles.map((jt) => (
                <TableRow key={jt.id}>
                  <TableCell className="font-medium">{jt.code}</TableCell>
                  <TableCell>{jt.name}</TableCell>
                  <TableCell>{getCompanyName(jt.companyId)}</TableCell>
                  <TableCell>{jt.levelId}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/hr/master/entity/${jt.code}/edit`}><Edit className="h-4 w-4" /></a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Job Levels Tab */}
        <TabsContent value="job-levels" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Salary Range</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobLevels.map((lv) => (
                <TableRow key={lv.id}>
                  <TableCell className="font-medium">{lv.code}</TableCell>
                  <TableCell>{lv.name}</TableCell>
                  <TableCell>{lv.grade}</TableCell>
                  <TableCell>{formatRupiah(lv.minSalary)} – {formatRupiah(lv.maxSalary)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/hr/master/entity/${lv.code}/edit`}><Edit className="h-4 w-4" /></a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        {/* Work Areas Tab */}
        <TabsContent value="work-areas" className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkAreas.map((wa) => (
                <TableRow key={wa.id}>
                  <TableCell className="font-medium">{wa.code}</TableCell>
                  <TableCell>{wa.name}</TableCell>
                  <TableCell>{wa.location}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{wa.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/hr/master/entity/${wa.code}/edit`}><Edit className="h-4 w-4" /></a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  )
}
