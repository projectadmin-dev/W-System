import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params
    
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        client:clients (
          id,
          name,
          code
        ),
        entity:entities (
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
      `)
      .eq('id', id)
      .single()
    
    if (error || !data) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params
    const body = await request.json()
    
    // Check if lead exists
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, stage')
      .eq('id', id)
      .single()
    
    if (!existingLead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }
    
    // Recalculate score if scoring fields updated
    if (body.budget_disclosed || body.authority_level || body.need_definition || body.timeline || body.engagement_score) {
      body.total_score = calculateLeadScore(body)
      body.score_calculated_at = new Date().toISOString()
      
      // Auto-update stage based on new score
      const newScore = body.total_score
      if (newScore >= 75 && existingLead.stage !== 'hot' && existingLead.stage !== 'deal') {
        body.stage = 'hot'
        body.previous_stage = existingLead.stage
        body.stage_entered_at = new Date().toISOString()
        body._triggerHotNotification = true
      } else if (newScore >= 50 && existingLead.stage === 'cold') {
        body.stage = 'warm'
        body.previous_stage = existingLead.stage
        body.stage_entered_at = new Date().toISOString()
      }
    }
    
    // Manual stage transition
    if (body.stage && body.stage !== existingLead.stage) {
      body.previous_stage = existingLead.stage
      body.stage_entered_at = new Date().toISOString()
      
      // Update SLA deadline
      const slaHours = getSLAHoursForStage(body.stage)
      body.sla_deadline_at = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString()
      
      // Check if transitioning to hot
      if (body.stage === 'hot') {
        body._triggerHotNotification = true
      }
    }
    
    // Update timestamp
    body.updated_at = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('leads')
      .update(body)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating lead:', error)
      return NextResponse.json(
        { error: 'Failed to update lead', details: error.message },
        { status: 500 }
      )
    }
    
    // Trigger hot lead notification if needed
    if (body._triggerHotNotification) {
      await triggerHotLeadNotification(data)
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params
    
    // Soft delete
    const { error } = await supabase
      .from('leads')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete lead', details: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
function calculateLeadScore(lead: any): number {
  let score = 0
  
  if (lead.budget_disclosed === 'exact') score += 25
  else if (lead.budget_disclosed === 'range') score += 15
  
  if (lead.authority_level === 'c_level') score += 25
  else if (lead.authority_level === 'manager') score += 15
  else if (lead.authority_level === 'influencer') score += 5
  
  if (lead.need_definition) score += Math.min(lead.need_definition, 20)
  
  if (lead.timeline === 'within_3mo') score += 15
  else if (lead.timeline === 'within_6mo') score += 8
  
  if (lead.engagement_score) score += Math.min(lead.engagement_score, 15)
  
  return score
}

function getSLAHoursForStage(stage: string): number {
  const slaMap: Record<string, number> = {
    'cold': 168,  // 7 days
    'warm': 336,  // 14 days
    'hot': 720,   // 30 days
    'deal': 0
  }
  return slaMap[stage] || 168
}

async function triggerHotLeadNotification(lead: any) {
  console.log('🔥 HOT LEAD NOTIFICATION:', {
    leadId: lead.id,
    leadName: lead.name,
    stage: lead.stage,
    totalScore: lead.total_score,
    timestamp: new Date().toISOString()
  })
  // TODO: Implement Telegram notification to Commercial & PM
}
