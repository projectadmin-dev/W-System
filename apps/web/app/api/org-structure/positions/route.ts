import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get('entity_id')
    const departmentId = searchParams.get('department_id')

    let query = supabase
      .from('hr_positions')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (entityId) {
      query = query.eq('entity_id', entityId)
    }

    if (departmentId) {
      query = query.eq('department_id', departmentId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error('Failed to fetch positions:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
