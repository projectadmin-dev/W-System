import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getNextInvoiceNumber } from '@/lib/services/ar-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await supabase.auth.getSession()
    const tenantId =
      session.data.session?.user?.user_metadata?.tenant_id ??
      session.data.session?.user?.app_metadata?.tenant_id ??
      '00000000-0000-0000-0000-000000000001'

    const date = request.nextUrl.searchParams.get('date') ?? new Date().toISOString().split('T')[0]
    const noInvoice = await getNextInvoiceNumber(tenantId as string, date)

    return NextResponse.json({ no_invoice: noInvoice })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
