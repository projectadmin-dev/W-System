import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { buildReport, type ReportType } from '@/lib/services/report-engine'
import { resolveTenantId } from '@/lib/finance/tenant'

const VALID_REPORT_TYPES: ReportType[] = ['IS', 'BS', 'CF', 'EQ', 'TB', 'BB', 'GL']

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const report_type = (searchParams.get('type') ?? 'IS').toUpperCase() as ReportType
    const period_id = searchParams.get('period_id')
    const benchmark_period_id = searchParams.get('benchmark_period_id') ?? undefined
    const cost_center_value_id = searchParams.get('cost_center_value_id') ?? undefined
    const account_id = searchParams.get('account_id') ?? undefined

    if (!VALID_REPORT_TYPES.includes(report_type)) {
      return NextResponse.json(
        { error: `Invalid report type. Must be one of: ${VALID_REPORT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (!period_id) {
      return NextResponse.json({ error: 'period_id is required' }, { status: 400 })
    }

    // Resolve tenant (JWTs here don't carry tenant_id — fall back to profile/default)
    const tenantId = await resolveTenantId(user)

    const result = await buildReport({
      tenant_id: tenantId,
      period_id,
      benchmark_period_id,
      cost_center_value_id,
      account_id,
      report_type,
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[laporan-keuangan API]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
