import { NextResponse } from 'next/server'
import { mockExpenseService } from '../../../../lib/repositories/finance-expenses'
import type { ExpenseFilter } from '../../../../lib/repositories/finance-expenses'

/**
 * GET /api/finance/expenses
 * Query params: period, kind, status, search, page, limit, sort_by, sort_order
 * 
 * POST /api/finance/expenses
 * Body: CreateExpenseInput
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filter: ExpenseFilter = {}

    if (searchParams.has('period')) filter.period = searchParams.get('period')!
    if (searchParams.has('kind')) filter.kind = searchParams.get('kind') as ExpenseFilter['kind']
    if (searchParams.has('status')) filter.status = searchParams.get('status') as ExpenseFilter['status']
    if (searchParams.has('search')) filter.search = searchParams.get('search')!
    if (searchParams.has('page')) filter.page = parseInt(searchParams.get('page')!)
    if (searchParams.has('limit')) filter.limit = parseInt(searchParams.get('limit')!)
    if (searchParams.has('sort_by')) filter.sort_by = searchParams.get('sort_by') as ExpenseFilter['sort_by']
    if (searchParams.has('sort_order')) filter.sort_order = searchParams.get('sort_order') as ExpenseFilter['sort_order']

    const result = mockExpenseService.getAll(filter)

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        count: result.count,
        total_pages: result.total_pages,
        page: filter.page ?? 1,
        limit: filter.limit ?? 20,
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Basic validation
    if (!body.kind || !body.category_id || !body.description || typeof body.amount !== 'number' || !body.date || !body.payment_method) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: kind, category_id, description, amount, date, payment_method' },
        { status: 400 }
      )
    }

    const expense = mockExpenseService.create({
      ...body,
      created_by: 'system', // Will be replaced with real user auth
    })

    return NextResponse.json(
      { success: true, data: expense },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
