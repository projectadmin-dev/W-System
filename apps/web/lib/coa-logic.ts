// ============================================================================
// Chart of Account — pure domain logic (no React / no imports).
// Mirrors the testable `ap-logic.ts` pattern so node:test can exercise it.
// Rules are sourced from "IFAS COA Structure Knowledge R0" (§1.3–§1.5, §3, §5).
//
// Run tests: node --experimental-strip-types --test apps/web/lib/__tests__/coa-logic.test.ts
// ============================================================================

export type CoaLayer = 'category' | 'type' | 'sub' | 'gl' | 'detail'
export type DK = 'DEBIT' | 'CREDIT'

export const MAX_SUB_DL_LEVEL = 2

/** Max self-referencing children per layer (§3). */
export const MAX_CHILDREN: Record<'sub' | 'gl', number> = { sub: 99, gl: 9 }

/** Build a COA full code by appending a segment to the parent's full code. */
export function buildFullCode(parentFullCode: string | null, segment: string): string {
  const s = (segment ?? '').trim()
  const p = (parentFullCode ?? '').trim()
  return p ? `${p}-${s}` : s
}

/** The trailing "-" segment of a full code → the per-layer chip code. */
export function deriveSegment(fullCode: string): string {
  if (!fullCode) return ''
  const parts = fullCode.split('-')
  return parts[parts.length - 1] || fullCode
}

/**
 * Validate a single segment code for a layer. Returns an Indonesian error
 * message, or null when valid. Width conventions (§1.3–§1.5):
 *   category/type = 1 digit · sub = 2 digits (01–99) · gl = 1 digit (1–9) · detail = 4 digits
 */
export function validateSegmentCode(layer: CoaLayer, code: string): string | null {
  const k = (code ?? '').trim()
  if (!k) return 'Kode wajib diisi'
  if (!/^\d+$/.test(k)) return `Kode "${k}" harus berupa angka`
  switch (layer) {
    case 'category':
    case 'type':
      if (k.length !== 1) return `Kode ${layer} "${k}" harus 1 digit`
      return null
    case 'sub':
      if (k.length !== 2) return `Kode Sub Account "${k}" harus 2 digit (contoh: 01, 02)`
      return null
    case 'gl': {
      const n = parseInt(k, 10)
      if (k.length !== 1 || n < 1 || n > 9) return `Kode GL "${k}" harus 1 digit antara 1–9`
      return null
    }
    case 'detail':
      if (k.length !== 4) return `Kode Detail Ledger "${k}" harus 4 digit (0000–9999)`
      return null
    default:
      return null
  }
}

export interface ChildRow {
  kode: string
  nama: string
}

/**
 * Validate a batch of key-in child rows. Filters blank rows, validates each
 * code's width, rejects duplicates within the batch and against existing
 * sibling codes, and enforces the per-layer maximum. Returns the cleaned valid
 * rows plus the first error (or null).
 */
export function validateBatchChildren(
  rows: ChildRow[],
  layer: CoaLayer,
  existingCodes: string[],
  maxItems: number,
): { valid: ChildRow[]; error: string | null } {
  const valid = (rows ?? [])
    .map((r) => ({ kode: (r.kode ?? '').trim(), nama: (r.nama ?? '').trim() }))
    .filter((r) => r.kode || r.nama)

  if (valid.length === 0) return { valid: [], error: 'Minimal 1 baris Kode + Nama wajib diisi' }

  for (const r of valid) {
    if (!r.nama) return { valid: [], error: `Nama wajib diisi untuk kode "${r.kode}"` }
    const codeErr = validateSegmentCode(layer, r.kode)
    if (codeErr) return { valid: [], error: codeErr }
  }

  const seen = new Set<string>()
  for (const r of valid) {
    if (seen.has(r.kode)) return { valid: [], error: `Kode "${r.kode}" duplikat dalam daftar` }
    seen.add(r.kode)
  }

  const existing = new Set(existingCodes)
  for (const r of valid) {
    if (existing.has(r.kode)) return { valid: [], error: `Kode "${r.kode}" sudah ada di bawah akun ini` }
  }

  if (existingCodes.length + valid.length > maxItems) {
    return { valid: [], error: `Melebihi batas maksimum ${maxItems} sub akun` }
  }

  return { valid, error: null }
}

/** Minimal node shape needed for depth/leaf calculations. */
export interface DepthNode {
  id: string
  parentId: string | null
  layer: CoaLayer
}

/**
 * Sub-DL depth of a detail node: 0 when its parent is a GL (base DL), else the
 * number of consecutive `detail` ancestors (§1.5, mirrors getSubDlLevel).
 * Returns -1 for non-detail nodes.
 */
export function subDlDepth(node: DepthNode | null, parentOf: (id: string) => DepthNode | null): number {
  if (!node || node.layer !== 'detail') return -1
  let depth = 0
  let cursor: DepthNode | null = node
  while (cursor && cursor.parentId) {
    const parent = parentOf(cursor.parentId)
    if (!parent || parent.layer !== 'detail') break
    depth += 1
    cursor = parent
  }
  return depth
}

/** A detail node can accept a new Sub-DL only while below the max depth. */
export function canAcceptSubDl(depth: number): boolean {
  return depth >= 0 && depth < MAX_SUB_DL_LEVEL
}

/** A detail node is the deepest (postable, Sub-GL-capable) DL when it has no detail child. */
export function isDeepestDetailLedger(nodeLayer: CoaLayer, childLayers: CoaLayer[]): boolean {
  return nodeLayer === 'detail' && !childLayers.includes('detail')
}

/** Effective normal balance: a contra account flips its parent's normal balance. */
export function effectiveDk(parentDk: DK, contraAccount: boolean): DK {
  if (!contraAccount) return parentDk
  return parentDk === 'DEBIT' ? 'CREDIT' : 'DEBIT'
}

/** normal_balance (db, lowercase) ↔ DK chip value. */
export function nbToDk(nb: string | null | undefined): DK {
  return nb === 'credit' ? 'CREDIT' : 'DEBIT'
}
export function dkToNb(dk: DK): 'debit' | 'credit' {
  return dk === 'CREDIT' ? 'credit' : 'debit'
}

export const LAYER_ORDER: CoaLayer[] = ['category', 'type', 'sub', 'gl', 'detail']

/** Layer one level below the given layer (for parent→child create flows). */
export function childLayerOf(layer: CoaLayer): CoaLayer | null {
  const i = LAYER_ORDER.indexOf(layer)
  return i >= 0 && i < LAYER_ORDER.length - 1 ? LAYER_ORDER[i + 1]! : null
}

/** Layer one level above (the eligible parent layer). */
export function parentLayerOf(layer: CoaLayer): CoaLayer | null {
  const i = LAYER_ORDER.indexOf(layer)
  return i > 0 ? LAYER_ORDER[i - 1]! : null
}

// ─── DB ↔ FE layer mapping ──────────────────────────────────────────────────
const DB_TO_FE: Record<string, CoaLayer> = {
  category: 'category',
  type: 'type',
  sub_account: 'sub',
  general_ledger: 'gl',
  detail_ledger: 'detail',
}
const FE_TO_DB: Record<CoaLayer, string> = {
  category: 'category',
  type: 'type',
  sub: 'sub_account',
  gl: 'general_ledger',
  detail: 'detail_ledger',
}
const LEVEL_TO_FE: Record<number, CoaLayer> = { 1: 'category', 2: 'type', 3: 'sub', 4: 'gl', 5: 'detail' }

export function toFeLayer(coaLayer: string | null | undefined, level?: number): CoaLayer {
  if (coaLayer && DB_TO_FE[coaLayer]) return DB_TO_FE[coaLayer]!
  if (level && LEVEL_TO_FE[level]) return LEVEL_TO_FE[level]!
  return 'detail'
}
export function toDbLayer(layer: CoaLayer): string {
  return FE_TO_DB[layer]
}

// ─── Tree engine (pure, generic over a minimal node shape) ──────────────────
export interface CoaTreeNode {
  id: string
  parentId: string | null
  layer: CoaLayer
  code: string
  name: string
  coaFullCode: string
  sortOrder: number
  children?: CoaTreeNode[]
  hasChildren?: boolean
  _depth?: number
}

/** Build a parent→children hierarchy from a flat node list. */
export function buildHierarchy<T extends CoaTreeNode>(flat: T[]): T[] {
  const map = new Map<string, T>()
  const roots: T[] = []
  flat.forEach((n) => map.set(n.id, { ...n, children: [] as T[] }))
  flat.forEach((n) => {
    const node = map.get(n.id)!
    const parent = n.parentId ? map.get(n.parentId) : null
    if (parent) (parent.children as T[]).push(node)
    else roots.push(node)
  })
  const annotate = (arr: T[]) => {
    arr.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.coaFullCode.localeCompare(b.coaFullCode))
    arr.forEach((n) => {
      const kids = (n.children as T[]) ?? []
      n.hasChildren = kids.length > 0
      if (n.hasChildren) annotate(kids)
    })
  }
  annotate(roots)
  return roots
}

/** Depth-first flatten of expanded nodes into the visible row list. */
export function flatten<T extends CoaTreeNode>(nodes: T[], expanded: Set<string>, depth = 0, acc: T[] = []): T[] {
  for (const n of nodes) {
    acc.push({ ...n, _depth: depth })
    const kids = n.children as T[] | undefined
    if (expanded.has(n.id) && kids?.length) flatten(kids, expanded, depth + 1, acc)
  }
  return acc
}

/** Keep nodes whose layer matches (or that have a matching descendant). */
export function trimByLayer<T extends CoaTreeNode>(tree: T[], activeLayer: CoaLayer | 'all'): T[] {
  if (activeLayer === 'all') return tree
  const trim = (arr: T[]): T[] => {
    const result: T[] = []
    for (const n of arr) {
      const kids = n.children ? trim(n.children as T[]) : []
      if (n.layer === activeLayer || kids.length > 0) {
        result.push({ ...n, children: kids, hasChildren: kids.length > 0 })
      }
    }
    return result
  }
  return trim(tree)
}

/** Filter by query across code/name/full-code; returns the trimmed tree + ids to auto-expand. */
export function filterByQuery<T extends CoaTreeNode>(tree: T[], query: string): { nodes: T[]; autoExpand: Set<string> } {
  if (!query.trim()) return { nodes: tree, autoExpand: new Set() }
  const q = query.toLowerCase()
  const auto = new Set<string>()
  const walk = (arr: T[]): T[] => {
    const result: T[] = []
    for (const n of arr) {
      const kids = n.children ? walk(n.children as T[]) : []
      const match =
        n.name.toLowerCase().includes(q) ||
        n.code.toLowerCase().includes(q) ||
        n.coaFullCode.toLowerCase().includes(q)
      if (match || kids.length > 0) {
        if (kids.length > 0) auto.add(n.id)
        result.push({ ...n, children: kids, hasChildren: kids.length > 0 })
      }
    }
    return result
  }
  return { nodes: walk(tree), autoExpand: auto }
}

/** Ancestor chain (root → node), inclusive. */
export function ancestryOf<T extends CoaTreeNode>(node: T | null, byId: Map<string, T>): T[] {
  const trail: T[] = []
  let cur: T | null = node
  while (cur) {
    trail.unshift(cur)
    cur = cur.parentId ? byId.get(cur.parentId) ?? null : null
  }
  return trail
}

/** Ids of every node that has at least one child — used by "Expand all". */
export function allParentIds(flat: { parentId: string | null }[]): Set<string> {
  const parents = new Set<string>()
  flat.forEach((n) => {
    if (n.parentId) parents.add(n.parentId)
  })
  return parents
}
