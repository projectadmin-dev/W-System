import { NextRequest, NextResponse } from 'next/server'
import { 
  getCoaAccounts, 
  getCoaById, 
  getCoaByCode,
  getCoaTree,
  getCoaByType,
  createCoaAccount, 
  updateCoaAccount, 
  deleteCoaAccount 
} from '@/lib/repositories/finance-coa'
import { createAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/finance/coa - List COA accounts
 * Query params: id, code, type, entityId, tree
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    const code = searchParams.get('code')
    const type = searchParams.get('type')
    const entityId = searchParams.get('entityId') || undefined
    const tree = searchParams.get('tree')
    const cashFlowCategory = searchParams.get('cashFlowCategory')

    if (id) {
      const account = await getCoaById(id)
      return NextResponse.json(account)
    }
    
    if (code) {
      const account = await getCoaByCode(code)
      return NextResponse.json(account)
    }
    
    if (tree === 'true') {
      const treeData = await getCoaTree()
      return NextResponse.json(treeData)
    }
    
    if (type) {
      const accounts = await getCoaByType(type as any)
      return NextResponse.json(accounts)
    }

    if (cashFlowCategory) {
      const accounts = await getCoaAccounts(entityId)
      return NextResponse.json(accounts.filter(a => a.cash_flow_category === cashFlowCategory))
    }

    const accounts = await getCoaAccounts(entityId)
    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Failed to fetch COA accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch COA accounts', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/finance/coa - Create new COA account
 * Body: { entity_id, account_code, account_name, account_type, level, parent_account_id?, normal_balance, ... }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    // Skip auth check for service role operations
    // In production, add auth middleware if needed

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', '00000000-0000-0000-0000-000000000000') // System user for service role
      .single()

    const tenantId = profile?.tenant_id || '00000000-0000-0000-0000-000000000001'

    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['account_code', 'account_name', 'account_type', 'level']
    const missingFields = requiredFields.filter(field => !body[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: 'Missing required fields', fields: missingFields },
        { status: 400 }
      )
    }
    
    // Check if account code already exists
    const existing = await getCoaByCode(body.account_code, tenantId)
    if (existing) {
      return NextResponse.json(
        { error: `Account code ${body.account_code} already exists` },
        { status: 409 }
      )
    }

    const account = await createCoaAccount({ 
      ...body, 
      tenant_id: tenantId 
    })
    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    console.error('Failed to create COA account:', error)
    return NextResponse.json(
      { error: 'Failed to create COA account', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/finance/coa - Update COA account
 * Query params: id
 * Body: { account_name?, account_type?, level?, parent_account_id?, ... }
 */
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const body = await request.json()
    const account = await updateCoaAccount(id, body)
    return NextResponse.json(account)
  } catch (error) {
    console.error('Failed to update COA account:', error)
    return NextResponse.json(
      { error: 'Failed to update COA account', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/finance/coa - Soft delete COA account
 * Query params: id
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const result = await deleteCoaAccount(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to delete COA account:', error)
    return NextResponse.json(
      { error: 'Failed to delete COA account', message: (error as Error).message },
      { status: 500 }
    )
  }
}
