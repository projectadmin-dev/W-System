import { createServerClient } from '../supabase-server'
import type { HrWorkShift, HrWorkShiftInsert, HrWorkShiftUpdate } from '../types/hc'

export async function getShifts(entityId?: string, branchId?: string) {
  const supabase = await createServerClient()
  
  let query = supabase
    .from('hr_work_shifts')
    .select('*')
    .order('created_at', { ascending: false })

  if (entityId) {
    query = query.eq('entity_id', entityId)
  }
  
  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch shifts: ${error.message}`)
  }

  return data || []
}

export async function getShiftById(id: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_work_shifts')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch shift: ${error.message}`)
  }

  return data
}

export async function createShift(shift: HrWorkShiftInsert) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_work_shifts')
    .insert(shift)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create shift: ${error.message}`)
  }

  return data
}

export async function updateShift(id: string, updates: HrWorkShiftUpdate) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_work_shifts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update shift: ${error.message}`)
  }

  return data
}

export async function deleteShift(id: string) {
  const supabase = await createServerClient()
  
  const { error } = await supabase
    .from('hr_work_shifts')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete shift: ${error.message}`)
  }

  return { success: true }
}
