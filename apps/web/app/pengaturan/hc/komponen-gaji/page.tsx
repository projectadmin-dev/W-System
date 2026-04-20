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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DollarSign, Plus, Pencil, Trash2, Search } from 'lucide-react'

interface SalaryComponent {
  id: string
  tenant_id: string
  entity_id: string | null
  branch_id: string | null
  name: string
  code: string
  component_type: 'earning' | 'deduction'
  category: 'basic' | 'allowance' | 'overtime' | 'bonus' | 'thr' | 'bpjs_tk' | 'bpjs_kes' | 'pph21' | 'loan' | 'other'
  is_taxable: boolean
  is_bpjs_base: boolean
  is_fixed: boolean
  fixed_amount: number | null
  percentage: number | null
  description: string | null
  is_active: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export default function KomponenGajiPage() {
  const [components, setComponents] = useState<SalaryComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SalaryComponent | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    component_type: 'earning' as 'earning' | 'deduction',
    category: 'allowance' as 'earning' | 'deduction' | 'basic' | 'allowance' | 'overtime' | 'bonus' | 'thr' | 'bpjs_tk' | 'bpjs_kes' | 'pph21' | 'loan' | 'other',
    is_taxable: true,
    is_bpjs_base: false,
    is_fixed: false,
    fixed_amount: '',
    percentage: '',
    is_active: true,
  })

  useEffect(() => {
    fetchComponents()
  }, [])

  async function fetchComponents() {
    try {
      const res = await fetch('/api/hc/komponen-gaji')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setComponents(data)
    } catch (error) {
      console.error('Error fetching salary components:', error)
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
      component_type: 'earning',
      category: 'allowance',
      is_taxable: true,
      is_bpjs_base: false,
      is_fixed: false,
      fixed_amount: '',
      percentage: '',
      is_active: true,
    })
    setDialogOpen(true)
  }

  function openEditDialog(component: SalaryComponent) {
    setEditingItem(component)
    setFormData({
      name: component.name,
      code: component.code,
      description: component.description || '',
      component_type: component.component_type,
      category: component.category,
      is_taxable: component.is_taxable,
      is_bpjs_base: component.is_bpjs_base,
      is_fixed: component.is_fixed,
      fixed_amount: component.fixed_amount?.toString() || '',
      percentage: component.percentage?.toString() || '',
      is_active: component.is_active,
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    try {
      const url = editingItem ? `/api/hc/komponen-gaji?id=${editingItem.id}` : '/api/hc/komponen-gaji'
      const method = editingItem ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fixed_amount: formData.is_fixed ? (parseFloat(formData.fixed_amount) || 0) : null,
          percentage: !formData.is_fixed ? (parseFloat(formData.percentage) || 0) : null,
        }),
      })
      
      if (!res.ok) throw new Error('Failed to save')
      
      await fetchComponents()
      setDialogOpen(false)
    } catch (error) {
      console.error('Error saving salary component:', error)
      alert('Gagal menyimpan komponen gaji')
    }
  }

  async function handleDelete(component: SalaryComponent) {
    if (!confirm(`Hapus komponen gaji "${component.name}"?`)) return
    
    try {
      const res = await fetch(`/api/hc/komponen-gaji?id=${component.id}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) throw new Error('Failed to delete')
      
      await fetchComponents()
    } catch (error) {
      console.error('Error deleting salary component:', error)
      alert('Gagal menghapus komponen gaji')
    }
  }

  const filteredComponents = components.filter((comp) =>
    comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    comp.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getCategoryBadgeVariant = (category: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      basic: 'default',
      allowance: 'secondary',
      overtime: 'secondary',
      bonus: 'default',
      thr: 'default',
      bpjs_tk: 'outline',
      bpjs_kes: 'outline',
      pph21: 'destructive',
      loan: 'destructive',
      other: 'outline',
    }
    return variants[category] || 'outline'
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Komponen Gaji</h1>
              <p className="text-muted-foreground">Kelola komponen penghasilan dan potongan</p>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Komponen
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari komponen..."
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
                    <TableHead>Nama Komponen</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Taxable</TableHead>
                    <TableHead>BPJS Base</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComponents.map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-mono text-sm">{comp.code}</TableCell>
                      <TableCell className="font-medium">{comp.name}</TableCell>
                      <TableCell>
                        {comp.component_type === 'earning' ? (
                          <Badge variant="default">Penghasilan</Badge>
                        ) : (
                          <Badge variant="destructive">Potongan</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getCategoryBadgeVariant(comp.category)}>
                          {comp.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {comp.is_taxable ? '✓' : '✗'}
                      </TableCell>
                      <TableCell>
                        {comp.is_bpjs_base ? '✓' : '✗'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(comp)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(comp)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredComponents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Belum ada komponen gaji</p>
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
              {editingItem ? 'Edit Komponen Gaji' : 'Tambah Komponen Gaji'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update informasi komponen gaji'
                : 'Tambah komponen gaji baru'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Kode Komponen</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Contoh: GAPOK"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Nama Komponen</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Gaji Pokok"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi komponen"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="component_type">Tipe</Label>
                <Select
                  value={formData.component_type}
                  onValueChange={(value: 'earning' | 'deduction') => setFormData({ ...formData, component_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earning">Penghasilan</SelectItem>
                    <SelectItem value="deduction">Potongan</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Kategori</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic Salary</SelectItem>
                    <SelectItem value="allowance">Allowance</SelectItem>
                    <SelectItem value="overtime">Overtime</SelectItem>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="thr">THR</SelectItem>
                    <SelectItem value="bpjs_tk">BPJS TK</SelectItem>
                    <SelectItem value="bpjs_kes">BPJS Kesehatan</SelectItem>
                    <SelectItem value="pph21">PPh 21</SelectItem>
                    <SelectItem value="loan">Pinjaman</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="is_fixed">Perhitungan</Label>
              <Select
                value={formData.is_fixed ? 'fixed' : 'percentage'}
                onValueChange={(value) => setFormData({ ...formData, is_fixed: value === 'fixed' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.is_fixed ? (
              <div className="grid gap-2">
                <Label htmlFor="fixed_amount">Nominal (Rp)</Label>
                <Input
                  id="fixed_amount"
                  type="number"
                  value={formData.fixed_amount}
                  onChange={(e) => setFormData({ ...formData, fixed_amount: e.target.value })}
                  placeholder="0"
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="percentage">Persentase (%)</Label>
                <Input
                  id="percentage"
                  type="number"
                  step="0.01"
                  value={formData.percentage}
                  onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                  placeholder="0"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_taxable"
                  checked={formData.is_taxable}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_taxable: checked })}
                />
                <Label htmlFor="is_taxable">Kena Pajak</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_bpjs_base"
                  checked={formData.is_bpjs_base}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_bpjs_base: checked })}
                />
                <Label htmlFor="is_bpjs_base">Dasar BPJS</Label>
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
