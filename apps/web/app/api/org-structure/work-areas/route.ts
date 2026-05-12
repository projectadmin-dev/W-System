import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    const { searchParams } = new URL(request.url)
    const entityId = searchParams.get('entity_id')

    let query = supabase
      .from('hr_work_areas')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (entityId) {
      query = query.eq('entity_id', entityId)
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
    console.error('Failed to fetch work areas:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const { entity_id, code, name, location, type, capacity } = body

    if (!entity_id || !code || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: entity_id, code, name' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('hr_work_areas')
      .insert({
        entity_id,
        tenant_id: '00000000-0000-0000-0000-000000000001',
        code,
        name,
        location,
        type: type || 'Office',
        capacity,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Failed to create work area:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
