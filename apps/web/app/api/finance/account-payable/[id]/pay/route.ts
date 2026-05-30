import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

// Record a (partial or full) payment against an approved bill.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = createAdminClient()
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { amount, actor_id, actor_name, notes } = body

    const { data: inv } = await db
      .from('ap_invoices').select('*')
      .eq('id', id).eq('tenant_id', TENANT).is('deleted_at', null).single()
    if (!inv) return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 })
    if (inv.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Tagihan harus berstatus Disetujui sebelum dibayar' }, { status: 422 })
    }

    // Default: pay the full remaining amount
    const due = Number(inv.amount_due || 0)
    const payAmt = amount != null ? Number(amount) : due
    if (payAmt <= 0) return NextResponse.json({ error: 'Nominal pembayaran harus > 0' }, { status: 400 })
    if (payAmt > due + 0.009) {
      return NextResponse.json({ error: `Nominal melebihi sisa tagihan (${due})` }, { status: 400 })
    }

    const newPaid = Number(inv.amount_paid || 0) + payAmt
    const fullyPaid = newPaid >= Number(inv.grand_total || 0) - 0.009

    const { data, error } = await db
      .from('ap_invoices')
      .update({
        amount_paid: newPaid,
        status: fullyPaid ? 'PAID' : 'APPROVED',
        paid_at: fullyPaid ? new Date().toISOString() : inv.paid_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id).eq('tenant_id', TENANT)
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await db.from('ap_approval_steps').insert({
      ap_invoice_id: id, step: 3, action: 'PAY',
      actor_id: actor_id || null, actor_name: actor_name || null,
      notes: notes || `Pembayaran ${payAmt.toLocaleString('id-ID')}${fullyPaid ? ' (LUNAS)' : ' (sebagian)'}`,
    })

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
