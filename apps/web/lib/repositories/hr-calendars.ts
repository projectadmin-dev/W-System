import { createServerClient } from '../supabase-server'
import type { HrWorkCalendar, HrWorkCalendarInsert, HrWorkCalendarUpdate } from '../types/hc'

export async function getCalendars(year?: number, entityId?: string, branchId?: string) {
  const supabase = await createServerClient()
  
  let query = supabase
    .from('hr_work_calendars')
    .select('*')
    .order('date', { ascending: true })

  if (year) {
    query = query.eq('year', year)
  }
  
  if (entityId) {
    query = query.eq('entity_id', entityId)
  }
  
  if (branchId) {
    query = query.eq('branch_id', branchId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Supabase error fetching calendars:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    throw new Error(`Failed to fetch calendars: ${error.message}`)
  }

  return data || []
}

export async function getCalendarById(id: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_work_calendars')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch calendar: ${error.message}`)
  }

  return data
}

export async function createCalendar(calendar: HrWorkCalendarInsert) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_work_calendars')
    .insert(calendar)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create calendar: ${error.message}`)
  }

  return data
}

export async function updateCalendar(id: string, updates: HrWorkCalendarUpdate) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_work_calendars')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update calendar: ${error.message}`)
  }

  return data
}

export async function deleteCalendar(id: string) {
  const supabase = await createServerClient()
  
  const { error } = await supabase
    .from('hr_work_calendars')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete calendar: ${error.message}`)
  }

  return { success: true }
}

export async function getCalendarsByYear(year: number) {
  return getCalendars(year)
}
