import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * POST /api/finance/payment-vouchers/[id]/issue
 * Issues voucher → update status to paid → linked to auto-journal
 * (Full journal posting will be handled via journal service integration)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params
    const body = await request.json()
    const paidBy = body.paid_by || 'System'
    const now = new Date().toISOString()

    // 1. Fetch voucher
    const { data: voucher, error: vErr } = await supabase
      .from('payment_vouchers')
      .select('*, items:payment_voucher_items(*)')
      .eq('id', id)
      .single()

    if (vErr || !voucher) return NextResponse.json({ error: 'Voucher not found' }, { status: 404 })
    if (voucher.status !== 'draft') return NextResponse.json({ error: 'Voucher must be draft' }, { status: 400 })

    // 2. Check sender balance
    let senderBalance = 0
    if (voucher.sender_type === 'bank') {
      const { data: bank } = await supabase.from('bank_accounts').select('current_balance').eq('id', voucher.sender_account_id).single()
      senderBalance = Number(bank?.current_balance || 0)
    } else {
      const { data: pc } = await supabase.from('petty_cash_custodians').select('current_balance').eq('id', voucher.sender_account_id).single()
      senderBalance = Number(pc?.current_balance || 0)
    }

    if (senderBalance < Number(voucher.total_amount || 0)) {
      return NextResponse.json({ error: 'Insufficient balance in sender account' }, { status: 400 })
    }

    // 3. Update voucher → paid
    await supabase.from('payment_vouchers').update({
      status: 'paid',
      approved_by: paidBy,
      approved_at: now,
      updated_at: now,
    }).eq('id', id)

    // 4. Decrease sender balance
    const newBalance = senderBalance - Number(voucher.total_amount || 0)
    if (voucher.sender_type === 'bank') {
      await supabase.from('bank_accounts').update({ current_balance: newBalance, updated_at: now }).eq('id', voucher.sender_account_id)
    } else {
      await supabase.from('petty_cash_custodians').update({ current_balance: newBalance, updated_at: now }).eq('id', voucher.sender_account_id)
      // Petty cash entry
      await supabase.from('petty_cash_entries').insert({
        custodian_id: voucher.sender_account_id,
        entry_type: 'expense',
        amount: voucher.total_amount,
        description: `Payment Voucher ${voucher.voucher_number} — ${voucher.receiver_name}`,
        category: 'payment_voucher',
        reference_number: voucher.voucher_number,
        entry_date: new Date().toISOString().split('T')[0],
        created_by: paidBy,
      })
    }

    // 5. Cash register entry
    await supabase.from('cash_register_entries').insert({
      entry_date: new Date().toISOString().split('T')[0],
      entry_type: 'out',
      source_type: 'vendor_payment',
      source_id: id,
      account_name: voucher.sender_type === 'bank' ? 'Bank Transfer' : 'Kas Tunai',
      amount: voucher.total_amount,
      description: `Payment Voucher ${voucher.voucher_number} — ${voucher.receiver_name}`,
      reference_number: voucher.voucher_number,
      created_by: paidBy,
    })

    return NextResponse.json({ success: true, data: { voucher_id: id, status: 'paid' } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to issue voucher' }, { status: 500 })
  }
}
