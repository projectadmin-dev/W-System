import { NextRequest, NextResponse } from 'next/server'
import { getReceiptById, updateReceipt, deleteReceipt } from '@/lib/repositories/finance-transactions'

/**
 * GET /api/finance/receipts/[id]
 * Get receipt by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const receipt = await getReceiptById(id)
    
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    return NextResponse.json({ data: receipt })
  } catch (error) {
    console.error('Error fetching receipt:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch receipt' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/finance/receipts/[id]
 * Update receipt
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const receipt = await updateReceipt(id, body)

    return NextResponse.json({ data: receipt })
  } catch (error) {
    console.error('Error updating receipt:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update receipt' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/finance/receipts/[id]
 * Delete receipt
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteReceipt(id)
    return NextResponse.json({ message: 'Receipt deleted successfully' })
  } catch (error) {
    console.error('Error deleting receipt:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete receipt' },
      { status: 500 }
    )
  }
}
