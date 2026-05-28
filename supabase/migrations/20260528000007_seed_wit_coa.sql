-- =====================================================
-- Seed: WIT.ID Chart of Accounts (5-Layer)
-- Covers: IS (P&L) + BS (Balance Sheet) per PSAK
-- TRUNCATES all finance mock data before seeding
-- =====================================================

-- Clear in dependency order
TRUNCATE TABLE public.trial_balance_snapshots CASCADE;
TRUNCATE TABLE public.fiscal_period_journal_locks CASCADE;
TRUNCATE TABLE public.journal_line_cost_centers CASCADE;
TRUNCATE TABLE public.journal_lines CASCADE;
TRUNCATE TABLE public.journal_entries CASCADE;
TRUNCATE TABLE public.coa CASCADE;

-- ─────────────────────────────────────────────────────────────────
-- L1: CATEGORY
-- ─────────────────────────────────────────────────────────────────
INSERT INTO public.coa (
  tenant_id, account_code, account_name, account_type, level, normal_balance,
  coa_layer, enum_laporan_keuangan, enum_laporan_keuangan_category,
  is_active, is_budgeted, sort_order
) VALUES
  ('00000000-0000-0000-0000-000000000001','1','AKTIVA','asset',1,'debit','category','BALANCE_SHEET','ASSET',true,false,1),
  ('00000000-0000-0000-0000-000000000001','2','KEWAJIBAN','liability',1,'credit','category','BALANCE_SHEET','LIABILITY',true,false,2),
  ('00000000-0000-0000-0000-000000000001','3','EKUITAS','equity',1,'credit','category','BALANCE_SHEET','EQUITY',true,false,3),
  ('00000000-0000-0000-0000-000000000001','4','PENDAPATAN','revenue',1,'credit','category','INCOME_STATEMENT','REVENUE',true,true,10),
  ('00000000-0000-0000-0000-000000000001','5','BEBAN POKOK PENDAPATAN','expense',1,'debit','category','INCOME_STATEMENT','COGS',true,true,20),
  ('00000000-0000-0000-0000-000000000001','6','BEBAN OPERASIONAL','expense',1,'debit','category','INCOME_STATEMENT','OPEX',true,true,30),
  ('00000000-0000-0000-0000-000000000001','7','PENDAPATAN LAIN-LAIN','revenue',1,'credit','category','INCOME_STATEMENT','OTHER_INCOME',true,false,40),
  ('00000000-0000-0000-0000-000000000001','8','BEBAN LAIN-LAIN','expense',1,'debit','category','INCOME_STATEMENT','OTHER_EXPENSE',true,false,50);

-- ─────────────────────────────────────────────────────────────────
-- L2: TYPE (uses parent lookup by account_code)
-- Columns: code, name, atype, nb, lk, lkc, bud, so, parent_code
-- ─────────────────────────────────────────────────────────────────
INSERT INTO public.coa (
  tenant_id, parent_account_id, account_code, account_name,
  account_type, level, normal_balance, coa_layer,
  enum_laporan_keuangan, enum_laporan_keuangan_category,
  is_active, is_budgeted, sort_order
)
SELECT
  '00000000-0000-0000-0000-000000000001', p.id,
  v.code, v.name, v.atype, 2, v.nb, 'type',
  v.lk, v.lkc, true, v.bud, v.so
FROM (VALUES
  -- BS: Aktiva
  ('1-10000','Aktiva Lancar','asset','debit','BALANCE_SHEET','ASSET',false,1,'1'),
  ('1-20000','Aktiva Tidak Lancar','asset','debit','BALANCE_SHEET','ASSET',false,2,'1'),
  -- BS: Kewajiban
  ('2-10000','Kewajiban Lancar','liability','credit','BALANCE_SHEET','LIABILITY',false,1,'2'),
  ('2-20000','Kewajiban Jangka Panjang','liability','credit','BALANCE_SHEET','LIABILITY',false,2,'2'),
  -- BS: Ekuitas
  ('3-10000','Modal','equity','credit','BALANCE_SHEET','EQUITY',false,1,'3'),
  ('3-20000','Saldo Laba','equity','credit','BALANCE_SHEET','EQUITY',false,2,'3'),
  -- IS: Pendapatan
  ('4-40000','Project Based Revenue','revenue','credit','INCOME_STATEMENT','REVENUE',true,1,'4'),
  ('4-40100','Maintenance / Recurring Revenue','revenue','credit','INCOME_STATEMENT','REVENUE',true,2,'4'),
  ('4-40700','Sales Discount','revenue','credit','INCOME_STATEMENT','REVENUE',false,3,'4'),
  -- IS: COGS
  ('5-50000','Beban Pokok Pendapatan','expense','debit','INCOME_STATEMENT','COGS',true,1,'5'),
  -- IS: OPEX
  ('6-60100','General & Administrative Expenses','expense','debit','INCOME_STATEMENT','OPEX',true,1,'6'),
  ('6-60200','3rd Party Expenses','expense','debit','INCOME_STATEMENT','OPEX',true,2,'6'),
  ('6-60300','Fee / Bonus','expense','debit','INCOME_STATEMENT','OPEX',true,3,'6'),
  ('6-60400','Depresiasi & Amortisasi','expense','debit','INCOME_STATEMENT','OPEX',true,4,'6'),
  ('6-60221','Beban Pajak','expense','debit','INCOME_STATEMENT','TAX_EXPENSE',false,5,'6'),
  -- IS: Other Income
  ('7-70000','Interest Income - Bank','revenue','credit','INCOME_STATEMENT','OTHER_INCOME',false,1,'7'),
  ('7-70099','Pendapatan Non Operasional - Lain-Lain','revenue','credit','INCOME_STATEMENT','OTHER_INCOME',false,2,'7'),
  -- IS: Other Expense
  ('8-80000','Beban Non Operasional','expense','debit','INCOME_STATEMENT','OTHER_EXPENSE',false,1,'8')
) v(code, name, atype, nb, lk, lkc, bud, so, parent_code)
JOIN public.coa p
  ON p.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND p.account_code = v.parent_code;

-- ─────────────────────────────────────────────────────────────────
-- L3: SUB ACCOUNT
-- ─────────────────────────────────────────────────────────────────
INSERT INTO public.coa (
  tenant_id, parent_account_id, account_code, account_name,
  account_type, level, normal_balance, coa_layer,
  enum_laporan_keuangan, enum_laporan_keuangan_category,
  enum_cost_category, enum_cf_section,
  is_active, is_budgeted, is_working_capital, is_non_cash_item, sort_order
)
SELECT
  '00000000-0000-0000-0000-000000000001', p.id,
  v.code, v.name, v.atype, 3, v.nb, 'sub_account',
  v.lk, v.lkc, NULLIF(v.cc,''), NULLIF(v.cf,''),
  true, v.bud, v.wc, v.nc, v.so
FROM (VALUES
  -- ── BS: Aktiva Lancar (1-10000) ──────────────────────────────────────
  ('1-10001','Kas','asset','debit','BALANCE_SHEET','ASSET','','',false,false,true,false,1,'1-10000'),
  ('1-10002','Bank','asset','debit','BALANCE_SHEET','ASSET','','',false,false,false,false,2,'1-10000'),
  ('1-10003','Deposito & Investasi JK Pendek','asset','debit','BALANCE_SHEET','ASSET','','',false,false,false,false,3,'1-10000'),
  ('1-10100','Piutang Usaha','asset','debit','BALANCE_SHEET','ASSET','','',false,false,true,false,4,'1-10000'),
  ('1-10200','Piutang Lain-lain','asset','debit','BALANCE_SHEET','ASSET','','',false,false,true,false,5,'1-10000'),
  ('1-10300','Uang Muka & Biaya Dibayar Dimuka','asset','debit','BALANCE_SHEET','ASSET','','',false,false,true,false,6,'1-10000'),
  ('1-10400','Pajak Dibayar Dimuka','asset','debit','BALANCE_SHEET','ASSET','','',false,false,false,false,7,'1-10000'),
  -- ── BS: Aktiva Tidak Lancar (1-20000) ───────────────────────────────
  ('1-20001','Aset Tetap Berwujud','asset','debit','BALANCE_SHEET','ASSET','','INVESTING',false,false,false,false,1,'1-20000'),
  ('1-20002','Aset Tak Berwujud','asset','debit','BALANCE_SHEET','ASSET','','INVESTING',false,false,false,false,2,'1-20000'),
  ('1-20003','Aset Lain-lain','asset','debit','BALANCE_SHEET','ASSET','','INVESTING',false,false,false,false,3,'1-20000'),
  -- ── BS: Kewajiban Lancar (2-10000) ──────────────────────────────────
  ('2-10100','Hutang Usaha','liability','credit','BALANCE_SHEET','LIABILITY','','',false,false,true,false,1,'2-10000'),
  ('2-10200','Hutang Pajak','liability','credit','BALANCE_SHEET','LIABILITY','','',false,false,true,false,2,'2-10000'),
  ('2-10300','Hutang Gaji & Tunjangan','liability','credit','BALANCE_SHEET','LIABILITY','','',false,false,true,false,3,'2-10000'),
  ('2-10400','Pendapatan Diterima Dimuka','liability','credit','BALANCE_SHEET','LIABILITY','','',false,false,true,false,4,'2-10000'),
  ('2-10500','Biaya Masih Harus Dibayar','liability','credit','BALANCE_SHEET','LIABILITY','','',false,false,true,false,5,'2-10000'),
  -- ── BS: Kewajiban JK Panjang (2-20000) ──────────────────────────────
  ('2-20100','Hutang Bank JK Panjang','liability','credit','BALANCE_SHEET','LIABILITY','','FINANCING',false,false,false,false,1,'2-20000'),
  ('2-20200','Hutang Pemegang Saham','liability','credit','BALANCE_SHEET','LIABILITY','','FINANCING',false,false,false,false,2,'2-20000'),
  -- ── BS: Modal (3-10000) ──────────────────────────────────────────────
  ('3-10001','Modal Disetor','equity','credit','BALANCE_SHEET','EQUITY','','FINANCING',false,false,false,false,1,'3-10000'),
  -- ── BS: Saldo Laba (3-20000) ─────────────────────────────────────────
  ('3-20001','Saldo Laba Ditahan','equity','credit','BALANCE_SHEET','EQUITY','','',false,false,false,false,1,'3-20000'),
  ('3-20002','Laba Tahun Berjalan','equity','credit','BALANCE_SHEET','EQUITY','','',false,false,false,false,2,'3-20000'),
  -- ── IS: Pendapatan (4-40000) ─────────────────────────────────────────
  ('4-40000-1','Project Based - Project Revenue','revenue','credit','INCOME_STATEMENT','REVENUE','','',true,false,false,false,1,'4-40000'),
  ('4-40000-2','Project Based - MaaS Revenue','revenue','credit','INCOME_STATEMENT','REVENUE','','',true,false,false,false,2,'4-40000'),
  ('4-40000-3','Project Based - WMS Revenue','revenue','credit','INCOME_STATEMENT','REVENUE','','',true,false,false,false,3,'4-40000'),
  ('4-40000-4','Project Based - Procurement Revenue','revenue','credit','INCOME_STATEMENT','REVENUE','','',true,false,false,false,4,'4-40000'),
  ('4-40000-5','Project Based - Website Revenue','revenue','credit','INCOME_STATEMENT','REVENUE','','',true,false,false,false,5,'4-40000'),
  ('4-40000-6','Project Based - Hosting Revenue','revenue','credit','INCOME_STATEMENT','REVENUE','','',true,false,false,false,6,'4-40000'),
  ('4-40000-7','Project Based - Domain Revenue','revenue','credit','INCOME_STATEMENT','REVENUE','','',true,false,false,false,7,'4-40000'),
  ('4-40000-8','Project Based - Consultant Revenue','revenue','credit','INCOME_STATEMENT','REVENUE','','',true,false,false,false,8,'4-40000'),
  ('4-40000-9','Project Based - Add on / Change Request','revenue','credit','INCOME_STATEMENT','REVENUE','','',true,false,false,false,9,'4-40000'),
  ('4-40000-99','Project Based - Lain Lain','revenue','credit','INCOME_STATEMENT','REVENUE','','',true,false,false,false,99,'4-40000'),
  -- 4-40100 sub accounts
  ('4-40100-1','MTN/R - Project Revenue','revenue','credit','INCOME_STATEMENT','REVENUE','','',true,false,false,false,1,'4-40100'),
  ('4-40100-2','MTN/R - WMS Revenue','revenue','credit','INCOME_STATEMENT','REVENUE','','',true,false,false,false,2,'4-40100'),
  ('4-40100-3','MTN/R - Spa Management System Revenue','revenue','credit','INCOME_STATEMENT','REVENUE','','',true,false,false,false,3,'4-40100'),
  ('4-40100-4','MTN/R - Leisure & Park Mgmt System Revenue','revenue','credit','INCOME_STATEMENT','REVENUE','','',true,false,false,false,4,'4-40100'),
  ('4-40100-5','MTN/R - Website Revenue','revenue','credit','INCOME_STATEMENT','REVENUE','','',true,false,false,false,5,'4-40100'),
  ('4-40100-6','MTN/R - Manage Service','revenue','credit','INCOME_STATEMENT','REVENUE','','',true,false,false,false,6,'4-40100'),
  -- ── IS: COGS sub_accounts (5-50000) ─────────────────────────────────
  ('5-50000-1','Fee / Bonus','expense','debit','INCOME_STATEMENT','COGS','','',true,false,false,false,1,'5-50000'),
  ('5-50000-2','3rd Party - Vendor / Partner','expense','debit','INCOME_STATEMENT','COGS','','',true,false,false,false,2,'5-50000'),
  ('5-50000-3','3rd Party - Server / Hosting','expense','debit','INCOME_STATEMENT','COGS','TECHNOLOGY','',true,false,false,false,3,'5-50000'),
  ('5-50000-4','Other COGS','expense','debit','INCOME_STATEMENT','COGS','','',true,false,false,false,4,'5-50000'),
  ('5-50000-5','Other COGS - Miscellaneous','expense','debit','INCOME_STATEMENT','COGS','','',true,false,false,false,5,'5-50000'),
  -- ── IS: OPEX sub_accounts (6-60100 G&A) ─────────────────────────────
  ('6-60100-1','Gaji Pokok (Payroll/Salary)','expense','debit','INCOME_STATEMENT','OPEX','PERSONNEL','',true,false,false,false,1,'6-60100'),
  ('6-60100-2','Tunjangan Hari Raya (THR)','expense','debit','INCOME_STATEMENT','OPEX','PERSONNEL','',true,false,false,false,2,'6-60100'),
  ('6-60100-4','Marketing Expenses','expense','debit','INCOME_STATEMENT','OPEX','MARKETING','',true,false,false,false,4,'6-60100'),
  ('6-60100-6','Asisten Rumah Tangga (ART)','expense','debit','INCOME_STATEMENT','OPEX','OVERHEAD','',true,false,false,false,6,'6-60100'),
  ('6-60100-7','Security','expense','debit','INCOME_STATEMENT','OPEX','OVERHEAD','',true,false,false,false,7,'6-60100'),
  ('6-60100-8','Infaq','expense','debit','INCOME_STATEMENT','OPEX','OVERHEAD','',false,false,false,false,8,'6-60100'),
  ('6-60100-9','Insurance','expense','debit','INCOME_STATEMENT','OPEX','PERSONNEL','',true,false,false,false,9,'6-60100'),
  ('6-60100-10','BPJS','expense','debit','INCOME_STATEMENT','OPEX','PERSONNEL','',true,false,false,false,10,'6-60100'),
  ('6-60100-11','Electricity','expense','debit','INCOME_STATEMENT','OPEX','OPERATIONAL','',true,false,false,false,11,'6-60100'),
  ('6-60100-12','Phone','expense','debit','INCOME_STATEMENT','OPEX','OPERATIONAL','',true,false,false,false,12,'6-60100'),
  ('6-60100-13','Biznet Sukakarya','expense','debit','INCOME_STATEMENT','OPEX','OPERATIONAL','',true,false,false,false,13,'6-60100'),
  ('6-60100-15','Cleanliness / Kebersihan','expense','debit','INCOME_STATEMENT','OPEX','OVERHEAD','',true,false,false,false,15,'6-60100'),
  ('6-60100-16','Parking','expense','debit','INCOME_STATEMENT','OPEX','OVERHEAD','',true,false,false,false,16,'6-60100'),
  ('6-60100-17','Cicilan Rent Office / Kontrakan','expense','debit','INCOME_STATEMENT','OPEX','OPERATIONAL','',true,false,false,false,17,'6-60100'),
  ('6-60100-18','Marketing Fee External - Nix','expense','debit','INCOME_STATEMENT','OPEX','MARKETING','',true,false,false,false,18,'6-60100'),
  ('6-60100-19','Olahraga','expense','debit','INCOME_STATEMENT','OPEX','OVERHEAD','',false,false,false,false,19,'6-60100'),
  ('6-60100-20','Surat Perintah Perjalanan Dinas','expense','debit','INCOME_STATEMENT','OPEX','OPERATIONAL','',true,false,false,false,20,'6-60100'),
  ('6-60100-21','Biaya Entertainment','expense','debit','INCOME_STATEMENT','OPEX','OVERHEAD','',true,false,false,false,21,'6-60100'),
  ('6-60100-23','Biaya Inventaris Kantor','expense','debit','INCOME_STATEMENT','OPEX','OVERHEAD','',true,false,false,false,23,'6-60100'),
  ('6-60100-99','Biaya Lain-lain','expense','debit','INCOME_STATEMENT','OPEX','OVERHEAD','',true,false,false,false,99,'6-60100'),
  -- IS: OPEX 6-60200
  ('6-60200-1','3rd Party - BBF Agensi Pajak','expense','debit','INCOME_STATEMENT','OPEX','OVERHEAD','',true,false,false,false,1,'6-60200'),
  ('6-60200-2','3rd Party - Postman','expense','debit','INCOME_STATEMENT','OPEX','TECHNOLOGY','',true,false,false,false,2,'6-60200'),
  ('6-60200-3','3rd Party - Figma','expense','debit','INCOME_STATEMENT','OPEX','TECHNOLOGY','',true,false,false,false,3,'6-60200'),
  ('6-60200-4','3rd Party - Google Workspace (Internal WIT.ID)','expense','debit','INCOME_STATEMENT','OPEX','TECHNOLOGY','',true,false,false,false,4,'6-60200'),
  ('6-60200-99','3rd Party Expenses - Lain Lain','expense','debit','INCOME_STATEMENT','OPEX','TECHNOLOGY','',true,false,false,false,99,'6-60200'),
  -- IS: OPEX 6-60300
  ('6-60300-1','Fee / Bonus - Marketing Fee External','expense','debit','INCOME_STATEMENT','OPEX','MARKETING','',true,false,false,false,1,'6-60300'),
  ('6-60300-2','Fee / Bonus - Marketing Internal','expense','debit','INCOME_STATEMENT','OPEX','MARKETING','',true,false,false,false,2,'6-60300'),
  ('6-60300-5','Fee / Bonus - Management Fee','expense','debit','INCOME_STATEMENT','OPEX','OVERHEAD','',true,false,false,false,5,'6-60300'),
  -- IS: Depreciation (6-60400) — non-cash items for CF
  ('6-60400-1','Depresiasi Aset Tetap','expense','debit','INCOME_STATEMENT','OPEX','OVERHEAD','',true,false,false,true,1,'6-60400'),
  ('6-60400-2','Amortisasi Aset Tak Berwujud','expense','debit','INCOME_STATEMENT','OPEX','OVERHEAD','',true,false,false,true,2,'6-60400'),
  -- IS: Tax sub_accounts (6-60221)
  ('6-60222','Beban Pajak - PPh 21','expense','debit','INCOME_STATEMENT','TAX_EXPENSE','','',false,false,false,false,1,'6-60221'),
  ('6-60223','Beban Pajak - PPh 23','expense','debit','INCOME_STATEMENT','TAX_EXPENSE','','',false,false,false,false,2,'6-60221'),
  ('6-60224','Beban Pajak - PPh 4(2)','expense','debit','INCOME_STATEMENT','TAX_EXPENSE','','',false,false,false,false,3,'6-60221'),
  ('6-60225','Beban Pajak - PPN','expense','debit','INCOME_STATEMENT','TAX_EXPENSE','','',false,false,false,false,4,'6-60221'),
  ('6-60226','Beban Pajak - PPh 25','expense','debit','INCOME_STATEMENT','TAX_EXPENSE','','',false,false,false,false,5,'6-60221'),
  -- IS: Other Expense sub_accounts (8-80000)
  ('8-80003','Bank Taxes','expense','debit','INCOME_STATEMENT','OTHER_EXPENSE','','',false,false,false,false,1,'8-80000'),
  ('8-80006','Employee Loan','expense','debit','INCOME_STATEMENT','OTHER_EXPENSE','','',false,false,false,false,2,'8-80000'),
  ('8-80007','Office Renovation','expense','debit','INCOME_STATEMENT','OTHER_EXPENSE','','',false,false,false,false,3,'8-80000'),
  ('8-80009','Bank Administration','expense','debit','INCOME_STATEMENT','OTHER_EXPENSE','','',false,false,false,false,4,'8-80000'),
  ('8-80010','WWW Coffee','expense','debit','INCOME_STATEMENT','OTHER_EXPENSE','','',false,false,false,false,5,'8-80000'),
  ('8-80012','Ultah WIT.ID','expense','debit','INCOME_STATEMENT','OTHER_EXPENSE','','',false,false,false,false,6,'8-80000'),
  ('8-80013','Hampers WIT.ID','expense','debit','INCOME_STATEMENT','OTHER_EXPENSE','','',false,false,false,false,7,'8-80000'),
  ('8-80014','Buka Bersama','expense','debit','INCOME_STATEMENT','OTHER_EXPENSE','','',false,false,false,false,8,'8-80000')
) v(code, name, atype, nb, lk, lkc, cc, cf, bud, xxx, wc, nc, so, parent_code)
JOIN public.coa p
  ON p.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND p.account_code = v.parent_code;

-- ─────────────────────────────────────────────────────────────────
-- L4: GENERAL LEDGER
-- ─────────────────────────────────────────────────────────────────
INSERT INTO public.coa (
  tenant_id, parent_account_id, account_code, account_name,
  account_type, level, normal_balance, coa_layer,
  enum_laporan_keuangan, enum_laporan_keuangan_category,
  contra_account, is_active, is_budgeted, is_trial_balance, sort_order
)
SELECT
  '00000000-0000-0000-0000-000000000001', p.id,
  v.code, v.name, v.atype, 4, v.nb, 'general_ledger',
  v.lk, v.lkc, v.contra, true, v.bud, true, v.so
FROM (VALUES
  -- ── BS: Kas (1-10001) ──────────────────────────────────────────────
  ('1-10001-1','Kas Kecil IDR','asset','debit','BALANCE_SHEET','ASSET',false,false,1,'1-10001'),
  -- ── BS: Bank (1-10002) ─────────────────────────────────────────────
  ('1-10002-1','BCA Operational 008-044-9739 (Irfan Arsandi)','asset','debit','BALANCE_SHEET','ASSET',false,false,1,'1-10002'),
  ('1-10002-2','BCA Development 008-323-4170 (Irfan Arsandi)','asset','debit','BALANCE_SHEET','ASSET',false,false,2,'1-10002'),
  ('1-10002-3','Mandiri 132-00-2268-3131 (PT. WIT)','asset','debit','BALANCE_SHEET','ASSET',false,false,3,'1-10002'),
  ('1-10002-4','Mandiri 1022 (PT. WIT RSHS)','asset','debit','BALANCE_SHEET','ASSET',false,false,4,'1-10002'),
  ('1-10002-5','Mandiri 5591 (PT. WIT)','asset','debit','BALANCE_SHEET','ASSET',false,false,5,'1-10002'),
  ('1-10002-6','BRI (CV. Warmup)','asset','debit','BALANCE_SHEET','ASSET',false,false,6,'1-10002'),
  -- ── BS: Deposito (1-10003) ─────────────────────────────────────────
  ('1-10003-1','Deposito JK Pendek','asset','debit','BALANCE_SHEET','ASSET',false,false,1,'1-10003'),
  -- ── BS: Piutang Usaha (1-10100) ────────────────────────────────────
  ('1-10100-1','Piutang Usaha - Lokal','asset','debit','BALANCE_SHEET','ASSET',false,false,1,'1-10100'),
  ('1-10100-2','Piutang Usaha - Luar Negeri','asset','debit','BALANCE_SHEET','ASSET',false,false,2,'1-10100'),
  ('1-10100-9','Penyisihan Piutang Tak Tertagih','asset','credit','BALANCE_SHEET','ASSET',true,false,9,'1-10100'),
  -- ── BS: Piutang Lain (1-10200) ─────────────────────────────────────
  ('1-10200-1','Piutang Karyawan','asset','debit','BALANCE_SHEET','ASSET',false,false,1,'1-10200'),
  ('1-10200-9','Piutang Lain-lain','asset','debit','BALANCE_SHEET','ASSET',false,false,9,'1-10200'),
  -- ── BS: Uang Muka (1-10300) ────────────────────────────────────────
  ('1-10300-1','Biaya Dibayar Dimuka','asset','debit','BALANCE_SHEET','ASSET',false,false,1,'1-10300'),
  ('1-10300-2','Uang Muka Vendor','asset','debit','BALANCE_SHEET','ASSET',false,false,2,'1-10300'),
  -- ── BS: Pajak Dimuka (1-10400) ─────────────────────────────────────
  ('1-10400-1','PPN Masukan','asset','debit','BALANCE_SHEET','ASSET',false,false,1,'1-10400'),
  ('1-10400-2','PPh 25 Dibayar Dimuka','asset','debit','BALANCE_SHEET','ASSET',false,false,2,'1-10400'),
  -- ── BS: Aset Tetap (1-20001) ───────────────────────────────────────
  ('1-20001-1','Peralatan & Komputer','asset','debit','BALANCE_SHEET','ASSET',false,false,1,'1-20001'),
  ('1-20001-2','Kendaraan','asset','debit','BALANCE_SHEET','ASSET',false,false,2,'1-20001'),
  ('1-20001-3','Inventaris Kantor','asset','debit','BALANCE_SHEET','ASSET',false,false,3,'1-20001'),
  ('1-20001-9','Akumulasi Penyusutan Aset Tetap','asset','credit','BALANCE_SHEET','ASSET',true,false,9,'1-20001'),
  -- ── BS: Aset Tak Berwujud (1-20002) ────────────────────────────────
  ('1-20002-1','Software & Lisensi','asset','debit','BALANCE_SHEET','ASSET',false,false,1,'1-20002'),
  ('1-20002-9','Akumulasi Amortisasi','asset','credit','BALANCE_SHEET','ASSET',true,false,9,'1-20002'),
  -- ── BS: Aset Lain (1-20003) ────────────────────────────────────────
  ('1-20003-1','Deposito Jaminan','asset','debit','BALANCE_SHEET','ASSET',false,false,1,'1-20003'),
  ('1-20003-2','Aset Pajak Tangguhan','asset','debit','BALANCE_SHEET','ASSET',false,false,2,'1-20003'),
  -- ── BS: Hutang Usaha (2-10100) ─────────────────────────────────────
  ('2-10100-1','Hutang Vendor','liability','credit','BALANCE_SHEET','LIABILITY',false,false,1,'2-10100'),
  ('2-10100-2','Hutang Partner','liability','credit','BALANCE_SHEET','LIABILITY',false,false,2,'2-10100'),
  -- ── BS: Hutang Pajak (2-10200) ─────────────────────────────────────
  ('2-10200-1','Hutang PPh 21','liability','credit','BALANCE_SHEET','LIABILITY',false,false,1,'2-10200'),
  ('2-10200-2','Hutang PPh 23','liability','credit','BALANCE_SHEET','LIABILITY',false,false,2,'2-10200'),
  ('2-10200-3','Hutang PPh 4(2)','liability','credit','BALANCE_SHEET','LIABILITY',false,false,3,'2-10200'),
  ('2-10200-4','Hutang PPN','liability','credit','BALANCE_SHEET','LIABILITY',false,false,4,'2-10200'),
  ('2-10200-5','Hutang PPh 25','liability','credit','BALANCE_SHEET','LIABILITY',false,false,5,'2-10200'),
  -- ── BS: Hutang Gaji (2-10300) ──────────────────────────────────────
  ('2-10300-1','Hutang Gaji','liability','credit','BALANCE_SHEET','LIABILITY',false,false,1,'2-10300'),
  ('2-10300-2','Hutang THR Akrual','liability','credit','BALANCE_SHEET','LIABILITY',false,false,2,'2-10300'),
  -- ── BS: Pendapatan Dimuka (2-10400) ────────────────────────────────
  ('2-10400-1','DP Project Belum Diakui','liability','credit','BALANCE_SHEET','LIABILITY',false,false,1,'2-10400'),
  -- ── BS: Biaya Akrual (2-10500) ─────────────────────────────────────
  ('2-10500-1','Biaya Masih Harus Dibayar','liability','credit','BALANCE_SHEET','LIABILITY',false,false,1,'2-10500'),
  -- ── BS: Hutang Bank JK Panjang (2-20100) ───────────────────────────
  ('2-20100-1','Hutang Bank BCA','liability','credit','BALANCE_SHEET','LIABILITY',false,false,1,'2-20100'),
  -- ── BS: Hutang Pemegang Saham (2-20200) ────────────────────────────
  ('2-20200-1','Hutang Pemegang Saham','liability','credit','BALANCE_SHEET','LIABILITY',false,false,1,'2-20200'),
  -- ── BS: Modal (3-10001) ────────────────────────────────────────────
  ('3-10001-1','Modal Saham PT. WIT','equity','credit','BALANCE_SHEET','EQUITY',false,false,1,'3-10001'),
  -- ── BS: Saldo Laba (3-20001, 3-20002) ─────────────────────────────
  ('3-20001-1','Akumulasi Laba Ditahan','equity','credit','BALANCE_SHEET','EQUITY',false,false,1,'3-20001'),
  ('3-20002-1','Laba Bersih Periode Berjalan','equity','credit','BALANCE_SHEET','EQUITY',false,false,1,'3-20002'),
  -- ── IS: COGS GL under 5-50000-1 (Fee/Bonus) ───────────────────────
  ('5-50000-1-3','Fee / Bonus - Project Member','expense','debit','INCOME_STATEMENT','COGS',false,true,3,'5-50000-1'),
  -- ── IS: COGS GL under 5-50000-2 (Partner) ─────────────────────────
  ('5-50000-2-2','Partner - Plabs','expense','debit','INCOME_STATEMENT','COGS',false,true,2,'5-50000-2'),
  ('5-50000-2-4','Partner - Reza Pahlevi','expense','debit','INCOME_STATEMENT','COGS',false,true,4,'5-50000-2'),
  ('5-50000-2-6','Partner - PT. MAST','expense','debit','INCOME_STATEMENT','COGS',false,true,6,'5-50000-2'),
  ('5-50000-2-8','Partner - PT. Jaya Integrasi Nusantara (JIN)','expense','debit','INCOME_STATEMENT','COGS',false,true,8,'5-50000-2'),
  ('5-50000-2-10','Partner - Artisun','expense','debit','INCOME_STATEMENT','COGS',false,true,10,'5-50000-2'),
  ('5-50000-2-11','Partner - WHITE','expense','debit','INCOME_STATEMENT','COGS',false,true,11,'5-50000-2'),
  -- ── IS: COGS GL under 5-50000-3 (Server/Hosting) ──────────────────
  ('5-50000-3-1','Server / Hosting - Niagahoster','expense','debit','INCOME_STATEMENT','COGS',false,true,1,'5-50000-3'),
  ('5-50000-3-2','Server / Hosting - Idcloudhost','expense','debit','INCOME_STATEMENT','COGS',false,true,2,'5-50000-3'),
  ('5-50000-3-4','Server / Hosting - Dracoola','expense','debit','INCOME_STATEMENT','COGS',false,true,4,'5-50000-3'),
  ('5-50000-3-10','Server / Hosting - Google Cloud Platform (GCP)','expense','debit','INCOME_STATEMENT','COGS',false,true,10,'5-50000-3'),
  ('5-50000-3-12','Server / Hosting - Jakarta Web Hosting','expense','debit','INCOME_STATEMENT','COGS',false,true,12,'5-50000-3'),
  ('5-50000-3-13','Server / Hosting - Microsoft Azure','expense','debit','INCOME_STATEMENT','COGS',false,true,13,'5-50000-3'),
  -- ── IS: COGS GL under 5-50000-4 (Other COGS) ──────────────────────
  ('5-50000-4-1','3rd Party - Biaya Domain','expense','debit','INCOME_STATEMENT','COGS',false,true,1,'5-50000-4'),
  -- ── IS: COGS GL under 5-50000-5 (Other COGS Misc) ─────────────────
  ('5-50000-5-1','Other COGS - Procurement','expense','debit','INCOME_STATEMENT','COGS',false,true,1,'5-50000-5'),
  ('5-50000-5-3','Other COGS - Plugin / Add Ons','expense','debit','INCOME_STATEMENT','COGS',false,true,3,'5-50000-5'),
  ('5-50000-5-4','Other COGS - Lain Lain','expense','debit','INCOME_STATEMENT','COGS',false,true,4,'5-50000-5'),
  ('5-50000-5-5','Other COGS - Google Workspace / GSuite','expense','debit','INCOME_STATEMENT','COGS',false,true,5,'5-50000-5')
) v(code, name, atype, nb, lk, lkc, contra, bud, so, parent_code)
JOIN public.coa p
  ON p.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND p.account_code = v.parent_code;

-- ─────────────────────────────────────────────────────────────────
-- 4-40700 Sales Discount: mark as contra_account
-- ─────────────────────────────────────────────────────────────────
UPDATE public.coa
SET contra_account = true
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND account_code = '4-40700';

-- ─────────────────────────────────────────────────────────────────
-- Set is_budgeted = true on all leaf IS accounts
-- (any account with no children in the IS tree)
-- ─────────────────────────────────────────────────────────────────
UPDATE public.coa c
SET is_budgeted = true
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND enum_laporan_keuangan = 'INCOME_STATEMENT'
  AND enum_laporan_keuangan_category IN ('REVENUE','COGS','OPEX')
  AND NOT EXISTS (
    SELECT 1 FROM public.coa child
    WHERE child.parent_account_id = c.id
      AND child.deleted_at IS NULL
  );

DO $$ BEGIN RAISE NOTICE 'WIT.ID COA seed complete.'; END $$;
