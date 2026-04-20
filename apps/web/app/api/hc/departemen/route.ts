import { NextRequest, NextResponse } from 'next/server'
import { 
  getDepartments, 
  getDepartmentById, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment 
} from '@/lib/repositories/hr-departments'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (id) {
      const department = await getDepartmentById(id)
      return NextResponse.json(department)
    }
    
    const entityId = searchParams.get('entityId') || undefined
    const branchId = searchParams.get('branchId') || undefined
    const departments = await getDepartments(entityId, branchId)
    return NextResponse.json(departments)
  } catch (error) {
    console.error('Failed to fetch departments:', error)
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })
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
    const department = await createDepartment({ ...body, tenant_id: profile.tenant_id })
    return NextResponse.json(department)
  } catch (error) {
    console.error('Failed to create department:', error)
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const body = await request.json()
    const department = await updateDepartment(id, body)
    return NextResponse.json(department)
  } catch (error) {
    console.error('Failed to update department:', error)
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const result = await deleteDepartment(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to delete department:', error)
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 })
  }
}
