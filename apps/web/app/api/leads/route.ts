import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase client setup — service role key bypasses RLS on server-side routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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
        client:clients!leads_client_id_fkey (
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

    // Validate only essential fields
    if (!body.name || !body.contact_email || !body.source) {
      return NextResponse.json(
        { error: 'Missing required: name, contact_email, source' },
        { status: 400 }
      )
    }

    // Minimal payload for creation
    const defaultUserId = '8734a995-64dd-4ae1-ae34-dfc505b9271d' // Admin WIT
    const payload = {
      name: body.name,
      contact_email: body.contact_email,
      source: body.source,
      tenant_id: body.tenant_id || '00000000-0000-0000-0000-000000000001',
      current_pic_id: body.current_pic_id || defaultUserId,
      created_by: body.created_by || defaultUserId,
      stage: 'cold', // Default stage
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([payload])
      .select()
      .single()

    if (error) {
      console.error('Error creating lead:', error)
      return NextResponse.json(
        { error: 'Failed to create lead', details: error.message },
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

