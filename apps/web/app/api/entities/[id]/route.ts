import { NextRequest, NextResponse } from 'next/server'
import { getEntityById, updateEntity, deleteEntity } from '@/lib/repositories/entities'

/**
 * GET /api/entities/[id] - Get entity by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const entity = await getEntityById(id)

    if (!entity) {
      return NextResponse.json(
        { success: false, error: 'Entity not found' },
        { status: 404 }
      )
    }

    const transformed = {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      type: entity.type,
      status: entity.status,
      parent_id: entity.parent_id,
      settings: entity.settings,
    }

    return NextResponse.json({ success: true, data: transformed })
  } catch (error) {
    console.error('Failed to fetch entity:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch entity', message: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/entities/[id] - Update entity
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const dbUpdates: any = {}
    if (body.name) dbUpdates.name = body.name
    if (body.status) dbUpdates.status = body.status
    if (body.parent_id !== undefined) dbUpdates.parent_id = body.parent_id
    if (body.settings) dbUpdates.settings = body.settings

    const entity = await updateEntity(id, dbUpdates)

    const transformed = {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      type: entity.type,
      status: entity.status,
      parent_id: entity.parent_id,
      settings: entity.settings,
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
 * DELETE /api/entities/[id] - Delete entity
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
