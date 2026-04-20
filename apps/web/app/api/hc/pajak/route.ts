import { NextRequest, NextResponse } from 'next/server'
import {
  getPph21Config,
  getPph21ConfigById,
  getActivePph21Config,
  createPph21Config,
  updatePph21Config,
  deletePph21Config,
} from '@/lib/repositories/hr-tax'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const active = searchParams.get('active')
    const date = searchParams.get('date')
    const entityId = searchParams.get('entityId') || undefined
    const branchId = searchParams.get('branchId') || undefined

    if (id) {
      const config = await getPph21ConfigById(id)
      return NextResponse.json(config)
    }

    if (active === 'true') {
      const config = await getActivePph21Config(date || undefined)
      return NextResponse.json(config)
    }

    const config = await getPph21Config(entityId, branchId)
    return NextResponse.json(config)
  } catch (error) {
    console.error('Failed to fetch PPh21 config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch PPh21 config' },
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
    
    const config = await createPph21Config({
      ...body,
      tenant_id: profile.tenant_id,
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error('Failed to create PPh21 config:', error)
    return NextResponse.json(
      { error: 'Failed to create PPh21 config' },
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
        { error: 'PPh21 config ID required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const config = await updatePph21Config(id, body)

    return NextResponse.json(config)
  } catch (error) {
    console.error('Failed to update PPh21 config:', error)
    return NextResponse.json(
      { error: 'Failed to update PPh21 config' },
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
        { error: 'PPh21 config ID required' },
        { status: 400 }
      )
    }

    await deletePph21Config(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete PPh21 config:', error)
    return NextResponse.json(
      { error: 'Failed to delete PPh21 config' },
      { status: 500 }
    )
  }
}
