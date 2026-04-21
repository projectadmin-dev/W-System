import { NextRequest, NextResponse } from 'next/server'
import { 
  getFiscalPeriods, 
  getFiscalPeriodById,
  getFiscalPeriodByName,
  getCurrentFiscalPeriod,
  getFiscalPeriodByDate,
  createFiscalPeriod, 
  updateFiscalPeriod,
  deleteFiscalPeriod
} from '@/lib/repositories/finance-periods'
import { createAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/finance/periods - List fiscal periods
 * Query params: id, name, current, date (find period containing date)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const name = searchParams.get('name')
    const current = searchParams.get('current')
    const date = searchParams.get('date')
    const entityId = searchParams.get('entityId') || undefined
    
    if (id) {
      const period = await getFiscalPeriodById(id)
      return NextResponse.json(period)
    }
    
    if (name) {
      const period = await getFiscalPeriodByName(name)
      return NextResponse.json(period)
    }
    
    if (current === 'true') {
      const period = await getCurrentFiscalPeriod()
      return NextResponse.json(period)
    }
    
    if (date) {
      const period = await getFiscalPeriodByDate(date)
      return NextResponse.json(period)
    }
    
    const periods = await getFiscalPeriods(entityId)
    return NextResponse.json(periods)
  } catch (error) {
    console.error('Failed to fetch fiscal periods:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fiscal periods', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/finance/periods - Create new fiscal period
 * Body: { period_name, start_date, end_date, status?, entity_id?, fiscal_year? }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    // Skip auth check for service role operations
    // In production, add auth middleware if needed

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id, id')
      .eq('user_id', '00000000-0000-0000-0000-000000000000') // System user for service role
      .single()

    const tenantId = profile?.tenant_id || '00000000-0000-0000-0000-000000000001'
    
    // Use the system user's profile ID, or fallback to first available user profile
    let createdById = profile?.id
    if (!createdById) {
      // Get first user profile as fallback (for dev/testing)
      const { data: fallbackProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1)
        .single()
      createdById = fallbackProfile?.id || '00000000-0000-0000-0000-000000000000'
    }

    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['period_name', 'start_date', 'end_date', 'period_type']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: 'Missing required fields', fields: missingFields },
        { status: 400 }
      )
    }
    
    // Remove fiscal_year if present (not in schema)
    const { fiscal_year, ...validBody } = body
    
    // Validate date range (start < end)
    const startDate = new Date(validBody.start_date)
    const endDate = new Date(validBody.end_date)
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      )
    }

    const period = await createFiscalPeriod({ 
      ...validBody, 
      tenant_id: tenantId,
      created_by: createdById
    })
    return NextResponse.json(period, { status: 201 })
  } catch (error) {
    console.error('Failed to create fiscal period:', error)
    return NextResponse.json(
      { error: 'Failed to create fiscal period', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/finance/periods - Update fiscal period
 * Query params: id
 * Body: { period_name?, start_date?, end_date?, status?, ... }
 */
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const body = await request.json()
    const period = await updateFiscalPeriod(id, body)
    return NextResponse.json(period)
  } catch (error) {
    console.error('Failed to update fiscal period:', error)
    return NextResponse.json(
      { error: 'Failed to update fiscal period', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/finance/periods - Soft delete fiscal period
 * Query params: id
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const result = await deleteFiscalPeriod(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to delete fiscal period:', error)
    return NextResponse.json(
      { error: 'Failed to delete fiscal period', message: (error as Error).message },
      { status: 500 }
    )
  }
}
