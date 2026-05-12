'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2Icon, ScaleIcon } from 'lucide-react'
import { Card, CardContent } from '@workspace/ui/components/card'

interface BSData {
  assets: { name: string; amount: number }[]
  total_assets: number
  liabilities: { name: string; amount: number }[]
  total_liabilities: number
  equity: { name: string; amount: number }[]
  total_equity: number
}

export default function BalanceSheetPage() {
  const [data, setData] = useState<BSData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/reports?type=balance-sheet')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json.data)
    } catch {
      toast.error('Failed to load balance sheet')
    } finally { setLoading(false) }
  }

  function fmt(v?: number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0)
  }

  function Section({ title, items, total }: { title: string; items: { name: string; amount: number }[]; total: number }) {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b">
                  <td className="px-6 py-2 text-sm">{item.name}</td>
                  <td className="px-6 py-2 text-sm text-right">{fmt(item.amount)}</td>
                </tr>
              ))}
              <tr className="bg-muted/50 font-semibold">
                <td className="px-6 py-3 text-sm">Total {title}</td>
                <td className="px-6 py-3 text-sm text-right">{fmt(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <ScaleIcon className="w-6 h-6 text-primary" /> Balance Sheet
          </h1>
          <p className="text-muted-foreground">Financial position: Assets, Liabilities, & Equity.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {loading ? <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" /> : data ? (
            <>
              <Section title="Assets" items={data.assets} total={data.total_assets} />
              <Section title="Liabilities" items={data.liabilities} total={data.total_liabilities} />
              <Section title="Equity" items={data.equity} total={data.total_equity} />
              <div className="mt-6 pt-4 border-t text-center">
                <p className="text-muted-foreground text-sm">Total Liabilities + Equity</p>
                <p className="text-2xl font-bold">{fmt(data.total_liabilities + data.total_equity)}</p>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">No data available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
