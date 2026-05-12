import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // Fallback: use contacts table as vendors since vendor_bills doesn't exist
    // Group contacts by name for AP aging report
    const { data: rows, error } = await supabase
      .from('contacts')
      .select('id, name, email, phone, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    // Since vendor_bills table doesn't exist, show contacts as vendor list
    // with zero balances (placeholder for AP aging)
    const vendorMap = new Map()
    for (const r of rows || []) {
      const vendorName = r.name || 'Unknown'
      if (!vendorMap.has(vendorName)) {
        vendorMap.set(vendorName, {
          vendor_name: vendorName,
          current: 0,
          days_1_30: 0,
          days_31_60: 0,
          days_61_90: 0,
          over_90: 0,
          total: 0,
          email: r.email,
          phone: r.phone,
        })
      }
    }

    return NextResponse.json({ data: Array.from(vendorMap.values()) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
