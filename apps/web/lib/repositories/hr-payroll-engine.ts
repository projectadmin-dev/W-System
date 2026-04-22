/**
 * HR Payroll Engine
 * 
 * Core calculation engine for payroll processing.
 * Handles: THR, Pro-Rate, Dynamic Allowances, BPJS, PPh21
 * 
 * @module hr-payroll-engine
 */

import { createServerClient } from '@/lib/supabase-server'
import type { UserProfile } from './user-repository'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PayrollPeriod {
  id: string
  entity_id: string
  month: number
  year: number
  start_date: string
  end_date: string
  status: 'draft' | 'locked' | 'approved' | 'paid'
}

export interface PayrollInput {
  employee: UserProfile & {
    join_date?: string
    resign_date?: string
    basic_salary: number
    entity_id: string
  }
  period: PayrollPeriod
  attendance: {
    working_days: number
    present_days: number
    alpha_days: number
    sick_leave_days: number
    paid_leave_days: number
    late_days: number
    overtime_hours: number
  }
  allowances: Array<{
    allowance_type_id: string
    type: 'FIXED' | 'ATTENDANCE_BASED' | 'CONDITIONAL' | 'PRORATED'
    nominal: number
    is_taxable: boolean
    deduct_on_alpha?: boolean
    deduct_on_sick_leave?: boolean
    deduct_on_paid_leave?: boolean
    condition_rules?: any
  }>
  thr_config?: {
    payment_timing: 'with_payroll' | 'separate'
    calculation_base: 'basic_salary' | 'basic_plus_fixed_allowances'
  }
  pro_rate_config?: {
    default_working_days: number
    prorate_salary: boolean
    prorate_allowances: boolean
    payroll_cutoff_date: number
  }
  bpjs_config?: {
    jkk_rate: number
    jkm_rate: number
    jht_employee_rate: number
    jht_company_rate: number
    jp_employee_rate: number
    jp_company_rate: number
    bpjs_kes_employee_rate: number
    bpjs_kes_company_rate: number
    max_bpjs_base: number
  }
  ptkp_status: string // TK/0, K/0, K/1, K/2, K/3
}

export interface PayrollResult {
  employee_id: string
  period_id: string
  
  // Earnings
  basic_salary: number
  pro_rate_adjustment: number
  allowances: Array<{
    type: string
    nominal: number
    calculated_amount: number
    deduction_amount: number
    formula: string
  }>
  thr_amount: number
  overtime_amount: number
  total_earnings: number
  
  // Deductions
  bpjs_tk_employee: number
  bpjs_kes_employee: number
  pph21_employee: number
  attendance_deductions: number
  other_deductions: number
  total_deductions: number
  
  // Net Pay
  thp: number
  
  // Metadata
  calculation_details: {
    working_days: number
    actual_days: number
    is_prorated: boolean
    prorated_days?: number
    thr_months?: number
    bpjs_base: number
    taxable_income: number
    ptkp: number
  }
  
  // Audit
  calculated_at: string
  calculation_log: string[]
}

// ============================================================================
// MAIN PAYROLL ENGINE
// ============================================================================

/**
 * Calculate complete payroll for an employee
 */
export async function calculatePayroll(input: PayrollInput): Promise<PayrollResult> {
  const log: string[] = []
  const now = new Date().toISOString()
  
  log.push(`Starting payroll calculation for employee ${input.employee.id}`)
  log.push(`Period: ${input.period.month}/${input.period.year}`)
  
  // 1. Calculate Basic Salary (with pro-rate if needed)
  const basicSalaryResult = calculateBasicSalaryWithProrate(input)
  log.push(`Basic salary: ${basicSalaryResult.amount} (pro-rated: ${basicSalaryResult.isProrated})`)
  
  // 2. Calculate Allowances
  const allowancesResult = await calculateAllowances(input)
  log.push(`Allowances calculated: ${allowancesResult.length} items`)
  
  // 3. Calculate THR (if applicable)
  const thrResult = await calculateTHR(input)
  if (thrResult.amount > 0) {
    log.push(`THR calculated: ${thrResult.amount} (${thrResult.months} months)`)
  }
  
  // 4. Calculate Overtime
  const overtimeAmount = calculateOvertime(input)
  if (overtimeAmount > 0) {
    log.push(`Overtime: ${overtimeAmount} (${input.attendance.overtime_hours} hours)`)
  }
  
  // 5. Calculate Total Earnings
  const totalAllowances = allowancesResult.reduce((sum, a) => sum + a.calculated_amount, 0)
  const totalEarnings = basicSalaryResult.amount + totalAllowances + thrResult.amount + overtimeAmount
  
  // 6. Calculate BPJS Deductions
  const bpjsResult = calculateBPJS(input, basicSalaryResult.amount, totalAllowances)
  log.push(`BPJS TK: ${bpjsResult.employee}, BPJS Kes: ${bpjsResult.kes}`)
  
  // 7. Calculate PPh21
  const pph21Result = calculatePPh21(input, basicSalaryResult.amount, totalAllowances, thrResult.amount)
  log.push(`PPh21: ${pph21Result.monthly}`)
  
  // 8. Calculate Attendance Deductions
  const attendanceDeductions = calculateAttendanceDeductions(input, allowancesResult)
  
  // 9. Calculate Total Deductions
  const totalDeductions = bpjsResult.employee + bpjsResult.kes + pph21Result.monthly + attendanceDeductions
  
  // 10. Calculate THP (Take Home Pay)
  const thp = totalEarnings - totalDeductions
  
  log.push(`Total Earnings: ${totalEarnings}`)
  log.push(`Total Deductions: ${totalDeductions}`)
  log.push(`THP: ${thp}`)
  
  return {
    employee_id: input.employee.id,
    period_id: input.period.id,
    basic_salary: basicSalaryResult.amount,
    pro_rate_adjustment: basicSalaryResult.adjustment,
    allowances: allowancesResult,
    thr_amount: thrResult.amount,
    overtime_amount: overtimeAmount,
    total_earnings: totalEarnings,
    bpjs_tk_employee: bpjsResult.employee,
    bpjs_kes_employee: bpjsResult.kes,
    pph21_employee: pph21Result.monthly,
    attendance_deductions: attendanceDeductions,
    other_deductions: 0,
    total_deductions: totalDeductions,
    thp: thp,
    calculation_details: {
      working_days: input.attendance.working_days,
      actual_days: input.attendance.present_days,
      is_prorated: basicSalaryResult.isProrated,
      prorated_days: basicSalaryResult.actualDays,
      thr_months: thrResult.months,
      bpjs_base: bpjsResult.base,
      taxable_income: pph21Result.annualTaxable,
      ptkp: pph21Result.ptkp
    },
    calculated_at: now,
    calculation_log: log
  }
}

// ============================================================================
// BASIC SALARY + PRO-RATE CALCULATION
// ============================================================================

interface BasicSalaryResult {
  amount: number
  adjustment: number
  isProrated: boolean
  actualDays: number
}

function calculateBasicSalaryWithProrate(input: PayrollInput): BasicSalaryResult {
  const { employee, period, pro_rate_config } = input
  const config = pro_rate_config || { default_working_days: 22, prorate_salary: true, payroll_cutoff_date: 23 }
  
  const joinDate = employee.join_date ? new Date(employee.join_date) : null
  const resignDate = employee.resign_date ? new Date(employee.resign_date) : null
  const periodStart = new Date(period.start_date)
  const periodEnd = new Date(period.end_date)
  
  // Check if pro-rate applies
  let isProrated = false
  let actualDays = config.default_working_days
  let amount = employee.basic_salary
  
  // Mid-month join
  if (joinDate && joinDate >= periodStart && joinDate <= periodEnd) {
    isProrated = true
    // Count working days from join_date to end of period
    const daysWorked = countWorkingDays(joinDate, periodEnd, config.default_working_days)
    actualDays = daysWorked
    amount = (employee.basic_salary / config.default_working_days) * daysWorked
  }
  
  // Mid-month resign
  if (resignDate && resignDate >= periodStart && resignDate <= periodEnd) {
    isProrated = true
    // Count working days from start of period to resign_date
    const daysWorked = countWorkingDays(periodStart, resignDate, config.default_working_days)
    actualDays = daysWorked
    amount = (employee.basic_salary / config.default_working_days) * daysWorked
  }
  
  const adjustment = employee.basic_salary - amount
  
  return {
    amount: Math.round(amount * 100) / 100,
    adjustment: Math.round(adjustment * 100) / 100,
    isProrated,
    actualDays
  }
}

function countWorkingDays(startDate: Date, endDate: Date, defaultWorkingDays: number): number {
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  // Simplified: assume 22/30 ratio
  return Math.round((totalDays / 30) * defaultWorkingDays)
}

// ============================================================================
// ALLOWANCE CALCULATION (4 TYPES)
// ============================================================================

async function calculateAllowances(input: PayrollInput): Promise<PayrollResult['allowances']> {
  const results: PayrollResult['allowances'] = []
  
  for (const allowance of input.allowances) {
    let calculatedAmount = allowance.nominal
    let deductionAmount = 0
    let formula = `${allowance.type}: ${allowance.nominal}`
    
    switch (allowance.type) {
      case 'FIXED':
        // Fixed amount, no calculation needed
        formula = `FIXED: ${allowance.nominal}`
        break
        
      case 'ATTENDANCE_BASED':
        // Calculate based on attendance
        const perDayRate = allowance.nominal / input.attendance.working_days
        let deduction = 0
        
        if (allowance.deduct_on_alpha && input.attendance.alpha_days > 0) {
          deduction += perDayRate * input.attendance.alpha_days
        }
        if (allowance.deduct_on_sick_leave && input.attendance.sick_leave_days > 0) {
          deduction += perDayRate * input.attendance.sick_leave_days
        }
        if (allowance.deduct_on_paid_leave && input.attendance.paid_leave_days > 0) {
          deduction += perDayRate * input.attendance.paid_leave_days
        }
        
        calculatedAmount = Math.max(0, allowance.nominal - deduction)
        deductionAmount = deduction
        formula = `${allowance.nominal} - (${perDayRate.toFixed(0)} × ${input.attendance.alpha_days + input.attendance.sick_leave_days + input.attendance.paid_leave_days}) = ${calculatedAmount}`
        break
        
      case 'CONDITIONAL':
        // Check conditions
        const conditionMet = await checkAllowanceCondition(allowance.condition_rules, input)
        calculatedAmount = conditionMet ? allowance.nominal : 0
        formula = `CONDITIONAL: ${conditionMet ? allowance.nominal : 0} (condition: ${conditionMet ? 'MET' : 'NOT MET'})`
        break
        
      case 'PRORATED':
        // Prorate based on actual working days
        const proratedAmount = (allowance.nominal / input.attendance.working_days) * input.attendance.present_days
        calculatedAmount = proratedAmount
        formula = `PRORATED: (${allowance.nominal} / ${input.attendance.working_days}) × ${input.attendance.present_days} = ${proratedAmount}`
        break
    }
    
    results.push({
      type: allowance.type,
      nominal: allowance.nominal,
      calculated_amount: Math.round(calculatedAmount * 100) / 100,
      deduction_amount: Math.round(deductionAmount * 100) / 100,
      formula
    })
  }
  
  return results
}

async function checkAllowanceCondition(rules: any, input: PayrollInput): Promise<boolean> {
  if (!rules) return false
  
  // Example conditions:
  // { condition: 'has_overtime', min_hours: 4 }
  // { condition: 'assigned_to_project', project_type: 'billable' }
  
  if (rules.condition === 'has_overtime') {
    return input.attendance.overtime_hours >= (rules.min_hours || 0)
  }
  
  // Add more conditions as needed
  return false
}

// ============================================================================
// THR CALCULATION
// ============================================================================

interface THRResult {
  amount: number
  months: number
  formula: string
}

async function calculateTHR(input: PayrollInput): Promise<THRResult> {
  const { employee, period } = input
  
  // Check if THR should be paid in this period
  if (!input.thr_config || input.thr_config.payment_timing !== 'with_payroll') {
    // THR paid separately - skip for now
    return { amount: 0, months: 0, formula: 'THR paid separately' }
  }
  
  // Get join date and calculate months of service
  const joinDate = employee.join_date ? new Date(employee.join_date) : null
  if (!joinDate) {
    return { amount: 0, months: 0, formula: 'No join date' }
  }
  
  const periodEnd = new Date(period.end_date)
  const monthsWorked = calculateMonthsOfService(joinDate, periodEnd)
  
  // THR calculation per UU Ketenagakerjaan
  let thrAmount = 0
  let thrMonths = 0
  
  if (monthsWorked >= 12) {
    thrMonths = 1
    thrAmount = employee.basic_salary
  } else if (monthsWorked > 0) {
    thrMonths = monthsWorked / 12
    thrAmount = (monthsWorked / 12) * employee.basic_salary
  }
  
  return {
    amount: Math.round(thrAmount * 100) / 100,
    months: Math.round(thrMonths * 100) / 100,
    formula: monthsWorked >= 12 
      ? `≥12 months: 1 × ${employee.basic_salary}`
      : `${monthsWorked}/12 × ${employee.basic_salary} = ${thrAmount}`
  }
}

function calculateMonthsOfService(startDate: Date, endDate: Date): number {
  const years = endDate.getFullYear() - startDate.getFullYear()
  const months = endDate.getMonth() - startDate.getMonth()
  const days = endDate.getDate() - startDate.getDate()
  
  let totalMonths = years * 12 + months
  if (days < 0) {
    totalMonths -= 1
  }
  
  return Math.max(0, totalMonths)
}

// ============================================================================
// OVERTIME CALCULATION
// ============================================================================

function calculateOvertime(input: PayrollInput): number {
  const { basic_salary, entity_id } = input.employee
  const { overtime_hours } = input.attendance
  
  if (overtime_hours <= 0) return 0
  
  // Overtime calculation: basic_salary / 173 × multiplier
  // Multiplier: 1.5× for first hour, 2× for subsequent hours
  // Simplified: average 1.75×
  
  const hourlyRate = basic_salary / 173
  const multiplier = overtime_hours === 1 ? 1.5 : (1 + (1.5 * (overtime_hours - 1)) / overtime_hours)
  const overtimeAmount = hourlyRate * multiplier * overtime_hours
  
  return Math.round(overtimeAmount * 100) / 100
}

// ============================================================================
// BPJS CALCULATION
// ============================================================================

interface BPJSResult {
  employee: number
  kes: number
  company: number
  base: number
}

function calculateBPJS(input: PayrollInput, basicSalary: number, totalAllowances: number): BPJSResult {
  const config = input.bpjs_config || {
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
  
  // BPJS base: basic salary + fixed allowances (capped)
  let bpjsBase = basicSalary + totalAllowances
  if (bpjsBase > config.max_bpjs_base) {
    bpjsBase = config.max_bpjs_base
  }
  
  // Employee contributions
  const jht_employee = bpjsBase * config.jht_employee_rate
  const jp_employee = Math.min(bpjsBase * config.jp_employee_rate, 89400) // JP capped at 89,400
  const bpjs_kes_employee = bpjsBase * config.bpjs_kes_employee_rate
  
  const total_employee = jht_employee + jp_employee + bpjs_kes_employee
  
  // Company contributions (not deducted from employee)
  const jkk = bpjsBase * config.jkk_rate
  const jkm = bpjsBase * config.jkm_rate
  const jht_company = bpjsBase * config.jht_company_rate
  const jp_company = bpjsBase * config.jp_company_rate
  const bpjs_kes_company = bpjsBase * config.bpjs_kes_company_rate
  
  const total_company = jkk + jkm + jht_company + jp_company + bpjs_kes_company
  
  return {
    employee: Math.round(total_employee * 100) / 100,
    kes: Math.round(bpjs_kes_employee * 100) / 100,
    company: Math.round(total_company * 100) / 100,
    base: Math.round(bpjsBase * 100) / 100
  }
}

// ============================================================================
// PPh21 CALCULATION
// ============================================================================

interface PPh21Result {
  monthly: number
  annual: number
  annualTaxable: number
  ptkp: number
}

function calculatePPh21(input: PayrollInput, basicSalary: number, totalAllowances: number, thrAmount: number): PPh21Result {
  // PTKP (Penghasilan Tidak Kena Pajak) 2026
  const ptkpRates: Record<string, number> = {
    'TK/0': 54000000,
    'TK/1': 58500000,
    'TK/2': 63000000,
    'TK/3': 67500000,
    'K/0': 58500000,
    'K/1': 63000000,
    'K/2': 67500000,
    'K/3': 72000000
  }
  
  const ptkp = ptkpRates[input.ptkp_status] || ptkpRates['TK/0']
  
  // Calculate annual gross income
  const monthlyGross = basicSalary + totalAllowances
  const annualGross = (monthlyGross * 12) + thrAmount
  
  // Deductions
  const biayaJabatan = Math.min(annualGross * 0.05, 6000000) // 5% max 6M
  const iuranPensiun = (input.bpjs_config?.jp_employee_rate || 0.01) * Math.min(monthlyGross * 12, 12408600 * 12)
  
  const totalDeductions = biayaJabatan + iuranPensiun + ptkp
  
  // Taxable income (PKP)
  const taxableIncome = Math.max(0, annualGross - totalDeductions)
  
  // Progressive tax rates (UU HPP 2021)
  let annualTax = 0
  let remaining = taxableIncome
  
  const taxBrackets = [
    { limit: 60000000, rate: 0.05 },
    { limit: 250000000, rate: 0.15 },
    { limit: 500000000, rate: 0.25 },
    { limit: 5000000000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 }
  ]
  
  let previousLimit = 0
  for (const bracket of taxBrackets) {
    if (remaining <= 0) break
    
    const taxableInBracket = Math.min(remaining, bracket.limit - previousLimit)
    annualTax += taxableInBracket * bracket.rate
    remaining -= taxableInBracket
    previousLimit = bracket.limit
  }
  
  const monthlyTax = annualTax / 12
  
  return {
    monthly: Math.round(monthlyTax * 100) / 100,
    annual: Math.round(annualTax * 100) / 100,
    annualTaxable: Math.round(taxableIncome * 100) / 100,
    ptkp
  }
}

// ============================================================================
// ATTENDANCE DEDUCTIONS
// ============================================================================

function calculateAttendanceDeductions(input: PayrollInput, allowances: PayrollResult['allowances']): number {
  // Sum all deductions from allowances
  const totalAllowanceDeductions = allowances.reduce((sum, a) => sum + a.deduction_amount, 0)
  
  // Additional attendance-based deductions can be added here
  // e.g., late arrival fines, alpha deductions from basic salary, etc.
  
  return totalAllowanceDeductions
}

// ============================================================================
// EXPORT HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch employee data for payroll calculation
 */
export async function getEmployeeForPayroll(employeeId: string, periodId: string) {
  const supabase = await createServerClient()
  
  // Fetch employee profile with salary data
  const { data: employee, error } = await supabase
    .from('user_profiles')
    .select(`
      *,
      employee_salaries!inner(
        basic_salary,
        ptkp_status
      ),
      employee_allowances(
        allowance_type_id,
        nominal,
        override_nominal,
        allowance_types(
          type,
          is_taxable,
          deduct_on_alpha,
          deduct_on_sick_leave,
          deduct_on_paid_leave,
          condition_rules
        )
      )
    `)
    .eq('id', employeeId)
    .single()
  
  if (error) throw error
  return employee
}

/**
 * Fetch attendance data for period
 */
export async function getAttendanceForPeriod(employeeId: string, startDate: string, endDate: string) {
  const supabase = await createServerClient()
  
  const { data, error } = await supabase
    .from('hr_attendances')
    .select(`
      attendance_status,
      work_minutes,
      late_minutes
    `)
    .eq('employee_id', employeeId)
    .gte('date', startDate)
    .lte('date', endDate)
  
  if (error) throw error
  
  // Aggregate attendance data
  const stats = {
    working_days: data.length,
    present_days: data.filter(d => d.attendance_status === 'HADIR').length,
    alpha_days: data.filter(d => d.attendance_status === 'ALPHA').length,
    sick_leave_days: data.filter(d => d.attendance_status === 'SICK_LEAVE').length,
    paid_leave_days: data.filter(d => d.attendance_status === 'LEAVE').length,
    late_days: data.filter(d => (d.late_minutes || 0) > 0).length,
    overtime_hours: 0 // Fetch from overtime requests
  }
  
  return stats
}
