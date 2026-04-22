import { NextRequest, NextResponse } from 'next/server'
import { getReceipts, getReceiptById, createReceipt, updateReceipt, deleteReceipt } from '@/lib/repositories/finance-transactions'

/**
 * GET /api/finance/receipts
 * Get all receipts
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const entityId = searchParams.get('entity_id') || undefined
    const status = searchParams.get('status') || undefined

    const receipts = await getReceipts(entityId, status)
    return NextResponse.json({ data: receipts })
  } catch (error) {
    console.error('Error fetching receipts:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch receipts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/finance/receipts
 * Create new receipt
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const receipt = await createReceipt(body)

    return NextResponse.json({ data: receipt }, { status: 201 })
  } catch (error) {
    console.error('Error creating receipt:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create receipt' },
      { status: 500 }
    )
  }
}
