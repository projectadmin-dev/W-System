'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Loader2, AlertTriangle } from 'lucide-react'
import type { CoaNode } from './types'

interface Props {
  open: boolean
  node: CoaNode | null
  hasChildren: boolean
  deleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteModal({ open, node, hasChildren, deleting, onClose, onConfirm }: Props) {
  const [typed, setTyped] = useState('')
  useEffect(() => {
    if (open) setTyped('')
  }, [open])
  if (!node) return null
  const confirmed = typed.trim() === node.code

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="coa-workspace sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hapus Akun</DialogTitle>
          <DialogDescription>
            Hapus <strong>{node.name}</strong> ({node.coaFullCode})? Tindakan ini tercatat di audit log.
          </DialogDescription>
        </DialogHeader>

        {hasChildren ? (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span>Akun ini punya sub akun. Hapus atau pindahkan child accounts terlebih dahulu.</span>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="del-confirm">
              Ketik kode <span className="font-mono font-semibold">{node.code}</span> untuk konfirmasi
            </Label>
            <Input id="del-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} className="font-mono" autoComplete="off" />
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={deleting}>
            Batal
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={deleting || hasChildren || !confirmed}>
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
