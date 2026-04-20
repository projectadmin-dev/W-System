import { createServerClient } from '../supabase-server'
import type { HrDepartment, HrDepartmentInsert, HrDepartmentUpdate } from '../types/hc'

export async function getDepartments(entityId?: string, branchId?: string) {
  const supabase = await createServerClient()
  let query = supabase
    .from('hr_departments')
    .select('*')
    .order('level', { ascending: true })
    .order('name', { ascending: true })

  if (entityId) query = query.eq('entity_id', entityId)
  if (branchId) query = query.eq('branch_id', branchId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch departments: ${error.message}`)
  return data || []
}

export async function getDepartmentById(id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_departments')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw new Error(`Failed to fetch department: ${error.message}`)
  return data
}

export async function createDepartment(department: HrDepartmentInsert) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_departments')
    .insert(department)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create department: ${error.message}`)
  return data
}

export async function updateDepartment(id: string, updates: HrDepartmentUpdate) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_departments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update department: ${error.message}`)
  return data
}

export async function deleteDepartment(id: string) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('hr_departments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete department: ${error.message}`)
  return { success: true }
}
