'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Plus, Search, X, Loader2, ChevronsDownUp, ChevronsUpDown, Upload, Download, PanelRight, Filter, Database,
} from 'lucide-react'
import { IFAS, LAYER_LABEL, MAX_SUB_DL_LEVEL, toDbLayer, type Density, type Layer } from './theme'
import { mapRow, buildHierarchy, flatten, trimByLayer, filterByQuery, ancestryOf, allParentIds } from './tree'
import { TreeRow, TREE_GRID } from './tree-row'
import { LayerPanel, type LayerCount } from './layer-panel'
import { Inspector } from './inspector'
import { DensityToggle } from './density-toggle'
import { AccountFormModal, type AccountFormValues } from './account-form-modal'
import { DeleteModal } from './delete-modal'
import type { CoaNode, DbCoaRow } from './types'

type ModalState = { kind: 'create' | 'edit' | 'delete' | null; node: CoaNode | null }

export function CoaExplorer() {
  const [rows, setRows] = useState<DbCoaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [activeLayer, setActiveLayer] = useState<Layer | 'all'>('all')
  const [density, setDensity] = useState<Density>('comfortable')
  const [layerPanelOpen, setLayerPanelOpen] = useState(true)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [modal, setModal] = useState<ModalState>({ kind: null, node: null })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadCoa = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/coa')
      if (!res.ok) throw new Error()
      const data = await res.json()
      const list: DbCoaRow[] = Array.isArray(data) ? data : data.data || []
      setRows(list)
      // Auto-expand the first two levels for orientation.
      setExpanded((prev) =>
        prev.size > 0 ? prev : new Set(list.filter((r) => (r.level ?? 9) <= 2).map((r) => r.id)),
      )
    } catch {
      toast.error('Gagal memuat Chart of Account')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCoa()
  }, [loadCoa])

  const nodes = useMemo(() => rows.map(mapRow), [rows])
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const tree = useMemo(() => buildHierarchy(nodes), [nodes])

  const layers: LayerCount[] = useMemo(() => {
    const count = (l: Layer) => nodes.filter((n) => n.layer === l).length
    return [
      { id: 'all', label: 'Semua akun', count: nodes.length },
      { id: 'category', label: LAYER_LABEL.category, count: count('category') },
      { id: 'type', label: LAYER_LABEL.type, count: count('type') },
      { id: 'sub', label: LAYER_LABEL.sub, count: count('sub') },
      { id: 'gl', label: LAYER_LABEL.gl, count: count('gl') },
      { id: 'detail', label: LAYER_LABEL.detail, count: count('detail') },
    ]
  }, [nodes])

  const layerFiltered = useMemo(() => trimByLayer(tree, activeLayer), [tree, activeLayer])
  const queried = useMemo(() => filterByQuery(layerFiltered, filter), [layerFiltered, filter])
  const effectiveExp = useMemo(() => new Set([...expanded, ...queried.autoExpand]), [expanded, queried])
  const visible = useMemo(() => flatten(queried.nodes, effectiveExp), [queried, effectiveExp])

  const selected = selectedId ? byId.get(selectedId) ?? null : null
  const trail = useMemo(() => ancestryOf(selected, byId), [selected, byId])

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const expandAll = () => setExpanded(allParentIds(nodes))
  const collapseAll = () => setExpanded(new Set())

  const openCreate = () => setModal({ kind: 'create', node: null })
  const openEdit = useCallback((node: CoaNode) => setModal({ kind: 'edit', node }), [])
  const openDelete = useCallback((node: CoaNode) => setModal({ kind: 'delete', node }), [])
  const closeModal = () => setModal({ kind: null, node: null })

  const selectNode = useCallback((node: CoaNode) => {
    setSelectedId(node.id)
    setInspectorOpen(true)
  }, [])

  // ─── CRUD ────────────────────────────────────────────────────────────
  async function submitCreate(v: AccountFormValues) {
    if (!v.code.trim() || !v.name.trim()) return toast.error('Kode dan Nama wajib diisi')
    const parent = v.parentId ? byId.get(v.parentId) : null
    if (v.layer !== 'category' && !parent) return toast.error('Parent wajib dipilih')
    const fullCode = parent ? `${parent.coaFullCode}-${v.code.trim()}` : v.code.trim()
    const siblingMax = nodes.filter((n) => n.parentId === (parent?.id ?? null)).reduce((m, n) => Math.max(m, n.sortOrder), 0)
    const payload: Record<string, unknown> = {
      account_code: fullCode,
      account_name: v.name.trim(),
      account_type: parent ? parent.accountType : v.accountType,
      level: parent ? parent.level + 1 : 1,
      normal_balance: parent ? parent.normalBalance : v.normalBalance,
      parent_account_id: parent?.id ?? null,
      coa_layer: toDbLayer(v.layer),
      sort_order: siblingMax + 1,
      is_active: v.isActive,
      contra_account: v.layer === 'type' ? v.contraAccount : false,
      is_restricted: v.layer === 'sub' || v.layer === 'gl' ? v.restriction : false,
    }
    setSaving(true)
    try {
      const res = await fetch('/api/finance/coa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || err.message || 'Gagal membuat akun')
      }
      const created = await res.json()
      toast.success(`${v.name} berhasil dibuat`)
      closeModal()
      if (parent) setExpanded((prev) => new Set([...prev, parent.id]))
      await loadCoa()
      if (created?.id) setSelectedId(created.id)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function submitEdit(v: AccountFormValues) {
    const node = modal.node
    if (!node) return
    if (!v.code.trim() || !v.name.trim()) return toast.error('Kode dan Nama wajib diisi')
    const parent = node.parentId ? byId.get(node.parentId) : null
    const fullCode = parent ? `${parent.coaFullCode}-${v.code.trim()}` : v.code.trim()
    const payload: Record<string, unknown> = {
      account_code: fullCode,
      account_name: v.name.trim(),
      is_active: v.isActive,
      ...(node.layer === 'category' && { normal_balance: v.normalBalance, account_type: v.accountType }),
      ...(node.layer === 'type' && { contra_account: v.contraAccount }),
      ...((node.layer === 'sub' || node.layer === 'gl') && { is_restricted: v.restriction }),
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/finance/coa?id=${node.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || err.message || 'Gagal memperbarui akun')
      }
      toast.success(`${v.name} berhasil diperbarui`)
      closeModal()
      await loadCoa()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    const node = modal.node
    if (!node) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/finance/coa?id=${node.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || err.message || 'Gagal menghapus akun')
      }
      toast.success(`${node.name} telah dihapus`)
      closeModal()
      if (selectedId === node.id) {
        setSelectedId(null)
        setInspectorOpen(false)
      }
      await loadCoa()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  function handleExport() {
    const headers = ['ID', 'Layer', 'Parent ID', 'Code', 'COA Full Code', 'Name', 'D/K', 'Active']
    const csvRows = nodes.map((n) => [n.id, toDbLayer(n.layer), n.parentId || '', n.code, n.coaFullCode, n.name, n.dk, n.isActive ? 'Yes' : 'No'])
    const csv = [headers, ...csvRows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `coa-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${nodes.length} akun ke CSV`)
  }

  const childCountOf = (id: string) => nodes.filter((n) => n.parentId === id).length

  return (
    <div className="coa-workspace" style={{ background: IFAS.bg.canvas, minHeight: '100%', color: IFAS.text.primary, padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header card */}
      <div style={{ background: IFAS.bg.surface, borderRadius: '1.5rem', padding: '20px 24px', boxShadow: IFAS.shadow.sm, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: IFAS.text.tertiary, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
            <span>Master Data</span>
            <span style={{ color: IFAS.border.emph }}>/</span>
            <span>Akuntansi</span>
            <span style={{ color: IFAS.border.emph }}>/</span>
            <span style={{ color: IFAS.info, fontWeight: 600 }}>Chart of Account</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: IFAS.primary }}>Chart of Account - Workspace</h1>
          <p style={{ fontSize: 13, color: IFAS.text.secondary, margin: '6px 0 0', maxWidth: 720 }}>
            Hierarki 5-level COA — Category → Type → Sub Account → General Ledger → Detail Ledger. Sub-DL maks {MAX_SUB_DL_LEVEL} level.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <DensityToggle density={density} onChange={setDensity} />
          <div style={{ display: 'inline-flex', background: IFAS.bg.secondary, borderRadius: '1rem', padding: 3, gap: 1 }}>
            <ToolbarBtn icon={ChevronsUpDown} label="Expand" onClick={expandAll} subtle />
            <ToolbarBtn icon={ChevronsDownUp} label="Collapse" onClick={collapseAll} subtle />
          </div>
          <ToolbarBtn icon={Upload} label="Import" onClick={() => toast('Import hadir pada fase berikutnya')} />
          <ToolbarBtn icon={Download} label="Export" onClick={handleExport} />
          <ToolbarBtn icon={PanelRight} label="Inspector" onClick={() => setInspectorOpen((o) => !o)} />
          <ToolbarBtn icon={Plus} label="Akun Baru" onClick={openCreate} primary />
        </div>
      </div>

      {/* Workspace */}
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: layerPanelOpen ? '268px 1fr' : '1fr', gap: 16, height: 'calc(100vh - 230px)', minHeight: 560, transition: 'grid-template-columns 200ms ease' }}>
        {layerPanelOpen && (
          <LayerPanel
            layers={layers}
            activeLayer={activeLayer}
            onSelect={setActiveLayer}
            onClose={() => setLayerPanelOpen(false)}
            onQuickAction={(kind) => toast(`${kind === 'approvals' ? 'Pending approvals' : kind === 'history' ? 'Import/Export history' : 'Audit trail'} hadir pada fase berikutnya`)}
          />
        )}

        {/* Main tree-table */}
        <main style={{ background: IFAS.bg.surface, borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: IFAS.shadow.sm, minWidth: 0 }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${IFAS.border.subtle}`, background: IFAS.bg.secondary }}>
            {!layerPanelOpen && (
              <button
                onClick={() => setLayerPanelOpen(true)}
                title="Tampilkan layer & quick actions"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: IFAS.primary, background: IFAS.bg.surface, border: `1px solid ${IFAS.border.subtle}`, borderRadius: 999, cursor: 'pointer', boxShadow: IFAS.shadow.sm }}
              >
                <Filter size={13} /> {activeLayer === 'all' ? 'Semua akun' : LAYER_LABEL[activeLayer]}
              </button>
            )}
            <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
              <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: IFAS.text.tertiary, pointerEvents: 'none' }} />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Cari berdasarkan kode, nama, atau COA full code..."
                style={{ width: '100%', padding: '9px 32px 9px 36px', fontSize: 13, border: '1px solid transparent', borderRadius: '1rem', background: IFAS.bg.surface, color: IFAS.text.primary, outline: 'none', fontWeight: 500 }}
              />
              {filter && (
                <button onClick={() => setFilter('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: IFAS.text.tertiary, display: 'inline-flex' }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <span className="ifas-num" style={{ marginLeft: 'auto', fontSize: 12, color: IFAS.text.tertiary, fontFamily: IFAS.fontMono, fontWeight: 600 }}>
              {visible.length} rows
            </span>
          </div>

          {/* Column header */}
          <div
            style={{ display: 'grid', gridTemplateColumns: TREE_GRID, gap: 14, padding: '12px 18px', borderBottom: `1px solid ${IFAS.border.default}`, background: IFAS.bg.tertiary, fontSize: 10, fontWeight: 700, color: IFAS.text.secondary, letterSpacing: '0.08em', textTransform: 'uppercase' }}
          >
            <div>Code &amp; Name</div>
            <div>Layer</div>
            <div>COA Full Code</div>
            <div>D/K</div>
            <div>Sub GL</div>
            <div>Status</div>
            <div style={{ textAlign: 'right' }}>Actions</div>
          </div>

          {/* Rows */}
          <div role="treegrid" style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: IFAS.text.tertiary }}>
                <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 13 }}>Memuat akun...</div>
              </div>
            ) : visible.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: IFAS.text.tertiary }}>
                <Database size={36} style={{ opacity: 0.4, marginBottom: 12 }} />
                <div style={{ fontSize: 13, fontWeight: 500 }}>{filter ? `Tidak ada hasil untuk "${filter}"` : 'Belum ada akun. Klik "Akun Baru" untuk memulai.'}</div>
              </div>
            ) : (
              visible.map((n) => (
                <TreeRow
                  key={n.id}
                  node={n}
                  depth={n._depth ?? 0}
                  expanded={effectiveExp.has(n.id)}
                  isSelected={selectedId === n.id}
                  density={density}
                  onToggle={toggle}
                  onSelect={selectNode}
                  onEdit={openEdit}
                  onDelete={openDelete}
                />
              ))
            )}
          </div>
        </main>

        {/* Inspector overlay */}
        {inspectorOpen && (
          <Inspector node={selected} trail={trail} density={density} onClose={() => setInspectorOpen(false)} onEdit={openEdit} onDelete={openDelete} />
        )}
      </div>

      {/* Footer hints */}
      <div style={{ padding: '12px 18px', background: IFAS.bg.surface, borderRadius: '1.5rem', fontSize: 12, color: IFAS.text.secondary, display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center', boxShadow: IFAS.shadow.sm }}>
        <span style={{ color: IFAS.text.tertiary }}>Klik baris untuk inspect · chevron untuk expand/collapse</span>
        <span className="ifas-num" style={{ marginLeft: 'auto', color: IFAS.text.tertiary, fontFamily: IFAS.fontMono, fontSize: 11 }}>IFAS · 5-Layer COA</span>
      </div>

      <AccountFormModal
        open={modal.kind === 'create' || modal.kind === 'edit'}
        mode={modal.kind === 'edit' ? 'edit' : 'create'}
        node={modal.node}
        defaultParentId={selectedId}
        allNodes={nodes}
        saving={saving}
        onClose={closeModal}
        onSubmit={modal.kind === 'edit' ? submitEdit : submitCreate}
      />
      <DeleteModal
        open={modal.kind === 'delete'}
        node={modal.node}
        hasChildren={modal.node ? childCountOf(modal.node.id) > 0 : false}
        deleting={deleting}
        onClose={closeModal}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function ToolbarBtn({ icon: Icon, label, onClick, primary, subtle }: { icon: typeof Plus; label: string; onClick: () => void; primary?: boolean; subtle?: boolean }) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: subtle ? '6px 12px' : '9px 16px',
    fontSize: subtle ? 12 : 13, fontWeight: 600, borderRadius: subtle ? '0.85rem' : '1rem', cursor: 'pointer',
    border: '1px solid', transition: 'all 150ms ease', whiteSpace: 'nowrap',
  }
  const style: React.CSSProperties = primary
    ? { ...base, color: '#fff', background: IFAS.primary, borderColor: IFAS.primary }
    : subtle
      ? { ...base, color: IFAS.text.secondary, background: 'transparent', borderColor: 'transparent' }
      : { ...base, color: IFAS.primary, background: IFAS.bg.surface, borderColor: IFAS.border.default }
  return (
    <button onClick={onClick} style={style}>
      <Icon size={subtle ? 14 : 16} /> {label}
    </button>
  )
}
