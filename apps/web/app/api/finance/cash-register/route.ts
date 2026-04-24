import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined
    const type = searchParams.get('type') || undefined
    const account = searchParams.get('account') || undefined

    let query = supabase
      .from('cash_register_entries')
      .select('*')
      .is('deleted_at', null)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (from) query = query.gte('entry_date', from)
    if (to) query = query.lte('entry_date', to)
    if (type) query = query.eq('entry_type', type)
    if (account) query = query.eq('account_name', account)

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

    const { data, error } = await supabase
      .from('cash_register_entries')
      .insert(body)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
