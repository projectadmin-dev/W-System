import { NextRequest, NextResponse } from 'next/server'
import { reopenFiscalPeriod } from '@/lib/repositories/finance-periods'
import { createServerClient } from '@/lib/supabase-server'

/**
 * POST /api/finance/periods/reopen - Reopen closed fiscal period
 * Body: { id, reason }
 * PSAK: Should be rare and documented
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, reason } = body
    
    if (!id || !reason) {
      return NextResponse.json(
        { error: 'ID and reason required' },
        { status: 400 }
      )
    }

    const period = await reopenFiscalPeriod(id, user.id, reason)
    return NextResponse.json(period)
  } catch (error) {
    console.error('Failed to reopen fiscal period:', error)
    return NextResponse.json(
      { error: 'Failed to reopen fiscal period', message: (error as Error).message },
      { status: 500 }
    )
  }
}
