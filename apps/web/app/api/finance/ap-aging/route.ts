import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('vendor_bills')
      .select(`
        *,
        vendor:vendor_id (vendor_name, vendor_code)
      `)
      .is('deleted_at', null)
      .neq('status', 'paid')
      .order('due_date', { ascending: true })
    
    if (error) throw new Error(error.message)
    
    const today = new Date()
    const rows = (data || []).map((bill: any) => {
      const due = new Date(bill.due_date || bill.bill_date)
      const age = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
      let bucket = 'current'
      if (age > 90) bucket = '90plus'
      else if (age > 60) bucket = '61-90'
      else if (age > 30) bucket = '31-60'
      else if (age > 0) bucket = '1-30'
      return {
        ...bill,
        age_days: age < 0 ? 0 : age,
        bucket,
        remaining: Number(bill.total_amount || 0) - Number(bill.amount_paid || 0),
      }
    })
    
    // Group by vendor
    const grouped: Record< string, any[]> = {}
    rows.forEach(r => {
      const key = r.vendor_id || 'unknown'
      ;(grouped[key] = grouped[key] || []).push(r)
    })
    
    const vendors = Object.entries(grouped).map(([vid, bills]) => {
      const v = bills[0]?.vendor || {}
      const buckets = {
        current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90plus': 0
      }
      bills.forEach((b: any) => { buckets[b.bucket as keyof typeof buckets] += b.remaining })
      return {
        vendor_id: vid,
        vendor_name: v?.vendor_name || 'Unknown',
        vendor_code: v?.vendor_code || '-',
        bills: bills.length,
        total_remaining: bills.reduce((s: number, i: any) => s + i.remaining, 0),
        ...buckets,
      }
    })
    
    return NextResponse.json({ vendors })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
