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
import { Plus, Pencil, Trash2, Clock, Calendar } from 'lucide-react'

type Shift = {
  id: string
  tenant_id: string
  entity_id: string | null
  branch_id: string | null
  name: string
  code: string
  start_time: string
  end_time: string
  break_start: string | null
  break_end: string | null
  break_duration_minutes: number
  grace_period_minutes: number
  is_active: boolean
  is_default: boolean
  created_at: string
  updated_at: string
}

export default function ShiftPage() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    start_time: '08:00',
    end_time: '17:00',
    break_start: '12:00',
    break_end: '13:00',
    break_duration_minutes: 60,
    grace_period_minutes: 15,
    is_active: true,
    is_default: false,
  })

  useEffect(() => {
    fetchShifts()
  }, [])

  async function fetchShifts() {
    try {
      const res = await fetch('/api/hc/shifts')
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to fetch shifts')
      }
      const data = await res.json()
      // Ensure data is an array
      setShifts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch shifts:', error)
      setShifts([])
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    setEditingShift(null)
    setFormData({
      name: '',
      code: '',
      start_time: '08:00',
      end_time: '17:00',
      break_start: '12:00',
      break_end: '13:00',
      break_duration_minutes: 60,
      grace_period_minutes: 15,
      is_active: true,
      is_default: false,
    })
    setDialogOpen(true)
  }

  function openEditDialog(shift: Shift) {
    setEditingShift(shift)
    setFormData({
      name: shift.name,
      code: shift.code,
      start_time: shift.start_time.substring(0, 5),
      end_time: shift.end_time.substring(0, 5),
      break_start: shift.break_start?.substring(0, 5) || '',
      break_end: shift.break_end?.substring(0, 5) || '',
      break_duration_minutes: shift.break_duration_minutes,
      grace_period_minutes: shift.grace_period_minutes,
      is_active: shift.is_active,
      is_default: shift.is_default,
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    try {
      const url = editingShift
        ? `/api/hc/shifts?id=${editingShift.id}`
        : '/api/hc/shifts'
      
      const method = editingShift ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('Failed to save shift')

      await fetchShifts()
      setDialogOpen(false)
    } catch (error) {
      console.error('Failed to save shift:', error)
      alert('Gagal menyimpan shift. Silakan coba lagi.')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/hc/shifts?id=${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete shift')

      await fetchShifts()
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Failed to delete shift:', error)
      alert('Gagal menghapus shift. Silakan coba lagi.')
    }
  }

  function formatTime(timeStr: string | null) {
    if (!timeStr) return '-'
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours || '0')
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes || '00'} ${ampm}`
  }

  function getInheritanceBadge(shift: Shift) {
    if (shift.branch_id) {
      return <Badge variant="destructive">Override Branch</Badge>
    }
    if (shift.entity_id) {
      return <Badge variant="secondary">Override Entity</Badge>
    }
    if (shift.is_default) {
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
                  <BreadcrumbPage>Shift Kerja</BreadcrumbPage>
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
                  <h1 className="text-2xl font-bold tracking-tight">Shift Kerja</h1>
                  <p className="text-muted-foreground">
                    Kelola shift kerja multi-shift untuk entity/branch
                  </p>
                </div>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Shift
                </Button>
              </div>

              {/* Data Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama Shift</TableHead>
                      <TableHead>Jam Kerja</TableHead>
                      <TableHead>Istirahat</TableHead>
                      <TableHead>Grace Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Inheritance</TableHead>
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
                    ) : shifts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Belum ada shift kerja. Klik &quot;Tambah Shift&quot; untuk membuat.
                        </TableCell>
                      </TableRow>
                    ) : (
                      shifts.map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell className="font-mono text-sm">{shift.code}</TableCell>
                          <TableCell className="font-medium">{shift.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {shift.break_start && shift.break_end ? (
                              <span className="text-sm text-muted-foreground">
                                {formatTime(shift.break_start)} - {formatTime(shift.break_end)}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{shift.grace_period_minutes} menit</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={shift.is_active ? 'default' : 'secondary'}>
                              {shift.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{getInheritanceBadge(shift)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(shift)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteConfirm(shift.id)}
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
              {editingShift ? 'Edit Shift' : 'Tambah Shift Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingShift
                ? 'Update konfigurasi shift kerja'
                : 'Buat konfigurasi shift kerja baru untuk entity/branch'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kode Shift</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., SHIFT-RG"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nama Shift</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Shift Reguler"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Jam Mulai</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">Jam Selesai</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="break_start">Mulai Istirahat</Label>
                <Input
                  id="break_start"
                  type="time"
                  value={formData.break_start}
                  onChange={(e) => setFormData({ ...formData, break_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="break_end">Selesai Istirahat</Label>
                <Input
                  id="break_end"
                  type="time"
                  value={formData.break_end}
                  onChange={(e) => setFormData({ ...formData, break_end: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="break_duration_minutes">Durasi Istirahat (menit)</Label>
                <Input
                  id="break_duration_minutes"
                  type="number"
                  value={formData.break_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, break_duration_minutes: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grace_period_minutes">Grace Period (menit)</Label>
                <Input
                  id="grace_period_minutes"
                  type="number"
                  value={formData.grace_period_minutes}
                  onChange={(e) => setFormData({ ...formData, grace_period_minutes: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
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
              {editingShift ? 'Update' : 'Simpan'}
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
              Apakah Anda yakin ingin menghapus shift ini? Tindakan ini tidak dapat dibatalkan.
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
