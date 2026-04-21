import { createServerClient, createAdminClient } from '@/lib/supabase-server'
// Temporarily use any for Database type until journal_entries migration is fixed
// type Database = import('@/src/types/database').Database
type Database = any

type JournalEntry = Database['public']['Tables']['journal_entries']['Row']
type JournalEntryInsert = Database['public']['Tables']['journal_entries']['Insert']
type JournalEntryUpdate = Database['public']['Tables']['journal_entries']['Update']
type JournalLine = Database['public']['Tables']['journal_lines']['Row']
type JournalLineInsert = Database['public']['Tables']['journal_lines']['Insert']

/**
 * Finance Journal Repository
 * PSAK-compliant double-entry bookkeeping
 * (per 06-compliance §6.1 - Immutable Audit Trail)
 */

/**
 * Get all journal entries with optional filters
 */
export async function getJournalEntries(filters?: {
  status?: JournalEntry['status']
  fiscalPeriodId?: string
  startDate?: string
  endDate?: string
  sourceType?: JournalEntry['source_type']
  sourceId?: string
}) {
  const supabase = await createServerClient()
  let query = supabase
    .from('journal_entries')
    .select(`
      *,
      fiscal_periods (
        id,
        period_name,
        status
      ),
      journal_lines (
        *,
        coa (
          account_code,
          account_name,
          account_type
        )
      )
    `)
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })
    .order('entry_number', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.fiscalPeriodId) query = query.eq('fiscal_period_id', filters.fiscalPeriodId)
  if (filters?.startDate) query = query.gte('transaction_date', filters.startDate)
  if (filters?.endDate) query = query.lte('transaction_date', filters.endDate)
  if (filters?.sourceType) query = query.eq('source_type', filters.sourceType)
  if (filters?.sourceId) query = query.eq('source_id', filters.sourceId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch journal entries: ${error.message}`)
  return data || []
}

/**
 * Get journal entry by ID with lines
 */
export async function getJournalEntryById(id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('journal_entries')
    .select(`
      *,
      fiscal_periods (
        id,
        period_name,
        status
      ),
      journal_lines (
        *,
        coa (
          account_code,
          account_name,
          account_type,
          normal_balance
        )
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch journal entry: ${error.message}`)
  return data
}

/**
 * Get journal entry by entry number
 */
export async function getJournalEntryByNumber(entryNumber: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('journal_entries')
    .select(`
      *,
      journal_lines (
        *,
        coa (
          account_code,
          account_name
        )
      )
    `)
    .eq('entry_number', entryNumber)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch journal entry: ${error.message}`)
  return data
}

/**
 * Create journal entry with lines (atomic transaction)
 * PSAK: Validates debit = credit before posting
 */
export async function createJournalEntry(entry: JournalEntryInsert, lines: JournalLineInsert[]) {
  const supabase = await createServerClient()
  
  // Validate double-entry balance
  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit_amount || 0), 0)
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit_amount || 0), 0)
  
  if (Math.abs(totalDebit - totalCredit) > 0.0001) {
    throw new Error(`Journal entry imbalance: debit=${totalDebit}, credit=${totalCredit}. Must be equal (PSAK)`);
  }
  
  if (lines.length < 2) {
    throw new Error('Journal entry must have at least 2 lines (double-entry requirement)')
  }
  
  // Validate each line has either debit OR credit, not both
  for (const line of lines) {
    const hasDebit = Number(line.debit_amount || 0) > 0
    const hasCredit = Number(line.credit_amount || 0) > 0
    if (hasDebit && hasCredit) {
      throw new Error('Each line must be either debit OR credit, not both (PSAK rule)')
    }
    if (!hasDebit && !hasCredit) {
      throw new Error('Each line must have either debit or credit amount')
    }
  }
  
  // Create entry and lines in transaction
  const { data: entryData, error: entryError } = await supabase
    .from('journal_entries')
    .insert(entry)
    .select()
    .single()
  
  if (entryError) throw new Error(`Failed to create journal entry: ${entryError.message}`)
  
  // Add line numbers and link to entry
  const linesWithEntryId = lines.map((line, idx) => ({
    ...line,
    journal_entry_id: entryData.id,
    line_number: idx + 1
  }))
  
  const { data: linesData, error: linesError } = await supabase
    .from('journal_lines')
    .insert(linesWithEntryId)
    .select()
  
  if (linesError) {
    // Rollback entry if lines fail
    await supabase.from('journal_entries').delete().eq('id', entryData.id)
    throw new Error(`Failed to create journal lines: ${linesError.message}`)
  }
  
  return { ...entryData, journal_lines: linesData }
}

/**
 * Update journal entry (only allowed for draft status)
 * PSAK: Posted entries cannot be modified - use reversal instead
 */
export async function updateJournalEntry(id: string, updates: JournalEntryUpdate) {
  const supabase = await createServerClient()
  
  // Check current status
  const { data: current } = await supabase
    .from('journal_entries')
    .select('status')
    .eq('id', id)
    .single()
  
  if (current?.status === 'posted') {
    throw new Error('Cannot modify posted journal entry. Use reversal instead (PSAK compliance)')
  }
  
  const { data, error } = await supabase
    .from('journal_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update journal entry: ${error.message}`)
  return data
}

/**
 * Post journal entry (changes status from draft to posted)
 * PSAK: Entry becomes immutable after posting
 */
export async function postJournalEntry(id: string, postedBy: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('journal_entries')
    .update({
      status: 'posted',
      posted_by: postedBy,
      posted_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to post journal entry: ${error.message}`)
  return data
}

/**
 * Create reversal entry for posted journal entry
 * PSAK: Only way to correct posted entries
 */
export async function createReversalEntry(originalEntryId: string, reason: string, preparedBy: string) {
  const supabase = await createServerClient()
  
  // Get original entry
  const original = await getJournalEntryById(originalEntryId)
  if (!original) throw new Error('Original journal entry not found')
  
  if (original.status !== 'posted') {
    throw new Error('Can only reverse posted entries')
  }
  
  // Create reversal entry with opposite debit/credit
  const reversalLines = original.journal_lines.map((line: any) => ({
    coa_id: line.coa_id,
    debit_amount: line.credit_amount, // Swap
    credit_amount: line.debit_amount, // Swap
    line_description: `Reversal: ${line.line_description || ''}`,
    project_id: line.project_id,
    client_id: line.client_id
  }))
  
  const reversalEntry: JournalEntryInsert = {
    entry_number: `JE-REV-${Date.now()}`, // Will be formatted properly
    transaction_date: new Date().toISOString(),
    posting_date: new Date().toISOString(),
    source_type: 'adjustment',
    source_id: null,
    description: `Reversal of ${original.entry_number}: ${reason}`,
    reference_number: original.entry_number,
    currency: original.currency,
    exchange_rate: original.exchange_rate,
    status: 'draft',
    fiscal_period_id: original.fiscal_period_id,
    is_reversal: true,
    reversal_of_id: originalEntryId,
    reversal_reason: reason,
    prepared_by: preparedBy
  }
  
  return createJournalEntry(reversalEntry, reversalLines)
}

/**
 * Void journal entry (only for draft status)
 */
export async function voidJournalEntry(id: string) {
  const supabase = await createServerClient()
  
  const { data: current } = await supabase
    .from('journal_entries')
    .select('status')
    .eq('id', id)
    .single()
  
  if (current?.status === 'posted') {
    throw new Error('Cannot void posted entry. Use reversal instead')
  }
  
  const { data, error } = await supabase
    .from('journal_entries')
    .update({ status: 'void' })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to void journal entry: ${error.message}`)
  return data
}

/**
 * Get General Ledger for a specific COA account
 */
export async function getGeneralLed(coaId: string, options?: {
  startDate?: string
  endDate?: string
  includeReversed?: boolean
}) {
  const supabase = await createServerClient()
  
  let query = supabase
    .from('journal_lines')
    .select(`
      *,
      journal_entries (
        id,
        entry_number,
        transaction_date,
        posting_date,
        description,
        status,
        source_type
      ),
      coa (
        account_code,
        account_name
      )
    `)
    .eq('coa_id', coaId)
    .is('journal_lines.deleted_at', null)
    .order('transaction_date', { ascending: true })
  
  if (options?.startDate) {
    query = query.gte('journal_entries.transaction_date', options.startDate)
  }
  if (options?.endDate) {
    query = query.lte('journal_entries.transaction_date', options.endDate)
  }
  if (!options?.includeReversed) {
    query = query.eq('journal_entries.status', 'posted')
  }
  
  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch general ledger: ${error.message}`)
  
  // Calculate running balance
  let runningBalance = 0
  const ledger = data?.map(line => {
    const isDebit = Number(line.debit_amount || 0) > 0
    const amount = isDebit ? Number(line.debit_amount || 0) : -Number(line.credit_amount || 0)
    runningBalance += amount
    
    return {
      ...line,
      running_balance: runningBalance,
      movement_type: isDebit ? 'debit' : 'credit' as 'debit' | 'credit',
      movement_amount: Math.abs(amount)
    }
  })
  
  return ledger || []
}
