'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  TrendingUpIcon,
  TrendingDownIcon,
  AlertTriangleIcon,
  DollarSignIcon,
  FileTextIcon,
} from 'lucide-react'

interface ARStats {
  total: number
  current: number
  days_1_30: number
  days_31_60: number
  days_61_90: number
  over_90: number
  overdue_total: number
}

interface InvoiceSummary {
  total_count: number
  total_amount: number
  paid_total: number
  overdue_count: number
  draft_count: number
  sent_count: number
}

export default function FinanceDashboard() {
  const [stats, setStats] = useState<ARStats | null>(null)
  const [summary, setSummary] = useState<InvoiceSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch AR Aging
      const arResponse = await fetch('/api/finance/ar-aging')
      let arData: ARStats | null = null
      if (arResponse.ok) {
        const { data } = await arResponse.json()
        arData = data
        setStats(data)
      }

      // Fetch Invoice Summary
      const invResponse = await fetch('/api/finance/customer-invoices')
      if (invResponse.ok) {
        const { data: invoices } = await invResponse.json()
        const summary: InvoiceSummary = {
          total_count: invoices?.length || 0,
          total_amount: invoices?.reduce((acc: number, inv: any) => acc + (Number(inv.total_amount) || 0), 0) || 0,
          paid_total: invoices?.reduce((acc: number, inv: any) => acc + (Number(inv.paid_amount) || 0), 0) || 0,
          overdue_count: invoices?.filter((inv: any) => inv.status === 'overdue').length || 0,
          draft_count: invoices?.filter((inv: any) => inv.status === 'draft').length || 0,
          sent_count: invoices?.filter((inv: any) => inv.status === 'sent' || inv.status === 'partial').length || 0,
        }
        setSummary(summary)
      }
    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Finance Module</h1>
          <p className="text-gray-400">W.System Financial Management</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-400">Total Outstanding AR</div>
              <TrendingUpIcon className="h-5 w-5 text-yellow-400" />
            </div>
            {loading ? (
              <div className="h-8 bg-gray-700 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold text-yellow-400">
                {formatCurrency(stats?.total || 0)}
              </div>
            )}
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-400">Overdue AR</div>
              <AlertTriangleIcon className="h-5 w-5 text-red-400" />
            </div>
            {loading ? (
              <div className="h-8 bg-gray-700 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold text-red-400">
                {formatCurrency((stats?.days_31_60 || 0) + (stats?.days_61_90 || 0) + (stats?.over_90 || 0))}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">31-60 / 61-90 / 90+ days</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-400">Total Paid (YTD)</div>
              <DollarSignIcon className="h-5 w-5 text-green-400" />
            </div>
            {loading ? (
              <div className="h-8 bg-gray-700 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold text-green-400">
                {formatCurrency(summary?.paid_total || 0)}
              </div>
            )}
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-400">Active Invoices</div>
              <FileTextIcon className="h-5 w-5 text-blue-400" />
            </div>
            {loading ? (
              <div className="h-8 bg-gray-700 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold text-blue-400">
                {summary?.sent_count || 0} Unpaid
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              {summary?.overdue_count || 0} Overdue
            </div>
          </div>
        </div>

        {/* AR Aging Quick View */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">AR Aging Breakdown</h3>
            <Link href="/finance/ar-aging" className="text-blue-400 hover:text-blue-300 text-sm">
              View Detail →
            </Link>
          </div>
          {loading ? (
            <div className="h-20 bg-gray-700 rounded animate-pulse" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-900 p-4 rounded-lg text-center">
                <div className="text-sm text-gray-400 mb-1">Current</div>
                <div className="text-lg font-semibold text-green-400">{formatCurrency(stats?.current || 0)}</div>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg text-center">
                <div className="text-sm text-gray-400 mb-1">1-30 Days</div>
                <div className="text-lg font-semibold text-yellow-400">{formatCurrency(stats?.days_1_30 || 0)}</div>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg text-center">
                <div className="text-sm text-gray-400 mb-1">31-60 Days</div>
                <div className="text-lg font-semibold text-orange-400">{formatCurrency(stats?.days_31_60 || 0)}</div>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg text-center">
                <div className="text-sm text-gray-400 mb-1">61-90 Days</div>
                <div className="text-lg font-semibold text-red-400">{formatCurrency(stats?.days_61_90 || 0)}</div>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg text-center">
                <div className="text-sm text-gray-400 mb-1">90+ Days</div>
                <div className="text-lg font-semibold text-red-500">{formatCurrency(stats?.over_90 || 0)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* COA */}
          <Link href="/finance/coa" className="block">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors">
              <h2 className="text-xl font-semibold mb-2">Chart of Accounts</h2>
              <p className="text-gray-400 text-sm">Manage account structure (add, edit, activate)</p>
              <div className="mt-4 text-blue-400 text-sm font-medium">Manage COA →</div>
            </div>
          </Link>
          <Link href="/finance/journal" className="block">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-colors">
              <h2 className="text-xl font-semibold mb-2">Journal Entries</h2>
              <p className="text-gray-400 text-sm">Double-entry bookkeeping — create, post, reverse</p>
              <div className="mt-4 text-green-400 text-sm font-medium">Manage Journals →</div>
            </div>
          </Link>
          <Link href="/finance/periods" className="block">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors">
              <h2 className="text-xl font-semibold mb-2">Fiscal Periods</h2>
              <p className="text-gray-400 text-sm">Configure accounting periods</p>
              <div className="mt-4 text-purple-400 text-sm font-medium">Manage Periods →</div>
            </div>
          </Link>
        </div>

        {/* Operational */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Operational Daily</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/finance/cash-register" className="block">
              <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-cyan-500 transition-colors">
                <h4 className="font-semibold mb-2">Cash / Bank Register</h4>
                <p className="text-sm text-gray-400">Tracking uang masuk &amp; keluar harian + saldo</p>
                <div className="mt-3 text-cyan-400 text-sm font-medium">View →</div>
              </div>
            </Link>
            <Link href="/finance/bank-reconciliation" className="block">
              <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-indigo-500 transition-colors">
                <h4 className="font-semibold mb-2">Bank Reconciliation</h4>
                <p className="text-sm text-gray-400">Match bank statements with journal entries</p>
                <div className="mt-3 text-indigo-400 text-sm font-medium">View →</div>
              </div>
            </Link>
            <Link href="/finance/money-requests" className="block">
              <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-purple-500 transition-colors">
                <h4 className="font-semibold mb-2">Money Requests</h4>
                <p className="text-sm text-gray-400">Permintaan uang via NIK — Procurement, Reimbursement, Cash Advance</p>
                <div className="mt-3 text-purple-400 text-sm font-medium">View →</div>
              </div>
            </Link>
            <Link href="/finance/expenses" className="block">
              <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-emerald-500 transition-colors">
                <h4 className="font-semibold mb-2">Expense Tracking</h4>
                <p className="text-sm text-gray-400">Pantau pengeluaran vs budget — Budget vs Actual chart + detail transaksi</p>
                <div className="mt-3 text-emerald-400 text-sm font-medium">View →</div>
              </div>
            </Link>
            <Link href="/finance/ar-aging" className="block">
              <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-green-500 transition-colors">
                <h4 className="font-semibold mb-2">AR Aging (Piutang)</h4>
                <p className="text-sm text-gray-400">Umur piutang per customer (1-30 / 31-60 / 61-90 / &gt;90)</p>
                <div className="mt-3 text-green-400 text-sm font-medium">View →</div>
              </div>
            </Link>
            <Link href="/finance/ap-aging" className="block">
              <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-red-500 transition-colors">
                <h4 className="font-semibold mb-2">AP Aging (Hutang)</h4>
                <p className="text-sm text-gray-400">Umur hutang per vendor — analisis pembayaran</p>
                <div className="mt-3 text-red-400 text-sm font-medium">View →</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Reports */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Financial Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/finance/reports/trial-balance" className="block">
              <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-yellow-500 transition-colors">
                <h4 className="font-semibold mb-2">Trial Balance</h4>
                <p className="text-sm text-gray-400">Saldo akun + cek balance debit/credit + Export CSV</p>
                <div className="mt-3 text-yellow-400 text-sm font-medium">View →</div>
              </div>
            </Link>
            <Link href="/finance/reports/income-statement" className="block">
              <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-orange-500 transition-colors">
                <h4 className="font-semibold mb-2">Income Statement</h4>
                <p className="text-sm text-gray-400">Laporan Laba Rugi — revenue vs expenses + Export CSV</p>
                <div className="mt-3 text-orange-400 text-sm font-medium">View →</div>
              </div>
            </Link>
            <Link href="/finance/reports/balance-sheet" className="block">
              <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-cyan-500 transition-colors">
                <h4 className="font-semibold mb-2">Balance Sheet</h4>
                <p className="text-sm text-gray-400">Neraca — Assets, Liabilities, Equity + Export CSV</p>
                <div className="mt-3 text-cyan-400 text-sm font-medium">View →</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
