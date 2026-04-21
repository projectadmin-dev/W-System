import { NextRequest, NextResponse } from 'next/server'
import { closeFiscalPeriod } from '@/lib/repositories/finance-periods'
import { createServerClient } from '@/lib/supabase-server'

/**
 * POST /api/finance/periods/close - Close fiscal period
 * Body: { id }
 * PSAK: Prevents further postings to closed periods
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id } = body
    
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const period = await closeFiscalPeriod(id, user.id)
    return NextResponse.json(period)
  } catch (error) {
    console.error('Failed to close fiscal period:', error)
    return NextResponse.json(
      { error: 'Failed to close fiscal period', message: (error as Error).message },
      { status: 500 }
    )
  }
}
