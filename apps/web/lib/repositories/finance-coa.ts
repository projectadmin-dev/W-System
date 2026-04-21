import { createAdminClient } from '../supabase-server'
import type { Database } from '../../src/types/database'

type Coa = Database['public']['Tables']['coa']['Row']
type CoaInsert = Database['public']['Tables']['coa']['Insert']
type CoaUpdate = Database['public']['Tables']['coa']['Update']

/**
 * Finance COA Repository
 * PSAK-compliant Chart of Accounts management
 * (per 04-data-dictionary §5.2 - Finance RLS Matrix)
 * 
 * Uses Admin Client for server-side operations to bypass RLS
 * (RLS is enforced at API route level via auth checks)
 */

/**
 * Get all COA accounts for a tenant
 */
export async function getCoaAccounts(entityId?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('coa')
    .select('*')
    .is('deleted_at', null)
    .order('account_code', { ascending: true })

  if (entityId) query = query.eq('entity_id', entityId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch COA accounts: ${error.message}`)
  return data || []
}

/**
 * Get COA account by ID
 */
export async function getCoaById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch COA account: ${error.message}`)
  return data
}

/**
 * Get COA tree structure (hierarchical)
 */
export async function getCoaTree() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa')
    .select('*')
    .is('deleted_at', null)
    .order('level', { ascending: true })
    .order('account_code', { ascending: true })
  
  if (error) throw new Error(`Failed to fetch COA tree: ${error.message}`)
  
  // Build tree structure
  const accounts = data || []
  const tree: Coa[] = []
  const childrenMap = new Map<string, Coa[]>()
  
  // Initialize children map
  accounts.forEach(acc => {
    if (acc.parent_account_id) {
      if (!childrenMap.has(acc.parent_account_id)) {
        childrenMap.set(acc.parent_account_id, [])
      }
      childrenMap.get(acc.parent_account_id)!.push(acc)
    }
  })
  
  // Build tree from root accounts (level 1)
  accounts.filter(acc => acc.level === 1).forEach(root => {
    tree.push(root)
    const children = childrenMap.get(root.id) || []
    // Attach children recursively (simplified - frontend can handle nesting)
    ;(root as any).children = children
  })
  
  return tree
}

/**
 * Create new COA account
 */
export async function createCoaAccount(account: CoaInsert) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa')
    .insert(account)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create COA account: ${error.message}`)
  return data
}

/**
 * Update COA account
 */
export async function updateCoaAccount(id: string, updates: CoaUpdate) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update COA account: ${error.message}`)
  return data
}

/**
 * Soft delete COA account (only if no journal entries reference it)
 */
export async function deleteCoaAccount(id: string) {
  const supabase = await createAdminClient()
  
  // Check if account is used in journal entries
  const { count, error: countError } = await supabase
    .from('journal_lines')
    .select('*', { count: 'exact', head: true })
    .eq('coa_id', id)
    .is('deleted_at', null)
  
  if (countError) throw new Error(`Failed to check COA usage: ${countError.message}`)
  if (count && count > 0) {
    throw new Error('Cannot delete COA account with existing journal entries')
  }
  
  const { error } = await supabase
    .from('coa')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete COA account: ${error.message}`)
  return { success: true }
}

/**
 * Get COA by account code
 */
export async function getCoaByCode(accountCode: string, tenantId?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('coa')
    .select('*')
    .eq('account_code', accountCode)
    .is('deleted_at', null)
  
  if (tenantId) query = query.eq('tenant_id', tenantId)
  
  const { data, error } = await query.limit(1)
  
  if (error) throw new Error(`Failed to fetch COA by code: ${error.message}`)
  return data?.[0] || null
}

/**
 * Get COA accounts by type (asset, liability, equity, revenue, expense)
 */
export async function getCoaByType(accountType: Coa['account_type']) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('coa')
    .select('*')
    .eq('account_type', accountType)
    .is('deleted_at', null)
    .order('account_code', { ascending: true })
  
  if (error) throw new Error(`Failed to fetch COA by type: ${error.message}`)
  return data || []
}
