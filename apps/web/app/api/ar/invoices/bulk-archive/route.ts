import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { archiveProjectInvoices } from '@/lib/services/ar-service'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await supabase.auth.getSession()
    const tenantId =
      session.data.session?.user?.user_metadata?.tenant_id ??
      session.data.session?.user?.app_metadata?.tenant_id ??
      '00000000-0000-0000-0000-000000000001'

    const { project_id } = await request.json()
    if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

    await archiveProjectInvoices(tenantId as string, project_id, user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
