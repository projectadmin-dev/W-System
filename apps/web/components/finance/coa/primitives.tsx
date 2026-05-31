'use client'

// Chart of Account — small IFAS-styled visual primitives.
import { memo } from 'react'
import { IFAS, LAYER_COLOR, LAYER_COLOR_BG, LAYER_LABEL, DENSITY, type Layer, type Density } from './theme'

interface ChipProps {
  children: React.ReactNode
  color: string
  bg: string
  mono?: boolean
  density?: Density
  title?: string
}

export const Chip = memo(function Chip({ children, color, bg, mono, density = 'comfortable', title }: ChipProps) {
  const d = DENSITY[density]
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: `${d.chipPadY}px ${d.chipPadX}px`,
        borderRadius: 999,
        fontFamily: mono ? IFAS.fontMono : undefined,
        fontSize: d.chipFont,
        fontWeight: 600,
        color,
        backgroundColor: bg,
        letterSpacing: mono ? '0.02em' : 0,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
})

/** Mono, layer-colored code chip (the per-row "code" pill). */
export const CodeChip = memo(function CodeChip({ code, layer, density }: { code: string; layer: Layer; density?: Density }) {
  return (
    <Chip color={LAYER_COLOR[layer]} bg={LAYER_COLOR_BG[layer]} mono density={density}>
      {code}
    </Chip>
  )
})

export const LayerBadge = memo(function LayerBadge({ layer, density }: { layer: Layer; density?: Density }) {
  return (
    <Chip color={LAYER_COLOR[layer]} bg={LAYER_COLOR_BG[layer]} density={density}>
      {LAYER_LABEL[layer].toUpperCase()}
    </Chip>
  )
})

export const DKChip = memo(function DKChip({ value, density }: { value: 'DEBIT' | 'CREDIT' | null | undefined; density?: Density }) {
  if (!value) return <span style={{ color: IFAS.text.tertiary }}>—</span>
  const isDebit = value === 'DEBIT'
  return (
    <Chip color={isDebit ? IFAS.info : IFAS.warning} bg={isDebit ? IFAS.infoBg : IFAS.warningBg} density={density}>
      {value}
    </Chip>
  )
})

export const SubGlChip = memo(function SubGlChip({ density }: { density?: Density }) {
  return (
    <Chip color={IFAS.violet} bg={IFAS.violetBg} density={density}>
      Sub GL
    </Chip>
  )
})

export const StatusDot = memo(function StatusDot({ active, density = 'comfortable' }: { active: boolean; density?: Density }) {
  const d = DENSITY[density]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: d.fontMeta, color: active ? IFAS.success : IFAS.text.tertiary }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? IFAS.successSoft : '#cbd2d9' }} />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
})
