"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Building2, Trash2, AlertCircle, Loader2 } from "lucide-react"

interface Entity {
  id: string
  code: string
  name: string
  type: string
  status: string
  parent_id?: string
  settings?: Record<string, any>
}

export default function EntityDetailPage() {
  const router = useRouter()
  const params = useParams()
  const code = params.code as string

  const [entity, setEntity] = useState<Entity | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    async function fetchEntity() {
      try {
        const res = await fetch(`/api/entities`)
        const result = await res.json()
        const data = Array.isArray(result) ? result : (result.data ?? [])
        const found = data.find((e: any) => e.code === code)
        if (found) {
          setEntity(found)
        }
      } catch (error) {
        console.error('Failed to fetch entity:', error)
      } finally {
        setLoading(false)
      }
    }
    if (code) fetchEntity()
  }, [code])

  async function handleDelete() {
    if (!entity) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/entities/${entity.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) {
        router.push('/hr/master/entity')
      } else {
        alert('Gagal menghapus entity: ' + result.error)
      }
    } catch (error) {
      alert('Error: ' + (error as Error).message)
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
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
            <Link href="/hr/master/entity">← Kembali ke Daftar</Link>
          </Button>
        </div>
      </div>
    )
  }

  const typeBadge = entity.type === 'holding' ? 'Holding' : entity.type === 'subsidiary' ? 'Subsidiary' : entity.type
  const typeColor = entity.type === 'holding' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
  const statusColor = entity.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">{entity.name}</h1>
        </div>
        <p className="text-muted-foreground">Kode: {entity.code}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link href="/hr/master/entity">← Kembali</Link>
        </Button>
        <Button asChild>
          <Link href={`/hr/master/entity/${entity.code}/edit`}>Edit</Link>
        </Button>
        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
          <Trash2 className="h-4 w-4 mr-2" /> Hapus
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tipe</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={typeColor}>{typeBadge}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusColor}>{entity.status === 'active' ? 'Active' : 'Inactive'}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">ID</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs font-mono text-muted-foreground">{entity.id}</p>
          </CardContent>
        </Card>
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Entity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Kode</p>
              <p className="font-mono text-sm">{entity.code}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nama</p>
              <p className="text-sm">{entity.name}</p>
            </div>
            {entity.parent_id && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Parent ID</p>
                <p className="text-xs font-mono text-muted-foreground">{entity.parent_id}</p>
              </div>
            )}
          </div>

          {entity.settings && Object.keys(entity.settings).length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Pengaturan</p>
              <div className="space-y-2 text-sm">
                {Object.entries(entity.settings).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Entity?</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan menghapus entity <strong>{entity.name}</strong> ({entity.code}). Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {deleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
