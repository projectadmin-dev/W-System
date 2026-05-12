import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * POST /api/quotations/[id]/generate-invoice
 * Generates a customer_invoice (Finance AR) from an accepted quotation.
 * 
 * Flow: Accepted Quotation → Customer Invoice (one-click)
 * 
 * Business Rules:
 * - Only quotation with status=accepted can generate invoice
 * - Invoice IN number format: INV-YYYY-MM-NNNN (auto-generated)
 * - Line items copied from quotation line_items
 * - quotation_id stored on customer_invoices for traceability
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params

    // 1. Fetch quotation with line items + client + brief
    const { data: q, error: qErr } = await supabase
      .from('quotations')
      .select(`
        *,
        brief:project_briefs ( id, title ),
        client:clients ( id, name ),
        commercial_pic:user_profiles!commercial_pic_id ( id, full_name, email )
      `)
      .eq('id', id)
      .single()

    if (qErr || !q) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    // 2. Validation: only accepted quotations can generate invoice
    if (q.status !== 'accepted') {
      return NextResponse.json(
        { error: `Quotation must be accepted to generate invoice. Current status: ${q.status}` },
        { status: 400 }
      )
    }

    // 3. Check if invoice already exists for this quotation
    const { data: existingInv } = await supabase
      .from('customer_invoices')
      .select('id, invoice_number')
      .eq('quotation_id', id)
      .is('deleted_at', null)
      .single()

    if (existingInv) {
      return NextResponse.json(
        { error: 'Invoice already generated', invoice_id: existingInv.id, invoice_number: existingInv.invoice_number },
        { status: 409 }
      )
    }

    // 4. Auto-generate invoice number: INV-YYYY-MM-NNNN
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')

    const { data: lastInv } = await supabase
      .from('customer_invoices')
      .select('invoice_number')
      .like('invoice_number', `INV-${year}-${month}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .single()

    let seq = 1
    if (lastInv && lastInv.invoice_number) {
      const parts = lastInv.invoice_number.split('-')
      const lastSeq = parseInt(parts[3], 10)
      if (!isNaN(lastSeq)) seq = lastSeq + 1
    }
    const invoiceNumber = `INV-${year}-${month}-${String(seq).padStart(4, '0')}`

    // 5. Build invoice data (minimal required fields)
    const invoiceData = {
      invoice_number: invoiceNumber,
      invoice_date: now.toISOString().split('T')[0],
      due_date: new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0], // Termin 14 hari default
      status: 'draft',
      total_amount: q.total_amount,
      tax_amount: q.tax_amount,
      discount_amount: q.discount_amount,
      subtotal: q.subtotal,
      currency: q.currency || 'IDR',
      notes: `Generated from Quotation ${q.quotation_number}${q.version ? ` (${q.version})` : ''}. Terms: ${q.payment_terms || 'Net 14'}.`,
      quotation_id: id,
      // Link to customer if client exists (via customer_id lookup)
      customer_id: null, // Will be resolved below
    }

    // 6. Resolve customer from client (if customers table has matching reference)
    if (q.client?.id) {
      const { data: cust } = await supabase
        .from('customers')
        .select('id')
        .eq('client_ref_id', q.client.id) // optional FK bridge
        .is('deleted_at', null)
        .single()

      if (cust) {
        // @ts-ignore
        invoiceData.customer_id = cust.id
      }

      // Fallback: lookup by name
      if (!invoiceData.customer_id) {
        const { data: custByName } = await supabase
          .from('customers')
          .select('id')
          .ilike('customer_name', `%${q.client.name}%`)
          .is('deleted_at', null)
          .single()
        if (custByName) {
          // @ts-ignore
          invoiceData.customer_id = custByName.id
        }
      }
    }

    // 7. Insert invoice
    const { data: newInvoice, error: invErr } = await supabase
      .from('customer_invoices')
      .insert(invoiceData)
      .select()
      .single()

    if (invErr) {
      console.error('Invoice insert error:', invErr)
      return NextResponse.json(
        { error: 'Failed to create invoice', details: invErr.message },
        { status: 500 }
      )
    }

    // 8. Insert line items from quotation → customer_invoice_lines
    if (q.line_items && Array.isArray(q.line_items) && q.line_items.length > 0) {
      const lines = q.line_items.map((item: any, idx: number) => ({
        invoice_id: newInvoice.id,
        line_number: idx + 1,
        description: item.description || 'Item',
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        line_total: Number(item.total) || (Number(item.quantity) * Number(item.unit_price)),
      }))

      const { error: linesErr } = await supabase
        .from('customer_invoice_lines')
        .insert(lines)

      if (linesErr) {
        console.error('Line items insert warning:', linesErr)
        // Don't fail the whole request; log warning
      }
    }

    // 9. Update quotation status → invoiced (optional, track that invoice was created)
    await supabase
      .from('quotations')
      .update({
        status: 'invoiced',
        updated_at: now.toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      invoice: {
        id: newInvoice.id,
        invoice_number: newInvoice.invoice_number,
        total_amount: newInvoice.total_amount,
      },
      quotation_id: id,
    }, { status: 201 })

  } catch (error) {
    console.error('Generate invoice API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
