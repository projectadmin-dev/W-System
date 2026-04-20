import { createServerClient } from '../supabase-server'
import type { HrJobGrade, HrJobGradeInsert, HrJobGradeUpdate } from '../types/hc'

export async function getJobGrades(entityId?: string, branchId?: string) {
  const supabase = await createServerClient()
  let query = supabase
    .from('hr_job_grades')
    .select('*')
    .order('level', { ascending: true })

  if (entityId) query = query.eq('entity_id', entityId)
  if (branchId) query = query.eq('branch_id', branchId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch job grades: ${error.message}`)
  return data || []
}

export async function getJobGradeById(id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_job_grades')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw new Error(`Failed to fetch job grade: ${error.message}`)
  return data
}

export async function createJobGrade(grade: HrJobGradeInsert) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_job_grades')
    .insert(grade)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create job grade: ${error.message}`)
  return data
}

export async function updateJobGrade(id: string, updates: HrJobGradeUpdate) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_job_grades')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update job grade: ${error.message}`)
  return data
}

export async function deleteJobGrade(id: string) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('hr_job_grades')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete job grade: ${error.message}`)
  return { success: true }
}
