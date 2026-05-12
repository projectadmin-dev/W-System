"use client"

import { useState, useEffect } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Progress } from "@workspace/ui/components/progress"
import { Layers, Users, FolderKanban } from "lucide-react"

interface EmployeeResource {
  id: string
  name: string
  role: string
  assignedProjects: string[]
  totalAllocation: number
}

interface ProjectResource {
  id: string
  name: string
  pm: string
  teamSize: number
  allocatedHours: number
  percentComplete: number
  status: "On Track" | "At Risk" | "Delayed"
}

const mockEmployees: EmployeeResource[] = [
  { id: "EMP-001", name: "Andi Pratama", role: "Backend Developer", assignedProjects: ["ERP System", "HRIS Upgrade", "Mobile App"], totalAllocation: 120 },
  { id: "EMP-002", name: "Budi Santoso", role: "Frontend Developer", assignedProjects: ["HRIS Upgrade", "E-Commerce Platform"], totalAllocation: 85 },
  { id: "EMP-003", name: "Citra Lestari", role: "QA Engineer", assignedProjects: ["ERP System"], totalAllocation: 45 },
  { id: "EMP-004", name: "Dewi Rahayu", role: "UI/UX Designer", assignedProjects: ["Mobile App", "E-Commerce Platform"], totalAllocation: 65 },
  { id: "EMP-005", name: "Eko Prasetyo", role: "Backend Developer", assignedProjects: ["ERP System", "BI Dashboard", "Mobile App", "E-Commerce Platform"], totalAllocation: 135 },
  { id: "EMP-006", name: "Fani Susanti", role: "Backend Developer", assignedProjects: ["BI Dashboard", "HRIS Upgrade"], totalAllocation: 80 },
]

const mockProjects: ProjectResource[] = [
  { id: "PRJ-001", name: "ERP System", pm: "Andi Pratama", teamSize: 5, allocatedHours: 320, percentComplete: 65, status: "On Track" },
  { id: "PRJ-002", name: "HRIS Upgrade", pm: "Budi Santoso", teamSize: 4, allocatedHours: 180, percentComplete: 40, status: "On Track" },
  { id: "PRJ-003", name: "Mobile App", pm: "Dewi Rahayu", teamSize: 3, allocatedHours: 140, percentComplete: 25, status: "At Risk" },
  { id: "PRJ-004", name: "E-Commerce Platform", pm: "Fani Susanti", teamSize: 4, allocatedHours: 260, percentComplete: 55, status: "On Track" },
  { id: "PRJ-005", name: "BI Dashboard", pm: "Citra Lestari", teamSize: 2, allocatedHours: 80, percentComplete: 10, status: "Delayed" },
]

function statusBadge(status: ProjectResource["status"]) {
  const map: Record<string, string> = {
    "On Track": "bg-emerald-100 text-emerald-700",
    "At Risk": "bg-amber-100 text-amber-700",
    "Delayed": "bg-red-100 text-red-700",
  }
  return <Badge className={`${map[status]} hover:${map[status]}`}>{status}</Badge>
}

function allocationBadge(pct: number) {
  const color = pct > 100 ? "text-red-600" : pct >= 80 ? "text-amber-600" : "text-emerald-600"
  return <span className={`font-mono font-semibold text-sm ${color}`}>{pct}%</span>
}

export default function ResourceAllocationPage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => { setTimeout(() => setLoading(false), 500) }, [])

  const totalAssigned = mockEmployees.reduce((s, e) => s + e.assignedProjects.length, 0)
  const avgAllocation = Math.round(mockEmployees.reduce((s, e) => s + e.totalAllocation, 0) / mockEmployees.length)

  if (loading) return <div className="p-6 flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Memuat data...</p></div>

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resource Allocation</h1>
        <p className="text-muted-foreground mt-1">Distribusi manpower per karyawan dan per proyek</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><FolderKanban className="h-4 w-4" /> Active Projects</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{mockProjects.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Total Assignments</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalAssigned}</div><p className="text-xs text-muted-foreground">across all projects</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Layers className="h-4 w-4" /> Avg Allocation</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${avgAllocation > 100 ? "text-red-600" : "text-emerald-600"}`}>{avgAllocation}%</div></CardContent></Card>
      </div>

      <Tabs defaultValue="by-employee">
        <TabsList>
          <TabsTrigger value="by-employee">Per Karyawan</TabsTrigger>
          <TabsTrigger value="by-project">Per Proyek</TabsTrigger>
        </TabsList>

        <TabsContent value="by-employee" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alokasi Per Karyawan</CardTitle>
              <CardDescription>Proyek yang sedang dikerjakan per karyawan</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIK</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned Projects</TableHead>
                    <TableHead>Total Allocation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockEmployees.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-sm text-muted-foreground">{emp.id}</TableCell>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{emp.role}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {emp.assignedProjects.map(p => (
                            <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{allocationBadge(emp.totalAllocation)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-project" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alokasi Per Proyek</CardTitle>
              <CardDescription>Resource dan progress per proyek aktif</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Project Manager</TableHead>
                    <TableHead>Team Size</TableHead>
                    <TableHead>Allocated Hours</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockProjects.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm text-muted-foreground">{p.id}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.pm}</TableCell>
                      <TableCell className="text-center">{p.teamSize} orang</TableCell>
                      <TableCell className="font-mono">{p.allocatedHours}h</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={p.percentComplete} className="h-1.5 w-20" />
                          <span className="text-xs text-muted-foreground">{p.percentComplete}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
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
