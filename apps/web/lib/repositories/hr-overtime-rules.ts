import { createServerClient } from '../supabase-server'
import type { HrOvertimeRule, HrOvertimeRuleInsert, HrOvertimeRuleUpdate } from '../types/hc'

export async function getOvertimeRules(entityId?: string, branchId?: string) {
  const supabase = await createServerClient()
  let query = supabase
    .from('hr_overtime_rules')
    .select('*')
    .order('day_type', { ascending: true })

  if (entityId) query = query.eq('entity_id', entityId)
  if (branchId) query = query.eq('branch_id', branchId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch overtime rules: ${error.message}`)
  return data || []
}

export async function getOvertimeRuleById(id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_overtime_rules')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw new Error(`Failed to fetch overtime rule: ${error.message}`)
  return data
}

export async function createOvertimeRule(rule: HrOvertimeRuleInsert) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_overtime_rules')
    .insert(rule)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create overtime rule: ${error.message}`)
  return data
}

export async function updateOvertimeRule(id: string, updates: HrOvertimeRuleUpdate) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_overtime_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update overtime rule: ${error.message}`)
  return data
}

export async function deleteOvertimeRule(id: string) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('hr_overtime_rules')
    .delete()
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete overtime rule: ${error.message}`)
  return { success: true }
}
