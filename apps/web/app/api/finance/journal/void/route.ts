import { NextRequest, NextResponse } from 'next/server'
import { voidJournalEntry } from '@/lib/repositories/finance-journal'

/**
 * POST /api/finance/journal/void - Void journal entry (draft only)
 * Body: { id }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body
    
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const result = await voidJournalEntry(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to void journal entry:', error)
    return NextResponse.json(
      { error: 'Failed to void journal entry', message: (error as Error).message },
      { status: 500 }
    )
  }
}
