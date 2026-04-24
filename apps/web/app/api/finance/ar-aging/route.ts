import { NextRequest, NextResponse } from 'next/server'
    import { createClient } from '@supabase/supabase-js'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    export async function GET(request: NextRequest) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const today = new Date().toISOString().split('T')[0]

        // Aggregate real aging buckets from customer_invoices
        const { data, error } = await supabase.rpc('get_ar_aging')
        if (error || !data) {
          // Fallback if RPC missing
          const { data: rows, error: err2 } = await supabase
            .from('customer_invoices')
            .select('total_amount, paid_amount, balance_due, due_date, status')
            .is('deleted_at', null)
            .in('status', ['sent','overdue','partial','draft'])
          if (err2) throw err2
          const buckets = { current:0, days_1_30:0, days_31_60:0, days_61_90:0, over_90:0, total:0 }
          for (const r of rows || []) {
            const bal = Number(r.balance_due) || (Number(r.total_amount)-Number(r.paid_amount))
            if (bal <= 0) continue
            const due = r.due_date ? new Date(r.due_date) : new Date()
            const diff = Math.floor((new Date(today).getTime() - due.getTime()) / 86400000)
            buckets.total += bal
            if (diff <= 0) buckets.current += bal
            else if (diff <= 30) buckets.days_1_30 += bal
            else if (diff <= 60) buckets.days_31_60 += bal
            else if (diff <= 90) buckets.days_61_90 += bal
            else buckets.over_90 += bal
          }
          return NextResponse.json({ data: buckets })
        }
        return NextResponse.json({ data })
      } catch (err) {
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
      }
    }