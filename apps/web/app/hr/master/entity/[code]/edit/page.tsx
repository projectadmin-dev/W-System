"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/ui/components/select"
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft, Save } from "lucide-react"

interface Entity {
  id: string
  code: string
  name: string
  type: string
  status: string
  parent_id?: string
  settings?: Record<string, any>
}

export default function EditEntityPage() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string

  const [entity, setEntity] = useState<Entity | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    status: 'active',
  })

  useEffect(() => {
    async function fetchEntity() {
      try {
        const res = await fetch(`/api/entities?id=${code}`)
        const result = await res.json()
        if (result.success && result.data) {
          setEntity(result.data)
          setFormData({
            name: result.data.name,
            status: result.data.status,
          })
        }
      } catch (error) {
        setError('Gagal memuat data entity')
        console.error('Failed to fetch entity:', error)
      } finally {
        setLoading(false)
      }
    }
    if (code) fetchEntity()
  }, [code])

  async function handleSave() {
    if (!entity) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/entities/${entity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          status: formData.status,
        })
      })
      const result = await res.json()
      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/hr/master/entity/${entity.code}`)
        }, 1000)
      } else {
        setError(result.error || 'Gagal menyimpan')
      }
    } catch (error) {
      setError((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 lg:p-6 flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    )
  }

  if (!entity) {
    return (
      <div className="p-4 lg:p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-lg font-semibold">Entity Tidak Ditemukan</h2>
          <Button asChild>
            <Link href="/hr/master/entity">← Kembali</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Edit Entity</h1>
          <p className="text-muted-foreground">Perbarui: {entity.name}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/hr/master/entity/${entity.code}`}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
          </Link>
        </Button>
      </div>

      {/* Messages */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          Berhasil! Mengalihkan...
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Entity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kode — Read Only */}
            <div>
              <Label htmlFor="code" className="text-sm font-medium">Kode *</Label>
              <Input
                id="code"
                value={entity.code}
                disabled
                className="mt-2 bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">Tidak dapat diubah</p>
            </div>

            {/* Nama */}
            <div>
              <Label htmlFor="name" className="text-sm font-medium">Nama *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2"
                placeholder="Nama entity"
              />
            </div>

            {/* Tipe — Read Only */}
            <div>
              <Label htmlFor="type" className="text-sm font-medium">Tipe</Label>
              <div className="mt-2">
                <Badge className={entity.type === 'holding' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'}>
                  {entity.type === 'holding' ? 'Holding' : 'Subsidiary'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tidak dapat diubah</p>
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status" className="text-sm font-medium">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger id="status" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
