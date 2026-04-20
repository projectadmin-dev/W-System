import { NextRequest, NextResponse } from 'next/server'
import {
  getUmrData,
  getUmrById,
  getUmrByCity,
  createUmr,
  updateUmr,
  deleteUmr,
} from '@/lib/repositories/hr-umr'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const city = searchParams.get('city')
    const id = searchParams.get('id')
    const entityId = searchParams.get('entityId') || undefined
    const branchId = searchParams.get('branchId') || undefined

    if (id) {
      const umr = await getUmrById(id)
      return NextResponse.json(umr)
    }

    if (city) {
      const umr = await getUmrByCity(city)
      return NextResponse.json(umr)
    }

    const umr = await getUmrData(entityId, branchId)
    return NextResponse.json(umr)
  } catch (error) {
    console.error('Failed to fetch UMR data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch UMR data' },
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
    
    const umr = await createUmr({
      ...body,
      tenant_id: profile.tenant_id,
    })

    return NextResponse.json(umr)
  } catch (error) {
    console.error('Failed to create UMR:', error)
    return NextResponse.json(
      { error: 'Failed to create UMR' },
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
        { error: 'UMR ID required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const umr = await updateUmr(id, body)

    return NextResponse.json(umr)
  } catch (error) {
    console.error('Failed to update UMR:', error)
    return NextResponse.json(
      { error: 'Failed to update UMR' },
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
        { error: 'UMR ID required' },
        { status: 400 }
      )
    }

    await deleteUmr(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete UMR:', error)
    return NextResponse.json(
      { error: 'Failed to delete UMR' },
      { status: 500 }
    )
  }
}
