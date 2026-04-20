'use client'

import { useState, useEffect } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { Header } from '@/components/header'
import { NavUser } from '@/components/nav-user'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Clock, Plus, Pencil, Trash2, Calculator } from 'lucide-react'

type OvertimeRule = {
  id: string
  tenant_id: string
  entity_id: string | null
  branch_id: string | null
  department_id: string | null
  position_id: string | null
  name: string
  code: string
  min_overtime_minutes: number
  overtime_multiplier: number
  max_overtime_hours_per_day: number
  max_overtime_hours_per_month: number
  is_paid: boolean
  is_active: boolean
  description: string | null
  created_at: string
  updated_at: string
}

export default function LemburPage() {
  const [rules, setRules] = useState<OvertimeRule[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<OvertimeRule | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    min_overtime_minutes: 30,
    overtime_multiplier: 1.5,
    max_overtime_hours_per_day: 4,
    max_overtime_hours_per_month: 40,
    is_paid: true,
    is_active: true,
    description: '',
  })

  useEffect(() => {
    fetchRules()
  }, [])

  async function fetchRules() {
    try {
      const res = await fetch('/api/hc/lembur')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setRules(data)
    } catch (error) {
      console.error('Error fetching overtime rules:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingRule(null)
    setFormData({
      name: '',
      code: '',
      min_overtime_minutes: 30,
      overtime_multiplier: 1.5,
      max_overtime_hours_per_day: 4,
      max_overtime_hours_per_month: 40,
      is_paid: true,
      is_active: true,
      description: '',
    })
    setDialogOpen(true)
  }

  function openEditDialog(rule: OvertimeRule) {
    setEditingRule(rule)
    setFormData({
      name: rule.name,
      code: rule.code,
      min_overtime_minutes: rule.min_overtime_minutes,
      overtime_multiplier: rule.overtime_multiplier,
      max_overtime_hours_per_day: rule.max_overtime_hours_per_day,
      max_overtime_hours_per_month: rule.max_overtime_hours_per_month,
      is_paid: rule.is_paid,
      is_active: rule.is_active,
      description: rule.description || '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    try {
      const url = editingRule
        ? `/api/hc/lembur?id=${editingRule.id}`
        : '/api/hc/lembur'
      
      const method = editingRule ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('Failed to save overtime rule')

      await fetchRules()
      setDialogOpen(false)
    } catch (error) {
      console.error('Failed to save overtime rule:', error)
      alert('Gagal menyimpan aturan lembur. Silakan coba lagi.')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/hc/lembur?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete overtime rule')

      await fetchRules()
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Failed to delete overtime rule:', error)
      alert('Gagal menghapus aturan lembur.')
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-1 flex-col gap-4 p-8 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Aturan Lembur</h1>
              <p className="text-muted-foreground">
                Kelola aturan perhitungan lembur, multiplier, dan batas maksimal
              </p>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Aturan
            </Button>
          </div>

          <div className="rounded-lg border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Aturan</TableHead>
                  <TableHead>Min. Lembur</TableHead>
                  <TableHead>Multiplier</TableHead>
                  <TableHead>Max/Hari</TableHead>
                  <TableHead>Max/Bulan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Belum ada aturan lembur. Klik &quot;Tambah Aturan&quot; untuk membuat.
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.code}</TableCell>
                      <TableCell>{rule.name}</TableCell>
                      <TableCell>{rule.min_overtime_minutes} menit</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{rule.overtime_multiplier}x</Badge>
                      </TableCell>
                      <TableCell>{rule.max_overtime_hours_per_day} jam</TableCell>
                      <TableCell>{rule.max_overtime_hours_per_month} jam</TableCell>
                      <TableCell>
                        <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(rule)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit Aturan Lembur' : 'Tambah Aturan Lembur'}
              </DialogTitle>
              <DialogDescription>
                {editingRule
                  ? 'Update aturan perhitungan lembur'
                  : 'Buat aturan baru untuk perhitungan lembur karyawan'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Aturan</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Lembur Reguler"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Kode</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder="e.g., OT-REG"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_overtime_minutes">Min. Lembur (menit)</Label>
                  <Input
                    id="min_overtime_minutes"
                    type="number"
                    value={formData.min_overtime_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_overtime_minutes: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overtime_multiplier">Multiplier</Label>
                  <Input
                    id="overtime_multiplier"
                    type="number"
                    step="0.5"
                    value={formData.overtime_multiplier}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        overtime_multiplier: parseFloat(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Opsional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_overtime_hours_per_day">Max/Hari (jam)</Label>
                  <Input
                    id="max_overtime_hours_per_day"
                    type="number"
                    value={formData.max_overtime_hours_per_day}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_overtime_hours_per_day: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_overtime_hours_per_month">Max/Bulan (jam)</Label>
                  <Input
                    id="max_overtime_hours_per_month"
                    type="number"
                    value={formData.max_overtime_hours_per_month}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_overtime_hours_per_month: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_paid"
                    checked={formData.is_paid}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_paid: checked })
                    }
                  />
                  <Label htmlFor="is_paid">Lembur Dibayar</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                  <Label htmlFor="is_active">Status Active</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSubmit}>
                {editingRule ? 'Update' : 'Simpan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Konfirmasi Hapus</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus aturan lembur ini? Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              >
                Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  )
}
