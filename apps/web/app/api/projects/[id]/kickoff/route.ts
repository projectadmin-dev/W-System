import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function checkBlock(project: any) {
  if (!project.signed_addendum) return { blocked: true, reason: 'No execution without signed addendum. Please sign the addendum first.' }
  // Optional: check if invoice is paid
  return { blocked: false }
}

/**
 * POST /api/projects/[id]/kickoff
 * Start project execution. BLOCKED if no signed addendum.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params

    const { data: proj, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !proj) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const block = checkBlock(proj)
    if (block.blocked) {
      return NextResponse.json({ error: block.reason, code: 'ADDENDUM_REQUIRED', kickoff_status: proj.kickoff_status }, { status: 403 })
    }

    const nowIso = new Date().toISOString()
    const { data: updated } = await supabase.from('projects').update({
      status: 'active',
      kickoff_status: 'started',
      kickoff_date: nowIso.split('T')[0],
      execution_blocked_reason: null,
      updated_at: nowIso,
    }).eq('id', id).select().single()

    return NextResponse.json({ success: true, project: updated })
  } catch (err) {
    console.error('Kickoff error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
