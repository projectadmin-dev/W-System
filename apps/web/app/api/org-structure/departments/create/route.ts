import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const { entity_id, code, name, head_user_id, email, phone, description, cost_center_code } = body

    if (!entity_id || !code || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: entity_id, code, name' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('hr_departments')
      .insert({
        entity_id,
        tenant_id: '00000000-0000-0000-0000-000000000001', // Default tenant
        code,
        name,
        head_user_id,
        email,
        phone,
        description,
        cost_center_code,
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
    console.error('Failed to create department:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
