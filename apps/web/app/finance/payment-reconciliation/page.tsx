'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2Icon, ArrowLeftRightIcon, CheckIcon, XIcon, RefreshCcwIcon,
  ArrowDownLeftIcon, ArrowUpRightIcon, AlertTriangleIcon, LandmarkIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'

function fmt(v?: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0)
}

interface Summary {
  unreconciled_payments: number
  unreconciled_receipts: number
  total_unreconciled: number
  total_unapplied_bills: number
  total_unapplied_invoices: number
  total_unapplied: number
}

interface Payment {
  id: string
  payment_number: string
  payment_date: string
  amount: number
  payment_method: string
  reference_number?: string
  notes?: string
  client?: { client_name: string } | null
  invoice?: { invoice_number: string; total_amount: number } | null
}

interface Receipt {
  id: string
  receipt_number: string
  receipt_date: string
  amount: number
  customer?: { customer_name: string } | null
  reference_number?: string
}

interface Bill {
  id: string
  bill_number: string
  bill_date: string
  due_date: string
  total_amount: number
  amount_paid?: number
  vendor?: { vendor_name: string; vendor_code: string } | null
}

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  total_amount: number
  amount_paid?: number
  customer?: { customer_name: string; customer_code: string } | null
}

export default function PaymentReconciliationPage() {
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [reconciling, setReconciling] = useState<string | null>(null)
  const [selectedTargets, setSelectedTargets] = useState<Record<string, string>>({})
  const [showTargets, setShowTargets] = useState<Record<string, boolean>>({})

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      // Summary
      const sumRes = await fetch('/api/finance/payment-reconciliation?type=summary')
      if (sumRes.ok) setSummary(await sumRes.json())
      else throw new Error('Summary fetch failed')

      // Payments (outgoing)
      const payRes = await fetch('/api/finance/payment-reconciliation?type=payments')
      if (payRes.ok) setPayments((await payRes.json()).data || [])

      // Receipts (incoming)
      const recRes = await fetch('/api/finance/payment-reconciliation?type=receipts')
      if (recRes.ok) setReceipts((await recRes.json()).data || [])

      // Bills (AP)
      const billRes = await fetch('/api/finance/payment-reconciliation?type=bills')
      if (billRes.ok) setBills((await billRes.json()).data || [])

      // Invoices (AR)
      const invRes = await fetch('/api/finance/payment-reconciliation?type=invoices')
      if (invRes.ok) setInvoices((await invRes.json()).data || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load data')
    } finally { setLoading(false) }
  }

  async function reconcile(type: 'payment' | 'receipt', id: string) {
    const targetId = selectedTargets[id]
    if (!targetId) {
      toast.error('Please select a target (invoice/bill) to reconcile')
      return
    }
    
    setReconciling(id)
    try {
      const res = await fetch('/api/finance/payment-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          id,
          allocations: [{ target_id: targetId, amount: 0 }], // amount 0 = auto
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`${type === 'payment' ? 'Payment' : 'Receipt'} reconciled successfully`)
      loadAll()
      setSelectedTargets(prev => {
        const n = { ...prev }
        delete n[id]
        return n
      })
      setShowTargets(prev => {
        const n = { ...prev }
        delete n[id]
        return n
      })
    } catch (err: any) {
      toast.error(err.message)
    } finally { setReconciling(null) }
  }

  async function unreconcile(type: 'payment' | 'receipt', id: string) {
    if (!confirm(`Unreconcile this ${type}?`)) return
    try {
      const res = await fetch('/api/finance/payment-reconciliation', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Unreconciled successfully')
      loadAll()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  function toggleTargetSelect(id: string) {
    setShowTargets(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function selectTarget(paymentId: string, targetId: string) {
    setSelectedTargets(prev => ({ ...prev, [paymentId]: targetId }))
  }

  // ── Incoming (AR) = Receipts from customers → match to invoices
  // ── Outgoing (AP) = Payments to vendors → match to bills

  const incomingItems = receipts.map(r => ({
    id: r.id,
    type: 'receipt' as const,
    number: r.receipt_number,
    date: r.receipt_date,
    party: r.customer?.customer_name || 'Unknown',
    amount: r.amount,
    reference: r.reference_number,
  }))

  const outgoingItems = payments.map(p => ({
    id: p.id,
    type: 'payment' as const,
    number: p.payment_number,
    date: p.payment_date,
    party: p.client?.client_name || 'Unknown',
    amount: p.amount,
    reference: p.reference_number,
  }))

  const openItems = tab === 'incoming'
    ? invoices.map(i => ({ id: i.id, number: i.invoice_number, party: i.customer?.customer_name || 'Unknown', amount: i.total_amount, balance: i.total_amount - (i.amount_paid || 0) }))
    : bills.map(b => ({ id: b.id, number: b.bill_number, party: b.vendor?.vendor_name || 'Unknown', amount: b.total_amount, balance: b.total_amount - (b.amount_paid || 0) }))

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <ArrowLeftRightIcon className="w-6 h-6 text-primary" /> Payment Reconciliation
          </h1>
          <p className="text-muted-foreground">Match incoming receipts with invoices and outgoing payments with vendor bills.</p>
        </div>
        <Button variant="outline" onClick={loadAll} disabled={loading}>
          {loading ? <Loader2Icon className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcwIcon className="h-4 w-4 mr-2" />}Reload
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Incoming (AR)</CardTitle>
            <ArrowDownLeftIcon className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <LoadingPulse /> : summary?.unreconciled_receipts || 0}
            </div>
            <p className="text-xs text-muted-foreground">Unreconciled receipts from customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outgoing (AP)</CardTitle>
            <ArrowUpRightIcon className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <LoadingPulse /> : summary?.unreconciled_payments || 0}
            </div>
            <p className="text-xs text-muted-foreground">Unreconciled payments to vendors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Invoices</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <LoadingPulse /> : fmt(summary?.total_unapplied_invoices || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Customer invoice balance due</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Bills</CardTitle>
            <LandmarkIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <LoadingPulse /> : fmt(summary?.total_unapplied_bills || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Vendor bill balance due</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab('incoming')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'incoming'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Incoming — Receipts from Customers
          {summary && summary.unreconciled_receipts > 0 && (
            <Badge variant="secondary" className="ml-2">{summary.unreconciled_receipts}</Badge>
          )}
        </button>
        <button
          onClick={() => setTab('outgoing')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'outgoing'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Outgoing — Payments to Vendors
          {summary && summary.unreconciled_payments > 0 && (
            <Badge variant="secondary" className="ml-2">{summary.unreconciled_payments}</Badge>
          )}
        </button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>{tab === 'incoming' ? 'Unreconciled Receipts' : 'Unreconciled Payments'}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">{tab === 'incoming' ? 'Receipt #' : 'Payment #'}</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">{tab === 'incoming' ? 'Customer' : 'Vendor / Client'}</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground text-right">Amount</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Reference</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12"><Loader2Icon className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /></td></tr>
                ) : tab === 'incoming' ? (
                  receipts.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">All receipts reconciled. ✓</td></tr>
                  ) : (
                    receipts.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{r.receipt_number}</td>
                        <td className="px-4 py-3 text-sm">{r.receipt_date}</td>
                        <td className="px-4 py-3 text-sm">{r.customer?.customer_name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono">{fmt(r.amount)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{r.reference_number || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {!showTargets[r.id] ? (
                              <Button size="sm" variant="outline" onClick={() => toggleTargetSelect(r.id)}>
                                <CheckIcon className="h-3 w-3 mr-1" /> Reconcile
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select
                                  className="text-sm border rounded px-2 py-1 bg-background min-w-[200px]"
                                  value={selectedTargets[r.id] || ''}
                                  onChange={(e) => selectTarget(r.id, e.target.value)}
                                >
                                  <option value="">Select Invoice…</option>
                                  {openItems.map(item => (
                                    <option key={item.id} value={item.id}>
                                      {item.number} — {item.party} ({fmt(item.balance)})
                                    </option>
                                  ))}
                                </select>
                                <Button size="sm" onClick={() => reconcile('receipt', r.id)} disabled={reconciling === r.id}>
                                  {reconciling === r.id ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => toggleTargetSelect(r.id)}>
                                  <XIcon className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  payments.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">All payments reconciled. ✓</td></tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{p.payment_number}</td>
                        <td className="px-4 py-3 text-sm">{p.payment_date}</td>
                        <td className="px-4 py-3 text-sm">{p.client?.client_name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono">{fmt(p.amount)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{p.reference_number || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {!showTargets[p.id] ? (
                              <Button size="sm" variant="outline" onClick={() => toggleTargetSelect(p.id)}>
                                <CheckIcon className="h-3 w-3 mr-1" /> Reconcile
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select
                                  className="text-sm border rounded px-2 py-1 bg-background min-w-[200px]"
                                  value={selectedTargets[p.id] || ''}
                                  onChange={(e) => selectTarget(p.id, e.target.value)}
                                >
                                  <option value="">Select Bill…</option>
                                  {openItems.map(item => (
                                    <option key={item.id} value={item.id}>
                                      {item.number} — {item.party} ({fmt(item.balance)})
                                    </option>
                                  ))}
                                </select>
                                <Button size="sm" onClick={() => reconcile('payment', p.id)} disabled={reconciling === p.id}>
                                  {reconciling === p.id ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => toggleTargetSelect(p.id)}>
                                  <XIcon className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bottom: Open Items (for context) */}
      <Card>
        <CardHeader>
          <CardTitle>{tab === 'incoming' ? 'Open Invoices (Available for Match)' : 'Open Vendor Bills (Available for Match)'}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">{tab === 'incoming' ? 'Invoice #' : 'Bill #'}</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Party</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground text-right">Total</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-8"><Loader2Icon className="w-5 h-5 mx-auto animate-spin text-muted-foreground" /></td></tr>
                ) : openItems.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No open items.</td></tr>
                ) : (
                  openItems.slice(0, 20).map(item => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-2 text-sm font-medium">{item.number}</td>
                      <td className="px-4 py-2 text-sm">{item.party}</td>
                      <td className="px-4 py-2 text-sm text-right font-mono">{fmt(item.amount)}</td>
                      <td className="px-4 py-2 text-sm text-right font-mono">{fmt(item.balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingPulse() {
  return <div className="h-8 bg-muted rounded animate-pulse" />
}
