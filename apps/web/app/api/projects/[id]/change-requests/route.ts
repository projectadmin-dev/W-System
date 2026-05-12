import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * GET /api/projects/[id]/change-requests
 * List change requests for a project
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params
    const { data, error } = await supabase.from('change_requests')
      .select(`
        *,
        requested_by_user:requested_by(id, full_name),
        approved_by_user:approved_by(id, full_name)
      `)
      .eq('project_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * POST /api/projects/[id]/change-requests
 * Submit a change request (scope/timeline/cost/resource)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params
    const body = await request.json()

    const { data, error } = await supabase.from('change_requests').insert({
      project_id: id,
      title: body.title,
      description: body.description,
      change_type: body.change_type || 'scope',
      status: 'submitted',
      old_value: body.old_value || null,
      new_value: body.new_value || null,
    }).select().single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
