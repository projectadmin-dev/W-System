import { NextRequest, NextResponse } from 'next/server'
import { 
  getOvertimeRules, 
  getOvertimeRuleById, 
  createOvertimeRule, 
  updateOvertimeRule, 
  deleteOvertimeRule 
} from '@/lib/repositories/hr-overtime-rules'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (id) {
      const rule = await getOvertimeRuleById(id)
      return NextResponse.json(rule)
    }
    
    const entityId = searchParams.get('entityId') || undefined
    const branchId = searchParams.get('branchId') || undefined
    const rules = await getOvertimeRules(entityId, branchId)
    return NextResponse.json(rules)
  } catch (error) {
    console.error('Failed to fetch overtime rules:', error)
    return NextResponse.json({ error: 'Failed to fetch overtime rules' }, { status: 500 })
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
    const rule = await createOvertimeRule({ ...body, tenant_id: profile.tenant_id })
    return NextResponse.json(rule)
  } catch (error) {
    console.error('Failed to create overtime rule:', error)
    return NextResponse.json({ error: 'Failed to create overtime rule' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const body = await request.json()
    const rule = await updateOvertimeRule(id, body)
    return NextResponse.json(rule)
  } catch (error) {
    console.error('Failed to update overtime rule:', error)
    return NextResponse.json({ error: 'Failed to update overtime rule' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const result = await deleteOvertimeRule(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to delete overtime rule:', error)
    return NextResponse.json({ error: 'Failed to delete overtime rule' }, { status: 500 })
  }
}
