import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/projects/[id]/sign-addendum
 * Mark addendum as signed — unblock execution.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const nowIso = new Date().toISOString()
    const { data, error } = await supabase.from('projects').update({
      signed_addendum: true,
      addendum_signed_at: body.signed_at || nowIso,
      addendum_signed_by: body.signed_by || null,
      kickoff_status: 'addendum_signed',
      execution_blocked_reason: null,
      updated_at: nowIso,
    }).eq('id', id).select().single()

    if (error || !data) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    return NextResponse.json({ success: true, project: data })
  } catch (err) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
