import { NextResponse } from 'next/server'
import { mockExpenseService } from '../../../../../lib/repositories/finance-expenses'
import type { UpdateExpenseInput } from '../../../../../lib/repositories/finance-expenses'

/**
 * GET /api/finance/expenses/[id]
 * Returns single expense detail
 * 
 * PATCH /api/finance/expenses/[id]
 * Body: UpdateExpenseInput
 * 
 * DELETE /api/finance/expenses/[id]
 * Soft delete (set status to cancelled)
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const expense = mockExpenseService.getById(id)

    if (!expense) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: expense })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: UpdateExpenseInput = await request.json()

    const expense = mockExpenseService.update(id, body)

    if (!expense) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: expense })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const success = mockExpenseService.delete(id)

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Expense cancelled successfully' }
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
