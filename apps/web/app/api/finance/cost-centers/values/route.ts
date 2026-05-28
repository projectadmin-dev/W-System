import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/finance/cost-centers/values
 * Returns cost center values for the authenticated user's tenant.
 * Optional query params:
 *   config_id  - filter by specific config
 *   level      - filter by level_number (e.g., 3 = Divisi)
 *   parent_id  - filter children of a specific parent
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jwt = await supabase.auth.getSession()
    const tenantId = (
      jwt.data.session?.user?.user_metadata?.tenant_id ??
      jwt.data.session?.user?.app_metadata?.tenant_id
    ) as string | undefined

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context missing' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const config_id = searchParams.get('config_id')
    const level = searchParams.get('level')
    const parent_id = searchParams.get('parent_id')

    const admin = createAdminClient()

    // Get the default config for this tenant if no config_id specified
    let resolvedConfigId = config_id
    if (!resolvedConfigId) {
      const { data: cfg } = await admin
        .from('cost_center_configs')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_default', true)
        .eq('is_active', true)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle()
      resolvedConfigId = cfg?.id ?? null
    }

    if (!resolvedConfigId) {
      return NextResponse.json({ data: [] })
    }

    let q = admin
      .from('cost_center_values')
      .select(`
        id, kode, nama, level_number, parent_value_id, sort_order, is_active,
        cost_center_levels!inner(label)
      `)
      .eq('config_id', resolvedConfigId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('level_number', { ascending: true })
      .order('sort_order', { ascending: true })

    if (level) {
      q = q.eq('level_number', parseInt(level))
    }
    if (parent_id) {
      q = q.eq('parent_value_id', parent_id)
    }

    const { data, error } = await q
    if (error) throw new Error(error.message)

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
