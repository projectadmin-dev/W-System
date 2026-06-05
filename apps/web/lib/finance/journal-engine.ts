import { createAdminClient } from '@/lib/supabase-server'
import { createJournalEntry, postJournalEntry } from '@/lib/repositories/finance-journal'

/**
 * Journal Automation Engine (Phase 2)
 * -----------------------------------
 * Config-driven double-entry generator. For a given trigger code it loads the
 * active `konfigurasi_jurnal` + `konfigurasi_jurnal_detail`, resolves each line's
 * account (fixed COA or a dynamic value pulled from the source document) and
 * nominal, validates balance, then persists + auto-posts a journal entry linked
 * to the source document.
 *
 * Design rules (per SDD-JURNAL-OTOMATIS):
 *  - Always Balanced: only persisted when total debit == total credit.
 *  - Non-blocking (NFR-02): failures are logged to `jurnal_error_log` and
 *    returned to the caller; they must NOT roll back the business transaction.
 *  - Idempotent: a source document that already has an active journal is a no-op.
 *  - Zero-nominal lines are skipped silently.
 */

// ── Source-nominal vocabularies (must match the DB CHECK constraints) ──
export const SCALAR_NOMINAL_SOURCES = [
  'grand_total', 'subtotal', 'pajak', 'total_piutang', 'bayar_sekarang', 'nominal_bayar',
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

export type JournalErrorCode =
  | 'NO_CONFIG'
  | 'NO_LINES'
  | 'MISSING_ACCOUNT'
  | 'NOT_BALANCED'
  | 'PERSIST_FAILED'

export interface JournalAutomationResult {
  success: boolean
  journalEntryId?: string
  entryNumber?: string
  /** true when there was nothing to post (all zero / no config) */
  skipped?: boolean
  /** true when an active journal already existed for this source */
  idempotent?: boolean
  errorCode?: JournalErrorCode
  message?: string
}

interface ConfigDetailRow {
  id: string
  coa_id: string | null
  dynamic_source: string | null
  posisi: 'debit' | 'credit'
  sumber_nominal: string
  urutan: number
  keterangan_baris: string | null
  is_optional: boolean
}

interface ResolvedLine {
  coa_id: string
  posisi: 'debit' | 'credit'
  amount: number
  description?: string
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100
const isMulti = (s: string | null): s is MultiDynamicSource =>
  !!s && (MULTI_DYNAMIC_SOURCES as readonly string[]).includes(s)

/** Map source_type -> { table, idColumn } for journal_entry_id write-back. */
const SOURCE_LINK: Record<string, { table: string; idColumn: string }> = {
  ar_invoice: { table: 'ar_invoices', idColumn: 'id' },
  ar_payment: { table: 'ar_payment_history', idColumn: 'id' },
  ap_invoice: { table: 'ap_invoices', idColumn: 'id' },
  ap_payment: { table: 'ap_payment_history', idColumn: 'id' },
  pembayaran: { table: 'pembayaran', idColumn: 'id' },
}

function resolveScalarNominal(source: string, payload: JournalAutomationPayload): number {
  const v = payload.nominals?.[source as ScalarNominalSource]
  return typeof v === 'number' && isFinite(v) ? v : 0
}

/**
 * Process a trigger and create (auto-post) the resulting journal entry.
 * Never throws — all failures are captured in the result + jurnal_error_log.
 */
export async function processJournalAutomation(
  payload: JournalAutomationPayload,
): Promise<JournalAutomationResult> {
  const db: any = await createAdminClient()

  try {
    // [0] Idempotency — skip if this source already has an active journal.
    const { data: existing } = await db
      .from('journal_entries')
      .select('id, entry_number')
      .eq('source_type', payload.sourceType)
      .eq('source_id', payload.sourceId)
      .eq('is_reversal', false)
      .is('deleted_at', null)
      .in('status', ['draft', 'posted'])
      .maybeSingle()

    if (existing) {
      return {
        success: true,
        idempotent: true,
        journalEntryId: existing.id,
        entryNumber: existing.entry_number,
      }
    }

    // [1] Load active configuration.
    const { data: config } = await db
      .from('konfigurasi_jurnal')
      .select('id, kode_konfigurasi')
      .eq('tenant_id', payload.tenantId)
      .eq('kode_konfigurasi', payload.triggerCode)
      .eq('is_aktif', true)
      .is('deleted_at', null)
      .maybeSingle()

    if (!config) {
      const message = `Konfigurasi "${payload.triggerCode}" tidak aktif atau tidak ditemukan`
      await logJournalError(db, payload, 'NO_CONFIG', message)
      return { success: false, errorCode: 'NO_CONFIG', message }
    }

    const { data: details } = await db
      .from('konfigurasi_jurnal_detail')
      .select('id, coa_id, dynamic_source, posisi, sumber_nominal, urutan, keterangan_baris, is_optional')
      .eq('konfigurasi_id', config.id)
      .order('urutan', { ascending: true })

    const rows: ConfigDetailRow[] = details || []

    // [2] Resolve lines.
    const lines: ResolvedLine[] = []
    for (const row of rows) {
      if (isMulti(row.dynamic_source)) {
        // Expand one config row into N lines from the document.
        const items = payload.dynamicLines?.[row.dynamic_source] ?? []
        for (const item of items) {
          const amount = round2(item.amount)
          if (amount <= 0) continue // skip zero
          if (!item.coaId) {
            const message = `Akun dinamis "${row.dynamic_source}" kosong pada salah satu baris`
            await logJournalError(db, payload, 'MISSING_ACCOUNT', message, config.kode_konfigurasi)
            return { success: false, errorCode: 'MISSING_ACCOUNT', message }
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

      // Single line.
      const amount = round2(resolveScalarNominal(row.sumber_nominal, payload))
      if (amount <= 0) continue // skip zero (covers optional PPN lines, etc.)

      const coaId = row.coa_id ?? payload.dynamicAccounts?.[row.dynamic_source as SingleDynamicSource]
      if (!coaId) {
        const message = `Akun untuk baris "${row.dynamic_source ?? row.sumber_nominal}" tidak dapat di-resolve`
        await logJournalError(db, payload, 'MISSING_ACCOUNT', message, config.kode_konfigurasi)
        return { success: false, errorCode: 'MISSING_ACCOUNT', message }
      }

      lines.push({
        coa_id: coaId,
        posisi: row.posisi,
        amount,
        description: row.keterangan_baris ?? undefined,
      })
    }

    // [3] Nothing to post (e.g. all nominals zero) — skip, not an error.
    if (lines.length === 0) {
      return { success: true, skipped: true, message: 'Tidak ada baris bernominal > 0' }
    }

    // [4] Balance validation.
    const totalDebit = round2(
      lines.filter((l) => l.posisi === 'debit').reduce((s, l) => s + l.amount, 0),
    )
    const totalCredit = round2(
      lines.filter((l) => l.posisi === 'credit').reduce((s, l) => s + l.amount, 0),
    )
    if (lines.length < 2 || Math.abs(totalDebit - totalCredit) > 0.01) {
      const message = `Jurnal tidak balance: debit=${totalDebit}, credit=${totalCredit}`
      await logJournalError(db, payload, 'NOT_BALANCED', message, config.kode_konfigurasi, {
        totalDebit,
        totalCredit,
        lines,
      })
      return { success: false, errorCode: 'NOT_BALANCED', message }
    }

    // [5] Persist + auto-post (reuses the PSAK-validated repository insert).
    const entryNumber = generateEntryNumber(payload.transactionDate)
    const entry = {
      entry_number: entryNumber,
      transaction_date: payload.transactionDate,
      posting_date: payload.transactionDate,
      source_type: payload.sourceType,
      source_id: payload.sourceId,
      description: payload.description ?? `Auto-journal ${payload.triggerCode}`,
      reference_number: payload.referenceNumber ?? null,
      currency: payload.currency ?? 'IDR',
      // Insert as draft, then post — the DB's validate_journal_balance_on_post
      // trigger checks balance against the lines, and a draft can be rolled back
      // if line insertion fails (posted entries are immutable).
      status: 'draft',
      kategori_jurnal: 'REGULAR',
      fiscal_period_id: await resolveFiscalPeriod(db, payload.tenantId, payload.transactionDate),
      prepared_by: payload.createdBy,
      posted_by: payload.createdBy,
      created_by: payload.createdBy,
      tenant_id: payload.tenantId,
    }

    const lineInserts = lines.map((l) => ({
      coa_id: l.coa_id,
      debit_amount: l.posisi === 'debit' ? l.amount : 0,
      credit_amount: l.posisi === 'credit' ? l.amount : 0,
      line_description: l.description ?? null,
      tenant_id: payload.tenantId,
      created_by: payload.createdBy,
    }))

    let created: any
    try {
      created = await createJournalEntry(entry as any, lineInserts as any)
    } catch (err) {
      const message = (err as Error).message
      await logJournalError(db, payload, 'PERSIST_FAILED', message, config.kode_konfigurasi, { entry, lines })
      return { success: false, errorCode: 'PERSIST_FAILED', message }
    }

    // [6] Post the draft (balance re-validated by DB trigger against the lines).
    try {
      await postJournalEntry(created.id, payload.createdBy)
    } catch (err) {
      const message = (err as Error).message
      await logJournalError(db, payload, 'PERSIST_FAILED', `Post failed: ${message}`, config.kode_konfigurasi, { entryId: created.id })
      return { success: false, errorCode: 'PERSIST_FAILED', message, journalEntryId: created.id }
    }

    // [7] Best-effort write-back of journal_entry_id to the source document.
    await linkSourceDocument(db, payload.sourceType, payload.sourceId, created.id)

    return { success: true, journalEntryId: created.id, entryNumber }
  } catch (err) {
    // Last-resort guard: never throw to the caller (non-blocking).
    const message = (err as Error).message
    await logJournalError(db, payload, 'PERSIST_FAILED', message)
    return { success: false, errorCode: 'PERSIST_FAILED', message }
  }
}

function generateEntryNumber(transactionDate: string): string {
  const date = new Date(transactionDate || new Date())
  const valid = isNaN(date.getTime()) ? new Date() : date
  const year = valid.getFullYear()
  const month = String(valid.getMonth() + 1).padStart(2, '0')
  const ts = Date.now().toString().slice(-6)
  return `JE-${year}${month}-${ts}`
}

async function resolveFiscalPeriod(
  db: any,
  tenantId: string,
  date: string,
): Promise<string | null> {
  try {
    const { data } = await db
      .from('fiscal_periods')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .lte('start_date', date)
      .gte('end_date', date)
      .is('deleted_at', null)
      .neq('status', 'closed')
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data?.id ?? null
  } catch {
    return null
  }
}

async function linkSourceDocument(
  db: any,
  sourceType: string,
  sourceId: string,
  journalEntryId: string,
): Promise<void> {
  const link = SOURCE_LINK[sourceType]
  if (!link) return
  try {
    await db.from(link.table).update({ journal_entry_id: journalEntryId }).eq(link.idColumn, sourceId)
  } catch {
    // Non-fatal: idempotency still holds via journal_entries.source_id.
  }
}

async function logJournalError(
  db: any,
  payload: JournalAutomationPayload,
  errorCode: JournalErrorCode,
  message: string,
  kodeKonfigurasi?: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.from('jurnal_error_log').insert({
      tenant_id: payload.tenantId,
      kode_konfigurasi: kodeKonfigurasi ?? payload.triggerCode,
      source_type: payload.sourceType,
      source_id: payload.sourceId,
      error_code: errorCode,
      pesan_error: message,
      payload_json: { payload, ...extra },
    })
  } catch {
    // Swallow — logging must never break the caller.
  }
}
