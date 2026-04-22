/**
 * Payroll Engine Unit Tests
 * 
 * Test scenarios dari PRD W-System v2.0
 * - Scenario 1: THR untuk Karyawan Baru (Budi)
 * - Scenario 2: Pro-Rate Gaji (Sari)
 * - Scenario 3: Attendance-Based Allowance (Andi)
 */

import { describe, it, expect } from '@jest/globals'
import { calculatePayroll, calculateBasicSalaryWithProrate, calculateAllowances, calculateTHR } from '../hr-payroll-engine'

// ============================================================================
// SCENARIO 1: THR UNTUK KARYAWAN BARU (BUDI)
// ============================================================================

describe('Scenario 1: THR untuk Karyawan Baru', () => {
  it('should calculate prorated THR for employee with 2 months service', async () => {
    // Budi
    // Join Date: 1 Maret 2026
    // Periode THR: April 2026 (Lebaran)
    // Gaji Pokok: Rp 5.000.000
    // Expected THR: (2/12) × 5.000.000 = Rp 833.333
    
    const input = {
      employee: {
        id: 'budi-001',
        join_date: '2026-03-01',
        basic_salary: 5000000,
        entity_id: 'entity-001',
        user_id: 'user-budi'
      },
      period: {
        id: 'period-april-2026',
        entity_id: 'entity-001',
        month: 4,
        year: 2026,
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        status: 'draft' as const
      },
      attendance: {
        working_days: 22,
        present_days: 22,
        alpha_days: 0,
        sick_leave_days: 0,
        paid_leave_days: 0,
        late_days: 0,
        overtime_hours: 0
      },
      allowances: [],
      thr_config: {
        payment_timing: 'with_payroll' as const,
        calculation_base: 'basic_salary' as const
      },
      ptkp_status: 'TK/0'
    }
    
    const result = await calculatePayroll(input)
    
    expect(result.thr_amount).toBeCloseTo(833333, 0)
    expect(result.calculation_details.thr_months).toBeCloseTo(0.17, 2) // 2/12
    expect(result.calculation_log).toContain('THR calculated')
  })
})

// ============================================================================
// SCENARIO 2: PRO-RATE GAJI (SARI)
// ============================================================================

describe('Scenario 2: Pro-Rate Gaji', () => {
  it('should calculate prorated salary for mid-month join', async () => {
    // Sari
    // Join Date: 15 April 2026
    // Hari Kerja Bulan April: 22 hari
    // Hari Aktual Bekerja: 16 hari (15-30 April)
    // Gaji Pokok: Rp 6.000.000
    // Expected: (6.000.000 / 22) × 16 = Rp 4.363.636
    
    const input = {
      employee: {
        id: 'sari-001',
        join_date: '2026-04-15',
        basic_salary: 6000000,
        entity_id: 'entity-001',
        user_id: 'user-sari'
      },
      period: {
        id: 'period-april-2026',
        entity_id: 'entity-001',
        month: 4,
        year: 2026,
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        status: 'draft' as const
      },
      attendance: {
        working_days: 22,
        present_days: 16,
        alpha_days: 0,
        sick_leave_days: 0,
        paid_leave_days: 0,
        late_days: 0,
        overtime_hours: 0
      },
      allowances: [],
      ptkp_status: 'K/0'
    }
    
    const result = await calculatePayroll(input)
    
    expect(result.basic_salary).toBeCloseTo(4363636, 0)
    expect(result.calculation_details.is_prorated).toBe(true)
    expect(result.calculation_details.prorated_days).toBe(16)
    expect(result.calculation_log).toContain('pro-rated')
  })
})

// ============================================================================
// SCENARIO 3: ATTENDANCE-BASED ALLOWANCE (ANDI)
// ============================================================================

describe('Scenario 3: Attendance-Based Allowance', () => {
  it('should calculate attendance allowance with alpha deduction', async () => {
    // Andi
    // Tunjangan Kehadiran: Rp 500.000/bulan
    // Hari Kerja: 22 hari
    // Hadir: 20 hari
    // Alpha: 1 hari
    // Sakit: 1 hari (dengan surat)
    // Konfigurasi:
    // - deduct_on_alpha: true
    // - deduct_on_sick_leave: false
    // Expected:
    // - Allowance per hari = 500.000 / 22 = 22.727
    // - Potongan alpha = 22.727 × 1 = 22.727
    // - Total Tunjangan = 500.000 - 22.727 = 477.273
    
    const input = {
      employee: {
        id: 'andi-001',
        join_date: '2025-01-01',
        basic_salary: 8000000,
        entity_id: 'entity-001',
        user_id: 'user-andi'
      },
      period: {
        id: 'period-april-2026',
        entity_id: 'entity-001',
        month: 4,
        year: 2026,
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        status: 'draft' as const
      },
      attendance: {
        working_days: 22,
        present_days: 20,
        alpha_days: 1,
        sick_leave_days: 1,
        paid_leave_days: 0,
        late_days: 0,
        overtime_hours: 0
      },
      allowances: [
        {
          allowance_type_id: 'allowance-kehadiran',
          type: 'ATTENDANCE_BASED' as const,
          nominal: 500000,
          is_taxable: false,
          deduct_on_alpha: true,
          deduct_on_sick_leave: false,
          deduct_on_paid_leave: false
        }
      ],
      ptkp_status: 'K/1'
    }
    
    const result = await calculatePayroll(input)
    
    const attendanceAllowance = result.allowances.find(a => a.type === 'ATTENDANCE_BASED')
    expect(attendanceAllowance).toBeDefined()
    expect(attendanceAllowance!.calculated_amount).toBeCloseTo(477273, 0)
    expect(attendanceAllowance!.deduction_amount).toBeCloseTo(22727, 0)
    expect(attendanceAllowance!.formula).toContain('alpha')
  })
})

// ============================================================================
// ADDITIONAL TEST: FULL PAYROLL CALCULATION
// ============================================================================

describe('Full Payroll Calculation', () => {
  it('should calculate complete payroll with all components', async () => {
    const input = {
      employee: {
        id: 'test-001',
        join_date: '2025-06-01',
        basic_salary: 10000000,
        entity_id: 'entity-001',
        user_id: 'user-test'
      },
      period: {
        id: 'period-april-2026',
        entity_id: 'entity-001',
        month: 4,
        year: 2026,
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        status: 'draft' as const
      },
      attendance: {
        working_days: 22,
        present_days: 21,
        alpha_days: 1,
        sick_leave_days: 0,
        paid_leave_days: 0,
        late_days: 0,
        overtime_hours: 5
      },
      allowances: [
        {
          allowance_type_id: 'allowance-transport',
          type: 'FIXED' as const,
          nominal: 1000000,
          is_taxable: true
        },
        {
          allowance_type_id: 'allowance-kehadiran',
          type: 'ATTENDANCE_BASED' as const,
          nominal: 500000,
          is_taxable: false,
          deduct_on_alpha: true,
          deduct_on_sick_leave: false,
          deduct_on_paid_leave: false
        }
      ],
      bpjs_config: {
        jkk_rate: 0.0024,
        jkm_rate: 0.003,
        jht_employee_rate: 0.02,
        jht_company_rate: 0.037,
        jp_employee_rate: 0.01,
        jp_company_rate: 0.02,
        bpjs_kes_employee_rate: 0.01,
        bpjs_kes_company_rate: 0.04,
        max_bpjs_base: 12408600
      },
      ptkp_status: 'K/2'
    }
    
    const result = await calculatePayroll(input)
    
    // Validate structure
    expect(result.employee_id).toBe('test-001')
    expect(result.period_id).toBe('period-april-2026')
    expect(result.basic_salary).toBeGreaterThan(0)
    expect(result.total_earnings).toBeGreaterThan(0)
    expect(result.total_deductions).toBeGreaterThan(0)
    expect(result.thp).toBeGreaterThan(0)
    
    // Validate logic: THP = Earnings - Deductions
    expect(result.thp).toBeCloseTo(result.total_earnings - result.total_deductions, 0)
    
    // Validate BPJS is calculated
    expect(result.bpjs_tk_employee).toBeGreaterThan(0)
    expect(result.bpjs_kes_employee).toBeGreaterThan(0)
    
    // Validate PPh21 is calculated
    expect(result.pph21_employee).toBeGreaterThan(0)
    
    // Validate allowances
    expect(result.allowances.length).toBe(2)
    const fixedAllowance = result.allowances.find(a => a.type === 'FIXED')
    const attendanceAllowance = result.allowances.find(a => a.type === 'ATTENDANCE_BASED')
    expect(fixedAllowance!.calculated_amount).toBe(1000000)
    expect(attendanceAllowance!.calculated_amount).toBeLessThan(500000) // Deducted due to alpha
    
    // Validate calculation log
    expect(result.calculation_log.length).toBeGreaterThan(5)
    expect(result.calculation_log).toContain('Starting payroll calculation')
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('should handle employee with 0 days worked (alpha full month)', async () => {
    const input = {
      employee: {
        id: 'alpha-001',
        join_date: '2025-01-01',
        basic_salary: 5000000,
        entity_id: 'entity-001',
        user_id: 'user-alpha'
      },
      period: {
        id: 'period-april-2026',
        entity_id: 'entity-001',
        month: 4,
        year: 2026,
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        status: 'draft' as const
      },
      attendance: {
        working_days: 22,
        present_days: 0,
        alpha_days: 22,
        sick_leave_days: 0,
        paid_leave_days: 0,
        late_days: 0,
        overtime_hours: 0
      },
      allowances: [],
      ptkp_status: 'TK/0'
    }
    
    const result = await calculatePayroll(input)
    
    // Basic salary should be 0 (no days worked)
    expect(result.basic_salary).toBe(0)
    expect(result.thp).toBeLessThanOrEqual(0) // Could be negative if there are fixed deductions
  })
  
  it('should handle THR for employee with >= 12 months service', async () => {
    const input = {
      employee: {
        id: 'senior-001',
        join_date: '2024-01-01', // > 12 months before April 2026
        basic_salary: 15000000,
        entity_id: 'entity-001',
        user_id: 'user-senior'
      },
      period: {
        id: 'period-april-2026',
        entity_id: 'entity-001',
        month: 4,
        year: 2026,
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        status: 'draft' as const
      },
      attendance: {
        working_days: 22,
        present_days: 22,
        alpha_days: 0,
        sick_leave_days: 0,
        paid_leave_days: 0,
        late_days: 0,
        overtime_hours: 0
      },
      allowances: [],
      thr_config: {
        payment_timing: 'with_payroll' as const,
        calculation_base: 'basic_salary' as const
      },
      ptkp_status: 'K/3'
    }
    
    const result = await calculatePayroll(input)
    
    // THR should be 1× basic salary
    expect(result.thr_amount).toBe(15000000)
    expect(result.calculation_details.thr_months).toBe(1)
  })
})
