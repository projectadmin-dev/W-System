import { NextRequest, NextResponse } from 'next/server'
import { getCustomerInvoices, getCustomerInvoiceById, createCustomerInvoice, updateCustomerInvoice, deleteCustomerInvoice } from '@/lib/repositories/finance-transactions'

/**
 * GET /api/finance/customer-invoices/[id]
 * Get customer invoice by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const invoice = await getCustomerInvoiceById(id)
    
    if (!invoice) {
      return NextResponse.json({ error: 'Customer invoice not found' }, { status: 404 })
    }

    return NextResponse.json({ data: invoice })
  } catch (error) {
    console.error('Error fetching customer invoice:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch customer invoice' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/finance/customer-invoices/[id]
 * Update customer invoice
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const invoice = await updateCustomerInvoice(id, body)

    return NextResponse.json({ data: invoice })
  } catch (error) {
    console.error('Error updating customer invoice:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update customer invoice' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/finance/customer-invoices/[id]
 * Delete customer invoice
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteCustomerInvoice(id)
    return NextResponse.json({ message: 'Customer invoice deleted successfully' })
  } catch (error) {
    console.error('Error deleting customer invoice:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete customer invoice' },
      { status: 500 }
    )
  }
}
