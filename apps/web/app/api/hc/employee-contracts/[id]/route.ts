import { NextRequest, NextResponse } from 'next/server'
import {
  getContractById,
  updateContract,
  deactivateContract,
} from '@/lib/repositories/hr-employee-contracts'

/**
 * GET /api/hc/employee-contracts/[id]
 * Get single contract
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contract = await getContractById(id)
    return NextResponse.json({ data: contract })
  } catch (error) {
    console.error('Error fetching contract:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/hc/employee-contracts/[id]
 * Update contract
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updates: Record<string, any> = {}
    const allowedFields = [
      'contract_no', 'contract_type', 'start_date', 'end_date',
      'probation_end_date', 'position_id', 'department_id', 'grade_id',
      'base_salary', 'work_shift_id', 'work_area_id', 'is_active',
      'termination_reason', 'termination_date', 'document_url', 'signed_at',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const contract = await updateContract(id, updates)
    return NextResponse.json({ message: 'Contract updated', data: contract })
  } catch (error) {
    console.error('Error updating contract:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/hc/employee-contracts/[id]
 * Deactivate contract (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contract = await deactivateContract(id)
    return NextResponse.json({ message: 'Contract deactivated', data: contract })
  } catch (error) {
    console.error('Error deactivating contract:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
