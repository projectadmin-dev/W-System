-- =====================================================
-- Seed: Fiscal Periods (periods module)
-- Captured from live tenant 00000000-0000-0000-0000-000000000001. 3 periods (FY2026 Q1/Q2 ...).
-- trial_balance_snapshots and fiscal_period_journal_locks are EMPTY today
-- (populated on period APPROVE — see the Periods MIGRATION doc).
--
-- Conflict-safe: uses ON CONFLICT (id) DO NOTHING and NO delete, so it can run
-- alongside lk_reports_seed.sql (which also seeds these same fiscal_periods).
-- =====================================================

BEGIN;

INSERT INTO public.fiscal_periods (id, tenant_id, period_name, period_type, start_date, end_date, status, closed_at, closed_by, close_notes, created_at, updated_at, created_by, updated_by, deleted_at, approval_status, grace_days, is_grace_allowed, submitted_by, submitted_at, approved_by, approved_at, locked_by, locked_at, approval_notes) VALUES
  ('299ee939-a7af-40c3-9650-16f4339e36a3', '00000000-0000-0000-0000-000000000001', 'FY2026-Q1', 'quarterly', '2026-01-01', '2026-03-31', 'open', NULL, NULL, NULL, '2026-05-31 14:33:51.160931+00', '2026-05-31 14:33:51.160931+00', '812558af-8be8-4c53-b581-e6a4f1c91147', NULL, NULL, 'DRAFT', '0', 'false', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('78f59c28-eac8-422c-ac49-9ed659fe0ee5', '00000000-0000-0000-0000-000000000001', 'FY2026-Q2', 'quarterly', '2026-04-01', '2026-06-30', 'open', NULL, NULL, NULL, '2026-04-22 12:46:00.162176+00', '2026-04-22 12:46:00.162176+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, NULL, 'DRAFT', '0', 'false', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('04cb248d-a3ab-4e56-b6b1-a42d9d9558a2', '00000000-0000-0000-0000-000000000001', 'Updated Period Name', 'monthly', '2026-04-21', '2026-12-31', 'open', NULL, NULL, NULL, '2026-04-21 09:15:03.43061+00', '2026-04-21 09:15:04.319438+00', '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, '2026-04-21 09:15:04.264+00', 'DRAFT', '0', 'false', NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

COMMIT;
