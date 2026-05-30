// ============================================================================
// Account Payable — pure business logic (single source of truth)
//
// These functions are framework-agnostic and side-effect free so they can be
// unit-tested directly (node:test) AND reused by the API route handlers.
// Keeping the math here guarantees the dashboard, the create endpoint and the
// approval/payment endpoints all agree on the same rules.
// ============================================================================

export type APStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED'

export interface APItemInput {
  qty?: number | string
  harga?: number | string
  diskon?: number | string
  pajak?: number | string
  coa_id?: string | null
}

export interface APRow {
  status: APStatus
  tgl_jatuh_tempo: string
  amount_due: number | string
  amount_paid?: number | string
  grand_total?: number | string
}

const n = (v: unknown): number => {
  const x = Number(v ?? 0)
  return Number.isFinite(x) ? x : 0
}

// ── Date helpers ────────────────────────────────────────────────────────────
export function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
export function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}
export function ymd(d: Date): string {
  return d.toISOString().split('T')[0] as string
}
export function dlabel(d: Date): string {
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })
}

// ── Reference number (AP-YYYY-MM-NNNN) ──────────────────────────────────────
export function apNumberPrefix(now: Date = new Date()): string {
  return `AP-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`
}
export function formatApNumber(now: Date, existingCountForMonth: number): string {
  return `${apNumberPrefix(now)}${String(existingCountForMonth + 1).padStart(4, '0')}`
}

// ── Duplicate detection (US-001 AC#1) ───────────────────────────────────────
// Identity = tenant + vendor (pihak_ketiga) + nomor invoice + tanggal terima.
export function duplicateKey(pihak_ketiga: string, no_invoice: string, tgl_terima: string): string {
  return `${(pihak_ketiga ?? '').trim()}|${(no_invoice ?? '').trim()}|${tgl_terima}`
}

// ── Money totals (US-001) ───────────────────────────────────────────────────
export interface APTotals {
  subtotal: number
  discount_amount: number
  tax_amount: number
  grand_total: number
}
export function computeTotals(
  items: APItemInput[],
  headerDiscount: number | string = 0,
  headerTax: number | string = 0
): APTotals {
  const subtotal = items.reduce((s, it) => s + n(it.qty) * n(it.harga), 0)
  const itemDiskon = items.reduce((s, it) => s + n(it.diskon), 0)
  const itemPajak = items.reduce((s, it) => s + n(it.pajak), 0)
  const discount_amount = n(headerDiscount) + itemDiskon
  const tax_amount = n(headerTax) + itemPajak
  const grand_total = subtotal - discount_amount + tax_amount
  return { subtotal, discount_amount, tax_amount, grand_total }
}

// ── Status classification (dashboard) ───────────────────────────────────────
export function isPaid(r: APRow): boolean {
  return r.status === 'PAID' || n(r.amount_due) <= 0
}
export function isOverdue(r: APRow, today: Date): boolean {
  return !isPaid(r) && new Date(r.tgl_jatuh_tempo) < today
}
export function isOpen(r: APRow, today: Date): boolean {
  return !isPaid(r) && !isOverdue(r, today) && r.status !== 'REJECTED' && r.status !== 'DRAFT'
}

// ── Aging (US-003) ──────────────────────────────────────────────────────────
export interface AgingBucket { label: string; amount: number; count: number }
export const AGING_DEFS = [
  { label: 'Current', lo: -Infinity, hi: 0 },
  { label: '1-30 Hari', lo: 1, hi: 30 },
  { label: '31-60 Hari', lo: 31, hi: 60 },
  { label: '61-90 Hari', lo: 61, hi: 90 },
  { label: '>90 Hari', lo: 91, hi: Infinity },
] as const

export function computeAging(rows: APRow[], today: Date): AgingBucket[] {
  const active = rows.filter((r) => r.status !== 'REJECTED')
  const aging = AGING_DEFS.map((d) => ({ label: d.label, amount: 0, count: 0 }))
  for (const r of active) {
    if (isPaid(r)) continue
    const overdueDays = Math.round((today.getTime() - new Date(r.tgl_jatuh_tempo).getTime()) / 86_400_000)
    const idx = AGING_DEFS.findIndex((d) => overdueDays >= d.lo && overdueDays <= d.hi)
    if (idx >= 0) {
      aging[idx]!.amount += n(r.amount_due)
      aging[idx]!.count += 1
    }
  }
  return aging
}

// ── Cash-out forecast (US-004) ──────────────────────────────────────────────
export interface ForecastBucket { label: string; date_from: string; date_to: string; amount: number }
export function computeForecast(rows: APRow[], today: Date, weeks = 4): ForecastBucket[] {
  const active = rows.filter((r) => r.status !== 'REJECTED')
  const out: ForecastBucket[] = []
  for (let w = 0; w < weeks; w++) {
    const from = addDays(today, w * 7)
    const to = addDays(today, w * 7 + 6)
    const amount = active
      .filter((r) => !isPaid(r) && r.status === 'APPROVED')
      .filter((r) => {
        const due = new Date(r.tgl_jatuh_tempo)
        return due >= from && due <= to
      })
      .reduce((s, r) => s + n(r.amount_due), 0)
    out.push({ label: `${dlabel(from)} - ${dlabel(to)}`, date_from: ymd(from), date_to: ymd(to), amount })
  }
  return out
}

// ── Summary (dashboard cards) ───────────────────────────────────────────────
export interface APSummary {
  open_count: number
  overdue_count: number
  paid_total: number
  total_due: number
  aging: AgingBucket[]
  forecast: ForecastBucket[]
}
export function computeSummary(rows: APRow[], today: Date): APSummary {
  const active = rows.filter((r) => r.status !== 'REJECTED')
  return {
    open_count: active.filter((r) => isOpen(r, today)).length,
    overdue_count: active.filter((r) => isOverdue(r, today)).length,
    paid_total: active.reduce((s, r) => s + n(r.amount_paid), 0),
    total_due: active.filter((r) => !isPaid(r)).reduce((s, r) => s + n(r.amount_due), 0),
    aging: computeAging(rows, today),
    forecast: computeForecast(rows, today),
  }
}

// ── Workflow state machine (US-002 / US-005) ────────────────────────────────
export const canEdit = (s: APStatus): boolean => s === 'DRAFT' || s === 'REJECTED'
export const canSubmit = (s: APStatus): boolean => s === 'DRAFT' || s === 'REJECTED'
export const canApprove = (s: APStatus): boolean => s === 'SUBMITTED'
export const canReject = (s: APStatus): boolean => s === 'SUBMITTED'
export const canPay = (s: APStatus): boolean => s === 'APPROVED'
export const canDelete = (s: APStatus): boolean => s !== 'PAID'

// ── Payment application (US-002) ────────────────────────────────────────────
const EPS = 0.009
export interface PaymentResult {
  ok: boolean
  error?: string
  amount_paid?: number
  status?: APStatus
  fullyPaid?: boolean
}
export function applyPayment(inv: APRow, amount?: number | string): PaymentResult {
  if (inv.status !== 'APPROVED') {
    return { ok: false, error: 'Tagihan harus berstatus Disetujui sebelum dibayar' }
  }
  const due = n(inv.amount_due)
  const payAmt = amount != null && amount !== '' ? n(amount) : due
  if (payAmt <= 0) return { ok: false, error: 'Nominal pembayaran harus > 0' }
  if (payAmt > due + EPS) return { ok: false, error: `Nominal melebihi sisa tagihan (${due})` }
  const amount_paid = n(inv.amount_paid) + payAmt
  const fullyPaid = amount_paid >= n(inv.grand_total) - EPS
  return { ok: true, amount_paid, status: fullyPaid ? 'PAID' : 'APPROVED', fullyPaid }
}

// ── Journal posting (US-005) ────────────────────────────────────────────────
// Builds balanced debit lines from items; forces debit total == grand_total by
// absorbing header-level tax/discount into the last line.
export interface JournalDebitLine { coa_id: string; amount: number }
export function buildDebitLines(
  items: { coa_id?: string | null; qty?: number; harga?: number; diskon?: number; pajak?: number }[],
  grand_total: number,
  fallbackCoaId?: string | null
): JournalDebitLine[] {
  const lines: JournalDebitLine[] = items
    .map((it) => ({
      coa_id: (it.coa_id || fallbackCoaId || '') as string,
      amount: n(it.qty) * n(it.harga) - n(it.diskon) + n(it.pajak),
    }))
    .filter((l) => l.coa_id && l.amount > 0)

  if (lines.length === 0 && fallbackCoaId) {
    lines.push({ coa_id: fallbackCoaId, amount: grand_total })
  }
  const debitSum = lines.reduce((s, l) => s + l.amount, 0)
  const diff = grand_total - debitSum
  if (Math.abs(diff) > EPS && lines.length > 0) {
    lines[lines.length - 1]!.amount += diff
  }
  return lines
}
