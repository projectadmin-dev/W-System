import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/finance/money-requests/[id]/pay
 * Pays the approved money request:
 *  1. Updates money_requests to paid
 *  2. Creates a petty_cash settlement entry (auto-debit from petty cash)
 *  3. Creates a cash_register entry for legacy tracking
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params
    const body = await request.json()
    const paidBy = body.paid_by || 'System'
    const custodianId = body.custodian_id // optional: user can specify which petty cash custodian

    // 1. Get money request with items
    const { data: req, error: reqErr } = await supabase
      .from('money_requests')
      .select('*, items:money_request_items(*)')
      .eq('id', id)
      .single()

    if (reqErr || !req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if (req.status !== 'approved') return NextResponse.json({ error: 'Request must be approved first' }, { status: 400 })
    if (req.status === 'paid') return NextResponse.json({ error: 'Request already paid' }, { status: 400 })

    const now = new Date().toISOString()
    const today = new Date().toISOString().split('T')[0]

    // 2. Find a suitable custodian if not provided
    let targetCustodian = custodianId
    if (!targetCustodian) {
      const { data: custodians } = await supabase
        .from('petty_cash_custodians')
        .select('id, current_balance')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('current_balance', { ascending: false })
        .limit(1)
      if (custodians && custodians.length > 0) {
        targetCustodian = custodians[0].id
      }
    }

    // Verify sufficient balance
    if (targetCustodian) {
      const { data: cust } = await supabase
        .from('petty_cash_custodians')
        .select('current_balance')
        .eq('id', targetCustodian)
        .single()
      if (!cust || Number(cust.current_balance) < Number(req.amount)) {
        return NextResponse.json(
          { error: 'Insufficient petty cash balance. Top-up required.' },
          { status: 400 }
        )
      }
    }

    // 3. Update money request to paid
    const { error: updErr } = await supabase
      .from('money_requests')
      .update({
        paid_at: now,
        paid_by: paidBy,
        status: 'paid',
        settled_from_petty_cash: true,
      })
      .eq('id', id)

    if (updErr) throw updErr

    let pettyCashEntry = null

    // 4. Create petty cash settlement entry
    if (targetCustodian) {
      const { data: entry, error: entryErr } = await supabase
        .from('petty_cash_entries')
        .insert({
          custodian_id: targetCustodian,
          entry_type: 'settlement',
          amount: req.amount,
          description: `Payment for Money Request ${req.request_number} — ${req.purpose}`,
          category: 'money_request',
          reference_number: req.request_number,
          entry_date: today,
          money_request_id: id,
          recipient_name: req.employee_name,
          recipient_department: req.department,
          created_by: paidBy,
        })
        .select()
        .single()

      if (!entryErr) pettyCashEntry = entry

      // Update money_request with petty cash entry link
      await supabase
        .from('money_requests')
        .update({ petty_cash_entry_id: entry?.id || null })
        .eq('id', id)
    }

    // 5. Legacy: create cash_register entry
    const { data: cashEntry, error: cashErr } = await supabase
      .from('cash_register_entries')
      .insert({
        entry_date: today,
        entry_type: 'out',
        source_type: 'money_request',
        source_id: id,
        account_name: 'Kas Kecil',
        amount: req.amount,
        description: `Payment for Money Request ${req.request_number} — ${req.purpose}`,
        reference_number: req.request_number,
        created_by: paidBy,
      })
      .select()
      .single()

    return NextResponse.json({
      success: true,
      data: {
        money_request: req,
        petty_cash_entry: pettyCashEntry,
        cash_register_entry: cashEntry || null,
      },
    })
  } catch (err: any) {
    console.error('Money Request Pay error:', err)
    return NextResponse.json({ error: err.message || 'Failed to process payment' }, { status: 500 })
  }
}
