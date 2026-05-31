import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

/**
 * GET /api/finance/coa/approvals — pending master-data → Detail-Ledger approvals.
 * Degrades to an empty list if the table is not yet provisioned (or none queued).
 */
export async function GET() {
  try {
    const db = createAdminClient()
    const { data, error } = await db
      .from('coa_pending_approval')
      .select('*')
      .eq('tenant_id', TENANT)
      .eq('status', 'PENDING')
      .order('requested_at', { ascending: false })
    if (error) return NextResponse.json({ data: [] })
    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    return NextResponse.json({ data: [], error: String(err) })
  }
}

/**
 * POST /api/finance/coa/approvals — resolve selected approvals.
 * Body: { action: 'approve' | 'reject', ids: string[], note?: string }
 * (DL auto-generation happens once real master-data sources exist — OQ-3.)
 */
export async function POST(request: NextRequest) {
  try {
    const db = createAdminClient()
    const { action, ids = [], note } = await request.json()
    if (!['approve', 'reject'].includes(action) || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Wajib: action (approve|reject) + ids[]' }, { status: 400 })
    }
    const status = action === 'approve' ? 'APPROVED' : 'REJECTED'
    const { error } = await db
      .from('coa_pending_approval')
      .update({ status, resolved_at: new Date().toISOString(), resolved_by: 'system', note: note ?? null })
      .in('id', ids)
      .eq('tenant_id', TENANT)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: { count: ids.length, status } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
