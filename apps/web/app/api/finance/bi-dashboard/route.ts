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

const pad2 = (n: number) => String(n).padStart(2, '0')

/** last calendar day of a window (last month, end-of-month), capped at today */
function asOfDate(months: string[], today: string): string {
  if (!months.length) return today
  const [y, m] = months[months.length - 1]!.split('-').map(Number)
  const eomDay = new Date(y!, m!, 0).getDate() // m is 1-based -> day 0 of next = last day of m
  const eom = `${y}-${pad2(m!)}-${pad2(eomDay)}`
  return eom < today ? eom : today
}

/** business-line category derived from a revenue account name ("Project Based - X" -> "Project Based") */
function businessLine(name: string): string {
  const i = name.indexOf(' - ')
  return i > 0 ? name.slice(0, i).trim() : name
}

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

    /* ── heatmap: revenue by business-line category × month (with stream drill-down) ──
       NOTE: commercial_projects.project_type is not used here because its linkage
       columns (project_id / invoice_id) are unpopulated and journal_lines.project_id
       is empty, so GL revenue cannot yet be attributed to a project type. We instead
       derive a category from the revenue account naming convention. */
    const heatMonths = current.map((m) => shortLabel(m, anchorYear))
    const catMap = new Map<string, {
      values: Record<string, number>
      streams: Map<string, Record<string, number>>
      total: number
    }>()
    for (const acc of revAccounts) {
      const accMonthly = revByAcc.get(acc)!
      const accTotal = current.reduce((s, m) => s + (accMonthly.get(m) || 0), 0)
      if (accTotal <= 0) continue
      const cat = businessLine(acc)
      if (!catMap.has(cat)) catMap.set(cat, { values: {}, streams: new Map(), total: 0 })
      const entry = catMap.get(cat)!
      const streamVals: Record<string, number> = {}
      for (const m of current) {
        const lbl = shortLabel(m, anchorYear)
        const v = accMonthly.get(m) || 0
        entry.values[lbl] = (entry.values[lbl] || 0) + v
        streamVals[lbl] = v
      }
      entry.total += accTotal
      entry.streams.set(acc, streamVals)
    }
    const heatRows = Array.from(catMap.entries())
      .filter(([, e]) => e.total > 0)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([category, e]) => ({
        category,
        values: e.values,
        streams: Array.from(e.streams.entries()).map(([stream, values]) => ({ stream, values })),
      }))

    /* ── AR / AP aging reconstructed AS-OF a date (follows the selected period) ──
       Outstanding at date D = invoice face − payments recorded up to D, for invoices
       issued on/before D. Age is measured from D, so historical periods show the
       aging picture as it stood at that period's close. */
    const asOfCur = asOfDate(current, todayStr)
    const asOfBen = bench ? asOfDate(bench, todayStr) : null
    const daysDiff = (a: string, b: string) =>
      Math.floor((new Date(a).getTime() - new Date(b).getTime()) / 86400000)
    const paidUpTo = (pays: { date: string; amt: number }[] | undefined, asOf: string) =>
      (pays || []).reduce((s, p) => (p.date <= asOf ? s + p.amt : s), 0)

    /* AR source + payments */
    const { data: arRows, error: arErr } = await supabase
      .from('ar_invoices')
      .select('id, client_name, project_name, no_invoice, tgl_invoice, deadline_bayar, total_piutang, is_archived')
      .is('deleted_at', null)
    if (arErr) throw arErr
    const { data: arPays, error: arpErr } = await supabase
      .from('ar_payment_history')
      .select('invoice_id, bayar_sekarang, created_at')
    if (arpErr) throw arpErr
    const arPayByInv = new Map<string, { date: string; amt: number }[]>()
    for (const p of arPays || []) {
      const arr = arPayByInv.get(p.invoice_id) || []
      arr.push({ date: (p.created_at || '').slice(0, 10), amt: Number(p.bayar_sekarang || 0) })
      arPayByInv.set(p.invoice_id, arr)
    }

    const computeAR = (asOf: string) => {
      const b = { total: 0, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_180: 0, over180: 0 }
      const rows: any[] = []
      for (const r of arRows || []) {
        if (r.is_archived) continue
        if (r.tgl_invoice && r.tgl_invoice > asOf) continue
        const outstanding = Number(r.total_piutang || 0) - paidUpTo(arPayByInv.get(r.id), asOf)
        if (outstanding <= 0.5) continue
        const age = r.deadline_bayar ? daysDiff(asOf, r.deadline_bayar) : 0
        b.total += outstanding
        if (age <= 0) b.current += outstanding
        else if (age <= 30) b.d1_30 += outstanding
        else if (age <= 60) b.d31_60 += outstanding
        else if (age <= 90) b.d61_90 += outstanding
        else if (age <= 180) b.d91_180 += outstanding
        else b.over180 += outstanding
        rows.push({
          company: r.client_name || 'Unknown',
          project: r.project_name || r.no_invoice || '—',
          invoice_date: r.tgl_invoice,
          age,
          nominal: outstanding,
        })
      }
      rows.sort((a, b2) => b2.nominal - a.nominal)
      return { buckets: b, rows }
    }

    /* AP source + payments */
    const { data: apRows, error: apErr } = await supabase
      .from('ap_invoices')
      .select('id, pihak_ketiga, no_invoice, ap_number, tgl_terima, tgl_jatuh_tempo, grand_total, status')
      .is('deleted_at', null)
    if (apErr) throw apErr
    const { data: apPays, error: appErr } = await supabase
      .from('ap_payment_history')
      .select('ap_invoice_id, bayar_sekarang, created_at')
    if (appErr) throw appErr
    const apPayByInv = new Map<string, { date: string; amt: number }[]>()
    for (const p of apPays || []) {
      const arr = apPayByInv.get(p.ap_invoice_id) || []
      arr.push({ date: (p.created_at || '').slice(0, 10), amt: Number(p.bayar_sekarang || 0) })
      apPayByInv.set(p.ap_invoice_id, arr)
    }

    const computeAP = (asOf: string) => {
      const b = { total: 0, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, over90: 0 }
      const rows: any[] = []
      for (const r of apRows || []) {
        if (['DRAFT', 'REJECTED', 'CANCELLED'].includes((r.status || '').toUpperCase())) continue
        if (r.tgl_terima && r.tgl_terima > asOf) continue
        const outstanding = Number(r.grand_total || 0) - paidUpTo(apPayByInv.get(r.id), asOf)
        if (outstanding <= 0.5) continue
        const age = r.tgl_jatuh_tempo ? daysDiff(asOf, r.tgl_jatuh_tempo) : 0
        b.total += outstanding
        if (age <= 0) b.current += outstanding
        else if (age <= 30) b.d1_30 += outstanding
        else if (age <= 60) b.d31_60 += outstanding
        else if (age <= 90) b.d61_90 += outstanding
        else b.over90 += outstanding
        rows.push({
          vendor: r.pihak_ketiga || 'Unknown',
          bill: r.no_invoice || r.ap_number || '—',
          bill_date: r.tgl_terima,
          due_date: r.tgl_jatuh_tempo,
          age,
          outstanding,
        })
      }
      rows.sort((a, b2) => b2.outstanding - a.outstanding)
      return { buckets: b, rows }
    }

    const arCur = computeAR(asOfCur)
    const apCur = computeAP(asOfCur)
    const arBen = asOfBen ? computeAR(asOfBen) : null
    const apBen = asOfBen ? computeAP(asOfBen) : null

    /* ── response ── */
    return NextResponse.json({
      data: {
        meta: {
          asOf: asOfCur,
          benchAsOf: asOfBen,
          current: { months: current, from: longLabel(current[0]!), to: longLabel(current[current.length - 1]!) },
          benchmark: bench ? { months: bench, from: longLabel(bench[0]!), to: longLabel(bench[bench.length - 1]!) } : null,
        },
        kpis: { ...cur, bench: ben },
        cashflow,
        inflowStreams,
        outflowCategories,
        sales: { total: totalRevenue, months: salesMonths },
        heatmap: { months: heatMonths, rows: heatRows },
        arAging: { buckets: arCur.buckets, rows: arCur.rows, asOf: asOfCur, bench: arBen?.buckets ?? null, benchAsOf: asOfBen },
        apAging: { buckets: apCur.buckets, rows: apCur.rows, asOf: asOfCur, bench: apBen?.buckets ?? null, benchAsOf: asOfBen },
      },
    })
  } catch (err: any) {
    console.error('BI Dashboard API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
