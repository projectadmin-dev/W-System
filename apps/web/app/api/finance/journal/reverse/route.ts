import { NextRequest, NextResponse } from 'next/server'
import { createReversalEntry } from '@/lib/repositories/finance-journal'
import { createServerClient } from '@/lib/supabase-server'

/**
 * POST /api/finance/journal/reverse - Create reversal entry for posted journal entry
 * Body: { id, reason }
 * PSAK: Only way to correct posted entries
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

    const reversal = await createReversalEntry(id, reason, user.id)
    return NextResponse.json(reversal, { status: 201 })
  } catch (error) {
    console.error('Failed to create reversal entry:', error)
    return NextResponse.json(
      { error: 'Failed to create reversal entry', message: (error as Error).message },
      { status: 500 }
    )
  }
}
