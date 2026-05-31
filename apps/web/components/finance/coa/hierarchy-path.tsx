'use client'

import { CornerDownRight } from 'lucide-react'
import { IFAS, LAYER_COLOR, LAYER_COLOR_BG } from './theme'
import type { CoaNode } from './types'

interface Props {
  trail: CoaNode[]
  pendingCode?: string
  pendingName?: string
}

/** Ancestry chain shown in the inspector and in create/edit forms (with an optional [NEW] node). */
export function HierarchyPath({ trail, pendingCode = '', pendingName = '' }: Props) {
  if (trail.length === 0 && !pendingCode && !pendingName) return null
  return (
    <div
      style={{
        background: IFAS.bg.secondary,
        border: `1px solid ${IFAS.border.subtle}`,
        borderRadius: '1rem',
        padding: '12px 16px',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: IFAS.text.tertiary, textTransform: 'uppercase', marginBottom: 10 }}>
        Hierarchy Path
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {trail.map((n, i) => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: i * 14 }}>
            {i > 0 && <CornerDownRight size={12} style={{ color: IFAS.text.tertiary, flexShrink: 0 }} />}
            <span
              style={{
                fontFamily: IFAS.fontMono,
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                color: LAYER_COLOR[n.layer],
                background: LAYER_COLOR_BG[n.layer],
                flexShrink: 0,
              }}
            >
              {n.code}
            </span>
            <span style={{ fontSize: 12, color: IFAS.text.primary, fontWeight: 500 }}>{n.name}</span>
          </div>
        ))}
        {(pendingCode || pendingName) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: trail.length * 14 }}>
            {trail.length > 0 && <CornerDownRight size={12} style={{ color: IFAS.text.tertiary, flexShrink: 0 }} />}
            <span
              style={{
                fontFamily: IFAS.fontMono,
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                color: IFAS.primary,
                background: IFAS.primaryBg,
                flexShrink: 0,
                border: `1px dashed ${IFAS.primary}66`,
              }}
            >
              {pendingCode || '????'}
            </span>
            <span style={{ fontSize: 12, color: IFAS.primary, fontStyle: 'italic', fontWeight: 500 }}>{pendingName || 'Nama akun baru...'}</span>
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 999, background: IFAS.primary, color: '#fff', fontWeight: 700, letterSpacing: '0.05em' }}>NEW</span>
          </div>
        )}
      </div>
    </div>
  )
}
