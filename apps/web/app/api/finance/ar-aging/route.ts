import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // Use invoices table for AR aging (customer_invoices doesn't exist)
    const { data: rows, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, issue_date, due_date, total_amount, amount_paid, amount_due, status, client_id, created_at')
      .is('deleted_at', null)
      .in('status', ['sent', 'overdue', 'partial', 'draft'])
      .order('due_date', { ascending: false })

    if (error) throw error

    // Calculate aging buckets
    const buckets = {
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_91_180: 0,
      over_180: 0,
      total: 0,
      invoices: [] as any[],
    }

    for (const r of rows || []) {
      const bal = Number(r.amount_due) || (Number(r.total_amount) - Number(r.amount_paid || 0))
      if (bal <= 0) continue

      const due = r.due_date ? new Date(r.due_date) : new Date()
      const diff = Math.floor((new Date(today).getTime() - due.getTime()) / 86400000)

      buckets.total += bal
      if (diff <= 0) buckets.current += bal
      else if (diff <= 30) buckets.days_1_30 += bal
      else if (diff <= 60) buckets.days_31_60 += bal
      else if (diff <= 90) buckets.days_61_90 += bal
      else if (diff <= 180) buckets.days_91_180 += bal
      else buckets.over_180 += bal

      buckets.invoices.push({
        invoice_number: r.invoice_number,
        due_date: r.due_date,
        amount: bal,
        days_overdue: diff > 0 ? diff : 0,
        status: r.status,
        client_id: r.client_id,
      })
    }

    return NextResponse.json({ data: buckets })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
