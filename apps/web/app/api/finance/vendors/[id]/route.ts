import { NextRequest, NextResponse } from 'next/server'
import { getVendorById, updateVendor, deleteVendor } from '@/lib/repositories/finance-transactions'

/**
 * GET /api/finance/vendors/[id]
 * Get vendor by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const vendor = await getVendorById(id)
    
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    return NextResponse.json({ data: vendor })
  } catch (error) {
    console.error('Error fetching vendor:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch vendor' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/finance/vendors/[id]
 * Update vendor
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const vendor = await updateVendor(id, body)

    return NextResponse.json({ data: vendor })
  } catch (error) {
    console.error('Error updating vendor:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update vendor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/finance/vendors/[id]
 * Soft delete vendor
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteVendor(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vendor:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete vendor' },
      { status: 500 }
    )
  }
}
