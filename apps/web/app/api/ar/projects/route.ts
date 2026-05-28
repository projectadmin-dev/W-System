import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-server'

// Returns active projects with client_name for AR invoice creation
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

    const db = createAdminClient()

    const { data: projects, error: projErr } = await db
      .from('projects')
      .select(`id, project_name, budget_amount, status, client_id, clients(name)`)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('project_name')

    if (projErr) return NextResponse.json({ error: projErr.message }, { status: 500 })

    const data = (projects ?? []).map((p: { id: string; project_name: string; budget_amount: number | null; client_id: string | null; clients: { name: string } | { name: string }[] | null }) => {
      const raw = p.clients ?? null
      const clientRecord = raw === null ? null : Array.isArray(raw) ? (raw[0] ?? null) : raw
      return {
        id: p.id,
        project_name: p.project_name,
        client_name: clientRecord?.name ?? '—',
        budget_amount: Number(p.budget_amount ?? 0),
      }
    })

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
