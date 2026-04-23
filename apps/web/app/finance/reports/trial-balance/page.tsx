'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Download, RefreshCw } from 'lucide-react'

interface TrialBalanceRow {
  accountCode: string
  accountName: string
  accountType: string
  debit: number
  credit: number
  balance: number
}

interface TrialBalanceReport {
  period: { startDate: string | null; endDate: string | null }
  entries: TrialBalanceRow[]
  totalDebit: number
  totalCredit: number
}

function TBContent() {
  const searchParams = useSearchParams()
  const fiscalPeriodId = searchParams.get('period') || undefined

  const [report, setReport] = useState<TrialBalanceReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReport()
  }, [fiscalPeriodId])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const url = fiscalPeriodId
        ? `/api/finance/reports?type=trial-balance&fiscalPeriodId=${fiscalPeriodId}`
        : '/api/finance/reports?type=trial-balance'
      const res = await fetch(url)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setReport(data)
    } catch (e: any) {
      toast.error(`Failed to load Trial Balance: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount || 0)

  const isBalanced = report ? Math.abs(report.totalDebit - report.totalCredit) < 0.01 : true

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-5xl mx-auto animate-pulse">
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
      <div className="max-w-6xl mx-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/finance/reports" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Trial Balance</h1>
              <p className="text-sm text-gray-400">{periodLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchReport} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm" disabled title="Export CSV (Phase 2)">
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!report && !loading && (
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-12 text-center">
            <p className="text-gray-400">No posted journal data available.</p>
            <p className="text-sm text-gray-500 mt-2">Post transactions to the journal to see the trial balance.</p>
          </div>
        )}

        {report && (
          <div className="space-y-6">
            {/* Status */}
            <div className={`rounded-lg border p-4 flex items-center justify-between ${isBalanced ? 'border-green-700 bg-green-900/20' : 'border-red-700 bg-red-900/20'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isBalanced ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className={`text-sm font-semibold ${isBalanced ? 'text-green-400' : 'text-red-400'}`}>
                  {isBalanced ? '✓ Balanced' : '✗ Imbalanced'}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                Difference: {formatCurrency(Math.abs(report.totalDebit - report.totalCredit))}
              </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/80 border-b border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-400">Account Code</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-400">Account Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-400">Type</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-400">Debit</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-400">Credit</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-400">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {report.entries.map((item, i) => (
                    <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30">
                      <td className="px-4 py-2 text-gray-400 font-mono">{item.accountCode}</td>
                      <td className="px-4 py-2">{item.accountName}</td>
                      <td className="px-4 py-2 text-gray-400">{item.accountType}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.debit)}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(item.credit)}</td>
                      <td className={`px-4 py-2 text-right font-medium ${item.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(item.balance)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-700/50 border-y border-gray-600">
                    <td colSpan={3} className="px-4 py-3 font-bold text-gray-200">TOTAL</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-200">{formatCurrency(report.totalDebit)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-200">{formatCurrency(report.totalCredit)}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-400">{formatCurrency(report.totalDebit - report.totalCredit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 text-xs text-gray-400">
              <p>Row count: {report.entries.length} </p>
              <p className="mt-1">Double-entry check: total debits must equal total credits.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TrialBalancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading Trial Balance...</div>
        </div>
      }
    >
      <TBContent />
    </Suspense>
  )
}
