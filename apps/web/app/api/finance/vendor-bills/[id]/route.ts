import { NextRequest, NextResponse } from 'next/server'
import { getVendorBillById, updateVendorBill, deleteVendorBill } from '@/lib/repositories/finance-transactions'

/**
 * GET /api/finance/vendor-bills/[id]
 * Get vendor bill by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const bill = await getVendorBillById(id)
    
    if (!bill) {
      return NextResponse.json({ error: 'Vendor bill not found' }, { status: 404 })
    }

    return NextResponse.json({ data: bill })
  } catch (error) {
    console.error('Error fetching vendor bill:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch vendor bill' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/finance/vendor-bills/[id]
 * Update vendor bill
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const bill = await updateVendorBill(id, body)

    return NextResponse.json({ data: bill })
  } catch (error) {
    console.error('Error updating vendor bill:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update vendor bill' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/finance/vendor-bills/[id]
 * Delete vendor bill
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteVendorBill(id)
    return NextResponse.json({ message: 'Vendor bill deleted successfully' })
  } catch (error) {
    console.error('Error deleting vendor bill:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete vendor bill' },
      { status: 500 }
    )
  }
}
