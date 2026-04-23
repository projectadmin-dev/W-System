import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/finance/vendor-bills/[id]/record-payment
 * Record a payment against a specific vendor bill.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params
    const body = await request.json()

    // 1. Fetch bill
    const { data: bill, error: billErr } = await supabase
      .from('vendor_bills')
      .select('*')
      .eq('id', id)
      .single()

    if (billErr || !bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

    const paymentAmount = Number(body.amount) || 0
    if (paymentAmount <= 0) return NextResponse.json({ error: 'Payment amount must be positive' }, { status: 400 })

    const newPaid = (Number(bill.amount_paid) || 0) + paymentAmount
    const newBalance = Number(bill.total_amount) - newPaid
    const now = new Date().toISOString()

    const status = newBalance <= 0 ? 'paid' : 'partial'
    const paidAt = status === 'paid' ? now : bill.paid_at
    const paidDays = status === 'paid' && bill.bill_date 
      ? Math.ceil((new Date(now).getTime() - new Date(bill.bill_date).getTime()) / 86400000)
      : bill.paid_days

    // 2. Create payment record (payments table is for outgoing)
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        payment_number: body.payment_number || `PYV-${Date.now()}`, // payment to vendor
        payment_type: 'outgoing',
        reference_type: 'bill',
        reference_number: bill.bill_number,
        vendor_id: bill.vendor_id,
        bill_id: id,
        amount: paymentAmount,
        payment_date: body.payment_date || now.split('T')[0],
        payment_method: body.payment_method || 'transfer',
        notes: body.notes || `Payment for vendor bill ${bill.bill_number}`,
        status: 'completed',
      })
      .select()
      .single()

    if (payErr) return NextResponse.json({ error: 'Failed to record payment', details: payErr.message }, { status: 500 })

    // 3. Update vendor bill
    const { data: updatedBill } = await supabase
      .from('vendor_bills')
      .update({
        amount_paid: newPaid,
        amount_due: newBalance,
        status,
        paid_at: paidAt,
        paid_days: paidDays,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single()

    // 4. Create cash register entry (out)
    await supabase.from('cash_register_entries').insert({
      entry_date: new Date().toISOString().split('T')[0],
      entry_type: 'out',
      source_type: 'vendor_payment',
      source_id: id,
      account_name: 'Kas Kecil',
      amount: paymentAmount,
      description: `Payment for vendor bill ${bill.bill_number}`,
      reference_number: payment.payment_number,
    })

    return NextResponse.json({ success: true, payment, bill: updatedBill })
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal error', details: err.message }, { status: 500 })
  }
}
