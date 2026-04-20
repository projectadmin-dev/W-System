import { createServerClient } from '../supabase-server'
import type { HrPph21Config, HrPph21ConfigInsert, HrPph21ConfigUpdate } from '../types/hc'

export async function getPph21Config(entityId?: string, branchId?: string) {
  const supabase = await createServerClient()
  
  let query = supabase
    .from('hr_pph21_configs')
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
    throw new Error(`Failed to fetch PPh21 config: ${error.message}`)
  }

  return data || []
}

export async function getPph21ConfigById(id: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_pph21_configs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch PPh21 config: ${error.message}`)
  }

  return data
}

export async function getActivePph21Config(date?: string) {
  const supabase = await createServerClient()
  
  const targetDate = date || new Date().toISOString()
  
  const { data, error } = await supabase
    .from('hr_pph21_configs')
    .select('*')
    .lte('effective_date', targetDate)
    .eq('is_active', true)
    .order('effective_date', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch active PPh21 config: ${error.message}`)
  }

  return data
}

export async function createPph21Config(config: HrPph21ConfigInsert) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_pph21_configs')
    .insert(config)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create PPh21 config: ${error.message}`)
  }

  return data
}

export async function updatePph21Config(id: string, updates: HrPph21ConfigUpdate) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_pph21_configs')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update PPh21 config: ${error.message}`)
  }

  return data
}

export async function deletePph21Config(id: string) {
  const supabase = await createServerClient()
  
  const { error } = await supabase
    .from('hr_pph21_configs')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete PPh21 config: ${error.message}`)
  }

  return { success: true }
}
