import { NextRequest, NextResponse } from 'next/server'
import { voidJournalEntry } from '@/lib/repositories/finance-journal'

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

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

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid UUID format' }, { status: 400 })
    }

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid UUID format' }, { status: 400 })
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
