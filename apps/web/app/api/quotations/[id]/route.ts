import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params

    const { data, error } = await supabase
      .from('quotations')
      .select(`
        *,
        brief:project_briefs ( id, title, executive_summary, estimated_revenue, estimated_cost ),
        client:clients ( id, name, code, contact_email, contact_phone ),
        commercial_pic:user_profiles!commercial_pic_id ( id, full_name, email ),
        created_by_user:user_profiles!created_by ( id, full_name, email ),
        parent:quotations!parent_quotation_id ( id, quotation_number, version, status )
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params
    const body = await request.json()

    const { data: existing } = await supabase
      .from('quotations')
      .select('id, status')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    // Track status transitions with timestamps
    if (body.status && body.status !== existing.status) {
      const now = new Date().toISOString()
      if (body.status === 'sent') body.sent_at = now
      if (body.status === 'viewed') body.viewed_at = now
      if (body.status === 'accepted') body.accepted_at = now
      if (body.status === 'rejected') body.rejected_at = now
      if (body.status === 'revised') {
        body.rejected_at = undefined
        body.accepted_at = undefined
      }
    }

    body.updated_at = new Date().toISOString()

    // Recalculate totals if line_items changed
    if (body.line_items) {
      const items = body.line_items as Array<{ quantity: number; unit_price: number }>
      const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.unit_price)), 0)
      const taxRate = body.tax_rate != null ? Number(body.tax_rate) : 11
      const taxAmount = subtotal * (taxRate / 100)
      const discountPercent = Number(body.discount_percent || 0)
      const discountAmount = subtotal * (discountPercent / 100)
      body.subtotal = subtotal
      body.total_amount = subtotal + taxAmount - discountAmount
    }

    const { data, error } = await supabase
      .from('quotations')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating quotation:', error)
      return NextResponse.json(
        { error: 'Failed to update quotation', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const { id } = await params

    const { error } = await supabase
      .from('quotations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete quotation', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
