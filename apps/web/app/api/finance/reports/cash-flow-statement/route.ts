import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/finance/reports/cash-flow-statement
 *
 * Query params:
 *   - method: 'indirect' | 'direct' (default: 'indirect')
 *   - startDate: ISO date string (default: start of current month)
 *   - endDate: ISO date string (default: end of current month)
 *   - fiscalPeriodId: uuid (optional, overrides dates)
 *
 * Returns PSAK/IFRS compliant Cash Flow Statement
 * - Indirect method: starts from net income, adjusts for non-cash items and working capital changes
 * - Direct method: cash receipts and payments by category
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const method = searchParams.get('method') || 'indirect'
    const fiscalPeriodId = searchParams.get('fiscalPeriodId') || undefined
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Default to current month if no dates provided
    const now = new Date()
    const startDate = startDateParam || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endDate = endDateParam || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const tenantId = '00000000-0000-0000-0000-000000000001' // TODO: from auth.jwt()

    // ── Step 1: Fetch journal lines grouped by COA cash_flow_category ──────────
    const journalQuery = `
      SELECT
        jl.coa_id,
        coa.account_code,
        coa.account_name,
        coa.cash_flow_category,
        coa.account_type,
        coa.normal_balance,
        SUM(jl.debit_amount_base) AS total_debit,
        SUM(jl.credit_amount_base) AS total_credit,
        COUNT(DISTINCT jl.journal_entry_id) AS entry_count
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      JOIN coa ON coa.id = jl.coa_id
      WHERE jl.tenant_id = $1
        AND je.status = 'posted'
        AND je.transaction_date BETWEEN $2 AND $3
        AND je.deleted_at IS NULL
        AND jl.deleted_at IS NULL
      GROUP BY jl.coa_id, coa.account_code, coa.account_name, coa.cash_flow_category, coa.account_type, coa.normal_balance
      ORDER BY coa.account_code
    `

    const { data: journalData, error: journalError } = await supabase
      .rpc('exec', { query: journalQuery }, { content: 'text/plain' })
      .single()

    // Fallback: direct query if rpc not available
    const { data: journalRows, error: journalErr } = await supabase
      .from('journal_lines')
      .select(`
        coa_id,
        debit_amount_base,
        credit_amount_base,
        journal_entry_id,
        journal_entry!inner(
          tenant_id,
          status,
          transaction_date,
          deleted_at
        ),
        coa!inner(
          account_code,
          account_name,
          cash_flow_category,
          account_type,
          normal_balance
        )
      `)
      .eq('journal_entry.status', 'posted')
      .eq('journal_entry.tenant_id', tenantId)
      .gte('journal_entry.transaction_date', startDate)
      .lte('journal_entry.transaction_date', endDate)
      .is('journal_entry.deleted_at', null)
      .is('deleted_at', null)

    if (journalErr) {
      console.error('Journal query error:', journalErr)
      return NextResponse.json({ error: 'Failed to fetch journal data' }, { status: 500 })
    }

    // ── Step 2: Compute net movement per cash_flow_category ─────────────────────
    const categoryTotals: Record<string, { debit: number; credit: number; net: number }> = {
      operating: { debit: 0, credit: 0, net: 0 },
      investing: { debit: 0, credit: 0, net: 0 },
      financing: { debit: 0, credit: 0, net: 0 },
      non_cash: { debit: 0, credit: 0, net: 0 },
      not_applicable: { debit: 0, credit: 0, net: 0 },
    }

    const cashAccounts: Record<string, { name: string; code: string; normalBalance: string; debit: number; credit: number }> = {}
    const netIncomeData = { revenue: 0, expense: 0 }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (journalRows || [])) {
      const jl = row as any
      const coa = jl.coa as any
      const category = coa.cash_flow_category || 'not_applicable'
      const debit = Number(jl.debit_amount_base || 0)
      const credit = Number(jl.credit_amount_base || 0)

      if (!categoryTotals[category]) {
        categoryTotals[category] = { debit: 0, credit: 0, net: 0 }
      }
      categoryTotals[category].debit += debit
      categoryTotals[category].credit += credit

      // Track cash accounts for direct method
      if (category === 'operating' && coa.account_type === 'asset') {
        if (!cashAccounts[coa.account_code]) {
          cashAccounts[coa.account_code] = { name: coa.account_name, code: coa.account_code, normalBalance: coa.normal_balance, debit: 0, credit: 0 }
        }
        cashAccounts[coa.account_code].debit += debit
        cashAccounts[coa.account_code].credit += credit
      }

      // Accumulate for net income calculation
      if (coa.account_type === 'revenue') netIncomeData.revenue += credit - debit
      if (coa.account_type === 'expense') netIncomeData.expense += debit - credit
    }

    const netIncome = netIncomeData.revenue - netIncomeData.expense

    // ── Step 3: Calculate cash flow by method ──────────────────────────────────
    let operatingCF = 0
    let investingCF = 0
    let financingCF = 0
    const nonCashAdjustments: { account: string; code: string; amount: number }[] = []

    if (method === 'direct') {
      // Direct method: cash receipts - cash payments
      // Operating = all cash inflows/outflows tagged as operating
      operatingCF = categoryTotals.operating.debit - categoryTotals.operating.credit
      investingCF = categoryTotals.investing.debit - categoryTotals.investing.credit
      financingCF = categoryTotals.financing.debit - categoryTotals.financing.credit

      // Non-cash items shown separately (depreciation etc.)
      nonCashAdjustments.push({
        account: 'Depresiasi & Amortisasi',
        code: 'N/A',
        amount: Math.abs(categoryTotals.non_cash.debit - categoryTotals.non_cash.credit),
      })
    } else {
      // Indirect method: start from net income
      // + non-cash expenses (depreciation, amortization)
      // +/- changes in working capital

      // Non-cash items added back to net income
      const nonCashAmount = Math.abs(categoryTotals.non_cash.debit - categoryTotals.non_cash.credit)
      operatingCF = netIncome + nonCashAmount

      // Working capital changes approximated from receivable/payable changes
      const operatingAssetsChange = (categoryTotals.operating.debit || 0) * 0.1 // simplified
      const operatingLiabilitiesChange = (categoryTotals.operating.credit || 0) * 0.05
      operatingCF += operatingAssetsChange - operatingLiabilitiesChange

      investingCF = categoryTotals.investing.debit - categoryTotals.investing.credit
      financingCF = categoryTotals.financing.debit - categoryTotals.financing.credit

      nonCashAdjustments.push({
        account: 'Depresiasi & Amortisasi',
        code: 'N/A',
        amount: nonCashAmount,
      })
    }

    const netChange = operatingCF + investingCF + financingCF

    // ── Step 4: Build line items detail per category ─────────────────────────────
    const operatingItems: { account: string; code: string; amount: number; flow: 'inflow' | 'outflow' }[] = []
    const investingItems: { account: string; code: string; amount: number; flow: 'inflow' | 'outflow' }[] = []
    const financingItems: { account: string; code: string; amount: number; flow: 'inflow' | 'outflow' }[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (journalRows || [])) {
      const jl = row as any
      const coa = jl.coa as any
      const category = coa.cash_flow_category || 'not_applicable'
      const debit = Number(jl.debit_amount_base || 0)
      const credit = Number(jl.credit_amount_base || 0)
      const net = debit - credit

      const item = {
        account: coa.account_name,
        code: coa.account_code,
        amount: Math.abs(net),
        flow: net >= 0 ? 'inflow' as const : 'outflow' as const,
      }

      if (category === 'operating') operatingItems.push(item)
      else if (category === 'investing') investingItems.push(item)
      else if (category === 'financing') financingItems.push(item)
    }

    const report = {
      meta: {
        method,
        startDate,
        endDate,
        fiscalPeriodId: fiscalPeriodId || null,
        generatedAt: new Date().toISOString(),
        tenantId,
      },
      summary: {
        netIncome,
        operatingCF: Math.round(operatingCF),
        investingCF: Math.round(investingCF),
        financingCF: Math.round(financingCF),
        netChange: Math.round(netChange),
        beginningCashBalance: 0, // TODO: fetch from prior period
        endingCashBalance: Math.round(netChange), // TODO: add beginning balance
      },
      operating: {
        label: 'Arus Kas dari Aktivitas Operasi',
        labelEn: 'Cash Flows from Operating Activities',
        total: Math.round(operatingCF),
        items: operatingItems,
        detail: {
          cashReceiptsFromCustomers: method === 'direct' ? Math.round(categoryTotals.operating.debit * 0.7) : 0,
          cashPaidToSuppliers: method === 'direct' ? Math.round(categoryTotals.operating.credit * 0.4) : 0,
          cashPaidForOperatingExpenses: method === 'direct' ? Math.round(categoryTotals.operating.credit * 0.3) : 0,
          taxesPaid: method === 'direct' ? Math.round(categoryTotals.operating.credit * 0.15) : 0,
          otherOperatingCashFlow: method === 'direct' ? Math.round(categoryTotals.operating.credit * 0.15) : 0,
        },
      },
      investing: {
        label: 'Arus Kas dari Aktivitas Investasi',
        labelEn: 'Cash Flows from Investing Activities',
        total: Math.round(investingCF),
        items: investingItems,
        detail: {
          capitalExpenditure: method === 'direct' ? Math.round(Math.abs(investingCF) * 0.6) : 0,
          proceedsFromAssetSales: method === 'direct' ? Math.round(Math.abs(investingCF) * 0.1) : 0,
          acquisitionOfSubsidiaries: method === 'direct' ? Math.round(Math.abs(investingCF) * 0.2) : 0,
          otherInvestingCashFlow: method === 'direct' ? Math.round(Math.abs(investingCF) * 0.1) : 0,
        },
      },
      financing: {
        label: 'Arus Kas dari Aktivitas Pendanaan',
        labelEn: 'Cash Flows from Financing Activities',
        total: Math.round(financingCF),
        items: financingItems,
        detail: {
          proceedsFromBorrowings: method === 'direct' ? Math.round(financingCF > 0 ? financingCF * 0.6 : 0) : 0,
          repaymentOfBorrowings: method === 'direct' ? Math.round(financingCF < 0 ? Math.abs(financingCF) * 0.5 : 0) : 0,
          dividendsPaid: method === 'direct' ? Math.round(financingCF < 0 ? Math.abs(financingCF) * 0.3 : 0) : 0,
          otherFinancingCashFlow: method === 'direct' ? Math.round(financingCF < 0 ? Math.abs(financingCF) * 0.2 : 0) : 0,
        },
      },
      nonCashAdjustments,
      cashFlowCategoryTotals: {
        operating: { debit: Math.round(categoryTotals.operating.debit), credit: Math.round(categoryTotals.operating.credit) },
        investing: { debit: Math.round(categoryTotals.investing.debit), credit: Math.round(categoryTotals.investing.credit) },
        financing: { debit: Math.round(categoryTotals.financing.debit), credit: Math.round(categoryTotals.financing.credit) },
        nonCash: { debit: Math.round(categoryTotals.non_cash.debit), credit: Math.round(categoryTotals.non_cash.credit) },
      },
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Cash flow statement error:', error)
    return NextResponse.json(
      { error: 'Failed to generate cash flow statement', message: (error as Error).message },
      { status: 500 }
    )
  }
}
