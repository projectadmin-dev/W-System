import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function generateQuotationNumber(): string {
  const now = new Date()
  const yy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  return `QTN-${yy}-${mm}-${String(Math.floor(Math.random() * 9000) + 1000)}`
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const briefId = searchParams.get('brief_id')
    const clientId = searchParams.get('client_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('quotations')
      .select(`
        *,
        brief:project_briefs ( id, title ),
        client:clients ( id, name, code ),
        commercial_pic:user_profiles!commercial_pic_id ( id, full_name, email )
      `, { count: 'exact' })
      .eq('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (briefId) query = query.eq('brief_id', briefId)
    if (clientId) query = query.eq('client_id', clientId)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching quotations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch quotations', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data,
      pagination: { total: count || 0, limit, offset, hasMore: (count || 0)> offset + limit }
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()

    const requiredFields = ['brief_id', 'client_id', 'title', 'line_items']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Calculate financials from line_items
    const items = body.line_items as Array<{ quantity: number; unit_price: number }>
    const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.unit_price)), 0)
    const taxRate = body.tax_rate != null ? Number(body.tax_rate) : 11
    const taxAmount = subtotal * (taxRate / 100)
    const discountPercent = Number(body.discount_percent || 0)
    const discountAmount = subtotal * (discountPercent / 100)
    const total = subtotal + taxAmount - discountAmount

    body.subtotal = subtotal
    body.tax_rate = taxRate
    body.discount_percent = discountPercent
    body.total_amount = total
    body.quotation_number = generateQuotationNumber()
    body.version = 'v1.0'
    body.status = 'draft'

    // Set valid_until = now + 30 days
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + (body.validity_days || 30))
    body.valid_until = validUntil.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('quotations')
      .insert([body])
      .select()
      .single()

    if (error) {
      console.error('Error creating quotation:', error)
      return NextResponse.json(
        { error: 'Failed to create quotation', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
