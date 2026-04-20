import { createServerClient } from '../supabase-server'
import type { HrPosition, HrPositionInsert, HrPositionUpdate } from '../types/hc'

export async function getPositions(entityId?: string, branchId?: string, departmentId?: string) {
  const supabase = await createServerClient()
  let query = supabase
    .from('hr_positions')
    .select('*')
    .order('name', { ascending: true })

  if (entityId) query = query.eq('entity_id', entityId)
  if (branchId) query = query.eq('branch_id', branchId)
  if (departmentId) query = query.eq('department_id', departmentId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch positions: ${error.message}`)
  return data || []
}

export async function getPositionById(id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_positions')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw new Error(`Failed to fetch position: ${error.message}`)
  return data
}

export async function createPosition(position: HrPositionInsert) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_positions')
    .insert(position)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create position: ${error.message}`)
  return data
}

export async function updatePosition(id: string, updates: HrPositionUpdate) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_positions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update position: ${error.message}`)
  return data
}

export async function deletePosition(id: string) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('hr_positions')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete position: ${error.message}`)
  return { success: true }
}
