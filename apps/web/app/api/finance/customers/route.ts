import { NextRequest, NextResponse } from 'next/server'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/lib/repositories/finance-transactions'

/**
 * GET /api/finance/customers
 * Get all customers for current tenant
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const entityId = searchParams.get('entity_id') || undefined

    const customers = await getCustomers(entityId)
    return NextResponse.json({ data: customers })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/finance/customers
 * Create new customer
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const customer = await createCustomer(body)

    return NextResponse.json({ data: customer }, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create customer' },
      { status: 500 }
    )
  }
}
