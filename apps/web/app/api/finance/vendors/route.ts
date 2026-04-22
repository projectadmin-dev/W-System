import { NextRequest, NextResponse } from 'next/server'
import { getVendors, createVendor, updateVendor, deleteVendor } from '@/lib/repositories/finance-transactions'

/**
 * GET /api/finance/vendors
 * Get all vendors for current tenant
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const entityId = searchParams.get('entity_id') || undefined

    const vendors = await getVendors(entityId)
    return NextResponse.json({ data: vendors })
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/finance/vendors
 * Create new vendor
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const vendor = await createVendor(body)

    return NextResponse.json({ data: vendor }, { status: 201 })
  } catch (error) {
    console.error('Error creating vendor:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create vendor' },
      { status: 500 }
    )
  }
}
