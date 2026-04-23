/**
 * Generate Payroll API
 * 
 * POST /api/payroll-periods/[id]/generate
 * 
 * Generates payroll slips for all employees in a payroll period.
 * Uses the hr-payroll-engine for calculations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { calculatePayroll } from '@/lib/repositories/hr-payroll-engine'
import { getEmployeeForPayroll, getAttendanceForPeriod } from '@/lib/repositories/hr-payroll-engine'

export async function POST(
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
    
    const periodId = params.id
    
    // Fetch payroll period
    const { data: period, error: periodError } = await supabase
      .from('payroll_periods')
      .select('*, entity_id, tenant_id')
      .eq('id', periodId)
      .single()
    
    if (periodError || !period) {
      return NextResponse.json(
        { success: false, error: 'Payroll period not found' },
        { status: 404 }
      )
    }
    
    // Check period status
    if (period.status !== 'draft' && period.status !== 'generating') {
      return NextResponse.json(
        { success: false, error: `Cannot generate payroll for period with status: ${period.status}` },
        { status: 400 }
      )
    }
    
    // Update period status to 'generating'
    await supabase
      .from('payroll_periods')
      .update({ status: 'generating' })
      .eq('id', periodId)
    
    // Fetch all employees in the entity
    const { data: employees, error: employeesError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        user_id,
        full_name,
        position,
        department,
        join_date,
        resign_date,
        entity_id,
        employee_salaries (
          basic_salary,
          ptkp_status
        ),
        employee_allowances (
          id,
          nominal,
          override_nominal,
          allowance_types (
            id,
            type,
            is_taxable,
            deduct_on_alpha,
            deduct_on_sick_leave,
            deduct_on_paid_leave,
            condition_rules
          )
        )
      `)
      .eq('entity_id', period.entity_id)
      .is('resign_date', null) // Only active employees
    
    if (employeesError) throw employeesError
    
    if (!employees || employees.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active employees found',
        data: { generated: 0, slips: [] }
      })
    }
    
    // Fetch pro-rate config
    const { data: proRateConfig } = await supabase
      .from('pro_rate_configs')
      .select('*')
      .eq('entity_id', period.entity_id)
      .single()
    
    // Fetch THR config
    const { data: thrConfig } = await supabase
      .from('thr_configs')
      .select('*')
      .eq('entity_id', period.entity_id)
      .single()
    
    // Fetch BPJS config (from entity settings or use defaults)
    const { data: entity } = await supabase
      .from('entities')
      .select('bpjs_settings')
      .eq('id', period.entity_id)
      .single()
    
    const bpjsConfig = entity?.bpjs_settings || {
      jkk_rate: 0.0024,
      jkm_rate: 0.003,
      jht_employee_rate: 0.02,
      jht_company_rate: 0.037,
      jp_employee_rate: 0.01,
      jp_company_rate: 0.02,
      bpjs_kes_employee_rate: 0.01,
      bpjs_kes_company_rate: 0.04,
      max_bpjs_base: 12408600
    }
    
    // Generate payroll slips
    const generatedSlips = []
    const errors = []
    
    for (const employee of employees) {
      try {
        // Fetch attendance data
        const attendance = await getAttendanceForPeriod(
          employee.user_id,
          period.start_date,
          period.end_date
        )
        
        // Prepare payroll input
        const payrollInput = {
          employee: {
            id: employee.user_id,
            join_date: employee.join_date,
            resign_date: employee.resign_date,
            basic_salary: employee.employee_salaries?.[0]?.basic_salary || 0,
            entity_id: period.entity_id,
            user_id: employee.user_id
          },
          period: {
            id: periodId,
            entity_id: period.entity_id,
            month: period.month,
            year: period.year,
            start_date: period.start_date,
            end_date: period.end_date,
            status: period.status
          },
          attendance,
          allowances: (employee.employee_allowances || []).map((ea: any) => ({
            allowance_type_id: ea.allowance_types.id,
            type: ea.allowance_types.type,
            nominal: ea.override_nominal || ea.nominal,
            is_taxable: ea.allowance_types.is_taxable,
            deduct_on_alpha: ea.allowance_types.deduct_on_alpha,
            deduct_on_sick_leave: ea.allowance_types.deduct_on_sick_leave,
            deduct_on_paid_leave: ea.allowance_types.deduct_on_paid_leave,
            condition_rules: ea.allowance_types.condition_rules
          })),
          thr_config: thrConfig ? {
            payment_timing: thrConfig.payment_timing,
            calculation_base: thrConfig.calculation_base
          } : undefined,
          pro_rate_config: proRateConfig ? {
            default_working_days: proRateConfig.default_working_days,
            prorate_salary: proRateConfig.prorate_salary,
            prorate_allowances: proRateConfig.prorate_allowances,
            payroll_cutoff_date: proRateConfig.payroll_cutoff_date
          } : undefined,
          bpjs_config: bpjsConfig,
          ptkp_status: employee.employee_salaries?.[0]?.ptkp_status || 'TK/0'
        }
        
        // Calculate payroll
        const payrollResult = await calculatePayroll(payrollInput)
        
        // Create payroll slip
        const { data: slip, error: slipError } = await supabase
          .from('payroll_slips')
          .insert({
            payroll_period_id: periodId,
            employee_id: employee.user_id,
            employee_name: employee.full_name,
            employee_position: employee.position,
            department: employee.department,
            period_month: period.month,
            period_year: period.year,
            basic_salary: payrollResult.basic_salary,
            allowances_total: payrollResult.allowances.reduce((sum, a) => sum + a.calculated_amount, 0),
            overtime_amount: payrollResult.overtime_amount,
            thr_amount: payrollResult.thr_amount,
            bonus_amount: 0,
            other_earnings: 0,
            bpjs_tk_employee: payrollResult.bpjs_tk_employee,
            bpjs_kes_employee: payrollResult.bpjs_kes_employee,
            pph21_employee: payrollResult.pph21_employee,
            loan_deductions: 0,
            attendance_deductions: payrollResult.attendance_deductions,
            other_deductions: 0,
            total_earnings: payrollResult.total_earnings,
            total_deductions: payrollResult.total_deductions,
            thp: payrollResult.thp,
            status: 'draft',
            created_by: user.id
          })
          .select()
          .single()
        
        if (slipError) {
          errors.push({
            employee_id: employee.user_id,
            employee_name: employee.full_name,
            error: slipError.message
          })
          continue
        }
        
        // Create payroll slip details (line items)
        const details = []
        
        // Earnings
        details.push({
          payroll_slip_id: slip.id,
          type: 'earning',
          category: 'salary',
          description: 'Gaji Pokok',
          amount: payrollResult.basic_salary,
          metadata: { is_prorated: payrollResult.calculation_details.is_prorated }
        })
        
        payrollResult.allowances.forEach(allowance => {
          details.push({
            payroll_slip_id: slip.id,
            type: 'earning',
            category: 'allowance',
            description: `Tunjangan (${allowance.type})`,
            amount: allowance.calculated_amount,
            metadata: { formula: allowance.formula }
          })
        })
        
        if (payrollResult.thr_amount > 0) {
          details.push({
            payroll_slip_id: slip.id,
            type: 'earning',
            category: 'thr',
            description: 'THR',
            amount: payrollResult.thr_amount,
            metadata: { months: payrollResult.calculation_details.thr_months }
          })
        }
        
        if (payrollResult.overtime_amount > 0) {
          details.push({
            payroll_slip_id: slip.id,
            type: 'earning',
            category: 'overtime',
            description: 'Lembur',
            amount: payrollResult.overtime_amount,
            metadata: { hours: attendance.overtime_hours }
          })
        }
        
        // Deductions
        if (payrollResult.bpjs_tk_employee > 0) {
          details.push({
            payroll_slip_id: slip.id,
            type: 'deduction',
            category: 'bpjs',
            description: 'Iuran BPJS TK (JHT + JP)',
            amount: payrollResult.bpjs_tk_employee,
            metadata: { base: payrollResult.calculation_details.bpjs_base }
          })
        }
        
        if (payrollResult.bpjs_kes_employee > 0) {
          details.push({
            payroll_slip_id: slip.id,
            type: 'deduction',
            category: 'bpjs',
            description: 'Iuran BPJS Kesehatan',
            amount: payrollResult.bpjs_kes_employee,
            metadata: { base: payrollResult.calculation_details.bpjs_base }
          })
        }
        
        if (payrollResult.pph21_employee > 0) {
          details.push({
            payroll_slip_id: slip.id,
            type: 'deduction',
            category: 'tax',
            description: 'PPh 21',
            amount: payrollResult.pph21_employee,
            metadata: {
              taxable_income: payrollResult.calculation_details.taxable_income,
              ptkp: payrollResult.calculation_details.ptkp
            }
          })
        }
        
        if (payrollResult.attendance_deductions > 0) {
          details.push({
            payroll_slip_id: slip.id,
            type: 'deduction',
            category: 'attendance',
            description: 'Potongan Kehadiran',
            amount: payrollResult.attendance_deductions,
            metadata: {
              alpha_days: attendance.alpha_days,
              sick_leave_days: attendance.sick_leave_days
            }
          })
        }
        
        // Insert all details
        if (details.length > 0) {
          const { error: detailsError } = await supabase
            .from('payroll_slip_details')
            .insert(details)
          
          if (detailsError) {
            console.error('Error inserting slip details:', detailsError)
          }
        }
        
        // Log calculation to allowance_calculation_logs
        for (const allowance of payrollResult.allowances) {
          await supabase.from('allowance_calculation_logs').insert({
            payroll_slip_id: slip.id,
            allowance_type: allowance.type,
            base_nominal: allowance.nominal,
            calculated_amount: allowance.calculated_amount,
            deduction_amount: allowance.deduction_amount,
            calculation_formula: allowance.formula,
            working_days: attendance.working_days,
            present_days: attendance.present_days,
            alpha_days: attendance.alpha_days,
            sick_leave_days: attendance.sick_leave_days,
            paid_leave_days: attendance.paid_leave_days
          })
        }
        
        generatedSlips.push({
          slip_id: slip.id,
          employee_id: employee.user_id,
          employee_name: employee.full_name,
          thp: payrollResult.thp,
          calculation_log: payrollResult.calculation_log
        })
        
      } catch (error: any) {
        console.error(`Error processing employee ${employee.user_id}:`, error)
        errors.push({
          employee_id: employee.user_id,
          employee_name: employee.full_name,
          error: error.message
        })
      }
    }
    
    // Update period status
    const finalStatus = errors.length > 0 ? 'draft' : 'generated'
    await supabase
      .from('payroll_periods')
      .update({ status: finalStatus })
      .eq('id', periodId)
    
    return NextResponse.json({
      success: true,
      message: errors.length > 0 ? 'Payroll generated with errors' : 'Payroll generated successfully',
      data: {
        generated: generatedSlips.length,
        failed: errors.length,
        slips: generatedSlips,
        errors
      }
    })
    
  } catch (error: any) {
    console.error('Error generating payroll:', error)
    
    // Revert period status
    const supabase = await createServerClient()
    await supabase
      .from('payroll_periods')
      .update({ status: 'draft' })
      .eq('id', params.id)
    
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
