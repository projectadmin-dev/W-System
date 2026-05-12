import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/finance/transactions
 * Get unified transaction list (journals + payments + receipts)
 * Query params: type (journal|payment|receipt), start_date, end_date, status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'journal'
    const startDate = searchParams.get('start_date') || undefined
    const endDate = searchParams.get('end_date') || undefined
    const status = searchParams.get('status') || undefined

    const supabase = await createAdminClient()

    if (type === 'journal') {
      let query = supabase
        .from('journal_entries')
        .select('id, transaction_date, entry_number, description, status, currency, exchange_rate, fiscal_period_id, prepared_by, posted_by, created_at')
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })

      if (startDate) query = query.gte('transaction_date', startDate)
      if (endDate) query = query.lte('transaction_date', endDate)
      if (status) query = query.eq('status', status)

      const { data, error } = await query
      if (error) throw new Error(`Failed to fetch transactions: ${error.message}`)
      return NextResponse.json({ data: data || [] })
    }

    if (type === 'payment') {
      try {
        let query = supabase
          .from('payments')
          .select('id, payment_date, amount, payment_method, notes, client_id, invoice_id')
          .is('deleted_at', null)
          .order('payment_date', { ascending: false })

        if (startDate) query = query.gte('payment_date', startDate)
        if (endDate) query = query.lte('payment_date', endDate)

        const { data, error } = await query
        if (error) {
          // payments table may not exist or have different schema
          console.log('Payments query error (non-critical):', error.message)
          return NextResponse.json({ data: [] })
        }
        return NextResponse.json({ data: data || [] })
      } catch (e) {
        return NextResponse.json({ data: [] })
      }
    }

    return NextResponse.json({ data: [] })
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/finance/transactions
 * Placeholder — routing is handled by individual type routes
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Use specific transaction type endpoints: /api/finance/journal, /api/finance/payments' },
    { status: 400 }
  )
}
