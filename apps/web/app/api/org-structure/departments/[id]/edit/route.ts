import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    const { name, head_user_id, email, phone, description, cost_center_code, is_active } = body

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (head_user_id !== undefined) updates.head_user_id = head_user_id
    if (email !== undefined) updates.email = email
    if (phone !== undefined) updates.phone = phone
    if (description !== undefined) updates.description = description
    if (cost_center_code !== undefined) updates.cost_center_code = cost_center_code
    if (is_active !== undefined) updates.is_active = is_active

    const { data, error } = await supabase
      .from('hr_departments')
      .update(updates)
      .eq('id', id)
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
    console.error('Failed to update department:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    )
  }
}
