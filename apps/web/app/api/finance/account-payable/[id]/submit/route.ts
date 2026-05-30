import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = createAdminClient()
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const { data: inv } = await db
      .from('ap_invoices').select('status')
      .eq('id', id).eq('tenant_id', TENANT).is('deleted_at', null).single()
    if (!inv) return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 })
    if (!['DRAFT', 'REJECTED'].includes(inv.status)) {
      return NextResponse.json({ error: 'Hanya Draft/Ditolak yang dapat diajukan' }, { status: 422 })
    }

    const { data, error } = await db
      .from('ap_invoices')
      .update({
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
        rejected_at: null, reject_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id).eq('tenant_id', TENANT)
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await db.from('ap_approval_steps').insert({
      ap_invoice_id: id, step: 1, action: 'SUBMIT',
      actor_id: body.actor_id || null, actor_name: body.actor_name || null,
      notes: body.notes || 'Tagihan diajukan untuk approval',
    })

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
