import { NextRequest, NextResponse } from 'next/server'
import { getProfitAndLoss, getBalanceSheet, getTrialBalance } from '@/lib/repositories/finance-reports'

/**
 * GET /api/finance/reports/profit-loss
 * Query params: fiscalPeriodId, startDate, endDate
 * Returns: P&L report data structure
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'profit-loss'
    const fiscalPeriodId = searchParams.get('fiscalPeriodId') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    switch (type) {
      case 'profit-loss': {
        const report = await getProfitAndLoss(fiscalPeriodId, { startDate, endDate })
        return NextResponse.json(report)
      }
      case 'balance-sheet': {
        const report = await getBalanceSheet(fiscalPeriodId, { startDate, endDate })
        return NextResponse.json(report)
      }
      case 'trial-balance': {
        const report = await getTrialBalance(fiscalPeriodId, { startDate, endDate })
        return NextResponse.json(report)
      }
      case 'dashboard-summary': {
        return NextResponse.json(
          { error: 'Dashboard summary not yet implemented. Use profit-loss, balance-sheet, or trial-balance.' },
          { status: 501 }
        )
      }
      default:
        return NextResponse.json(
          { error: 'Invalid report type. Use: profit-loss, balance-sheet, trial-balance, dashboard-summary' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Failed to generate report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report', message: (error as Error).message },
      { status: 500 }
    )
  }
}
