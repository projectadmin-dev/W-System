import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/finance/customer-invoices/[id]/record-payment
 * Record a payment against a specific customer invoice.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params
    const body = await request.json()

    // 1. Fetch invoice
    const { data: invoice, error: invErr } = await supabase
      .from('customer_invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (invErr || !invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    const paymentAmount = Number(body.amount) || 0
    if (paymentAmount <= 0) return NextResponse.json({ error: 'Payment amount must be positive' }, { status: 400 })

    // 2. Insert payment
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        payment_number: body.payment_number || `PAY-${Date.now()}`,
        payment_type: 'incoming',
        reference_type: 'invoice',
        reference_number: invoice.invoice_number,
        invoice_id: id,
        client_id: invoice.customer_id,
        amount: paymentAmount,
        payment_date: body.payment_date || new Date().toISOString().split('T')[0],
        payment_method: body.payment_method || 'transfer',
        notes: body.notes || `Payment for invoice ${invoice.invoice_number}`,
      })
      .select()
      .single()

    if (payErr) return NextResponse.json({ error: 'Failed to record payment', details: payErr.message }, { status: 500 })

    // 3. Update invoice paid_amount & balance_due
    const newPaid = (Number(invoice.paid_amount) || 0) + paymentAmount
    const newBalance = Number(invoice.total_amount) - newPaid
    const nowIso = new Date().toISOString()

    const status = newBalance <= 0 ? 'paid' : (newPaid > 0 ? 'partial' : invoice.status)
    const paidAt = status === 'paid' ? nowIso : invoice.paid_at
    const paidDays = status === 'paid' && invoice.invoice_date ? Math.ceil((new Date(nowIso).getTime() - new Date(invoice.invoice_date).getTime()) / 86400000) : invoice.paid_days

    const { data: updatedInv } = await supabase
      .from('customer_invoices')
      .update({
        paid_amount: newPaid,
        balance_due: newBalance,
        status,
        paid_at: paidAt,
        paid_days: paidDays,
        updated_at: nowIso,
      })
      .eq('id', id)
      .select()
      .single()

    return NextResponse.json({ success: true, payment, invoice: updatedInv })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
