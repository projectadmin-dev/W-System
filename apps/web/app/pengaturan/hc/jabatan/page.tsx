'use client'

import { useState, useEffect } from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Header } from '@/components/header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Briefcase, Plus, Pencil, Trash2, Search } from 'lucide-react'

interface Position {
  id: string
  tenant_id: string
  entity_id: string
  branch_id: string | null
  department_id: string
  grade_id: string | null
  name: string
  code: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Department {
  id: string
  name: string
  code: string
}

export default function JabatanPage() {
  const [positions, setPositions] = useState<Position[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Position | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    department_id: '',
    grade_id: '',
    is_active: true,
  })

  useEffect(() => {
    fetchPositions()
    fetchDepartments()
  }, [])

  async function fetchPositions() {
    try {
      const res = await fetch('/api/hc/jabatan')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPositions(data)
    } catch (error) {
      console.error('Error fetching positions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchDepartments() {
    try {
      const res = await fetch('/api/hc/departemen')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setDepartments(data)
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  function openCreateDialog() {
    setEditingItem(null)
    setFormData({
      name: '',
      code: '',
      description: '',
      department_id: '',
      grade_id: '',
      is_active: true,
    })
    setDialogOpen(true)
  }

  function openEditDialog(position: Position) {
    setEditingItem(position)
    setFormData({
      name: position.name,
      code: position.code,
      description: position.description || '',
      department_id: position.department_id,
      grade_id: position.grade_id || '',
      is_active: position.is_active,
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    try {
      const url = editingItem ? `/api/hc/jabatan?id=${editingItem.id}` : '/api/hc/jabatan'
      const method = editingItem ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      if (!res.ok) throw new Error('Failed to save')
      
      await fetchPositions()
      setDialogOpen(false)
    } catch (error) {
      console.error('Error saving position:', error)
      alert('Gagal menyimpan jabatan')
    }
  }

  async function handleDelete(position: Position) {
    if (!confirm(`Hapus jabatan "${position.name}"?`)) return
    
    try {
      const res = await fetch(`/api/hc/jabatan?id=${position.id}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) throw new Error('Failed to delete')
      
      await fetchPositions()
    } catch (error) {
      console.error('Error deleting position:', error)
      alert('Gagal menghapus jabatan')
    }
  }

  const filteredPositions = positions.filter((pos) =>
    pos.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pos.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getDepartmentName = (deptId: string) => {
    const dept = departments.find((d) => d.id === deptId)
    return dept ? dept.name : 'Unknown'
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Jabatan</h1>
              <p className="text-muted-foreground">Kelola daftar jabatan dalam organisasi</p>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Jabatan
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari jabatan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Jabatan</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPositions.map((pos) => (
                    <TableRow key={pos.id}>
                      <TableCell className="font-mono text-sm">{pos.code}</TableCell>
                      <TableCell className="font-medium">{pos.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getDepartmentName(pos.department_id)}</Badge>
                      </TableCell>
                      <TableCell>
                        {pos.is_active ? (
                          <Badge variant="default">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(pos)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(pos)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredPositions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Belum ada jabatan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Jabatan' : 'Tambah Jabatan'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update informasi jabatan'
                : 'Tambah jabatan baru ke organisasi'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Kode Jabatan</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Contoh: POS-IT-001"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Nama Jabatan</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Senior Developer"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi jabatan"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="department_id">Departemen</Label>
              <select
                id="department_id"
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="">Pilih Departemen</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Aktif</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit}>
              {editingItem ? 'Update' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
