'use client'

// Batch "Sub Akun" create modals: Sub-Account/GL children and Detail-Ledger Sub-DL.
// Ported from the prototype (modals.jsx › CreateSubChildModal / CreateSubDlModal).
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Switch } from '@workspace/ui/components/switch'
import { Plus, Trash2, AlertCircle } from 'lucide-react'
import { IFAS } from './theme'
import { validateBatchChildren, MAX_CHILDREN, type ChildRow, type CoaLayer } from '@/lib/coa-logic'
import type { CoaNode } from './types'

function ParentContext({ parent }: { parent: CoaNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: IFAS.bg.secondary, borderRadius: '1rem', marginBottom: 4 }}>
      <span style={{ fontFamily: IFAS.fontMono, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: IFAS.primary, background: '#fff' }}>{parent.coaFullCode}</span>
      <span style={{ fontSize: 12, color: IFAS.text.secondary }}>Sub akun di bawah</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: IFAS.text.primary }}>{parent.name}</span>
    </div>
  )
}

function RowEditor({ rows, setRows, codePlaceholder }: { rows: ChildRow[]; setRows: (r: ChildRow[]) => void; codePlaceholder: string }) {
  const update = (i: number, patch: Partial<ChildRow>) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={r.kode} onChange={(e) => update(i, { kode: e.target.value })} placeholder={codePlaceholder} className="w-28 font-mono" />
          <Input value={r.nama} onChange={(e) => update(i, { nama: e.target.value })} placeholder="Nama sub akun" className="flex-1" />
          <Button type="button" variant="ghost" size="icon" onClick={() => setRows(rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows)} disabled={rows.length === 1} aria-label="Hapus baris">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, { kode: '', nama: '' }])}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Tambah baris
      </Button>
    </div>
  )
}

function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{error}</span>
    </div>
  )
}

// ─── Sub-Account / GL child modal ───────────────────────────────────────────
interface SubChildProps {
  open: boolean
  parent: CoaNode | null
  layer: 'sub' | 'gl'
  allNodes: CoaNode[]
  saving: boolean
  onClose: () => void
  onSubmit: (rows: ChildRow[]) => void
}

export function SubChildModal({ open, parent, layer, allNodes, saving, onClose, onSubmit }: SubChildProps) {
  const [rows, setRows] = useState<ChildRow[]>([{ kode: '', nama: '' }])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (open) {
      setRows([{ kode: '', nama: '' }])
      setError(null)
    }
  }, [open])
  if (!parent) return null

  const maxItems = MAX_CHILDREN[layer]
  const codeHint = layer === 'sub' ? 'Kode 2 digit (01–99). Maksimal 99 sub akun.' : 'Kode 1 digit (1–9). Maksimal 9 sub akun.'

  const submit = () => {
    const existing = allNodes.filter((n) => n.parentId === parent.id && n.layer === layer).map((n) => n.code)
    const res = validateBatchChildren(rows, layer as CoaLayer, existing, maxItems)
    if (res.error) return setError(res.error)
    setError(null)
    onSubmit(res.valid)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="coa-workspace sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Sub Akun</DialogTitle>
          <DialogDescription>{codeHint} Satu baris = satu sub akun. Normal Balance di-cascade dari parent.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ParentContext parent={parent} />
          <RowEditor rows={rows} setRows={setRows} codePlaceholder={layer === 'sub' ? '01' : '1'} />
          <ErrorBanner error={error} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button type="button" onClick={submit} disabled={saving}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Sub-DL modal (Detail Ledger children) ──────────────────────────────────
export interface SubDlPayload {
  mode: 'keyin'
  rows: ChildRow[]
  requiredSubGl: boolean
  washedOut: boolean
}
interface SubDlProps {
  open: boolean
  parent: CoaNode | null
  allNodes: CoaNode[]
  saving: boolean
  onClose: () => void
  onSubmit: (payload: SubDlPayload) => void
}

export function SubDlModal({ open, parent, allNodes, saving, onClose, onSubmit }: SubDlProps) {
  const [mode, setMode] = useState<'keyin' | 'master'>('keyin')
  const [rows, setRows] = useState<ChildRow[]>([{ kode: '', nama: '' }])
  const [requiredSubGl, setRequiredSubGl] = useState(false)
  const [washedOut, setWashedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (open) {
      setMode('keyin')
      setRows([{ kode: '', nama: '' }])
      setRequiredSubGl(false)
      setWashedOut(false)
      setError(null)
    }
  }, [open])
  if (!parent) return null

  const submit = () => {
    const existing = allNodes.filter((n) => n.parentId === parent.id && n.layer === 'detail').map((n) => n.code)
    const res = validateBatchChildren(rows, 'detail', existing, 9999)
    if (res.error) return setError(res.error)
    setError(null)
    onSubmit({ mode: 'keyin', rows: res.valid, requiredSubGl, washedOut })
  }

  const tab = (id: 'keyin' | 'master', label: string, disabled?: boolean): React.CSSProperties => ({
    flex: 1, padding: '8px 12px', fontSize: 12, fontWeight: 600, borderRadius: '0.75rem', cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', background: mode === id ? IFAS.bg.surface : 'transparent', color: disabled ? IFAS.text.tertiary : mode === id ? IFAS.primary : IFAS.text.secondary,
    boxShadow: mode === id ? IFAS.shadow.sm : 'none', opacity: disabled ? 0.6 : 1,
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="coa-workspace sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Sub Akun (Detail Ledger)</DialogTitle>
          <DialogDescription>Kode 4 digit. Saat parent mendapat Sub Akun pertama, Sub GL Config parent dipindahkan ke leaf.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ParentContext parent={parent} />
          <div style={{ display: 'flex', gap: 4, padding: 3, background: IFAS.bg.secondary, borderRadius: '0.9rem' }}>
            <button type="button" style={tab('keyin', 'Key In')} onClick={() => setMode('keyin')}>Key In</button>
            <button type="button" style={tab('master', 'Master Data', true)} disabled>Master Data</button>
          </div>

          {mode === 'master' ? (
            <div className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              Sumber master data belum tersedia (data masih kosong).
            </div>
          ) : (
            <>
              <RowEditor rows={rows} setRows={setRows} codePlaceholder="0001" />
              <div className="space-y-2">
                <ToggleLine label="Wajib Sub GL saat posting" checked={requiredSubGl} onChange={setRequiredSubGl} />
                <ToggleLine label="Washed Out (saldo auto-nol di period end)" checked={washedOut} onChange={setWashedOut} />
              </div>
            </>
          )}
          <ErrorBanner error={error} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button type="button" onClick={submit} disabled={saving || mode === 'master'}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ToggleLine({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border px-4 py-2.5">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
