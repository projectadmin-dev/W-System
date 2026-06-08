-- =====================================================
-- Seed: Journal Automation config (konfigurasi_jurnal)
-- Captured from live tenant 00000000-0000-0000-0000-000000000001.
-- Tables: konfigurasi_jurnal (5 headers), konfigurasi_jurnal_detail (16 lines).
-- Drives config-based auto-journaling for AR/AP/internal-payment use cases.
--
-- EXTERNAL DEPENDENCIES: coa(id) — konfigurasi_jurnal_detail.coa_id (where set).
-- NOTE: journal_entries/journal_lines themselves are in lk_reports_seed.sql;
--       cost centers in migration 20260528000008_seed_cost_centers.sql.
-- Idempotent: clears these two config tables first (detail before header).
-- =====================================================

BEGIN;

DELETE FROM public.konfigurasi_jurnal_detail
 WHERE konfigurasi_id IN (SELECT id FROM public.konfigurasi_jurnal WHERE tenant_id = '00000000-0000-0000-0000-000000000001');
DELETE FROM public.konfigurasi_jurnal WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

INSERT INTO public.konfigurasi_jurnal (id, tenant_id, kode_konfigurasi, nama_fitur, modul_referensi, tipe_jurnal, is_aktif, keterangan, created_by, updated_by, created_at, updated_at, deleted_at) VALUES
  ('50f24d54-9829-49b8-9acd-41fbba0d2485', '00000000-0000-0000-0000-000000000001', 'AP-BILL-RCV', 'Terima Tagihan Pihak Ketiga (AP)', 'pembelian', 'hutang_beban', 'true', 'Dr Beban/Aset (per item) + PPN Masukan / Cr Hutang Usaha saat tagihan diterima', '00000000-0000-0000-0000-000000000002', NULL, '2026-06-05 16:03:12.323838+00', NULL, NULL),
  ('c38b3972-1f97-4df3-ba75-61b019532163', '00000000-0000-0000-0000-000000000001', 'AP-PAY', 'Bayar Tagihan Pihak Ketiga (AP)', 'pembelian', 'pelunasan_hutang', 'true', 'Dr Hutang Usaha / Cr Kas/Bank saat tagihan dibayar', '00000000-0000-0000-0000-000000000002', NULL, '2026-06-05 16:03:12.323838+00', NULL, NULL),
  ('f3e422fc-0124-4f1c-aff7-130abdd38e39', '00000000-0000-0000-0000-000000000001', 'AR-INV-ISSUE', 'Terbit Invoice Penjualan (AR)', 'penjualan', 'piutang_pendapatan', 'true', 'Dr Piutang / Cr Pendapatan + PPN Keluaran saat invoice diterbitkan', '00000000-0000-0000-0000-000000000002', NULL, '2026-06-05 16:03:12.323838+00', NULL, NULL),
  ('62c94ae2-d3e5-4487-b5fc-9e7ed58e262d', '00000000-0000-0000-0000-000000000001', 'AR-PAY-RCV', 'Terima Pembayaran Invoice (AR)', 'penjualan', 'pelunasan_piutang', 'true', 'Dr Kas/Bank / Cr Piutang saat pembayaran customer diterima', '00000000-0000-0000-0000-000000000002', NULL, '2026-06-05 16:03:12.323838+00', NULL, NULL),
  ('bd29ca37-a24e-4aaa-9004-3ba07a734a42', '00000000-0000-0000-0000-000000000001', 'PMB-INTERNAL', 'Pembayaran Permintaan Uang Internal', 'pembayaran_internal', 'beban_kas', 'true', 'Dr Beban (+ biaya lain) / Cr Kas/Bank saat transfer disbursement internal', '00000000-0000-0000-0000-000000000002', NULL, '2026-06-05 16:03:12.323838+00', NULL, NULL);

INSERT INTO public.konfigurasi_jurnal_detail (id, tenant_id, konfigurasi_id, coa_id, dynamic_source, posisi, sumber_nominal, urutan, keterangan_baris, is_optional, created_at) VALUES
  ('14e6dd0b-77e9-43af-89dc-0edc35afe223', '00000000-0000-0000-0000-000000000001', '50f24d54-9829-49b8-9acd-41fbba0d2485', NULL, 'ap_line_coa', 'debit', 'line_amount', '1', 'Beban/Aset (per item)', 'false', '2026-06-05 16:03:12.323838+00'),
  ('3cccd29e-f31e-4a94-ac81-9069431daab5', '00000000-0000-0000-0000-000000000001', '50f24d54-9829-49b8-9acd-41fbba0d2485', '814273b5-6273-4fdd-bad5-5b6a61cde53f', NULL, 'debit', 'pajak', '2', 'PPN Masukan', 'true', '2026-06-05 16:03:12.323838+00'),
  ('80063e1a-bbea-4267-9c7a-6bccba501083', '00000000-0000-0000-0000-000000000001', '50f24d54-9829-49b8-9acd-41fbba0d2485', '6143b3cd-8724-416c-832e-007726949562', NULL, 'credit', 'grand_total', '3', 'Hutang Usaha', 'false', '2026-06-05 16:03:12.323838+00'),
  ('6b32f363-fa5c-4259-8b5f-74789853adf4', '00000000-0000-0000-0000-000000000001', '62c94ae2-d3e5-4487-b5fc-9e7ed58e262d', NULL, 'ar_bank_coa', 'debit', 'kas_neto', '1', 'Kas/Bank (neto)', 'false', '2026-06-08 03:34:46.328931+00'),
  ('1d0f39be-b25b-40df-8cc7-1d48723964b6', '00000000-0000-0000-0000-000000000001', '62c94ae2-d3e5-4487-b5fc-9e7ed58e262d', 'f50da11a-5db8-45eb-a6b8-36f83e2d23f8', NULL, 'debit', 'pph_amount', '2', 'PPh 23 Dibayar Dimuka (kredit pajak)', 'true', '2026-06-08 03:34:46.328931+00'),
  ('d5b4452a-8fc7-4522-a002-049ddfc452b7', '00000000-0000-0000-0000-000000000001', '62c94ae2-d3e5-4487-b5fc-9e7ed58e262d', '31008df0-1623-4daa-a075-316b3683530d', NULL, 'credit', 'bayar_sekarang', '3', 'Piutang Usaha (gross)', 'false', '2026-06-08 03:34:46.328931+00'),
  ('6dd687bc-e924-441c-a2bf-0b522e346f90', '00000000-0000-0000-0000-000000000001', 'bd29ca37-a24e-4aaa-9004-3ba07a734a42', NULL, 'pmb_expense_coa', 'debit', 'nominal_bayar', '1', 'Beban', 'false', '2026-06-06 22:49:39.126202+00'),
  ('f3c48f01-4d97-4191-aa5e-2a64b24426f9', '00000000-0000-0000-0000-000000000001', 'bd29ca37-a24e-4aaa-9004-3ba07a734a42', NULL, 'pmb_biaya_lain_coa', 'debit', 'biaya_lain_amount', '2', 'Biaya Lain', 'false', '2026-06-06 22:49:39.126202+00'),
  ('d1f80d79-98c0-404b-843e-9ef122cb8a7c', '00000000-0000-0000-0000-000000000001', 'bd29ca37-a24e-4aaa-9004-3ba07a734a42', 'c0560eb3-071b-4ab4-9d74-304c18a6a29a', NULL, 'credit', 'pph_amount', '3', 'Hutang PPh 23 (potong saat bayar)', 'true', '2026-06-06 22:49:39.126202+00'),
  ('4e126a34-a5c9-4a12-8ce4-7b84bcd98eba', '00000000-0000-0000-0000-000000000001', 'bd29ca37-a24e-4aaa-9004-3ba07a734a42', NULL, 'pmb_bank_coa', 'credit', 'kas_neto', '4', 'Kas/Bank (neto)', 'false', '2026-06-06 22:49:39.126202+00'),
  ('1e033389-367b-43a3-87ab-ef41f2ac8d09', '00000000-0000-0000-0000-000000000001', 'c38b3972-1f97-4df3-ba75-61b019532163', '6143b3cd-8724-416c-832e-007726949562', NULL, 'debit', 'bayar_sekarang', '1', 'Hutang Usaha (gross)', 'false', '2026-06-06 13:36:36.406257+00'),
  ('224d40fb-3f49-438e-b163-94ba618dd37b', '00000000-0000-0000-0000-000000000001', 'c38b3972-1f97-4df3-ba75-61b019532163', 'c0560eb3-071b-4ab4-9d74-304c18a6a29a', NULL, 'credit', 'pph_amount', '2', 'Hutang PPh 23 (potong saat bayar)', 'true', '2026-06-06 13:36:36.406257+00'),
  ('42278d12-a39c-4aee-a99c-141baf3d132b', '00000000-0000-0000-0000-000000000001', 'c38b3972-1f97-4df3-ba75-61b019532163', NULL, 'ap_bank_coa', 'credit', 'kas_neto', '3', 'Kas/Bank (neto)', 'false', '2026-06-06 13:36:36.406257+00'),
  ('bd5d561a-5ee9-4aa0-9033-37460d796ee9', '00000000-0000-0000-0000-000000000001', 'f3e422fc-0124-4f1c-aff7-130abdd38e39', '31008df0-1623-4daa-a075-316b3683530d', NULL, 'debit', 'total_piutang', '1', 'Piutang Usaha', 'false', '2026-06-05 16:03:12.323838+00'),
  ('02bad8fa-4b81-4332-a692-8b3613f4f0f4', '00000000-0000-0000-0000-000000000001', 'f3e422fc-0124-4f1c-aff7-130abdd38e39', NULL, 'invoice_revenue_coa', 'credit', 'subtotal', '2', 'Pendapatan', 'false', '2026-06-05 16:03:12.323838+00'),
  ('a2a5bbe4-65ab-4459-9f1a-1b361a1225bd', '00000000-0000-0000-0000-000000000001', 'f3e422fc-0124-4f1c-aff7-130abdd38e39', 'd11b1d61-664d-415a-9b4e-8e05e35717fb', NULL, 'credit', 'pajak', '3', 'PPN Keluaran', 'true', '2026-06-05 16:03:12.323838+00');

COMMIT;
