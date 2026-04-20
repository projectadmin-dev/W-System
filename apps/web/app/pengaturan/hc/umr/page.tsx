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
import { Plus, Pencil, Trash2, MapPin, DollarSign } from 'lucide-react'

type Umr = {
  id: string
  tenant_id: string
  entity_id: string | null
  branch_id: string | null
  city_name: string
  province: string
  umr_amount: number
  effective_date: string
  description: string | null
  is_default: boolean
  created_at: string
}

export default function UmrPage() {
  const [umrData, setUmrData] = useState<Umr[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUmr, setEditingUmr] = useState<Umr | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    city_name: '',
    province: '',
    umr_amount: 0,
    effective_date: '',
    description: '',
    is_default: false,
  })

  useEffect(() => {
    fetchUmrData()
  }, [])

  async function fetchUmrData() {
    try {
      const res = await fetch('/api/hc/umr')
      const data = await res.json()
      setUmrData(data)
    } catch (error) {
      console.error('Failed to fetch UMR data:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingUmr(null)
    const today = new Date().toISOString().split('T')[0] || ''
    setFormData({
      city_name: '',
      province: '',
      umr_amount: 0,
      effective_date: today,
      description: '',
      is_default: false,
    })
    setDialogOpen(true)
  }

  function openEditDialog(umr: Umr) {
    setEditingUmr(umr)
    setFormData({
      city_name: umr.city_name,
      province: umr.province,
      umr_amount: umr.umr_amount,
      effective_date: umr.effective_date,
      description: umr.description || '',
      is_default: umr.is_default,
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    try {
      const url = editingUmr
        ? `/api/hc/umr?id=${editingUmr.id}`
        : '/api/hc/umr'
      
      const method = editingUmr ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          umr_amount: parseFloat(formData.umr_amount.toString()),
        }),
      })

      if (!res.ok) throw new Error('Failed to save UMR')

      await fetchUmrData()
      setDialogOpen(false)
    } catch (error) {
      console.error('Failed to save UMR:', error)
      alert('Gagal menyimpan UMR. Silakan coba lagi.')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/hc/umr?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete UMR')

      await fetchUmrData()
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Failed to delete UMR:', error)
      alert('Gagal menghapus UMR. Silakan coba lagi.')
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  function getInheritanceBadge(umr: Umr) {
    if (umr.branch_id) {
      return <Badge variant="destructive">Override Branch</Badge>
    }
    if (umr.entity_id) {
      return <Badge variant="secondary">Override Entity</Badge>
    }
    if (umr.is_default) {
      return <Badge variant="outline">Default Holding</Badge>
    }
    return <Badge variant="secondary">Standard</Badge>
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
                  <BreadcrumbPage>UMR Kota</BreadcrumbPage>
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
                  <h1 className="text-2xl font-bold tracking-tight">UMR Kota</h1>
                  <p className="text-muted-foreground">
                    Data Upah Minimum Regional (UMR) untuk referensi penggajian
                  </p>
                </div>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah UMR
                </Button>
              </div>

              {/* Info Card */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                      Fungsi UMR
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Data UMR digunakan sebagai referensi untuk:
                    </p>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 list-disc list-inside space-y-1">
                      <li>Validasi salary compliance (gaji tidak boleh di bawah UMR)</li>
                      <li>Kalkulasi BPJS (base salary reference)</li>
                      <li>Payroll audit dan reporting</li>
                      <li>Grade & Matrix salary range</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kota/Kabupaten</TableHead>
                      <TableHead>Provinsi</TableHead>
                      <TableHead>Nominal UMR</TableHead>
                      <TableHead>Berlaku Sejak</TableHead>
                      <TableHead>Deskripsi</TableHead>
                      <TableHead>Inheritance</TableHead>
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
                    ) : umrData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Belum ada data UMR. Klik &quot;Tambah UMR&quot; untuk membuat.
                        </TableCell>
                      </TableRow>
                    ) : (
                      umrData.map((umr) => (
                        <TableRow key={umr.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{umr.city_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{umr.province}</TableCell>
                          <TableCell>
                            <Badge variant="default" className="font-mono">
                              {formatCurrency(umr.umr_amount)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(umr.effective_date)}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {umr.description || '-'}
                          </TableCell>
                          <TableCell>{getInheritanceBadge(umr)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(umr)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirm(umr.id)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUmr ? 'Edit UMR' : 'Tambah UMR Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingUmr
                ? 'Update data UMR kota/kabupaten'
                : 'Buat entry UMR baru untuk referensi penggajian'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city_name">Kota/Kabupaten</Label>
                <Input
                  id="city_name"
                  value={formData.city_name}
                  onChange={(e) => setFormData({ ...formData, city_name: e.target.value })}
                  placeholder="e.g., Jakarta Pusat, Bandung"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Provinsi</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  placeholder="e.g., DKI Jakarta, Jawa Barat"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="umr_amount">Nominal UMR (Rp)</Label>
              <Input
                id="umr_amount"
                type="number"
                value={formData.umr_amount}
                onChange={(e) => setFormData({ ...formData, umr_amount: parseFloat(e.target.value) || 0 })}
                placeholder="e.g., 5000000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective_date">Tanggal Berlaku</Label>
              <Input
                id="effective_date"
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Catatan tambahan (e.g., Perda No. X Tahun 2024)"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="is_default">Default (Tenant-level)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit}>
              {editingUmr ? 'Update' : 'Simpan'}
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
              Apakah Anda yakin ingin menghapus data UMR ini? Tindakan ini tidak dapat dibatalkan.
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
