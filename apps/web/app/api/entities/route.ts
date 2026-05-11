import { NextRequest, NextResponse } from 'next/server'
import { getEntities, getEntityById, createEntity, updateEntity, deleteEntity } from '@/lib/repositories/entities'

/**
 * GET /api/entities - List all entities
 * Query params: tenantId, type, status, id
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (id) {
      const entity = await getEntityById(id)
      return NextResponse.json({ success: true, data: entity })
    }

    const tenantId = searchParams.get('tenantId') || undefined
    const type = searchParams.get('type') || undefined
    const status = searchParams.get('status') || undefined

    const entities = await getEntities(tenantId, type, status)

    // Transform entities to match frontend Entity interface (with city field)
    const transformed = entities.map(entity => ({
      id: entity.id,
      code: entity.code,
      name: entity.name,
      type: entity.type === 'holding' ? 'HO' : entity.type === 'subsidiary' ? 'BO' : entity.type === 'division' ? 'DIV' : entity.type,
      city: 'Indonesia', // Default city, can be enhanced later
      status: entity.status === 'active' ? 'Active' as const : 'Inactive' as const,
    }))

    return NextResponse.json({ success: true, data: transformed })
  } catch (error) {
    console.error('Failed to fetch entities:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch entities', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/entities - Create new entity
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['code', 'name', 'type']
    const missing = requiredFields.filter(f => !body[f])
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    // Convert frontend types to DB types
    const dbEntity = {
      ...body,
      tenant_id: body.tenant_id || '00000000-0000-0000-0000-000000000001',
      type: body.type === 'HO' ? 'holding' : body.type === 'BO' ? 'subsidiary' : body.type === 'DIV' ? 'division' : body.type,
      status: body.status === 'Active' ? 'active' : 'inactive',
    }

    const entity = await createEntity(dbEntity)

    const transformed = {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      type: entity.type === 'holding' ? 'HO' : entity.type === 'subsidiary' ? 'BO' : entity.type === 'division' ? 'DIV' : entity.type,
      city: body.city || 'Indonesia',
      status: entity.status === 'active' ? 'Active' as const : 'Inactive' as const,
    }

    return NextResponse.json({ success: true, data: transformed })
  } catch (error) {
    console.error('Failed to create entity:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create entity', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/entities - Update entity
 */
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 })
    }

    const body = await request.json()

    const dbUpdates: any = {}
    if (body.code) dbUpdates.code = body.code
    if (body.name) dbUpdates.name = body.name
    if (body.type) dbUpdates.type = body.type === 'HO' ? 'holding' : body.type === 'BO' ? 'subsidiary' : body.type === 'DIV' ? 'division' : body.type
    if (body.status) dbUpdates.status = body.status === 'Active' ? 'active' : 'inactive'
    if (body.parent_id !== undefined) dbUpdates.parent_id = body.parent_id
    if (body.settings) dbUpdates.settings = body.settings

    const entity = await updateEntity(id, dbUpdates)

    const transformed = {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      type: entity.type === 'holding' ? 'HO' : entity.type === 'subsidiary' ? 'BO' : entity.type === 'division' ? 'DIV' : entity.type,
      city: body.city || 'Indonesia',
      status: entity.status === 'active' ? 'Active' as const : 'Inactive' as const,
    }

    return NextResponse.json({ success: true, data: transformed })
  } catch (error) {
    console.error('Failed to update entity:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update entity', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/entities - Delete entity
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 })
    }

    await deleteEntity(id)
    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('Failed to delete entity:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete entity', message: (error as Error).message },
      { status: 500 }
    )
  }
}
