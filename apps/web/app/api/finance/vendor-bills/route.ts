import { NextRequest, NextResponse } from 'next/server'
import { 
  getVendorBills, 
  getVendorBillById, 
  createVendorBill, 
  updateVendorBill, 
  deleteVendorBill 
} from '@/lib/repositories/finance-transactions'

/**
 * GET /api/finance/vendor-bills
 * Get all vendor bills (Accounts Payable)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const entityId = searchParams.get('entity_id') || undefined
    const status = searchParams.get('status') || undefined

    const bills = await getVendorBills(entityId, status)
    return NextResponse.json({ data: bills })
  } catch (error) {
    console.error('Error fetching vendor bills:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch vendor bills' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/finance/vendor-bills
 * Create new vendor bill with line items
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lines = [], ...billData } = body
    
    const bill = await createVendorBill(
      billData,
      lines.map((line: any, index: number) => ({
        ...line,
        line_number: index + 1,
      }))
    )

    return NextResponse.json({ data: bill }, { status: 201 })
  } catch (error) {
    console.error('Error creating vendor bill:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create vendor bill' },
      { status: 500 }
    )
  }
}
