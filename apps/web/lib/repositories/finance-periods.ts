import { createAdminClient } from '../supabase-server'
// Temporarily use any for Database type until fiscal_periods migration is fixed
type FiscalPeriod = any
type FiscalPeriodInsert = any
type FiscalPeriodUpdate = any

/**
 * Finance Fiscal Periods Repository
 * PSAK-compliant accounting period management
 * (per 04-data-dictionary §5.2 - Finance RLS Matrix)
 */

/**
 * Get all fiscal periods for a tenant
 */
export async function getFiscalPeriods(entityId?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('fiscal_periods')
    .select('*')
    .is('deleted_at', null)
    .order('start_date', { ascending: true })

  if (entityId) query = query.eq('entity_id', entityId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch fiscal periods: ${error.message}`)
  return data || []
}

/**
 * Get fiscal period by ID
 */
export async function getFiscalPeriodById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('fiscal_periods')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch fiscal period: ${error.message}`)
  return data
}

/**
 * Get fiscal period by name (e.g., "2026-01")
 */
export async function getFiscalPeriodByName(periodName: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('fiscal_periods')
    .select('*')
    .eq('period_name', periodName)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch fiscal period: ${error.message}`)
  return data
}

/**
 * Get current active fiscal period (status = 'open')
 */
export async function getCurrentFiscalPeriod() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('fiscal_periods')
    .select('*')
    .eq('status', 'open')
    .is('deleted_at', null)
    .order('start_date', { ascending: false })
    .limit(1)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    throw new Error(`Failed to fetch current fiscal period: ${error.message}`)
  }
  return data || null
}

/**
 * Get fiscal period containing a specific date
 */
export async function getFiscalPeriodByDate(date: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('fiscal_periods')
    .select('*')
    .is('deleted_at', null)
    .lte('start_date', date)
    .gte('end_date', date)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch fiscal period for date: ${error.message}`)
  }
  return data || null
}

/**
 * Create new fiscal period
 * Validates no date overlap with existing periods
 */
export async function createFiscalPeriod(period: FiscalPeriodInsert) {
  const supabase = await createAdminClient()
  
  // Check for date overlap
  const { data: existing } = await supabase
    .from('fiscal_periods')
    .select('id, period_name')
    .is('deleted_at', null)
    .or(`start_date.lte.${period.end_date},end_date.gte.${period.start_date}`)
  
  if (existing && existing.length > 0) {
    throw new Error(`Date range overlaps with existing period(s): ${existing.map(p => p.period_name).join(', ')}`)
  }
  
  const { data, error } = await supabase
    .from('fiscal_periods')
    .insert(period)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create fiscal period: ${error.message}`)
  return data
}

/**
 * Update fiscal period
 * Cannot update if period has posted journal entries (PSAK compliance)
 */
export async function updateFiscalPeriod(id: string, updates: FiscalPeriodUpdate) {
  const supabase = await createAdminClient()
  
  // Check if period has posted entries
  const { count } = await supabase
    .from('journal_entries')
    .select('*', { count: 'exact', head: true })
    .eq('fiscal_period_id', id)
    .eq('status', 'posted')
    .is('deleted_at', null)
  
  if (count && count > 0) {
    throw new Error('Cannot update fiscal period with posted journal entries (PSAK compliance)')
  }
  
  // If updating dates, check for overlap
  if (updates.start_date || updates.end_date) {
    const current = await getFiscalPeriodById(id)
    const checkStart = updates.start_date || current?.start_date
    const checkEnd = updates.end_date || current?.end_date
    
    if (checkStart && checkEnd) {
      const { data: existing } = await supabase
        .from('fiscal_periods')
        .select('id, period_name')
        .is('deleted_at', null)
        .neq('id', id)
        .or(`start_date.lte.${checkEnd},end_date.gte.${checkStart}`)
      
      if (existing && existing.length > 0) {
        throw new Error(`Date range overlaps with existing period(s): ${existing.map(p => p.period_name).join(', ')}`)
      }
    }
  }
  
  const { data, error } = await supabase
    .from('fiscal_periods')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update fiscal period: ${error.message}`)
  return data
}

/**
 * Close fiscal period (status: open → closed)
 * PSAK: Prevents further postings to closed periods
 */
export async function closeFiscalPeriod(id: string, closedBy: string) {
  const supabase = await createAdminClient()
  
  const { data, error } = await supabase
    .from('fiscal_periods')
    .update({
      status: 'closed',
      closed_by: closedBy,
      closed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to close fiscal period: ${error.message}`)
  return data
}

/**
 * Reopen closed fiscal period (requires approval)
 * PSAK: Should be rare and documented
 */
export async function reopenFiscalPeriod(id: string, reopenedBy: string, reason: string) {
  const supabase = await createAdminClient()
  
  const { data, error } = await supabase
    .from('fiscal_periods')
    .update({
      status: 'open',
      closed_by: null,
      closed_at: null,
      reopening_reason: reason,
      reopened_by: reopenedBy,
      reopened_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to reopen fiscal period: ${error.message}`)
  return data
}

/**
 * Soft delete fiscal period (only if no journal entries exist)
 */
export async function deleteFiscalPeriod(id: string) {
  const supabase = await createAdminClient()
  
  // Check if period has any journal entries
  const { count } = await supabase
    .from('journal_entries')
    .select('*', { count: 'exact', head: true })
    .eq('fiscal_period_id', id)
    .is('deleted_at', null)
  
  if (count && count > 0) {
    throw new Error('Cannot delete fiscal period with existing journal entries')
  }
  
  const { error } = await supabase
    .from('fiscal_periods')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete fiscal period: ${error.message}`)
  return { success: true }
}

/**
 * Get all periods with entry counts
 */
export async function getFiscalPeriodsWithStats() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('fiscal_periods')
    .select(`
      *,
      journal_entries_count (
        count
      )
    `)
    .is('deleted_at', null)
    .order('start_date', { ascending: false })
  
  if (error) throw new Error(`Failed to fetch fiscal periods with stats: ${error.message}`)
  return data || []
}

/**
 * Validate if a date is within an open fiscal period
 * Returns null if valid, error message if not
 */
export async function validatePostingDate(transactionDate: string): Promise<string | null> {
  const period = await getFiscalPeriodByDate(transactionDate)
  
  if (!period) {
    return `No fiscal period found for date ${transactionDate}`
  }
  
  if (period.status !== 'open') {
    return `Fiscal period ${period.period_name} is ${period.status} (cannot post to closed periods)`
  }
  
  return null // Valid
}
