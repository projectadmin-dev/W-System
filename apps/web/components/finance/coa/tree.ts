// Chart of Account — node mapping + tree helpers.
// The pure engine lives in `@/lib/coa-logic` (unit-tested via node:test); this
// module maps DB rows into the UI `CoaNode` model and re-exports the engine so
// components keep importing from './tree'.
import { toFeLayer, deriveSegment } from '@/lib/coa-logic'
import type { CoaNode, DbCoaRow } from './types'

export { deriveSegment, buildHierarchy, flatten, trimByLayer, filterByQuery, ancestryOf, allParentIds } from '@/lib/coa-logic'

/** Map a raw DB row into the explorer node model, deriving display fields when
 *  the dedicated columns are not yet populated. */
export function mapRow(row: DbCoaRow): CoaNode {
  const layer = toFeLayer(row.coa_layer, row.level)
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
