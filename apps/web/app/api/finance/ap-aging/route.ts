import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    const today = new Date().toISOString().split('T')[0]

    // Try RPC first
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_ap_aging')
    if (!rpcErr && rpcData) {
      return NextResponse.json({ data: rpcData })
    }

    // Fallback: manual calculation
    const { data: rows, error } = await supabase
      .from('vendor_bills')
      .select(`
        total_amount, amount_paid, amount_due, due_date, status,
        vendor:vendors(vendor_name)
      `)
      .is('deleted_at', null)
      .in('status', ['pending','approved','posted','partial'])

    if (error) throw error

    // Group by vendor
    const vendorMap = new Map()
    for (const r of rows || []) {
      const vendorName = r.vendor?.vendor_name || 'Unknown'
      const bal = Math.max(0, Number(r.amount_due) || (Number(r.total_amount) - Number(r.amount_paid)))
      if (bal <= 0) continue

      const due = r.due_date ? new Date(r.due_date) : new Date()
      const diff = Math.floor((new Date(today).getTime() - due.getTime()) / 86400000)

      if (!vendorMap.has(vendorName)) {
        vendorMap.set(vendorName, { vendor_name: vendorName, current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, over_90: 0, total: 0 })
      }
      const v = vendorMap.get(vendorName)
      v.total += bal
      if (diff <= 0) v.current += bal
      else if (diff <= 30) v.days_1_30 += bal
      else if (diff <= 60) v.days_31_60 += bal
      else if (diff <= 90) v.days_61_90 += bal
      else v.over_90 += bal
    }

    return NextResponse.json({ data: Array.from(vendorMap.values()) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
