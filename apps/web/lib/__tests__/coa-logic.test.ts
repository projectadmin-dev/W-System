// ============================================================================
// Chart of Account — logic test suite (node:test)
// Run: node --experimental-strip-types --test apps/web/lib/__tests__/coa-logic.test.ts
//
// Test names are prefixed TC-### [US-###] so results trace to user stories and
// export to the QA dashboard (/finance/qa).
//
// User stories:
//   US-COA-01  COA code & full-code conventions (§1.3–§1.5, §12)
//   US-COA-02  Batch Sub Akun validation (§3, §5 rules 6/7/9)
//   US-COA-03  Sub-DL depth & deepest-leaf rules (§1.5, §5 rules 3/5)
//   US-COA-04  Normal-balance cascade & contra flip (§1.1, §1.2, §5 rules 1/2)
//   US-COA-05  Tree build / flatten / search / layer filter (explorer engine)
// ============================================================================
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildFullCode, deriveSegment, validateSegmentCode, validateBatchChildren,
  subDlDepth, canAcceptSubDl, isDeepestDetailLedger, effectiveDk,
  nbToDk, dkToNb, childLayerOf, parentLayerOf, toFeLayer, toDbLayer,
  buildHierarchy, flatten, trimByLayer, filterByQuery, ancestryOf, allParentIds,
  MAX_CHILDREN, MAX_SUB_DL_LEVEL,
  type DepthNode, type CoaTreeNode, type CoaLayer,
} from '../coa-logic.ts'

// ─── US-COA-01: code & full-code ────────────────────────────────────────────
test('TC-001 [US-COA-01] buildFullCode joins parent + segment with dash', () => {
  assert.equal(buildFullCode('1-1-01-1', '2000'), '1-1-01-1-2000')
})
test('TC-002 [US-COA-01] buildFullCode returns segment alone at root', () => {
  assert.equal(buildFullCode(null, '1'), '1')
  assert.equal(buildFullCode('', '2'), '2')
})
test('TC-003 [US-COA-01] buildFullCode trims whitespace', () => {
  assert.equal(buildFullCode(' 1-1 ', ' 01 '), '1-1-01')
})
test('TC-004 [US-COA-01] deriveSegment returns trailing segment', () => {
  assert.equal(deriveSegment('1-1-01-1-2000'), '2000')
  assert.equal(deriveSegment('1'), '1')
  assert.equal(deriveSegment(''), '')
})
test('TC-005 [US-COA-01] validateSegmentCode: sub must be 2 digits', () => {
  assert.equal(validateSegmentCode('sub', '01'), null)
  assert.ok(validateSegmentCode('sub', '1'))
  assert.ok(validateSegmentCode('sub', '001'))
})
test('TC-006 [US-COA-01] validateSegmentCode: gl must be 1 digit 1–9', () => {
  assert.equal(validateSegmentCode('gl', '5'), null)
  assert.ok(validateSegmentCode('gl', '0'))
  assert.ok(validateSegmentCode('gl', '10'))
})
test('TC-007 [US-COA-01] validateSegmentCode: detail must be 4 digits', () => {
  assert.equal(validateSegmentCode('detail', '2000'), null)
  assert.ok(validateSegmentCode('detail', '200'))
})
test('TC-008 [US-COA-01] validateSegmentCode: non-numeric rejected', () => {
  assert.ok(validateSegmentCode('detail', '20A0'))
  assert.ok(validateSegmentCode('sub', 'ab'))
})
test('TC-009 [US-COA-01] validateSegmentCode: empty rejected', () => {
  assert.ok(validateSegmentCode('sub', ''))
  assert.ok(validateSegmentCode('gl', '   '))
})
test('TC-010 [US-COA-01] childLayerOf walks the hierarchy', () => {
  assert.equal(childLayerOf('category'), 'type')
  assert.equal(childLayerOf('gl'), 'detail')
  assert.equal(childLayerOf('detail'), null)
})

// ─── US-COA-02: batch validation ────────────────────────────────────────────
test('TC-011 [US-COA-02] validateBatchChildren: happy path returns cleaned rows', () => {
  const r = validateBatchChildren([{ kode: '01', nama: 'A' }, { kode: '02', nama: 'B' }], 'sub', [], 99)
  assert.equal(r.error, null)
  assert.equal(r.valid.length, 2)
})
test('TC-012 [US-COA-02] validateBatchChildren: drops fully blank rows', () => {
  const r = validateBatchChildren([{ kode: '01', nama: 'A' }, { kode: '', nama: '' }], 'sub', [], 99)
  assert.equal(r.error, null)
  assert.equal(r.valid.length, 1)
})
test('TC-013 [US-COA-02] validateBatchChildren: empty → error', () => {
  const r = validateBatchChildren([{ kode: '', nama: '' }], 'sub', [], 99)
  assert.ok(r.error)
})
test('TC-014 [US-COA-02] validateBatchChildren: in-batch duplicate rejected', () => {
  const r = validateBatchChildren([{ kode: '01', nama: 'A' }, { kode: '01', nama: 'B' }], 'sub', [], 99)
  assert.match(r.error ?? '', /duplikat/)
})
test('TC-015 [US-COA-02] validateBatchChildren: duplicate vs existing rejected', () => {
  const r = validateBatchChildren([{ kode: '01', nama: 'A' }], 'sub', ['01'], 99)
  assert.match(r.error ?? '', /sudah ada/)
})
test('TC-016 [US-COA-02] validateBatchChildren: exceeding max rejected', () => {
  // existing 2 + 2 new (non-colliding) > maxItems 3 → max-count error
  const r = validateBatchChildren([{ kode: '03', nama: 'A' }, { kode: '04', nama: 'B' }], 'sub', ['01', '02'], 3)
  assert.match(r.error ?? '', /maksimum/)
})
test('TC-017 [US-COA-02] validateBatchChildren: bad code width rejected', () => {
  const r = validateBatchChildren([{ kode: '1', nama: 'A' }], 'sub', [], 99)
  assert.ok(r.error)
})
test('TC-018 [US-COA-02] validateBatchChildren: missing name rejected', () => {
  const r = validateBatchChildren([{ kode: '01', nama: '' }, { kode: '02', nama: 'ok' }], 'sub', [], 99)
  // row 01 has a code but no name → error
  assert.ok(r.error)
})
test('TC-019 [US-COA-02] MAX_CHILDREN constants', () => {
  assert.equal(MAX_CHILDREN.sub, 99)
  assert.equal(MAX_CHILDREN.gl, 9)
})

// ─── US-COA-03: sub-DL depth ────────────────────────────────────────────────
const dlNodes: Record<string, DepthNode> = {
  gl1: { id: 'gl1', parentId: 'sub1', layer: 'gl' },
  dl0: { id: 'dl0', parentId: 'gl1', layer: 'detail' },      // base DL (depth 0)
  dl1: { id: 'dl1', parentId: 'dl0', layer: 'detail' },      // sub-DL Lv1
  dl2: { id: 'dl2', parentId: 'dl1', layer: 'detail' },      // sub-DL Lv2
}
const parentOf = (id: string) => dlNodes[id] ?? null
test('TC-020 [US-COA-03] subDlDepth: base DL under GL is 0', () => {
  assert.equal(subDlDepth(dlNodes.dl0!, parentOf), 0)
})
test('TC-021 [US-COA-03] subDlDepth: nested DLs increment', () => {
  assert.equal(subDlDepth(dlNodes.dl1!, parentOf), 1)
  assert.equal(subDlDepth(dlNodes.dl2!, parentOf), 2)
})
test('TC-022 [US-COA-03] subDlDepth: non-detail → -1', () => {
  assert.equal(subDlDepth(dlNodes.gl1!, parentOf), -1)
  assert.equal(subDlDepth(null, parentOf), -1)
})
test('TC-023 [US-COA-03] canAcceptSubDl respects MAX_SUB_DL_LEVEL', () => {
  assert.equal(MAX_SUB_DL_LEVEL, 2)
  assert.equal(canAcceptSubDl(0), true)
  assert.equal(canAcceptSubDl(1), true)
  assert.equal(canAcceptSubDl(2), false)
  assert.equal(canAcceptSubDl(-1), false)
})
test('TC-024 [US-COA-03] isDeepestDetailLedger: leaf detail is deepest', () => {
  assert.equal(isDeepestDetailLedger('detail', []), true)
  assert.equal(isDeepestDetailLedger('detail', ['detail']), false)
  assert.equal(isDeepestDetailLedger('gl', []), false)
})

// ─── US-COA-04: normal balance cascade & contra ─────────────────────────────
test('TC-025 [US-COA-04] effectiveDk: no contra keeps parent DK', () => {
  assert.equal(effectiveDk('DEBIT', false), 'DEBIT')
  assert.equal(effectiveDk('CREDIT', false), 'CREDIT')
})
test('TC-026 [US-COA-04] effectiveDk: contra flips DK', () => {
  assert.equal(effectiveDk('DEBIT', true), 'CREDIT')
  assert.equal(effectiveDk('CREDIT', true), 'DEBIT')
})
test('TC-027 [US-COA-04] nbToDk / dkToNb round-trip', () => {
  assert.equal(nbToDk('debit'), 'DEBIT')
  assert.equal(nbToDk('credit'), 'CREDIT')
  assert.equal(nbToDk(null), 'DEBIT')
  assert.equal(dkToNb('DEBIT'), 'debit')
  assert.equal(dkToNb('CREDIT'), 'credit')
})

// ─── US-COA-05: tree engine ─────────────────────────────────────────────────
const n = (id: string, parentId: string | null, layer: CoaLayer, coaFullCode: string, name: string, sortOrder = 1): CoaTreeNode => ({
  id, parentId, layer, code: deriveSegment(coaFullCode), coaFullCode, name, sortOrder,
})
const nodes: CoaTreeNode[] = [
  n('c1', null, 'category', '1', 'AKTIVA', 1),
  n('t1', 'c1', 'type', '1-1', 'AKTIVA LANCAR', 1),
  n('s1', 't1', 'sub', '1-1-01', 'KAS & SETARA KAS', 1),
  n('g1', 's1', 'gl', '1-1-01-1', 'KAS IDR', 1),
  n('d1', 'g1', 'detail', '1-1-01-1-2000', 'KAS KECIL', 1),
  n('c2', null, 'category', '2', 'KEWAJIBAN', 2),
]
const byId = new Map(nodes.map((x) => [x.id, x]))

test('TC-028 [US-COA-05] toFeLayer / toDbLayer round-trips DB ↔ FE vocab', () => {
  assert.equal(toFeLayer('sub_account'), 'sub')
  assert.equal(toFeLayer('detail_ledger'), 'detail')
  assert.equal(toFeLayer(null, 4), 'gl') // falls back to level
  assert.equal(toDbLayer('gl'), 'general_ledger')
  assert.equal(parentLayerOf('detail'), 'gl')
  assert.equal(parentLayerOf('category'), null)
})
test('TC-029 [US-COA-05] buildHierarchy nests by parentId', () => {
  const roots = buildHierarchy(nodes)
  assert.equal(roots.length, 2) // c1, c2
  const c1 = roots.find((n) => n.id === 'c1')!
  assert.equal(c1.children!.length, 1)
  assert.equal(c1.hasChildren, true)
})
test('TC-030 [US-COA-05] flatten only emits expanded descendants', () => {
  const roots = buildHierarchy(nodes)
  const collapsed = flatten(roots, new Set())
  assert.equal(collapsed.length, 2) // only roots
  const expanded = flatten(roots, new Set(['c1', 't1', 's1', 'g1']))
  assert.equal(expanded.length, 6) // c1→d1 chain + c2
})
test('TC-031 [US-COA-05] flatten sets _depth', () => {
  const roots = buildHierarchy(nodes)
  const all = flatten(roots, new Set(['c1', 't1', 's1', 'g1']))
  assert.equal(all.find((n) => n.id === 'c1')!._depth, 0)
  assert.equal(all.find((n) => n.id === 'd1')!._depth, 4)
})
test('TC-032 [US-COA-05] filterByQuery matches code/name/full-code & auto-expands', () => {
  const roots = buildHierarchy(nodes)
  const { nodes: found, autoExpand } = filterByQuery(roots, 'kas kecil')
  // The matching branch is retained from the matched node up to the root.
  const flatFound = flatten(found, new Set(found.map((n) => n.id).concat([...autoExpand])))
  assert.ok(flatFound.some((n) => n.id === 'd1'))
  assert.ok(autoExpand.has('c1'))
})
test('TC-033 [US-COA-05] filterByQuery empty query returns all', () => {
  const roots = buildHierarchy(nodes)
  const { nodes: found } = filterByQuery(roots, '')
  assert.equal(found.length, 2)
})
test('TC-034 [US-COA-05] trimByLayer keeps matching layer + ancestor branches', () => {
  const roots = buildHierarchy(nodes)
  const trimmed = trimByLayer(roots, 'detail')
  const flat = flatten(trimmed, new Set(nodes.map((n) => n.id)))
  // only the AKTIVA branch leads to a detail node
  assert.ok(flat.some((n) => n.id === 'd1'))
  assert.ok(!flat.some((n) => n.id === 'c2'))
})
test('TC-035 [US-COA-05] ancestryOf returns root→node chain', () => {
  const trail = ancestryOf(byId.get('d1')!, byId)
  assert.deepEqual(trail.map((n) => n.id), ['c1', 't1', 's1', 'g1', 'd1'])
})
test('TC-036 [US-COA-05] allParentIds returns ids that have children', () => {
  const ids = allParentIds(nodes)
  assert.ok(ids.has('c1'))
  assert.ok(ids.has('g1'))
  assert.ok(!ids.has('d1'))
})
