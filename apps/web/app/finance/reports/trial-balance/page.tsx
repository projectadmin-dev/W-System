'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2Icon, TableIcon } from 'lucide-react'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'

interface TBRow {
  account_id: string
  account_code: string
  account_name: string
  debit_balance: number
  credit_balance: number
}

export default function TrialBalancePage() {
  const [rows, setRows] = useState<TBRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/reports?type=trial_balance')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setRows(json.data || [])
    } catch {
      toast.error('Failed to load trial balance')
    } finally { setLoading(false) }
  }

  function fmt(v?: number) {
    return new Intl.NumberFormat('id-ID', { style: 'decimal', minimumFractionDigits: 2 }).format(v || 0)
  }

  const totalDebit = rows.reduce((s, r) => s + r.debit_balance, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit_balance, 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <TableIcon className="w-6 h-6 text-purple-600" /> Trial Balance
          </h1>
          <p className="text-muted-foreground">Account balances verification — debit must equal credit.</p>
        </div>
        {balanced ? <Badge variant="default" className="bg-emerald-100 text-emerald-700">Balanced</Badge> : <Badge variant="destructive">Unbalanced</Badge>}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Account</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground text-right">Debit</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-12"><Loader2Icon className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /></td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">No data.</td></tr>
                ) : (
                  <>
                    {rows.map(r => (
                      <tr key={r.account_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3 text-sm font-mono">{r.account_code}</td>
                        <td className="px-6 py-3 text-sm">{r.account_name}</td>
                        <td className="px-6 py-3 text-sm text-right">{r.debit_balance > 0 ? fmt(r.debit_balance) : '—'}</td>
                        <td className="px-6 py-3 text-sm text-right">{r.credit_balance > 0 ? fmt(r.credit_balance) : '—'}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/50 font-semibold">
                      <td colSpan={2} className="px-6 py-3 text-sm">Total</td>
                      <td className="px-6 py-3 text-sm text-right">{fmt(totalDebit)}</td>
                      <td className="px-6 py-3 text-sm text-right">{fmt(totalCredit)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
