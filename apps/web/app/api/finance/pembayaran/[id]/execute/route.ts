import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

// POST /api/finance/pembayaran/:id/execute — mark as PAID
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = createAdminClient()

    const { data: pay } = await db
      .from('pembayaran')
      .select('status, permintaan_uang_id')
      .eq('id', id)
      .eq('tenant_id', TENANT)
      .single()

    if (!pay) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const now = new Date().toISOString()

    await db.from('pembayaran').update({
      status: 'PAID',
      paid_at: now,
      updated_at: now,
    }).eq('id', id)

    // Mark linked PU as PAID
    await db.from('permintaan_uang').update({
      status: 'PAID',
      paid_at: now,
      updated_at: now,
    }).eq('id', pay.permintaan_uang_id)

    return NextResponse.json({ data: { status: 'PAID' } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
