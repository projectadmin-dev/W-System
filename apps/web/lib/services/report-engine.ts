/**
 * Report Engine — Core service for all Laporan Keuangan computations.
 *
 * Architecture:
 *  1. Resolve period bounds (start/end date + optional benchmark period)
 *  2. Fetch all posted journals in period, excluding those locked to prior periods
 *  3. Add opening balances from trial_balance_snapshots (prior closed period)
 *  4. Apply sign multiplier (normal_balance × contra_account flag)
 *  5. Build 5-layer COA tree with bottom-up aggregation
 *  6. Add computed subtotal rows (Laba Kotor, Laba Operasional, etc.)
 *  7. Return typed report data
 */

import { createAdminClient } from '../supabase-server'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type ReportType = 'IS' | 'BS' | 'CF' | 'EQ' | 'TB' | 'BB' | 'GL'

export type CfSection = 'OPERATING' | 'INVESTING' | 'FINANCING'

export interface CoaRecord {
  id: string
  account_code: string
  account_name: string
  account_type: string
  level: number
  normal_balance: 'debit' | 'credit'
  coa_layer: 'category' | 'type' | 'sub_account' | 'general_ledger' | 'detail_ledger' | null
  parent_account_id: string | null
  contra_account: boolean
  enum_laporan_keuangan: string | null
  enum_laporan_keuangan_category: string | null
  enum_cost_category: string | null
  enum_cf_section: string | null
  is_working_capital: boolean
  is_non_cash_item: boolean
  is_budgeted: boolean
  is_trial_balance: boolean
  sort_order: number
}

export interface ReportLine {
  id: string
  account_code: string
  account_name: string
  coa_layer: string | null
  level: number
  enum_laporan_keuangan_category: string | null
  enum_cf_section: string | null
  enum_cost_category: string | null
  is_non_cash_item: boolean
  is_working_capital: boolean
  is_computed: boolean         // true for subtotal rows like LABA KOTOR
  children: ReportLine[]
  // Amounts — signed (positive = normal direction)
  amount: number
  amount_base: number          // IDR base currency
  opening_balance: number      // saldo awal from prior period snapshot
  benchmark_amount: number     // comparison period amount
  budget_amount: number        // if budgeted
  variance: number             // amount - benchmark_amount
  variance_pct: number         // (variance / benchmark_amount) × 100
}

export interface PeriodBounds {
  id: string
  name: string
  start_date: string
  end_date: string
  approval_status: string
  fiscal_year: number
  period_number: number
}

export interface ReportParams {
  tenant_id: string
  period_id: string
  benchmark_period_id?: string
  cost_center_value_id?: string
  account_id?: string          // General Ledger: filter to a single COA account
  report_type: ReportType
}

// ── General Ledger (Buku Besar) ──────────────────────────────────────────────
export interface LedgerEntry {
  journal_entry_id: string
  date: string
  entry_number: string
  description: string
  debit: number
  credit: number
  balance: number              // running balance, signed (positive = normal direction)
}

export interface LedgerAccount {
  id: string
  account_code: string
  account_name: string
  normal_balance: 'debit' | 'credit'
  opening_balance: number
  closing_balance: number
  total_debit: number
  total_credit: number
  entries: LedgerEntry[]
}

export interface ReportResult {
  period: PeriodBounds
  benchmark_period?: PeriodBounds
  lines: ReportLine[]
  ledger?: LedgerAccount[]     // populated only for report_type === 'GL'
  summary: Record<string, number>
  generated_at: string
}

// ─────────────────────────────────────────────────────────────────────────────
// PERIOD RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

async function resolvePeriod(
  supabase: ReturnType<typeof createAdminClient>,
  period_id: string,
  tenant_id: string,
): Promise<PeriodBounds> {
  // NOTE: fiscal_periods stores `period_name`; there are no `name`,
  // `fiscal_year` or `period_number` columns. Select the real columns and
  // map them into PeriodBounds so the report API doesn't 500.
  const { data, error } = await supabase
    .from('fiscal_periods')
    .select('id, period_name, start_date, end_date, approval_status, status')
    .eq('id', period_id)
    .eq('tenant_id', tenant_id)
    .is('deleted_at', null)
    .single()

  if (error || !data) throw new Error(`Period not found: ${period_id}`)

  const row = data as Record<string, any>
  const start = row.start_date as string
  return {
    id: row.id,
    name: row.period_name ?? row.id,
    start_date: start,
    end_date: row.end_date,
    approval_status: row.approval_status ?? row.status ?? 'DRAFT',
    fiscal_year: start ? new Date(start).getFullYear() : 0,
    period_number: 0,
  } as PeriodBounds
}

// ─────────────────────────────────────────────────────────────────────────────
// COA FETCH
// ─────────────────────────────────────────────────────────────────────────────

async function fetchCoa(
  supabase: ReturnType<typeof createAdminClient>,
  tenant_id: string,
  lk_filter?: string,   // 'INCOME_STATEMENT' | 'BALANCE_SHEET' | null (null = all)
): Promise<CoaRecord[]> {
  let q = supabase
    .from('coa')
    .select(`
      id, account_code, account_name, account_type, level, normal_balance,
      coa_layer, parent_account_id, contra_account,
      enum_laporan_keuangan, enum_laporan_keuangan_category,
      enum_cost_category, enum_cf_section,
      is_working_capital, is_non_cash_item, is_budgeted, is_trial_balance,
      sort_order
    `)
    .eq('tenant_id', tenant_id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('account_code', { ascending: true })

  if (lk_filter) {
    q = q.eq('enum_laporan_keuangan', lk_filter)
  }

  const { data, error } = await q
  if (error) throw new Error(`Failed to fetch COA: ${error.message}`)
  return (data || []) as CoaRecord[]
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGN MULTIPLIER
// Applies normal_balance and contra_account to produce a signed amount.
// Positive = favourable direction for the account type.
// ─────────────────────────────────────────────────────────────────────────────

function applySignMultiplier(
  debit: number,
  credit: number,
  normal_balance: 'debit' | 'credit',
  contra_account: boolean,
): number {
  const raw = normal_balance === 'debit' ? debit - credit : credit - debit
  return contra_account ? -raw : raw
}

// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL LINES FETCH
// Excludes journals already locked to a prior period (prevents double-counting).
// Optionally filters by cost center value.
// ─────────────────────────────────────────────────────────────────────────────

interface RawLineBalance {
  coa_id: string
  debit: number
  credit: number
}

async function getJournalBalances(
  supabase: ReturnType<typeof createAdminClient>,
  tenant_id: string,
  period: PeriodBounds,
  cost_center_value_id?: string,
): Promise<Map<string, RawLineBalance>> {
  // Raw SQL via RPC is cleanest here — Supabase JS struggles with NOT EXISTS + CTEs.
  // We use a direct query through PostgREST with a filter trick:
  // Since PostgREST can't do NOT EXISTS natively, we do it in two steps:
  //   Step 1: get journal_ids locked to ANY prior approved period for this tenant
  //   Step 2: fetch lines for this period excluding those journal_ids

  // Step 1: locked journal IDs for prior periods (not the current period itself)
  const { data: locked, error: lockErr } = await supabase
    .from('fiscal_period_journal_locks')
    .select('journal_entry_id')
    .eq('tenant_id', tenant_id)
    .neq('fiscal_period_id', period.id)

  if (lockErr) throw new Error(`Failed to fetch locks: ${lockErr.message}`)
  const lockedIds = (locked || []).map((r: { journal_entry_id: string }) => r.journal_entry_id)

  // Step 2: fetch journal lines for this period
  // Filter: journals in this period's date range + posted status + exclude locked
  let q = supabase
    .from('journal_lines')
    .select(`
      coa_id,
      debit_amount,
      credit_amount,
      journal_entries!inner(
        id, status, tenant_id, transaction_date, kategori_jurnal, fiscal_period_id
      )
    `)
    .eq('journal_entries.tenant_id', tenant_id)
    .eq('journal_entries.status', 'posted')
    .gte('journal_entries.transaction_date', period.start_date)
    .lte('journal_entries.transaction_date', period.end_date)
    .neq('journal_entries.kategori_jurnal', 'BEGINNING_BALANCE')  // opening balances handled separately

  if (lockedIds.length > 0) {
    q = q.not('journal_entries.id', 'in', `(${lockedIds.join(',')})`)
  }

  // Cost center filter — join through journal_line_cost_centers if provided
  if (cost_center_value_id) {
    const { data: ccLines } = await supabase
      .from('journal_line_cost_centers')
      .select('journal_line_id')
      .eq('cost_center_value_id', cost_center_value_id)
      .eq('tenant_id', tenant_id)

    const ccLineIds = (ccLines || []).map((r: { journal_line_id: string }) => r.journal_line_id)
    if (ccLineIds.length === 0) return new Map()
    q = q.in('id', ccLineIds)
  }

  const { data, error } = await q
  if (error) throw new Error(`Failed to fetch journal lines: ${error.message}`)

  // Aggregate by coa_id
  const map = new Map<string, RawLineBalance>()
  for (const line of (data || [])) {
    const coaId = (line as any).coa_id
    const existing = map.get(coaId) ?? { coa_id: coaId, debit: 0, credit: 0 }
    existing.debit += Number((line as any).debit_amount || 0)
    existing.credit += Number((line as any).credit_amount || 0)
    map.set(coaId, existing)
  }
  return map
}

// ─────────────────────────────────────────────────────────────────────────────
// OPENING BALANCES
// Priority: trial_balance_snapshots from the prior APPROVED period.
// Fallback: BEGINNING_BALANCE kategori_jurnal entries within this period.
// ─────────────────────────────────────────────────────────────────────────────

async function getOpeningBalances(
  supabase: ReturnType<typeof createAdminClient>,
  tenant_id: string,
  period: PeriodBounds,
): Promise<Map<string, number>> {
  const map = new Map<string, number>()

  // Find prior approved period for this fiscal year (or previous year)
  const { data: priorPeriod } = await supabase
    .from('fiscal_periods')
    .select('id')
    .eq('tenant_id', tenant_id)
    .eq('approval_status', 'APPROVED')
    .lt('end_date', period.start_date)
    .is('deleted_at', null)
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (priorPeriod?.id) {
    const { data: snaps } = await supabase
      .from('trial_balance_snapshots')
      .select('coa_id, saldo_akhir')
      .eq('tenant_id', tenant_id)
      .eq('fiscal_period_id', priorPeriod.id)

    for (const snap of (snaps || [])) {
      map.set(snap.coa_id, Number(snap.saldo_akhir || 0))
    }
    return map
  }

  // Fallback: BEGINNING_BALANCE journals within the current period
  const { data: bbLines } = await supabase
    .from('journal_lines')
    .select(`
      coa_id, debit_amount, credit_amount,
      journal_entries!inner(status, tenant_id, kategori_jurnal, fiscal_period_id)
    `)
    .eq('journal_entries.tenant_id', tenant_id)
    .eq('journal_entries.fiscal_period_id', period.id)
    .eq('journal_entries.status', 'posted')
    .eq('journal_entries.kategori_jurnal', 'BEGINNING_BALANCE')

  for (const line of (bbLines || [])) {
    const coaId = (line as any).coa_id
    const cur = map.get(coaId) ?? 0
    // BEGINNING_BALANCE uses raw debit/credit — net is simply debit - credit
    map.set(coaId, cur + Number((line as any).debit_amount || 0) - Number((line as any).credit_amount || 0))
  }

  return map
}

// ─────────────────────────────────────────────────────────────────────────────
// TREE BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildCoaTree(
  accounts: CoaRecord[],
  balances: Map<string, RawLineBalance>,
  openingBalances: Map<string, number>,
  benchmarkBalances: Map<string, RawLineBalance>,
): Map<string, ReportLine> {
  const lineMap = new Map<string, ReportLine>()

  // First pass: create a ReportLine for every account
  for (const acct of accounts) {
    const bal = balances.get(acct.id)
    const bmark = benchmarkBalances.get(acct.id)
    // openingBalances are stored as raw (debit - credit). Normalize to the
    // same signed convention as `amount` (positive = normal direction) so the
    // two can be combined (e.g. ending balance = amount + opening) and so
    // credit-normal accounts (equity/liability) read correctly.
    const openingRaw = openingBalances.get(acct.id) ?? 0
    let opening = acct.normal_balance === 'debit' ? openingRaw : -openingRaw
    if (acct.contra_account) opening = -opening

    const amount = bal
      ? applySignMultiplier(bal.debit, bal.credit, acct.normal_balance, acct.contra_account)
      : 0
    const benchmark_amount = bmark
      ? applySignMultiplier(bmark.debit, bmark.credit, acct.normal_balance, acct.contra_account)
      : 0
    const variance = amount - benchmark_amount
    const variance_pct = benchmark_amount !== 0 ? (variance / Math.abs(benchmark_amount)) * 100 : 0

    lineMap.set(acct.id, {
      id: acct.id,
      account_code: acct.account_code,
      account_name: acct.account_name,
      coa_layer: acct.coa_layer,
      level: acct.level,
      enum_laporan_keuangan_category: acct.enum_laporan_keuangan_category,
      enum_cf_section: acct.enum_cf_section,
      enum_cost_category: acct.enum_cost_category,
      is_non_cash_item: acct.is_non_cash_item,
      is_working_capital: acct.is_working_capital,
      is_computed: false,
      children: [],
      amount,
      amount_base: amount,  // TODO: FX conversion if multi-currency
      opening_balance: opening,
      benchmark_amount,
      budget_amount: 0,     // Budget integration in future sprint
      variance,
      variance_pct,
    })
  }

  // Second pass: wire parent-child relationships + aggregate bottom-up
  // Process in reverse sort order (leaves first) so parents accumulate correctly
  const sorted = [...accounts].sort((a, b) => b.level - a.level || b.sort_order - a.sort_order)

  for (const acct of sorted) {
    if (!acct.parent_account_id) continue
    const child = lineMap.get(acct.id)
    const parent = lineMap.get(acct.parent_account_id)
    if (!child || !parent) continue

    parent.children.push(child)
    parent.amount += child.amount
    parent.benchmark_amount += child.benchmark_amount
    parent.opening_balance += child.opening_balance
  }

  // Re-sort children by sort_order
  for (const line of lineMap.values()) {
    line.children.sort((a, b) =>
      accounts.findIndex(x => x.id === a.id) - accounts.findIndex(x => x.id === b.id)
    )
    // Recompute variance at every level after aggregation
    line.variance = line.amount - line.benchmark_amount
    line.variance_pct =
      line.benchmark_amount !== 0 ? (line.variance / Math.abs(line.benchmark_amount)) * 100 : 0
  }

  return lineMap
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPUTED ROWS (subtotals)
// ─────────────────────────────────────────────────────────────────────────────

function makeComputedRow(
  id: string,
  account_name: string,
  amount: number,
  benchmark_amount: number,
): ReportLine {
  const variance = amount - benchmark_amount
  const variance_pct = benchmark_amount !== 0 ? (variance / Math.abs(benchmark_amount)) * 100 : 0
  return {
    id,
    account_code: '',
    account_name,
    coa_layer: null,
    level: 0,
    enum_laporan_keuangan_category: null,
    enum_cf_section: null,
    enum_cost_category: null,
    is_non_cash_item: false,
    is_working_capital: false,
    is_computed: true,
    children: [],
    amount,
    amount_base: amount,
    opening_balance: 0,
    benchmark_amount,
    budget_amount: 0,
    variance,
    variance_pct,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IS (INCOME STATEMENT) REPORT
// ─────────────────────────────────────────────────────────────────────────────

function buildIsReport(lineMap: Map<string, ReportLine>, accounts: CoaRecord[]): ReportLine[] {
  // Gather root-level IS categories (level=1)
  const isRoots = accounts
    .filter(a => a.level === 1 && a.enum_laporan_keuangan === 'INCOME_STATEMENT')
    .sort((a, b) => a.sort_order - b.sort_order)

  const getTotal = (category: string) => {
    const root = accounts.find(
      a => a.level === 1 && a.enum_laporan_keuangan_category === category
    )
    return root ? (lineMap.get(root.id)?.amount ?? 0) : 0
  }
  const getBmark = (category: string) => {
    const root = accounts.find(
      a => a.level === 1 && a.enum_laporan_keuangan_category === category
    )
    return root ? (lineMap.get(root.id)?.benchmark_amount ?? 0) : 0
  }

  const revenue = getTotal('REVENUE')
  const cogs = getTotal('COGS')
  const opex = getTotal('OPEX')
  const otherIncome = getTotal('OTHER_INCOME')
  const otherExpense = getTotal('OTHER_EXPENSE')
  const taxExpense = getTotal('TAX_EXPENSE')

  const revenueBm = getBmark('REVENUE')
  const cogsBm = getBmark('COGS')
  const opexBm = getBmark('OPEX')
  const otherIncomeBm = getBmark('OTHER_INCOME')
  const otherExpenseBm = getBmark('OTHER_EXPENSE')
  const taxBm = getBmark('TAX_EXPENSE')

  const grossProfit = revenue - cogs
  const operatingProfit = grossProfit - opex
  const ebitda = operatingProfit  // simplified; add back depreciation if needed
  const netBeforeTax = operatingProfit + otherIncome - otherExpense
  const netProfit = netBeforeTax - taxExpense

  const grossProfitBm = revenueBm - cogsBm
  const opProfitBm = grossProfitBm - opexBm
  const netBtBm = opProfitBm + otherIncomeBm - otherExpenseBm
  const netProfitBm = netBtBm - taxBm

  const lines: ReportLine[] = []

  for (const root of isRoots) {
    const line = lineMap.get(root.id)
    if (line) lines.push(line)

    // Insert computed subtotals after specific categories
    if (root.enum_laporan_keuangan_category === 'COGS') {
      lines.push(makeComputedRow('computed_gross_profit', 'LABA KOTOR', grossProfit, grossProfitBm))
    }
    if (root.enum_laporan_keuangan_category === 'OPEX') {
      lines.push(makeComputedRow('computed_operating_profit', 'LABA OPERASIONAL', operatingProfit, opProfitBm))
    }
    if (root.enum_laporan_keuangan_category === 'OTHER_EXPENSE') {
      lines.push(makeComputedRow('computed_net_before_tax', 'LABA SEBELUM PAJAK', netBeforeTax, netBtBm))
    }
    if (root.enum_laporan_keuangan_category === 'TAX_EXPENSE') {
      lines.push(makeComputedRow('computed_net_profit', 'LABA BERSIH', netProfit, netProfitBm))
    }
  }

  return lines
}

// ─────────────────────────────────────────────────────────────────────────────
// BS (BALANCE SHEET) REPORT
// ─────────────────────────────────────────────────────────────────────────────

interface CurrentEarnings {
  amount: number
  benchmark: number
}

// Recursively fold opening balance into the displayed amount so every node
// shows its ENDING balance (opening + period activity) — the correct figure
// for a balance sheet "as of" the period end.
function toEndingBalance(line: ReportLine): ReportLine {
  return {
    ...line,
    amount: line.amount + line.opening_balance,
    children: line.children.map(toEndingBalance),
  }
}

function buildBsReport(
  lineMap: Map<string, ReportLine>,
  accounts: CoaRecord[],
  currentEarnings: CurrentEarnings = { amount: 0, benchmark: 0 },
): ReportLine[] {
  const bsRoots = accounts
    .filter(a => a.level === 1 && a.enum_laporan_keuangan === 'BALANCE_SHEET')
    .sort((a, b) => a.sort_order - b.sort_order)

  const lines: ReportLine[] = []

  for (const root of bsRoots) {
    const line = lineMap.get(root.id)
    if (line) lines.push(toEndingBalance(line))
  }

  const sumCat = (cat: string, field: 'amount' | 'benchmark_amount') =>
    lines
      .filter(l => l.enum_laporan_keuangan_category === cat)
      .reduce((s, l) => s + (l[field] as number), 0)

  const totalAssets = sumCat('ASSET', 'amount')
  const totalAssetsBm = sumCat('ASSET', 'benchmark_amount')
  let totalLiab = sumCat('LIABILITY', 'amount')
  let totalEquity = sumCat('EQUITY', 'amount')
  const totalLiabBm = sumCat('LIABILITY', 'benchmark_amount')
  let totalEquityBm = sumCat('EQUITY', 'benchmark_amount')

  // Interim balance sheets must surface current-period profit/loss as part of
  // equity (it has not yet been closed to retained earnings). Without this the
  // sheet is out of balance by exactly the period's net profit.
  if (Math.abs(currentEarnings.amount) > 0.5 || Math.abs(currentEarnings.benchmark) > 0.5) {
    const earningsLine = makeComputedRow(
      'computed_current_earnings',
      'Laba (Rugi) Periode Berjalan',
      currentEarnings.amount,
      currentEarnings.benchmark,
    )
    earningsLine.enum_laporan_keuangan_category = 'EQUITY'
    const lastEquityIdx = lines
      .map(l => l.enum_laporan_keuangan_category)
      .lastIndexOf('EQUITY')
    if (lastEquityIdx >= 0) lines.splice(lastEquityIdx + 1, 0, earningsLine)
    else lines.push(earningsLine)
    totalEquity += currentEarnings.amount
    totalEquityBm += currentEarnings.benchmark
  }

  lines.push(makeComputedRow('computed_total_assets', 'TOTAL AKTIVA', totalAssets, totalAssetsBm))
  lines.push(makeComputedRow('computed_total_liab_equity', 'TOTAL KEWAJIBAN & EKUITAS', totalLiab + totalEquity, totalLiabBm + totalEquityBm))

  return lines
}

// ─────────────────────────────────────────────────────────────────────────────
// TB (TRIAL BALANCE) REPORT — flat, all accounts with debit/credit
// ─────────────────────────────────────────────────────────────────────────────

function buildTbReport(lineMap: Map<string, ReportLine>, accounts: CoaRecord[]): ReportLine[] {
  return accounts
    .filter(a => a.is_trial_balance || a.level >= 4)
    .map(a => lineMap.get(a.id))
    .filter(Boolean) as ReportLine[]
}

// ─────────────────────────────────────────────────────────────────────────────
// CF (CASH FLOW) REPORT — indirect method
// ─────────────────────────────────────────────────────────────────────────────

function buildCfReport(
  lineMap: Map<string, ReportLine>,
  accounts: CoaRecord[],
  isLines: ReportLine[],
): ReportLine[] {
  // Net profit is the computed_net_profit row from IS
  const netProfitRow = isLines.find(l => l.id === 'computed_net_profit')
  const netProfit = netProfitRow?.amount ?? 0
  const netProfitBm = netProfitRow?.benchmark_amount ?? 0

  const makeSection = (section: CfSection, label: string): ReportLine => {
    const sectionAccts = accounts.filter(a => a.enum_cf_section === section)
    const children: ReportLine[] = sectionAccts
      .map(a => lineMap.get(a.id))
      .filter(Boolean) as ReportLine[]
    const sectionTotal = children.reduce((s, c) => s + c.amount, 0)
    const sectionBm = children.reduce((s, c) => s + c.benchmark_amount, 0)
    const row = makeComputedRow(`cf_section_${section}`, label, sectionTotal, sectionBm)
    row.children = children
    return row
  }

  const operating = makeSection('OPERATING', 'Arus Kas dari Aktivitas Operasional')
  // Add net profit as first child of operating
  operating.children.unshift(makeComputedRow('cf_net_profit', 'Laba Bersih', netProfit, netProfitBm))
  operating.amount += netProfit
  operating.benchmark_amount += netProfitBm
  operating.variance = operating.amount - operating.benchmark_amount

  return [
    operating,
    makeSection('INVESTING', 'Arus Kas dari Aktivitas Investasi'),
    makeSection('FINANCING', 'Arus Kas dari Aktivitas Pendanaan'),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// BB (BEGINNING BALANCE / NERACA SALDO AWAL) — show opening balances only
// ─────────────────────────────────────────────────────────────────────────────

function buildBbReport(lineMap: Map<string, ReportLine>, accounts: CoaRecord[]): ReportLine[] {
  return accounts
    .filter(a => a.is_trial_balance || a.level >= 4)
    .map(a => {
      const line = lineMap.get(a.id)
      if (!line) return null
      return { ...line, amount: line.opening_balance } as ReportLine
    })
    .filter(Boolean) as ReportLine[]
}

// ─────────────────────────────────────────────────────────────────────────────
// GL (GENERAL LEDGER / BUKU BESAR) — per-account transactions + running balance
// ─────────────────────────────────────────────────────────────────────────────

async function buildGeneralLedger(
  supabase: ReturnType<typeof createAdminClient>,
  tenant_id: string,
  period: PeriodBounds,
  openingBalances: Map<string, number>,
  account_id?: string,
): Promise<LedgerAccount[]> {
  // Exclude journals locked to prior periods (same rule as getJournalBalances)
  const { data: locked } = await supabase
    .from('fiscal_period_journal_locks')
    .select('journal_entry_id')
    .eq('tenant_id', tenant_id)
    .neq('fiscal_period_id', period.id)
  const lockedIds = (locked || []).map((r: { journal_entry_id: string }) => r.journal_entry_id)

  let q = supabase
    .from('journal_lines')
    .select(`
      coa_id, debit_amount, credit_amount,
      journal_entries!inner(id, status, tenant_id, transaction_date, entry_number, description, kategori_jurnal),
      coa!inner(account_code, account_name, normal_balance, contra_account)
    `)
    .eq('journal_entries.tenant_id', tenant_id)
    .eq('journal_entries.status', 'posted')
    .gte('journal_entries.transaction_date', period.start_date)
    .lte('journal_entries.transaction_date', period.end_date)
    .neq('journal_entries.kategori_jurnal', 'BEGINNING_BALANCE')

  if (account_id) q = q.eq('coa_id', account_id)
  if (lockedIds.length > 0) q = q.not('journal_entries.id', 'in', `(${lockedIds.join(',')})`)

  const { data, error } = await q
  if (error) throw new Error(`Failed to fetch general ledger: ${error.message}`)

  // Group rows by account
  const byAccount = new Map<string, LedgerAccount>()
  for (const row of (data || [])) {
    const r = row as any
    const je = r.journal_entries
    const coa = r.coa
    if (!je || !coa) continue

    let acct = byAccount.get(r.coa_id)
    if (!acct) {
      // Normalize opening balance to signed (positive = normal direction)
      const openRaw = openingBalances.get(r.coa_id) ?? 0
      let opening = coa.normal_balance === 'debit' ? openRaw : -openRaw
      if (coa.contra_account) opening = -opening
      acct = {
        id: r.coa_id,
        account_code: coa.account_code,
        account_name: coa.account_name,
        normal_balance: coa.normal_balance,
        opening_balance: opening,
        closing_balance: opening,
        total_debit: 0,
        total_credit: 0,
        entries: [],
      }
      byAccount.set(r.coa_id, acct)
    }

    const debit = Number(r.debit_amount || 0)
    const credit = Number(r.credit_amount || 0)
    acct.total_debit += debit
    acct.total_credit += credit
    acct.entries.push({
      journal_entry_id: je.id,
      date: je.transaction_date,
      entry_number: je.entry_number ?? '',
      description: je.description ?? '',
      debit,
      credit,
      balance: 0, // computed after sort
    })
  }

  // Per account: order by date then entry number, compute running balance
  const accounts = [...byAccount.values()]
  for (const acct of accounts) {
    acct.entries.sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 :
      a.entry_number < b.entry_number ? -1 : a.entry_number > b.entry_number ? 1 : 0
    )
    let running = acct.opening_balance
    for (const e of acct.entries) {
      const delta = acct.normal_balance === 'debit' ? e.debit - e.credit : e.credit - e.debit
      running += delta
      e.balance = running
    }
    acct.closing_balance = running
  }

  accounts.sort((a, b) =>
    a.account_code < b.account_code ? -1 : a.account_code > b.account_code ? 1 : 0
  )
  return accounts
}

// ─────────────────────────────────────────────────────────────────────────────
// CURRENT-PERIOD EARNINGS (net profit) — needed to balance the balance sheet
// ─────────────────────────────────────────────────────────────────────────────

async function computeCurrentEarnings(
  supabase: ReturnType<typeof createAdminClient>,
  tenant_id: string,
  balances: Map<string, RawLineBalance>,
  openingBalances: Map<string, number>,
  benchmarkBalances: Map<string, RawLineBalance>,
): Promise<CurrentEarnings> {
  const allAccounts = await fetchCoa(supabase, tenant_id)
  const allMap = buildCoaTree(allAccounts, balances, openingBalances, benchmarkBalances)
  const isAccts = allAccounts.filter(a => a.enum_laporan_keuangan === 'INCOME_STATEMENT')
  const isLines = buildIsReport(allMap, isAccts)
  const np = isLines.find(l => l.id === 'computed_net_profit')
  return { amount: np?.amount ?? 0, benchmark: np?.benchmark_amount ?? 0 }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ORCHESTRATOR
// ─────────────────────────────────────────────────────────────────────────────

export async function buildReport(params: ReportParams): Promise<ReportResult> {
  const supabase = createAdminClient()
  const { tenant_id, period_id, benchmark_period_id, cost_center_value_id, account_id, report_type } = params

  const [period, benchmarkPeriod] = await Promise.all([
    resolvePeriod(supabase, period_id, tenant_id),
    benchmark_period_id ? resolvePeriod(supabase, benchmark_period_id, tenant_id) : Promise.resolve(undefined),
  ])

  // Determine COA scope
  const lk_filter =
    report_type === 'IS' ? 'INCOME_STATEMENT' :
    report_type === 'BS' ? 'BALANCE_SHEET' :
    report_type === 'EQ' ? 'BALANCE_SHEET' :
    null  // TB, CF, BB need all accounts

  const [accounts, balances, openingBalances, benchmarkBalances] = await Promise.all([
    fetchCoa(supabase, tenant_id, lk_filter ?? undefined),
    getJournalBalances(supabase, tenant_id, period, cost_center_value_id),
    getOpeningBalances(supabase, tenant_id, period),
    benchmarkPeriod
      ? getJournalBalances(supabase, tenant_id, benchmarkPeriod, cost_center_value_id)
      : Promise.resolve(new Map<string, RawLineBalance>()),
  ])

  const lineMap = buildCoaTree(accounts, balances, openingBalances, benchmarkBalances)

  let lines: ReportLine[]
  let ledger: LedgerAccount[] | undefined
  const summary: Record<string, number> = {}

  if (report_type === 'IS') {
    lines = buildIsReport(lineMap, accounts)
    const findComputed = (id: string) => lines.find(l => l.id === id)?.amount ?? 0
    summary.revenue = findComputed('computed_gross_profit')  // gross profit row appears after COGS
    summary.gross_profit = findComputed('computed_gross_profit')
    summary.operating_profit = findComputed('computed_operating_profit')
    summary.net_before_tax = findComputed('computed_net_before_tax')
    summary.net_profit = findComputed('computed_net_profit')
  } else if (report_type === 'BS') {
    const earnings = await computeCurrentEarnings(supabase, tenant_id, balances, openingBalances, benchmarkBalances)
    lines = buildBsReport(lineMap, accounts, earnings)
    summary.total_assets = lines.find(l => l.id === 'computed_total_assets')?.amount ?? 0
    summary.total_liab_equity = lines.find(l => l.id === 'computed_total_liab_equity')?.amount ?? 0
    summary.balance_check = summary.total_assets - summary.total_liab_equity
  } else if (report_type === 'CF') {
    const allAccounts = await fetchCoa(supabase, tenant_id, undefined)
    const allBalances = await getJournalBalances(supabase, tenant_id, period, cost_center_value_id)
    const allBm = benchmarkPeriod
      ? await getJournalBalances(supabase, tenant_id, benchmarkPeriod, cost_center_value_id)
      : new Map<string, RawLineBalance>()
    const allMap = buildCoaTree(allAccounts, allBalances, openingBalances, allBm)
    const isAccounts = allAccounts.filter(a => a.enum_laporan_keuangan === 'INCOME_STATEMENT')
    const isLines = buildIsReport(allMap, isAccounts)
    lines = buildCfReport(allMap, allAccounts, isLines)
    summary.operating = lines[0]?.amount ?? 0
    summary.investing = lines[1]?.amount ?? 0
    summary.financing = lines[2]?.amount ?? 0
    summary.net_change = summary.operating + summary.investing + summary.financing
  } else if (report_type === 'TB') {
    lines = buildTbReport(lineMap, accounts)
    summary.total_debit = lines.reduce((s, l) => s + Math.max(0, l.amount), 0)
    summary.total_credit = lines.reduce((s, l) => s + Math.max(0, -l.amount), 0)
  } else if (report_type === 'BB') {
    lines = buildBbReport(lineMap, accounts)
  } else if (report_type === 'GL') {
    lines = []
    ledger = await buildGeneralLedger(supabase, tenant_id, period, openingBalances, account_id)
    summary.gl_accounts = ledger.length
    summary.gl_entries = ledger.reduce((s, a) => s + a.entries.length, 0)
    summary.gl_total_debit = ledger.reduce((s, a) => s + a.total_debit, 0)
    summary.gl_total_credit = ledger.reduce((s, a) => s + a.total_credit, 0)
  } else {
    // EQ — Equity changes: show Ekuitas section of BS (incl. current earnings)
    const earnings = await computeCurrentEarnings(supabase, tenant_id, balances, openingBalances, benchmarkBalances)
    lines = buildBsReport(lineMap, accounts, earnings).filter(
      l => l.enum_laporan_keuangan_category === 'EQUITY' || l.id === 'computed_total_liab_equity'
    )
  }

  return {
    period,
    benchmark_period: benchmarkPeriod,
    lines: lines ?? [],
    ledger,
    summary,
    generated_at: new Date().toISOString(),
  }
}
