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
import { TrendingUp, Plus, Pencil, Trash2, Search } from 'lucide-react'

interface JobGrade {
  id: string
  tenant_id: string
  entity_id: string
  branch_id: string | null
  code: string
  name: string
  level: number
  salary_min: number
  salary_mid: number
  salary_max: number
  leave_quota: number
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function GradePage() {
  const [grades, setGrades] = useState<JobGrade[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<JobGrade | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    level: 1,
    salary_min: '',
    salary_mid: '',
    salary_max: '',
    leave_quota: 12,
    is_active: true,
  })

  useEffect(() => {
    fetchGrades()
  }, [])

  async function fetchGrades() {
    try {
      const res = await fetch('/api/hc/grade')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setGrades(data)
    } catch (error) {
      console.error('Error fetching job grades:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingItem(null)
    setFormData({
      name: '',
      code: '',
      description: '',
      level: 1,
      salary_min: '',
      salary_mid: '',
      salary_max: '',
      leave_quota: 12,
      is_active: true,
    })
    setDialogOpen(true)
  }

  function openEditDialog(grade: JobGrade) {
    setEditingItem(grade)
    setFormData({
      name: grade.name,
      code: grade.code,
      description: grade.description || '',
      level: grade.level,
      salary_min: grade.salary_min.toString(),
      salary_mid: grade.salary_mid.toString(),
      salary_max: grade.salary_max.toString(),
      leave_quota: grade.leave_quota,
      is_active: grade.is_active,
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    try {
      const url = editingItem ? `/api/hc/grade?id=${editingItem.id}` : '/api/hc/grade'
      const method = editingItem ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          level: parseInt(formData.level.toString()),
          salary_min: parseFloat(formData.salary_min) || 0,
          salary_mid: parseFloat(formData.salary_mid) || 0,
          salary_max: parseFloat(formData.salary_max) || 0,
          leave_quota: parseInt(formData.leave_quota.toString()),
        }),
      })
      
      if (!res.ok) throw new Error('Failed to save')
      
      await fetchGrades()
      setDialogOpen(false)
    } catch (error) {
      console.error('Error saving job grade:', error)
      alert('Gagal menyimpan grade')
    }
  }

  async function handleDelete(grade: JobGrade) {
    if (!confirm(`Hapus grade "${grade.name}"?`)) return
    
    try {
      const res = await fetch(`/api/hc/grade?id=${grade.id}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) throw new Error('Failed to delete')
      
      await fetchGrades()
    } catch (error) {
      console.error('Error deleting job grade:', error)
      alert('Gagal menghapus grade')
    }
  }

  const filteredGrades = grades.filter((grade) =>
    grade.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    grade.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Grade & Matrix</h1>
              <p className="text-muted-foreground">Kelola job grade dan salary matrix</p>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Grade
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari grade..."
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
                    <TableHead>Nama Grade</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Salary Range</TableHead>
                    <TableHead>Leave Quota</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGrades.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell className="font-mono text-sm">{grade.code}</TableCell>
                      <TableCell className="font-medium">{grade.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Level {grade.level}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Min: {formatCurrency(grade.salary_min)}</span>
                          <span className="text-muted-foreground">Max: {formatCurrency(grade.salary_max)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{grade.leave_quota} hari</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(grade)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(grade)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredGrades.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Belum ada job grade</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Grade' : 'Tambah Grade'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update informasi job grade'
                : 'Tambah job grade baru'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Kode Grade</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Contoh: G1"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Nama Grade</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Junior Staff"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi grade"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="level">Level</Label>
                <Input
                  id="level"
                  type="number"
                  min="1"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="leave_quota">Quota Cuti (hari/tahun)</Label>
                <Input
                  id="leave_quota"
                  type="number"
                  min="0"
                  value={formData.leave_quota}
                  onChange={(e) => setFormData({ ...formData, leave_quota: parseInt(e.target.value) || 12 })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Salary Range</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="salary_min" className="text-xs">Minimum</Label>
                  <Input
                    id="salary_min"
                    type="number"
                    value={formData.salary_min}
                    onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="salary_mid" className="text-xs">Midpoint</Label>
                  <Input
                    id="salary_mid"
                    type="number"
                    value={formData.salary_mid}
                    onChange={(e) => setFormData({ ...formData, salary_mid: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="salary_max" className="text-xs">Maximum</Label>
                  <Input
                    id="salary_max"
                    type="number"
                    value={formData.salary_max}
                    onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
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
