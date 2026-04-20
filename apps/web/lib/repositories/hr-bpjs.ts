import { createServerClient } from '../supabase-server'
import type { HrBpjsConfig, HrBpjsConfigInsert, HrBpjsConfigUpdate } from '../types/hc'

export async function getBpjsConfig(entityId?: string, branchId?: string) {
  const supabase = await createServerClient()
  
  let query = supabase
    .from('hr_bpjs_configs')
    .select('*')
    .order('effective_date', { ascending: false })

  if (entityId) {
    query = query.eq('entity_id', entityId)
  }
  
  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch BPJS config: ${error.message}`)
  }

  return data || []
}

export async function getBpjsConfigById(id: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_bpjs_configs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch BPJS config: ${error.message}`)
  }

  return data
}

export async function getActiveBpjsConfig(date?: string) {
  const supabase = await createServerClient()
  
  const targetDate = date || new Date().toISOString()
  
  const { data, error } = await supabase
    .from('hr_bpjs_configs')
    .select('*')
    .lte('effective_date', targetDate)
    .eq('is_active', true)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch active BPJS config: ${error.message}`)
  }

  return data
}

export async function createBpjsConfig(config: HrBpjsConfigInsert) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_bpjs_configs')
    .insert(config)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create BPJS config: ${error.message}`)
  }

  return data
}

export async function updateBpjsConfig(id: string, updates: HrBpjsConfigUpdate) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_bpjs_configs')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update BPJS config: ${error.message}`)
  }

  return data
}

export async function deleteBpjsConfig(id: string) {
  const supabase = await createServerClient()
  
  const { error } = await supabase
    .from('hr_bpjs_configs')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete BPJS config: ${error.message}`)
  }

  return { success: true }
}
