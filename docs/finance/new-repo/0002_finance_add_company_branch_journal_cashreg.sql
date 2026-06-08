-- =====================================================
-- NEW-REPO MIGRATION 0002 (prepared artifact — DO NOT run against W-System)
-- company_id + branch_id for the R1 modules' tables NOT already covered by 0001.
--
-- Companion to docs/finance/new-repo/0001_finance_add_company_branch.sql.
--   0001 already covers: journal_entries, journal_lines, fiscal_periods,
--   trial_balance_snapshots, fiscal_period_journal_locks (+ the 6 v1 modules).
--   0002 adds the 9 remaining tables of the Journal & Cash-Register modules.
--   (Fiscal Periods adds NOTHING new — all its tables are in 0001.)
--
-- Same decision as 0001: NULLABLE, no FK/index/RLS now; tenant_id retained;
-- company -> entities(PT), branch -> branches. FK + backfill + RLS = final
-- migration in the new repo (see PRD_Task_Management_R1.md, Phase 5).
-- Idempotent (ADD COLUMN IF NOT EXISTS). Copy into the new repo's migrations.
--
-- NOTE: cash_register_entries currently has NO tenant_id either; the new repo
-- should add tenant_id + company_id + branch_id together and enable real RLS.
-- =====================================================

BEGIN;


-- == Journal — auto-journal & cost-center link (4 tables) ==
ALTER TABLE public.journal_line_cost_centers ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.journal_line_cost_centers ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.konfigurasi_jurnal ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.konfigurasi_jurnal ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.konfigurasi_jurnal_detail ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.konfigurasi_jurnal_detail ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.jurnal_error_log ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.jurnal_error_log ADD COLUMN IF NOT EXISTS branch_id  uuid;

COMMENT ON COLUMN public.journal_line_cost_centers.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.journal_line_cost_centers.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.konfigurasi_jurnal.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.konfigurasi_jurnal.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.konfigurasi_jurnal_detail.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.konfigurasi_jurnal_detail.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.jurnal_error_log.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.jurnal_error_log.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';

-- == Cash/Bank Register & legacy cash stack (5 tables) ==
ALTER TABLE public.cash_register_entries ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.cash_register_entries ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.money_requests ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.money_requests ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.petty_cash_custodians ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.petty_cash_custodians ADD COLUMN IF NOT EXISTS branch_id  uuid;
ALTER TABLE public.petty_cash_entries ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE public.petty_cash_entries ADD COLUMN IF NOT EXISTS branch_id  uuid;

COMMENT ON COLUMN public.cash_register_entries.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.cash_register_entries.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.money_requests.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.money_requests.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.bank_accounts.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.bank_accounts.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.petty_cash_custodians.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.petty_cash_custodians.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.petty_cash_entries.company_id IS 'Legal entity (PT) scope for data isolation between companies. Nullable; NO foreign key yet — final FK -> companies/entities(id) + index + RLS handled in the new-repo migration.';
COMMENT ON COLUMN public.petty_cash_entries.branch_id  IS 'Branch (kantor cabang) scope for data isolation between branches. Nullable; NO foreign key yet — final FK -> branches(id) + index + RLS handled in the new-repo migration.';

COMMIT;
