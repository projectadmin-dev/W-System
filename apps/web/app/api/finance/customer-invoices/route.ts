import { NextRequest, NextResponse } from 'next/server'
import { 
  getCustomerInvoices, 
  getCustomerInvoiceById, 
  createCustomerInvoice, 
  updateCustomerInvoice, 
  deleteCustomerInvoice 
} from '@/lib/repositories/finance-transactions'

/**
 * GET /api/finance/customer-invoices
 * Get all customer invoices (Accounts Receivable)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const entityId = searchParams.get('entity_id') || undefined
    const status = searchParams.get('status') || undefined

    const invoices = await getCustomerInvoices(entityId, status)
    return NextResponse.json({ data: invoices })
  } catch (error) {
    console.error('Error fetching customer invoices:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch customer invoices' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/finance/customer-invoices
 * Create new customer invoice with line items
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lines = [], ...invoiceData } = body
    
    const invoice = await createCustomerInvoice(
      invoiceData,
      lines.map((line: any, index: number) => ({
        ...line,
        line_number: index + 1,
      }))
    )

    return NextResponse.json({ data: invoice }, { status: 201 })
  } catch (error) {
    console.error('Error creating customer invoice:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create customer invoice' },
      { status: 500 }
    )
  }
}
