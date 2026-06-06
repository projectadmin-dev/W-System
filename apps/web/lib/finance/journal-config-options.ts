/**
 * Journal-config vocabularies, labels, and pure validation.
 *
 * Single source of truth shared by the config API routes and the
 * /finance/journal-config editor UI. The token sets MUST mirror the DB
 * CHECK constraints in 20260605000001_journal_automation_schema.sql:
 *   - chk_dynamic_source
 *   - chk_sumber_nominal
 *   - modul_referensi CHECK
 *   - posisi CHECK
 * Keeping them here (no DB/Supabase import) means the client form can import
 * the same lists, so the UI can never offer a value the DB would reject.
 */

// ── Module (konfigurasi_jurnal.modul_referensi) ───────────────────────────────
export const MODUL_OPTIONS = [
  { value: 'penjualan', label: 'Penjualan (AR)' },
  { value: 'pembelian', label: 'Pembelian (AP)' },
  { value: 'pembayaran_internal', label: 'Pembayaran Internal' },
] as const

// ── Posisi (debit/credit) ─────────────────────────────────────────────────────
export const POSISI_OPTIONS = [
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
] as const

// ── Dynamic-source tokens (konfigurasi_jurnal_detail.dynamic_source) ──────────
// `multi` = expands into N journal lines (one per source-document line).
export const DYNAMIC_SOURCE_OPTIONS = [
  { value: 'invoice_revenue_coa', label: 'Revenue COA (per invoice)', multi: false },
  { value: 'ar_bank_coa', label: 'Bank COA (AR bank account)', multi: false },
  { value: 'ap_bank_coa', label: 'Bank COA (AP payment)', multi: false },
  { value: 'pmb_expense_coa', label: 'Expense COA (permintaan uang)', multi: false },
  { value: 'pmb_bank_coa', label: 'Bank COA (pembayaran)', multi: false },
  { value: 'ap_line_coa', label: 'Expense/Asset COA (per AP line)', multi: true },
  { value: 'pmb_biaya_lain_coa', label: 'Other Cost COA (biaya lain, per line)', multi: true },
] as const

// ── Nominal-source tokens (konfigurasi_jurnal_detail.sumber_nominal) ──────────
// `perLine` nominals only make sense paired with a multi dynamic_source.
export const NOMINAL_SOURCE_OPTIONS = [
  { value: 'grand_total', label: 'Grand Total', perLine: false },
  { value: 'subtotal', label: 'Subtotal', perLine: false },
  { value: 'pajak', label: 'Pajak (PPN)', perLine: false },
  { value: 'total_piutang', label: 'Total Piutang', perLine: false },
  { value: 'bayar_sekarang', label: 'Bayar Sekarang', perLine: false },
  { value: 'nominal_bayar', label: 'Nominal Bayar', perLine: false },
  { value: 'line_amount', label: 'Jumlah per Line', perLine: true },
  { value: 'line_tax', label: 'Pajak per Line', perLine: true },
  { value: 'biaya_lain_amount', label: 'Biaya Lain per Line', perLine: true },
] as const

// ── Derived sets for O(1) membership checks ───────────────────────────────────
export const MODUL_VALUES = MODUL_OPTIONS.map((o) => o.value)
export const DYNAMIC_SOURCE_VALUES = DYNAMIC_SOURCE_OPTIONS.map((o) => o.value)
export const NOMINAL_SOURCE_VALUES = NOMINAL_SOURCE_OPTIONS.map((o) => o.value)
export const MULTI_DYNAMIC_VALUES = DYNAMIC_SOURCE_OPTIONS.filter((o) => o.multi).map((o) => o.value)

// ── Label lookups (for read-only display) ─────────────────────────────────────
export const DYNAMIC_LABELS: Record<string, string> = Object.fromEntries(
  DYNAMIC_SOURCE_OPTIONS.map((o) => [o.value, o.label]),
)
export const NOMINAL_LABELS: Record<string, string> = Object.fromEntries(
  NOMINAL_SOURCE_OPTIONS.map((o) => [o.value, o.label]),
)

// ── Detail-row shape accepted by the write API ────────────────────────────────
export interface ConfigDetailInput {
  coa_id?: string | null
  dynamic_source?: string | null
  posisi: 'debit' | 'credit'
  sumber_nominal: string
  urutan?: number
  keterangan_baris?: string | null
  is_optional?: boolean
}

export interface ConfigHeaderInput {
  kode_konfigurasi: string
  nama_fitur: string
  modul_referensi: string
  tipe_jurnal: string
  keterangan?: string | null
  detail: ConfigDetailInput[]
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

/**
 * Validate a config payload against every DB invariant before it touches the
 * database. Authoritative — the UI mirrors this but the API must not trust it.
 */
export function validateConfig(payload: ConfigHeaderInput): ValidationResult {
  const errors: string[] = []

  if (!payload.kode_konfigurasi?.trim()) errors.push('Kode konfigurasi wajib diisi')
  if (!payload.nama_fitur?.trim()) errors.push('Nama fitur wajib diisi')
  if (!payload.tipe_jurnal?.trim()) errors.push('Tipe jurnal wajib diisi')
  if (!MODUL_VALUES.includes(payload.modul_referensi as any)) {
    errors.push(`Modul referensi tidak valid: "${payload.modul_referensi}"`)
  }

  const rows = payload.detail ?? []
  if (rows.length < 2) {
    errors.push('Minimal 2 baris jurnal diperlukan (aturan double-entry)')
  }

  rows.forEach((r, i) => {
    const n = i + 1
    const hasCoa = !!r.coa_id
    const hasDyn = !!r.dynamic_source
    // chk_account_source: exactly one of coa_id / dynamic_source
    if (hasCoa === hasDyn) {
      errors.push(`Baris ${n}: isi salah satu — akun tetap (COA) ATAU akun dinamis, tidak keduanya/kosong`)
    }
    if (hasDyn && !DYNAMIC_SOURCE_VALUES.includes(r.dynamic_source as any)) {
      errors.push(`Baris ${n}: dynamic_source "${r.dynamic_source}" tidak dikenali engine`)
    }
    if (r.posisi !== 'debit' && r.posisi !== 'credit') {
      errors.push(`Baris ${n}: posisi harus debit atau credit`)
    }
    if (!NOMINAL_SOURCE_VALUES.includes(r.sumber_nominal as any)) {
      errors.push(`Baris ${n}: sumber nominal "${r.sumber_nominal}" tidak dikenali engine`)
    }
  })

  // At least one debit and one credit so a balanced journal is possible.
  if (rows.length >= 2) {
    const hasDebit = rows.some((r) => r.posisi === 'debit')
    const hasCredit = rows.some((r) => r.posisi === 'credit')
    if (!hasDebit || !hasCredit) {
      errors.push('Konfigurasi harus memiliki minimal satu baris debit dan satu baris credit')
    }
  }

  return { ok: errors.length === 0, errors }
}
