import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('customer_invoices')
      .select(`
        *,
        customer:customer_id (customer_name, customer_code)
      `)
      .is('deleted_at', null)
      .neq('status', 'paid')
      .order('due_date', { ascending: true })
    
    if (error) throw new Error(error.message)
    
    const today = new Date()
    const rows = (data || []).map((inv: any) => {
      const due = new Date(inv.due_date || inv.invoice_date)
      const age = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
      let bucket = 'current'
      if (age > 90) bucket = '90plus'
      else if (age > 60) bucket = '61-90'
      else if (age > 30) bucket = '31-60'
      else if (age > 0) bucket = '1-30'
      return {
        ...inv,
        age_days: age < 0 ? 0 : age,
        bucket,
        remaining: Number(inv.total_amount || 0) - Number(inv.amount_paid || 0),
      }
    })
    
    // Group by customer
    const grouped: Record< string, any[]> = {}
    rows.forEach(r => {
      const key = r.customer_id || 'unknown'
      ;(grouped[key] = grouped[key] || []).push(r)
    })
    
    const customers = Object.entries(grouped).map(([cid, invoices]) => {
      const c = invoices[0]?.customer || {}
      const buckets = {
        current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90plus': 0
      }
      invoices.forEach((inv: any) => { buckets[inv.bucket as keyof typeof buckets] += inv.remaining })
      return {
        customer_id: cid,
        customer_name: c?.customer_name || 'Unknown',
        customer_code: c?.customer_code || '-',
        invoices: invoices.length,
        total_remaining: invoices.reduce((s: number, i: any) => s + i.remaining, 0),
        ...buckets,
      }
    })
    
    return NextResponse.json({ customers })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
