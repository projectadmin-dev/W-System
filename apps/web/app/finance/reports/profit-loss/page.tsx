'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2Icon, TrendingUpIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'

interface PLData {
  revenue: number
  cogs: number
  gross_profit: number
  operating_expenses: number
  ebitda: number
  depreciation: number
  ebit: number
  interest: number
  tax: number
  net_income: number
}

export default function ProfitLossPage() {
  const [data, setData] = useState<PLData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/reports?type=profit-loss')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json.data)
    } catch {
      toast.error('Failed to load P&L report')
    } finally { setLoading(false) }
  }

  function fmt(v?: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0)
  }

  const rows = [
    { label: 'Revenue', value: data?.revenue, pos: true },
    { label: 'Cost of Goods Sold', value: data?.cogs, neg: true },
    { label: 'Gross Profit', value: data?.gross_profit, highlight: true },
    { label: 'Operating Expenses', value: data?.operating_expenses, neg: true },
    { label: 'EBITDA', value: data?.ebitda, highlight: true },
    { label: 'Depreciation', value: data?.depreciation, neg: true },
    { label: 'EBIT', value: data?.ebit, highlight: true },
    { label: 'Interest Expense', value: data?.interest, neg: true },
    { label: 'Tax', value: data?.tax, neg: true },
    { label: 'NET INCOME', value: data?.net_income, total: true },
  ]

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <TrendingUpIcon className="w-6 h-6 text-emerald-600" /> Profit & Loss
          </h1>
          <p className="text-muted-foreground">Income statement for the current period.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            {loading ? <Loader2Icon className="h-4 w-4 mr-2 animate-spin" /> : 'Reload'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Line Item</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground text-right">Amount (IDR)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={2} className="text-center py-12"><Loader2Icon className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /></td></tr>
                ) : data ? (
                  rows.map((row, i) => (
                    <tr key={i} className={`border-b last:border-0 ${row.highlight ? 'bg-muted/30 font-semibold' : row.total ? 'bg-primary/5 font-bold text-lg' : ''}`}>
                      <td className={`px-6 py-3 text-sm ${row.total ? '' : 'pl-' + (row.label.startsWith('  ') ? '10' : '6')}`}>{row.label}</td>
                      <td className={`px-6 py-3 text-sm text-right ${row.pos ? 'text-emerald-600' : row.neg ? 'text-destructive' : ''}`}>{fmt(row.value)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={2} className="text-center py-12 text-muted-foreground">No data available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
