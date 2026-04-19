import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    let query = supabase
      .from('project_briefs')
      .select(`
        *,
        lead:leads (
          id,
          name,
          stage,
          total_score,
          company_name
        ),
        client:clients (
          id,
          name,
          code
        ),
        commercial_pic:user_profiles!commercial_pic_id (
          id,
          full_name,
          email
        ),
        approved_by_user:user_profiles!approved_by (
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .eq('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error, count } = await query
    
    if (error) {
      console.error('Error fetching briefs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch briefs', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      data,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['title', 'client_id', 'tenant_id', 'commercial_pic_id']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // Calculate margin if revenue and cost provided
    if (body.estimated_revenue && body.estimated_cost) {
      const revenue = parseFloat(body.estimated_revenue)
      const cost = parseFloat(body.estimated_cost)
      body.estimated_margin = revenue - cost
      body.estimated_margin_pct = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0
      
      // Determine approval tier based on margin
      body.approval_tier = determineApprovalTier(body.estimated_margin_pct)
    }
    
    // Set initial status
    body.status = body.status || 'draft'
    
    const { data, error } = await supabase
      .from('project_briefs')
      .insert([body])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating brief:', error)
      return NextResponse.json(
        { error: 'Failed to create project brief', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper: Determine approval tier based on margin percentage
function determineApprovalTier(marginPct: number): string {
  if (marginPct >= 30) return 'pm'
  if (marginPct >= 20) return 'commercial_director'
  if (marginPct >= 10) return 'ceo'
  return 'ceo_cfo_dual' // 0-10% requires CEO + CFO (Arie) approval
}
