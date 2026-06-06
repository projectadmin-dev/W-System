/**
 * Journal Automation Engine — pure core (no DB, no side effects).
 * Split out from journal-engine.ts so the resolution/balance logic is
 * unit-testable with `node --test` (no path aliases, no Supabase import).
 */

// ── Source-nominal vocabularies (must match the DB CHECK constraints) ──
export const SCALAR_NOMINAL_SOURCES = [
  'grand_total', 'subtotal', 'pajak', 'total_piutang', 'bayar_sekarang', 'nominal_bayar',
  // Tax-withholding tokens (Fase A). See docs/TAX-WITHHOLDING-PLAN.md.
  // pph_amount = PPh withheld; kas_neto = net cash = gross − pph.
  'pph_amount', 'kas_neto',
] as const
export const SINGLE_DYNAMIC_SOURCES = [
  'invoice_revenue_coa', 'ar_bank_coa', 'ap_bank_coa', 'pmb_expense_coa', 'pmb_bank_coa',
] as const
export const MULTI_DYNAMIC_SOURCES = ['ap_line_coa', 'pmb_biaya_lain_coa'] as const

export type ScalarNominalSource = (typeof SCALAR_NOMINAL_SOURCES)[number]
export type SingleDynamicSource = (typeof SINGLE_DYNAMIC_SOURCES)[number]
export type MultiDynamicSource = (typeof MULTI_DYNAMIC_SOURCES)[number]

export interface JournalLineInput {
  coaId: string | null | undefined
  amount: number
  description?: string
}

export interface JournalAutomationPayload {
  /** konfigurasi_jurnal.kode_konfigurasi, e.g. "AR-INV-ISSUE" */
  triggerCode: string
  /** journal_entries.source_type, e.g. "ar_invoice" */
  sourceType: string
  /** journal_entries.source_id (UUID of the source document/row) */
  sourceId: string
  tenantId: string
  /** YYYY-MM-DD */
  transactionDate: string
  createdBy: string
  description?: string
  referenceNumber?: string
  currency?: string
  /** scalar amounts keyed by sumber_nominal */
  nominals?: Partial<Record<ScalarNominalSource, number>>
  /** single dynamic accounts keyed by dynamic_source token -> coa_id */
  dynamicAccounts?: Partial<Record<SingleDynamicSource, string | null | undefined>>
  /** multi-line dynamic accounts keyed by dynamic_source token -> lines */
  dynamicLines?: Partial<Record<MultiDynamicSource, JournalLineInput[]>>
}

export interface ConfigDetailRow {
  id: string
  coa_id: string | null
  dynamic_source: string | null
  posisi: 'debit' | 'credit'
  sumber_nominal: string
  urutan: number
  keterangan_baris: string | null
  is_optional: boolean
}

export interface ResolvedLine {
  coa_id: string
  posisi: 'debit' | 'credit'
  amount: number
  description?: string
}

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100

export const isMulti = (s: string | null): s is MultiDynamicSource =>
  !!s && (MULTI_DYNAMIC_SOURCES as readonly string[]).includes(s)

export function resolveScalarNominal(source: string, payload: JournalAutomationPayload): number {
  const v = payload.nominals?.[source as ScalarNominalSource]
  return typeof v === 'number' && isFinite(v) ? v : 0
}

export type LineResolution =
  | { ok: true; lines: ResolvedLine[] }
  | { ok: false; errorCode: 'MISSING_ACCOUNT'; message: string }

/**
 * Pure resolution of config detail rows into journal lines for a payload.
 * Skips zero-nominal lines; expands multi-line dynamic sources; returns an
 * error if a line needs an account that the document didn't provide.
 */
export function resolveJournalLines(
  rows: ConfigDetailRow[],
  payload: JournalAutomationPayload,
): LineResolution {
  const lines: ResolvedLine[] = []
  for (const row of rows) {
    if (isMulti(row.dynamic_source)) {
      const items = payload.dynamicLines?.[row.dynamic_source] ?? []
      for (const item of items) {
        const amount = round2(item.amount)
        if (amount <= 0) continue // skip zero
        if (!item.coaId) {
          return {
            ok: false,
            errorCode: 'MISSING_ACCOUNT',
            message: `Akun dinamis "${row.dynamic_source}" kosong pada salah satu baris`,
          }
        }
        lines.push({
          coa_id: item.coaId,
          posisi: row.posisi,
          amount,
          description: item.description ?? row.keterangan_baris ?? undefined,
        })
      }
      continue
    }

    const amount = round2(resolveScalarNominal(row.sumber_nominal, payload))
    if (amount <= 0) continue // skip zero (covers optional PPN lines, etc.)

    const coaId = row.coa_id ?? payload.dynamicAccounts?.[row.dynamic_source as SingleDynamicSource]
    if (!coaId) {
      return {
        ok: false,
        errorCode: 'MISSING_ACCOUNT',
        message: `Akun untuk baris "${row.dynamic_source ?? row.sumber_nominal}" tidak dapat di-resolve`,
      }
    }
    lines.push({
      coa_id: coaId,
      posisi: row.posisi,
      amount,
      description: row.keterangan_baris ?? undefined,
    })
  }
  return { ok: true, lines }
}

/** Pure balance check: requires >=2 lines and |debit-credit| <= 0.01. */
export function computeBalance(lines: ResolvedLine[]): {
  balanced: boolean
  totalDebit: number
  totalCredit: number
} {
  const totalDebit = round2(lines.filter((l) => l.posisi === 'debit').reduce((s, l) => s + l.amount, 0))
  const totalCredit = round2(lines.filter((l) => l.posisi === 'credit').reduce((s, l) => s + l.amount, 0))
  return { balanced: lines.length >= 2 && Math.abs(totalDebit - totalCredit) <= 0.01, totalDebit, totalCredit }
}
