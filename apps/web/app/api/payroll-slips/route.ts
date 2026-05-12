/**
 * Payroll Slips API - Full CRUD
 * 
 * GET    /api/payroll-slips      - List payroll slips
 * GET    /api/payroll-slips/:id  - Get single slip
 * POST   /api/payroll-slips      - Create slip (generate)
 * PATCH  /api/payroll-slips/:id  - Update slip
 * DELETE /api/payroll-slips/:id  - Delete slip (draft only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// List all payroll slips with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    
    const searchParams = request.nextUrl.searchParams
    const periodId = searchParams.get('period_id')
    const employeeId = searchParams.get('employee_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    let query = supabase
      .from('payroll_slips')
      .select(`
        id,
        payroll_period_id,
        payroll_period_name,
        employee_id,
        employee_name,
        employee_code,
        basic_salary,
        transportation_allowance,
        meal_allowance,
        communication_allowance,
        overtime_pay,
        tax_deduction,
        bpjs_kesehatan,
        bpjs_ketenagakerjaan,
        total_deduction,
        net_salary,
        status,
        generated_at,
        paid_at
      `)
      .order('generated_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (periodId) query = query.eq('payroll_period_id', periodId)
    if (employeeId) query = query.eq('employee_id', employeeId)
    if (status) query = query.eq('status', status)
    
    const { data, error } = await query
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: data || []
    })
    
  } catch (error: any) {
    console.error('Error fetching payroll slips:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// Get single payroll slip by ID
export async function GET_BY_ID(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createAdminClient()
    
    const { data, error } = await supabase
      .from('payroll_slips')
      .select(`
        id,
        payroll_period_id,
        payroll_period_name,
        employee_id,
        employee_name,
        employee_code,
        basic_salary,
        transportation_allowance,
        meal_allowance,
        communication_allowance,
        overtime_pay,
        tax_deduction,
        bpjs_kesehatan,
        bpjs_ketenagakerjaan,
        total_deduction,
        net_salary,
        status,
        generated_at,
        paid_at,
        payroll_period:payroll_periods (
          id,
          period_name,
          start_date,
          end_date
        )
      `)
      .eq('id', params.id)
      .single()
    
    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Payroll slip not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error fetching payroll slip:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// NOTE: Single record GET moved to [id]/route.ts
