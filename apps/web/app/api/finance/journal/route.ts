import { NextRequest, NextResponse } from 'next/server'
import { 
  getJournalEntries, 
  getJournalEntryById,
  getJournalEntryByNumber,
  createJournalEntry, 
  updateJournalEntry,
  getGeneralLed
} from '@/lib/repositories/finance-journal'
import { createAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/finance/journal - List journal entries
 * Query params: id, entryNumber, coaId (for general ledger), status, fiscalPeriodId, startDate, endDate, sourceType, sourceId
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const entryNumber = searchParams.get('entryNumber')
    const coaId = searchParams.get('coaId') // For general ledger view
    const status = searchParams.get('status')
    const fiscalPeriodId = searchParams.get('fiscalPeriodId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const sourceType = searchParams.get('sourceType')
    const sourceId = searchParams.get('sourceId')
    
    // General Ledger view for specific COA account
    if (coaId) {
      const ledger = await getGeneralLed(coaId, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        includeReversed: searchParams.get('includeReversed') === 'true'
      })
      return NextResponse.json(ledger)
    }
    
    if (id) {
      const entry = await getJournalEntryById(id)
      return NextResponse.json(entry)
    }
    
    if (entryNumber) {
      const entry = await getJournalEntryByNumber(entryNumber)
      return NextResponse.json(entry)
    }
    
    const entries = await getJournalEntries({
      status: status as any,
      fiscalPeriodId: fiscalPeriodId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      sourceType: sourceType as any,
      sourceId: sourceId || undefined
    })
    return NextResponse.json(entries)
  } catch (error) {
    console.error('Failed to fetch journal entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch journal entries', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/finance/journal - Create journal entry
 * Body: { entry_number, transaction_date, posting_date, source_type, source_id?, description, reference_number?, currency, exchange_rate?, fiscal_period_id, is_reversal?, reversal_of_id?, reversal_reason?, prepared_by, lines: [{ coa_id, debit_amount, credit_amount, line_description, project_id?, client_id? }] }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    // Skip auth check for service role operations
    // In production, add auth middleware if needed

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', '00000000-0000-0000-0000-000000000000')
      .single()

    const tenantId = profile?.tenant_id || '00000000-0000-0000-0000-000000000001'

    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['transaction_date', 'description', 'fiscal_period_id', 'lines']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: 'Missing required fields', fields: missingFields },
        { status: 400 }
      )
    }
    
    if (!body.lines || !Array.isArray(body.lines) || body.lines.length < 2) {
      return NextResponse.json(
        { error: 'Journal entry must have at least 2 lines (double-entry requirement)' },
        { status: 400 }
      )
    }

    const entry = await createJournalEntry(
      { 
        ...body,
        prepared_by: '00000000-0000-0000-0000-000000000000' // System user
      }, 
      body.lines
    )
    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('Failed to create journal entry:', error)
    return NextResponse.json(
      { error: 'Failed to create journal entry', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/finance/journal - Update journal entry (draft only)
 * Query params: id
 * Body: { entry_number?, transaction_date?, description?, reference_number?, ... }
 */
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const body = await request.json()
    const entry = await updateJournalEntry(id, body)
    return NextResponse.json(entry)
  } catch (error) {
    console.error('Failed to update journal entry:', error)
    return NextResponse.json(
      { error: 'Failed to update journal entry', message: (error as Error).message },
      { status: 500 }
    )
  }
}
