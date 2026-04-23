import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/quotations/[id]/create-project
 * Auto-create project from accepted / invoiced quotation.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params

    // 1. Fetch quotation
    const { data: q, error: qErr } = await supabase
      .from('quotations')
      .select(`
        *,
        brief:project_briefs(id, title, estimated_revenue, estimated_cost),
        client:clients(id, name)
      `)
      .eq('id', id)
      .single()

    if (qErr || !q) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })

    if (q.status !== 'accepted' && q.status !== 'invoiced') {
      return NextResponse.json({ error: 'Quotation must be accepted or invoiced to create project' }, { status: 400 })
    }

    // 2. Check if project already exists
    const { data: existing } = await supabase
      .from('projects')
      .select('id, project_code')
      .eq('quotation_id', id)
      .is('deleted_at', null)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Project already exists', project_id: existing.id, project_code: existing.project_code }, { status: 409 })
    }

    // 3. Auto-generate PRJ-YYYY-MM-NNNN
    const now = new Date()
    const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2, '0')
    const { data: lastProj } = await supabase.from('projects')
      .select('project_code')
      .like('project_code', `PRJ-${y}-${m}-%`)
      .order('project_code', { ascending: false })
      .limit(1)
      .single()
    let seq = 1
    if (lastProj?.project_code) { const parts = lastProj.project_code.split('-'); const n = parseInt(parts[3]); if (!isNaN(n)) seq = n + 1 }
    const code = `PRJ-${y}-${m}-${String(seq).padStart(4, '0')}`

    // 4. Insert project
    const dealValue = Number(q.total_amount) || Number(q.brief?.estimated_revenue) || 0
    const { data: proj, error: projErr } = await supabase
      .from('projects')
      .insert({
        project_code: code,
        project_name: q.title || `Project for ${q.quotation_number}`,
        quotation_id: id,
        brief_id: q.brief_id || q.brief?.id || null,
        client_id: q.client_id || q.client?.id || null,
        deal_value: dealValue,
        budget_amount: dealValue,
        currency: q.currency || 'IDR',
        status: 'planning',
        signed_addendum: false,
        kickoff_status: 'not_started',
        start_date: now.toISOString().split('T')[0],
      })
      .select()
      .single()

    if (projErr) return NextResponse.json({ error: 'Failed to create project', details: projErr.message }, { status: 500 })

    // 5. Create status history record
    await supabase.from('project_status_history').insert({
      project_id: proj.id,
      status: 'planning',
      notes: `Auto-created from quotation ${q.quotation_number}`,
    })

    return NextResponse.json({ success: true, project: proj }, { status: 201 })
  } catch (err) {
    console.error('Create project error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
