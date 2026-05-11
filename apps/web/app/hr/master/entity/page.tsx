"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useState, useMemo, useEffect } from "react"
import {
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Building2,
  Search,
} from "lucide-react"

// Entity types
type EntityType = "HO" | "BO"
type EntityStatus = "Active" | "Inactive"

interface Entity {
  id: string
  code: string
  name: string
  type: EntityType
  city: string
  status: EntityStatus
}

export default function EntityListPage() {
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [typeFilter, setTypeFilter] = useState<string>("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  // Fetch real data from API
  useEffect(() => {
    fetch("/api/entities")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setEntities(data.data || [])
        setLoading(false)
      })
      .catch(() => {
        // Fallback to empty
        setEntities([])
        setLoading(false)
      })
  }, [])

  const cities = useMemo(() => {
    const all = entities.map((e) => e.city)
    return Array.from(new Set(all))
  }, [entities])

  const filteredEntities = useMemo(() => {
    let result = [...entities]
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(
        (e) =>
          e.code.toLowerCase().includes(s) ||
          e.name.toLowerCase().includes(s)
      )
    }
    if (statusFilter !== "ALL") {
      result = result.filter((e) => e.status === statusFilter)
    }
    if (typeFilter !== "ALL") {
      result = result.filter((e) => e.type === typeFilter)
    }
    return result
  }, [entities, search, statusFilter, typeFilter])

  const totalPages = Math.ceil(filteredEntities.length / rowsPerPage) || 1
  const paginatedEntities = filteredEntities.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  function getStatusBadge(status: EntityStatus) {
    switch (status) {
      case "Active":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Active
          </span>
        )
      case "Inactive":
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Inactive
          </span>
        )
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium">{status}</span>
    }
  }

  function getTypeLabel(type: EntityType) {
    return type === "HO" ? "Kantor Pusat" : "Kantor Cabang"
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Entity Management</h1>
        <p className="text-muted-foreground">Kelola cabang dan unit bisnis</p>
      </div>

      {/* Action Bar */}
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/hr/master/entity/add">+ Tambah Entity</Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "—" : entities.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Semua data</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Entity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "—" : entities.filter((e) => e.status === "Active").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Aktif saat ini</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-card p-4 rounded-lg border">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              placeholder="Cari Kode atau Nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Tipe Entity</SelectLabel>
                  <SelectItem value="ALL">Semua Tipe</SelectItem>
                  <SelectItem value="HO">Kantor Pusat (HO)</SelectItem>
                  <SelectItem value="BO">Kantor Cabang (BO)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Status</SelectLabel>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Kota" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Kota</SelectLabel>
                  <SelectItem value="ALL">Semua Kota</SelectItem>
                  {cities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Entity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Entity</CardTitle>
          <CardDescription>
            Daftar entity yang terdaftar dalam sistem WIT.ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
          ) : paginatedEntities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Tidak ada data entity
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Kota</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEntities.map((entity) => (
                  <TableRow key={entity.id}>
                    <TableCell className="font-medium">{entity.code}</TableCell>
                    <TableCell>{entity.name}</TableCell>
                    <TableCell>{getTypeLabel(entity.type)}</TableCell>
                    <TableCell>{entity.city}</TableCell>
                    <TableCell>{getStatusBadge(entity.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/hr/master/entity/${entity.id}`}>Detail</Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/hr/master/entity/${entity.id}/edit`}>Edit</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Menampilkan {paginatedEntities.length} dari {filteredEntities.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm font-medium">
                Page {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
