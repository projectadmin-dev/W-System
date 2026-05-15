import { NextRequest, NextResponse } from 'next/server'
import { postJournalEntry } from '@/lib/repositories/finance-journal'

/**
 * POST /api/finance/journal/post - Post journal entry (draft → posted)
 * Accepts id in body or query params
 * PSAK: Entry becomes immutable after posting
 */
export async function POST(request: NextRequest) {
  try {
    let id: string | null = null

    // Try body first
    try {
      const body = await request.json()
      id = body.id || null
    } catch {
      // Body is empty or not JSON — fall through
    }

    // Fallback to query params
    if (!id) {
      id = request.nextUrl.searchParams.get('id')
    }
    
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    // Use system posted_by since auth is service role
    const entry = await postJournalEntry(id, '812558af-8be8-4c53-b581-e6a4f1c91147')
    return NextResponse.json(entry)
  } catch (error) {
    console.error('Failed to post journal entry:', error)
    return NextResponse.json(
      { error: 'Failed to post journal entry', message: (error as Error).message },
      { status: 500 }
    )
  }
}
