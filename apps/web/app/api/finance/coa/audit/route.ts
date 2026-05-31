import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

/**
 * GET /api/finance/coa/audit — immutable CoA audit trail.
 * Query: action (all|CREATE|EDIT|DELETE|CONFIG|STATUS|APPROVAL|IMPORT), severity (all|low|medium|high), q
 * Returns { data } and degrades to an empty list if the audit table is not yet provisioned.
 */
export async function GET(request: NextRequest) {
  try {
    const db = createAdminClient()
    const sp = request.nextUrl.searchParams
    const action = sp.get('action')
    const severity = sp.get('severity')
    const q = (sp.get('q') || '').toLowerCase()

    let query = db
      .from('coa_audit_log')
      .select('*')
      .eq('tenant_id', TENANT)
      .order('created_at', { ascending: false })
      .limit(300)
    if (action && action !== 'all') query = query.eq('action', action)
    if (severity && severity !== 'all') query = query.eq('severity', severity)

    const { data, error } = await query
    if (error) return NextResponse.json({ data: [] }) // table may not be provisioned yet

    let rows = data ?? []
    if (q) {
      rows = rows.filter(
        (r: Record<string, unknown>) =>
          String(r.target_name ?? '').toLowerCase().includes(q) ||
          String(r.target_coa_code ?? '').toLowerCase().includes(q) ||
          String(r.actor_nama ?? '').toLowerCase().includes(q),
      )
    }
    return NextResponse.json({ data: rows })
  } catch (err) {
    return NextResponse.json({ data: [], error: String(err) })
  }
}
