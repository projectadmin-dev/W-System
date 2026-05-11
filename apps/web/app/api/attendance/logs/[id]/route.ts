/**
 * Attendance Log Detail API
 * GET    /api/attendance/logs/:id  - Get single log
 * PATCH  /api/attendance/logs/:id  - Update log (checkout)
 * DELETE /api/attendance/logs/:id  - Delete log (only draft)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

const updateLogSchema = z.object({
  checkout_lat: z.number().optional(),
  checkout_lng: z.number().optional(),
  device_info: z.string().optional(),
  notes: z.string().optional(),
})

// Get single attendance log by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('attendance_logs')
      .select(`
        *,
        employee:employee_profiles!employee_id (
          full_name,
          employee_code,
          department
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Attendance log not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error fetching attendance log:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// Update attendance log (checkout)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createAdminClient()
    const body = await request.json()
    const validated = updateLogSchema.parse(body)

    const { data, error } = await supabase
      .from('attendance_logs')
      .update({
        checkout_time: new Date().toISOString(),
        checkout_lat: validated.checkout_lat ?? null,
        checkout_lng: validated.checkout_lng ?? null,
        device_info: validated.device_info ?? null,
        notes: validated.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data,
    })
  } catch (error: any) {
    console.error('Error updating attendance log:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// Delete attendance log (soft delete by setting approved_status = 'rejected')
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createAdminClient()

    const { data: sessionUser } = await supabase.auth.getUser()
    if (!sessionUser?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('attendance_logs')
      .update({
        approved_status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data,
    })
  } catch (error: any) {
    console.error('Error deleting attendance log:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
