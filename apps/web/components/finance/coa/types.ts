// Chart of Account — node model used by the explorer.
import type { Layer } from './theme'

export interface CoaAuditMini {
  createdAt: string | null
  createdBy: string | null
  updatedAt: string | null
  updatedBy: string | null
}

export interface CoaNode {
  id: string
  parentId: string | null
  level: number
  layer: Layer
  /** per-layer segment, shown as the colored code chip (e.g. "01", "2000") */
  code: string
  /** full hierarchical code, e.g. "1-1-01-1-2000" */
  coaFullCode: string
  name: string
  nameEn?: string | null
  /** normal balance, uppercase for display */
  dk: 'DEBIT' | 'CREDIT'
  normalBalance: 'debit' | 'credit'
  accountType: string
  isActive: boolean
  hasSubGL: boolean
  contraAccount: boolean
  restriction: boolean
  requiredSubGl: boolean
  washedOut: boolean
  requiredChild: boolean
  description: string | null
  cashFlowCategory: string | null
  sortOrder: number
  audit: CoaAuditMini

  // tree-derived
  children?: CoaNode[]
  hasChildren?: boolean
  _depth?: number
}

/** Raw row shape returned by GET /api/finance/coa (select *). Permissive on purpose:
 *  some columns (coa_full_code, segment_code, required_sub_gl…) ship in a later migration. */
export interface DbCoaRow {
  id: string
  parent_account_id: string | null
  account_code: string
  account_name: string
  account_type: string
  level: number
  normal_balance: string | null
  coa_layer?: string | null
  coa_full_code?: string | null
  segment_code?: string | null
  name_en?: string | null
  is_active: boolean
  description: string | null
  cash_flow_category?: string | null
  sort_order?: number | null
  contra_account?: boolean | null
  is_restricted?: boolean | null
  required_sub_gl?: boolean | null
  is_washed_out_account?: boolean | null
  required_child?: boolean | null
  created_at?: string | null
  created_by?: string | null
  updated_at?: string | null
  [key: string]: unknown
}
