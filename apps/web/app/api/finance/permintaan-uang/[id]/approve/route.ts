import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = createAdminClient()
    const body = await request.json().catch(() => ({}))
    const { notes = '', approver_id, approver_name, approver_dept } = body

    const { data: pu } = await db
      .from('permintaan_uang')
      .select('status')
      .eq('id', id)
      .eq('tenant_id', TENANT)
      .single()

    if (!pu) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (pu.status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ error: 'Hanya dokumen PENDING_APPROVAL yang bisa disetujui' }, { status: 422 })
    }

    const now = new Date().toISOString()

    await db.from('permintaan_uang').update({
      status: 'APPROVED',
      approved_at: now,
      updated_at: now,
    }).eq('id', id)

    await db.from('pu_approval_steps').insert({
      tenant_id: TENANT,
      permintaan_uang_id: id,
      level: 1,
      approver_id: approver_id || null,
      approver_name: approver_name || null,
      approver_dept: approver_dept || null,
      status: 'APPROVED',
      notes: notes || null,
      actioned_at: now,
    })

    return NextResponse.json({ data: { status: 'APPROVED' } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
