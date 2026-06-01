import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeRow, parseBool, buildHeaderMap, parseGrid,
  COA_COLUMNS, VALID_LAYERS, VALID_ACCOUNT_TYPES, VALID_LK, VALID_LK_CATEGORY,
  LAYER_LEVEL,
} from '../coa-import-schema.ts'

// ─── parseBool ────────────────────────────────────────────────────────────────
describe('parseBool', () => {
  it('true values: true/1/yes/ya/y/t/benar', () => {
    for (const v of ['true', 'TRUE', 'True', '1', 'yes', 'YES', 'ya', 'YA', 'y', 't', 'benar']) {
      assert.equal(parseBool(v, false), true, `expected true for "${v}"`)
    }
  })
  it('false values: false/0/no/tidak/n/f/salah', () => {
    for (const v of ['false', 'FALSE', '0', 'no', 'tidak', 'n', 'f', 'salah']) {
      assert.equal(parseBool(v, true), false, `expected false for "${v}"`)
    }
  })
  it('blank/null returns default', () => {
    assert.equal(parseBool('', true), true)
    assert.equal(parseBool(null, false), false)
    assert.equal(parseBool(undefined, true), true)
  })
  it('unrecognized string returns default', () => {
    assert.equal(parseBool('maybe', true), true)
    assert.equal(parseBool('x', false), false)
  })
})

// ─── buildHeaderMap ───────────────────────────────────────────────────────────
describe('buildHeaderMap', () => {
  it('maps exact key names', () => {
    const m = buildHeaderMap(['account_code', 'account_name', 'coa_layer', 'account_type'])
    assert.equal(m.get('account_code'), 0)
    assert.equal(m.get('account_name'), 1)
    assert.equal(m.get('coa_layer'), 2)
    assert.equal(m.get('account_type'), 3)
  })
  it('maps alias coa_full_code → account_code', () => {
    const m = buildHeaderMap(['coa_full_code', 'account_name', 'coa_layer', 'account_type'])
    assert.equal(m.get('account_code'), 0)
  })
  it('maps alias sub/gl/detail for coa_layer display (alias for layer column)', () => {
    const m = buildHeaderMap(['account_code', 'account_name', 'layer', 'account_type'])
    assert.equal(m.get('coa_layer'), 2)
  })
  it('is case-insensitive', () => {
    const m = buildHeaderMap(['ACCOUNT_CODE', 'Account_Name', 'COA_Layer', 'Account_Type'])
    assert.equal(m.get('account_code'), 0)
    assert.equal(m.get('account_name'), 1)
    assert.equal(m.get('coa_layer'), 2)
    assert.equal(m.get('account_type'), 3)
  })
  it('ignores * in header names', () => {
    const m = buildHeaderMap(['account_code *', 'account_name *', 'coa_layer *', 'account_type *'])
    assert.equal(m.get('account_code'), 0)
    assert.equal(m.get('account_name'), 1)
  })
  it('all COA_COLUMNS keys can be resolved from their own key', () => {
    const headers = COA_COLUMNS.map((c) => c.key)
    const m = buildHeaderMap(headers)
    for (const col of COA_COLUMNS) {
      assert.ok(m.has(col.key), `expected ${col.key} to be mapped`)
    }
  })
})

// ─── normalizeRow — required fields ─────────────────────────────────────────
describe('normalizeRow — required fields', () => {
  const base = { account_code: '1', account_name: 'Aset', coa_layer: 'category', account_type: 'asset' }

  it('happy path returns ok with correct fields', () => {
    const r = normalizeRow(base)
    assert.equal(r.ok, true)
    if (r.ok) {
      assert.equal(r.row.account_code, '1')
      assert.equal(r.row.account_name, 'Aset')
      assert.equal(r.row.coa_layer, 'category')
      assert.equal(r.row.account_type, 'asset')
      assert.equal(r.row.level, 1)
    }
  })
  it('missing account_code → error', () => {
    const r = normalizeRow({ ...base, account_code: '' })
    assert.equal(r.ok, false)
  })
  it('missing account_name → error', () => {
    const r = normalizeRow({ ...base, account_name: '' })
    assert.equal(r.ok, false)
  })
  it('invalid coa_layer → error', () => {
    const r = normalizeRow({ ...base, coa_layer: 'unknown_layer' })
    assert.equal(r.ok, false)
    if (!r.ok) assert.ok(r.reason.includes('coa_layer'))
  })
  it('invalid account_type → error', () => {
    const r = normalizeRow({ ...base, account_type: 'bad_type' })
    assert.equal(r.ok, false)
    if (!r.ok) assert.ok(r.reason.includes('account_type'))
  })
  it('missing account_type → error', () => {
    const r = normalizeRow({ ...base, account_type: '' })
    assert.equal(r.ok, false)
  })
})

// ─── normalizeRow — layer aliases ────────────────────────────────────────────
describe('normalizeRow — layer aliases', () => {
  const base = (layer: string, type = 'asset') => ({
    account_code: '1-1-01', account_name: 'Test', coa_layer: layer, account_type: type,
  })

  it('alias "sub" → sub_account', () => {
    const r = normalizeRow(base('sub'))
    assert.equal(r.ok, true)
    if (r.ok) assert.equal(r.row.coa_layer, 'sub_account')
  })
  it('alias "gl" → general_ledger', () => {
    const r = normalizeRow(base('gl'))
    assert.equal(r.ok, true)
    if (r.ok) assert.equal(r.row.coa_layer, 'general_ledger')
  })
  it('alias "detail" → detail_ledger', () => {
    const r = normalizeRow(base('detail'))
    assert.equal(r.ok, true)
    if (r.ok) assert.equal(r.row.coa_layer, 'detail_ledger')
  })
})

// ─── normalizeRow — level derivation ─────────────────────────────────────────
describe('normalizeRow — level from layer', () => {
  const mk = (layer: string) => normalizeRow({ account_code: '1', account_name: 'X', coa_layer: layer, account_type: 'asset' })

  it('category → level 1', () => { const r = mk('category'); assert.ok(r.ok); if (r.ok) assert.equal(r.row.level, 1) })
  it('type → level 2', () => { const r = mk('type'); assert.ok(r.ok); if (r.ok) assert.equal(r.row.level, 2) })
  it('sub_account → level 3', () => { const r = mk('sub_account'); assert.ok(r.ok); if (r.ok) assert.equal(r.row.level, 3) })
  it('general_ledger → level 4', () => { const r = mk('general_ledger'); assert.ok(r.ok); if (r.ok) assert.equal(r.row.level, 4) })
  it('detail_ledger → level 5', () => { const r = mk('detail_ledger'); assert.ok(r.ok); if (r.ok) assert.equal(r.row.level, 5) })
})

// ─── normalizeRow — auto-infer ───────────────────────────────────────────────
describe('normalizeRow — auto-infer for blank report-enums', () => {
  const mk = (type: string) => normalizeRow({ account_code: '1', account_name: 'X', coa_layer: 'category', account_type: type })

  it('asset: normal_balance=debit, LK=BALANCE_SHEET, LKCategory=ASSET', () => {
    const r = mk('asset')
    assert.ok(r.ok)
    if (r.ok) {
      assert.equal(r.row.normal_balance, 'debit')
      assert.equal(r.row.enum_laporan_keuangan, 'BALANCE_SHEET')
      assert.equal(r.row.enum_laporan_keuangan_category, 'ASSET')
    }
  })
  it('liability: normal_balance=credit, LK=BALANCE_SHEET, LKCategory=LIABILITY', () => {
    const r = mk('liability')
    assert.ok(r.ok)
    if (r.ok) {
      assert.equal(r.row.normal_balance, 'credit')
      assert.equal(r.row.enum_laporan_keuangan, 'BALANCE_SHEET')
      assert.equal(r.row.enum_laporan_keuangan_category, 'LIABILITY')
    }
  })
  it('equity: normal_balance=credit, LK=BALANCE_SHEET, LKCategory=EQUITY', () => {
    const r = mk('equity')
    assert.ok(r.ok)
    if (r.ok) {
      assert.equal(r.row.enum_laporan_keuangan, 'BALANCE_SHEET')
      assert.equal(r.row.enum_laporan_keuangan_category, 'EQUITY')
    }
  })
  it('revenue: normal_balance=credit, LK=INCOME_STATEMENT, LKCategory=REVENUE', () => {
    const r = mk('revenue')
    assert.ok(r.ok)
    if (r.ok) {
      assert.equal(r.row.normal_balance, 'credit')
      assert.equal(r.row.enum_laporan_keuangan, 'INCOME_STATEMENT')
      assert.equal(r.row.enum_laporan_keuangan_category, 'REVENUE')
    }
  })
  it('expense: normal_balance=debit, LK=INCOME_STATEMENT, LKCategory=OPEX', () => {
    const r = mk('expense')
    assert.ok(r.ok)
    if (r.ok) {
      assert.equal(r.row.normal_balance, 'debit')
      assert.equal(r.row.enum_laporan_keuangan, 'INCOME_STATEMENT')
      assert.equal(r.row.enum_laporan_keuangan_category, 'OPEX')
    }
  })
})

// ─── normalizeRow — explicit values override auto-infer ──────────────────────
describe('normalizeRow — explicit values override infer', () => {
  it('explicit normal_balance overrides default', () => {
    const r = normalizeRow({ account_code: '1', account_name: 'X', coa_layer: 'category', account_type: 'asset', normal_balance: 'credit' })
    assert.ok(r.ok)
    if (r.ok) assert.equal(r.row.normal_balance, 'credit')
  })
  it('explicit LK overrides infer', () => {
    const r = normalizeRow({ account_code: '1', account_name: 'X', coa_layer: 'category', account_type: 'asset', enum_laporan_keuangan: 'INCOME_STATEMENT' })
    assert.ok(r.ok)
    if (r.ok) assert.equal(r.row.enum_laporan_keuangan, 'INCOME_STATEMENT')
  })
  it('explicit LK category overrides infer', () => {
    const r = normalizeRow({ account_code: '1', account_name: 'X', coa_layer: 'category', account_type: 'expense', enum_laporan_keuangan_category: 'COGS' })
    assert.ok(r.ok)
    if (r.ok) assert.equal(r.row.enum_laporan_keuangan_category, 'COGS')
  })
  it('enum matching is case-insensitive (income_statement → INCOME_STATEMENT)', () => {
    const r = normalizeRow({ account_code: '1', account_name: 'X', coa_layer: 'category', account_type: 'revenue', enum_laporan_keuangan: 'income_statement' })
    assert.ok(r.ok)
    if (r.ok) assert.equal(r.row.enum_laporan_keuangan, 'INCOME_STATEMENT')
  })
})

// ─── normalizeRow — invalid optional enums ───────────────────────────────────
describe('normalizeRow — invalid optional enum → error', () => {
  const base = { account_code: '1', account_name: 'X', coa_layer: 'category', account_type: 'asset' }

  it('invalid enum_laporan_keuangan', () => {
    const r = normalizeRow({ ...base, enum_laporan_keuangan: 'WRONG' })
    assert.equal(r.ok, false)
    if (!r.ok) assert.ok(r.reason.includes('enum_laporan_keuangan'))
  })
  it('invalid enum_laporan_keuangan_category', () => {
    const r = normalizeRow({ ...base, enum_laporan_keuangan_category: 'BAD' })
    assert.equal(r.ok, false)
  })
  it('invalid cash_flow_category', () => {
    const r = normalizeRow({ ...base, cash_flow_category: 'CASHFLOW_WRONG' })
    assert.equal(r.ok, false)
  })
  it('invalid enum_cf_section', () => {
    const r = normalizeRow({ ...base, enum_cf_section: 'INVALID' })
    assert.equal(r.ok, false)
  })
  it('invalid direct_indirect_cost', () => {
    const r = normalizeRow({ ...base, direct_indirect_cost: 'MAYBE' })
    assert.equal(r.ok, false)
  })
  it('invalid enum_cost_category', () => {
    const r = normalizeRow({ ...base, enum_cost_category: 'RANDOM' })
    assert.equal(r.ok, false)
  })
})

// ─── normalizeRow — boolean coercion ─────────────────────────────────────────
describe('normalizeRow — boolean coercion in flags', () => {
  const base = { account_code: '1', account_name: 'X', coa_layer: 'category', account_type: 'asset' }

  it('is_active=FALSE → false', () => {
    const r = normalizeRow({ ...base, is_active: 'FALSE' })
    assert.ok(r.ok)
    if (r.ok) assert.equal(r.row.is_active, false)
  })
  it('contra_account=ya → true', () => {
    const r = normalizeRow({ ...base, contra_account: 'ya' })
    assert.ok(r.ok)
    if (r.ok) assert.equal(r.row.contra_account, true)
  })
  it('is_tax_deductible blank → default true', () => {
    const r = normalizeRow({ ...base })
    assert.ok(r.ok)
    if (r.ok) assert.equal(r.row.is_tax_deductible, true)
  })
  it('is_trial_balance blank → default true', () => {
    const r = normalizeRow({ ...base })
    assert.ok(r.ok)
    if (r.ok) assert.equal(r.row.is_trial_balance, true)
  })
  it('is_active blank → default true', () => {
    const r = normalizeRow({ ...base })
    assert.ok(r.ok)
    if (r.ok) assert.equal(r.row.is_active, true)
  })
})

// ─── normalizeRow — integer coercion ─────────────────────────────────────────
describe('normalizeRow — sort_order coercion', () => {
  const base = { account_code: '1', account_name: 'X', coa_layer: 'category', account_type: 'asset' }
  it('sort_order=5 → 5', () => {
    const r = normalizeRow({ ...base, sort_order: '5' })
    assert.ok(r.ok)
    if (r.ok) assert.equal(r.row.sort_order, 5)
  })
  it('sort_order blank → 0', () => {
    const r = normalizeRow({ ...base })
    assert.ok(r.ok)
    if (r.ok) assert.equal(r.row.sort_order, 0)
  })
  it('sort_order non-numeric → 0', () => {
    const r = normalizeRow({ ...base, sort_order: 'abc' })
    assert.ok(r.ok)
    if (r.ok) assert.equal(r.row.sort_order, 0)
  })
})

// ─── parseGrid ────────────────────────────────────────────────────────────────
describe('parseGrid', () => {
  it('empty grid returns []', () => {
    assert.deepEqual(parseGrid([]), [])
    assert.deepEqual(parseGrid([['account_code', 'account_name', 'coa_layer', 'account_type']]), [])
  })
  it('parses a valid data row', () => {
    const grid = [
      ['account_code', 'account_name', 'coa_layer', 'account_type'],
      ['1', 'Aset', 'category', 'asset'],
    ]
    const rows = parseGrid(grid)
    assert.equal(rows.length, 1)
    assert.equal(rows[0]!.result.ok, true)
  })
  it('maps alias header to correct key in raw', () => {
    const grid = [
      ['coa_full_code', 'account_name', 'layer', 'type'],
      ['1-1-01', 'Kas', 'sub', 'asset'],
    ]
    const rows = parseGrid(grid)
    assert.equal(rows[0]!.result.ok, true)
    if (rows[0]!.result.ok) {
      assert.equal(rows[0]!.result.row.account_code, '1-1-01')
      assert.equal(rows[0]!.result.row.coa_layer, 'sub_account')
    }
  })
  it('flags invalid row with ok=false', () => {
    const grid = [
      ['account_code', 'account_name', 'coa_layer', 'account_type'],
      ['', 'No Code', 'category', 'asset'],
    ]
    const rows = parseGrid(grid)
    assert.equal(rows[0]!.result.ok, false)
  })
})

// ─── COA_COLUMNS schema integrity ────────────────────────────────────────────
describe('COA_COLUMNS schema integrity', () => {
  it('all keys are unique', () => {
    const keys = COA_COLUMNS.map((c) => c.key)
    assert.equal(keys.length, new Set(keys).size)
  })
  it('required columns are account_code, account_name, coa_layer, account_type', () => {
    const required = COA_COLUMNS.filter((c) => c.required).map((c) => c.key)
    assert.deepEqual(required.sort(), ['account_code', 'account_name', 'account_type', 'coa_layer'])
  })
  it('LAYER_LEVEL covers all valid layers', () => {
    for (const layer of VALID_LAYERS) {
      assert.ok(LAYER_LEVEL[layer] !== undefined, `LAYER_LEVEL missing ${layer}`)
    }
  })
})
