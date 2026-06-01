'use client'

import { List, X, History, ScrollText, ShieldCheck } from 'lucide-react'
import { IFAS, LAYER_COLOR, type Layer } from './theme'

export interface LayerCount {
  id: Layer | 'all'
  label: string
  count: number
}

interface Props {
  layers: LayerCount[]
  activeLayer: Layer | 'all'
  onSelect: (id: Layer | 'all') => void
  onClose: () => void
  onQuickAction: (kind: 'history' | 'audit') => void
}

export function LayerPanel({ layers, activeLayer, onSelect, onClose, onQuickAction }: Props) {
  return (
    <aside
      className="coa-drawer-enter"
      style={{
        background: IFAS.bg.surface,
        borderRadius: '1.5rem',
        padding: 14,
        overflow: 'auto',
        boxShadow: IFAS.shadow.md,
        border: `1px solid ${IFAS.border.subtle}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 6px 10px', borderBottom: `1px solid ${IFAS.border.subtle}`, marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: IFAS.primary, textTransform: 'uppercase' }}>Filter & Quick Actions</div>
        <button
          onClick={onClose}
          aria-label="Tutup panel"
          style={{ width: 26, height: 26, border: 'none', background: IFAS.bg.secondary, borderRadius: '50%', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: IFAS.text.secondary }}
        >
          <X size={14} />
        </button>
      </div>

      <SectionLabel>COA Layers</SectionLabel>
      {layers.map((l) => {
        const active = activeLayer === l.id
        return (
          <button
            key={l.id}
            onClick={() => onSelect(l.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '10px 12px',
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              color: active ? IFAS.primary : IFAS.text.primary,
              background: active ? IFAS.primaryBg : 'transparent',
              border: 'none',
              borderRadius: '1rem',
              cursor: 'pointer',
              textAlign: 'left',
              marginBottom: 3,
              transition: 'background 120ms ease',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              {l.id !== 'all' ? (
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: LAYER_COLOR[l.id] }} />
              ) : (
                <List size={14} color={IFAS.text.secondary} />
              )}
              {l.label}
            </span>
            <span
              className="ifas-num"
              style={{ fontSize: 11, color: active ? IFAS.primary : IFAS.text.tertiary, fontFamily: IFAS.fontMono, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: active ? '#fff' : IFAS.bg.secondary }}
            >
              {l.count}
            </span>
          </button>
        )
      })}

      <div style={{ height: 1, background: IFAS.border.subtle, margin: '16px 6px' }} />

      <SectionLabel>Quick Actions</SectionLabel>
      <QuickAction icon={History} color={IFAS.text.secondary} label="Import/Export history" onClick={() => onQuickAction('history')} />
      <QuickAction icon={ScrollText} color={IFAS.text.secondary} label="Audit trail" onClick={() => onQuickAction('audit')} />

      <div style={{ marginTop: 16, padding: '12px 13px', background: IFAS.successBg, borderRadius: '1rem', border: `1px solid ${IFAS.successSoft}33` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <ShieldCheck size={14} color={IFAS.success} />
          <span style={{ fontSize: 10, fontWeight: 700, color: IFAS.success, letterSpacing: '0.06em', textTransform: 'uppercase' }}>ISO 27001 · SOX 404</span>
        </div>
        <div style={{ fontSize: 11, color: IFAS.text.secondary, lineHeight: 1.5 }}>Setiap perubahan tercatat di audit log (immutable, retensi 7 tahun).</div>
      </div>
    </aside>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '6px 10px 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: IFAS.text.tertiary, textTransform: 'uppercase' }}>{children}</div>
}

function QuickAction({ icon: Icon, color, label, onClick }: { icon: typeof List; color: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', fontSize: 13, color: IFAS.text.primary, background: 'transparent', border: 'none', borderRadius: '1rem', cursor: 'pointer', textAlign: 'left', marginBottom: 3, fontWeight: 500 }}
    >
      <Icon size={16} color={color} />
      {label}
    </button>
  )
}
