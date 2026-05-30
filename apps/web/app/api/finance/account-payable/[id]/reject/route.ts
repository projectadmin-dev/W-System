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
    const { approver_id, approver_name, notes } = body

    if (!notes?.trim()) {
      return NextResponse.json({ error: 'Alasan penolakan (notes) wajib diisi' }, { status: 400 })
    }

    const { data: inv } = await db
      .from('ap_invoices').select('status')
      .eq('id', id).eq('tenant_id', TENANT).is('deleted_at', null).single()
    if (!inv) return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 })
    if (inv.status !== 'SUBMITTED') {
      return NextResponse.json({ error: 'Hanya tagihan yang Diajukan yang dapat ditolak' }, { status: 422 })
    }

    const { data, error } = await db
      .from('ap_invoices')
      .update({
        status: 'REJECTED',
        rejected_at: new Date().toISOString(),
        reject_reason: notes.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id).eq('tenant_id', TENANT)
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await db.from('ap_approval_steps').insert({
      ap_invoice_id: id, step: 2, action: 'REJECT',
      actor_id: approver_id || null, actor_name: approver_name || null,
      notes: notes.trim(),
    })

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
