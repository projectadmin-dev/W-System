import { NextRequest, NextResponse } from 'next/server'
import { validatePostingDate } from '@/lib/repositories/finance-periods'

/**
 * POST /api/finance/periods/validate - Validate posting date
 * Body: { date }
 * Returns: { valid: boolean, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date } = body
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date required' },
        { status: 400 }
      )
    }

    const error = await validatePostingDate(date)
    
    if (error) {
      return NextResponse.json({
        valid: false,
        error
      }, { status: 400 })
    }
    
    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Failed to validate posting date:', error)
    return NextResponse.json(
      { error: 'Failed to validate posting date', message: (error as Error).message },
      { status: 500 }
    )
  }
}
