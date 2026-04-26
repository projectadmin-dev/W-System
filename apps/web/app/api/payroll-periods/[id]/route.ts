/**
 * Payroll Periods API - Single Resource
 * 
 * GET /api/payroll-periods/[id] - Get single payroll period
 * PUT /api/payroll-periods/[id] - Update payroll period
 * DELETE /api/payroll-periods/[id] - Delete payroll period
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { z } from 'zod'

// Validation schema for update
const updatePayrollPeriodSchema = z.object({
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  attendance_cutoff_date: z.string().date().optional().nullable(),
  overtime_cutoff_date: z.string().date().optional().nullable(),
  payroll_cutoff_date: z.string().date().optional().nullable(),
  status: z.enum(['draft', 'locked', 'approved', 'paid']).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createAdminClient()
    const periodId = params.id

    const { data, error } = await supabase
      .from('payroll_periods')
      .select(`
        *,
        payroll_slips (
          id,
          employee_id,
          employee_name,
          status,
          thp,
          basic_salary,
          allowances_total,
          total_deductions,
          total_earnings
        )
      `)
      .eq('id', periodId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error: any) {
    console.error('Error fetching payroll period:', error)
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
    const supabase = await createAdminClient()
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const periodId = params.id

    // Fetch existing period
    const { data: existing, error: fetchError } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('id', periodId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const validated = updatePayrollPeriodSchema.parse(body)

    // Validate status transitions
    if (validated.status) {
      const currentStatus = existing.status
      const newStatus = validated.status

      // Guard: Cannot go backwards from paid/approved
      if (currentStatus === 'paid') {
        return NextResponse.json(
          { success: false, error: 'Cannot modify a paid payroll period' },
          { status: 400 }
        )
      }

      // Guard: Cannot unlock an approved period
      if (currentStatus === 'approved' && newStatus === 'draft') {
        return NextResponse.json(
          { success: false, error: 'Cannot revert an approved period to draft' },
          { status: 400 }
        )
      }

      // Guard: Cannot regenerate if already locked/approved/paid
      if (['locked', 'approved', 'paid'].includes(currentStatus)) {
        return NextResponse.json(
          { success: false, error: `Cannot modify period with status: ${currentStatus}` },
          { status: 400 }
        )
      }
    }

    // Guard: Cannot edit dates if period is locked/approved/paid
    if (['locked', 'approved', 'paid'].includes(existing.status)) {
      if (validated.start_date || validated.end_date) {
        return NextResponse.json(
          { success: false, error: 'Cannot modify dates of a locked/approved/paid period' },
          { status: 400 }
        )
      }
    }

    // Build update payload
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }

    if (validated.start_date) updateData.start_date = validated.start_date
    if (validated.end_date) updateData.end_date = validated.end_date
    if (validated.attendance_cutoff_date !== undefined) updateData.attendance_cutoff_date = validated.attendance_cutoff_date
    if (validated.overtime_cutoff_date !== undefined) updateData.overtime_cutoff_date = validated.overtime_cutoff_date
    if (validated.payroll_cutoff_date !== undefined) updateData.payroll_cutoff_date = validated.payroll_cutoff_date
    if (validated.status) updateData.status = validated.status

    const { data: updated, error: updateError } = await supabase
      .from('payroll_periods')
      .update(updateData)
      .eq('id', periodId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      message: 'Payroll period updated successfully',
      data: updated
    })

  } catch (error: any) {
    console.error('Error updating payroll period:', error)

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
    const supabase = await createAdminClient()
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const periodId = params.id

    // Fetch existing period
    const { data: existing, error: fetchError } = await supabase
      .from('payroll_periods')
      .select('*, payroll_slips(id)')
      .eq('id', periodId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: 'Payroll period not found' },
        { status: 404 }
      )
    }

    // Guard: Can only delete draft periods
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: `Cannot delete period with status '${existing.status}'. Only draft periods can be deleted.` },
        { status: 400 }
      )
    }

    // Delete related payroll slip details first (if any exist)
    if (existing.payroll_slips && existing.payroll_slips.length > 0) {
      const slipIds = existing.payroll_slips.map((s: any) => s.id)
      
      // Delete slip details
      await supabase
        .from('payroll_slip_details')
        .delete()
        .in('payroll_slip_id', slipIds)
      
      // Delete allowance calculation logs
      await supabase
        .from('allowance_calculation_logs')
        .delete()
        .in('payroll_slip_id', slipIds)
      
      // Delete payroll slips
      await supabase
        .from('payroll_slips')
        .delete()
        .eq('payroll_period_id', periodId)
    }

    // Delete payroll period
    const { error: deleteError } = await supabase
      .from('payroll_periods')
      .delete()
      .eq('id', periodId)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: 'Payroll period deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting payroll period:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
