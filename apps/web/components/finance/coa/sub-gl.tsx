'use client'

// Sub GL — configuration section (deepest DL only), level editor modal, and the
// read-only value catalog drawer. Ported from the prototype (sections.jsx ›
// SubGlConfigSection / SubGlValueDrawer, modals.jsx › SubGlLevelModal).
// Master-data source is deferred (OQ-3); attribute levels are Key-In only.
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Switch } from '@workspace/ui/components/switch'
import { Sparkles, Plus, Pencil, Trash2, ExternalLink, X } from 'lucide-react'
import { IFAS } from './theme'
import type { CoaNode, SubGlLevel } from './types'

// ─── Config section (inspector) ─────────────────────────────────────────────
interface ConfigProps {
  node: CoaNode
  onToggleRequired: (node: CoaNode, required: boolean) => void
  onAddLevel: (node: CoaNode) => void
  onEditLevel: (node: CoaNode, index: number) => void
  onDeleteLevel: (node: CoaNode, index: number) => void
  onViewValues: (node: CoaNode) => void
}

export function SubGlConfigSection({ node, onToggleRequired, onAddLevel, onEditLevel, onDeleteLevel, onViewValues }: ConfigProps) {
  const config = node.subGlConfig ?? []
  const hasConfig = config.length > 0

  return (
    <div style={{ marginBottom: 20, background: IFAS.violetBg + '88', border: `1px solid ${IFAS.violet}33`, borderRadius: '1rem', padding: 15 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Sparkles size={15} color={IFAS.violet} />
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: IFAS.violet, textTransform: 'uppercase' }}>Sub GL Configuration</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: IFAS.text.secondary, fontWeight: 600 }}>Required</span>
          <Switch checked={!!node.requiredSubGl} onCheckedChange={(v) => onToggleRequired(node, v)} />
        </div>
      </div>

      {!node.requiredSubGl ? (
        <div style={{ padding: 14, background: IFAS.bg.surface, border: `1px dashed ${IFAS.border.default}`, borderRadius: '0.875rem', fontSize: 12, color: IFAS.text.tertiary, fontStyle: 'italic', textAlign: 'center' }}>
          Detail Ledger ini <strong>tidak</strong> memerlukan Sub GL. Aktifkan toggle &quot;Required&quot; untuk mulai konfigurasi.
        </div>
      ) : (
        <>
          {hasConfig ? (
            <div style={{ background: IFAS.bg.surface, borderRadius: '0.875rem', border: `1px solid ${IFAS.border.subtle}`, overflow: 'hidden', marginBottom: 10 }}>
              {config.map((lvl, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px', borderBottom: i < config.length - 1 ? `1px solid ${IFAS.border.subtle}` : 'none' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: IFAS.violet, color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: IFAS.fontMono }}>
                    {lvl.attributeLevel}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, letterSpacing: '0.04em', color: IFAS.warning, background: IFAS.warningBg }}>KEY IN</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: IFAS.fontMono, fontSize: 10, fontWeight: 700, color: IFAS.warning }}>{lvl.keyInRows?.[0]?.kode || '(kosong)'}</span>
                      <span style={{ fontSize: 10, color: IFAS.text.secondary }}>·</span>
                      <span style={{ fontSize: 11, color: IFAS.text.primary }}>{lvl.keyInRows?.[0]?.nama || '(kosong)'}</span>
                      {(lvl.keyInRows?.length || 0) > 1 && <span style={{ fontSize: 9, color: IFAS.text.tertiary, fontStyle: 'italic' }}>+{lvl.keyInRows!.length - 1} lainnya</span>}
                    </div>
                  </div>
                  <button onClick={() => onEditLevel(node, i)} style={iconBtn(IFAS.text.secondary)} aria-label="Edit level"><Pencil size={13} /></button>
                  {config.length > 1 && (
                    <button onClick={() => onDeleteLevel(node, i)} style={iconBtn(IFAS.danger)} aria-label="Hapus level"><Trash2 size={13} /></button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 14, marginBottom: 10, background: IFAS.bg.surface, border: `1px dashed ${IFAS.border.default}`, borderRadius: '0.875rem', fontSize: 12, color: IFAS.text.tertiary, fontStyle: 'italic', textAlign: 'center' }}>
              Belum ada attribute level. Tambahkan minimal 1 level untuk mengaktifkan Sub GL.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <button onClick={() => onAddLevel(node)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', fontSize: 11, fontWeight: 600, color: IFAS.violet, background: IFAS.bg.surface, border: `1px solid ${IFAS.violet}`, borderRadius: 999, cursor: 'pointer' }}>
              <Plus size={12} /> Tambah Lv {config.length + 1}
            </button>
            {hasConfig && (
              <button onClick={() => onViewValues(node)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', fontSize: 11, fontWeight: 600, color: IFAS.text.secondary, background: 'transparent', border: `1px solid ${IFAS.border.default}`, borderRadius: 999, cursor: 'pointer' }}>
                Lihat Sub GL Value <ExternalLink size={12} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const iconBtn = (color: string): React.CSSProperties => ({
  width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: '50%', cursor: 'pointer', color,
})

// ─── Level editor modal (Key-In only) ───────────────────────────────────────
interface LevelModalProps {
  open: boolean
  node: CoaNode | null
  editIndex: number
  saving: boolean
  onClose: () => void
  onSubmit: (level: SubGlLevel) => void
}

export function SubGlLevelModal({ open, node, editIndex, saving, onClose, onSubmit }: LevelModalProps) {
  const [rows, setRows] = useState<{ kode: string; nama: string }[]>([{ kode: '', nama: '' }])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!open) return
    const existing = node?.subGlConfig?.[editIndex]
    setRows(existing?.keyInRows?.length ? existing.keyInRows : [{ kode: '', nama: '' }])
    setError(null)
  }, [open, node, editIndex])
  if (!node) return null
  const level = editIndex === -1 ? (node.subGlConfig?.length ?? 0) + 1 : editIndex + 1

  const update = (i: number, patch: Partial<{ kode: string; nama: string }>) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const submit = () => {
    const valid = rows.map((r) => ({ kode: r.kode.trim(), nama: r.nama.trim() })).filter((r) => r.kode && r.nama)
    if (valid.length === 0) return setError('Minimal 1 baris Kode + Nama Sub GL wajib diisi')
    setError(null)
    onSubmit({ attributeLevel: level, isPullMasterData: false, keyInRows: valid })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="coa-workspace sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editIndex === -1 ? `Tambah Sub GL — Level ${level}` : `Edit Sub GL — Level ${level}`}</DialogTitle>
          <DialogDescription>Sumber: Key In. (Master Data belum tersedia — data masih kosong.) Satu baris = satu nilai Sub GL.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={r.kode} onChange={(e) => update(i, { kode: e.target.value })} placeholder="Kode" className="w-32 font-mono" />
              <Input value={r.nama} onChange={(e) => update(i, { nama: e.target.value })} placeholder="Nama Sub GL" className="flex-1" />
              <Button type="button" variant="ghost" size="icon" onClick={() => setRows(rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows)} disabled={rows.length === 1} aria-label="Hapus baris">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, { kode: '', nama: '' }])}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Tambah baris
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button type="button" onClick={submit} disabled={saving}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Value catalog drawer (read-only; values are nil for now) ───────────────
export function SubGlValueDrawer({ node, onClose }: { node: CoaNode | null; onClose: () => void }) {
  if (!node) return null
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} className="coa-scrim-enter" style={{ position: 'fixed', inset: 0, zIndex: 1500, display: 'flex', justifyContent: 'flex-end', background: 'rgba(19, 42, 63, 0.45)', backdropFilter: 'blur(4px)' }}>
      <div onClick={(e) => e.stopPropagation()} className="coa-drawer-enter" style={{ width: 560, maxWidth: '100vw', height: '100%', background: IFAS.bg.surface, boxShadow: IFAS.shadow.lg, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${IFAS.border.subtle}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: IFAS.violet, textTransform: 'uppercase', marginBottom: 6 }}>Sub GL Value Catalog</div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: IFAS.primary }}>{node.name}</h3>
            <div style={{ fontSize: 11, color: IFAS.text.secondary, fontFamily: IFAS.fontMono, marginTop: 4, fontWeight: 600 }}>{node.coaFullCode}</div>
          </div>
          <button onClick={onClose} aria-label="Tutup" style={{ width: 32, height: 32, border: 'none', background: IFAS.bg.secondary, cursor: 'pointer', color: IFAS.text.secondary, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '14px 24px', borderBottom: `1px solid ${IFAS.border.subtle}`, background: IFAS.bg.secondary }}>
          {(node.subGlConfig ?? []).map((lvl) => (
            <span key={lvl.attributeLevel} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, fontSize: 10, background: IFAS.warningBg, color: IFAS.warning, fontWeight: 700 }}>
              <span style={{ fontFamily: IFAS.fontMono }}>Lv{lvl.attributeLevel}</span> KEY IN
            </span>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center', color: IFAS.text.tertiary }}>
          <div>
            <Sparkles size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 13, fontWeight: 500 }}>Belum ada Sub GL Value</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Nilai dibuat otomatis (get-or-create) saat posting jurnal pertama.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
