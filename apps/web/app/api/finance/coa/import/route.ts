import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

/**
 * POST /api/finance/coa/import — bulk-create COA rows from a parsed CSV.
 * Body: { filename?, rows: [{ account_code, account_name, account_type, level,
 *         normal_balance, coa_layer, parent_account_id }] }
 * Inserts row-by-row (so one bad row doesn't abort the batch) and records a
 * single IMPORT entry in the audit trail. Returns per-row failure reasons.
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
      if (!r.account_code || !r.account_name || !r.account_type || !r.level) {
        errors.push({ code: String(r.account_code ?? '?'), reason: 'Field wajib kosong (code/name/type/level)' })
        continue
      }
      const { error } = await db.from('coa').insert({ ...r, tenant_id: TENANT } as never)
      if (error) errors.push({ code: String(r.account_code), reason: error.message })
      else success++
    }
    const failed = rows.length - success

    try {
      await db.from('coa_audit_log').insert({
        tenant_id: TENANT, action: 'IMPORT', severity: 'medium',
        actor_nik: 'system', actor_nama: 'System',
        target_name: filename || 'CSV import', field: 'import',
        after_data: { total: rows.length, success, failed, errors: errors.slice(0, 20) },
        note: `Imported ${success}/${rows.length}${failed ? ` · ${failed} gagal` : ''}`,
      } as never)
    } catch {
      /* audit best-effort */
    }

    return NextResponse.json({ data: { total: rows.length, success, failed, errors } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
