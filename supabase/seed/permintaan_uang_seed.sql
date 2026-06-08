-- =====================================================
-- Seed: Permintaan Uang (Money Request) + Pembayaran (Payment)
-- Captured from the live Supabase tenant 00000000-0000-0000-0000-000000000001.
-- Tables: permintaan_uang, permintaan_uang_items, pu_approval_steps,
--         pembayaran, pembayaran_biaya_lain.
--
-- EXTERNAL DEPENDENCIES (must exist for FKs to resolve):
--   projects(id), user_profiles(id), coa(id)
--   The project_id / requestor_id / bank_dari_coa_id UUIDs reference the
--   live dataset (see the COA and project seeds).
--
-- Idempotent: clears this module's tables first; children cascade.
-- Review before running on shared data.
-- =====================================================

BEGIN;

DELETE FROM public.pembayaran      WHERE tenant_id = '00000000-0000-0000-0000-000000000001';  -- cascades pembayaran_biaya_lain
DELETE FROM public.permintaan_uang WHERE tenant_id = '00000000-0000-0000-0000-000000000001';  -- cascades items + approval steps

INSERT INTO public.permintaan_uang (id, tenant_id, doc_number, status, tanggal_permintaan, tanggal_kebutuhan, nominal, mata_uang, catatan, dasar_pengajuan, project_id, requestor_id, requestor_nik, requestor_name, requestor_dept, requestor_position, requestor_grade, submitted_at, approved_at, rejected_at, paid_at, created_at, updated_at, deleted_at, created_by, expense_coa_id) VALUES
  ('70de08e0-8589-4a4f-861e-54057353e7d5', '00000000-0000-0000-0000-000000000001', 'PU-2026-05-0001', 'PAID', '2026-05-28', '2026-06-15', '500000.00', 'IDR', 'Test draft', 'INTERNAL', NULL, '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, 'Admin WIT', NULL, NULL, NULL, '2026-05-28 14:19:34.876+00', '2026-05-28 14:19:35.217+00', NULL, '2026-05-28 14:19:35.957+00', '2026-05-28 14:19:34.482301+00', '2026-05-28 14:19:35.957+00', NULL, '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL),
  ('cc33eeee-c3b1-462e-b641-6da3f96cd251', '00000000-0000-0000-0000-000000000001', 'PU-2026-05-0002', 'REJECTED', '2026-05-28', '2026-06-20', '100000.00', 'IDR', NULL, 'INTERNAL', NULL, '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL, 'Test', NULL, NULL, NULL, '2026-05-28 14:19:37.369+00', NULL, '2026-05-28 14:19:37.686+00', NULL, '2026-05-28 14:19:36.807974+00', '2026-05-28 14:19:37.686+00', NULL, '8734a995-64dd-4ae1-ae34-dfc505b9271d', NULL),
  ('476eb62a-70e4-464a-a305-ea2fb198749d', '00000000-0000-0000-0000-000000000001', 'PU-2026-06-0001', 'APPROVED', '2026-06-07', '2026-06-30', '10000000.00', 'IDR', 'Arie testing', 'PROJECT', 'a1f65187-8b27-45fc-bda1-c3346d0e0c15', 'c2bdab6b-3a90-4d2c-9746-9f532013e6d7', NULL, 'Arie Anggono', 'Finance', NULL, NULL, '2026-06-07 06:45:02.614+00', '2026-06-07 07:00:28.464+00', NULL, NULL, '2026-06-07 06:44:41.256572+00', '2026-06-07 07:00:28.464+00', NULL, 'c2bdab6b-3a90-4d2c-9746-9f532013e6d7', NULL);

INSERT INTO public.permintaan_uang_items (id, permintaan_uang_id, urutan, deskripsi, nominal, created_at) VALUES
  ('d47367ec-c048-4a0c-bb5c-71072930d75e', '70de08e0-8589-4a4f-861e-54057353e7d5', '1', 'Snack rapat', '200000.00', '2026-05-28 14:19:34.609372+00'),
  ('540d49f8-8de0-496e-8de2-aa1389d97ea1', '70de08e0-8589-4a4f-861e-54057353e7d5', '2', 'Cetak dokumen', '300000.00', '2026-05-28 14:19:34.609372+00'),
  ('8288b844-d4ad-4802-91cc-526e50c6b9da', 'cc33eeee-c3b1-462e-b641-6da3f96cd251', '1', 'Item', '100000.00', '2026-05-28 14:19:36.967524+00');

INSERT INTO public.pu_approval_steps (id, tenant_id, permintaan_uang_id, level, approver_id, approver_name, approver_dept, status, notes, actioned_at, created_at) VALUES
  ('59620956-b2aa-4c6d-b6e9-377cbcb0edff', '00000000-0000-0000-0000-000000000001', '476eb62a-70e4-464a-a305-ea2fb198749d', '1', NULL, NULL, NULL, 'APPROVED', 'Test approve', '2026-06-07 07:00:28.464+00', '2026-06-07 07:00:28.638431+00'),
  ('04927528-6a4e-4b27-ad66-bc5cf6dfb595', '00000000-0000-0000-0000-000000000001', '70de08e0-8589-4a4f-861e-54057353e7d5', '1', '8734a995-64dd-4ae1-ae34-dfc505b9271d', 'Manager', NULL, 'APPROVED', 'OK', '2026-05-28 14:19:35.217+00', '2026-05-28 14:19:35.363721+00'),
  ('b14f5421-7d8f-4de6-9cc4-a558c004a927', '00000000-0000-0000-0000-000000000001', 'cc33eeee-c3b1-462e-b641-6da3f96cd251', '1', NULL, NULL, NULL, 'REJECTED', 'Budget tidak cukup', '2026-05-28 14:19:37.686+00', '2026-05-28 14:19:37.835737+00');

INSERT INTO public.pembayaran (id, tenant_id, doc_number, status, permintaan_uang_id, tanggal_pembayaran, nominal_bayar, mata_uang, bank_dari_coa_id, bank_dari_nama, bank_dari_kode, bank_tujuan_nama, bank_tujuan_nomor, bank_tujuan_atas_nama, requestor_id, requestor_name, requestor_dept, requestor_position, requestor_grade, approver_id, approver_name, approver_dept, approver_position, approver_grade, pic_finance_id, pic_finance_name, pic_finance_dept, pic_finance_position, pic_finance_grade, catatan, submitted_at, approved_at, paid_at, created_at, updated_at, deleted_at, created_by, journal_entry_id, pph_jenis, lawan_punya_npwp, pph_tarif, pph_dipotong_oleh, pph_amount, kas_neto, pph_dpp_kategori_id, pph_dpp) VALUES
  ('f88aa11e-83d4-4353-98f5-fc645c7a2a9b', '00000000-0000-0000-0000-000000000001', 'PAY-2026-05-0001', 'PAID', '70de08e0-8589-4a4f-861e-54057353e7d5', '2026-05-28', '500000.00', 'IDR', NULL, NULL, NULL, 'BCA', '1234567890', 'Test User', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-28 14:19:35.957+00', '2026-05-28 14:19:35.690721+00', '2026-05-28 14:19:35.957+00', NULL, NULL, NULL, NULL, 'true', NULL, 'tidak_ada', '0.00', NULL, NULL, NULL);

-- (no rows in pembayaran_biaya_lain)

COMMIT;
