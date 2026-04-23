import { NextResponse } from 'next/server'
import { mockExpenseService } from '../../../../../lib/repositories/finance-expenses'

/**
 * GET /api/finance/expenses/summary
 * Query params: period (YYYY-MM, default current month)
 * Returns Budget vs Actual summary per kind
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const now = new Date()
    const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const period = searchParams.get('period') || defaultPeriod

    const summary = mockExpenseService.getSummary(period)

    return NextResponse.json({
      success: true,
      data: summary,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
