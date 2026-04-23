import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params
    const body = await request.json()
    const paidBy = body.paid_by || 'System'

    // 1. Get money request
    const { data: req, error: reqErr } = await supabase
      .from('money_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (reqErr || !req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if (req.status !== 'approved') return NextResponse.json({ error: 'Request must be approved first' }, { status: 400 })
    if (req.status === 'paid') return NextResponse.json({ error: 'Request already paid' }, { status: 400 })

    const now = new Date().toISOString()

    // 2. Update money request
    const { error: updErr } = await supabase
      .from('money_requests')
      .update({
        paid_at: now,
        paid_by: paidBy,
        status: 'paid',
      })
      .eq('id', id)

    if (updErr) throw updErr

    // 3. Create cash register entry (out)
    const { data: entry, error: entryErr } = await supabase
      .from('cash_register_entries')
      .insert({
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: 'out',
        source_type: 'money_request',
        source_id: id,
        account_name: 'Kas Kecil',
        amount: req.amount,
        description: `Payment for Money Request ${req.request_number} - ${req.purpose}`,
        reference_number: req.request_number,
        created_by: paidBy,
      })
      .select()
      .single()

    if (entryErr) throw entryErr

    return NextResponse.json({ success: true, data: entry })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
