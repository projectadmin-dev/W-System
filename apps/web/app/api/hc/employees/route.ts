import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * GET /api/hc/employees
 * List active employees with NIK, name, department for dropdowns
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenant_id') || undefined
    const limit = parseInt(searchParams.get('limit') || '500', 10)

    let query = supabase
      .from('user_profiles')
      .select('id, full_name, nik, employee_number, department, department_id, email, tenant_id')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('full_name', { ascending: true })
      .limit(limit)

    if (tenantId) query = query.eq('tenant_id', tenantId)
    // Only include users WITH a nik (actual employees)
    query = query.not('nik', 'is', null)

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (err: any) {
    console.error('HC employees GET error:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch employees' }, { status: 500 })
  }
}
