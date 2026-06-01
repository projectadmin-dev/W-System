import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const today = new Date().toISOString().split('T')[0]

    // Fetch invoices with client details
    const { data: rows, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        issue_date,
        due_date,
        total_amount,
        amount_paid,
        amount_due,
        status,
        client_id,
        clients(id, name)
      `)
      .is('deleted_at', null)
      .in('status', ['sent', 'overdue', 'partial', 'draft', 'partially_paid', 'viewed'])
      .order('due_date', { ascending: false })

    if (error) throw error

    // Group by client and calculate aging buckets
    const clientMap = new Map<string, {
      client_name: string;
      current: number;
      days_1_30: number;
      days_31_60: number;
      days_61_90: number;
      days_91_180: number;
      over_180: number;
      total: number;
      invoices: any[];
    }>()

    for (const r of rows || []) {
      const bal = Number(r.amount_due) || (Number(r.total_amount) - Number(r.amount_paid || 0))
      if (bal <= 0) continue

      const clientId = r.client_id
      const clientName = r.clients?.name || 'Unknown'

      if (!clientMap.has(clientId)) {
        clientMap.set(clientId, {
          client_name: clientName,
          current: 0,
          days_1_30: 0,
          days_31_60: 0,
          days_61_90: 0,
          days_91_180: 0,
          over_180: 0,
          total: 0,
          invoices: [],
        })
      }

      const due = r.due_date ? new Date(r.due_date) : new Date()
      const diff = Math.floor((new Date(today).getTime() - due.getTime()) / 86400000)

      const clientBuckets = clientMap.get(clientId)!
      clientBuckets.total += bal

      if (diff <= 0) clientBuckets.current += bal
      else if (diff <= 30) clientBuckets.days_1_30 += bal
      else if (diff <= 60) clientBuckets.days_31_60 += bal
      else if (diff <= 90) clientBuckets.days_61_90 += bal
      else if (diff <= 180) clientBuckets.days_91_180 += bal
      else clientBuckets.over_180 += bal

      clientBuckets.invoices.push({
        invoice_number: r.invoice_number,
        issue_date: r.issue_date,
        due_date: r.due_date,
        amount: bal,
        days_overdue: diff > 0 ? diff : 0,
        status: r.status,
        client_id: clientId,
      })
    }

    // Calculate grand totals
    let grandTotal = {
      current: 0,
      days_1_30: 0,
      days_31_60: 0,
      days_61_90: 0,
      days_91_180: 0,
      over_180: 0,
      total: 0,
      clients: Array.from(clientMap.entries()).map(([id, data]) => ({
        client_id: id,
        ...data,
      })),
    }

    for (const client of grandTotal.clients) {
      grandTotal.current += client.current
      grandTotal.days_1_30 += client.days_1_30
      grandTotal.days_31_60 += client.days_31_60
      grandTotal.days_61_90 += client.days_61_90
      grandTotal.days_91_180 += client.days_91_180
      grandTotal.over_180 += client.over_180
      grandTotal.total += client.total
    }

    return NextResponse.json({ data: grandTotal })
  } catch (err: any) {
    console.error('AR Aging API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
