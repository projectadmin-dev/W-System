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
import { Plus, Pencil, Trash2, Building2, Percent, TrendingUp } from 'lucide-react'

type BpjsConfig = {
  id: string
  tenant_id: string
  entity_id: string | null
  branch_id: string | null
  effective_date: string
  jht_employee_rate: number
  jht_employer_rate: number
  jp_employee_rate: number
  jp_employer_rate: number
  jk_employee_rate: number
  jk_employer_rate: number
  jkm_employee_rate: number
  jkm_employer_rate: number
  jkk_employee_rate: number
  jkk_employer_rate: number
  jht_salary_cap: number
  jp_salary_cap: number
  is_active: boolean
  description: string | null
  created_at: string
}

export default function BpjsPage() {
  const [configs, setConfigs] = useState<BpjsConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<BpjsConfig | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    effective_date: new Date().toISOString().split('T')[0] || '',
    jht_employee_rate: 2,
    jht_employer_rate: 3.7,
    jp_employee_rate: 1,
    jp_employer_rate: 2,
    jk_employee_rate: 0,
    jk_employer_rate: 0.3,
    jkm_employee_rate: 0,
    jkm_employer_rate: 0.24,
    jkk_employee_rate: 0,
    jkk_employer_rate: 0.24,
    jht_salary_cap: 0,
    jp_salary_cap: 0,
    is_active: true,
    description: '',
  })

  useEffect(() => {
    fetchConfigs()
  }, [])

  async function fetchConfigs() {
    try {
      const res = await fetch('/api/hc/bpjs')
      const data = await res.json()
      setConfigs(data)
    } catch (error) {
      console.error('Failed to fetch BPJS configs:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingConfig(null)
    const today = new Date().toISOString().split('T')[0] || ''
    setFormData({
      effective_date: today,
      jht_employee_rate: 2,
      jht_employer_rate: 3.7,
      jp_employee_rate: 1,
      jp_employer_rate: 2,
      jk_employee_rate: 0,
      jk_employer_rate: 0.3,
      jkm_employee_rate: 0,
      jkm_employer_rate: 0.24,
      jkk_employee_rate: 0,
      jkk_employer_rate: 0.24,
      jht_salary_cap: 0,
      jp_salary_cap: 0,
      is_active: true,
      description: '',
    })
    setDialogOpen(true)
  }

  function openEditDialog(config: BpjsConfig) {
    setEditingConfig(config)
    setFormData({
      effective_date: config.effective_date,
      jht_employee_rate: config.jht_employee_rate,
      jht_employer_rate: config.jht_employer_rate,
      jp_employee_rate: config.jp_employee_rate,
      jp_employer_rate: config.jp_employer_rate,
      jk_employee_rate: config.jk_employee_rate,
      jk_employer_rate: config.jk_employer_rate,
      jkm_employee_rate: config.jkm_employee_rate,
      jkm_employer_rate: config.jkm_employer_rate,
      jkk_employee_rate: config.jkk_employee_rate,
      jkk_employer_rate: config.jkk_employer_rate,
      jht_salary_cap: config.jht_salary_cap,
      jp_salary_cap: config.jp_salary_cap,
      is_active: config.is_active,
      description: config.description || '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    try {
      const url = editingConfig
        ? `/api/hc/bpjs?id=${editingConfig.id}`
        : '/api/hc/bpjs'
      
      const method = editingConfig ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          jht_employee_rate: parseFloat(formData.jht_employee_rate.toString()),
          jht_employer_rate: parseFloat(formData.jht_employer_rate.toString()),
          jp_employee_rate: parseFloat(formData.jp_employee_rate.toString()),
          jp_employer_rate: parseFloat(formData.jp_employer_rate.toString()),
          jk_employee_rate: parseFloat(formData.jk_employee_rate.toString()),
          jk_employer_rate: parseFloat(formData.jk_employer_rate.toString()),
          jkm_employee_rate: parseFloat(formData.jkm_employee_rate.toString()),
          jkm_employer_rate: parseFloat(formData.jkm_employer_rate.toString()),
          jkk_employee_rate: parseFloat(formData.jkk_employee_rate.toString()),
          jkk_employer_rate: parseFloat(formData.jkk_employer_rate.toString()),
          jht_salary_cap: parseFloat(formData.jht_salary_cap.toString()),
          jp_salary_cap: parseFloat(formData.jp_salary_cap.toString()),
        }),
      })

      if (!res.ok) throw new Error('Failed to save BPJS config')

      await fetchConfigs()
      setDialogOpen(false)
    } catch (error) {
      console.error('Failed to save BPJS config:', error)
      alert('Gagal menyimpan konfigurasi BPJS. Silakan coba lagi.')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/hc/bpjs?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete BPJS config')

      await fetchConfigs()
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Failed to delete BPJS config:', error)
      alert('Gagal menghapus konfigurasi BPJS. Silakan coba lagi.')
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

  function formatPercent(value: number) {
    return `${value.toFixed(2)}%`
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  function getInheritanceBadge(config: BpjsConfig) {
    if (config.branch_id) {
      return <Badge variant="destructive">Override Branch</Badge>
    }
    if (config.entity_id) {
      return <Badge variant="secondary">Override Entity</Badge>
    }
    if (config.is_active) {
      return <Badge variant="default">Active Config</Badge>
    }
    return <Badge variant="secondary">Inactive</Badge>
  }

  function calculateTotalEmployee() {
    return (
      formData.jht_employee_rate +
      formData.jp_employee_rate +
      formData.jk_employee_rate +
      formData.jkm_employee_rate +
      formData.jkk_employee_rate
    ).toFixed(2)
  }

  function calculateTotalEmployer() {
    return (
      formData.jht_employer_rate +
      formData.jp_employer_rate +
      formData.jk_employer_rate +
      formData.jkm_employer_rate +
      formData.jkk_employer_rate
    ).toFixed(2)
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
                  <BreadcrumbPage>Konfigurasi BPJS</BreadcrumbPage>
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
                  <h1 className="text-2xl font-bold tracking-tight">Konfigurasi BPJS</h1>
                  <p className="text-muted-foreground">
                    Atur persentase iuran BPJS Kesehatan & Ketenagakerjaan
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
                    <CardTitle className="text-sm font-medium">Total Karyawan</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{calculateTotalEmployee()}%</div>
                    <p className="text-xs text-muted-foreground">
                      JHT + JP + JK + JKM + JKK
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Perusahaan</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{calculateTotalEmployer()}%</div>
                    <p className="text-xs text-muted-foreground">
                      JHT + JP + JK + JKM + JKK
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Salary Cap JHT</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formData.jht_salary_cap > 0 ? formatCurrency(formData.jht_salary_cap) : 'Tidak Ada'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Batas maksimal gaji untuk JHT
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
                      <TableHead>JHT (K/P)</TableHead>
                      <TableHead>JP (K/P)</TableHead>
                      <TableHead>JK (K/P)</TableHead>
                      <TableHead>JKM (K/P)</TableHead>
                      <TableHead>Efektif</TableHead>
                      <TableHead>Deskripsi</TableHead>
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
                    ) : configs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Belum ada konfigurasi BPJS. Klik &quot;Tambah Konfigurasi&quot; untuk membuat.
                        </TableCell>
                      </TableRow>
                    ) : (
                      configs.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell>{formatDate(config.effective_date)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="text-muted-foreground">K:</span> {formatPercent(config.jht_employee_rate)}{' '}
                              <span className="text-muted-foreground">/ P:</span> {formatPercent(config.jht_employer_rate)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="text-muted-foreground">K:</span> {formatPercent(config.jp_employee_rate)}{' '}
                              <span className="text-muted-foreground">/ P:</span> {formatPercent(config.jp_employer_rate)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="text-muted-foreground">K:</span> {formatPercent(config.jk_employee_rate)}{' '}
                              <span className="text-muted-foreground">/ P:</span> {formatPercent(config.jk_employer_rate)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="text-muted-foreground">K:</span> {formatPercent(config.jkm_employee_rate)}{' '}
                              <span className="text-muted-foreground">/ P:</span> {formatPercent(config.jkm_employer_rate)}
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">JKK:</span> {formatPercent(config.jkk_employer_rate)}
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Edit Konfigurasi BPJS' : 'Tambah Konfigurasi Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingConfig
                ? 'Update konfigurasi persentase iuran BPJS'
                : 'Buat konfigurasi BPJS baru (Kesehatan & Ketenagakerjaan)'}
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

            {/* BPJS Ketenagakerjaan - JHT */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-t pt-4">Jaminan Hari Tua (JHT)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jht_employee_rate">Iuran Karyawan (%)</Label>
                  <Input
                    id="jht_employee_rate"
                    type="number"
                    step="0.01"
                    value={formData.jht_employee_rate}
                    onChange={(e) => setFormData({ ...formData, jht_employee_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jht_employer_rate">Iuran Perusahaan (%)</Label>
                  <Input
                    id="jht_employer_rate"
                    type="number"
                    step="0.01"
                    value={formData.jht_employer_rate}
                    onChange={(e) => setFormData({ ...formData, jht_employer_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jht_salary_cap">Salary Cap (Rp)</Label>
                  <Input
                    id="jht_salary_cap"
                    type="number"
                    value={formData.jht_salary_cap}
                    onChange={(e) => setFormData({ ...formData, jht_salary_cap: parseFloat(e.target.value) || 0 })}
                    placeholder="0 = tidak ada cap"
                  />
                </div>
              </div>
            </div>

            {/* BPJS Ketenagakerjaan - JP */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-t pt-4">Jaminan Pensiun (JP)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jp_employee_rate">Iuran Karyawan (%)</Label>
                  <Input
                    id="jp_employee_rate"
                    type="number"
                    step="0.01"
                    value={formData.jp_employee_rate}
                    onChange={(e) => setFormData({ ...formData, jp_employee_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jp_employer_rate">Iuran Perusahaan (%)</Label>
                  <Input
                    id="jp_employer_rate"
                    type="number"
                    step="0.01"
                    value={formData.jp_employer_rate}
                    onChange={(e) => setFormData({ ...formData, jp_employer_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jp_salary_cap">Salary Cap (Rp)</Label>
                  <Input
                    id="jp_salary_cap"
                    type="number"
                    value={formData.jp_salary_cap}
                    onChange={(e) => setFormData({ ...formData, jp_salary_cap: parseFloat(e.target.value) || 0 })}
                    placeholder="0 = tidak ada cap"
                  />
                </div>
              </div>
            </div>

            {/* BPJS Ketenagakerjaan - JK, JKM, JKK */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-t pt-4">Jaminan Lainnya</h3>
              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jk_employee_rate">JK Karyawan (%)</Label>
                  <Input
                    id="jk_employee_rate"
                    type="number"
                    step="0.01"
                    value={formData.jk_employee_rate}
                    onChange={(e) => setFormData({ ...formData, jk_employee_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jk_employer_rate">JK Perusahaan (%)</Label>
                  <Input
                    id="jk_employer_rate"
                    type="number"
                    step="0.01"
                    value={formData.jk_employer_rate}
                    onChange={(e) => setFormData({ ...formData, jk_employer_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jkm_employer_rate">JKM Perusahaan (%)</Label>
                  <Input
                    id="jkm_employer_rate"
                    type="number"
                    step="0.01"
                    value={formData.jkm_employer_rate}
                    onChange={(e) => setFormData({ ...formData, jkm_employer_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jkk_employer_rate">JKK Perusahaan (%)</Label>
                  <Input
                    id="jkk_employer_rate"
                    type="number"
                    step="0.01"
                    value={formData.jkk_employer_rate}
                    onChange={(e) => setFormData({ ...formData, jkk_employer_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Deskripsi</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Catatan"
                  />
                </div>
              </div>
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
              Apakah Anda yakin ingin menghapus konfigurasi BPJS ini? Tindakan ini tidak dapat dibatalkan.
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
