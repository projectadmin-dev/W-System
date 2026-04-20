import { createServerClient } from '../supabase-server'
import type { HrSalaryComponent, HrSalaryComponentInsert, HrSalaryComponentUpdate } from '../types/hc'

export async function getSalaryComponents(
  entityId?: string,
  branchId?: string,
  includeDeleted = false
) {
  const supabase = await createServerClient()
  let query = supabase
    .from('hr_salary_components')
    .select('*')
    .order('component_type', { ascending: true })
    .order('name', { ascending: true })

  if (entityId) query = query.eq('entity_id', entityId)
  if (branchId) query = query.eq('branch_id', branchId)
  if (!includeDeleted) query = query.is('deleted_at', null)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch salary components: ${error.message}`)
  return data || []
}

export async function getSalaryComponentById(id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_salary_components')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw new Error(`Failed to fetch salary component: ${error.message}`)
  return data
}

export async function createSalaryComponent(component: HrSalaryComponentInsert) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_salary_components')
    .insert(component)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create salary component: ${error.message}`)
  return data
}

export async function updateSalaryComponent(id: string, updates: HrSalaryComponentUpdate) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_salary_components')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update salary component: ${error.message}`)
  return data
}

export async function deleteSalaryComponent(id: string) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('hr_salary_components')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete salary component: ${error.message}`)
  return { success: true }
}
