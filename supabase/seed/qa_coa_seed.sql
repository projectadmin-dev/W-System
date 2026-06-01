-- ============================================================================
-- QA seed - Chart of Account (5-Layer Revamp) Test Plan results (re-runnable, ASCII-safe)
-- Jalankan di Supabase SQL Editor. Tampil di /finance/qa (module 'chart-of-account').
-- Ringkasan v2: 59 cases . 56 pass . 0 fail . 3 blocked . 94.92% . PARTIAL
--   36 Automated (node:test on lib/coa-logic.ts) . 6 Integration (live schema) .
--   14 Code Review (tsc + review, includes 7 bug-fix verifications) .
--   3 Blocked (manual/browser, verify post-deploy).
-- ============================================================================
DELETE FROM public.qa_test_runs
 WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
   AND module = 'chart-of-account'
   AND title IN (
     'Chart of Account Workspace (5-Layer Revamp) - Test Plan v1',
     'Chart of Account Workspace (5-Layer Revamp) - Test Plan v2'
   );

WITH r AS (
  INSERT INTO public.qa_test_runs
    (tenant_id, module, title, description, environment, executed_by, executed_at,
     total, passed, failed, blocked, skipped, pass_rate, status)
  VALUES
    ('00000000-0000-0000-0000-000000000001', 'chart-of-account',
     'Chart of Account Workspace (5-Layer Revamp) - Test Plan v2',
     'v2 menambahkan 7 bug-fix cases: Download Template di ImportModal, hapus tombol Inspector dari toolbar, hapus PendingApprovals dari UI, verifikasi Audit Trail filter (action/severity/search), verifikasi CRUD menulis audit log, Import menulis entri IMPORT ke audit log + tampil di ImportHistoryModal, Export menghasilkan CSV valid. Total 59 cases (36 automated + 6 integration + 14 code review + 3 blocked manual).',
     'Node 22 + node:test (logic) / Supabase Postgres 17 (schema) / Next.js 16 tsc + code review (UI/API)',
     'QA Engineer (Claude)', NOW(),
     59, 56, 0, 3, 0, 94.92, 'PARTIAL')
  RETURNING id
)
INSERT INTO public.qa_test_cases
  (run_id, tenant_id, case_code, user_story, title, category, method, priority,
   expected, actual, status, notes, seq)
SELECT r.id, '00000000-0000-0000-0000-000000000001', v.case_code, v.user_story, v.title, v.category, v.method,
       v.priority, v.expected, v.actual, v.status, v.notes, v.seq
FROM r,
( VALUES
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
    ('TC-037','US-COA-08','Detail Ledger inserts with DL flags under a GL','integration','Integration','High','Schema accepts DL row + flags','Inserted & verified via SQL','PASS','Live Supabase schema',37),
    ('TC-038','US-COA-08','Sub-DL inserts with child_upstream_id FK to parent DL','integration','Integration','High','FK link resolves','Inserted & verified (subdl_linked=1)','PASS','Self-referencing FK',38),
    ('TC-039','US-COA-09','sub_gl_config JSONB (key-in level) persists on deepest DL','integration','Integration','High','jsonb_array_length=1','Inserted & verified','PASS',NULL,39),
    ('TC-040','US-COA-10','coa_audit_log accepts CONFIG (high) entry','integration','Integration','High','Row inserted','Inserted & verified','PASS',NULL,40),
    ('TC-041','US-COA-10','coa_pending_approval table present in schema (DB layer only)','integration','Integration','Medium','Row inserted','Inserted & verified','PASS','UI entry removed - DB table retained',41),
    ('TC-042','US-COA-01','Segments migration backfilled coa_full_code/segment_code','integration','Integration','High','All rows backfilled','169/169 rows backfilled','PASS',NULL,42),
    ('TC-043','US-COA-06','Explorer renders 5-layer tree-table (indent, expand/collapse, code chips)','functional','Code Review','High','Matches design + tsc clean','Verified by review + tsc 0 error','PASS',NULL,43),
    ('TC-044','US-COA-06','Layer filter panel with live counts + density toggle + search auto-expand','functional','Code Review','High','Implemented per spec','Verified by review','PASS',NULL,44),
    ('TC-045','US-COA-07','Create/Edit use SearchableSelect parent + live HierarchyPath (no raw UUID)','functional','Code Review','High','Raw-UUID input removed','Verified by review','PASS',NULL,45),
    ('TC-046','US-COA-07','Delete blocked when children exist; type-to-confirm','negative','Code Review','High','Guard present','Verified by review','PASS',NULL,46),
    ('TC-047','US-COA-08','Sub Akun sections gated per layer (sub<=99, gl<=9, Sub-DL<=2)','functional','Code Review','High','Per-layer gating','Verified by review','PASS',NULL,47),
    ('TC-048','US-COA-09','Sub GL Config shown only on deepest detail ledger','functional','Code Review','High','isDeepestDetailLedger gate','Verified by review','PASS',NULL,48),
    ('TC-049','US-COA-10','Audit row written on every create/update/delete (best-effort)','functional','Code Review','High','Severity mapped CONFIG/STATUS/EDIT','Verified by review','PASS',NULL,49),
    -- Bug fixes v2 (TC-053 to TC-059)
    ('TC-053','US-COA-10','ImportModal: Download Template button downloads sample CSV with 5-layer rows','functional','Code Review','High','downloadTemplate() triggers .csv Blob download with correct headers','downloadTemplate() present in import-modals.tsx; button in DialogFooter','PASS','Bug #1 fix - v2',53),
    ('TC-054','US-COA-06','Inspector toolbar button removed; inspector still opens on row click','functional','Code Review','High','PanelRight ToolbarBtn absent from header; selectNode() still calls setInspectorOpen(true)','Verified: PanelRight removed from imports + toolbar; row-click path unchanged','PASS','Bug #2 fix - v2',54),
    ('TC-055','US-COA-10','PendingApprovalsModal removed from UI (toolbar, layer-panel, quick-modals)','functional','Code Review','High','No PendingApprovals import/render in coa-explorer; no approvals QuickAction in layer-panel','Verified: removed from coa-explorer.tsx, layer-panel.tsx, quick-modals.tsx','PASS','Bug #3 fix - v2',55),
    ('TC-056','US-COA-10','GET /api/finance/coa/audit returns rows; action+severity filters narrow results','functional','Code Review','High','Response {data:[...]} with action/severity/q params forwarded to Supabase','audit/route.ts passes all 3 params as .eq() / .ilike(); degrades to [] if table absent','PASS','Bug #3 verification',56),
    ('TC-057','US-COA-10','AuditTrailModal re-fetches on filter change via useCallback deps','functional','Code Review','High','useEffect re-runs when action/severity/q change','load() in useCallback([action,severity,q]); useEffect([open,load])','PASS','Bug #3 verification',57),
    ('TC-058','US-COA-10','POST /api/finance/coa/import writes action=IMPORT entry to coa_audit_log','functional','Code Review','High','Audit row with action=IMPORT present after import','import/route.ts calls logCoaAudit({action:''IMPORT'',...}) best-effort after bulk insert','PASS','Bug #3 verification',58),
    ('TC-059','US-COA-10','ImportHistoryModal fetches audit?action=IMPORT and renders filename + stats','functional','Code Review','High','Modal shows file rows with success/total counts','ImportHistoryModal fetches /api/finance/coa/audit?action=IMPORT; renders after_data.success/total','PASS','Bug #3 verification',59),
    -- Blocked (manual/browser) - unchanged
    ('TC-050','US-COA-06','Visual/interaction parity vs IFAS prototype (Poppins, layer colors, motion)','functional','Manual','Medium','Parity in browser','Not executed (no browser env)','BLOCKED','Verify post-deploy',50),
    ('TC-051','US-COA-07','Keyboard tree navigation in browser','functional','Manual','Low','Arrow/Enter nav works','Not executed (no browser env)','BLOCKED','Verify post-deploy',51),
    ('TC-052','US-COA-09','Sub GL value-catalog drawer empty-state in browser','functional','Manual','Low','Drawer renders empty-state','Not executed (no browser env)','BLOCKED','Verify post-deploy',52)
) AS v(case_code, user_story, title, category, method, priority, expected, actual, status, notes, seq);
