import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/finance/reports/balance-sheet
 *
 * Query params:
 *   - asOfDate: ISO date string (default: today)
 *   - fiscalPeriodId: uuid (optional)
 *
 * Returns PSAK-compliant Balance Sheet (Aktiva = Passiva)
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

    // 2. Fetch COA
    const coaIds = [...new Set(validRows.map(r => r.coa_id))]
    const { data: coaData, error: cErr } = await supabase
      .from('coa')
      .select('id, account_code, account_name, account_type, normal_balance')
      .in('id', coaIds)

    if (cErr) return NextResponse.json({ error: 'Failed to fetch COA', detail: cErr.message }, { status: 500 })

    const coaMap = new Map((coaData || []).map(c => [c.id, c]))

    // 3. Aggregate
    const assets:      Record<string, { name: string; code: string; amount: number }> = {}
    const liabilities: Record<string, { name: string; code: string; amount: number }> = {}
    const equity:      Record<string, { name: string; code: string; amount: number }> = {}

    const add = (bucket: any, key: string, name: string, code: string, amount: number) => {
      if (!bucket[key]) bucket[key] = { name, code, amount: 0 }
      bucket[key].amount += amount
    }

    for (const row of validRows) {
      const coa = coaMap.get(row.coa_id)
      if (!coa) continue
      const debit  = Number(row.debit_amount_base  || 0)
      const credit = Number(row.credit_amount_base || 0)
      const type   = (coa.account_type || '').toLowerCase()
      const normal = (coa.normal_balance || '').toLowerCase()
      const key    = coa.account_code || coa.account_name
      const name   = coa.account_name
      const code   = coa.account_code || 'N/A'

      // Balance = debit - credit for asset; credit - debit for liability/equity
      let balance = 0
      if (normal === 'debit')  balance = debit - credit
      else                     balance = credit - debit

      if (balance === 0) continue
      const amt = Math.abs(balance)

      if (type === 'asset')                add(assets,      key, name, code, amt)
      else if (type === 'liability')         add(liabilities, key, name, code, amt)
      else if (type === 'equity')          add(equity,      key, name, code, amt)
      // revenue/expense juga masuk ke equity (retained earnings) — di sini kita sederhanakan:
      // Gunakan net income sementara dari P&L logic. Untuk BS murni, revenue/expense tidak dicatat langsung.
    }

    const sum = (obj: Record<string, { amount: number }>) => Object.values(obj).reduce((a, b) => a + b.amount, 0)

    const totalAssets      = sum(assets)
    const totalLiabilities = sum(liabilities)
    const totalEquity      = sum(equity)
    const totalPassiva     = totalLiabilities + totalEquity

    return NextResponse.json({
      meta: { report: 'balance-sheet', asOfDate, generatedAt: new Date().toISOString(), tenantId },
      assets:      { total: Math.round(totalAssets),      items: Object.values(assets) },
      liabilities: { total: Math.round(totalLiabilities), items: Object.values(liabilities) },
      equity:      { total: Math.round(totalEquity),      items: Object.values(equity) },
      totalAssets:      Math.round(totalAssets),
      totalLiabilities: Math.round(totalLiabilities),
      totalEquity:      Math.round(totalEquity),
      totalPassiva:     Math.round(totalPassiva),
      balanced: Math.abs(totalAssets - totalPassiva) < 1,
      discrepancy: Math.round(totalAssets - totalPassiva),
    })
  } catch (error) {
    console.error('Balance sheet error:', error)
    return NextResponse.json(
      { error: 'Failed to generate balance sheet', message: (error as Error).message },
      { status: 500 }
    )
  }
}
