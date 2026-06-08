-- =====================================================
-- NEW-REPO MIGRATION (prepared artifact — DO NOT run against W-System)
-- Add company_id + branch_id to every table of the 6 documented /finance modules.
--
-- Purpose: separate privacy & security of data per COMPANY and per BRANCH.
--   company  = PT / legally separate entity   (W-System ref: public.entities; e.g. "WIT WORKSHOP")
--   branch   = kantor cabang                   (W-System ref: public.branches)
--   company_id -> companies/entities(id)   |   branch_id -> branches(id)
--
-- CURRENT-PHASE DECISION (intentional):
--   * Columns are NULLABLE.
--   * NO foreign key, NO index, NO RLS yet.
--   * tenant_id is RETAINED unchanged; company_id/branch_id are NEW, independent columns.
--   * The FINAL migration (FK wiring + backfill + indexes + RLS policies) is done by the
--     receiving team in the NEW repository — see PRD_Task_Management.md, Phase 5.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS). To use: copy into the new repo's
-- supabase/migrations/ with that repo's own timestamp prefix, then `supabase db push`.
-- Tables covered: 21 (COA 4, PU 5, AR 3, AP 3, Vendor 1, Laporan Keuangan 5).
-- =====================================================

BEGIN;


-- ── Module: Chart of Account (4 tables) ──
ALTER TABLE public.coa ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.coa ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.coa_audit_log ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.coa_audit_log ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.coa_pending_approval ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.coa_pending_approval ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.coa_sub_gl_value ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.coa_sub_gl_value ADD COLUMN IF NOT EXISTS branch_id  uuid;

COMMENT ON COLUMN public.coa.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.coa.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.coa_audit_log.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.coa_audit_log.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.coa_pending_approval.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.coa_pending_approval.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.coa_sub_gl_value.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.coa_sub_gl_value.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';

-- ── Module: Permintaan Uang & Pembayaran (5 tables) ──
ALTER TABLE public.permintaan_uang ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.permintaan_uang ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.permintaan_uang_items ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.permintaan_uang_items ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.pu_approval_steps ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.pu_approval_steps ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.pembayaran ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.pembayaran ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.pembayaran_biaya_lain ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.pembayaran_biaya_lain ADD COLUMN IF NOT EXISTS branch_id  uuid;

COMMENT ON COLUMN public.permintaan_uang.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.permintaan_uang.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.permintaan_uang_items.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.permintaan_uang_items.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.pu_approval_steps.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.pu_approval_steps.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.pembayaran.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.pembayaran.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.pembayaran_biaya_lain.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.pembayaran_biaya_lain.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';

-- ── Module: Accounts Receivable (AR) (3 tables) ──
ALTER TABLE public.ar_bank_accounts ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.ar_bank_accounts ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.ar_invoices ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.ar_invoices ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.ar_payment_history ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.ar_payment_history ADD COLUMN IF NOT EXISTS branch_id  uuid;

COMMENT ON COLUMN public.ar_bank_accounts.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ar_bank_accounts.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ar_invoices.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ar_invoices.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ar_payment_history.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ar_payment_history.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';

-- ── Module: Account Payable (AP) (3 tables) ──
ALTER TABLE public.ap_invoices ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.ap_invoices ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.ap_invoice_items ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.ap_invoice_items ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.ap_approval_steps ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.ap_approval_steps ADD COLUMN IF NOT EXISTS branch_id  uuid;

COMMENT ON COLUMN public.ap_invoices.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ap_invoices.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ap_invoice_items.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ap_invoice_items.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ap_approval_steps.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.ap_approval_steps.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';

-- ── Module: Vendor Master (1 table) ──
ALTER TABLE public.fin_vendors ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.fin_vendors ADD COLUMN IF NOT EXISTS branch_id  uuid;

COMMENT ON COLUMN public.fin_vendors.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.fin_vendors.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';

-- ── Module: Laporan Keuangan (report sources) (5 tables) ──
ALTER TABLE public.fiscal_periods ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.fiscal_periods ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.journal_lines ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.journal_lines ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.trial_balance_snapshots ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.trial_balance_snapshots ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.fiscal_period_journal_locks ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.fiscal_period_journal_locks ADD COLUMN IF NOT EXISTS branch_id  uuid;

COMMENT ON COLUMN public.fiscal_periods.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.fiscal_periods.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.journal_entries.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.journal_entries.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.journal_lines.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.journal_lines.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.trial_balance_snapshots.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.trial_balance_snapshots.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.fiscal_period_journal_locks.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.fiscal_period_journal_locks.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';

COMMIT;
