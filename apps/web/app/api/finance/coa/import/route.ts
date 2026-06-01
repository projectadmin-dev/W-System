import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { COA_COLUMNS } from '@/lib/coa-import-schema'

const TENANT = '00000000-0000-0000-0000-000000000001'

// Columns the import is allowed to write (server-side whitelist).
const ALLOWED_KEYS = new Set([
  ...COA_COLUMNS.map((c) => c.key),
  'parent_account_id', // resolved client-side, passed through
])

/**
 * POST /api/finance/coa/import — bulk-create COA rows from a parsed payload.
 * Body: { filename?, rows: CoaImportRow[] }
 *
 * Each row has already been validated + normalized client-side (normalizeRow).
 * The server whitelists columns, coerces booleans, and inserts row-by-row so
 * one bad row never aborts the batch. Records a single IMPORT audit entry.
 */
export async function POST(request: NextRequest) {
  try {
    const db = createAdminClient()
    const { rows = [], filename } = await request.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada baris untuk diimpor' }, { status: 400 })
    }

    let success = 0
    const errors: { code: string; reason: string }[] = []

    for (const r of rows) {
      const code = String(r.account_code ?? r.coa_full_code ?? '?')
      if (!r.account_code || !r.account_name) {
        errors.push({ code, reason: 'account_code / account_name wajib diisi' })
        continue
      }

      // Whitelist: drop any unknown keys to prevent injection
      const safe: Record<string, unknown> = { tenant_id: TENANT }
      for (const key of ALLOWED_KEYS) {
        if (key in r && r[key] !== undefined) {
          safe[key] = r[key]
        }
      }

      // account_code stores the full hierarchical code
      safe['account_code'] = code
      // Mirror to coa_full_code if not already set
      if (!safe['coa_full_code']) safe['coa_full_code'] = code

      // Coerce booleans sent as strings (defensive)
      const BOOL_KEYS = ['contra_account', 'is_working_capital', 'is_non_cash_item', 'is_budgeted',
        'is_tax_deductible', 'is_restricted', 'is_trial_balance', 'is_taxation_report',
        'required_sub_gl', 'is_washed_out_account', 'required_child', 'is_active']
      for (const bk of BOOL_KEYS) {
        if (bk in safe) {
          const v = safe[bk]
          if (typeof v === 'string') {
            safe[bk] = ['true', '1', 'yes', 'ya'].includes(v.toLowerCase())
          }
        }
      }

      const { error } = await db.from('coa').insert(safe as never)
      if (error) errors.push({ code, reason: error.message })
      else success++
    }

    const failed = rows.length - success

    try {
      await db.from('coa_audit_log').insert({
        tenant_id: TENANT, action: 'IMPORT', severity: 'medium',
        actor_nik: 'system', actor_nama: 'System',
        target_name: filename || 'Excel/CSV import', field: 'import',
        after_data: { total: rows.length, success, failed, errors: errors.slice(0, 20) },
        note: `Imported ${success}/${rows.length}${failed ? ` · ${failed} gagal` : ''}`,
      } as never)
    } catch { /* audit best-effort */ }

    return NextResponse.json({ data: { total: rows.length, success, failed, errors } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
