import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getInvoiceDetail } from '@/lib/services/ar-service'

export async function GET(
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
    const invoice = await getInvoiceDetail(tenantId as string, id)
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: invoice })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
