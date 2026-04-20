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
import { Switch } from '@workspace/ui/components/switch'
import { Badge } from '@workspace/ui/components/badge'
import { Plus, Pencil, Trash2, Calendar, Flag } from 'lucide-react'

type Calendar = {
  id: string
  tenant_id: string
  entity_id: string | null
  branch_id: string | null
  year: number
  date: string
  name: string
  type: 'national_holiday' | 'cuti_bersama' | 'weekend' | 'company_holiday' | 'unpaid_leave'
  is_paid: boolean
  description: string | null
  is_default: boolean
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  national_holiday: 'Libur Nasional',
  cuti_bersama: 'Cuti Bersama',
  weekend: 'Weekend',
  company_holiday: 'Libur Perusahaan',
  unpaid_leave: 'Cuti Tanpa Upah',
}

const TYPE_COLORS: Record<string, string> = {
  national_holiday: 'bg-red-100 text-red-800',
  cuti_bersama: 'bg-orange-100 text-orange-800',
  weekend: 'bg-gray-100 text-gray-800',
  company_holiday: 'bg-blue-100 text-blue-800',
  unpaid_leave: 'bg-yellow-100 text-yellow-800',
}

export default function KalenderPage() {
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCalendar, setEditingCalendar] = useState<Calendar | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())

  // Form state
  const [formData, setFormData] = useState({
    year: new Date().getFullYear(),
    date: '',
    name: '',
    type: 'national_holiday' as Calendar['type'],
    is_paid: true,
    description: '',
    is_default: false,
  })

  useEffect(() => {
    fetchCalendars()
  }, [selectedYear])

  async function fetchCalendars() {
    try {
      const res = await fetch(`/api/hc/calendars?year=${selectedYear}`)
      const data = await res.json()
      setCalendars(data)
    } catch (error) {
      console.error('Failed to fetch calendars:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingCalendar(null)
    setFormData({
      year: parseInt(selectedYear),
      date: '',
      name: '',
      type: 'national_holiday',
      is_paid: true,
      description: '',
      is_default: false,
    })
    setDialogOpen(true)
  }

  function openEditDialog(calendar: Calendar) {
    setEditingCalendar(calendar)
    setFormData({
      year: calendar.year,
      date: calendar.date,
      name: calendar.name,
      type: calendar.type,
      is_paid: calendar.is_paid,
      description: calendar.description || '',
      is_default: calendar.is_default,
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    try {
      const url = editingCalendar
        ? `/api/hc/calendars?id=${editingCalendar.id}`
        : '/api/hc/calendars'
      
      const method = editingCalendar ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('Failed to save calendar')

      await fetchCalendars()
      setDialogOpen(false)
    } catch (error) {
      console.error('Failed to save calendar:', error)
      alert('Gagal menyimpan kalender. Silakan coba lagi.')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/hc/calendars?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete calendar')

      await fetchCalendars()
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Failed to delete calendar:', error)
      alert('Gagal menghapus kalender. Silakan coba lagi.')
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  function getInheritanceBadge(calendar: Calendar) {
    if (calendar.branch_id) {
      return <Badge variant="destructive">Override Branch</Badge>
    }
    if (calendar.entity_id) {
      return <Badge variant="secondary">Override Entity</Badge>
    }
    if (calendar.is_default) {
      return <Badge variant="outline">Default Holding</Badge>
    }
    return <Badge variant="secondary">Standard</Badge>
  }

  function getTypeBadge(type: Calendar['type']) {
    return (
      <Badge className={TYPE_COLORS[type]} variant="secondary">
        {TYPE_LABELS[type]}
      </Badge>
    )
  }

  // Generate year options (2020-2030)
  const yearOptions = Array.from({ length: 11 }, (_, i) => 2020 + i)

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
                  <BreadcrumbPage>Kalender Kerja</BreadcrumbPage>
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
                  <h1 className="text-2xl font-bold tracking-tight">Kalender Kerja</h1>
                  <p className="text-muted-foreground">
                    Kelola hari libur nasional, cuti bersama, dan libur perusahaan
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Tahun" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Libur
                  </Button>
                </div>
              </div>

              {/* Data Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Nama Libur</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Dibayar</TableHead>
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
                    ) : calendars.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Belum ada kalender untuk tahun {selectedYear}. Klik &quot;Tambah Libur&quot; untuk membuat.
                        </TableCell>
                      </TableRow>
                    ) : (
                      calendars.map((calendar) => (
                        <TableRow key={calendar.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{formatDate(calendar.date)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{calendar.name}</TableCell>
                          <TableCell>{getTypeBadge(calendar.type)}</TableCell>
                          <TableCell>
                            <Badge variant={calendar.is_paid ? 'default' : 'secondary'}>
                              {calendar.is_paid ? 'Dibayar' : 'Tidak Dibayar'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {calendar.description || '-'}
                          </TableCell>
                          <TableCell>{getInheritanceBadge(calendar)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(calendar)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirm(calendar.id)}
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
              {editingCalendar ? 'Edit Kalender' : 'Tambah Libur Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingCalendar
                ? 'Update konfigurasi kalender kerja'
                : 'Buat entry kalender kerja baru (libur/cuti)'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Tanggal</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Tahun</Label>
                <Select
                  value={formData.year.toString()}
                  onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama Libur</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Hari Raya Idul Fitri, Tahun Baru"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipe Libur</Label>
              <Select
                value={formData.type}
                onValueChange={(value: Calendar['type']) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="national_holiday">Libur Nasional</SelectItem>
                  <SelectItem value="cuti_bersama">Cuti Bersama</SelectItem>
                  <SelectItem value="company_holiday">Libur Perusahaan</SelectItem>
                  <SelectItem value="unpaid_leave">Cuti Tanpa Upah</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Catatan tambahan"
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_paid"
                  checked={formData.is_paid}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_paid: checked })}
                />
                <Label htmlFor="is_paid">Dibayar (Paid Leave)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <Label htmlFor="is_default">Default (Tenant-level)</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmit}>
              {editingCalendar ? 'Update' : 'Simpan'}
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
              Apakah Anda yakin ingin menghapus entry kalender ini? Tindakan ini tidak dapat dibatalkan.
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
