import { NextRequest, NextResponse } from 'next/server'
import { postJournalEntry } from '@/lib/repositories/finance-journal'
import { createServerClient } from '@/lib/supabase-server'

/**
 * POST /api/finance/journal/post - Post journal entry (draft → posted)
 * Body: { id }
 * PSAK: Entry becomes immutable after posting
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

    const entry = await postJournalEntry(id, user.id)
    return NextResponse.json(entry)
  } catch (error) {
    console.error('Failed to post journal entry:', error)
    return NextResponse.json(
      { error: 'Failed to post journal entry', message: (error as Error).message },
      { status: 500 }
    )
  }
}
