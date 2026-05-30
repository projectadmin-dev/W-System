-- ============================================================================
-- QA seed — Account Payable Test Plan results (auto-generated, re-runnable)
-- Run in Supabase SQL Editor. Renders at /finance/qa.
-- Summary: 58 cases · 56 pass · 0 fail · 2 blocked · 96.55% · PARTIAL
-- ============================================================================
DELETE FROM public.qa_test_runs
 WHERE tenant_id = '00000000-0000-0000-0000-000000000001' AND module = 'account-payable' AND title = 'Account Payable (Pengelolaan Tagihan) — Test Plan v1';

WITH r AS (
  INSERT INTO public.qa_test_runs
    (tenant_id, module, title, description, environment, executed_by, executed_at,
     total, passed, failed, blocked, skipped, pass_rate, status)
  VALUES
    ('00000000-0000-0000-0000-000000000001', 'account-payable', 'Account Payable (Pengelolaan Tagihan) — Test Plan v1', 'Eksekusi 58 test case (45 otomatis via node:test pada lib/ap-logic.ts, 13 integration/code-review). Mencakup US-001…US-005: input & duplikat, workflow approval, AP aging, cash-out forecast, GL posting.', 'Node 22 + node:test (logic) · Next.js 16 route review · Supabase public schema',
     'QA Engineer (Claude)', NOW(),
     58, 56, 0, 2, 0, 96.55, 'PARTIAL')
  RETURNING id
)
INSERT INTO public.qa_test_cases
  (run_id, tenant_id, case_code, user_story, title, category, method, priority,
   expected, actual, status, notes, seq)
SELECT r.id, '00000000-0000-0000-0000-000000000001', v.case_code, v.user_story, v.title, v.category, v.method,
       v.priority, v.expected, v.actual, v.status, v.notes, v.seq
FROM r,
( VALUES
    ('TC-001', 'US-001', 'computeTotals: subtotal = sum(qty*harga)', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 1),
    ('TC-002', 'US-001', 'computeTotals: item-level diskon & pajak', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 2),
    ('TC-003', 'US-001', 'computeTotals: header-level discount/tax added on top', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 3),
    ('TC-004', 'US-001', 'computeTotals: grand_total = subtotal - discount + tax', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 4),
    ('TC-005', 'US-001', 'duplicateKey: identical invoice → equal key (duplicate)', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 5),
    ('TC-006', 'US-001', 'duplicateKey: trims surrounding whitespace', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 6),
    ('TC-007', 'US-001', 'duplicateKey: different tgl_terima → not duplicate', 'negative', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 7),
    ('TC-008', 'US-001', 'formatApNumber: zero-padded sequence', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 8),
    ('TC-009', 'US-001', 'apNumberPrefix: month is zero-padded', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 9),
    ('TC-010', 'US-001', 'computeTotals: tolerates string & missing fields', 'boundary', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 10),
    ('TC-011', 'US-002', 'canSubmit only from DRAFT/REJECTED', 'negative', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 11),
    ('TC-012', 'US-002', 'canApprove only from SUBMITTED', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 12),
    ('TC-013', 'US-002', 'canReject only from SUBMITTED', 'negative', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 13),
    ('TC-014', 'US-002', 'canPay only from APPROVED', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 14),
    ('TC-015', 'US-002', 'canEdit only DRAFT/REJECTED', 'negative', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 15),
    ('TC-016', 'US-002', 'canDelete any status except PAID', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 16),
    ('TC-017', 'US-002', 'applyPayment: full payment → PAID', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 17),
    ('TC-018', 'US-002', 'applyPayment: partial → stays APPROVED & accumulates', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 18),
    ('TC-019', 'US-002', 'applyPayment: no amount → defaults to full remaining', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 19),
    ('TC-020', 'US-002', 'applyPayment: rejected when not APPROVED', 'negative', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 20),
    ('TC-021', 'US-002', 'applyPayment: rejects non-positive amount', 'negative', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 21),
    ('TC-022', 'US-002', 'applyPayment: rejects overpayment beyond due', 'negative', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 22),
    ('TC-023', 'US-002', 'applyPayment: epsilon tolerance closes to PAID', 'boundary', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 23),
    ('TC-024', 'US-003', 'aging: not-yet-due → Current bucket', 'functional', 'Automated', 'Medium', 'Assertion holds', 'Matched expected', 'PASS', NULL, 24),
    ('TC-025', 'US-003', 'aging: 15 days overdue → 1-30 bucket', 'functional', 'Automated', 'Medium', 'Assertion holds', 'Matched expected', 'PASS', NULL, 25),
    ('TC-026', 'US-003', 'aging: 45 days overdue → 31-60 bucket', 'functional', 'Automated', 'Medium', 'Assertion holds', 'Matched expected', 'PASS', NULL, 26),
    ('TC-027', 'US-003', 'aging: 75 days overdue → 61-90 bucket', 'functional', 'Automated', 'Medium', 'Assertion holds', 'Matched expected', 'PASS', NULL, 27),
    ('TC-028', 'US-003', 'aging: 120 days overdue → >90 bucket', 'functional', 'Automated', 'Medium', 'Assertion holds', 'Matched expected', 'PASS', NULL, 28),
    ('TC-029', 'US-003', 'aging: excludes PAID invoices', 'negative', 'Automated', 'Medium', 'Assertion holds', 'Matched expected', 'PASS', NULL, 29),
    ('TC-030', 'US-003', 'aging: excludes REJECTED invoices', 'negative', 'Automated', 'Medium', 'Assertion holds', 'Matched expected', 'PASS', NULL, 30),
    ('TC-031', 'US-003', 'aging: sums amount_due & counts within bucket', 'functional', 'Automated', 'Medium', 'Assertion holds', 'Matched expected', 'PASS', NULL, 31),
    ('TC-032', 'US-004', 'forecast: produces 4 weekly buckets', 'functional', 'Automated', 'Medium', 'Assertion holds', 'Matched expected', 'PASS', NULL, 32),
    ('TC-033', 'US-004', 'forecast: APPROVED+unpaid due this week → week 0', 'functional', 'Automated', 'Medium', 'Assertion holds', 'Matched expected', 'PASS', NULL, 33),
    ('TC-034', 'US-004', 'forecast: due next week → week 1, not week 0', 'boundary', 'Automated', 'Medium', 'Assertion holds', 'Matched expected', 'PASS', NULL, 34),
    ('TC-035', 'US-004', 'forecast: excludes non-APPROVED (SUBMITTED/DRAFT)', 'negative', 'Automated', 'Medium', 'Assertion holds', 'Matched expected', 'PASS', NULL, 35),
    ('TC-036', 'US-004', 'forecast: excludes overdue (due before today)', 'negative', 'Automated', 'Medium', 'Assertion holds', 'Matched expected', 'PASS', NULL, 36),
    ('TC-037', 'US-005', 'buildDebitLines: net = qty*harga - diskon + pajak', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 37),
    ('TC-038', 'US-005', 'buildDebitLines: drops zero/negative & missing-coa lines', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 38),
    ('TC-039', 'US-005', 'buildDebitLines: fallback single line when no item coa', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 39),
    ('TC-040', 'US-005', 'buildDebitLines: absorbs header tax/discount diff into last line', 'boundary', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 40),
    ('TC-041', 'US-005', 'buildDebitLines: debit total balances to grand_total exactly', 'boundary', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 41),
    ('TC-042', 'US-003', 'summary: open_count counts non-overdue payable', 'functional', 'Automated', 'Medium', 'Assertion holds', 'Matched expected', 'PASS', NULL, 42),
    ('TC-043', 'US-003', 'summary: overdue_count counts past-due unpaid', 'functional', 'Automated', 'Medium', 'Assertion holds', 'Matched expected', 'PASS', NULL, 43),
    ('TC-044', 'US-002', 'summary: paid_total sums amount_paid', 'functional', 'Automated', 'High', 'Assertion holds', 'Matched expected', 'PASS', NULL, 44),
    ('TC-045', 'US-003', 'summary: total_due excludes fully-paid', 'negative', 'Automated', 'Medium', 'Assertion holds', 'Matched expected', 'PASS', NULL, 45),
    ('IC-01', 'US-001', 'UNIQUE(tenant,pihak_ketiga,no_invoice,tgl_terima) mencegah invoice duplikat di level DB', 'integration', 'Code Review', 'High', 'Constraint uq_ap_duplicate ada di schema', 'OK', 'PASS', NULL, 46),
    ('IC-02', 'US-001', 'POST /account-payable mengembalikan 409 saat duplikat', 'integration', 'Code Review', 'High', 'HTTP 409 + pesan jelas', 'OK', 'PASS', NULL, 47),
    ('IC-03', 'US-001', 'amount_due = grand_total - amount_paid (GENERATED column)', 'integration', 'Code Review', 'High', 'Kolom generated stored', 'OK', 'PASS', NULL, 48),
    ('IC-04', 'US-001', 'Validasi field wajib (no_invoice, tgl, pihak_ketiga, ≥1 item) → 400', 'integration', 'Code Review', 'Medium', 'HTTP 400 bila kurang', 'OK', 'PASS', NULL, 49),
    ('IC-05', 'US-002', 'Submit guard: hanya DRAFT/REJECTED → SUBMITTED + audit step', 'integration', 'Code Review', 'High', '422 untuk status lain', 'OK', 'PASS', NULL, 50),
    ('IC-06', 'US-002', 'Approve guard: hanya SUBMITTED → APPROVED + audit step', 'integration', 'Code Review', 'High', '422 untuk status lain', 'OK', 'PASS', NULL, 51),
    ('IC-07', 'US-002', 'Reject wajib notes; SUBMITTED → REJECTED', 'integration', 'Code Review', 'High', '400 bila notes kosong', 'OK', 'PASS', NULL, 52),
    ('IC-08', 'US-002', 'Pay endpoint menolak non-APPROVED & overpay; tandai PAID saat lunas', 'integration', 'Code Review', 'High', '422/400 sesuai aturan', 'OK', 'PASS', NULL, 53),
    ('IC-09', 'US-005', 'Approve auto-posting Jurnal: Dr Beban / Cr Hutang Usaha (balanced)', 'integration', 'Code Review', 'High', 'journal_entries + journal_lines seimbang', 'OK', 'PASS', NULL, 54),
    ('IC-10', 'US-005', 'Journal best-effort: kegagalan GL tidak memblokir approval (warning)', 'integration', 'Code Review', 'High', 'approval tetap sukses + warning', 'OK', 'PASS', NULL, 55),
    ('IC-11', 'US-002', 'Edit hanya DRAFT/REJECTED; Delete diblok jika PAID', 'integration', 'Code Review', 'Medium', '422 untuk status terkunci', 'OK', 'PASS', NULL, 56),
    ('IC-12', 'US-005', 'Live E2E (HTTP→Supabase): create→approve→GL pada DB ter-deploy', 'integration', 'Manual', 'High', 'Tereksekusi end-to-end', 'BLOCKED', 'BLOCKED', NULL, 57),
    ('IC-13', 'US-003', 'Live E2E: AP Aging & Forecast pada data nyata DB', 'integration', 'Manual', 'Medium', 'Tereksekusi end-to-end', 'BLOCKED', 'BLOCKED', NULL, 58)
) AS v(case_code, user_story, title, category, method, priority, expected, actual, status, notes, seq);
