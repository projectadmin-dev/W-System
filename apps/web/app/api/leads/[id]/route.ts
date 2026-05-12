import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role key bypasses RLS on server-side routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params
    
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        client:clients!leads_client_id_fkey (
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
    
    // Manual stage transition only
    if (body.stage && body.stage !== existingLead.stage) {
      body.previous_stage = existingLead.stage
      body.stage_entered_at = new Date().toISOString()
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

