import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getPettyCashCustodians,
  createCustodian,
  getPettyCashEntries,
  createPettyCashEntry,
  deletePettyCashEntry,
  getPendingMoneyRequests,
  getPettyCashSummary,
} from '@/lib/repositories/petty-cash'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function getAuth(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();
  return { user, tenantId: profile?.tenant_id };
}

/**
 * GET /api/finance/petty-cash
 * Query params:
 *   - action: summary | entries | custodians | pending-requests
 *   - custodian_id: filter entries
 *   - type: entry_type filter
 *   - date_from, date_to: date range
 */
export async function GET(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const auth = await getAuth(supabase);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { tenantId } = auth;

  if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action') || 'entries';

  try {
    // ── Summary ──────────────────────────────────────
    if (action === 'summary') {
      const custodianId = searchParams.get('custodian_id') || undefined;
      const summary = await getPettyCashSummary(custodianId);
      return NextResponse.json({ data: summary });
    }

    // ── Entries ──────────────────────────────────────
    if (action === 'entries') {
      const custodianId = searchParams.get('custodian_id') || undefined;
      const type = searchParams.get('type') || undefined;
      const dateFrom = searchParams.get('date_from') || undefined;
      const dateTo = searchParams.get('date_to') || undefined;

      const entries = await getPettyCashEntries(custodianId, type, dateFrom, dateTo);
      return NextResponse.json({ data: entries });
    }

    // ── Custodians ───────────────────────────────────
    if (action === 'custodians') {
      const custodians = await getPettyCashCustodians(tenantId);
      return NextResponse.json({ data: custodians });
    }

    // ── Pending Money Requests (for settlement) ─────────
    if (action === 'pending-requests') {
      const requests = await getPendingMoneyRequests(tenantId);
      return NextResponse.json({ data: requests });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('Petty Cash GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch data' }, { status: 500 });
  }
}

/**
 * POST /api/finance/petty-cash
 * Create new petty cash entry (topup, expense, settlement, return, adjustment)
 * Body:
 *   {
 *     type: 'entry' | 'custodian',
 *     ...entry fields or custodian fields
 *   }
 */
export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const auth = await getAuth(supabase);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { user, tenantId } = auth;

  try {
    const body = await request.json();
    const { type, ...data } = body;

    // ── Create Custodian ────────────────────────────
    if (type === 'custodian') {
      const custodian = await createCustodian({
        ...data,
        tenant_id: tenantId,
        created_by: user.id,
      });
      return NextResponse.json({ data: custodian }, { status: 201 });
    }

    // ── Create Entry ────────────────────────────────
    if (type === 'entry') {
      const entry = await createPettyCashEntry({
        ...data,
        tenant_id: tenantId,
        created_by: user.id,
      });
      return NextResponse.json({ data: entry }, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid type. Use entry or custodian' }, { status: 400 });
  } catch (err: any) {
    console.error('Petty Cash POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create' }, { status: 500 });
  }
}

/**
 * DELETE /api/finance/petty-cash
 * Delete an entry
 * Body: { type: 'entry', id: string }
 */
export async function DELETE(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const auth = await getAuth(supabase);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { type, id } = body;

    if (!type || !id) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (type === 'entry') {
      await deletePettyCashEntry(id);
      return NextResponse.json({ success: true });
    }

    // Soft delete custodian
    if (type === 'custodian') {
      const { data: adminClient } = createClient(supabaseUrl, supabaseKey);
      await adminClient
        .from('petty_cash_custodians')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    console.error('Petty Cash DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete' }, { status: 500 });
  }
}
