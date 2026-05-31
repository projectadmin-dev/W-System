// Chart of Account — pure helpers: DB→node mapping, hierarchy build, flatten, filters.
import { toFeLayer, type Layer } from './theme'
import type { CoaNode, DbCoaRow } from './types'

/** Last "-" segment of a full code → the per-layer chip code. "1-1-01" → "01". */
export function deriveSegment(fullCode: string): string {
  if (!fullCode) return ''
  const parts = fullCode.split('-')
  return parts[parts.length - 1] || fullCode
}

/** Map a raw DB row into the explorer node model, deriving display fields when
 *  the dedicated columns are not yet populated. */
export function mapRow(row: DbCoaRow): CoaNode {
  const layer: Layer = toFeLayer(row.coa_layer, row.level)
  const fullCode = row.coa_full_code || row.account_code || ''
  const normalBalance = row.normal_balance === 'credit' ? 'credit' : 'debit'
  return {
    id: row.id,
    parentId: row.parent_account_id,
    level: row.level,
    layer,
    code: row.segment_code || deriveSegment(fullCode),
    coaFullCode: fullCode,
    name: row.account_name,
    nameEn: row.name_en ?? null,
    dk: normalBalance === 'credit' ? 'CREDIT' : 'DEBIT',
    normalBalance,
    accountType: row.account_type,
    isActive: !!row.is_active,
    hasSubGL: !!row.required_sub_gl,
    contraAccount: !!row.contra_account,
    restriction: !!row.is_restricted,
    requiredSubGl: !!row.required_sub_gl,
    washedOut: !!row.is_washed_out_account,
    requiredChild: !!row.required_child,
    description: row.description ?? null,
    cashFlowCategory: (row.cash_flow_category as string) ?? null,
    sortOrder: row.sort_order ?? 0,
    audit: {
      createdAt: row.created_at ?? null,
      createdBy: row.created_by ?? null,
      updatedAt: row.updated_at ?? null,
      updatedBy: (row.updated_by as string) ?? null,
    },
  }
}

/** Build a parent→children hierarchy from a flat node list. */
export function buildHierarchy(flat: CoaNode[]): CoaNode[] {
  const map = new Map<string, CoaNode>()
  const roots: CoaNode[] = []
  flat.forEach((n) => map.set(n.id, { ...n, children: [] }))
  flat.forEach((n) => {
    const node = map.get(n.id)!
    const parent = n.parentId ? map.get(n.parentId) : null
    if (parent) parent.children!.push(node)
    else roots.push(node)
  })
  const annotate = (arr: CoaNode[]) => {
    arr.sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.coaFullCode.localeCompare(b.coaFullCode),
    )
    arr.forEach((n) => {
      n.hasChildren = (n.children?.length ?? 0) > 0
      if (n.hasChildren) annotate(n.children!)
    })
  }
  annotate(roots)
  return roots
}

/** Depth-first flatten of expanded nodes into the visible row list. */
export function flatten(nodes: CoaNode[], expanded: Set<string>, depth = 0, acc: CoaNode[] = []): CoaNode[] {
  for (const n of nodes) {
    acc.push({ ...n, _depth: depth })
    if (expanded.has(n.id) && n.children?.length) flatten(n.children, expanded, depth + 1, acc)
  }
  return acc
}

/** Keep nodes whose layer matches (or that have a matching descendant). */
export function trimByLayer(tree: CoaNode[], activeLayer: Layer | 'all'): CoaNode[] {
  if (activeLayer === 'all') return tree
  const trim = (arr: CoaNode[]): CoaNode[] => {
    const result: CoaNode[] = []
    for (const n of arr) {
      const kids = n.children ? trim(n.children) : []
      if (n.layer === activeLayer || kids.length > 0) {
        result.push({ ...n, children: kids, hasChildren: kids.length > 0 })
      }
    }
    return result
  }
  return trim(tree)
}

/** Filter by query across code/name/full-code; returns the trimmed tree + ids to auto-expand. */
export function filterByQuery(tree: CoaNode[], query: string): { nodes: CoaNode[]; autoExpand: Set<string> } {
  if (!query.trim()) return { nodes: tree, autoExpand: new Set() }
  const q = query.toLowerCase()
  const auto = new Set<string>()
  const walk = (arr: CoaNode[]): CoaNode[] => {
    const result: CoaNode[] = []
    for (const n of arr) {
      const kids = n.children ? walk(n.children) : []
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
export function ancestryOf(node: CoaNode | null, byId: Map<string, CoaNode>): CoaNode[] {
  const trail: CoaNode[] = []
  let cur: CoaNode | null = node
  while (cur) {
    trail.unshift(cur)
    cur = cur.parentId ? byId.get(cur.parentId) ?? null : null
  }
  return trail
}

/** Ids of every node that has at least one child — used by "Expand all". */
export function allParentIds(flat: CoaNode[]): Set<string> {
  const parents = new Set<string>()
  flat.forEach((n) => {
    if (n.parentId) parents.add(n.parentId)
  })
  return parents
}
