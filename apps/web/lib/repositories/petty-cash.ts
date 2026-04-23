import { createAdminClient } from '@/lib/supabase-server'

// ============================================
// PETTY CASH CUSTODIANS
// ============================================

export async function getPettyCashCustodians(tenantId?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('petty_cash_custodians')
    .select(`
      *,
      user:user_profiles(full_name, email)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (tenantId) query = query.eq('tenant_id', tenantId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch custodians: ${error.message}`)
  return data || []
}

export async function getCustodianById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('petty_cash_custodians')
    .select(`
      *,
      user:user_profiles(full_name, email)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw new Error(`Failed to fetch custodian: ${error.message}`)
  return data
}

export async function createCustodian(custodian: any) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('petty_cash_custodians')
    .insert(custodian)
    .select()
    .single()

  if (error) throw new Error(`Failed to create custodian: ${error.message}`)
  return data
}

export async function updateCustodian(id: string, updates: any) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('petty_cash_custodians')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update custodian: ${error.message}`)
  return data
}

export async function deleteCustodian(id: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('petty_cash_custodians')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`Failed to delete custodian: ${error.message}`)
  return { success: true }
}

// ============================================
// PETTY CASH ENTRIES
// ============================================

export async function getPettyCashEntries(custodianId?: string, type?: string, dateFrom?: string, dateTo?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('petty_cash_entries')
    .select(`
      *,
      custodian:petty_cash_custodians(custodian_name, department),
      money_request:money_requests(request_number, employee_name, department, purpose, amount),
      bank_account:bank_accounts(account_name, bank_name, account_number),
      approver:user_profiles!approved_by(full_name)
    `)
    .is('deleted_at', null)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (custodianId) query = query.eq('custodian_id', custodianId)
  if (type) query = query.eq('entry_type', type)
  if (dateFrom) query = query.gte('entry_date', dateFrom)
  if (dateTo) query = query.lte('entry_date', dateTo)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch entries: ${error.message}`)
  return data || []
}

export async function getEntryById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('petty_cash_entries')
    .select(`
      *,
      custodian:petty_cash_custodians(custodian_name, department),
      money_request:money_requests(request_number, employee_name, department, purpose, amount),
      bank_account:bank_accounts(account_name, bank_name, account_number)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw new Error(`Failed to fetch entry: ${error.message}`)
  return data
}

export async function createPettyCashEntry(entry: any) {
  const supabase = await createAdminClient()

  // Get current balance
  const { data: custodian, error: custErr } = await supabase
    .from('petty_cash_custodians')
    .select('current_balance, max_limit')
    .eq('id', entry.custodian_id)
    .single()

  if (custErr) throw new Error(`Failed to fetch custodian: ${custErr.message}`)

  // For OUT entries (expense, return), check sufficient balance
  const outType = ['expense', 'return'].includes(entry.entry_type)
  if (outType && Number(custodian.current_balance) < Number(entry.amount)) {
    throw new Error(`Insufficient petty cash balance. Current: ${custodian.current_balance}, Requested: ${entry.amount}`)
  }

  // Calculate running balance
  let newBalance = Number(custodian.current_balance)
  if (['topup', 'settlement'].includes(entry.entry_type)) {
    newBalance += Number(entry.amount)
  } else if (['expense', 'return'].includes(entry.entry_type)) {
    newBalance -= Number(entry.amount)
  }
  // adjustment: amount bisa +/-
  if (entry.entry_type === 'adjustment') {
    newBalance += Number(entry.amount) // positive = increase, negative = decrease
  }

  // Insert entry
  const { data, error } = await supabase
    .from('petty_cash_entries')
    .insert({ ...entry, running_balance: newBalance })
    .select()
    .single()

  if (error) throw new Error(`Failed to create entry: ${error.message}`)

  // Update custodian balance
  await supabase
    .from('petty_cash_custodians')
    .update({ current_balance: newBalance, updated_at: new Date().toISOString() })
    .eq('id', entry.custodian_id)

  // If settlement, update money_request
  if (entry.entry_type === 'settlement' && entry.money_request_id) {
    await supabase
      .from('money_requests')
      .update({
        settled_from_petty_cash: true,
        petty_cash_entry_id: data.id,
        settled_at: new Date().toISOString(),
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', entry.money_request_id)
  }

  return data
}

export async function updatePettyCashEntry(id: string, updates: any) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('petty_cash_entries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update entry: ${error.message}`)
  return data
}

export async function deletePettyCashEntry(id: string) {
  const supabase = await createAdminClient()

  // Get entry info for reversal
  const { data: entry, error: entryErr } = await supabase
    .from('petty_cash_entries')
    .select('custodian_id, entry_type, amount')
    .eq('id', id)
    .single()

  if (entryErr) throw new Error(`Failed to fetch entry: ${entryErr.message}`)

  // Soft delete
  const { error } = await supabase
    .from('petty_cash_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`Failed to delete entry: ${error.message}`)

  // If this was a settlement, reset money_request
  const { data: checkEntry } = await supabase
    .from('petty_cash_entries')
    .select('money_request_id')
    .eq('id', id)
    .single()

  if (checkEntry?.money_request_id) {
    await supabase
      .from('money_requests')
      .update({
        settled_from_petty_cash: false,
        petty_cash_entry_id: null,
        settled_at: null,
        status: 'approved',
        paid_at: null,
      })
      .eq('id', checkEntry.money_request_id)
  }

  return { success: true }
}

// ============================================
// MONEY REQUESTS: Get pending (approved but not settled)
// ============================================

export async function getPendingMoneyRequests(tenantId?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('money_requests')
    .select('*')
    .in('status', ['approved', 'submitted'])
    .eq('settled_from_petty_cash', false)
    .is('deleted_at', null)
    .order('approved_at', { ascending: false })

  if (tenantId) query = query.eq('tenant_id', tenantId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch money requests: ${error.message}`)
  return data || []
}

// ============================================
// SUMMARY STATS
// ============================================

export async function getPettyCashSummary(custodianId?: string) {
  const supabase = await createAdminClient()

  let custQuery = supabase
    .from('petty_cash_custodians')
    .select('id, custodian_name, current_balance, max_limit, opening_balance')
    .eq('is_active', true)
    .is('deleted_at', null)

  if (custodianId) custQuery = custQuery.eq('id', custodianId)

  const { data: custodians, error: custErr } = await custQuery
  if (custErr) throw new Error(`Failed to fetch custodians: ${custErr.message}`)

  const custodianIds = custodians?.map(c => c.id) || []

  // Totals by type
  const { data: totals, error: totErr } = await supabase
    .from('petty_cash_entries')
    .select('entry_type, amount')
    .in('custodian_id', custodianIds.length > 0 ? custodianIds : ['00000000-0000-0000-0000-000000000000'])
    .is('deleted_at', null)

  if (totErr) throw new Error(`Failed to fetch totals: ${totErr.message}`)

  const topup = totals?.filter(t => t.entry_type === 'topup').reduce((s, t) => s + Number(t.amount), 0) || 0
  const expense = totals?.filter(t => t.entry_type === 'expense').reduce((s, t) => s + Number(t.amount), 0) || 0
  const settlement = totals?.filter(t => t.entry_type === 'settlement').reduce((s, t) => s + Number(t.amount), 0) || 0
  const ret = totals?.filter(t => t.entry_type === 'return').reduce((s, t) => s + Number(t.amount), 0) || 0

  return {
    custodians: custodians || [],
    total_topup: topup,
    total_expense: expense,
    total_settlement: settlement,
    total_return: ret,
    current_balance: (custodians || []).reduce((s, c) => s + Number(c.current_balance), 0),
    max_limit: (custodians || []).reduce((s, c) => s + Number(c.max_limit), 0),
  }
}
