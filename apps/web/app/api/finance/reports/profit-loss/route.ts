import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/finance/reports/profit-loss
 *
 * Query params:
 *   - startDate: ISO date string (default: start of current month)
 *   - endDate:   ISO date string (default: end of current month)
 *   - fiscalPeriodId: uuid (optional)
 *
 * Returns PSAK-compliant Profit & Loss (Income Statement)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const startDateParam = searchParams.get('startDate')
    const endDateParam   = searchParams.get('endDate')

    const now = new Date()
    const startDate = startDateParam || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endDate   = endDateParam   || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    const tenantId  = '00000000-0000-0000-0000-000000000001'

    // 1. Fetch posted journal lines in date range
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
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .is('deleted_at', null)

    if (eErr) return NextResponse.json({ error: 'Failed to fetch journal entries', detail: eErr.message }, { status: 500 })

    const postedIds = new Set((entries || []).map(e => e.id))
    const validRows = (journalRows || []).filter(r => postedIds.has(r.journal_entry_id))

    // 2. Fetch COA data
    const coaIds = [...new Set(validRows.map(r => r.coa_id))]
    const { data: coaData, error: cErr } = await supabase
      .from('coa')
      .select('id, account_code, account_name, account_type, normal_balance')
      .in('id', coaIds)

    if (cErr) return NextResponse.json({ error: 'Failed to fetch COA', detail: cErr.message }, { status: 500 })

    const coaMap = new Map((coaData || []).map(c => [c.id, c]))

    // 3. Aggregate by PSAK category
    const revenue: Record<string, { name: string; code: string; amount: number }> = {}
    const cogs:    Record<string, { name: string; code: string; amount: number }> = {}
    const opex:    Record<string, { name: string; code: string; amount: number }> = {}
    const otherInc: Record<string, { name: string; code: string; amount: number }> = {}
    const otherExp: Record<string, { name: string; code: string; amount: number }> = {}

    const add = (bucket: any, key: string, name: string, code: string, amount: number) => {
      if (!bucket[key]) bucket[key] = { name, code, amount: 0 }
      bucket[key].amount += amount
    }

    for (const row of validRows) {
      const coa = coaMap.get(row.coa_id)
      if (!coa) continue
      const debit  = Number(row.debit_amount_base  || 0)
      const credit = Number(row.credit_amount_base || 0)
      const net    = credit - debit   // Revenue & Liability credited = increase
      if (net === 0) continue

      const type = (coa.account_type || '').toLowerCase()
      const key  = coa.account_code || coa.account_name
      const name = coa.account_name
      const code = coa.account_code || 'N/A'
      const amt  = Math.abs(net)

      if (type === 'revenue')               add(revenue, key, name, code, amt)
      else if (type === 'cogs')             add(cogs,    key, name, code, amt)
      else if (type === 'expense')          add(opex,    key, name, code, amt)
      else if (type === 'other_income')     add(otherInc,key, name, code, amt)
      else if (type === 'other_expense')    add(otherExp,key, name, code, amt)
    }

    const sum = (obj: Record<string, { amount: number }>) => Object.values(obj).reduce((a, b) => a + b.amount, 0)

    const totalRevenue   = sum(revenue)
    const totalCogs      = sum(cogs)
    const grossProfit    = totalRevenue - totalCogs
    const totalOpex      = sum(opex)
    const operatingProfit = grossProfit - totalOpex
    const totalOtherInc  = sum(otherInc)
    const totalOtherExp  = sum(otherExp)
    const ebit           = operatingProfit + totalOtherInc - totalOtherExp
    // Tax dianggap 0 sampai ada tabel tax (bisa di-extend)
    const taxExpense     = 0
    const netIncome      = ebit - taxExpense

    return NextResponse.json({
      meta: { report: 'profit-loss', startDate, endDate, generatedAt: new Date().toISOString(), tenantId },
      revenue:   { total: Math.round(totalRevenue),   items: Object.values(revenue) },
      cogs:      { total: Math.round(totalCogs),      items: Object.values(cogs) },
      grossProfit: Math.round(grossProfit),
      operatingExpenses: { total: Math.round(totalOpex), items: Object.values(opex) },
      operatingProfit: Math.round(operatingProfit),
      otherIncome:  { total: Math.round(totalOtherInc),  items: Object.values(otherInc) },
      otherExpense: { total: Math.round(totalOtherExp),  items: Object.values(otherExp) },
      ebit: Math.round(ebit),
      taxExpense: Math.round(taxExpense),
      netIncome: Math.round(netIncome),
    })
  } catch (error) {
    console.error('Profit & Loss error:', error)
    return NextResponse.json(
      { error: 'Failed to generate profit & loss', message: (error as Error).message },
      { status: 500 }
    )
  }
}
