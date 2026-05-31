'use client'

import { Maximize2, Minimize2 } from 'lucide-react'
import { IFAS, type Density } from './theme'

const OPTIONS: { value: Density; icon: typeof Maximize2; label: string }[] = [
  { value: 'comfortable', icon: Maximize2, label: 'Comfortable' },
  { value: 'compact', icon: Minimize2, label: 'Compact' },
]

export function DensityToggle({ density, onChange }: { density: Density; onChange: (d: Density) => void }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 3,
        background: IFAS.bg.secondary,
        borderRadius: '1rem',
        border: `1px solid ${IFAS.border.subtle}`,
      }}
    >
      {OPTIONS.map((opt) => {
        const active = density === opt.value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: active ? IFAS.primary : IFAS.text.secondary,
              background: active ? IFAS.bg.surface : 'transparent',
              border: 'none',
              borderRadius: '0.85rem',
              cursor: 'pointer',
              boxShadow: active ? IFAS.shadow.sm : 'none',
              transition: 'all 150ms ease',
            }}
          >
            <Icon size={13} /> {opt.label}
          </button>
        )
      })}
    </div>
  )
}
