// Pure COA import/export schema — column specs, normalizer, auto-infer.
// No browser APIs, no React, no XLSX. Safe for server routes + node:test.

export type ColType = 'text' | 'boolean' | 'integer' | 'enum'

export interface ColSpec {
  /** DB column name — also used as Excel header for round-trip import. */
  key: string
  /** Human-readable label for the Reference sheet. */
  label: string
  required: boolean
  type: ColType
  /** Canonical valid values (case-authoritative). Undefined for text/bool/int. */
  valid?: readonly string[]
  /** Default when cell is blank. */
  default?: unknown
  /** Indonesian description for the Reference sheet. */
  description: string
  /** Alternative header names that map to this column. */
  aliases?: readonly string[]
}

// ─── Canonical valid-value lists (match DB CHECK constraints) ─────────────────
export const VALID_LAYERS = ['category', 'type', 'sub_account', 'general_ledger', 'detail_ledger'] as const
export const VALID_ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const
export const VALID_NORMAL_BALANCE = ['debit', 'credit'] as const
export const VALID_LK = ['INCOME_STATEMENT', 'BALANCE_SHEET'] as const
export const VALID_LK_CATEGORY = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'OPEX', 'OTHER_INCOME', 'OTHER_EXPENSE', 'TAX_EXPENSE'] as const
export const VALID_CASH_FLOW_CATEGORY = ['operating', 'investing', 'financing', 'non_cash', 'not_applicable'] as const
export const VALID_CF_SECTION = ['OPERATING', 'INVESTING', 'FINANCING', 'EXCLUDED'] as const
export const VALID_DIRECT_INDIRECT = ['DIRECT', 'INDIRECT'] as const
export const VALID_COST_CATEGORY = ['PERSONNEL', 'OPERATIONAL', 'MARKETING', 'TECHNOLOGY', 'OVERHEAD'] as const

// FE abbreviations → DB layer values
export const LAYER_ALIAS: Record<string, string> = {
  sub: 'sub_account',
  gl: 'general_ledger',
  detail: 'detail_ledger',
}

// layer → level (1-indexed)
export const LAYER_LEVEL: Record<string, number> = {
  category: 1, type: 2, sub_account: 3, general_ledger: 4, detail_ledger: 5,
}

// ─── Column specification (29 columns, order = template column order) ─────────
export const COA_COLUMNS: ColSpec[] = [
  // Identity / hierarchy
  {
    key: 'account_code', label: 'Kode COA Lengkap *', required: true, type: 'text',
    description: 'Kode COA lengkap (mis. 1-1-01-1-0001). Wajib unik dalam sistem.',
    aliases: ['coa_full_code', 'code', 'full_code'],
  },
  {
    key: 'account_name', label: 'Nama Akun *', required: true, type: 'text',
    description: 'Nama akun dalam Bahasa Indonesia. Wajib diisi.',
    aliases: ['nama', 'name'],
  },
  {
    key: 'name_en', label: 'Nama Akun (EN)', required: false, type: 'text',
    description: 'Nama akun dalam Bahasa Inggris. Opsional.',
  },
  {
    key: 'coa_layer', label: 'Layer COA *', required: true, type: 'enum', valid: VALID_LAYERS,
    description: 'Layer COA: category | type | sub_account | general_ledger | detail_ledger. Alias: sub, gl, detail.',
    aliases: ['layer'],
  },
  {
    key: 'account_type', label: 'Tipe Akun *', required: true, type: 'enum', valid: VALID_ACCOUNT_TYPES,
    description: 'Jenis akun: asset | liability | equity | revenue | expense.',
    aliases: ['type'],
  },
  {
    key: 'normal_balance', label: 'Saldo Normal', required: false, type: 'enum', valid: VALID_NORMAL_BALANCE,
    description: 'Saldo normal debit/credit. Kosong → otomatis dari account_type (asset/expense=debit, lainnya=credit).',
    aliases: ['nb'],
  },
  {
    key: 'sort_order', label: 'Urutan Tampil', required: false, type: 'integer', default: 0,
    description: 'Urutan tampil dalam layer yang sama. Angka lebih kecil tampil lebih atas. Default 0.',
  },
  // Report mapping
  {
    key: 'enum_laporan_keuangan', label: 'Laporan Keuangan', required: false, type: 'enum', valid: VALID_LK,
    description: 'Pengelompokan laporan: INCOME_STATEMENT | BALANCE_SHEET. Kosong → otomatis dari account_type.',
  },
  {
    key: 'enum_laporan_keuangan_category', label: 'Kategori LK', required: false, type: 'enum', valid: VALID_LK_CATEGORY,
    description: 'Kategori LK: ASSET | LIABILITY | EQUITY | REVENUE | COGS | OPEX | OTHER_INCOME | OTHER_EXPENSE | TAX_EXPENSE. Kosong → otomatis.',
  },
  {
    key: 'cash_flow_category', label: 'Arus Kas', required: false, type: 'enum', valid: VALID_CASH_FLOW_CATEGORY,
    description: 'Kategori arus kas: operating | investing | financing | non_cash | not_applicable.',
  },
  {
    key: 'enum_cf_section', label: 'CF Section', required: false, type: 'enum', valid: VALID_CF_SECTION,
    description: 'Seksi laporan arus kas: OPERATING | INVESTING | FINANCING | EXCLUDED.',
  },
  {
    key: 'enum_cf_line', label: 'CF Line', required: false, type: 'text',
    description: 'Baris CF kustom (teks bebas). Opsional.',
  },
  {
    key: 'direct_indirect_cost', label: 'Biaya Langsung/Tidak', required: false, type: 'enum', valid: VALID_DIRECT_INDIRECT,
    description: 'Klasifikasi biaya: DIRECT (langsung) | INDIRECT (tidak langsung).',
  },
  {
    key: 'enum_cost_category', label: 'Kategori Biaya', required: false, type: 'enum', valid: VALID_COST_CATEGORY,
    description: 'Kategori biaya: PERSONNEL | OPERATIONAL | MARKETING | TECHNOLOGY | OVERHEAD.',
  },
  {
    key: 'tax_code', label: 'Kode Pajak', required: false, type: 'text',
    description: 'Kode pajak terkait (opsional, mis. PPh21, PPN).',
  },
  // Boolean flags
  {
    key: 'contra_account', label: 'Akun Kontra', required: false, type: 'boolean', default: false,
    description: 'TRUE jika akun kontra (mis. Akumulasi Penyusutan). Default FALSE.',
  },
  {
    key: 'is_working_capital', label: 'Modal Kerja', required: false, type: 'boolean', default: false,
    description: 'TRUE jika termasuk komponen modal kerja. Default FALSE.',
  },
  {
    key: 'is_non_cash_item', label: 'Non-Cash Item', required: false, type: 'boolean', default: false,
    description: 'TRUE jika item non-kas (mis. depresiasi, amortisasi). Default FALSE.',
  },
  {
    key: 'is_budgeted', label: 'Dianggarkan', required: false, type: 'boolean', default: false,
    description: 'TRUE jika akun ini masuk dalam anggaran. Default FALSE.',
  },
  {
    key: 'is_tax_deductible', label: 'Tax Deductible', required: false, type: 'boolean', default: true,
    description: 'TRUE jika biaya ini dapat dikurangkan untuk pajak. Default TRUE.',
  },
  {
    key: 'is_restricted', label: 'Restricted', required: false, type: 'boolean', default: false,
    description: 'TRUE jika akun ini restricted (tidak bisa diposting langsung). Default FALSE.',
  },
  {
    key: 'is_trial_balance', label: 'Trial Balance', required: false, type: 'boolean', default: true,
    description: 'TRUE jika akun muncul di laporan trial balance. Default TRUE.',
  },
  {
    key: 'is_taxation_report', label: 'Laporan Pajak', required: false, type: 'boolean', default: false,
    description: 'TRUE jika akun muncul di laporan pajak. Default FALSE.',
  },
  {
    key: 'required_sub_gl', label: 'Wajib Sub GL', required: false, type: 'boolean', default: false,
    description: 'TRUE jika entry jurnal pada akun ini wajib menyertakan sub GL. Default FALSE.',
  },
  {
    key: 'is_washed_out_account', label: 'Washed Out', required: false, type: 'boolean', default: false,
    description: 'TRUE jika akun ini bersifat washed-out (netting). Default FALSE.',
  },
  {
    key: 'required_child', label: 'Wajib Anak', required: false, type: 'boolean', default: false,
    description: 'TRUE jika akun ini wajib memiliki akun anak untuk diposting. Default FALSE.',
  },
  {
    key: 'is_active', label: 'Aktif', required: false, type: 'boolean', default: true,
    description: 'Status aktif akun. Default TRUE. FALSE menyembunyikan akun dari pilihan jurnal.',
  },
  // Other
  {
    key: 'description', label: 'Deskripsi', required: false, type: 'text',
    description: 'Keterangan tambahan / catatan akun (teks bebas).',
  },
]

// ─── Header normalization ─────────────────────────────────────────────────────

/** Build a map of ColSpec.key → cell index from a raw header row.
 *  Matching is case-insensitive; recognizes col.key and col.aliases. */
export function buildHeaderMap(rawHeaders: string[]): Map<string, number> {
  const norm = rawHeaders.map((h) => h.toLowerCase().trim().replace(/\*+/g, '').trim().replace(/[\s\-]+/g, '_').replace(/_+$/, ''))
  const result = new Map<string, number>()
  for (const col of COA_COLUMNS) {
    if (result.has(col.key)) continue
    const names = [col.key, ...(col.aliases ?? [])].map((n) => n.toLowerCase())
    for (const name of names) {
      const idx = norm.indexOf(name)
      if (idx >= 0) {
        result.set(col.key, idx)
        break
      }
    }
  }
  return result
}

// ─── Coercion helpers ─────────────────────────────────────────────────────────

/** Coerce a raw cell string to boolean. Returns def if blank/unrecognized. */
export function parseBool(v: string | null | undefined, def: boolean): boolean {
  if (v == null || v === '') return def
  const s = String(v).toLowerCase().trim()
  if (['true', '1', 'yes', 'ya', 'y', 't', 'benar'].includes(s)) return true
  if (['false', '0', 'no', 'tidak', 'n', 'f', 'salah'].includes(s)) return false
  return def
}

/** Case-insensitive match against a valid-values list. Returns the canonical value or null. */
function matchEnum(v: string, valid: readonly string[]): string | null {
  if (!v) return null
  const vl = v.toLowerCase()
  return valid.find((x) => x.toLowerCase() === vl) ?? null
}

/** Validate an optional enum field. Returns { value } or { error }. */
function optionalEnum(raw: string, valid: readonly string[], key: string): { value: string | null } | { error: string } {
  if (!raw) return { value: null }
  const canon = matchEnum(raw, valid)
  if (!canon) return { error: `${key} tidak valid: "${raw}". Nilai valid: ${valid.join(' | ')}` }
  return { value: canon }
}

// ─── Auto-infer helpers ───────────────────────────────────────────────────────

function inferNormalBalance(accountType: string): 'debit' | 'credit' {
  return ['asset', 'expense'].includes(accountType) ? 'debit' : 'credit'
}

function inferLk(accountType: string): string {
  return ['asset', 'liability', 'equity'].includes(accountType) ? 'BALANCE_SHEET' : 'INCOME_STATEMENT'
}

function inferLkCategory(accountType: string): string {
  const m: Record<string, string> = {
    asset: 'ASSET', liability: 'LIABILITY', equity: 'EQUITY',
    revenue: 'REVENUE', expense: 'OPEX',
  }
  return m[accountType] ?? 'OPEX'
}

// ─── Row normalizer ───────────────────────────────────────────────────────────

export interface CoaImportRow {
  account_code: string
  account_name: string
  name_en: string | null
  coa_layer: string
  account_type: string
  normal_balance: string
  level: number
  sort_order: number
  enum_laporan_keuangan: string
  enum_laporan_keuangan_category: string
  cash_flow_category: string | null
  enum_cf_section: string | null
  enum_cf_line: string | null
  direct_indirect_cost: string | null
  enum_cost_category: string | null
  tax_code: string | null
  description: string | null
  contra_account: boolean
  is_working_capital: boolean
  is_non_cash_item: boolean
  is_budgeted: boolean
  is_tax_deductible: boolean
  is_restricted: boolean
  is_trial_balance: boolean
  is_taxation_report: boolean
  required_sub_gl: boolean
  is_washed_out_account: boolean
  required_child: boolean
  is_active: boolean
}

export type NormalizeResult =
  | { ok: true; row: CoaImportRow }
  | { ok: false; reason: string }

/**
 * Normalize a raw cell-map (keys = DB column names, values = raw cell strings)
 * into a fully validated + auto-inferred CoaImportRow.
 *
 * Blank optional enum fields are auto-inferred from account_type.
 * Boolean fields accept: TRUE/FALSE, 1/0, yes/no, ya/tidak, etc.
 */
export function normalizeRow(raw: Record<string, string | undefined | null>): NormalizeResult {
  const get = (key: string) => (raw[key] ?? '').trim()

  // ── Required text fields ──
  const account_code = get('account_code')
  if (!account_code) return { ok: false, reason: 'account_code (kode COA) wajib diisi' }

  const account_name = get('account_name')
  if (!account_name) return { ok: false, reason: 'account_name wajib diisi' }

  // ── coa_layer (alias + validate) ──
  const rawLayer = get('coa_layer').toLowerCase()
  const layerNorm = LAYER_ALIAS[rawLayer] ?? rawLayer
  const coa_layer = matchEnum(layerNorm, VALID_LAYERS)
  if (!coa_layer) return { ok: false, reason: `coa_layer tidak valid: "${get('coa_layer')}". Valid: ${VALID_LAYERS.join(' | ')}` }

  // ── account_type ──
  const rawType = get('account_type').toLowerCase()
  const account_type = matchEnum(rawType, VALID_ACCOUNT_TYPES)
  if (!account_type) return { ok: false, reason: `account_type tidak valid: "${get('account_type')}". Valid: ${VALID_ACCOUNT_TYPES.join(' | ')}` }

  // ── normal_balance: explicit or auto-infer ──
  const rawNB = get('normal_balance')
  const normal_balance = (rawNB ? matchEnum(rawNB, VALID_NORMAL_BALANCE) : null) ?? inferNormalBalance(account_type)

  // ── sort_order ──
  const rawSo = get('sort_order')
  const sort_order = rawSo ? (parseInt(rawSo, 10) || 0) : 0

  // ── Optional enum columns ──
  const lkRes = optionalEnum(get('enum_laporan_keuangan'), VALID_LK, 'enum_laporan_keuangan')
  if ('error' in lkRes) return { ok: false, reason: lkRes.error }
  const enum_laporan_keuangan = lkRes.value ?? inferLk(account_type)

  const lkCatRes = optionalEnum(get('enum_laporan_keuangan_category'), VALID_LK_CATEGORY, 'enum_laporan_keuangan_category')
  if ('error' in lkCatRes) return { ok: false, reason: lkCatRes.error }
  const enum_laporan_keuangan_category = lkCatRes.value ?? inferLkCategory(account_type)

  const cfCatRes = optionalEnum(get('cash_flow_category'), VALID_CASH_FLOW_CATEGORY, 'cash_flow_category')
  if ('error' in cfCatRes) return { ok: false, reason: cfCatRes.error }

  const cfSecRes = optionalEnum(get('enum_cf_section'), VALID_CF_SECTION, 'enum_cf_section')
  if ('error' in cfSecRes) return { ok: false, reason: cfSecRes.error }

  const diRes = optionalEnum(get('direct_indirect_cost'), VALID_DIRECT_INDIRECT, 'direct_indirect_cost')
  if ('error' in diRes) return { ok: false, reason: diRes.error }

  const ccRes = optionalEnum(get('enum_cost_category'), VALID_COST_CATEGORY, 'enum_cost_category')
  if ('error' in ccRes) return { ok: false, reason: ccRes.error }

  // ── Boolean flags ──
  const bool = (k: string, def: boolean) => parseBool(raw[k], def)

  return {
    ok: true,
    row: {
      account_code,
      account_name,
      name_en: get('name_en') || null,
      coa_layer,
      account_type,
      normal_balance,
      level: LAYER_LEVEL[coa_layer] ?? 1,
      sort_order,
      enum_laporan_keuangan,
      enum_laporan_keuangan_category,
      cash_flow_category: cfCatRes.value,
      enum_cf_section: cfSecRes.value,
      enum_cf_line: get('enum_cf_line') || null,
      direct_indirect_cost: diRes.value,
      enum_cost_category: ccRes.value,
      tax_code: get('tax_code') || null,
      description: get('description') || null,
      contra_account: bool('contra_account', false),
      is_working_capital: bool('is_working_capital', false),
      is_non_cash_item: bool('is_non_cash_item', false),
      is_budgeted: bool('is_budgeted', false),
      is_tax_deductible: bool('is_tax_deductible', true),
      is_restricted: bool('is_restricted', false),
      is_trial_balance: bool('is_trial_balance', true),
      is_taxation_report: bool('is_taxation_report', false),
      required_sub_gl: bool('required_sub_gl', false),
      is_washed_out_account: bool('is_washed_out_account', false),
      required_child: bool('required_child', false),
      is_active: bool('is_active', true),
    },
  }
}

// ─── Grid parser ─────────────────────────────────────────────────────────────

export interface ParsedGridRow {
  /** Raw values keyed by DB column name (after header mapping). */
  raw: Record<string, string>
  result: NormalizeResult
}

/**
 * Parse a string[][] grid (row 0 = headers, rows 1+ = data) into normalized rows.
 * Returns an empty array if grid has fewer than 2 rows.
 */
export function parseGrid(grid: string[][]): ParsedGridRow[] {
  if (grid.length < 2) return []
  const headers = grid[0]!
  const headerMap = buildHeaderMap(headers)

  return grid.slice(1).map((cells) => {
    const raw: Record<string, string> = {}
    for (const [key, idx] of headerMap.entries()) {
      raw[key] = (cells[idx] ?? '').trim()
    }
    return { raw, result: normalizeRow(raw) }
  })
}
