'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Switch } from '@workspace/ui/components/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select'
import { Loader2 } from 'lucide-react'
import { LAYER_LABEL, type Layer } from './theme'
import { SearchableSelect, type SelectOption } from './searchable-select'
import { HierarchyPath } from './hierarchy-path'
import { ancestryOf } from './tree'
import type { CoaNode } from './types'

export interface AccountFormValues {
  layer: Layer
  parentId: string
  code: string
  name: string
  nameEn: string
  normalBalance: 'debit' | 'credit'
  accountType: string
  contraAccount: boolean
  restriction: boolean
  isActive: boolean
}

const PARENT_LAYER: Record<Layer, Layer | null> = {
  category: null,
  type: 'category',
  sub: 'type',
  gl: 'sub',
  detail: 'gl',
}
const LAYER_ORDER: Layer[] = ['category', 'type', 'sub', 'gl', 'detail']
const CODE_HINT: Record<Layer, string> = {
  category: '1 digit (mis. 1, 2, 3)',
  type: '1 digit',
  sub: '2 digit (01–99)',
  gl: '1 digit (0–9)',
  detail: '4 digit (0000–9999)',
}

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  node: CoaNode | null
  defaultParentId: string | null
  allNodes: CoaNode[]
  saving: boolean
  onClose: () => void
  onSubmit: (values: AccountFormValues) => void
}

export function AccountFormModal({ open, mode, node, defaultParentId, allNodes, saving, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<AccountFormValues>(emptyForm())

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && node) {
      setForm({
        layer: node.layer,
        parentId: node.parentId || '',
        code: node.code,
        name: node.name,
        nameEn: node.nameEn || '',
        normalBalance: node.normalBalance,
        accountType: node.accountType,
        contraAccount: node.contraAccount,
        restriction: node.restriction,
        isActive: node.isActive,
      })
    } else {
      const parent = defaultParentId ? allNodes.find((n) => n.id === defaultParentId) : null
      // Default the new layer to one level below the selected node (or category at root).
      const layer: Layer = parent ? LAYER_ORDER[Math.min(LAYER_ORDER.indexOf(parent.layer) + 1, 4)]! : 'category'
      setForm({ ...emptyForm(), layer, parentId: parent && PARENT_LAYER[layer] === parent.layer ? parent.id : '' })
    }
  }, [open, mode, node, defaultParentId, allNodes])

  const byId = useMemo(() => new Map(allNodes.map((n) => [n.id, n])), [allNodes])
  const parentLayer = PARENT_LAYER[form.layer]
  const parentOptions: SelectOption[] = useMemo(() => {
    if (!parentLayer) return []
    return allNodes
      .filter((n) => n.layer === parentLayer)
      .sort((a, b) => a.coaFullCode.localeCompare(b.coaFullCode))
      .map((n) => ({ value: n.id, label: n.name, code: n.coaFullCode }))
  }, [allNodes, parentLayer])

  const parent = form.parentId ? byId.get(form.parentId) ?? null : null
  const trail = parent ? ancestryOf(parent, byId) : []
  const isCategory = form.layer === 'category'
  // For non-category layers normal balance + account type cascade from the parent.
  const effectiveNB = isCategory ? form.normalBalance : parent?.normalBalance ?? form.normalBalance

  const set = <K extends keyof AccountFormValues>(k: K, v: AccountFormValues[K]) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="coa-workspace sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Akun Baru' : 'Edit Akun'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Buat akun baru pada hierarki COA. Normal Balance hanya di-input pada Category dan cascade ke bawah.'
              : 'Perbarui data akun. Layer & parent tidak dapat diubah setelah dibuat.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(form)
          }}
          className="space-y-4"
        >
          {/* Layer + parent */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Layer *</Label>
              <Select value={form.layer} onValueChange={(v) => set('layer', v as Layer)} disabled={mode === 'edit'}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="coa-workspace">
                  {LAYER_ORDER.map((l) => (
                    <SelectItem key={l} value={l}>
                      {LAYER_LABEL[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Parent {parentLayer ? '*' : ''}</Label>
              {parentLayer ? (
                mode === 'edit' ? (
                  <Input value={parent ? `${parent.coaFullCode} — ${parent.name}` : '—'} disabled />
                ) : (
                  <SearchableSelect
                    options={parentOptions}
                    value={form.parentId}
                    onChange={(v) => set('parentId', v)}
                    placeholder={`Pilih ${LAYER_LABEL[parentLayer]}...`}
                  />
                )
              ) : (
                <Input value="— (root)" disabled />
              )}
            </div>
          </div>

          {/* Code + name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="coa-code">Kode (segment) *</Label>
              <Input id="coa-code" value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="mis. 2000" className="font-mono" />
              <p className="text-muted-foreground text-xs">{CODE_HINT[form.layer]}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coa-name">Nama Akun *</Label>
              <Input id="coa-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="mis. KAS KECIL" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coa-name-en">Nama (English)</Label>
            <Input id="coa-name-en" value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} placeholder="optional" />
          </div>

          {/* Category-only: normal balance + account type */}
          {isCategory ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Normal Balance *</Label>
                <Select value={form.normalBalance} onValueChange={(v) => set('normalBalance', v as 'debit' | 'credit')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="coa-workspace">
                    <SelectItem value="debit">DEBIT</SelectItem>
                    <SelectItem value="credit">CREDIT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Account Type *</Label>
                <Select value={form.accountType} onValueChange={(v) => set('accountType', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="coa-workspace">
                    {['asset', 'liability', 'equity', 'revenue', 'expense'].map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
              Normal Balance <strong className="text-foreground">{effectiveNB.toUpperCase()}</strong> & Account Type{' '}
              <strong className="text-foreground capitalize">{parent?.accountType ?? form.accountType}</strong> di-cascade dari parent.
            </div>
          )}

          {/* Layer-specific attribute toggles */}
          {form.layer === 'type' && (
            <ToggleRow label="Contra Account" hint="Flip normal balance seluruh subtree (mis. Akumulasi Penyusutan)." checked={form.contraAccount} onChange={(v) => set('contraAccount', v)} />
          )}
          {(form.layer === 'sub' || form.layer === 'gl') && (
            <ToggleRow label="Restriction" hint="Batasi akun dari sebagian query reporting IFAS." checked={form.restriction} onChange={(v) => set('restriction', v)} />
          )}
          <ToggleRow label="Aktif" checked={form.isActive} onChange={(v) => set('isActive', v)} />

          {/* Live hierarchy preview */}
          {(parent || isCategory) && (
            <HierarchyPath trail={trail} pendingCode={form.code} pendingName={form.name} />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Simpan' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border px-4 py-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-muted-foreground text-xs">{hint}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function emptyForm(): AccountFormValues {
  return {
    layer: 'category',
    parentId: '',
    code: '',
    name: '',
    nameEn: '',
    normalBalance: 'debit',
    accountType: 'asset',
    contraAccount: false,
    restriction: false,
    isActive: true,
  }
}
