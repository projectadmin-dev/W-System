/**
 * Attendance Settings API
 * GET    /api/attendance/settings
 * POST   /api/attendance/settings
 * PATCH  /api/attendance/settings
 * DELETE /api/attendance/settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

// Validation schemas
const createSettingsSchema = z.object({
  work_shift_id: z.string().uuid().optional(),
  office_location: z.string().min(1).max(100),
  lat_decimal: z.number().optional(),
  lng_decimal: z.number().optional(),
  radius_meters: z.number().int().min(1).max(1000).optional(),
  work_hours_start: z.string().optional(),
  work_hours_end: z.string().optional(),
  grace_period_minutes: z.number().int().min(0).max(60).optional(),
  max_late_minutes: z.number().int().min(0).max(120).optional(),
  required_checkins_per_day: z.number().int().min(1).max(4).optional(),
  require_photo_checkin: z.boolean().optional(),
  require_gps: z.boolean().optional(),
  notes: z.string().optional(),
})

const updateSettingsSchema = z.object({
  work_shift_id: z.string().uuid().optional(),
  office_location: z.string().max(100).optional(),
  lat_decimal: z.number().optional(),
  lng_decimal: z.number().optional(),
  radius_meters: z.number().int().min(1).max(1000).optional(),
  work_hours_start: z.string().optional(),
  work_hours_end: z.string().optional(),
  grace_period_minutes: z.number().int().min(0).max(60).optional(),
  max_late_minutes: z.number().int().min(0).max(120).optional(),
  required_checkins_per_day: z.number().int().min(1).max(4).optional(),
  require_photo_checkin: z.boolean().optional(),
  require_gps: z.boolean().optional(),
  notes: z.string().optional(),
})

// Get attendance settings (or create default if not exists)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()

    const { data: sessionUser } = await supabase.auth.getUser()
    if (!sessionUser?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get tenant_id from user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', sessionUser.user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    let { data: settings, error } = await supabase
      .from('attendance_settings')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    // If no settings exist, return default object
    if (!settings) {
      settings = {
        id: null,
        tenant_id: profile.tenant_id,
        work_shift_id: null,
        office_location: 'Head Office',
        lat_decimal: null,
        lng_decimal: null,
        radius_meters: 100,
        work_hours_start: '09:00',
        work_hours_end: '18:00',
        grace_period_minutes: 15,
        max_late_minutes: 30,
        required_checkins_per_day: 2,
        require_photo_checkin: true,
        require_gps: true,
        notes: null,
        created_at: null,
        updated_at: null,
        created_by: null,
        updated_by: null,
        deleted_at: null,
      }
    }

    return NextResponse.json({
      success: true,
      data: settings,
    })
  } catch (error: any) {
    console.error('Error fetching attendance settings:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// Create new attendance settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json()
    const validated = createSettingsSchema.parse(body)

    const { data: sessionUser } = await supabase.auth.getUser()
    if (!sessionUser?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get tenant_id from user profile
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

    // Check if settings already exist
    const { data: existing } = await supabase
      .from('attendance_settings')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('deleted_at', null)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Settings already exist for this tenant' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('attendance_settings')
      .insert([
        {
          tenant_id: profile.tenant_id,
          work_shift_id: validated.work_shift_id,
          office_location: validated.office_location,
          lat_decimal: validated.lat_decimal,
          lng_decimal: validated.lng_decimal,
          radius_meters: validated.radius_meters,
          work_hours_start: validated.work_hours_start,
          work_hours_end: validated.work_hours_end,
          grace_period_minutes: validated.grace_period_minutes,
          max_late_minutes: validated.max_late_minutes,
          required_checkins_per_day: validated.required_checkins_per_day,
          require_photo_checkin: validated.require_photo_checkin,
          require_gps: validated.require_gps,
          notes: validated.notes,
          created_by: profile.id,
        },
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data,
    })
  } catch (error: any) {
    console.error('Error creating attendance settings:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// Update attendance settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json()
    const validated = updateSettingsSchema.parse(body)

    const { data: sessionUser } = await supabase.auth.getUser()
    if (!sessionUser?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get tenant_id from user profile
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

    const { data: existing } = await supabase
      .from('attendance_settings')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('deleted_at', null)
      .limit(1)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'No settings found for this tenant' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('attendance_settings')
      .update({
        work_shift_id: validated.work_shift_id ?? existing.work_shift_id,
        office_location: validated.office_location ?? existing.office_location,
        lat_decimal: validated.lat_decimal ?? existing.lat_decimal,
        lng_decimal: validated.lng_decimal ?? existing.lng_decimal,
        radius_meters: validated.radius_meters ?? existing.radius_meters,
        work_hours_start: validated.work_hours_start ?? existing.work_hours_start,
        work_hours_end: validated.work_hours_end ?? existing.work_hours_end,
        grace_period_minutes: validated.grace_period_minutes ?? existing.grace_period_minutes,
        max_late_minutes: validated.max_late_minutes ?? existing.max_late_minutes,
        required_checkins_per_day: validated.required_checkins_per_day ?? existing.required_checkins_per_day,
        require_photo_checkin: validated.require_photo_checkin ?? existing.require_photo_checkin,
        require_gps: validated.require_gps ?? existing.require_gps,
        notes: validated.notes ?? existing.notes,
        updated_by: profile.id,
        updated_at: new Date(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data,
    })
  } catch (error: any) {
    console.error('Error updating attendance settings:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export { GET }
export { POST }
export { PATCH }
