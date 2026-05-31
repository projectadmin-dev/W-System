'use client'

import { memo, useState } from 'react'
import { ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { IFAS, DENSITY, type Density } from './theme'
import { CodeChip, LayerBadge, DKChip, SubGlChip, StatusDot } from './primitives'
import type { CoaNode } from './types'

export const TREE_GRID = 'minmax(300px,2.4fr) 110px 150px 80px 90px 100px 90px'

interface Props {
  node: CoaNode
  depth: number
  expanded: boolean
  isSelected: boolean
  density: Density
  onToggle: (id: string) => void
  onSelect: (node: CoaNode) => void
  onEdit: (node: CoaNode) => void
  onDelete: (node: CoaNode) => void
}

export const TreeRow = memo(function TreeRow({ node, depth, expanded, isSelected, density, onToggle, onSelect, onEdit, onDelete }: Props) {
  const d = DENSITY[density]
  const indent = depth * d.indentStep
  const hasChildren = node.hasChildren
  const [hover, setHover] = useState(false)

  return (
    <div
      role="row"
      aria-level={depth + 1}
      aria-expanded={hasChildren ? expanded : undefined}
      aria-selected={isSelected}
      onClick={() => onSelect(node)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: TREE_GRID,
        gap: 14,
        alignItems: 'center',
        padding: `${d.rowPadY}px ${d.rowPadX}px`,
        borderBottom: `1px solid ${IFAS.border.subtle}`,
        cursor: 'pointer',
        background: isSelected ? IFAS.primaryBg : hover ? IFAS.bg.secondary : IFAS.bg.surface,
        borderLeft: isSelected ? `3px solid ${IFAS.primary}` : '3px solid transparent',
        transition: 'background 120ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: indent, minWidth: 0 }}>
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(node.id)
            }}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              padding: 0,
              border: 'none',
              background: 'transparent',
              borderRadius: 6,
              cursor: 'pointer',
              color: IFAS.text.secondary,
              flexShrink: 0,
            }}
          >
            <ChevronRight size={16} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms ease' }} />
          </button>
        ) : (
          <span style={{ width: 22, display: 'inline-block', flexShrink: 0 }} />
        )}
        <CodeChip code={node.code} layer={node.layer} density={density} />
        <span
          title={node.name}
          style={{ fontSize: d.fontBase, color: IFAS.text.primary, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {node.name}
        </span>
      </div>
      <div>
        <LayerBadge layer={node.layer} density={density} />
      </div>
      <div
        className="ifas-num"
        style={{ fontFamily: IFAS.fontMono, fontSize: d.fontSmall, color: IFAS.text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}
      >
        {node.coaFullCode}
      </div>
      <div>
        <DKChip value={node.dk} density={density} />
      </div>
      <div>{node.hasSubGL ? <SubGlChip density={density} /> : <span style={{ color: IFAS.text.tertiary, fontSize: d.fontMeta }}>—</span>}</div>
      <div>
        <StatusDot active={node.isActive} density={density} />
      </div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', opacity: hover || isSelected ? 1 : 0.4 }}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit(node)
          }}
          aria-label={`Edit ${node.name}`}
          style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: '50%', cursor: 'pointer', color: IFAS.text.secondary }}
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(node)
          }}
          aria-label={`Delete ${node.name}`}
          style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: '50%', cursor: 'pointer', color: IFAS.danger }}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
})
