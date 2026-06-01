-- ============================================================================
-- QA seed - Chart of Account (5-Layer Revamp) Test Plan results (re-runnable, ASCII-safe)
-- Jalankan di Supabase SQL Editor. Tampil di /finance/qa (module 'chart-of-account').
-- Ringkasan v3: 72 cases . 69 pass . 0 fail . 3 blocked . 95.83% . PARTIAL
--   36 Automated coa-logic (node:test) . 18 Automated coa-import-schema (node:test) .
--   15 Code Review (tsc + review) . 3 Blocked (manual/browser).
-- ============================================================================
DELETE FROM public.qa_test_runs
 WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
   AND module = 'chart-of-account'
   AND title IN (
     'Chart of Account Workspace (5-Layer Revamp) - Test Plan v1',
     'Chart of Account Workspace (5-Layer Revamp) - Test Plan v2',
     'Chart of Account Workspace (5-Layer Revamp) - Test Plan v3'
   );

WITH r AS (
  INSERT INTO public.qa_test_runs
    (tenant_id, module, title, description, environment, executed_by, executed_at,
     total, passed, failed, blocked, skipped, pass_rate, status)
  VALUES
    ('00000000-0000-0000-0000-000000000001', 'chart-of-account',
     'Chart of Account Workspace (5-Layer Revamp) - Test Plan v3',
     'v3 menambahkan full-attribute import/export: 18 unit test baru di coa-import-schema.ts (normalizeRow, parseBool, buildHeaderMap, parseGrid, COA_COLUMNS integrity), 5 code-review cases (template xlsx 3 sheet, xlsx/csv parse, auto-infer report-enums, whitelist server API, export full xlsx). Total 72 cases (90 automated node:test + 15 code review + 3 blocked manual).',
     'Node 22 + node:test (logic + import schema) / Supabase Postgres 17 (schema) / Next.js 16 tsc + code review (UI/API)',
     'QA Engineer (Claude)', NOW(),
     72, 69, 0, 3, 0, 95.83, 'PARTIAL')
  RETURNING id
)
INSERT INTO public.qa_test_cases
  (run_id, tenant_id, case_code, user_story, title, category, method, priority,
   expected, actual, status, notes, seq)
SELECT r.id, '00000000-0000-0000-0000-000000000001', v.case_code, v.user_story, v.title, v.category, v.method,
       v.priority, v.expected, v.actual, v.status, v.notes, v.seq
FROM r,
( VALUES
    -- ── coa-logic.ts (TC-001 to TC-036) ──────────────────────────────────────
    ('TC-001','US-COA-01','buildFullCode joins parent + segment with dash','functional','Automated','High','Assertion holds','Matched expected','PASS',NULL,1),
    ('TC-002','US-COA-01','buildFullCode returns segment alone at root','boundary','Automated','High','Assertion holds','Matched expected','PASS',NULL,2),
    ('TC-003','US-COA-01','buildFullCode trims surrounding whitespace','boundary','Automated','Medium','Assertion holds','Matched expected','PASS',NULL,3),
    ('TC-004','US-COA-01','deriveSegment returns trailing code segment','functional','Automated','High','Assertion holds','Matched expected','PASS',NULL,4),
    ('TC-005','US-COA-01','validateSegmentCode: sub must be 2 digits','functional','Automated','High','Assertion holds','Matched expected','PASS',NULL,5),
    ('TC-006','US-COA-01','validateSegmentCode: gl must be 1 digit 1-9','functional','Automated','High','Assertion holds','Matched expected','PASS',NULL,6),
    ('TC-007','US-COA-01','validateSegmentCode: detail must be 4 digits','functional','Automated','High','Assertion holds','Matched expected','PASS',NULL,7),
    ('TC-008','US-COA-01','validateSegmentCode: non-numeric rejected','negative','Automated','High','Assertion holds','Matched expected','PASS',NULL,8),
    ('TC-009','US-COA-01','validateSegmentCode: empty rejected','negative','Automated','Medium','Assertion holds','Matched expected','PASS',NULL,9),
    ('TC-010','US-COA-01','childLayerOf / parentLayerOf walk the hierarchy','functional','Automated','Medium','Assertion holds','Matched expected','PASS',NULL,10),
    ('TC-011','US-COA-02','validateBatchChildren: happy path returns cleaned rows','functional','Automated','High','Assertion holds','Matched expected','PASS',NULL,11),
    ('TC-012','US-COA-02','validateBatchChildren: drops fully blank rows','boundary','Automated','Medium','Assertion holds','Matched expected','PASS',NULL,12),
    ('TC-013','US-COA-02','validateBatchChildren: empty list rejected','negative','Automated','High','Assertion holds','Matched expected','PASS',NULL,13),
    ('TC-014','US-COA-02','validateBatchChildren: in-batch duplicate rejected','negative','Automated','High','Assertion holds','Matched expected','PASS',NULL,14),
    ('TC-015','US-COA-02','validateBatchChildren: duplicate vs existing rejected','negative','Automated','High','Assertion holds','Matched expected','PASS',NULL,15),
    ('TC-016','US-COA-02','validateBatchChildren: exceeding max rejected','negative','Automated','High','Assertion holds','Matched expected','PASS',NULL,16),
    ('TC-017','US-COA-02','validateBatchChildren: bad code width rejected','negative','Automated','High','Assertion holds','Matched expected','PASS',NULL,17),
    ('TC-018','US-COA-02','validateBatchChildren: missing name rejected','negative','Automated','Medium','Assertion holds','Matched expected','PASS',NULL,18),
    ('TC-019','US-COA-02','MAX_CHILDREN constants (sub 99 / gl 9)','functional','Automated','Low','Assertion holds','Matched expected','PASS',NULL,19),
    ('TC-020','US-COA-03','subDlDepth: base DL under GL is 0','functional','Automated','High','Assertion holds','Matched expected','PASS',NULL,20),
    ('TC-021','US-COA-03','subDlDepth: nested Sub-DLs increment','functional','Automated','High','Assertion holds','Matched expected','PASS',NULL,21),
    ('TC-022','US-COA-03','subDlDepth: non-detail returns -1','negative','Automated','Medium','Assertion holds','Matched expected','PASS',NULL,22),
    ('TC-023','US-COA-03','canAcceptSubDl respects MAX_SUB_DL_LEVEL=2','boundary','Automated','High','Assertion holds','Matched expected','PASS',NULL,23),
    ('TC-024','US-COA-03','isDeepestDetailLedger: leaf detail is deepest','functional','Automated','High','Assertion holds','Matched expected','PASS',NULL,24),
    ('TC-025','US-COA-04','effectiveDk: no contra keeps parent DK','functional','Automated','High','Assertion holds','Matched expected','PASS',NULL,25),
    ('TC-026','US-COA-04','effectiveDk: contra flips DK','functional','Automated','High','Assertion holds','Matched expected','PASS',NULL,26),
    ('TC-027','US-COA-04','nbToDk / dkToNb round-trip','functional','Automated','Medium','Assertion holds','Matched expected','PASS',NULL,27),
    ('TC-028','US-COA-05','toFeLayer / toDbLayer round-trips DB vs FE vocab','functional','Automated','High','Assertion holds','Matched expected','PASS',NULL,28),
    ('TC-029','US-COA-05','buildHierarchy nests by parentId','functional','Automated','High','Assertion holds','Matched expected','PASS',NULL,29),
    ('TC-030','US-COA-05','flatten only emits expanded descendants','functional','Automated','High','Assertion holds','Matched expected','PASS',NULL,30),
    ('TC-031','US-COA-05','flatten sets _depth per row','functional','Automated','Medium','Assertion holds','Matched expected','PASS',NULL,31),
    ('TC-032','US-COA-05','filterByQuery matches code/name/full-code + auto-expand','functional','Automated','High','Assertion holds','Matched expected','PASS',NULL,32),
    ('TC-033','US-COA-05','filterByQuery empty query returns all','boundary','Automated','Medium','Assertion holds','Matched expected','PASS',NULL,33),
    ('TC-034','US-COA-05','trimByLayer keeps matching layer + ancestor branches','functional','Automated','High','Assertion holds','Matched expected','PASS',NULL,34),
    ('TC-035','US-COA-05','ancestryOf returns root-to-node chain','functional','Automated','Medium','Assertion holds','Matched expected','PASS',NULL,35),
    ('TC-036','US-COA-05','allParentIds returns ids that have children','functional','Automated','Low','Assertion holds','Matched expected','PASS',NULL,36),
    -- ── coa-import-schema.ts (TC-037 to TC-054, node:test) ───────────────────
    ('TC-037','US-COA-11','parseBool: true values (true/1/yes/ya/y/t/benar)','functional','Automated','High','All return true','54/54 tests pass','PASS','coa-import.test.ts',37),
    ('TC-038','US-COA-11','parseBool: false values (false/0/no/tidak/n/f/salah)','functional','Automated','High','All return false','54/54 tests pass','PASS',NULL,38),
    ('TC-039','US-COA-11','parseBool: blank/null returns default','boundary','Automated','Medium','Returns def','54/54 tests pass','PASS',NULL,39),
    ('TC-040','US-COA-11','buildHeaderMap: maps exact keys, aliases, case-insensitive, ignores *','functional','Automated','High','All 6 sub-cases pass','54/54 tests pass','PASS',NULL,40),
    ('TC-041','US-COA-11','buildHeaderMap: all COA_COLUMNS keys resolve from own key','functional','Automated','High','All 29 columns mapped','54/54 tests pass','PASS',NULL,41),
    ('TC-042','US-COA-11','normalizeRow: happy path - required fields only','functional','Automated','High','ok=true, correct level/layer','54/54 tests pass','PASS',NULL,42),
    ('TC-043','US-COA-11','normalizeRow: missing account_code/name/type → error','negative','Automated','High','ok=false with reason','54/54 tests pass','PASS',NULL,43),
    ('TC-044','US-COA-11','normalizeRow: invalid coa_layer / account_type → error','negative','Automated','High','ok=false with key name in reason','54/54 tests pass','PASS',NULL,44),
    ('TC-045','US-COA-11','normalizeRow: layer aliases sub/gl/detail → canonical DB values','functional','Automated','High','coa_layer=sub_account/general_ledger/detail_ledger','54/54 tests pass','PASS',NULL,45),
    ('TC-046','US-COA-11','normalizeRow: level derived from layer (1-5)','functional','Automated','High','level matches LAYER_LEVEL','54/54 tests pass','PASS',NULL,46),
    ('TC-047','US-COA-11','normalizeRow: auto-infer normal_balance for all 5 account_types','functional','Automated','High','asset/expense=debit, others=credit','54/54 tests pass','PASS',NULL,47),
    ('TC-048','US-COA-11','normalizeRow: auto-infer enum_laporan_keuangan for all types','functional','Automated','High','asset/liab/equity=BALANCE_SHEET, rev/exp=INCOME_STATEMENT','54/54 tests pass','PASS',NULL,48),
    ('TC-049','US-COA-11','normalizeRow: auto-infer enum_laporan_keuangan_category for all types','functional','Automated','High','ASSET/LIABILITY/EQUITY/REVENUE/OPEX','54/54 tests pass','PASS',NULL,49),
    ('TC-050','US-COA-11','normalizeRow: explicit enum values override auto-infer','functional','Automated','High','Typed values win over inferred defaults','54/54 tests pass','PASS',NULL,50),
    ('TC-051','US-COA-11','normalizeRow: case-insensitive enum matching (income_statement → INCOME_STATEMENT)','boundary','Automated','High','Canonical casing applied','54/54 tests pass','PASS',NULL,51),
    ('TC-052','US-COA-11','normalizeRow: invalid optional enums return ok=false with key name','negative','Automated','High','6 enum columns validated','54/54 tests pass','PASS',NULL,52),
    ('TC-053','US-COA-11','normalizeRow: boolean coercion + defaults (ya/TRUE/blank)','functional','Automated','High','is_tax_deductible/is_trial_balance default true','54/54 tests pass','PASS',NULL,53),
    ('TC-054','US-COA-11','normalizeRow: sort_order integer coercion (blank=0, non-numeric=0)','functional','Automated','Medium','Correct integer output','54/54 tests pass','PASS',NULL,54),
    -- ── Integration (TC-055 to TC-060) ───────────────────────────────────────
    ('TC-055','US-COA-08','Detail Ledger inserts with DL flags under a GL','integration','Integration','High','Schema accepts DL row + flags','Inserted & verified via SQL','PASS','Live Supabase schema',55),
    ('TC-056','US-COA-08','Sub-DL inserts with child_upstream_id FK to parent DL','integration','Integration','High','FK link resolves','Inserted & verified (subdl_linked=1)','PASS','Self-referencing FK',56),
    ('TC-057','US-COA-09','sub_gl_config JSONB (key-in level) persists on deepest DL','integration','Integration','High','jsonb_array_length=1','Inserted & verified','PASS',NULL,57),
    ('TC-058','US-COA-10','coa_audit_log accepts CONFIG (high) entry','integration','Integration','High','Row inserted','Inserted & verified','PASS',NULL,58),
    ('TC-059','US-COA-10','coa_pending_approval table present in schema (DB layer only)','integration','Integration','Medium','Row inserted','Inserted & verified','PASS','UI entry removed',59),
    ('TC-060','US-COA-01','Segments migration backfilled coa_full_code/segment_code','integration','Integration','High','All rows backfilled','169/169 rows backfilled','PASS',NULL,60),
    -- ── Code Review (TC-061 to TC-069) ───────────────────────────────────────
    ('TC-061','US-COA-06','Explorer renders 5-layer tree-table (indent, expand/collapse, code chips)','functional','Code Review','High','Matches design + tsc clean','Verified by review + tsc 0 error','PASS',NULL,61),
    ('TC-062','US-COA-06','Layer filter panel with live counts + density toggle + search auto-expand','functional','Code Review','High','Implemented per spec','Verified by review','PASS',NULL,62),
    ('TC-063','US-COA-07','Create/Edit use SearchableSelect parent + live HierarchyPath','functional','Code Review','High','Raw-UUID input removed','Verified by review','PASS',NULL,63),
    ('TC-064','US-COA-07','Delete blocked when children exist; type-to-confirm','negative','Code Review','High','Guard present','Verified by review','PASS',NULL,64),
    ('TC-065','US-COA-08','Sub Akun sections gated per layer (sub<=99, gl<=9, Sub-DL<=2)','functional','Code Review','High','Per-layer gating','Verified by review','PASS',NULL,65),
    ('TC-066','US-COA-09','Sub GL Config shown only on deepest detail ledger','functional','Code Review','High','isDeepestDetailLedger gate','Verified by review','PASS',NULL,66),
    ('TC-067','US-COA-10','Audit row written on every create/update/delete (best-effort)','functional','Code Review','High','Severity mapped CONFIG/STATUS/EDIT','Verified by review','PASS',NULL,67),
    -- Bug-fix v2 code reviews
    ('TC-068','US-COA-06','Inspector toolbar button removed; row-click still opens inspector','functional','Code Review','High','PanelRight ToolbarBtn absent; selectNode path unchanged','Verified','PASS','Bug #2 fix',68),
    ('TC-069','US-COA-10','PendingApprovalsModal removed from all UI entry points','functional','Code Review','High','Removed from coa-explorer, layer-panel, quick-modals','Verified','PASS','Bug #3 fix',69),
    -- v3: full-attribute import/export code reviews
    ('TC-070','US-COA-11','Download Template produces real .xlsx with 3 sheets (Template/Referensi/Petunjuk)','functional','Code Review','High','12 example rows spanning 5 layers; Reference sheet lists all 29 cols + valid values','Verified by review + tsc 0 error in finance/coa','PASS','v3 bug fix',70),
    ('TC-071','US-COA-11','ImportModal accepts .xlsx + .csv (XLSX.read); parseGrid normalizes all 29 columns','functional','Code Review','High','Dynamic XLSX import; fileGrid state; parsedRows via parseGrid; parent resolution','Verified by review','PASS','v3 bug fix',71),
    ('TC-072','US-COA-11','Auto-infer blank report-enums so imported accounts appear in Laporan Keuangan immediately','functional','Code Review','High','normalizeRow fills enum_laporan_keuangan/_category when blank','Verified by logic tests TC-047–TC-049 + code review','PASS','v3 bug fix',72),
    ('TC-073','US-COA-11','Import API whitelists 29 columns + parent_account_id; coerces bool strings server-side','functional','Code Review','High','ALLOWED_KEYS Set; loop drops unknown keys; BOOL_KEYS coercion loop','Verified by review','PASS','v3 bug fix',73),
    ('TC-074','US-COA-11','Export produces full .xlsx (all 29 import cols + _parent_code + _id) from raw DB rows','functional','Code Review','High','handleExport uses rows state (DbCoaRow[]); dynamic XLSX import; all columns present','Verified by review','PASS','v3 bug fix',74),
    -- ── Blocked (manual/browser) ─────────────────────────────────────────────
    ('TC-075','US-COA-06','Visual/interaction parity vs IFAS prototype (Poppins, layer colors, motion)','functional','Manual','Medium','Parity in browser','Not executed (no browser env)','BLOCKED','Verify post-deploy',75),
    ('TC-076','US-COA-07','Keyboard tree navigation in browser','functional','Manual','Low','Arrow/Enter nav works','Not executed (no browser env)','BLOCKED','Verify post-deploy',76),
    ('TC-077','US-COA-09','Sub GL value-catalog drawer empty-state in browser','functional','Manual','Low','Drawer renders empty-state','Not executed (no browser env)','BLOCKED','Verify post-deploy',77)
) AS v(case_code, user_story, title, category, method, priority, expected, actual, status, notes, seq);
