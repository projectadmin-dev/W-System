import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { updatePayment } from '@/lib/services/ar-service'
import type { UpdatePaymentRequest } from '@/types/ar'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await supabase.auth.getSession()
    const tenantId =
      session.data.session?.user?.user_metadata?.tenant_id ??
      session.data.session?.user?.app_metadata?.tenant_id ??
      '00000000-0000-0000-0000-000000000001'

    const { id } = await params
    const body = (await request.json()) as UpdatePaymentRequest
    const actorName = user.user_metadata?.full_name ?? user.email ?? 'Unknown'

    const result = await updatePayment(tenantId as string, id, user.id, actorName, body)
    return NextResponse.json({ data: result })
  } catch (err) {
    const msg = String(err)
    if (msg.includes('AR_OVERPAY')) return NextResponse.json({ error: msg }, { status: 422 })
    if (msg.includes('AR_INVOICE_ARCHIVED')) return NextResponse.json({ error: msg }, { status: 409 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
