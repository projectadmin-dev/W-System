import { NextRequest, NextResponse } from 'next/server'
import {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
} from '@/lib/repositories/hr-shifts'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const entityId = searchParams.get('entityId') || undefined
    const branchId = searchParams.get('branchId') || undefined

    const shifts = await getShifts(entityId, branchId)
    return NextResponse.json(shifts || [])
  } catch (error: any) {
    console.error('Failed to fetch shifts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shifts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get tenant context from user session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get tenant_id from user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    
    const shift = await createShift({
      ...body,
      tenant_id: profile.tenant_id,
    })

    return NextResponse.json(shift)
  } catch (error) {
    console.error('Failed to create shift:', error)
    return NextResponse.json(
      { error: 'Failed to create shift' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Shift ID required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const shift = await updateShift(id, body)

    return NextResponse.json(shift)
  } catch (error) {
    console.error('Failed to update shift:', error)
    return NextResponse.json(
      { error: 'Failed to update shift' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Shift ID required' },
        { status: 400 }
      )
    }

    await deleteShift(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete shift:', error)
    return NextResponse.json(
      { error: 'Failed to delete shift' },
      { status: 500 }
    )
  }
}
