/**
 * Payroll Periods API
 * 
 * GET /api/payroll-periods - List payroll periods
 * POST /api/payroll-periods - Create new payroll period
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

// Validation schema
const createPayrollPeriodSchema = z.object({
  entity_id: z.string().uuid(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  start_date: z.string().date(),
  end_date: z.string().date(),
  attendance_cutoff_date: z.string().date().optional(),
  overtime_cutoff_date: z.string().date().optional(),
  payroll_cutoff_date: z.string().date().optional()
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get query params
    const searchParams = request.nextUrl.searchParams
    const entity_id = searchParams.get('entity_id')
    const status = searchParams.get('status')
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    
    // Build query
    let query = supabase
      .from('payroll_periods')
      .select(`
        *,
        payroll_slips (
          id,
          employee_id,
          employee_name,
          status,
          thp
        )
      `)
    
    // Apply filters
    if (entity_id) {
      query = query.eq('entity_id', entity_id)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (month) {
      query = query.eq('month', parseInt(month))
    }
    if (year) {
      query = query.eq('year', parseInt(year))
    }
    
    const { data, error } = await query.order('created_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: data || []
    })
    
  } catch (error: any) {
    console.error('Error fetching payroll periods:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Parse and validate body
    const body = await request.json()
    const validated = createPayrollPeriodSchema.parse(body)
    
    // Get tenant_id from user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }
    
    // Check if period already exists
    const { data: existing } = await supabase
      .from('payroll_periods')
      .select('id')
      .eq('entity_id', validated.entity_id)
      .eq('month', validated.month)
      .eq('year', validated.year)
      .single()
    
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Payroll period already exists for this month/year' },
        { status: 409 }
      )
    }
    
    // Create payroll period
    const { data: period, error } = await supabase
      .from('payroll_periods')
      .insert({
        tenant_id: profile.tenant_id,
        entity_id: validated.entity_id,
        month: validated.month,
        year: validated.year,
        start_date: validated.start_date,
        end_date: validated.end_date,
        attendance_cutoff_date: validated.attendance_cutoff_date,
        overtime_cutoff_date: validated.overtime_cutoff_date,
        payroll_cutoff_date: validated.payroll_cutoff_date,
        status: 'draft',
        created_by: user.id
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: period
    }, { status: 201 })
    
  } catch (error: any) {
    console.error('Error creating payroll period:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
