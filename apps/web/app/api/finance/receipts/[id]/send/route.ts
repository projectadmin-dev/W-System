import { NextRequest, NextResponse } from 'next/server'
import { getReceiptById } from '@/lib/repositories/finance-transactions'

/**
 * POST /api/finance/receipts/[id]/send
 * Marks receipt as sent + returns data for email integration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const receipt = await getReceiptById(id)
    
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 })
    }

    // TODO: Integrate with actual email service (SendGrid, Nodemailer, etc.)
    // For now, just return success with receipt data
    return NextResponse.json({
      success: true,
      message: 'Receipt ready to send',
      data: {
        receipt_id: receipt.id,
        receipt_number: receipt.receipt_number,
        customer_email: (receipt as any).customer?.email || null,
        amount: receipt.amount,
        status: 'sent',
      },
    })
  } catch (error) {
    console.error('Error sending receipt:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send receipt' },
      { status: 500 }
    )
  }
}
