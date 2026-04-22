import { createServerClient } from '../supabase-server'
import type { HrEmployeeContract, HrEmployeeContractInsert, HrEmployeeContractUpdate } from '../types/hc'

/**
 * Get all contracts for an employee (with relation info)
 */
export async function getEmployeeContracts(employeeId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_employee_contracts')
    .select(`
      *,
      position:position_id(name),
      department:department_id(name),
      grade:grade_id(name),
      shift:work_shift_id(name),
      area:work_area_id(name)
    `)
    .eq('employee_id', employeeId)
    .order('start_date', { ascending: false })

  if (error) throw new Error(`Failed to fetch contracts: ${error.message}`)
  return data || []
}

/**
 * Get single contract by ID
 */
export async function getContractById(id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_employee_contracts')
    .select(`
      *,
      position:position_id(name),
      department:department_id(name),
      grade:grade_id(name)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch contract: ${error.message}`)
  return data
}

/**
 * Get current active contract for an employee
 */
export async function getActiveContract(employeeId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_employee_contracts')
    .select(`
      *,
      position:position_id(name),
      department:department_id(name),
      grade:grade_id(name)
    `)
    .eq('employee_id', employeeId)
    .eq('is_active', true)
    .single()

  if (error) throw new Error(`Failed to fetch active contract: ${error.message}`)
  return data
}

/**
 * Create new contract
 */
export async function createContract(contract: HrEmployeeContractInsert) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_employee_contracts')
    .insert(contract)
    .select()
    .single()

  if (error) throw new Error(`Failed to create contract: ${error.message}`)
  return data
}

/**
 * Update contract
 */
export async function updateContract(id: string, updates: HrEmployeeContractUpdate) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_employee_contracts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update contract: ${error.message}`)
  return data
}

/**
 * Soft delete (deactivate) contract
 */
export async function deactivateContract(id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_employee_contracts')
    .update({ 
      is_active: false, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to deactivate contract: ${error.message}`)
  return data
}

/**
 * Generate next contract number for a tenant
 * Format: PKWT/2026/001, PKWTT/2026/002, etc.
 */
export async function generateContractNo(tenantId: string, contractType: string): Promise<string> {
  const supabase = await createServerClient()
  const typeCode = contractType.toUpperCase()
  const year = new Date().getFullYear()

  const { data, error } = await supabase
    .from('hr_employee_contracts')
    .select('contract_no')
    .eq('tenant_id', tenantId)
    .ilike('contract_no', `${typeCode}/${year}/%`)
    .order('contract_no', { ascending: false })
    .limit(1)
    .single()

  let nextNum = 1
  if (!error && data) {
    const parts = data.contract_no.split('/')
    const lastNum = parseInt(parts[2] || '0', 10)
    nextNum = lastNum + 1
  }

  return `${typeCode}/${year}/${String(nextNum).padStart(3, '0')}`
}
