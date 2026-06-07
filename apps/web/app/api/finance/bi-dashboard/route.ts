import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

/* ─────────────────────────── helpers ─────────────────────────── */
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const ym = (d: string) => d.slice(0, 7)

function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y!, (m! - 1) + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthList(from: string, to: string): string[] {
  if (from > to) [from, to] = [to, from]
  const out: string[] = []
  let cur = from
  // guard against runaway loops
  for (let i = 0; i < 240 && cur <= to; i++) {
    out.push(cur)
    cur = addMonths(cur, 1)
  }
  return out
}

function shortLabel(key: string, anchorYear: number): string {
  const [y, m] = key.split('-').map(Number)
  const s = MONTH_SHORT[m! - 1]!
  return y === anchorYear ? s : `${s} '${String(y).slice(2)}`
}

function longLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTH_LONG[m! - 1]} ${y}`
}

const isCashCode = (code: string | null | undefined) =>
  !!code && (code.startsWith('1-10001') || code.startsWith('1-10002'))

type Preset = 'month' | 'quarter' | 'ytd' | 'custom'
type Bench = 'previous' | 'last_year' | 'custom' | 'off'

function resolveCurrent(preset: Preset, anchor: string, from?: string, to?: string): string[] {
  const anchorYear = Number(anchor.slice(0, 4))
  switch (preset) {
    case 'month': return [anchor]
    case 'quarter': return monthList(addMonths(anchor, -2), anchor)
    case 'ytd': return monthList(`${anchorYear}-01`, anchor)
    case 'custom': return from && to ? monthList(from, to) : monthList(`${anchorYear}-01`, anchor)
  }
}

function resolveBench(mode: Bench, cw: string[], from?: string, to?: string): string[] | null {
  if (mode === 'off' || cw.length === 0) return null
  if (mode === 'custom') return from && to ? monthList(from, to) : null
  if (mode === 'previous') {
    const end = addMonths(cw[0]!, -1)
    const start = addMonths(end, -(cw.length - 1))
    return monthList(start, end)
  }
  // last_year
  return cw.map((m) => addMonths(m, -12))
}

/* ─────────────────────────── route ─────────────────────────── */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const sp = request.nextUrl.searchParams

    const preset = (sp.get('period') as Preset) || 'ytd'
    const benchMode = (sp.get('benchmark') as Bench) || 'previous'
    const cFrom = sp.get('from') || undefined
    const cTo = sp.get('to') || undefined
    const bFrom = sp.get('bfrom') || undefined
    const bTo = sp.get('bto') || undefined

    const now = new Date()
    const anchor = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const anchorYear = now.getFullYear()
    const todayStr = now.toISOString().split('T')[0]!

    const current = resolveCurrent(preset, anchor, cFrom, cTo)
    const bench = resolveBench(benchMode, current, bFrom, bTo)

    /* ── 1. posted journal entries (id -> date) ── */
    const { data: entries, error: eErr } = await supabase
      .from('journal_entries')
      .select('id, transaction_date, status')
      .eq('status', 'posted')
      .is('deleted_at', null)
    if (eErr) throw eErr
    const entryDate = new Map<string, string>()
    for (const e of entries || []) if (e.transaction_date) entryDate.set(e.id, e.transaction_date)
    const entryIds = Array.from(entryDate.keys())

    /* ── 2. journal lines for those entries ── */
    let lines: any[] = []
    if (entryIds.length) {
      const { data: jl, error: jErr } = await supabase
        .from('journal_lines')
        .select('journal_entry_id, coa_id, debit_amount_base, credit_amount_base')
        .is('deleted_at', null)
        .in('journal_entry_id', entryIds)
      if (jErr) throw jErr
      lines = jl || []
    }

    /* ── 3. COA lookup ── */
    const { data: coa, error: cErr } = await supabase
      .from('coa')
      .select('id, account_code, account_name, account_type')
      .is('deleted_at', null)
    if (cErr) throw cErr
    const coaMap = new Map<string, { code: string; name: string; type: string }>()
    for (const c of coa || []) coaMap.set(c.id, { code: c.account_code, name: c.account_name, type: c.account_type })

    /* ── aggregate journal lines ── */
    const cashByMonth = new Map<string, { inflow: number; outflow: number }>()
    const revByAcc = new Map<string, Map<string, number>>() // account -> month -> net credit
    const expByAcc = new Map<string, Map<string, number>>() // account -> month -> net debit

    const bump = (map: Map<string, Map<string, number>>, acc: string, month: string, val: number) => {
      if (!map.has(acc)) map.set(acc, new Map())
      const m = map.get(acc)!
      m.set(month, (m.get(month) || 0) + val)
    }

    for (const l of lines) {
      const date = entryDate.get(l.journal_entry_id)
      const c = coaMap.get(l.coa_id)
      if (!date || !c) continue
      const month = ym(date)
      const dr = Number(l.debit_amount_base || 0)
      const cr = Number(l.credit_amount_base || 0)

      if (isCashCode(c.code)) {
        const cur = cashByMonth.get(month) || { inflow: 0, outflow: 0 }
        cur.inflow += dr // money received into cash/bank = debit
        cur.outflow += cr // money paid out = credit
        cashByMonth.set(month, cur)
      }
      if (c.type === 'revenue') bump(revByAcc, c.name, month, cr - dr)
      else if (c.type === 'expense') bump(expByAcc, c.name, month, dr - cr)
    }

    /* ── running cash balance ── */
    const sortedCashMonths = Array.from(cashByMonth.keys()).sort()
    const balanceAt = (month: string) => {
      let cum = 0
      for (const m of sortedCashMonths) {
        if (m <= month) { const x = cashByMonth.get(m)!; cum += x.inflow - x.outflow }
      }
      return cum
    }

    const sumWindow = (months: string[], pick: (v: { inflow: number; outflow: number }) => number) =>
      months.reduce((s, m) => s + (cashByMonth.has(m) ? pick(cashByMonth.get(m)!) : 0), 0)

    const windowAgg = (months: string[]) => {
      const inflow = sumWindow(months, (v) => v.inflow)
      const outflow = sumWindow(months, (v) => v.outflow)
      const last = months[months.length - 1]!
      return { inflow, outflow, net: inflow - outflow, endingBalance: balanceAt(last) }
    }

    const cur = windowAgg(current)
    const ben = bench ? windowAgg(bench) : null

    /* ── cashflow chart rows (current window + benchmark overlay by index) ── */
    const cashflow = current.map((m, i) => {
      const cm = cashByMonth.get(m) || { inflow: 0, outflow: 0 }
      const bm = bench?.[i]
      return {
        label: shortLabel(m, anchorYear),
        inflow: cm.inflow,
        outflow: cm.outflow,
        balance: balanceAt(m),
        benchBalance: bm ? balanceAt(bm) : undefined,
      }
    })

    /* ── revenue streams (current window) ── */
    const sumAccWindow = (map: Map<string, Map<string, number>>, acc: string, months: string[]) => {
      const m = map.get(acc); if (!m) return 0
      return months.reduce((s, k) => s + (m.get(k) || 0), 0)
    }
    const revAccounts = Array.from(revByAcc.keys())
    const streamTotals = revAccounts
      .map((acc) => ({ stream: acc, amount: sumAccWindow(revByAcc, acc, current) }))
      .filter((r) => r.amount > 0)
      .sort((a, b) => b.amount - a.amount)
    const totalRevenue = streamTotals.reduce((s, r) => s + r.amount, 0)
    const inflowStreams = streamTotals.map((r) => ({
      ...r,
      percentage: totalRevenue ? (r.amount / totalRevenue) * 100 : 0,
    }))

    /* ── expense categories (current window) + trend ── */
    const trendOf = (acc: string): 'up' | 'down' | 'same' => {
      const m = expByAcc.get(acc); if (!m || current.length < 2) return 'same'
      const half = Math.floor(current.length / 2)
      const first = current.slice(0, half).reduce((s, k) => s + (m.get(k) || 0), 0)
      const second = current.slice(half).reduce((s, k) => s + (m.get(k) || 0), 0)
      if (second > first * 1.05) return 'up'
      if (second < first * 0.95) return 'down'
      return 'same'
    }
    const outflowCategories = Array.from(expByAcc.keys())
      .map((acc) => ({ category: acc, amount: sumAccWindow(expByAcc, acc, current), trend: trendOf(acc) }))
      .filter((r) => r.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 15)

    /* ── sales achievement (revenue by month) ── */
    const salesMonths = current.map((m) => ({
      key: m,
      short: shortLabel(m, anchorYear),
      amount: revAccounts.reduce((s, acc) => s + (revByAcc.get(acc)!.get(m) || 0), 0),
    }))

    /* ── heatmap: revenue stream × month ── */
    const heatMonths = current.map((m) => shortLabel(m, anchorYear))
    const heatRows = streamTotals.slice(0, 12).map((r) => {
      const values: Record<string, number> = {}
      current.forEach((m) => { values[shortLabel(m, anchorYear)] = revByAcc.get(r.stream)?.get(m) || 0 })
      return { category: r.stream, values }
    })

    /* ── AR aging (snapshot as of today) ── */
    const { data: arRows, error: arErr } = await supabase
      .from('ar_invoices')
      .select('client_name, project_name, no_invoice, tgl_invoice, deadline_bayar, sisa_piutang, is_archived')
      .is('deleted_at', null)
      .gt('sisa_piutang', 0)
    if (arErr) throw arErr
    const arBuckets = { total: 0, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_180: 0, over180: 0 }
    const arList = (arRows || [])
      .filter((r) => !r.is_archived)
      .map((r) => {
        const due = r.deadline_bayar ? new Date(r.deadline_bayar) : new Date(todayStr)
        const age = Math.floor((new Date(todayStr).getTime() - due.getTime()) / 86400000)
        const nominal = Number(r.sisa_piutang || 0)
        arBuckets.total += nominal
        if (age <= 0) arBuckets.current += nominal
        else if (age <= 30) arBuckets.d1_30 += nominal
        else if (age <= 60) arBuckets.d31_60 += nominal
        else if (age <= 90) arBuckets.d61_90 += nominal
        else if (age <= 180) arBuckets.d91_180 += nominal
        else arBuckets.over180 += nominal
        return {
          company: r.client_name || 'Unknown',
          project: r.project_name || r.no_invoice || '—',
          invoice_date: r.tgl_invoice,
          age,
          nominal,
        }
      })
      .sort((a, b) => b.nominal - a.nominal)

    /* ── AP aging (snapshot as of today) ── */
    const { data: apRows, error: apErr } = await supabase
      .from('ap_invoices')
      .select('pihak_ketiga, no_invoice, ap_number, tgl_terima, tgl_jatuh_tempo, amount_due, status')
      .is('deleted_at', null)
      .gt('amount_due', 0)
    if (apErr) throw apErr
    const apBuckets = { total: 0, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, over90: 0 }
    const apList = (apRows || [])
      .filter((r) => !['DRAFT', 'REJECTED', 'CANCELLED'].includes((r.status || '').toUpperCase()))
      .map((r) => {
        const due = r.tgl_jatuh_tempo ? new Date(r.tgl_jatuh_tempo) : new Date(todayStr)
        const age = Math.floor((new Date(todayStr).getTime() - due.getTime()) / 86400000)
        const outstanding = Number(r.amount_due || 0)
        apBuckets.total += outstanding
        if (age <= 0) apBuckets.current += outstanding
        else if (age <= 30) apBuckets.d1_30 += outstanding
        else if (age <= 60) apBuckets.d31_60 += outstanding
        else if (age <= 90) apBuckets.d61_90 += outstanding
        else apBuckets.over90 += outstanding
        return {
          vendor: r.pihak_ketiga || 'Unknown',
          bill: r.no_invoice || r.ap_number || '—',
          bill_date: r.tgl_terima,
          due_date: r.tgl_jatuh_tempo,
          age,
          outstanding,
        }
      })
      .sort((a, b) => b.outstanding - a.outstanding)

    /* ── response ── */
    return NextResponse.json({
      data: {
        meta: {
          asOf: todayStr,
          current: { months: current, from: longLabel(current[0]!), to: longLabel(current[current.length - 1]!) },
          benchmark: bench ? { months: bench, from: longLabel(bench[0]!), to: longLabel(bench[bench.length - 1]!) } : null,
        },
        kpis: { ...cur, bench: ben },
        cashflow,
        inflowStreams,
        outflowCategories,
        sales: { total: totalRevenue, months: salesMonths },
        heatmap: { months: heatMonths, rows: heatRows },
        arAging: { buckets: arBuckets, rows: arList },
        apAging: { buckets: apBuckets, rows: apList },
      },
    })
  } catch (err: any) {
    console.error('BI Dashboard API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
