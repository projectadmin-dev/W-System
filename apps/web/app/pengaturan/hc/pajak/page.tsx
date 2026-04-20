'use client'

import { useEffect, useState } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { NavUser } from '@/components/nav-user'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@workspace/ui/components/breadcrumb'
import { Separator } from '@workspace/ui/components/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@workspace/ui/components/sidebar'
import { Button } from '@workspace/ui/components/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Badge } from '@workspace/ui/components/badge'
import { Switch } from '@workspace/ui/components/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Plus, Pencil, Trash2, Percent, Scale, Users } from 'lucide-react'

type Pph21Config = {
  id: string
  tenant_id: string
  entity_id: string | null
  branch_id: string | null
  effective_date: string
  ptkp_tk0: number
  ptkp_tk1: number
  ptkp_tk2: number
  ptkp_tk3: number
  ptkp_k0: number
  ptkp_k1: number
  ptkp_k2: number
  ptkp_k3: number
  tax_bracket_1_max: number
  tax_bracket_1_rate: number
  tax_bracket_2_max: number
  tax_bracket_2_rate: number
  tax_bracket_3_max: number
  tax_bracket_3_rate: number
  tax_bracket_4_max: number
  tax_bracket_4_rate: number
  tax_bracket_5_max: number
  tax_bracket_5_rate: number
  ter_1_max: number
  ter_1_rate: number
  ter_2_max: number
  ter_2_rate: number
  ter_3_rate: number
  is_active: boolean
  description: string | null
  created_at: string
}

const TKPT_OPTIONS = [
  { value: 'TK/0', label: 'TK/0 - Tidak Kawin, 0 Tanggungan' },
  { value: 'TK/1', label: 'TK/1 - Tidak Kawin, 1 Tanggungan' },
  { value: 'TK/2', label: 'TK/2 - Tidak Kawin, 2 Tanggungan' },
  { value: 'TK/3', label: 'TK/3 - Tidak Kawin, 3 Tanggungan' },
  { value: 'K/0', label: 'K/0 - Kawin, 0 Tanggungan' },
  { value: 'K/1', label: 'K/1 - Kawin, 1 Tanggungan' },
  { value: 'K/2', label: 'K/2 - Kawin, 2 Tanggungan' },
  { value: 'K/3', label: 'K/3 - Kawin, 3 Tanggungan' },
]

export default function PajakPage() {
  const [configs, setConfigs] = useState<Pph21Config[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<Pph21Config | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    effective_date: new Date().toISOString().split('T')[0] || '',
    ptkp_tk0: 54000000,
    ptkp_tk1: 58500000,
    ptkp_tk2: 63000000,
    ptkp_tk3: 67500000,
    ptkp_k0: 58500000,
    ptkp_k1: 63000000,
    ptkp_k2: 67500000,
    ptkp_k3: 72000000,
    tax_bracket_1_max: 60000000,
    tax_bracket_1_rate: 5,
    tax_bracket_2_max: 250000000,
    tax_bracket_2_rate: 15,
    tax_bracket_3_max: 500000000,
    tax_bracket_3_rate: 25,
    tax_bracket_4_max: 5000000000,
    tax_bracket_4_rate: 30,
    tax_bracket_5_max: 0,
    tax_bracket_5_rate: 35,
    ter_1_max: 4500000,
    ter_1_rate: 5.4,
    ter_2_max: 20000000,
    ter_2_rate: 11.4,
    ter_3_rate: 15,
    is_active: true,
    description: '',
  })

  useEffect(() => {
    fetchConfigs()
  }, [])

  async function fetchConfigs() {
    try {
      const res = await fetch('/api/hc/pajak')
      const data = await res.json()
      setConfigs(data)
    } catch (error) {
      console.error('Failed to fetch PPh21 configs:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingConfig(null)
    const today = new Date().toISOString().split('T')[0] || ''
    setFormData({
      effective_date: today,
      ptkp_tk0: 54000000,
      ptkp_tk1: 58500000,
      ptkp_tk2: 63000000,
      ptkp_tk3: 67500000,
      ptkp_k0: 58500000,
      ptkp_k1: 63000000,
      ptkp_k2: 67500000,
      ptkp_k3: 72000000,
      tax_bracket_1_max: 60000000,
      tax_bracket_1_rate: 5,
      tax_bracket_2_max: 250000000,
      tax_bracket_2_rate: 15,
      tax_bracket_3_max: 500000000,
      tax_bracket_3_rate: 25,
      tax_bracket_4_max: 5000000000,
      tax_bracket_4_rate: 30,
      tax_bracket_5_max: 0,
      tax_bracket_5_rate: 35,
      ter_1_max: 4500000,
      ter_1_rate: 5.4,
      ter_2_max: 20000000,
      ter_2_rate: 11.4,
      ter_3_rate: 15,
      is_active: true,
      description: '',
    })
    setDialogOpen(true)
  }

  function openEditDialog(config: Pph21Config) {
    setEditingConfig(config)
    setFormData({
      effective_date: config.effective_date,
      ptkp_tk0: config.ptkp_tk0,
      ptkp_tk1: config.ptkp_tk1,
      ptkp_tk2: config.ptkp_tk2,
      ptkp_tk3: config.ptkp_tk3,
      ptkp_k0: config.ptkp_k0,
      ptkp_k1: config.ptkp_k1,
      ptkp_k2: config.ptkp_k2,
      ptkp_k3: config.ptkp_k3,
      tax_bracket_1_max: config.tax_bracket_1_max,
      tax_bracket_1_rate: config.tax_bracket_1_rate,
      tax_bracket_2_max: config.tax_bracket_2_max,
      tax_bracket_2_rate: config.tax_bracket_2_rate,
      tax_bracket_3_max: config.tax_bracket_3_max,
      tax_bracket_3_rate: config.tax_bracket_3_rate,
      tax_bracket_4_max: config.tax_bracket_4_max,
      tax_bracket_4_rate: config.tax_bracket_4_rate,
      tax_bracket_5_max: config.tax_bracket_5_max,
      tax_bracket_5_rate: config.tax_bracket_5_rate,
      ter_1_max: config.ter_1_max,
      ter_1_rate: config.ter_1_rate,
      ter_2_max: config.ter_2_max,
      ter_2_rate: config.ter_2_rate,
      ter_3_rate: config.ter_3_rate,
      is_active: config.is_active,
      description: config.description || '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    try {
      const url = editingConfig
        ? `/api/hc/pajak?id=${editingConfig.id}`
        : '/api/hc/pajak'
      
      const method = editingConfig ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ptkp_tk0: parseFloat(formData.ptkp_tk0.toString()),
          ptkp_tk1: parseFloat(formData.ptkp_tk1.toString()),
          ptkp_tk2: parseFloat(formData.ptkp_tk2.toString()),
          ptkp_tk3: parseFloat(formData.ptkp_tk3.toString()),
          ptkp_k0: parseFloat(formData.ptkp_k0.toString()),
          ptkp_k1: parseFloat(formData.ptkp_k1.toString()),
          ptkp_k2: parseFloat(formData.ptkp_k2.toString()),
          ptkp_k3: parseFloat(formData.ptkp_k3.toString()),
          tax_bracket_1_max: parseFloat(formData.tax_bracket_1_max.toString()),
          tax_bracket_1_rate: parseFloat(formData.tax_bracket_1_rate.toString()),
          tax_bracket_2_max: parseFloat(formData.tax_bracket_2_max.toString()),
          tax_bracket_2_rate: parseFloat(formData.tax_bracket_2_rate.toString()),
          tax_bracket_3_max: parseFloat(formData.tax_bracket_3_max.toString()),
          tax_bracket_3_rate: parseFloat(formData.tax_bracket_3_rate.toString()),
          tax_bracket_4_max: parseFloat(formData.tax_bracket_4_max.toString()),
          tax_bracket_4_rate: parseFloat(formData.tax_bracket_4_rate.toString()),
          tax_bracket_5_max: parseFloat(formData.tax_bracket_5_max.toString()),
          tax_bracket_5_rate: parseFloat(formData.tax_bracket_5_rate.toString()),
          ter_1_max: parseFloat(formData.ter_1_max.toString()),
          ter_1_rate: parseFloat(formData.ter_1_rate.toString()),
          ter_2_max: parseFloat(formData.ter_2_max.toString()),
          ter_2_rate: parseFloat(formData.ter_2_rate.toString()),
          ter_3_rate: parseFloat(formData.ter_3_rate.toString()),
        }),
      })

      if (!res.ok) throw new Error('Failed to save PPh21 config')

      await fetchConfigs()
      setDialogOpen(false)
    } catch (error) {
      console.error('Failed to save PPh21 config:', error)
      alert('Gagal menyimpan konfigurasi PPh21. Silakan coba lagi.')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/hc/pajak?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete PPh21 config')

      await fetchConfigs()
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Failed to delete PPh21 config:', error)
      alert('Gagal menghapus konfigurasi PPh21. Silakan coba lagi.')
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  function formatPercent(value: number) {
    return `${value.toFixed(1)}%`
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 w-full bg-white dark:bg-zinc-800 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 px-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/pengaturan">Pengaturan</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Konfigurasi PPh21</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex items-center gap-2">
            <NavUser user={{ name: 'HC Admin', email: 'hrd@wit.id', avatar: '/avatars/hc.jpg' }} />
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              {/* Page Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Konfigurasi PPh21</h1>
                  <p className="text-muted-foreground">
                    Atur PTKP, Tax Brackets, dan TER untuk perhitungan pajak penghasilan
                  </p>
                </div>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Konfigurasi
                </Button>
              </div>

              {/* Info Cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">PTKP TK/0</CardTitle>
                    <Scale className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(formData.ptkp_tk0)}</div>
                    <p className="text-xs text-muted-foreground">
                      Penghasilan Tidak Kena Pajak - Tidak Kawin
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tax Bracket 1</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercent(formData.tax_bracket_1_rate)}</div>
                    <p className="text-xs text-muted-foreground">
                      s/d {formatCurrency(formData.tax_bracket_1_max)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">TER Max</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercent(formData.ter_3_rate)}</div>
                    <p className="text-xs text-muted-foreground">
                      Tarif Efektif Rata-rata tertinggi
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Data Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Berlaku Sejak</TableHead>
                      <TableHead>PTKP TK/0</TableHead>
                      <TableHead>Tax Brackets</TableHead>
                      <TableHead>TER Rates</TableHead>
                      <TableHead>Efektif</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : configs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Belum ada konfigurasi PPh21. Klik &quot;Tambah Konfigurasi&quot; untuk membuat.
                        </TableCell>
                      </TableRow>
                    ) : (
                      configs.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell>{formatDate(config.effective_date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {formatCurrency(config.ptkp_tk0)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm space-y-1">
                              <div>
                                <span className="text-muted-foreground">5%:</span> s/d {formatCurrency(config.tax_bracket_1_max)}
                              </div>
                              <div>
                                <span className="text-muted-foreground">15%:</span> s/d {formatCurrency(config.tax_bracket_2_max)}
                              </div>
                              <div>
                                <span className="text-muted-foreground">25%:</span> s/d {formatCurrency(config.tax_bracket_3_max)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm space-y-1">
                              <div>
                                <span className="text-muted-foreground">L1:</span> {formatPercent(config.ter_1_rate)}
                              </div>
                              <div>
                                <span className="text-muted-foreground">L2:</span> {formatPercent(config.ter_2_rate)}
                              </div>
                              <div>
                                <span className="text-muted-foreground">L3:</span> {formatPercent(config.ter_3_rate)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={config.is_active ? 'default' : 'secondary'}>
                              {config.is_active ? 'Aktif' : 'Tidak Aktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {config.description || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(config)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirm(config.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
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
          </div>
        </div>
      </SidebarInset>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Edit Konfigurasi PPh21' : 'Tambah Konfigurasi Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingConfig
                ? 'Update konfigurasi PTKP, Tax Brackets, dan TER'
                : 'Buat konfigurasi PPh21 baru untuk perhitungan pajak penghasilan'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* General Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pengaturan Umum</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="effective_date">Tanggal Berlaku</Label>
                  <Input
                    id="effective_date"
                    type="date"
                    value={formData.effective_date}
                    onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  />
                </div>
                <div className="flex items-end space-x-2 pb-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Aktifkan konfigurasi ini</Label>
                </div>
              </div>
            </div>

            {/* PTKP - Penghasilan Tidak Kena Pajak */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-t pt-4">PTKP (Penghasilan Tidak Kena Pajak) - Tahunan</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ptkp_tk0">TK/0 (Rp)</Label>
                  <Input
                    id="ptkp_tk0"
                    type="number"
                    value={formData.ptkp_tk0}
                    onChange={(e) => setFormData({ ...formData, ptkp_tk0: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ptkp_tk1">TK/1 (Rp)</Label>
                  <Input
                    id="ptkp_tk1"
                    type="number"
                    value={formData.ptkp_tk1}
                    onChange={(e) => setFormData({ ...formData, ptkp_tk1: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ptkp_tk2">TK/2 (Rp)</Label>
                  <Input
                    id="ptkp_tk2"
                    type="number"
                    value={formData.ptkp_tk2}
                    onChange={(e) => setFormData({ ...formData, ptkp_tk2: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ptkp_tk3">TK/3 (Rp)</Label>
                  <Input
                    id="ptkp_tk3"
                    type="number"
                    value={formData.ptkp_tk3}
                    onChange={(e) => setFormData({ ...formData, ptkp_tk3: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ptkp_k0">K/0 (Rp)</Label>
                  <Input
                    id="ptkp_k0"
                    type="number"
                    value={formData.ptkp_k0}
                    onChange={(e) => setFormData({ ...formData, ptkp_k0: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ptkp_k1">K/1 (Rp)</Label>
                  <Input
                    id="ptkp_k1"
                    type="number"
                    value={formData.ptkp_k1}
                    onChange={(e) => setFormData({ ...formData, ptkp_k1: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ptkp_k2">K/2 (Rp)</Label>
                  <Input
                    id="ptkp_k2"
                    type="number"
                    value={formData.ptkp_k2}
                    onChange={(e) => setFormData({ ...formData, ptkp_k2: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ptkp_k3">K/3 (Rp)</Label>
                  <Input
                    id="ptkp_k3"
                    type="number"
                    value={formData.ptkp_k3}
                    onChange={(e) => setFormData({ ...formData, ptkp_k3: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                TK = Tidak Kawin, K = Kawin, Angka = Jumlah tanggungan (maks 3)
              </p>
            </div>

            {/* Tax Brackets - Progressive Rates */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-t pt-4">Tax Brackets (Progressive Rates) - Tahunan</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bracket 1 (5%)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={formData.tax_bracket_1_max}
                      onChange={(e) => setFormData({ ...formData, tax_bracket_1_max: parseFloat(e.target.value) || 0 })}
                      placeholder="Max income"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Bracket 2 (15%)</Label>
                  <Input
                    type="number"
                    value={formData.tax_bracket_2_max}
                    onChange={(e) => setFormData({ ...formData, tax_bracket_2_max: parseFloat(e.target.value) || 0 })}
                    placeholder="Max income"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bracket 3 (25%)</Label>
                  <Input
                    type="number"
                    value={formData.tax_bracket_3_max}
                    onChange={(e) => setFormData({ ...formData, tax_bracket_3_max: parseFloat(e.target.value) || 0 })}
                    placeholder="Max income"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bracket 4 (30%)</Label>
                  <Input
                    type="number"
                    value={formData.tax_bracket_4_max}
                    onChange={(e) => setFormData({ ...formData, tax_bracket_4_max: parseFloat(e.target.value) || 0 })}
                    placeholder="Max income"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bracket 5 (35%)</Label>
                  <Input
                    type="number"
                    value={formData.tax_bracket_5_max}
                    onChange={(e) => setFormData({ ...formData, tax_bracket_5_max: parseFloat(e.target.value) || 0 })}
                    placeholder="0 = unlimited"
                  />
                </div>
              </div>
            </div>

            {/* TER - Tarif Efektif Rata-rata */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-t pt-4">TER (Tarif Efektif Rata-rata) - Bulanan</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>TER Layer 1</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={formData.ter_1_max}
                      onChange={(e) => setFormData({ ...formData, ter_1_max: parseFloat(e.target.value) || 0 })}
                      placeholder="Max income"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={formData.ter_1_rate}
                      onChange={(e) => setFormData({ ...formData, ter_1_rate: parseFloat(e.target.value) || 0 })}
                      placeholder="Rate %"
                      className="w-24"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>TER Layer 2</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={formData.ter_2_max}
                      onChange={(e) => setFormData({ ...formData, ter_2_max: parseFloat(e.target.value) || 0 })}
                      placeholder="Max income"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={formData.ter_2_rate}
                      onChange={(e) => setFormData({ ...formData, ter_2_rate: parseFloat(e.target.value) || 0 })}
                      placeholder="Rate %"
                      className="w-24"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>TER Layer 3</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 text-sm text-muted-foreground py-2 px-3 border rounded-md bg-muted">
                      &gt; {formatCurrency(formData.ter_2_max)}
                    </div>
                    <Input
                      type="number"
                      value={formData.ter_3_rate}
                      onChange={(e) => setFormData({ ...formData, ter_3_rate: parseFloat(e.target.value) || 0 })}
                      placeholder="Rate %"
                      className="w-24"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Catatan (e.g., PER-16/PJ/2024)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit}>
              {editingConfig ? 'Update' : 'Simpan'}
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
              Apakah Anda yakin ingin menghapus konfigurasi PPh21 ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
