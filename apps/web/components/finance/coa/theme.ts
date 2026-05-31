// Chart of Account — IFAS Design System tokens.
// Mirrors the design handoff (coa-standalone/data.jsx › IFAS) so the workspace
// reads visually identical to the prototype. Dynamic per-layer colors are applied
// via inline styles (Tailwind cannot enumerate arbitrary brand hexes per layer),
// while layout/spacing uses Tailwind utility classes.

export const IFAS = {
  fontMono: "ui-monospace, 'SF Mono', 'Roboto Mono', Menlo, monospace",
  text: {
    primary: '#323232',
    secondary: '#6c757d',
    tertiary: '#adb5bd',
    onDark: '#ffffff',
  },
  bg: {
    canvas: '#f1f1f1',
    surface: '#ffffff',
    secondary: '#f8f9fa',
    tertiary: '#f1f3f5',
  },
  border: { subtle: '#e9ecef', default: '#dee2e6', emph: '#ced4da' },
  primary: '#132a3f', // navy — brand
  primaryBg: '#e7eef8', // pale blue tint
  primaryDark: '#0d1f30',
  accent: '#ffcd02', // brand yellow (logo accent)
  success: '#1f8a5b',
  successBg: '#e7f7f1',
  successSoft: '#46bcaa',
  danger: '#c8421b',
  dangerBg: '#fdebe3',
  warning: '#b88600',
  warningBg: '#fff8e1',
  warningSoft: '#ffcf52',
  info: '#4d69fa',
  infoBg: '#eef2fb',
  violet: '#6c5dd3',
  violetBg: '#f1efff',
  shadow: {
    sm: '0 0.5rem 1.5rem rgba(0,0,0,0.05)',
    md: '0 4px 6px -2px rgba(0,0,0,0.05), 0 10px 15px -3px rgba(0,0,0,0.08)',
    lg: '0 1.6rem 3rem rgba(0,0,0,0.175)',
  },
} as const

// Layer vocabulary, mapping, and MAX_SUB_DL_LEVEL live in the pure logic module
// (testable via node:test); re-exported here so UI code keeps importing from './theme'.
import type { CoaLayer } from '@/lib/coa-logic'
export type Layer = CoaLayer
export { toFeLayer, toDbLayer, MAX_SUB_DL_LEVEL } from '@/lib/coa-logic'

// Distinct color per hierarchy level (used by code chips, layer badges, filter dots).
export const LAYER_COLOR: Record<Layer, string> = {
  category: '#132a3f', // navy (brand)
  type: '#6c5dd3', // violet
  sub: '#4d69fa', // electric blue
  gl: '#1f8a5b', // teal
  detail: '#c8421b', // vermillion
}
export const LAYER_COLOR_BG: Record<Layer, string> = {
  category: '#e7eef8',
  type: '#f1efff',
  sub: '#eef2fb',
  gl: '#e7f7f1',
  detail: '#fdebe3',
}
export const LAYER_LABEL: Record<Layer, string> = {
  category: 'Account Category',
  type: 'Account Type',
  sub: 'Sub Account Type',
  gl: 'General Ledger',
  detail: 'Detail Ledger',
}

// Density presets — drive row/chip/button paddings, font sizes and tree indent.
export type Density = 'comfortable' | 'compact'
export interface DensityPreset {
  rowPadY: number
  rowPadX: number
  fontBase: number
  fontMeta: number
  fontSmall: number
  chipPadY: number
  chipPadX: number
  chipFont: number
  indentStep: number
}
export const DENSITY: Record<Density, DensityPreset> = {
  comfortable: {
    rowPadY: 12, rowPadX: 18, fontBase: 13, fontMeta: 12, fontSmall: 11,
    chipPadY: 3, chipPadX: 9, chipFont: 11, indentStep: 22,
  },
  compact: {
    rowPadY: 7, rowPadX: 14, fontBase: 12, fontMeta: 11, fontSmall: 10,
    chipPadY: 2, chipPadX: 7, chipFont: 10, indentStep: 18,
  },
}
