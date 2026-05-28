import { NextRequest, NextResponse } from 'next/server'
import {
  getCategories, getCategoryById, createCategory, updateCategory, deleteCategory,
  getTypes, getTypeById, getTypesByParent, createType, updateType, deleteType,
  getSubAccounts, getSubAccountById, getSubAccountsByParent, createSubAccount, updateSubAccount, deleteSubAccount,
  getGeneralLedgers, getGlById, getGlsByParent, createGl, updateGl, deleteGl,
  getDetailLedgers, getDetailById, getDetailsByParent, createDetail, updateDetail, deleteDetail,
  buildCoaTree, getNodeByCoaFullCode,
  getAttributeTemplateData, bulkUpdateAttributes,
  type AttributeImportRow,
} from '@/lib/repositories/finance-coa-hierarchy'
import { createAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/finance/coa/hierarchy
 * Query: ?layer=category|type|sub|gl|detail|tree
 *        ?parentId=uuid (for fetching children)
 *        ?id=uuid (single item)
 *        ?coaFullCode=1-1-01-1-2000 (lookup)
 *        ?template=1 (download attribute template data)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const layer = searchParams.get('layer') as any
    const parentId = searchParams.get('parentId')
    const id = searchParams.get('id')
    const coaFullCode = searchParams.get('coaFullCode')
    const template = searchParams.get('template')
    const tenantId = searchParams.get('tenantId') || undefined

    // Single item lookup
    if (id) {
      let data = null
      if (layer === 'category') data = await getCategoryById(id)
      else if (layer === 'type') data = await getTypeById(id)
      else if (layer === 'sub') data = await getSubAccountById(id)
      else if (layer === 'gl') data = await getGlById(id)
      else if (layer === 'detail') data = await getDetailById(id)
      else {
        // Try all layers
        data = await getNodeByCoaFullCode(id) || await getCategoryById(id).catch(() => null)
      }
      if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(data)
    }

    // COA Full Code lookup
    if (coaFullCode) {
      const data = await getNodeByCoaFullCode(coaFullCode, tenantId)
      if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(data)
    }

    // Attribute template download
    if (template) {
      const data = await getAttributeTemplateData(layer || undefined, tenantId)
      return NextResponse.json(data)
    }

    // Tree view
    if (layer === 'tree') {
      const tree = await buildCoaTree(tenantId)
      return NextResponse.json(tree)
    }

    // Layer-specific list
    if (layer === 'category') {
      if (parentId) return NextResponse.json({ error: 'Category has no parent' }, { status: 400 })
      return NextResponse.json(await getCategories(tenantId))
    }
    if (layer === 'type') {
      if (parentId) return NextResponse.json(await getTypesByParent(parentId))
      return NextResponse.json(await getTypes(tenantId))
    }
    if (layer === 'sub') {
      if (parentId) return NextResponse.json(await getSubAccountsByParent(parentId))
      return NextResponse.json(await getSubAccounts(tenantId))
    }
    if (layer === 'gl') {
      if (parentId) return NextResponse.json(await getGlsByParent(parentId))
      return NextResponse.json(await getGeneralLedgers(tenantId))
    }
    if (layer === 'detail') {
      if (parentId) return NextResponse.json(await getDetailsByParent(parentId))
      return NextResponse.json(await getDetailLedgers(tenantId))
    }

    // Default: return all layers for tree building
    const [categories, types, subs, gls, details] = await Promise.all([
      getCategories(tenantId),
      getTypes(tenantId),
      getSubAccounts(tenantId),
      getGeneralLedgers(tenantId),
      getDetailLedgers(tenantId),
    ])
    return NextResponse.json({ categories, types, subAccounts: subs, generalLedgers: gls, detailLedgers: details })
  } catch (error) {
    console.error('COA Hierarchy GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch COA hierarchy', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/finance/coa/hierarchy
 * Body: { layer, ...fields }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { layer, ...fields } = body

    // Get tenant from auth context (simplified)
    const supabase = await createAdminClient()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', '00000000-0000-0000-0000-000000000000')
      .single()
    const tenantId = profile?.tenant_id || '00000000-0000-0000-0000-000000000001'

    const record = { ...fields, tenant_id: tenantId }

    let result: any
    switch (layer) {
      case 'category':
        if (!record.coa_code || !record.name || !record.normal_balance) {
          return NextResponse.json({ error: 'Missing required fields: coa_code, name, normal_balance' }, { status: 400 })
        }
        result = await createCategory(record)
        break
      case 'type':
        if (!record.coa_code || !record.name || !record.parent_id) {
          return NextResponse.json({ error: 'Missing required fields: coa_code, name, parent_id' }, { status: 400 })
        }
        result = await createType(record)
        break
      case 'sub':
        if (!record.coa_code || !record.name || !record.parent_id) {
          return NextResponse.json({ error: 'Missing required fields: coa_code, name, parent_id' }, { status: 400 })
        }
        result = await createSubAccount(record)
        break
      case 'gl':
        if (!record.coa_code || !record.name || !record.parent_id) {
          return NextResponse.json({ error: 'Missing required fields: coa_code, name, parent_id' }, { status: 400 })
        }
        result = await createGl(record)
        break
      case 'detail':
        if (!record.coa_code || !record.name || !record.parent_id) {
          return NextResponse.json({ error: 'Missing required fields: coa_code, name, parent_id' }, { status: 400 })
        }
        result = await createDetail(record)
        break
      default:
        return NextResponse.json({ error: `Unknown layer: ${layer}. Use: category|type|sub|gl|detail` }, { status: 400 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('COA Hierarchy POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create COA node', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/finance/coa/hierarchy
 * Query: ?layer=...&id=...
 * Body: { ...updates }
 */
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const layer = searchParams.get('layer')
    const id = searchParams.get('id')
    if (!layer || !id) return NextResponse.json({ error: 'layer and id required' }, { status: 400 })

    const body = await request.json()

    let result: any
    switch (layer) {
      case 'category': result = await updateCategory(id, body); break
      case 'type': result = await updateType(id, body); break
      case 'sub': result = await updateSubAccount(id, body); break
      case 'gl': result = await updateGl(id, body); break
      case 'detail': result = await updateDetail(id, body); break
      default:
        return NextResponse.json({ error: `Unknown layer: ${layer}` }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('COA Hierarchy PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update COA node', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/finance/coa/hierarchy
 * Query: ?layer=...&id=...
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const layer = searchParams.get('layer')
    const id = searchParams.get('id')
    if (!layer || !id) return NextResponse.json({ error: 'layer and id required' }, { status: 400 })

    let result: any
    switch (layer) {
      case 'category': result = await deleteCategory(id); break
      case 'type': result = await deleteType(id); break
      case 'sub': result = await deleteSubAccount(id); break
      case 'gl': result = await deleteGl(id); break
      case 'detail': result = await deleteDetail(id); break
      default:
        return NextResponse.json({ error: `Unknown layer: ${layer}` }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('COA Hierarchy DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete COA node', message: (error as Error).message },
      { status: 500 }
    )
  }
}
