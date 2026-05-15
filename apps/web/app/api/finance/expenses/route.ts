import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/finance/expenses
 * Query params: period, kind, status, search, page, limit, sort_by, sort_order
 *
 * POST /api/finance/expenses
 * Body: CreateExpenseInput
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const supabase = await createAdminClient()

    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)

    // Apply filters
    const period = searchParams.get('period')
    if (period) {
      query = query.gte('expense_date', `${period}-01`).lt('expense_date', `${period}-32`)
    }

    const kind = searchParams.get('kind')
    if (kind) query = query.eq('kind_code', kind)

    const status = searchParams.get('status')
    if (status) query = query.eq('status', status)

    const search = searchParams.get('search')
    if (search) {
      query = query.or(`description.ilike.%${search}%,vendor.ilike.%${search}%`)
    }

    // Sort
    const sortBy = searchParams.get('sort_by') || 'expense_date'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Pagination
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    const total_pages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      success: true,
      data: data || [],
      meta: {
        count: count || 0,
        total_pages,
        page,
        limit,
      }
    })
  } catch (error: any) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Basic validation
    if (!body.description || typeof body.amount !== 'number' || !body.date || !body.payment_method) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: description, amount, date, payment_method' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Map UI fields to DB schema
    const dbRecord = {
      kind_code: body.kind || 'operating',
      category_id: body.category_id || null,
      category_name: body.category_name || 'Uncategorized',
      description: body.description,
      amount: body.amount,
      expense_date: body.date,
      vendor: body.vendor || '',
      payment_method: body.payment_method,
      status: body.status || 'draft',
      notes: body.notes || '',
      expense_number: `EXP-${Date.now()}`,
      created_by: 'system',
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert(dbRecord)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(
      { success: true, data },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
