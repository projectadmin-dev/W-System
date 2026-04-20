import { NextRequest, NextResponse } from 'next/server'
import { 
  getPositions, 
  getPositionById, 
  createPosition, 
  updatePosition, 
  deletePosition 
} from '@/lib/repositories/hr-positions'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (id) {
      const position = await getPositionById(id)
      return NextResponse.json(position)
    }
    
    const entityId = searchParams.get('entityId') || undefined
    const branchId = searchParams.get('branchId') || undefined
    const departmentId = searchParams.get('departmentId') || undefined
    const positions = await getPositions(entityId, branchId, departmentId)
    return NextResponse.json(positions)
  } catch (error) {
    console.error('Failed to fetch positions:', error)
    return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
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
    const position = await createPosition({ ...body, tenant_id: profile.tenant_id })
    return NextResponse.json(position)
  } catch (error) {
    console.error('Failed to create position:', error)
    return NextResponse.json({ error: 'Failed to create position' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const body = await request.json()
    const position = await updatePosition(id, body)
    return NextResponse.json(position)
  } catch (error) {
    console.error('Failed to update position:', error)
    return NextResponse.json({ error: 'Failed to update position' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const result = await deletePosition(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to delete position:', error)
    return NextResponse.json({ error: 'Failed to delete position' }, { status: 500 })
  }
}
