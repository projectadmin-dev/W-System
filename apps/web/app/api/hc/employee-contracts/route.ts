import { NextRequest, NextResponse } from 'next/server'
import {
  getEmployeeContracts,
  createContract,
  generateContractNo,
} from '@/lib/repositories/hr-employee-contracts'
import { createServerClient } from '@/lib/supabase-server'

/**
 * GET /api/hc/employee-contracts?employee_id=xxx
 * Get all contracts for an employee
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get('employee_id')

    if (!employeeId) {
      return NextResponse.json(
        { error: 'employee_id query param is required' },
        { status: 400 }
      )
    }

    const contracts = await getEmployeeContracts(employeeId)
    return NextResponse.json({ data: contracts })
  } catch (error) {
    console.error('Error fetching contracts:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/hc/employee-contracts
 * Create new contract (auto-generates contract_no)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.employee_id || !body.contract_type || !body.start_date || !body.position_id) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, contract_type, start_date, position_id' },
        { status: 400 }
      )
    }

    // Auto-generate contract number
    const contractNo = await generateContractNo(profile.tenant_id, body.contract_type)

    const contract = await createContract({
      tenant_id: profile.tenant_id,
      employee_id: body.employee_id,
      contract_no: body.contract_no || contractNo,
      contract_type: body.contract_type,
      start_date: body.start_date,
      end_date: body.end_date || null,
      probation_end_date: body.probation_end_date || null,
      position_id: body.position_id,
      department_id: body.department_id || null,
      grade_id: body.grade_id || null,
      base_salary: body.base_salary ? Number(body.base_salary) : null,
      work_shift_id: body.work_shift_id || null,
      work_area_id: body.work_area_id || null,
      is_active: body.is_active ?? true,
      termination_reason: null,
      termination_date: null,
      document_url: null,
      signed_at: null,
    } as any)

    return NextResponse.json(
      { message: 'Contract created', data: contract },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating contract:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
