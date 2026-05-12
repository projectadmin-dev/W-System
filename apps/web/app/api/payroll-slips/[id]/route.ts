/**
 * Payroll Slip API
 * 
 * GET /api/payroll-slips/[id] - Get payroll slip details
 * PUT /api/payroll-slips/[id] - Update payroll slip (approve/cancel)
 * DELETE /api/payroll-slips/[id] - Delete payroll slip
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { z } from 'zod'

const updatePayrollSlipSchema = z.object({
  status: z.enum(['draft', 'approved', 'paid', 'cancelled']).optional(),
  approved_by: z.string().uuid().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    
    const slipId = params.id
    
    // Fetch payroll slip with all details
    const { data: slip, error } = await supabase
      .from('payroll_slips')
      .select(`
        *,
        payroll_periods (
          month,
          year,
          start_date,
          end_date,
          status
        ),
        payroll_slip_details (
          id,
          type,
          category,
          description,
          amount,
          metadata
        )
      `)
      .eq('id', slipId)
      .single()
    
    if (error || !slip) {
      return NextResponse.json(
        { success: false, error: 'Payroll slip not found' },
        { status: 404 }
      )
    }
    
    // Check authorization
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Users can only view their own slip unless they're HR admin
    if (slip.employee_id !== user.id) {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
      
      const isHR = userRoles?.some(r => ['admin', 'hr_admin', 'finance'].includes(r.role))
      
      if (!isHR) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        )
      }
    }
    
    // Calculate totals from details (for verification)
    const earnings = slip.payroll_slip_details
      .filter(d => d.type === 'earning')
      .reduce((sum, d) => sum + d.amount, 0)
    
    const deductions = slip.payroll_slip_details
      .filter(d => d.type === 'deduction')
      .reduce((sum, d) => sum + d.amount, 0)
    
    return NextResponse.json({
      success: true,
      data: {
        ...slip,
        verification: {
          total_earnings_from_details: earnings,
          total_deductions_from_details: deductions,
          thp_from_details: earnings - deductions,
          matches: Math.abs(earnings - slip.total_earnings) < 0.01 &&
                   Math.abs(deductions - slip.total_deductions) < 0.01 &&
                   Math.abs((earnings - deductions) - slip.thp) < 0.01
        }
      }
    })
    
  } catch (error: any) {
    console.error('Error fetching payroll slip:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const slipId = params.id
    
    // Fetch existing slip
    const { data: existing } = await supabase
      .from('payroll_slips')
      .select('*, payroll_periods(entity_id)')
      .eq('id', slipId)
      .single()
    
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Payroll slip not found' },
        { status: 404 }
      )
    }
    
    // Check authorization (only HR admin can approve)
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    
    const isHR = userRoles?.some(r => ['admin', 'hr_admin'].includes(r.role))
    
    if (!isHR) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - HR admin required' },
        { status: 403 }
      )
    }
    
    // Parse and validate body
    const body = await request.json()
    const validated = updatePayrollSlipSchema.parse(body)
    
    // Update slip
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (validated.status) {
      updateData.status = validated.status
      
      if (validated.status === 'approved') {
        updateData.approved_by = user.id
        updateData.approved_at = new Date().toISOString()
      }
    }
    
    const { data: updated, error } = await supabase
      .from('payroll_slips')
      .update(updateData)
      .eq('id', slipId)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      data: updated
    })
    
  } catch (error: any) {
    console.error('Error updating payroll slip:', error)
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const slipId = params.id
    
    // Check authorization (only HR admin can delete)
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
    
    const isHR = userRoles?.some(r => ['admin', 'hr_admin'].includes(r.role))
    
    if (!isHR) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - HR admin required' },
        { status: 403 }
      )
    }
    
    // Delete slip (cascade will delete details and logs)
    const { error } = await supabase
      .from('payroll_slips')
      .delete()
      .eq('id', slipId)
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      message: 'Payroll slip deleted successfully'
    })
    
  } catch (error: any) {
    console.error('Error deleting payroll slip:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
