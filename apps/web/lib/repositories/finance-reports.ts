/**
 * Finance Reports Repository
 * PSAK-compliant P&L and Balance Sheet reports
 */

import { createAdminClient } from '../supabase-server'

const ACCOUNT_TYPES = {
  CURRENT_ASSET: 'current_asset',
  FIXED_ASSET: 'fixed_asset',
  NON_CURRENT_ASSET: 'non_current_asset',
  CURRENT_LIABILITY: 'current_liability',
  NON_CURRENT_LIABILITY: 'non_current_liability',
  EQUITY: 'equity',
  REVENUE: 'revenue',
  OTHER_REVENUE: 'other_revenue',
  COGS: 'cogs',
  OPERATING_EXPENSE: 'operating_expense',
  OTHER_EXPENSE: 'other_expense',
  TAX_EXPENSE: 'tax_expense',
}

export type TrialBalanceRow = {
  accountCode: string
  accountName: string
  accountType: string
  debit: number
  credit: number
  balance: number
}

export type TrialBalanceReport = {
  period: { startDate: string | null; endDate: string | null }
  entries: TrialBalanceRow[]
  totalDebit: number
  totalCredit: number
}

/**
 * Core aggregation query: fetch posted journal lines joined with COA
 */
async function getJournalBalances(
  fiscalPeriodId?: string,
  filters?: { startDate?: string; endDate?: string }
) {
  const supabase = await createAdminClient()

  let query = supabase
    .from('journal_lines')
    .select(`
      id,
      debit_amount,
      credit_amount,
      coa!inner(id, account_code, account_name, account_type, normal_balance),
      journal_entries!inner(id, status, fiscal_period_id, transaction_date)
    `)
    .eq('journal_entries.status', 'posted')
    .is('deleted_at', null)

  if (fiscalPeriodId) {
    query = query.eq('journal_entries.fiscal_period_id', fiscalPeriodId)
  }
  if (filters?.startDate) query = query.gte('journal_entries.transaction_date', filters.startDate)
  if (filters?.endDate) query = query.lte('journal_entries.transaction_date', filters.endDate)

  let startDate = filters?.startDate
  let endDate = filters?.endDate
  if (fiscalPeriodId) {
    const { data: period } = await supabase
      .from('fiscal_periods')
      .select('start_date, end_date')
      .eq('id', fiscalPeriodId)
      .single()
    if (period) {
      startDate = period.start_date
      endDate = period.end_date
    }
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch journal balances: ${error.message}`)

  // Aggregate by account
  const accounts = new Map<string, TrialBalanceRow & { id: string } >()
  const typeTotals: Record<string, { debit: number; credit: number; net: number; details: any[] }> = {}

  for (const line of (data || [])) {
    const coa = (line as any).coa
    if (!coa) continue

    // Per-account
    let acct = accounts.get(coa.id)
    if (!acct) {
      const isDebitNormal = coa.normal_balance === 'debit'
      acct = {
        id: coa.id,
        accountCode: coa.account_code,
        accountName: coa.account_name,
        accountType: coa.account_type,
        debit: 0,
        credit: 0,
        balance: 0,
      }
      accounts.set(coa.id, acct)
    }
    acct.debit += Number(line.debit_amount || 0)
    acct.credit += Number(line.credit_amount || 0)
    const isDebitNormal = coa.normal_balance === 'debit'
    acct.balance += isDebitNormal
      ? (Number(line.debit_amount || 0) - Number(line.credit_amount || 0))
      : (Number(line.credit_amount || 0) - Number(line.debit_amount || 0))

    // Per-type aggregation
    const type = coa.account_type
    if (!typeTotals[type]) typeTotals[type] = { debit: 0, credit: 0, net: 0, details: [] }
    typeTotals[type].debit += Number(line.debit_amount || 0)
    typeTotals[type].credit += Number(line.credit_amount || 0)
    typeTotals[type].net += isDebitNormal
      ? (Number(line.debit_amount || 0) - Number(line.credit_amount || 0))
      : (Number(line.credit_amount || 0) - Number(line.debit_amount || 0))
    typeTotals[type].details.push(acct)
  }

  return {
    entries: Array.from(accounts.values()),
    byType: typeTotals,
    startDate,
    endDate,
  }
}

/* ─── TRIAL BALANCE ─── */

export async function getTrialBalance(
  fiscalPeriodId?: string,
  filters?: { startDate?: string; endDate?: string }
): Promise<TrialBalanceReport> {
  const { entries, startDate, endDate } = await getJournalBalances(fiscalPeriodId, filters)
  let totalDebit = 0
  let totalCredit = 0
  const sorted = entries.sort((a, b) => a.accountCode.localeCompare(b.accountCode))
  for (const e of sorted) {
    totalDebit += e.debit
    totalCredit += e.credit
  }
  return {
    period: { startDate, endDate },
    entries: sorted,
    totalDebit,
    totalCredit,
  }
}

/* ─── P&L ─── */

export type PnLReport = {
  period: { startDate: string | null; endDate: string | null }
  revenue: { total: number; details: TrialBalanceRow[] }
  cogs: { total: number; details: TrialBalanceRow[] }
  grossProfit: number
  grossProfitMargin: number
  operatingExpenses: { total: number; details: TrialBalanceRow[] }
  operatingProfit: number
  operatingProfitMargin: number
  otherExpenses: { total: number; details: TrialBalanceRow[] }
  netProfitBeforeTax: number
  taxExpense: { total: number; details: TrialBalanceRow[] }
  netProfit: number
  netProfitMargin: number
}

export async function getProfitAndLoss(
  fiscalPeriodId?: string,
  filters?: { startDate?: string; endDate?: string }
): Promise<PnLReport> {
  const { byType, startDate, endDate } = await getJournalBalances(fiscalPeriodId, filters)

  const sumNet = (types: string[]) =>
    types.reduce((s, t) => s + (byType[t]?.net || 0), 0)

  const getDetails = (types: string[]) =>
    types.flatMap(t => (byType[t]?.details || []))

  const revenueTotal = sumNet(['revenue', 'other_revenue'])
  const cogsTotal = sumNet(['cogs'])
  const grossProfit = revenueTotal - cogsTotal
  const opexTotal = sumNet(['operating_expense'])
  const otherExTotal = sumNet(['other_expense'])
  const taxTotal = sumNet(['tax_expense'])
  const operatingProfit = grossProfit - opexTotal
  const netProfitBeforeTax = operatingProfit - otherExTotal
  const netProfit = netProfitBeforeTax - taxTotal

  return {
    period: { startDate, endDate },
    revenue: { total: revenueTotal, details: getDetails(['revenue', 'other_revenue']) },
    cogs: { total: cogsTotal, details: getDetails(['cogs']) },
    grossProfit,
    grossProfitMargin: revenueTotal > 0 ? (grossProfit / revenueTotal) * 100 : 0,
    operatingExpenses: { total: opexTotal, details: getDetails(['operating_expense']) },
    operatingProfit,
    operatingProfitMargin: revenueTotal > 0 ? (operatingProfit / revenueTotal) * 100 : 0,
    otherExpenses: { total: otherExTotal, details: getDetails(['other_expense']) },
    netProfitBeforeTax,
    taxExpense: { total: taxTotal, details: getDetails(['tax_expense']) },
    netProfit,
    netProfitMargin: revenueTotal > 0 ? (netProfit / revenueTotal) * 100 : 0,
  }
}

/* ─── BALANCE SHEET ─── */

export type BSGroup = {
  total: number
  details: TrialBalanceRow[]
}

export type BalanceSheetReport = {
  period: { startDate: string | null; endDate: string | null }
  assets: {
    current: BSGroup
    fixed: BSGroup
    nonCurrent: BSGroup
    total: number
  }
  liabilities: {
    current: BSGroup
    nonCurrent: BSGroup
    total: number
  }
  equity: BSGroup
  totalLiabilitiesAndEquity: number
  balancing: number
}

export async function getBalanceSheet(
  fiscalPeriodId?: string,
  filters?: { startDate?: string; endDate?: string }
): Promise<BalanceSheetReport> {
  const { byType, startDate, endDate } = await getJournalBalances(fiscalPeriodId, filters)

  const group = (types: string[]): BSGroup => ({
    total: types.reduce((s, t) => s + (byType[t]?.net || 0), 0),
    details: types.flatMap(t => (byType[t]?.details || [])),
  })

  const currentAssets = group(['current_asset'])
  const fixedAssets = group(['fixed_asset'])
  const nonCurrentAssets = group(['non_current_asset'])
  const totalAssets = currentAssets.total + fixedAssets.total + nonCurrentAssets.total

  const currentLiab = group(['current_liability'])
  const nonCurrentLiab = group(['non_current_liability'])
  const totalLiabilities = currentLiab.total + nonCurrentLiab.total

  const equity = group(['equity'])
  const totalLiabilitiesAndEquity = totalLiabilities + equity.total

  return {
    period: { startDate, endDate },
    assets: {
      current: currentAssets,
      fixed: fixedAssets,
      nonCurrent: nonCurrentAssets,
      total: totalAssets,
    },
    liabilities: {
      current: currentLiab,
      nonCurrent: nonCurrentLiab,
      total: totalLiabilities,
    },
    equity,
    totalLiabilitiesAndEquity,
    balancing: totalAssets - totalLiabilitiesAndEquity,
  }
}
