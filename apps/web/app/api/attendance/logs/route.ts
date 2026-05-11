/**
 * Attendance Logs API
 * GET  /api/attendance/logs      - List logs with filters
 * POST /api/attendance/logs      - Create new log (checkin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

// Validation schemas
const createCheckinSchema = z.object({
  employee_id: z.string().uuid(),
  device_info: z.string().optional(),
  ip_address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

// List attendance logs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()

    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get('employee_id')
    const attendanceDate = searchParams.get('attendance_date')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('attendance_logs')
      .select(`
        id,
        employee_id,
        employee_name,
        employee_code,
        attendance_date,
        checkin_time,
        checkout_time,
        checkin_lat,
        checkin_lng,
        checkout_lat,
        checkout_lng,
        checkin_distance_meters,
        checkout_distance_meters,
        status,
        approved_status,
        created_at
      `)
      .order('attendance_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (employeeId) query = query.eq('employee_id', employeeId)
    if (attendanceDate) query = query.eq('attendance_date', attendanceDate)
    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error: any) {
    console.error('Error fetching attendance logs:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// Create attendance log (checkin)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json()
    const validated = createCheckinSchema.parse(body)

    const { data: sessionUser } = await supabase.auth.getUser()
    if (!sessionUser?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id, id')
      .eq('user_id', sessionUser.user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]

    const { data: log, error } = await supabase
      .from('attendance_logs')
      .insert([
        {
          tenant_id: profile.tenant_id,
          employee_id: validated.employee_id,
          attendance_date: today,
          checkin_time: now.toISOString(),
          checkin_lat: validated.lat ?? null,
          checkin_lng: validated.lng ?? null,
          device_info: validated.device_info ?? null,
          ip_address: validated.ip_address ?? null,
          status: 'present',
          approved_status: 'pending',
        },
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: log,
    })
  } catch (error: any) {
    console.error('Error creating checkin log:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
