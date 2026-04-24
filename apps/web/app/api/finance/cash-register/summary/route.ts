import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: totalIn, error: e1 } = await supabase
      .from('cash_register_entries')
      .select('amount')
      .eq('entry_type', 'in')
      .is('deleted_at', null)

    const { data: totalOut, error: e2 } = await supabase
      .from('cash_register_entries')
      .select('amount')
      .eq('entry_type', 'out')
      .is('deleted_at', null)

    const { data: latest, error: e3 } = await supabase
      .from('cash_register_entries')
      .select('running_balance')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (e1) throw e1
    if (e2) throw e2

    const total_in = totalIn?.reduce((sum, r) => sum + Number(r.amount), 0) || 0
    const total_out = totalOut?.reduce((sum, r) => sum + Number(r.amount), 0) || 0

    return NextResponse.json({
      data: {
        total_in,
        total_out,
        running_balance: latest?.running_balance || 0,
        net: total_in - total_out,
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
