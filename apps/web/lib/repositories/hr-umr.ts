import { createServerClient } from '../supabase-server'
import type { HrCityUmr, HrCityUmrInsert, HrCityUmrUpdate } from '../types/hc'

export async function getUmrData(entityId?: string, branchId?: string) {
  const supabase = await createServerClient()
  
  let query = supabase
    .from('hr_city_umr')
    .select('*')
    .order('city_name', { ascending: true })

  if (entityId) {
    query = query.eq('entity_id', entityId)
  }
  
  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch UMR data: ${error.message}`)
  }

  return data || []
}

export async function getUmrById(id: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_city_umr')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch UMR: ${error.message}`)
  }

  return data
}

export async function getUmrByCity(cityName: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_city_umr')
    .select('*')
    .ilike('city_name', `%${cityName}%`)
    .limit(10)

  if (error) {
    throw new Error(`Failed to fetch UMR by city: ${error.message}`)
  }

  return data || []
}

export async function createUmr(umr: HrCityUmrInsert) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_city_umr')
    .insert(umr)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create UMR: ${error.message}`)
  }

  return data
}

export async function updateUmr(id: string, updates: HrCityUmrUpdate) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_city_umr')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update UMR: ${error.message}`)
  }

  return data
}

export async function deleteUmr(id: string) {
  const supabase = await createServerClient()
  
  const { error } = await supabase
    .from('hr_city_umr')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete UMR: ${error.message}`)
  }

  return { success: true }
}
