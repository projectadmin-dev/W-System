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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Badge } from '@workspace/ui/components/badge'
import {
  Plus, Wallet, Eye, Trash2, FileText, Loader2,
  AlertCircle, CheckCircle2, Pencil, X
} from 'lucide-react'

interface PayrollPeriod {
  id: string
  entity_id: string
  month: number
  year: number
  start_date: string
  end_date: string
  status: 'draft' | 'generating' | 'locked' | 'approved' | 'paid'
  attendance_cutoff_date: string | null
  overtime_cutoff_date: string | null
  payroll_cutoff_date: string | null
  total_employees: number
  total_thp: number
  created_at: string
  payroll_slips: Array<{
    id: string
    employee_id: string
    employee_name: string
    status: string
    thp: number
    basic_salary?: number
    allowances_total?: number
    total_deductions?: number
  }>
}

interface PayrollSlip {
  id: string
  employee_id: string
  employee_name: string
  basic_salary: number
  total_allowances: number
  total_deductions: number
  thp: number
  status: string
  created_at: string
}

export default function PayrollPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null)
  const [slips, setSlips] = useState<PayrollSlip[]>([])
  const [generating, setGenerating] = useState(false)
  const [generateSuccess, setGenerateSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state: create new period
  const [formData, setFormData] = useState({
    entity_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    start_date: '',
    end_date: '',
    attendance_cutoff_date: '',
    overtime_cutoff_date: '',
    payroll_cutoff_date: '',
  })

  // Form state: edit existing period
  const [editData, setEditData] = useState({
    start_date: '',
    end_date: '',
    attendance_cutoff_date: '',
    overtime_cutoff_date: '',
    payroll_cutoff_date: '',
    status: '' as '' | 'draft' | 'locked' | 'approved' | 'paid',
  })

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]

  useEffect(() => {
    fetchPeriods()
  }, [])

  async function fetchPeriods() {
    try {
      setLoading(true)
      const res = await fetch('/api/payroll-periods')
      const result = await res.json()
      if (result.success) {
        setPeriods(Array.isArray(result.data) ? result.data : [])
      } else {
        setPeriods([])
      }
    } catch (err) {
      console.error('Gagal fetch periode:', err)
      setPeriods([])
    } finally {
      setLoading(false)
    }
  }

  async function handleCreatePeriod(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/payroll-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const result = await res.json()
      if (result.success) {
        await fetchPeriods()
        setDialogOpen(false)
        setFormData({
          entity_id: '',
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          start_date: '',
          end_date: '',
          attendance_cutoff_date: '',
          overtime_cutoff_date: '',
          payroll_cutoff_date: '',
        })
      } else {
        setError(result.error || 'Gagal membuat periode')
      }
    } catch (err) {
      setError('Gagal membuat periode')
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerate(periodId: string) {
    setGenerating(true)
    setGenerateSuccess(false)
    setError(null)
    try {
      const res = await fetch(`/api/payroll-periods/${periodId}/generate`, {
        method: 'POST',
      })
      const result = await res.json()
      if (result.success) {
        setGenerateSuccess(true)
        await fetchPeriods()
      } else {
        setError(result.error || 'Gagal generate payroll')
      }
    } catch (err) {
      setError('Gagal generate payroll')
    } finally {
      setGenerating(false)
    }
  }

  function openEditDialog(period: PayrollPeriod) {
    setSelectedPeriod(period)
    setEditData({
      start_date: period.start_date || '',
      end_date: period.end_date || '',
      attendance_cutoff_date: period.attendance_cutoff_date || '',
      overtime_cutoff_date: period.overtime_cutoff_date || '',
      payroll_cutoff_date: period.payroll_cutoff_date || '',
      status: period.status,
    })
    setEditError(null)
    setEditDialogOpen(true)
  }

  async function handleUpdatePeriod(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPeriod) return
    setEditError(null)
    setSaving(true)
    try {
      const payload: Record<string, any> = {}
      if (editData.start_date) payload.start_date = editData.start_date
      if (editData.end_date) payload.end_date = editData.end_date
      if (editData.attendance_cutoff_date !== undefined) payload.attendance_cutoff_date = editData.attendance_cutoff_date || null
      if (editData.overtime_cutoff_date !== undefined) payload.overtime_cutoff_date = editData.overtime_cutoff_date || null
      if (editData.payroll_cutoff_date !== undefined) payload.payroll_cutoff_date = editData.payroll_cutoff_date || null
      if (editData.status) payload.status = editData.status

      const res = await fetch(`/api/payroll-periods/${selectedPeriod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (result.success) {
        await fetchPeriods()
        setEditDialogOpen(false)
      } else {
        setEditError(result.error || 'Gagal update periode')
      }
    } catch (err) {
      setEditError('Gagal update periode')
    } finally {
      setSaving(false)
    }
  }

  function openDeleteDialog(period: PayrollPeriod) {
    setSelectedPeriod(period)
    setDeleteError(null)
    setDeleteDialogOpen(true)
  }

  async function handleDeletePeriod() {
    if (!selectedPeriod) return
    setDeleteError(null)
    setDeleting(true)
    try {
      const res = await fetch(`/api/payroll-periods/${selectedPeriod.id}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      if (result.success) {
        await fetchPeriods()
        setDeleteDialogOpen(false)
      } else {
        setDeleteError(result.error || 'Gagal hapus periode')
      }
    } catch (err) {
      setDeleteError('Gagal hapus periode')
    } finally {
      setDeleting(false)
    }
  }

  async function viewDetail(period: PayrollPeriod) {
    setSelectedPeriod(period)
    try {
      const res = await fetch(`/api/payroll-periods?entity_id=${period.entity_id}&month=${period.month}&year=${period.year}`)
      const result = await res.json()
      if (result.success && Array.isArray(result.data) && result.data[0]) {
        setSlips(result.data[0].payroll_slips || [])
      } else {
        setSlips(period.payroll_slips || [])
      }
    } catch {
      setSlips(period.payroll_slips || [])
    }
    setDetailOpen(true)
  }

  function formatRupiah(value: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  function formatDate(iso: string) {
    if (!iso) return '-'
    const d = new Date(iso)
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'generating':
        return <Badge variant="warning" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Memproses</Badge>
      case 'locked':
        return <Badge variant="secondary">Terkunci</Badge>
      case 'approved':
        return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Disetujui</Badge>
      case 'paid':
        return <Badge className="gap-1"><Wallet className="h-3 w-3" /> Dibayar</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="sticky top-0 z-10 flex h-16 w-full bg-white dark:bg-zinc-800 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 px-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-vertical:h-4" />
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
                  <BreadcrumbPage>Payroll</BreadcrumbPage>
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
                  <h1 className="text-2xl font-bold tracking-tight">Payroll Bulanan</h1>
                  <p className="text-muted-foreground">
                    Kelola periode payroll dan generate slip gaji karyawan
                  </p>
                </div>
                <Button onClick={() => { setDialogOpen(true); setError(null) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Buat Periode
                </Button>
              </div>

              {/* Success / Error Alert */}
              {generateSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Payroll berhasil digenerate!</span>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Table */}
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Periode</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Karyawan</TableHead>
                        <TableHead>Total THP</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periods.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Belum ada periode payroll. Klik &quot;Buat Periode&quot; untuk mulai.
                          </TableCell>
                        </TableRow>
                      ) : (
                        periods.map((period) => {
                          const employeeCount = period.payroll_slips?.length || 0
                          const totalTHP = period.payroll_slips?.reduce((sum, s) => sum + (s.thp || 0), 0) || 0
                          return (
                            <TableRow key={period.id}>
                              <TableCell className="font-medium">
                                {monthNames[period.month - 1]} {period.year}
                              </TableCell>
                              <TableCell>
                                {formatDate(period.start_date)} - {formatDate(period.end_date)}
                              </TableCell>
                              <TableCell>{getStatusBadge(period.status)}</TableCell>
                              <TableCell>{employeeCount} orang</TableCell>
                              <TableCell className="font-medium text-right">
                                {formatRupiah(totalTHP)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {/* Generate Button */}
                                  {period.status === 'draft' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleGenerate(period.id)}
                                      disabled={generating}
                                      title="Generate Slip Gaji"
                                    >
                                      {generating ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <FileText className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                  {/* Edit Button — only for draft */}
                                  {period.status === 'draft' && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => openEditDialog(period)}
                                      title="Edit Periode"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {/* Delete Button — only for draft */}
                                  {period.status === 'draft' && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => openDeleteDialog(period)}
                                      title="Hapus Periode"
                                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {/* View Detail Button */}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => viewDetail(period)}
                                    title="Lihat Detail"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Dialog: Buat Periode Baru */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Periode Payroll</DialogTitle>
            <DialogDescription>
              Masukkan periode bulanan untuk hitung gaji karyawan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePeriod} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label>Entity ID</Label>
              <Input
                value={formData.entity_id}
                onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                placeholder="uuid entity"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bulan</Label>
                <Select
                  value={String(formData.month)}
                  onValueChange={(v) => setFormData({ ...formData, month: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tahun</Label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  min={2020}
                  max={2100}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Selesai</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Attendance Cut-off</Label>
              <Input
                type="date"
                value={formData.attendance_cutoff_date}
                onChange={(e) => setFormData({ ...formData, attendance_cutoff_date: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Simpan Periode
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit Periode */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Periode Payroll</DialogTitle>
            <DialogDescription>
              {selectedPeriod ? `${monthNames[selectedPeriod.month - 1]} ${selectedPeriod.year}` : ''} — Hanya periode <strong>Draft</strong> yang bisa diedit.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePeriod} className="space-y-4">
            {editError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4" />
                {editError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Input
                  type="date"
                  value={editData.start_date}
                  onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Selesai</Label>
                <Input
                  type="date"
                  value={editData.end_date}
                  onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Attendance Cut-off</Label>
                <Input
                  type="date"
                  value={editData.attendance_cutoff_date}
                  onChange={(e) => setEditData({ ...editData, attendance_cutoff_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Overtime Cut-off</Label>
                <Input
                  type="date"
                  value={editData.overtime_cutoff_date}
                  onChange={(e) => setEditData({ ...editData, overtime_cutoff_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payroll Cut-off</Label>
              <Input
                type="date"
                value={editData.payroll_cutoff_date}
                onChange={(e) => setEditData({ ...editData, payroll_cutoff_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={editData.status}
                onValueChange={(v) => setEditData({ ...editData, status: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="locked">Terkunci</SelectItem>
                  <SelectItem value="approved">Disetujui</SelectItem>
                  <SelectItem value="paid">Dibayar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Konfirmasi Hapus */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Hapus Periode Payroll?
            </DialogTitle>
            <DialogDescription>
              {selectedPeriod
                ? `Hapus periode ${monthNames[selectedPeriod.month - 1]} ${selectedPeriod.year}? Semua slip gaji yang sudah terbentuk juga akan ikut dihapus.`
                : 'Konfirmasi penghapusan periode payroll.'}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4" />
              {deleteError}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePeriod}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Ya, Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detail Slip */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detail Slip Payroll — {selectedPeriod ? `${monthNames[selectedPeriod.month - 1]} ${selectedPeriod.year}` : ''}
            </DialogTitle>
            <DialogDescription>
              Total {slips.length} slip gaji untuk periode ini.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead>Gaji Pokok</TableHead>
                  <TableHead>Tunjangan</TableHead>
                  <TableHead>Potongan</TableHead>
                  <TableHead className="text-right">THP</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Belum ada slip gaji. Klik &quot;Generate&quot; untuk membuat slip.
                    </TableCell>
                  </TableRow>
                ) : (
                  slips.map((slip) => (
                    <TableRow key={slip.id}>
                      <TableCell className="font-medium">{slip.employee_name || slip.employee_id}</TableCell>
                      <TableCell>{formatRupiah(slip.basic_salary || 0)}</TableCell>
                      <TableCell>{formatRupiah(slip.total_allowances || 0)}</TableCell>
                      <TableCell>{formatRupiah(slip.total_deductions || 0)}</TableCell>
                      <TableCell className="text-right font-bold">{formatRupiah(slip.thp || 0)}</TableCell>
                      <TableCell>{getStatusBadge(slip.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setDetailOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
