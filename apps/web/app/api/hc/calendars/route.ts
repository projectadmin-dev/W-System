import { NextRequest, NextResponse } from 'next/server'
import {
  getCalendars,
  createCalendar,
  updateCalendar,
  deleteCalendar,
} from '@/lib/repositories/hr-calendars'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year')
    const entityId = searchParams.get('entityId') || undefined
    const branchId = searchParams.get('branchId') || undefined

    const calendars = await getCalendars(
      year ? parseInt(year) : undefined,
      entityId,
      branchId
    )
    return NextResponse.json(calendars)
  } catch (error) {
    console.error('Failed to fetch calendars:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendars' },
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
    
    const calendar = await createCalendar({
      ...body,
      tenant_id: profile.tenant_id,
    })

    return NextResponse.json(calendar)
  } catch (error) {
    console.error('Failed to create calendar:', error)
    return NextResponse.json(
      { error: 'Failed to create calendar' },
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
        { error: 'Calendar ID required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const calendar = await updateCalendar(id, body)

    return NextResponse.json(calendar)
  } catch (error) {
    console.error('Failed to update calendar:', error)
    return NextResponse.json(
      { error: 'Failed to update calendar' },
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
        { error: 'Calendar ID required' },
        { status: 400 }
      )
    }

    await deleteCalendar(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete calendar:', error)
    return NextResponse.json(
      { error: 'Failed to delete calendar' },
      { status: 500 }
    )
  }
}
