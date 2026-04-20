// HC Module Types
// Manual type definitions until Supabase types can be generated

export type HrWorkShift = {
  id: string
  tenant_id: string
  entity_id: string | null
  branch_id: string | null
  name: string
  code: string
  start_time: string
  end_time: string
  break_start: string | null
  break_end: string | null
  break_duration_minutes: number
  grace_period_minutes: number
  is_active: boolean
  is_default: boolean
  created_at: string
  updated_at: string
}

export type HrWorkShiftInsert = Omit<HrWorkShift, 'id' | 'created_at' | 'updated_at'>
export type HrWorkShiftUpdate = Partial<Omit<HrWorkShift, 'id' | 'created_at' | 'updated_at'>>

export type HrWorkCalendar = {
  id: string
  tenant_id: string
  entity_id: string | null
  branch_id: string | null
  year: number
  date: string
  name: string
  type: 'national_holiday' | 'cuti_bersama' | 'weekend' | 'company_holiday' | 'unpaid_leave'
  is_paid: boolean
  description: string | null
  is_default: boolean
  created_at: string
}

export type HrWorkCalendarInsert = Omit<HrWorkCalendar, 'id' | 'created_at'>
export type HrWorkCalendarUpdate = Partial<Omit<HrWorkCalendar, 'id' | 'created_at'>>

export type HrCityUmr = {
  id: string
  tenant_id: string
  entity_id: string | null
  branch_id: string | null
  city_name: string
  province: string
  umr_amount: number
  effective_date: string
  description: string | null
  is_default: boolean
  created_at: string
}

export type HrCityUmrInsert = Omit<HrCityUmr, 'id' | 'created_at'>
export type HrCityUmrUpdate = Partial<Omit<HrCityUmr, 'id' | 'created_at'>>

export type HrBpjsConfig = {
  id: string
  tenant_id: string
  entity_id: string | null
  branch_id: string | null
  effective_date: string
  jht_employee_rate: number
  jht_employer_rate: number
  jp_employee_rate: number
  jp_employer_rate: number
  jk_employee_rate: number
  jk_employer_rate: number
  jkm_employee_rate: number
  jkm_employer_rate: number
  jkk_employee_rate: number
  jkk_employer_rate: number
  jht_salary_cap: number
  jp_salary_cap: number
  is_active: boolean
  description: string | null
  created_at: string
}

export type HrBpjsConfigInsert = Omit<HrBpjsConfig, 'id' | 'created_at'>
export type HrBpjsConfigUpdate = Partial<Omit<HrBpjsConfig, 'id' | 'created_at'>>

export type HrPph21Config = {
  id: string
  tenant_id: string
  entity_id: string | null
  branch_id: string | null
  effective_date: string
  ptkp_tk0: number
  ptkp_tk1: number
  ptkp_tk2: number
  ptkp_tk3: number
  ptkp_k0: number
  ptkp_k1: number
  ptkp_k2: number
  ptkp_k3: number
  tax_bracket_1_max: number
  tax_bracket_1_rate: number
  tax_bracket_2_max: number
  tax_bracket_2_rate: number
  tax_bracket_3_max: number
  tax_bracket_3_rate: number
  tax_bracket_4_max: number
  tax_bracket_4_rate: number
  tax_bracket_5_max: number
  tax_bracket_5_rate: number
  ter_1_max: number
  ter_1_rate: number
  ter_2_max: number
  ter_2_rate: number
  ter_3_rate: number
  is_active: boolean
  description: string | null
  created_at: string
}

export type HrPph21ConfigInsert = Omit<HrPph21Config, 'id' | 'created_at'>
export type HrPph21ConfigUpdate = Partial<Omit<HrPph21Config, 'id' | 'created_at'>>

// HR Departments (Organizational Structure)
export type HrDepartment = {
  id: string
  tenant_id: string
  entity_id: string
  branch_id: string | null
  parent_id: string | null
  name: string
  code: string
  description: string | null
  head_user_id: string | null
  is_active: boolean
  level: number
  created_at: string
  updated_at: string
}

export type HrDepartmentInsert = Omit<HrDepartment, 'id' | 'created_at' | 'updated_at'>
export type HrDepartmentUpdate = Partial<Omit<HrDepartment, 'id' | 'created_at' | 'updated_at'>>

// HR Positions (Jabatan)
export type HrPosition = {
  id: string
  tenant_id: string
  entity_id: string
  branch_id: string | null
  department_id: string
  grade_id: string | null
  name: string
  code: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type HrPositionInsert = Omit<HrPosition, 'id' | 'created_at' | 'updated_at'>
export type HrPositionUpdate = Partial<Omit<HrPosition, 'id' | 'created_at' | 'updated_at'>>

// HR Work Areas (Area Kerja)
export type HrWorkArea = {
  id: string
  tenant_id: string
  entity_id: string
  branch_id: string | null
  name: string
  code: string
  latitude: number
  longitude: number
  radius_meters: number
  require_photo: boolean
  require_gps: boolean
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type HrWorkAreaInsert = Omit<HrWorkArea, 'id' | 'created_at' | 'updated_at'>
export type HrWorkAreaUpdate = Partial<Omit<HrWorkArea, 'id' | 'created_at' | 'updated_at'>>

// HR Salary Components (Komponen Gaji)
export type HrSalaryComponent = {
  id: string
  tenant_id: string
  entity_id: string | null
  branch_id: string | null
  name: string
  code: string
  component_type: 'earning' | 'deduction'
  category: 'basic' | 'allowance' | 'overtime' | 'bonus' | 'thr' | 'bpjs_tk' | 'bpjs_kes' | 'pph21' | 'loan' | 'other'
  is_taxable: boolean
  is_bpjs_base: boolean
  is_fixed: boolean
  fixed_amount: number | null
  percentage: number | null
  description: string | null
  is_active: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type HrSalaryComponentInsert = Omit<HrSalaryComponent, 'id' | 'created_at' | 'updated_at'>
export type HrSalaryComponentUpdate = Partial<Omit<HrSalaryComponent, 'id' | 'created_at' | 'updated_at'>>

// HR Job Grades (Grade)
export type HrJobGrade = {
  id: string
  tenant_id: string
  entity_id: string
  branch_id: string | null
  code: string
  name: string
  level: number
  salary_min: number
  salary_mid: number
  salary_max: number
  leave_quota: number
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type HrJobGradeInsert = Omit<HrJobGrade, 'id' | 'created_at' | 'updated_at'>
export type HrJobGradeUpdate = Partial<Omit<HrJobGrade, 'id' | 'created_at' | 'updated_at'>>

// HR Salary Matrix (Matrix Gaji per Step)
export type HrSalaryMatrix = {
  id: string
  tenant_id: string
  entity_id: string
  grade_id: string
  step: number
  amount: number
  effective_date: string
  end_date: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export type HrSalaryMatrixInsert = Omit<HrSalaryMatrix, 'id' | 'created_at' | 'updated_at'>
export type HrSalaryMatrixUpdate = Partial<Omit<HrSalaryMatrix, 'id' | 'created_at' | 'updated_at'>>

// HR Overtime Rules (Lembur)
export type HrOvertimeRule = {
  id: string
  tenant_id: string
  entity_id: string
  branch_id: string | null
  day_type: 'weekday' | 'weekend' | 'national_holiday'
  rate_brackets: any
  max_hours_per_day: number
  max_hours_per_week: number
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type HrOvertimeRuleInsert = Omit<HrOvertimeRule, 'id' | 'created_at' | 'updated_at'>
export type HrOvertimeRuleUpdate = Partial<Omit<HrOvertimeRule, 'id' | 'created_at' | 'updated_at'>>
