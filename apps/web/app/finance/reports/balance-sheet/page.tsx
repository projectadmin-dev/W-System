'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Download, RefreshCw } from 'lucide-react'

interface BSGroup {
  total: number
  details: { id: string; code: string; name: string; type: string; debit: number; credit: number; net: number }[]
}

interface BSReport {
  period: { startDate: string | null; endDate: string | null }
  assets: { current: BSGroup; fixed: BSGroup; nonCurrent: BSGroup; total: number }
  liabilities: { current: BSGroup; nonCurrent: BSGroup; total: number }
  equity: BSGroup
  totalLiabilitiesAndEquity: number
  balancing: number
}

function BSContent() {
  const searchParams = useSearchParams()
  const fiscalPeriodId = searchParams.get('period') || undefined

  const [report, setReport] = useState<BSReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(true)

  useEffect(() => {
    fetchReport()
  }, [fiscalPeriodId])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const url = fiscalPeriodId
        ? `/api/finance/reports?type=balance-sheet&fiscalPeriodId=${fiscalPeriodId}`
        : '/api/finance/reports?type=balance-sheet'
      const res = await fetch(url)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setReport(data)
    } catch (e: any) {
      toast.error(`Failed to load Balance Sheet: ${e.message}`)
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

  const Section = ({ title, group }: { title: string; group: BSGroup }) => (
    <>
      <tr className="bg-gray-800/60">
        <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 border-y border-gray-700">
          {title}
        </td>
      </tr>
      {showDetails && group.details.map((item, i) => (
        <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30">
          <td className="px-4 py-2 text-sm text-gray-400">{item.code}</td>
          <td className="px-4 py-2 text-sm">{item.name}</td>
          <td className="px-4 py-2 text-sm text-right">{formatCurrency(item.net)}</td>
        </tr>
      ))}
      <tr className="border-y border-gray-700 bg-gray-800/40">
        <td colSpan={2} className="px-4 py-2 text-sm font-semibold text-gray-300">Total {title}</td>
        <td className="px-4 py-2 text-sm font-semibold text-right text-gray-300">{formatCurrency(group.total)}</td>
      </tr>
    </>
  )

  const TotalRow = ({ label, amount, colorClass }: { label: string; amount: number; colorClass?: string }) => (
    <tr className="border-y border-gray-600 bg-gray-700/30">
      <td colSpan={2} className="px-4 py-3 text-sm font-bold text-gray-200">{label}</td>
      <td className={`px-4 py-3 text-sm font-bold text-right ${colorClass || 'text-gray-200'}`}>
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
            <Link href="/finance/reports" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Balance Sheet</h1>
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
            <button onClick={fetchReport} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm" disabled title="Download PDF (Phase 2)">
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!report && !loading && (
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-12 text-center">
            <p className="text-gray-400">No posted journal data available.</p>
            <p className="text-sm text-gray-500 mt-2">Post transactions to the journal to see the balance sheet.</p>
          </div>
        )}

        {report && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden">
              <table className="w-full">
                <tbody>
                  <Section title="Current Assets" group={report.assets.current} />
                  <Section title="Fixed Assets" group={report.assets.fixed} />
                  <Section title="Non-Current Assets" group={report.assets.nonCurrent} />
                  <TotalRow label="TOTAL ASSETS" amount={report.assets.total} colorClass="text-green-400" />

                  <Section title="Current Liabilities" group={report.liabilities.current} />
                  <Section title="Non-Current Liabilities" group={report.liabilities.nonCurrent} />
                  <TotalRow label="TOTAL LIABILITIES" amount={report.liabilities.total} colorClass="text-red-400" />

                  <Section title="Equity" group={report.equity} />
                  <TotalRow label="TOTAL EQUITY" amount={report.equity.total} colorClass="text-blue-400" />

                  <TotalRow label="TOTAL LIABILITIES & EQUITY" amount={report.totalLiabilitiesAndEquity} colorClass="text-gray-200" />

                  <tr className={`${Math.abs(report.balancing) > 0.01 ? 'bg-red-900/20' : 'bg-green-900/20'} border-y border-gray-700`}>
                    <td colSpan={2} className="px-4 py-3 text-sm font-semibold">Balance Check (Assets — L&E)</td>
                    <td className={`px-4 py-3 text-sm font-bold text-right ${Math.abs(report.balancing) > 0.01 ? 'text-red-400' : 'text-green-400'}`}>
                      {formatCurrency(report.balancing)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 text-xs text-gray-400">
              <p>Based on posted journal entries only. Unposted / draft entries excluded.</p>
              <p className="mt-1">Accounting equation: Assets = Liabilities + Equity. Balance check should be zero (±0.01 for rounding).</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BalanceSheetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading Balance Sheet...</div>
        </div>
      }
    >
      <BSContent />
    </Suspense>
  )
}
