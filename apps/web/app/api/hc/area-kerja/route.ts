import { NextRequest, NextResponse } from 'next/server'
import { 
  getWorkAreas, 
  getWorkAreaById, 
  createWorkArea, 
  updateWorkArea, 
  deleteWorkArea 
} from '@/lib/repositories/hr-work-areas'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (id) {
      const area = await getWorkAreaById(id)
      return NextResponse.json(area)
    }
    
    const entityId = searchParams.get('entityId') || undefined
    const branchId = searchParams.get('branchId') || undefined
    const areas = await getWorkAreas(entityId, branchId)
    return NextResponse.json(areas)
  } catch (error) {
    console.error('Failed to fetch work areas:', error)
    return NextResponse.json({ error: 'Failed to fetch work areas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await request.json()
    const area = await createWorkArea({ ...body, tenant_id: profile.tenant_id })
    return NextResponse.json(area)
  } catch (error) {
    console.error('Failed to create work area:', error)
    return NextResponse.json({ error: 'Failed to create work area' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const body = await request.json()
    const area = await updateWorkArea(id, body)
    return NextResponse.json(area)
  } catch (error) {
    console.error('Failed to update work area:', error)
    return NextResponse.json({ error: 'Failed to update work area' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const result = await deleteWorkArea(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to delete work area:', error)
    return NextResponse.json({ error: 'Failed to delete work area' }, { status: 500 })
  }
}
