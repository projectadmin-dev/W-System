'use client'

import { X, Pencil, Trash2, Clock, PlusCircle, Eye, ArrowUpDown, Ban } from 'lucide-react'
import { IFAS, DENSITY, type Density } from './theme'
import { LayerBadge, DKChip, StatusDot, Chip } from './primitives'
import { HierarchyPath } from './hierarchy-path'
import type { CoaNode } from './types'

function PropRow({ label, children, density }: { label: string; children: React.ReactNode; density: Density }) {
  const d = DENSITY[density]
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${IFAS.border.subtle}`, gap: 12 }}>
      <span style={{ fontSize: d.fontMeta, color: IFAS.text.secondary, fontWeight: 500 }}>{label}</span>
      <span style={{ textAlign: 'right' }}>{children}</span>
    </div>
  )
}

function Pill({ icon: Icon, label, color, bg }: { icon: typeof Ban; label: string; color: string; bg: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: bg, color, fontSize: 11, fontWeight: 700 }}>
      <Icon size={11} /> {label}
    </span>
  )
}

const dash = <span style={{ fontSize: 12, color: IFAS.text.tertiary }}>Tidak</span>

interface Props {
  node: CoaNode | null
  trail: CoaNode[]
  density: Density
  onClose: () => void
  onEdit: (node: CoaNode) => void
  onDelete: (node: CoaNode) => void
}

export function Inspector({ node, trail, density, onClose, onEdit, onDelete }: Props) {
  const isDL = node?.layer === 'detail'
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="coa-scrim-enter"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(19, 42, 63, 0.4)',
        backdropFilter: 'blur(3px)',
        gridColumn: '1 / -1',
      }}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="coa-drawer-enter"
        style={{
          position: 'relative',
          width: 440,
          maxWidth: '92%',
          height: '100%',
          background: IFAS.bg.surface,
          borderTopLeftRadius: '1.5rem',
          borderBottomLeftRadius: '1.5rem',
          padding: 22,
          overflow: 'auto',
          boxShadow: IFAS.shadow.lg,
        }}
      >
        <button
          onClick={onClose}
          aria-label="Tutup inspector"
          style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, border: 'none', background: IFAS.bg.secondary, borderRadius: '50%', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: IFAS.text.secondary, zIndex: 2 }}
        >
          <X size={18} />
        </button>

        {node ? (
          <>
            <div style={{ marginBottom: 18 }}>
              <LayerBadge layer={node.layer} density={density} />
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: '10px 0 4px', letterSpacing: '-0.01em', lineHeight: 1.3, color: IFAS.primary }}>{node.name}</h2>
              {node.nameEn && <div style={{ fontSize: 12, color: IFAS.text.secondary, marginBottom: 5 }}>{node.nameEn}</div>}
              <div style={{ fontSize: 12, color: IFAS.text.secondary, fontFamily: IFAS.fontMono, fontWeight: 600 }}>{node.coaFullCode}</div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <HierarchyPath trail={trail} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: IFAS.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>Properties</div>
              <PropRow label="Code" density={density}>
                <span style={{ fontFamily: IFAS.fontMono, fontSize: 13, fontWeight: 600 }}>{node.code}</span>
              </PropRow>
              <PropRow label="Level" density={density}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{node.level}</span>
              </PropRow>
              <PropRow label="Normal balance" density={density}>
                <DKChip value={node.dk} density={density} />
              </PropRow>
              {!isDL && (
                <PropRow label="Sub GL" density={density}>
                  {node.hasSubGL ? (
                    <Chip color={IFAS.violet} bg={IFAS.violetBg} density={density}>Required</Chip>
                  ) : (
                    <span style={{ fontSize: 12, color: IFAS.text.tertiary }}>Not configured</span>
                  )}
                </PropRow>
              )}
              {node.layer === 'type' && (
                <PropRow label="Contra Account" density={density}>
                  {node.contraAccount ? <Pill icon={ArrowUpDown} label="NB di-flip" color={IFAS.warning} bg={IFAS.warningBg} /> : dash}
                </PropRow>
              )}
              {(node.layer === 'sub' || node.layer === 'gl') && (
                <PropRow label="Restriction" density={density}>
                  {node.restriction ? <Pill icon={Ban} label="Restricted" color={IFAS.danger} bg={IFAS.dangerBg} /> : dash}
                </PropRow>
              )}
              <PropRow label="Status" density={density}>
                <StatusDot active={node.isActive} density={density} />
              </PropRow>
              {isDL && (
                <PropRow label="Washed out" density={density}>
                  {node.washedOut ? <Pill icon={ArrowUpDown} label="Auto-zero period end" color={IFAS.warning} bg={IFAS.warningBg} /> : dash}
                </PropRow>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: IFAS.text.tertiary, textTransform: 'uppercase', marginBottom: 8 }}>Audit Trail</div>
              <div style={{ background: IFAS.bg.secondary, borderRadius: '1rem', padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: IFAS.text.secondary, marginBottom: 6 }}>
                  <Clock size={13} style={{ color: IFAS.text.tertiary }} />
                  <span>
                    Updated <strong style={{ color: IFAS.text.primary, fontWeight: 600 }}>{fmtDate(node.audit.updatedAt)}</strong>
                  </span>
                </div>
                <div style={{ fontSize: 11, color: IFAS.text.tertiary, marginLeft: 23, marginBottom: 10 }}>by {node.audit.updatedBy || 'SYSTEM'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: IFAS.text.secondary, marginBottom: 6 }}>
                  <PlusCircle size={13} style={{ color: IFAS.text.tertiary }} />
                  <span>
                    Created <strong style={{ color: IFAS.text.primary, fontWeight: 600 }}>{fmtDate(node.audit.createdAt)}</strong>
                  </span>
                </div>
                <div style={{ fontSize: 11, color: IFAS.text.tertiary, marginLeft: 23 }}>by {node.audit.createdBy || 'SYSTEM'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => onEdit(node)} style={primaryBtn}>
                <Pencil size={15} /> Edit
              </button>
              <button onClick={() => onDelete(node)} style={defaultBtn}>
                <Trash2 size={15} /> Hapus
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', color: IFAS.text.tertiary }}>
            <Eye size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 13 }}>Pilih satu baris untuk inspect</div>
          </div>
        )}
      </aside>
    </div>
  )
}

function fmtDate(s: string | null): string {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return s
  }
}

const primaryBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', fontSize: 13, fontWeight: 600,
  color: '#fff', background: IFAS.primary, border: `1px solid ${IFAS.primary}`, borderRadius: '1rem', cursor: 'pointer',
}
const defaultBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', fontSize: 13, fontWeight: 600,
  color: IFAS.primary, background: IFAS.bg.surface, border: `1px solid ${IFAS.border.default}`, borderRadius: '1rem', cursor: 'pointer',
}
