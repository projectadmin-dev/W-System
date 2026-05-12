import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/finance/reports/trial-balance
 *
 * Query params:
 *   - asOfDate: ISO date string (default: today)
 *   - fiscalPeriodId: uuid (optional)
 *
 * Returns Trial Balance (debit = credit check)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const asOfDateParam = searchParams.get('asOfDate')

    const now = new Date()
    const asOfDate = asOfDateParam || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    const tenantId = '00000000-0000-0000-0000-000000000001'

    // 1. Fetch all posted journal lines up to asOfDate
    const { data: journalRows, error: jErr } = await supabase
      .from('journal_lines')
      .select('id, coa_id, debit_amount_base, credit_amount_base, journal_entry_id')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (jErr) return NextResponse.json({ error: 'Failed to fetch journal lines', detail: jErr.message }, { status: 500 })

    const entryIds = [...new Set((journalRows || []).map(r => r.journal_entry_id))]
    const { data: entries, error: eErr } = await supabase
      .from('journal_entries')
      .select('id, status, transaction_date')
      .in('id', entryIds)
      .eq('status', 'posted')
      .lte('transaction_date', asOfDate)
      .is('deleted_at', null)

    if (eErr) return NextResponse.json({ error: 'Failed to fetch journal entries', detail: eErr.message }, { status: 500 })

    const postedIds = new Set((entries || []).map(e => e.id))
    const validRows = (journalRows || []).filter(r => postedIds.has(r.journal_entry_id))

    // 2. Fetch all COA (untuk menampilkan akun yang saldo-nya 0 juga)
    const { data: allCoa, error: cErr } = await supabase
      .from('coa')
      .select('id, account_code, account_name, account_type, normal_balance')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('account_code', { ascending: true })

    if (cErr) return NextResponse.json({ error: 'Failed to fetch COA', detail: cErr.message }, { status: 500 })

    const coaMap = new Map((allCoa || []).map(c => [c.id, c]))

    // 3. Aggregate debit/credit per COA
    const balances: Record<string, { name: string; code: string; type: string; debit: number; credit: number }> = {}

    for (const row of validRows) {
      const coa = coaMap.get(row.coa_id)
      if (!coa) continue
      const key = coa.account_code || coa.id
      if (!balances[key]) balances[key] = {
        name: coa.account_name, code: coa.account_code || 'N/A',
        type: coa.account_type || 'unknown', debit: 0, credit: 0
      }
      balances[key].debit  += Number(row.debit_amount_base  || 0)
      balances[key].credit += Number(row.credit_amount_base || 0)
    }

    // 4. Add zero-balance accounts
    for (const coa of (allCoa || [])) {
      const key = coa.account_code || coa.id
      if (!balances[key]) balances[key] = {
        name: coa.account_name, code: coa.account_code || 'N/A',
        type: coa.account_type || 'unknown', debit: 0, credit: 0
      }
    }

    const items = Object.values(balances).sort((a, b) => a.code.localeCompare(b.code))
    const totalDebit  = items.reduce((s, i) => s + i.debit,  0)
    const totalCredit = items.reduce((s, i) => s + i.credit, 0)

    return NextResponse.json({
      meta: { report: 'trial-balance', asOfDate, generatedAt: new Date().toISOString(), tenantId },
      items,
      totals: { debit: Math.round(totalDebit), credit: Math.round(totalCredit) },
      balanced: Math.abs(totalDebit - totalCredit) < 1,
      discrepancy: Math.round(totalDebit - totalCredit),
    })
  } catch (error) {
    console.error('Trial balance error:', error)
    return NextResponse.json(
      { error: 'Failed to generate trial balance', message: (error as Error).message },
      { status: 500 }
    )
  }
}
