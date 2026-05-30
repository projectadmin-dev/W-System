import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = createAdminClient()

    const { data: pu } = await db
      .from('permintaan_uang')
      .select('status')
      .eq('id', id)
      .eq('tenant_id', TENANT)
      .single()

    if (!pu) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (pu.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Hanya dokumen DRAFT yang bisa diajukan' }, { status: 422 })
    }

    await db.from('permintaan_uang').update({
      status: 'PENDING_APPROVAL',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    return NextResponse.json({ data: { status: 'PENDING_APPROVAL' } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
