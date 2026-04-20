import { createServerClient } from '../supabase-server'
import type { HrSalaryMatrix, HrSalaryMatrixInsert, HrSalaryMatrixUpdate } from '../types/hc'

export async function getSalaryMatrix(gradeId?: string, entityId?: string) {
  const supabase = await createServerClient()
  let query = supabase
    .from('hr_salary_matrix')
    .select('*')
    .order('step', { ascending: true })

  if (gradeId) query = query.eq('grade_id', gradeId)
  if (entityId) query = query.eq('entity_id', entityId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch salary matrix: ${error.message}`)
  return data || []
}

export async function getSalaryMatrixById(id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_salary_matrix')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw new Error(`Failed to fetch salary matrix: ${error.message}`)
  return data
}

export async function createSalaryMatrix(matrix: HrSalaryMatrixInsert) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_salary_matrix')
    .insert(matrix)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create salary matrix: ${error.message}`)
  return data
}

export async function updateSalaryMatrix(id: string, updates: HrSalaryMatrixUpdate) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_salary_matrix')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update salary matrix: ${error.message}`)
  return data
}

export async function deleteSalaryMatrix(id: string) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('hr_salary_matrix')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete salary matrix: ${error.message}`)
  return { success: true }
}
