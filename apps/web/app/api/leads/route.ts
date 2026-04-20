import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase client setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const stage = searchParams.get('stage')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Build query
    let query = supabase
      .from('leads')
      .select(`
        *,
        client:clients (
          id,
          name,
          code
        ),
        marketing_pic:user_profiles!marketing_pic_id (
          id,
          full_name,
          email
        ),
        commercial_pic:user_profiles!commercial_pic_id (
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .eq('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    // Filter by stage if provided
    if (stage) {
      query = query.eq('stage', stage)
    }
    
    const { data, error, count } = await query
    
    if (error) {
      console.error('Error fetching leads:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leads', details: error.message },
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
    const requiredFields = ['name', 'source', 'tenant_id', 'current_pic_id']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // Calculate total score if scoring components provided
    let totalScore = 0
    if (body.budget_disclosed || body.authority_level || body.need_definition || body.timeline || body.engagement_score) {
      totalScore = calculateLeadScore(body)
      body.total_score = totalScore
      body.score_calculated_at = new Date().toISOString()
      
      // Auto-determine stage based on score
      if (totalScore >= 75) {
        body.stage = 'hot'
      } else if (totalScore >= 50) {
        body.stage = 'warm'
      } else {
        body.stage = 'cold'
      }
    }
    
    // Set SLA deadline based on stage
    if (body.stage) {
      const slaHours = getSLAHoursForStage(body.stage)
      body.sla_deadline_at = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString()
    }
    
    const { data, error } = await supabase
      .from('leads')
      .insert([body])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating lead:', error)
      return NextResponse.json(
        { error: 'Failed to create lead', details: error.message },
        { status: 500 }
      )
    }
    
    // Check if this is a hot lead and trigger notification
    if (body.stage === 'hot') {
      await triggerHotLeadNotification(data)
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

// Helper function to calculate lead score
function calculateLeadScore(lead: any): number {
  let score = 0
  
  // Budget disclosed (25 points max)
  if (lead.budget_disclosed === 'exact') score += 25
  else if (lead.budget_disclosed === 'range') score += 15
  
  // Authority level (25 points max)
  if (lead.authority_level === 'c_level') score += 25
  else if (lead.authority_level === 'manager') score += 15
  else if (lead.authority_level === 'influencer') score += 5
  
  // Need definition (20 points max)
  if (lead.need_definition) score += Math.min(lead.need_definition, 20)
  
  // Timeline (15 points max)
  if (lead.timeline === 'within_3mo') score += 15
  else if (lead.timeline === 'within_6mo') score += 8
  
  // Engagement score (15 points max)
  if (lead.engagement_score) score += Math.min(lead.engagement_score, 15)
  
  return score
}

// Helper function to get SLA hours for stage
function getSLAHoursForStage(stage: string): number {
  const slaMap: Record<string, number> = {
    'cold': 168,  // 7 days
    'warm': 336,  // 14 days
    'hot': 720,   // 30 days
    'deal': 0
  }
  return slaMap[stage] || 168
}

// Helper function to trigger hot lead notification
async function triggerHotLeadNotification(lead: any) {
  try {
    const { sendHotLeadNotification } = await import('@/lib/notifications')
    
    await sendHotLeadNotification({
      leadId: lead.id,
      leadName: lead.name,
      companyName: lead.company_name || lead.client?.name,
      totalScore: lead.total_score,
      stage: lead.stage,
      marketingPic: lead.marketing_pic?.full_name,
      contactEmail: lead.contact_email,
      contactPhone: lead.contact_phone
    })
  } catch (error) {
    console.error('Error triggering notification:', error)
    // Don't fail the request if notification fails
  }
}
