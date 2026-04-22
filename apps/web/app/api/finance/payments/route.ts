import { NextRequest, NextResponse } from 'next/server'
import { getPayments, getPaymentById, createPayment, updatePayment, deletePayment } from '@/lib/repositories/finance-transactions'

/**
 * GET /api/finance/payments
 * Get all payments
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const entityId = searchParams.get('entity_id') || undefined
    const status = searchParams.get('status') || undefined

    const payments = await getPayments(entityId, status)
    return NextResponse.json({ data: payments })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/finance/payments
 * Create new payment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const payment = await createPayment(body)

    return NextResponse.json({ data: payment }, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment' },
      { status: 500 }
    )
  }
}
