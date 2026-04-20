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
import { MapPin, Plus, Pencil, Trash2, Search } from 'lucide-react'

interface WorkArea {
  id: string
  tenant_id: string
  entity_id: string
  branch_id: string | null
  name: string
  code: string
  latitude: number
  longitude: number
  radius_meters: number
  require_photo: boolean
  require_gps: boolean
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function AreaKerjaPage() {
  const [areas, setAreas] = useState<WorkArea[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WorkArea | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    latitude: '',
    longitude: '',
    radius_meters: 100,
    require_photo: true,
    require_gps: true,
    is_active: true,
  })

  useEffect(() => {
    fetchAreas()
  }, [])

  async function fetchAreas() {
    try {
      const res = await fetch('/api/hc/area-kerja')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setAreas(data)
    } catch (error) {
      console.error('Error fetching work areas:', error)
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
      latitude: '',
      longitude: '',
      radius_meters: 100,
      require_photo: true,
      require_gps: true,
      is_active: true,
    })
    setDialogOpen(true)
  }

  function openEditDialog(area: WorkArea) {
    setEditingItem(area)
    setFormData({
      name: area.name,
      code: area.code,
      description: area.description || '',
      latitude: area.latitude.toString(),
      longitude: area.longitude.toString(),
      radius_meters: area.radius_meters,
      require_photo: area.require_photo,
      require_gps: area.require_gps,
      is_active: area.is_active,
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    try {
      const url = editingItem ? `/api/hc/area-kerja?id=${editingItem.id}` : '/api/hc/area-kerja'
      const method = editingItem ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          latitude: parseFloat(formData.latitude) || 0,
          longitude: parseFloat(formData.longitude) || 0,
          radius_meters: parseInt(formData.radius_meters.toString()) || 100,
        }),
      })
      
      if (!res.ok) throw new Error('Failed to save')
      
      await fetchAreas()
      setDialogOpen(false)
    } catch (error) {
      console.error('Error saving work area:', error)
      alert('Gagal menyimpan area kerja')
    }
  }

  async function handleDelete(area: WorkArea) {
    if (!confirm(`Hapus area kerja "${area.name}"?`)) return
    
    try {
      const res = await fetch(`/api/hc/area-kerja?id=${area.id}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) throw new Error('Failed to delete')
      
      await fetchAreas()
    } catch (error) {
      console.error('Error deleting work area:', error)
      alert('Gagal menghapus area kerja')
    }
  }

  const filteredAreas = areas.filter((area) =>
    area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    area.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Area Kerja</h1>
              <p className="text-muted-foreground">Kelola area kerja dengan GPS geofencing</p>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Area Kerja
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari area kerja..."
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
                    <TableHead>Nama Area</TableHead>
                    <TableHead>Koordinat</TableHead>
                    <TableHead>Radius</TableHead>
                    <TableHead>Requirements</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAreas.map((area) => (
                    <TableRow key={area.id}>
                      <TableCell className="font-mono text-sm">{area.code}</TableCell>
                      <TableCell className="font-medium">{area.name}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span>Lat: {area.latitude.toFixed(6)}</span>
                          <span>Lng: {area.longitude.toFixed(6)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{area.radius_meters}m</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {area.require_photo && (
                            <Badge variant="secondary">Photo</Badge>
                          )}
                          {area.require_gps && (
                            <Badge variant="secondary">GPS</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(area)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(area)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredAreas.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Belum ada area kerja</p>
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
              {editingItem ? 'Edit Area Kerja' : 'Tambah Area Kerja'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Update informasi area kerja'
                : 'Tambah area kerja baru dengan GPS geofencing'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code">Kode Area</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Contoh: AREA-HO"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Nama Area</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Kantor Pusat"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi area"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="latitude">Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="-6.208763"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="106.845599"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="radius_meters">Radius (meter)</Label>
              <Input
                id="radius_meters"
                type="number"
                min="10"
                value={formData.radius_meters}
                onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value) || 100 })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="require_photo"
                  checked={formData.require_photo}
                  onCheckedChange={(checked) => setFormData({ ...formData, require_photo: checked })}
                />
                <Label htmlFor="require_photo">Wajib Foto</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="require_gps"
                  checked={formData.require_gps}
                  onCheckedChange={(checked) => setFormData({ ...formData, require_gps: checked })}
                />
                <Label htmlFor="require_gps">Wajib GPS</Label>
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
