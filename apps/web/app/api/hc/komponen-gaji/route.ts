import { NextRequest, NextResponse } from 'next/server'
import { 
  getSalaryComponents, 
  getSalaryComponentById, 
  createSalaryComponent, 
  updateSalaryComponent, 
  deleteSalaryComponent 
} from '@/lib/repositories/hr-salary-components'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    
    if (id) {
      const component = await getSalaryComponentById(id)
      return NextResponse.json(component)
    }
    
    const entityId = searchParams.get('entityId') || undefined
    const branchId = searchParams.get('branchId') || undefined
    const components = await getSalaryComponents(entityId, branchId, includeDeleted)
    return NextResponse.json(components)
  } catch (error) {
    console.error('Failed to fetch salary components:', error)
    return NextResponse.json({ error: 'Failed to fetch salary components' }, { status: 500 })
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
    const component = await createSalaryComponent({ ...body, tenant_id: profile.tenant_id })
    return NextResponse.json(component)
  } catch (error) {
    console.error('Failed to create salary component:', error)
    return NextResponse.json({ error: 'Failed to create salary component' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const body = await request.json()
    const component = await updateSalaryComponent(id, body)
    return NextResponse.json(component)
  } catch (error) {
    console.error('Failed to update salary component:', error)
    return NextResponse.json({ error: 'Failed to update salary component' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const result = await deleteSalaryComponent(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to delete salary component:', error)
    return NextResponse.json({ error: 'Failed to delete salary component' }, { status: 500 })
  }
}
