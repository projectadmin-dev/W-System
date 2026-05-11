"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
import Link from "next/link"
import { useState, useMemo } from "react"
import { Search, Users, UserCheck, UserX, UserCog } from "lucide-react"

const mockUsers = [
  { id: "usr-001", name: "John Doe", email: "john.doe@wit.id", position: "Senior Developer", department: "Engineering", joinDate: "2023-01-15", status: "Active" },
  { id: "usr-002", name: "Jane Smith", email: "jane.smith@wit.id", position: "HR Manager", department: "Human Resources", joinDate: "2022-06-01", status: "Active" },
  { id: "usr-003", name: "Bob Wilson", email: "bob.wilson@wit.id", position: "Sales Executive", department: "Sales", joinDate: "2024-03-10", status: "On Probation" },
  { id: "usr-004", name: "Alice Chen", email: "alice.chen@wit.id", position: "UX Designer", department: "Design", joinDate: "2023-08-20", status: "Active" },
  { id: "usr-005", name: "Michael Brown", email: "michael.brown@wit.id", position: "DevOps Engineer", department: "Engineering", joinDate: "2021-11-05", status: "Active" },
  { id: "usr-006", name: "Sarah Lee", email: "sarah.lee@wit.id", position: "Accountant", department: "Finance", joinDate: "2022-02-14", status: "On Leave" },
]

export default function UserManagementPage() {
  const [search, setSearch] = useState("")

  const filteredUsers = useMemo(() => {
    if (!search) return mockUsers
    const s = search.toLowerCase()
    return mockUsers.filter(u =>
      u.name.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      u.position.toLowerCase().includes(s) ||
      u.department.toLowerCase().includes(s)
    )
  }, [search])

  const stats = {
    total: mockUsers.length,
    active: mockUsers.filter(u => u.status === "Active").length,
    probation: mockUsers.filter(u => u.status === "On Probation").length,
    leave: mockUsers.filter(u => u.status === "On Leave").length,
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "Active":
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">Active</Badge>
      case "On Probation":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700">Probation</Badge>
      case "On Leave":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Leave</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Kelola profil karyawan dengan informasi HR lengkap</p>
      </div>

      {/* Scorecards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Seluruh karyawan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Status aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Probation</CardTitle>
            <UserCog className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.probation}</div>
            <p className="text-xs text-muted-foreground">Masa percobaan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">On Leave</CardTitle>
            <UserX className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leave}</div>
            <p className="text-xs text-muted-foreground">Sedang cuti</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nama, email, posisi, atau departemen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline">Import CSV</Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Daftar Karyawan ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Posisi</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Bergabung</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://ui-avatars.com/api/?name=${user.name}&background=random`} />
                        <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.position}</TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>{user.joinDate}</TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/hr/master/users/${user.id}`}>View Profile</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
