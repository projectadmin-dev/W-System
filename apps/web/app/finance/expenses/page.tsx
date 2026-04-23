'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { BudgetVsActualChart } from '../../../components/finance/BudgetVsActualChart'
import { ExpenseFilters, ExpenseTable } from '../../../components/finance/ExpenseTable'
import { ExpenseForm } from '../../../components/finance/ExpenseForm'
import type { Expense, ExpenseFilter, ExpenseSummary } from '../../../lib/repositories/finance-expenses'

export default function ExpensesPage() {
  const [filter, setFilter] = useState<ExpenseFilter>({
    period: '2026-05',
    page: 1,
    limit: 20,
    sort_by: 'date',
    sort_order: 'desc',
  })
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [count, setCount] = useState(0)
  const [total_pages, setTotalPages] = useState(1)
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filter.period) params.set('period', filter.period)
      if (filter.kind) params.set('kind', filter.kind)
      if (filter.status) params.set('status', filter.status)
      if (filter.search) params.set('search', filter.search)
      params.set('page', String(filter.page))
      params.set('limit', String(filter.limit))
      if (filter.sort_by) params.set('sort_by', filter.sort_by)
      if (filter.sort_order) params.set('sort_order', filter.sort_order)

      const res = await fetch(`/api/finance/expenses?${params}`)
      const json = await res.json()

      if (!json.success) throw new Error(json.error || 'Failed to fetch')

      setExpenses(json.data)
      setCount(json.meta.count)
      setTotalPages(json.meta.total_pages)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filter])

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const res = await fetch(`/api/finance/expenses/summary?period=${filter.period}`)
      const json = await res.json()
      if (json.success) setSummary(json.data)
    } catch {
      // silently fail summary
    } finally {
      setSummaryLoading(false)
    }
  }, [filter.period])

  useEffect(() => {
    fetchExpenses()
    fetchSummary()
  }, [fetchExpenses, fetchSummary])

  const handlePageChange = (page: number) => {
    setFilter(prev => ({ ...prev, page }))
  }

  const handleAddNew = () => {
    setSelectedExpense(null)
    setFormOpen(true)
  }

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense)
    setFormOpen(true)
  }

  const handleSuccess = () => {
    fetchExpenses()
    fetchSummary()
  }

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <Link href="/finance" className="hover:text-white transition-colors">Finance</Link>
              <span>/</span>
              <span className="text-white">Expenses</span>
            </div>
            <h1 className="text-2xl font-bold">Expense Tracking</h1>
            <p className="text-gray-400 text-sm">Pantau pengeluaran perusahaan vs budget bulanan</p>
          </div>
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
            onClick={handleAddNew}
          >
            + Tambah Pengeluaran
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 mt-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Total Pengeluaran (Filtered)</div>
            <div className="text-lg font-semibold font-mono text-white">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                maximumFractionDigits: 0,
              }).format(totalAmount)}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Jumlah Transaksi</div>
            <div className="text-lg font-semibold font-mono text-white">
              {count} transaksi
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Periode Aktif</div>
            <div className="text-lg font-semibold font-mono text-white">
              {filter.period}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Status Budget</div>
            {summaryLoading ? (
              <div className="h-6 bg-gray-700 rounded animate-pulse" />
            ) : summary ? (
              <div className={`text-lg font-semibold font-mono ${summary.variance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {summary.variance >= 0 ? 'Under' : 'Over'} Budget
              </div>
            ) : (
              <div className="text-lg font-semibold font-mono text-gray-500">-</div>
            )}
          </div>
        </div>

        {/* Budget vs Actual Chart */}
        <div className="mb-8">
          <BudgetVsActualChart summary={summary} loading={summaryLoading} />
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Detail Pengeluaran</h2>
            <button
              onClick={() => setFilter({
                period: '2026-05',
                page: 1,
                limit: 20,
                sort_by: 'date',
                sort_order: 'desc',
              })}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Reset Filter
            </button>
          </div>
          <ExpenseFilters filter={filter} onChange={setFilter} />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4 text-red-300">
            {error}
          </div>
        )}

        {/* Table */}
        {loading && expenses.length === 0 ? (
          <div className="space-y-4">
            <div className="h-10 bg-gray-700 rounded animate-pulse" />
            <div className="h-64 bg-gray-700 rounded animate-pulse" />
          </div>
        ) : (
          <ExpenseTable
            data={expenses}
            count={count}
            total_pages={total_pages}
            page={filter.page || 1}
            limit={filter.limit || 20}
            onPageChange={handlePageChange}
            onRefresh={fetchExpenses}
            onEdit={handleEdit}
          />
        )}

        {/* Form Dialog */}
        <ExpenseForm
          open={formOpen}
          onOpenChange={setFormOpen}
          expense={selectedExpense}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  )
}
