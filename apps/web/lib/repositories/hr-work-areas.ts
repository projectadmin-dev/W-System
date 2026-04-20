import { createServerClient } from '../supabase-server'
import type { HrWorkArea, HrWorkAreaInsert, HrWorkAreaUpdate } from '../types/hc'

export async function getWorkAreas(entityId?: string, branchId?: string) {
  const supabase = await createServerClient()
  let query = supabase
    .from('hr_work_areas')
    .select('*')
    .order('name', { ascending: true })

  if (entityId) query = query.eq('entity_id', entityId)
  if (branchId) query = query.eq('branch_id', branchId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch work areas: ${error.message}`)
  return data || []
}

export async function getWorkAreaById(id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_work_areas')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw new Error(`Failed to fetch work area: ${error.message}`)
  return data
}

export async function createWorkArea(area: HrWorkAreaInsert) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_work_areas')
    .insert(area)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create work area: ${error.message}`)
  return data
}

export async function updateWorkArea(id: string, updates: HrWorkAreaUpdate) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_work_areas')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update work area: ${error.message}`)
  return data
}

export async function deleteWorkArea(id: string) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('hr_work_areas')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete work area: ${error.message}`)
  return { success: true }
}
