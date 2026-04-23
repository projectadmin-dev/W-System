'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Download, RefreshCw } from 'lucide-react'

interface PnLDetail {
  id: string
  code: string
  name: string
  type: string
  debit: number
  credit: number
  net: number
}

interface PnLReport {
  period: { startDate: string | null; endDate: string | null }
  revenue: { total: number; details: PnLDetail[] }
  cogs: { total: number; details: PnLDetail[] }
  grossProfit: number
  grossProfitMargin: number
  operatingExpenses: { total: number; details: PnLDetail[] }
  operatingProfit: number
  operatingProfitMargin: number
  otherExpenses: { total: number; details: PnLDetail[] }
  netProfitBeforeTax: number
  taxExpense: { total: number; details: PnLDetail[] }
  netProfit: number
  netProfitMargin: number
}

function PnLContent() {
  const searchParams = useSearchParams()
  const fiscalPeriodId = searchParams.get('period') || undefined

  const [report, setReport] = useState<PnLReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(true)

  useEffect(() => {
    fetchReport()
  }, [fiscalPeriodId])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const url = fiscalPeriodId
        ? `/api/finance/reports?type=profit-loss&fiscalPeriodId=${fiscalPeriodId}`
        : '/api/finance/reports?type=profit-loss'
      const res = await fetch(url)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setReport(data)
    } catch (e: any) {
      toast.error(`Failed to load P&L: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0)

  const formatPercent = (val: number) => `${val.toFixed(2)}%`

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="bg-gray-800/60 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 border-y border-gray-700">
      {title}
    </div>
  )

  const DetailRow = ({ item }: { item: PnLDetail }) => (
    <tr className="border-b border-gray-800 hover:bg-gray-800/30">
      <td className="px-4 py-2 text-sm text-gray-400">{item.code}</td>
      <td className="px-4 py-2 text-sm">{item.name}</td>
      <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.net)}</td>
    </tr>
  )

  const TotalRow = ({ label, amount, highlight = false }: { label: string; amount: number; highlight?: boolean }) => (
    <tr className={`border-y ${highlight ? 'border-gray-600 bg-gray-800/40' : 'border-gray-800'}`}>
      <td colSpan={2} className={`px-4 py-3 text-sm font-semibold ${highlight ? 'text-white' : 'text-gray-300'}`}>
        {label}
      </td>
      <td className={`px-4 py-3 text-sm text-right font-semibold ${highlight ? 'text-green-400' : 'text-gray-300'}`}>
        {formatCurrency(amount)}
      </td>
    </tr>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-48 mb-4" />
          <div className="h-64 bg-gray-800 rounded-lg" />
        </div>
      </div>
    )
  }

  const periodLabel = report?.period?.startDate
    ? `${new Date(report.period.startDate).toLocaleDateString('id-ID')} — ${new Date(report.period.endDate || '').toLocaleDateString('id-ID')}`
    : 'All posted transactions'

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/finance/reports"
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
              <p className="text-sm text-gray-400">{periodLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetails((s) => !s)}
              className="px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-sm"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
            <button
              onClick={fetchReport}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm"
              disabled
              title="Download PDF (Phase 2)"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!report && !loading && (
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-12 text-center">
            <p className="text-gray-400">No posted journal data available.</p>
            <p className="text-sm text-gray-500 mt-2">
              Post transactions to the journal to see reports.
            </p>
          </div>
        )}

        {report && (
          <div className="space-y-6">
            {/* Report Table */}
            <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/80">
                <h3 className="font-semibold text-gray-200"></h3>
              </div>

              <table className="w-full">
                <tbody>
                  {/* Revenue */}
                  <SectionHeader title="Revenue" />
                  {showDetails && report.revenue.details.map((item, i) => <DetailRow key={`rev-${i}`} item={item} />)}
                  <TotalRow label="Total Revenue" amount={report.revenue.total} />

                  {/* COGS */}
                  <SectionHeader title="Cost of Goods Sold" />
                  {showDetails && report.cogs.details.map((item, i) => <DetailRow key={`cogs-${i}`} item={item} />)}
                  <TotalRow label="Total COGS" amount={report.cogs.total} />

                  {/* Gross Profit */}
                  <TotalRow
                    label={`Gross Profit (margin ${formatPercent(report.grossProfitMargin)})`}
                    amount={report.grossProfit}
                    highlight
                  />

                  {/* Operating Expenses */}
                  <SectionHeader title="Operating Expenses" />
                  {showDetails && report.operatingExpenses.details.map((item, i) => <DetailRow key={`opex-${i}`} item={item} />)}
                  <TotalRow label="Total Operating Expenses" amount={report.operatingExpenses.total} />

                  {/* Operating Profit */}
                  <TotalRow
                    label={`Operating Profit (margin ${formatPercent(report.operatingProfitMargin)})`}
                    amount={report.operatingProfit}
                    highlight
                  />

                  {/* Other Expenses */}
                  <SectionHeader title="Other Expenses" />
                  {showDetails && report.otherExpenses.details.map((item, i) => <DetailRow key={`oth-${i}`} item={item} />)}
                  <TotalRow label="Total Other Expenses" amount={report.otherExpenses.total} />

                  {/* Net Profit Before Tax */}
                  <TotalRow
                    label="Net Profit Before Tax"
                    amount={report.netProfitBeforeTax}
                    highlight
                  />

                  {/* Tax */}
                  <SectionHeader title="Tax Expense" />
                  {showDetails && report.taxExpense.details.map((item, i) => <DetailRow key={`tax-${i}`} item={item} />)}
                  <TotalRow label="Total Tax Expense" amount={report.taxExpense.total} />

                  {/* NET PROFIT */}
                  <tr className="bg-gray-700/50 border-y border-gray-600">
                    <td colSpan={2} className="px-4 py-4 text-base font-bold">
                      NET PROFIT / (LOSS)
                    </td>
                    <td className="px-4 py-4 text-base font-bold text-right">
                      <span className={report.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {formatCurrency(report.netProfit)}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-700">
                    <td colSpan={2} className="px-4 py-2 text-sm text-gray-400">
                      Net Profit Margin
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-400">
                      {formatPercent(report.netProfitMargin)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* PSAK Compliance Footer */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 text-xs text-gray-400">
              <p>
                Based on posted journal entries only. Unposted / draft entries excluded.
              </p>
              <p className="mt-1">
                Double-entry verification: total debits = total credits at posting time.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProfitLossPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading P&L report...</div>
        </div>
      }
    >
      <PnLContent />
    </Suspense>
  )
}
