import { NextRequest, NextResponse } from 'next/server'
import { getPaymentById, updatePayment, deletePayment } from '@/lib/repositories/finance-transactions'

/**
 * GET /api/finance/payments/[id]
 * Get payment by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const payment = await getPaymentById(id)
    
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json({ data: payment })
  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch payment' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/finance/payments/[id]
 * Update payment
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const payment = await updatePayment(id, body)

    return NextResponse.json({ data: payment })
  } catch (error) {
    console.error('Error updating payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update payment' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/finance/payments/[id]
 * Delete payment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deletePayment(id)
    return NextResponse.json({ message: 'Payment deleted successfully' })
  } catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete payment' },
      { status: 500 }
    )
  }
}
