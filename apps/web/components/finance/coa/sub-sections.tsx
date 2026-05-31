'use client'

// Inspector "Sub Akun" sections: Sub-Account/GL children (1 self-level) and
// Detail-Ledger Sub-DL children (≤2 levels). Ported from the design prototype
// (sections.jsx › SubChildrenSection / SubDlChildrenSection).
import { useMemo, useState } from 'react'
import { Plus, Search, ChevronRight, Pencil, ListTree, Info } from 'lucide-react'
import { IFAS, type Density } from './theme'
import { MAX_SUB_DL_LEVEL, subDlDepth, canAcceptSubDl, isDeepestDetailLedger, type DepthNode } from '@/lib/coa-logic'
import type { CoaNode } from './types'

const PAGE_SIZE = 8

function SectionHeader({ icon, label, count, addLabel, onAdd }: { icon: React.ReactNode; label: string; count: number; addLabel?: string; onAdd?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: IFAS.text.tertiary, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 7 }}>
        {icon}
        {label}
        {count > 0 && (
          <span style={{ padding: '1px 8px', borderRadius: 999, background: IFAS.primaryBg, color: IFAS.primary, fontSize: 10, fontWeight: 700 }}>{count}</span>
        )}
      </div>
      {addLabel && onAdd && (
        <button
          onClick={onAdd}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', fontSize: 11, fontWeight: 600, color: IFAS.primary, background: IFAS.primaryBg, border: 'none', borderRadius: 999, cursor: 'pointer' }}
        >
          <Plus size={12} /> {addLabel}
        </button>
      )}
    </div>
  )
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      <Search size={12} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: IFAS.text.tertiary, pointerEvents: 'none' }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Cari kode atau nama..."
        style={{ width: '100%', padding: '7px 10px 7px 30px', fontSize: 11, border: '1px solid transparent', borderRadius: '0.875rem', background: IFAS.bg.secondary, outline: 'none', fontWeight: 500 }}
      />
    </div>
  )
}

function Pager({ page, totalPages, total, onPrev, onNext }: { page: number; totalPages: number; total: number; onPrev: () => void; onNext: () => void }) {
  if (totalPages <= 1) return null
  const btn = (disabled: boolean): React.CSSProperties => ({
    padding: '5px 11px', fontSize: 10, border: 'none', borderRadius: 999, fontWeight: 600,
    background: disabled ? 'transparent' : IFAS.bg.secondary, color: disabled ? IFAS.text.tertiary : IFAS.primary,
    cursor: disabled ? 'not-allowed' : 'pointer',
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, padding: '4px 2px' }}>
      <button onClick={onPrev} disabled={page === 1} style={btn(page === 1)}>‹ Prev</button>
      <span style={{ fontSize: 10, color: IFAS.text.tertiary }}>Hal. {page} / {totalPages} · {total} total</span>
      <button onClick={onNext} disabled={page === totalPages} style={btn(page === totalPages)}>Next ›</button>
    </div>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 14, background: IFAS.bg.secondary, border: `1px dashed ${IFAS.border.default}`, borderRadius: '1rem', fontSize: 12, color: IFAS.text.tertiary, fontStyle: 'italic', textAlign: 'center' }}>
      {children}
    </div>
  )
}

function ChildRow({ child, badge, onSelect, onEdit }: { child: CoaNode; badge?: React.ReactNode; onSelect: () => void; onEdit?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderBottom: `1px solid ${IFAS.border.subtle}` }}>
      <button onClick={onSelect} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, minWidth: 0 }}>
        <span style={{ fontFamily: IFAS.fontMono, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, flexShrink: 0, color: IFAS.primary, background: IFAS.primaryBg }}>{child.code}</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: IFAS.text.primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{child.name}</span>
        {badge}
        {child.restriction && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999, color: IFAS.warning, background: IFAS.warningBg, flexShrink: 0, letterSpacing: '0.04em' }}>REST</span>
        )}
      </button>
      {onEdit && (
        <button onClick={onEdit} title="Edit sub akun" style={{ width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: '50%', cursor: 'pointer', color: IFAS.text.secondary, flexShrink: 0 }}>
          <Pencil size={12} />
        </button>
      )}
      <ChevronRight size={14} color={IFAS.text.tertiary} />
    </div>
  )
}

// ─── Sub-Account / GL children (1 self-level) ───────────────────────────────
interface SubChildrenProps {
  node: CoaNode
  allNodes: CoaNode[]
  density: Density
  layer: 'sub' | 'gl'
  maxItems: number
  headerLabel: string
  addLabel: string
  codeHint: string
  onAdd: (parent: CoaNode) => void
  onSelect: (child: CoaNode) => void
  onEdit: (child: CoaNode) => void
}

export function SubChildrenSection({ node, allNodes, layer, maxItems, headerLabel, addLabel, codeHint, onAdd, onSelect, onEdit }: SubChildrenProps) {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const children = useMemo(
    () => allNodes.filter((c) => c.parentId === node.id && c.layer === layer).sort((a, b) => a.sortOrder - b.sortOrder),
    [allNodes, node.id, layer],
  )
  const atMax = children.length >= maxItems
  const filtered = useMemo(() => {
    if (!q.trim()) return children
    const ql = q.toLowerCase()
    return children.filter((c) => c.code.toLowerCase().includes(ql) || c.name.toLowerCase().includes(ql) || c.coaFullCode.toLowerCase().includes(ql))
  }, [children, q])
  const showSearch = children.length > 5
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = showSearch ? filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE) : filtered

  return (
    <div style={{ marginBottom: 20 }}>
      <SectionHeader icon={<ListTree size={13} />} label={headerLabel} count={children.length} addLabel={atMax ? undefined : addLabel} onAdd={atMax ? undefined : () => onAdd(node)} />
      {showSearch && <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1) }} />}
      {children.length === 0 ? (
        <EmptyHint>
          Belum ada sub akun. Klik tombol di atas untuk menambahkan.
          <div style={{ fontSize: 11, marginTop: 4 }}>{codeHint}</div>
        </EmptyHint>
      ) : filtered.length === 0 ? (
        <EmptyHint>Tidak ada hasil untuk &quot;{q}&quot;</EmptyHint>
      ) : (
        <>
          <div style={{ background: IFAS.bg.surface, border: `1px solid ${IFAS.border.subtle}`, borderRadius: '1rem', overflow: 'hidden' }}>
            {paged.map((c) => (
              <ChildRow key={c.id} child={c} onSelect={() => onSelect(c)} onEdit={() => onEdit(c)} />
            ))}
          </div>
          <Pager page={safePage} totalPages={totalPages} total={filtered.length} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => Math.min(totalPages, p + 1))} />
        </>
      )}
      {atMax && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: IFAS.warningBg, border: `1px solid ${IFAS.warningSoft}55`, borderRadius: '0.75rem', fontSize: 11, color: IFAS.warning }}>
          Sudah mencapai maksimum. {codeHint}
        </div>
      )}
    </div>
  )
}

// ─── Detail-Ledger Sub-DL children (≤2 levels) ──────────────────────────────
interface SubDlProps {
  node: CoaNode
  allNodes: CoaNode[]
  density: Density
  onAddSubDl: (parent: CoaNode) => void
  onSelectChild: (child: CoaNode) => void
  onEditChild: (child: CoaNode) => void
}

export function SubDlSection({ node, allNodes, onAddSubDl, onSelectChild, onEditChild }: SubDlProps) {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const byId = useMemo(() => new Map(allNodes.map((x) => [x.id, x as DepthNode])), [allNodes])
  const parentOf = (id: string) => byId.get(id) ?? null
  const myDepth = subDlDepth(node as DepthNode, parentOf)
  const canAdd = canAcceptSubDl(myDepth)

  const children = useMemo(
    () => allNodes.filter((c) => c.parentId === node.id && c.layer === 'detail').sort((a, b) => a.sortOrder - b.sortOrder),
    [allNodes, node.id],
  )
  const filtered = useMemo(() => {
    if (!q.trim()) return children
    const ql = q.toLowerCase()
    return children.filter((c) => c.code.toLowerCase().includes(ql) || c.name.toLowerCase().includes(ql) || c.coaFullCode.toLowerCase().includes(ql))
  }, [children, q])
  const showSearch = children.length > 5
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = showSearch ? filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE) : filtered

  return (
    <div style={{ marginBottom: 20 }}>
      <SectionHeader icon={<ListTree size={13} />} label="Sub Akun" count={children.length} addLabel={canAdd ? 'Tambah Sub Akun' : undefined} onAdd={canAdd ? () => onAddSubDl(node) : undefined} />
      {showSearch && <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1) }} />}
      {children.length === 0 ? (
        canAdd ? (
          <EmptyHint>Belum ada Sub Akun. Akun ini siap untuk posting jurnal &amp; Sub GL Config.</EmptyHint>
        ) : (
          <div style={{ padding: '10px 13px', background: IFAS.warningBg, border: `1px solid ${IFAS.warningSoft}55`, borderRadius: '0.875rem', fontSize: 12, color: IFAS.warning, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Info size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>Sudah pada Sub Akun Lv {myDepth} — maksimum {MAX_SUB_DL_LEVEL} level (sesuai aturan).</span>
          </div>
        )
      ) : filtered.length === 0 ? (
        <EmptyHint>Tidak ada hasil untuk &quot;{q}&quot;</EmptyHint>
      ) : (
        <>
          <div style={{ background: IFAS.bg.surface, border: `1px solid ${IFAS.border.subtle}`, borderRadius: '1rem', overflow: 'hidden' }}>
            {paged.map((c) => {
              const cDepth = subDlDepth(c as DepthNode, parentOf)
              const childLayers = allNodes.filter((x) => x.parentId === c.id).map((x) => x.layer)
              const cIsDeepest = isDeepestDetailLedger(c.layer, childLayers)
              const badge = (
                <>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, letterSpacing: '0.04em', color: IFAS.primary, background: IFAS.primaryBg, flexShrink: 0 }}>Lv {cDepth}</span>
                  {cIsDeepest && c.requiredSubGl && (
                    <span title="Detail Ledger ini punya Sub GL Config" style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, flexShrink: 0, letterSpacing: '0.04em', color: IFAS.violet, background: IFAS.violetBg }}>Sub GL</span>
                  )}
                </>
              )
              return <ChildRow key={c.id} child={c} badge={badge} onSelect={() => onSelectChild(c)} onEdit={() => onEditChild(c)} />
            })}
          </div>
          <Pager page={safePage} totalPages={totalPages} total={filtered.length} onPrev={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => Math.min(totalPages, p + 1))} />
        </>
      )}
    </div>
  )
}
