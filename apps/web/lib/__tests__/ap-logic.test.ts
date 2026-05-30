// ============================================================================
// Account Payable — logic test suite (node:test)
// Run: node --experimental-strip-types --test apps/web/lib/__tests__/ap-logic.test.ts
//
// Each test name is prefixed with TC-### [US-###] so results can be traced back
// to user stories and exported to the QA dashboard.
// ============================================================================
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeTotals, duplicateKey, apNumberPrefix, formatApNumber,
  canSubmit, canApprove, canReject, canPay, canEdit, canDelete,
  applyPayment, computeAging, computeForecast, computeSummary,
  buildDebitLines, startOfDay, addDays, ymd,
  type APRow, type APStatus,
} from '../ap-logic.ts'

const TODAY = startOfDay(new Date('2026-05-30'))
const dueIn = (days: number) => ymd(addDays(TODAY, days))

const row = (p: Partial<APRow> & { status: APStatus }): APRow => ({
  tgl_jatuh_tempo: dueIn(10),
  amount_due: 0,
  amount_paid: 0,
  grand_total: 0,
  ...p,
})

// ── US-001 : Input tagihan (totals, duplikat, penomoran) ────────────────────
test('TC-001 [US-001] computeTotals: subtotal = sum(qty*harga)', () => {
  const t = computeTotals([{ qty: 2, harga: 100 }, { qty: 3, harga: 50 }])
  assert.equal(t.subtotal, 350)
  assert.equal(t.grand_total, 350)
})
test('TC-002 [US-001] computeTotals: item-level diskon & pajak', () => {
  const t = computeTotals([{ qty: 1, harga: 1000, diskon: 100, pajak: 110 }])
  assert.equal(t.subtotal, 1000)
  assert.equal(t.discount_amount, 100)
  assert.equal(t.tax_amount, 110)
  assert.equal(t.grand_total, 1010) // 1000 - 100 + 110
})
test('TC-003 [US-001] computeTotals: header-level discount/tax added on top', () => {
  const t = computeTotals([{ qty: 1, harga: 1000, diskon: 50, pajak: 0 }], 200, 100)
  assert.equal(t.discount_amount, 250) // 200 header + 50 item
  assert.equal(t.tax_amount, 100)
  assert.equal(t.grand_total, 850) // 1000 - 250 + 100
})
test('TC-004 [US-001] computeTotals: grand_total = subtotal - discount + tax', () => {
  const t = computeTotals([{ qty: 10, harga: 1000 }], 0, 1100)
  assert.equal(t.grand_total, 11_100)
})
test('TC-005 [US-001] duplicateKey: identical invoice → equal key (duplicate)', () => {
  assert.equal(
    duplicateKey('Biznet', 'INV-99', '2026-05-01'),
    duplicateKey('Biznet', 'INV-99', '2026-05-01'),
  )
})
test('TC-006 [US-001] duplicateKey: trims surrounding whitespace', () => {
  assert.equal(duplicateKey('  Biznet ', ' INV-99 ', '2026-05-01'), 'Biznet|INV-99|2026-05-01')
})
test('TC-007 [US-001] duplicateKey: different tgl_terima → not duplicate', () => {
  assert.notEqual(
    duplicateKey('Biznet', 'INV-99', '2026-05-01'),
    duplicateKey('Biznet', 'INV-99', '2026-05-02'),
  )
})
test('TC-008 [US-001] formatApNumber: zero-padded sequence', () => {
  assert.equal(formatApNumber(new Date('2026-05-30'), 0), 'AP-2026-05-0001')
  assert.equal(formatApNumber(new Date('2026-05-30'), 41), 'AP-2026-05-0042')
})
test('TC-009 [US-001] apNumberPrefix: month is zero-padded', () => {
  assert.equal(apNumberPrefix(new Date('2026-03-09')), 'AP-2026-03-')
})
test('TC-010 [US-001] computeTotals: tolerates string & missing fields', () => {
  const t = computeTotals([{ qty: '2' as any, harga: '250' as any }, {} as any])
  assert.equal(t.subtotal, 500)
  assert.equal(t.grand_total, 500)
})

// ── US-002 : Workflow (state machine + pembayaran) ──────────────────────────
test('TC-011 [US-002] canSubmit only from DRAFT/REJECTED', () => {
  assert.deepEqual(
    (['DRAFT', 'REJECTED', 'SUBMITTED', 'APPROVED', 'PAID'] as APStatus[]).map(canSubmit),
    [true, true, false, false, false],
  )
})
test('TC-012 [US-002] canApprove only from SUBMITTED', () => {
  assert.deepEqual(
    (['SUBMITTED', 'DRAFT', 'APPROVED', 'PAID', 'REJECTED'] as APStatus[]).map(canApprove),
    [true, false, false, false, false],
  )
})
test('TC-013 [US-002] canReject only from SUBMITTED', () => {
  assert.equal(canReject('SUBMITTED'), true)
  assert.equal(canReject('APPROVED'), false)
})
test('TC-014 [US-002] canPay only from APPROVED', () => {
  assert.equal(canPay('APPROVED'), true)
  assert.equal(canPay('SUBMITTED'), false)
  assert.equal(canPay('PAID'), false)
})
test('TC-015 [US-002] canEdit only DRAFT/REJECTED', () => {
  assert.deepEqual(
    (['DRAFT', 'REJECTED', 'SUBMITTED', 'APPROVED', 'PAID'] as APStatus[]).map(canEdit),
    [true, true, false, false, false],
  )
})
test('TC-016 [US-002] canDelete any status except PAID', () => {
  assert.equal(canDelete('PAID'), false)
  assert.equal(canDelete('DRAFT'), true)
  assert.equal(canDelete('APPROVED'), true)
})
test('TC-017 [US-002] applyPayment: full payment → PAID', () => {
  const r = applyPayment({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(5), amount_due: 1000, amount_paid: 0, grand_total: 1000 }, 1000)
  assert.equal(r.ok, true)
  assert.equal(r.status, 'PAID')
  assert.equal(r.amount_paid, 1000)
  assert.equal(r.fullyPaid, true)
})
test('TC-018 [US-002] applyPayment: partial → stays APPROVED & accumulates', () => {
  const r = applyPayment({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(5), amount_due: 1000, amount_paid: 200, grand_total: 1000 }, 300)
  assert.equal(r.status, 'APPROVED')
  assert.equal(r.amount_paid, 500)
  assert.equal(r.fullyPaid, false)
})
test('TC-019 [US-002] applyPayment: no amount → defaults to full remaining', () => {
  const r = applyPayment({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(5), amount_due: 750, amount_paid: 250, grand_total: 1000 })
  assert.equal(r.ok, true)
  assert.equal(r.amount_paid, 1000)
  assert.equal(r.status, 'PAID')
})
test('TC-020 [US-002] applyPayment: rejected when not APPROVED', () => {
  const r = applyPayment({ status: 'SUBMITTED', tgl_jatuh_tempo: dueIn(5), amount_due: 1000 }, 100)
  assert.equal(r.ok, false)
  assert.match(r.error!, /Disetujui/)
})
test('TC-021 [US-002] applyPayment: rejects non-positive amount', () => {
  const r = applyPayment({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(5), amount_due: 1000, grand_total: 1000 }, 0)
  assert.equal(r.ok, false)
  assert.match(r.error!, />\s*0/)
})
test('TC-022 [US-002] applyPayment: rejects overpayment beyond due', () => {
  const r = applyPayment({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(5), amount_due: 1000, grand_total: 1000 }, 1500)
  assert.equal(r.ok, false)
  assert.match(r.error!, /melebihi/)
})
test('TC-023 [US-002] applyPayment: epsilon tolerance closes to PAID', () => {
  const r = applyPayment({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(5), amount_due: 0.005, amount_paid: 999.995, grand_total: 1000 }, 0.005)
  assert.equal(r.fullyPaid, true)
  assert.equal(r.status, 'PAID')
})

// ── US-003 : AP Aging report ────────────────────────────────────────────────
test('TC-024 [US-003] aging: not-yet-due → Current bucket', () => {
  const a = computeAging([row({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(10), amount_due: 100 })], TODAY)
  assert.equal(a[0]!.label, 'Current')
  assert.equal(a[0]!.amount, 100)
  assert.equal(a[0]!.count, 1)
})
test('TC-025 [US-003] aging: 15 days overdue → 1-30 bucket', () => {
  const a = computeAging([row({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(-15), amount_due: 200 })], TODAY)
  assert.equal(a[1]!.amount, 200)
})
test('TC-026 [US-003] aging: 45 days overdue → 31-60 bucket', () => {
  const a = computeAging([row({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(-45), amount_due: 300 })], TODAY)
  assert.equal(a[2]!.amount, 300)
})
test('TC-027 [US-003] aging: 75 days overdue → 61-90 bucket', () => {
  const a = computeAging([row({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(-75), amount_due: 400 })], TODAY)
  assert.equal(a[3]!.amount, 400)
})
test('TC-028 [US-003] aging: 120 days overdue → >90 bucket', () => {
  const a = computeAging([row({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(-120), amount_due: 500 })], TODAY)
  assert.equal(a[4]!.amount, 500)
})
test('TC-029 [US-003] aging: excludes PAID invoices', () => {
  const a = computeAging([row({ status: 'PAID', tgl_jatuh_tempo: dueIn(-40), amount_due: 0 })], TODAY)
  assert.equal(a.reduce((s, b) => s + b.amount, 0), 0)
})
test('TC-030 [US-003] aging: excludes REJECTED invoices', () => {
  const a = computeAging([row({ status: 'REJECTED', tgl_jatuh_tempo: dueIn(-40), amount_due: 999 })], TODAY)
  assert.equal(a.reduce((s, b) => s + b.count, 0), 0)
})
test('TC-031 [US-003] aging: sums amount_due & counts within bucket', () => {
  const a = computeAging([
    row({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(-10), amount_due: 100 }),
    row({ status: 'SUBMITTED', tgl_jatuh_tempo: dueIn(-20), amount_due: 250 }),
  ], TODAY)
  assert.equal(a[1]!.amount, 350)
  assert.equal(a[1]!.count, 2)
})

// ── US-004 : Cash-out forecast ──────────────────────────────────────────────
test('TC-032 [US-004] forecast: produces 4 weekly buckets', () => {
  assert.equal(computeForecast([], TODAY).length, 4)
})
test('TC-033 [US-004] forecast: APPROVED+unpaid due this week → week 0', () => {
  const f = computeForecast([row({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(3), amount_due: 1000 })], TODAY)
  assert.equal(f[0]!.amount, 1000)
})
test('TC-034 [US-004] forecast: due next week → week 1, not week 0', () => {
  const f = computeForecast([row({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(10), amount_due: 500 })], TODAY)
  assert.equal(f[0]!.amount, 0)
  assert.equal(f[1]!.amount, 500)
})
test('TC-035 [US-004] forecast: excludes non-APPROVED (SUBMITTED/DRAFT)', () => {
  const f = computeForecast([
    row({ status: 'SUBMITTED', tgl_jatuh_tempo: dueIn(2), amount_due: 1000 }),
    row({ status: 'DRAFT', tgl_jatuh_tempo: dueIn(2), amount_due: 1000 }),
  ], TODAY)
  assert.equal(f[0]!.amount, 0)
})
test('TC-036 [US-004] forecast: excludes overdue (due before today)', () => {
  const f = computeForecast([row({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(-3), amount_due: 1000 })], TODAY)
  assert.equal(f.reduce((s, b) => s + b.amount, 0), 0)
})

// ── US-005 : GL journal posting ─────────────────────────────────────────────
test('TC-037 [US-005] buildDebitLines: net = qty*harga - diskon + pajak', () => {
  const l = buildDebitLines([{ coa_id: 'c1', qty: 2, harga: 500, diskon: 100, pajak: 110 }], 1110)
  assert.equal(l[0]!.amount, 1110) // 1000 - 100 + 110
  assert.equal(l[0]!.coa_id, 'c1')
})
test('TC-038 [US-005] buildDebitLines: drops zero/negative & missing-coa lines', () => {
  const l = buildDebitLines([
    { coa_id: 'c1', qty: 1, harga: 100 },
    { coa_id: null, qty: 1, harga: 100 },     // no coa → dropped (no fallback)
    { coa_id: 'c2', qty: 0, harga: 100 },     // zero → dropped
  ], 100)
  assert.equal(l.length, 1)
  assert.equal(l[0]!.coa_id, 'c1')
})
test('TC-039 [US-005] buildDebitLines: fallback single line when no item coa', () => {
  const l = buildDebitLines([{ coa_id: null, qty: 1, harga: 5000 }], 5000, 'fallback-coa')
  assert.equal(l.length, 1)
  assert.equal(l[0]!.coa_id, 'fallback-coa')
  assert.equal(l[0]!.amount, 5000)
})
test('TC-040 [US-005] buildDebitLines: absorbs header tax/discount diff into last line', () => {
  // items net = 1000, but grand_total = 1100 (header tax). Last line absorbs +100.
  const l = buildDebitLines([{ coa_id: 'c1', qty: 1, harga: 1000 }], 1100)
  assert.equal(l[0]!.amount, 1100)
})
test('TC-041 [US-005] buildDebitLines: debit total balances to grand_total exactly', () => {
  const grand = 8888.88
  const l = buildDebitLines([
    { coa_id: 'a', qty: 1, harga: 3000 },
    { coa_id: 'b', qty: 1, harga: 5000 },
  ], grand)
  const sum = l.reduce((s, x) => s + x.amount, 0)
  assert.ok(Math.abs(sum - grand) < 0.01, `debit ${sum} should equal grand ${grand}`)
})

// ── Dashboard summary ───────────────────────────────────────────────────────
test('TC-042 [US-003] summary: open_count counts non-overdue payable', () => {
  const s = computeSummary([
    row({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(5), amount_due: 100 }),  // open
    row({ status: 'SUBMITTED', tgl_jatuh_tempo: dueIn(5), amount_due: 100 }), // open
    row({ status: 'DRAFT', tgl_jatuh_tempo: dueIn(5), amount_due: 100 }),     // draft → not open
  ], TODAY)
  assert.equal(s.open_count, 2)
})
test('TC-043 [US-003] summary: overdue_count counts past-due unpaid', () => {
  const s = computeSummary([
    row({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(-5), amount_due: 100 }),
    row({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(5), amount_due: 100 }),
  ], TODAY)
  assert.equal(s.overdue_count, 1)
})
test('TC-044 [US-002] summary: paid_total sums amount_paid', () => {
  const s = computeSummary([
    row({ status: 'PAID', tgl_jatuh_tempo: dueIn(-1), amount_due: 0, amount_paid: 400 }),
    row({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(5), amount_due: 100, amount_paid: 50 }),
  ], TODAY)
  assert.equal(s.paid_total, 450)
})
test('TC-045 [US-003] summary: total_due excludes fully-paid', () => {
  const s = computeSummary([
    row({ status: 'PAID', tgl_jatuh_tempo: dueIn(-1), amount_due: 0, amount_paid: 400 }),
    row({ status: 'APPROVED', tgl_jatuh_tempo: dueIn(5), amount_due: 600, amount_paid: 0 }),
  ], TODAY)
  assert.equal(s.total_due, 600)
})
