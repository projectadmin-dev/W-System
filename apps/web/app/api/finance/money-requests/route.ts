import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || undefined
    const type = searchParams.get('type') || undefined
    const dept = searchParams.get('department') || undefined
    const nik = searchParams.get('nik') || undefined

    let query = supabase
      .from('money_requests')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('approval_status', status)
    if (type) query = query.eq('request_type', type)
    if (dept) query = query.eq('department', dept)
    if (nik) query = query.eq('employee_nik', nik)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ data: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()

    // Generate request number: MR-YYYYMM-NNNN
    const now = new Date()
    const prefix = `MR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const { data: last } = await supabase
      .from('money_requests')
      .select('request_number')
      .ilike('request_number', `${prefix}-%`)
      .order('request_number', { ascending: false })
      .limit(1)
      .single()

    const seq = last
      ? parseInt(last.request_number.split('-')[2]) + 1
      : 1
    const request_number = `${prefix}-${String(seq).padStart(4, '0')}`

    const { data, error } = await supabase
      .from('money_requests')
      .insert({
        ...body,
        request_number,
        status: 'submitted',
        approval_status: 'pending',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
