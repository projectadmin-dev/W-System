import { createAdminClient } from '../supabase-server'
import type { Database } from '../../src/types/database'

/* ──────────────────────────────────────────────────────────
   IFAS COA 5-Level Hierarchy Repository
   Based on: IFAS COA STRUCTURE KNOWLEDGE R3
   ────────────────────────────────────────────────────────── */

// ── Types ──────────────────────────────────────────────
export type CoaCategory = Database['public']['Tables']['coa_account_category']['Row']
export type CoaCategoryInsert = Database['public']['Tables']['coa_account_category']['Insert']
export type CoaCategoryUpdate = Database['public']['Tables']['coa_account_category']['Update']

export type CoaType = Database['public']['Tables']['coa_account_type']['Row']
export type CoaTypeInsert = Database['public']['Tables']['coa_account_type']['Insert']
export type CoaTypeUpdate = Database['public']['Tables']['coa_account_type']['Update']

export type CoaSub = Database['public']['Tables']['coa_sub_account']['Row']
export type CoaSubInsert = Database['public']['Tables']['coa_sub_account']['Insert']
export type CoaSubUpdate = Database['public']['Tables']['coa_sub_account']['Update']

export type CoaGl = Database['public']['Tables']['coa_general_ledger']['Row']
export type CoaGlInsert = Database['public']['Tables']['coa_general_ledger']['Insert']
export type CoaGlUpdate = Database['public']['Tables']['coa_general_ledger']['Update']

export type CoaDetail = Database['public']['Tables']['coa_detail_ledger']['Row']
export type CoaDetailInsert = Database['public']['Tables']['coa_detail_ledger']['Insert']
export type CoaDetailUpdate = Database['public']['Tables']['coa_detail_ledger']['Update']

export type CoaLayer = 'category' | 'type' | 'sub' | 'gl' | 'detail'

export interface CoaTreeNode {
  id: string
  coa_full_code: string
  name: string
  layer: CoaLayer
  level: number
  is_active: boolean
  children?: CoaTreeNode[]
  flags?: Record<string, any>
}

// ── Level 1: Account Category ──────────────────────────

export async function getCategories(tenantId?: string, entityId?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('coa_account_category')
    .select('*')
    .is('deleted_at', null)
    .order('coa_code', { ascending: true })
  if (tenantId) query = query.eq('tenant_id', tenantId)
  if (entityId) query = query.eq('entity_id', entityId)
  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch categories: ${error.message}`)
  return data || []
}

export async function getCategoryById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_account_category')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) throw new Error(`Failed to fetch category: ${error.message}`)
  return data
}

export async function createCategory(record: CoaCategoryInsert) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_account_category')
    .insert(record)
    .select()
    .single()
  if (error) throw new Error(`Failed to create category: ${error.message}`)
  return data
}

export async function updateCategory(id: string, updates: CoaCategoryUpdate) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_account_category')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`Failed to update category: ${error.message}`)
  return data
}

export async function deleteCategory(id: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('coa_account_category')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`Failed to delete category: ${error.message}`)
  return { success: true }
}

// ── Level 2: Account Type ──────────────────────────────

export async function getTypes(tenantId?: string, entityId?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('coa_account_type')
    .select('*, parent:parent_id(id, name, coa_full_code)')
    .is('deleted_at', null)
    .order('coa_code', { ascending: true })
  if (tenantId) query = query.eq('tenant_id', tenantId)
  if (entityId) query = query.eq('entity_id', entityId)
  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch types: ${error.message}`)
  return data || []
}

export async function getTypeById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_account_type')
    .select('*, parent:parent_id(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) throw new Error(`Failed to fetch type: ${error.message}`)
  return data
}

export async function getTypesByParent(parentId: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_account_type')
    .select('*')
    .eq('parent_id', parentId)
    .is('deleted_at', null)
    .order('coa_code', { ascending: true })
  if (error) throw new Error(`Failed to fetch types by parent: ${error.message}`)
  return data || []
}

export async function createType(record: CoaTypeInsert) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_account_type')
    .insert(record)
    .select()
    .single()
  if (error) throw new Error(`Failed to create type: ${error.message}`)
  return data
}

export async function updateType(id: string, updates: CoaTypeUpdate) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_account_type')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`Failed to update type: ${error.message}`)
  return data
}

export async function deleteType(id: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('coa_account_type')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`Failed to delete type: ${error.message}`)
  return { success: true }
}

// ── Level 3: Sub Account ───────────────────────────────

export async function getSubAccounts(tenantId?: string, entityId?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('coa_sub_account')
    .select('*, parent:parent_id(id, name, coa_full_code)')
    .is('deleted_at', null)
    .order('coa_code', { ascending: true })
  if (tenantId) query = query.eq('tenant_id', tenantId)
  if (entityId) query = query.eq('entity_id', entityId)
  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch sub accounts: ${error.message}`)
  return data || []
}

export async function getSubAccountById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_sub_account')
    .select('*, parent:parent_id(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) throw new Error(`Failed to fetch sub account: ${error.message}`)
  return data
}

export async function getSubAccountsByParent(parentId: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_sub_account')
    .select('*')
    .eq('parent_id', parentId)
    .is('deleted_at', null)
    .order('coa_code', { ascending: true })
  if (error) throw new Error(`Failed to fetch sub accounts by parent: ${error.message}`)
  return data || []
}

export async function createSubAccount(record: CoaSubInsert) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_sub_account')
    .insert(record)
    .select()
    .single()
  if (error) throw new Error(`Failed to create sub account: ${error.message}`)
  return data
}

export async function updateSubAccount(id: string, updates: CoaSubUpdate) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_sub_account')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`Failed to update sub account: ${error.message}`)
  return data
}

export async function deleteSubAccount(id: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('coa_sub_account')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`Failed to delete sub account: ${error.message}`)
  return { success: true }
}

// ── Level 4: General Ledger ────────────────────────────

export async function getGeneralLedgers(tenantId?: string, entityId?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('coa_general_ledger')
    .select('*, parent:parent_id(id, name, coa_full_code)')
    .is('deleted_at', null)
    .order('coa_code', { ascending: true })
  if (tenantId) query = query.eq('tenant_id', tenantId)
  if (entityId) query = query.eq('entity_id', entityId)
  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch GLs: ${error.message}`)
  return data || []
}

export async function getGlById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_general_ledger')
    .select('*, parent:parent_id(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) throw new Error(`Failed to fetch GL: ${error.message}`)
  return data
}

export async function getGlsByParent(parentId: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_general_ledger')
    .select('*')
    .eq('parent_id', parentId)
    .is('deleted_at', null)
    .order('coa_code', { ascending: true })
  if (error) throw new Error(`Failed to fetch GLs by parent: ${error.message}`)
  return data || []
}

export async function createGl(record: CoaGlInsert) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_general_ledger')
    .insert(record)
    .select()
    .single()
  if (error) throw new Error(`Failed to create GL: ${error.message}`)
  return data
}

export async function updateGl(id: string, updates: CoaGlUpdate) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_general_ledger')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`Failed to update GL: ${error.message}`)
  return data
}

export async function deleteGl(id: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('coa_general_ledger')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`Failed to delete GL: ${error.message}`)
  return { success: true }
}

// ── Level 5: Detail Ledger ─────────────────────────────

export async function getDetailLedgers(tenantId?: string, entityId?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('coa_detail_ledger')
    .select('*, parent:parent_id(id, name, coa_full_code)')
    .is('deleted_at', null)
    .order('coa_code', { ascending: true })
  if (tenantId) query = query.eq('tenant_id', tenantId)
  if (entityId) query = query.eq('entity_id', entityId)
  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch detail ledgers: ${error.message}`)
  return data || []
}

export async function getDetailById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_detail_ledger')
    .select('*, parent:parent_id(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  if (error) throw new Error(`Failed to fetch detail ledger: ${error.message}`)
  return data
}

export async function getDetailsByParent(parentId: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_detail_ledger')
    .select('*')
    .eq('parent_id', parentId)
    .is('deleted_at', null)
    .order('coa_code', { ascending: true })
  if (error) throw new Error(`Failed to fetch details by parent: ${error.message}`)
  return data || []
}

export async function createDetail(record: CoaDetailInsert) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_detail_ledger')
    .insert(record)
    .select()
    .single()
  if (error) throw new Error(`Failed to create detail ledger: ${error.message}`)
  return data
}

export async function updateDetail(id: string, updates: CoaDetailUpdate) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa_detail_ledger')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`Failed to update detail ledger: ${error.message}`)
  return data
}

export async function deleteDetail(id: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('coa_detail_ledger')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`Failed to delete detail ledger: ${error.message}`)
  return { success: true }
}

// ── Tree Builder ───────────────────────────────────────

export async function buildCoaTree(tenantId?: string): Promise<CoaTreeNode[]> {
  const supabase = await createAdminClient()

  // Fetch all layers in parallel
  const [categories, types, subs, gls, details] = await Promise.all([
    getCategories(tenantId),
    getTypes(tenantId),
    getSubAccounts(tenantId),
    getGeneralLedgers(tenantId),
    getDetailLedgers(tenantId),
  ])

  const tree: CoaTreeNode[] = categories.map((cat): CoaTreeNode => ({
    id: cat.id,
    coa_full_code: cat.coa_full_code,
    name: cat.name,
    layer: 'category',
    level: 1,
    is_active: cat.is_active,
    flags: {
      normal_balance: cat.normal_balance,
      enum_laporan_keuangan: cat.enum_laporan_keuangan,
      enum_laporan_keuangan_category: cat.enum_laporan_keuangan_category,
    },
    children: types
      .filter((t) => t.parent_id === cat.id)
      .map((typ): CoaTreeNode => ({
        id: typ.id,
        coa_full_code: typ.coa_full_code,
        name: typ.name,
        layer: 'type',
        level: 2,
        is_active: typ.is_active,
        flags: {
          contra_account: typ.contra_account,
          direct_indirect_cost: typ.direct_indirect_cost,
          enum_cost_category: typ.enum_cost_category,
        },
        children: subs
          .filter((s) => s.parent_id === typ.id)
          .map((sub): CoaTreeNode => ({
            id: sub.id,
            coa_full_code: sub.coa_full_code,
            name: sub.name,
            layer: 'sub',
            level: 3,
            is_active: sub.is_active,
            flags: {
              is_restricted: sub.is_restricted,
              enum_cf_section: sub.enum_cf_section,
              enum_cf_line: sub.enum_cf_line,
              is_working_capital: sub.is_working_capital,
              is_non_cash_item: sub.is_non_cash_item,
            },
            children: gls
              .filter((g) => g.parent_id === sub.id)
              .map((gl): CoaTreeNode => ({
                id: gl.id,
                coa_full_code: gl.coa_full_code,
                name: gl.name,
                layer: 'gl',
                level: 4,
                is_active: gl.is_active,
                flags: {
                  is_restricted: gl.is_restricted,
                },
                children: details
                  .filter((d) => d.parent_id === gl.id)
                  .map((det): CoaTreeNode => ({
                    id: det.id,
                    coa_full_code: det.coa_full_code,
                    name: det.name,
                    layer: 'detail',
                    level: 5,
                    is_active: det.is_active,
                    flags: {
                      required_sub_gl: det.required_sub_gl,
                      is_washed_out_account: det.is_washed_out_account,
                      is_trial_balance: det.is_trial_balance,
                      is_taxation_report: det.is_taxation_report,
                    },
                  })),
              })),
          })),
      })),
  }))

  return tree
}

// ── COA Full Code Lookup ───────────────────────────────

export async function getNodeByCoaFullCode(coaFullCode: string, tenantId?: string) {
  const supabase = await createAdminClient()
  const parts = coaFullCode.split('-')
  
  // Try each layer
  const tables = [
    { table: 'coa_account_category', layer: 'category' as CoaLayer },
    { table: 'coa_account_type', layer: 'type' as CoaLayer },
    { table: 'coa_sub_account', layer: 'sub' as CoaLayer },
    { table: 'coa_general_ledger', layer: 'gl' as CoaLayer },
    { table: 'coa_detail_ledger', layer: 'detail' as CoaLayer },
  ]
  
  for (const { table, layer } of tables) {
    let query = supabase
      .from(table)
      .select('*')
      .eq('coa_full_code', coaFullCode)
      .is('deleted_at', null)
      .limit(1)
    if (tenantId) query = query.eq('tenant_id', tenantId)
    
    const { data, error } = await query
    if (!error && data && data.length > 0) {
      return { ...data[0], layer }
    }
  }
  
  return null
}

// ── COA Attribute Import: Download Template ──────────

export async function getAttributeTemplateData(layer?: string, tenantId?: string) {
  const supabase = await createAdminClient()
  
  const configs: Record<string, { table: string; editable: string[]; locked: string[] }> = {
    category: {
      table: 'coa_account_category',
      editable: ['normal_balance', 'enum_laporan_keuangan', 'enum_laporan_keuangan_category'],
      locked: ['coa_full_code', 'name', 'level'],
    },
    type: {
      table: 'coa_account_type',
      editable: ['contra_account', 'direct_indirect_cost', 'enum_cost_category'],
      locked: ['coa_full_code', 'name', 'parent_id', 'level'],
    },
    sub: {
      table: 'coa_sub_account',
      editable: ['is_restricted', 'enum_cf_section', 'enum_cf_line', 'is_working_capital', 'is_non_cash_item', 'enum_cost_behavior', 'is_budgeted', 'is_tax_deductible'],
      locked: ['coa_full_code', 'name', 'parent_id', 'level'],
    },
    gl: {
      table: 'coa_general_ledger',
      editable: ['is_restricted'],
      locked: ['coa_full_code', 'name', 'parent_id', 'level'],
    },
    detail: {
      table: 'coa_detail_ledger',
      editable: ['required_sub_gl', 'is_washed_out_account', 'is_trial_balance', 'is_taxation_report'],
      locked: ['coa_full_code', 'name', 'parent_id', 'level'],
    },
  }
  
  const result: Record<string, any[]> = {}
  
  for (const [key, config] of Object.entries(configs)) {
    if (layer && layer !== key) continue
    
    let query = supabase.from(config.table).select('*').is('deleted_at', null)
    if (tenantId) query = query.eq('tenant_id', tenantId)
    
    const { data, error } = await query
    if (error) throw new Error(`Failed to fetch ${key}: ${error.message}`)
    result[key] = data || []
  }
  
  return result
}

// ── COA Attribute Import: Bulk Update ──────────────────

export interface AttributeImportRow {
  layer: string
  coa_full_code: string
  name: string
  updates: Record<string, any>
}

export async function bulkUpdateAttributes(rows: AttributeImportRow[], tenantId?: string) {
  const supabase = await createAdminClient()
  const results = { updated: 0, skipped: 0, errors: [] as any[] }
  
  const tableMap: Record<string, string> = {
    category: 'coa_account_category',
    type: 'coa_account_type',
    sub: 'coa_sub_account',
    gl: 'coa_general_ledger',
    detail: 'coa_detail_ledger',
  }
  
  for (const row of rows) {
    const table = tableMap[row.layer]
    if (!table) {
      results.skipped++
      results.errors.push({ ...row, reason: 'Unknown layer' })
      continue
    }
    
    // Find the record by coa_full_code
    let query = supabase
      .from(table)
      .select('id')
      .eq('coa_full_code', row.coa_full_code)
      .is('deleted_at', null)
      .limit(1)
    if (tenantId) query = query.eq('tenant_id', tenantId)
    
    const { data: found, error: findError } = await query
    
    if (findError || !found || found.length === 0) {
      results.skipped++
      results.errors.push({ ...row, reason: 'COA not found' })
      continue
    }
    
    // Update
    const { error: updateError } = await supabase
      .from(table)
      .update({ ...row.updates, updated_at: new Date().toISOString() })
      .eq('id', found[0].id)
    
    if (updateError) {
      results.skipped++
      results.errors.push({ ...row, reason: updateError.message })
    } else {
      results.updated++
    }
  }
  
  return results
}
