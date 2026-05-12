import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * GET /api/hc/departments
 * List all active hr_departments for dropdowns
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const searchParams = request.nextUrl.searchParams
    const entityId = searchParams.get('entity_id') || undefined

    let query = supabase
      .from('hr_departments')
      .select('id, name, code, parent_id, level, entity_id')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('level', { ascending: true })
      .order('name', { ascending: true })

    if (entityId) query = query.eq('entity_id', entityId)

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (err: any) {
    console.error('HC departments GET error:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch departments' }, { status: 500 })
  }
}
