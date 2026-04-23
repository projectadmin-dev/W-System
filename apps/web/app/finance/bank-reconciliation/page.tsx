'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  RefreshCwIcon, CheckIcon, XIcon, FilterIcon,
  LandmarkIcon, ArrowDownLeftIcon, ArrowUpRightIcon,
  Loader2Icon, CheckCircleIcon, CircleIcon,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Badge } from '@workspace/ui/components/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

interface BankAccount {
  id: string
  account_name: string
  bank_name: string
  account_number: string
  opening_balance: number
  current_balance: number
}

interface BankTransaction {
  id: string
  bank_account_id: string
  transaction_date: string
  description: string
  reference: string
  debit_amount: number
  credit_amount: number
  balance_after: number
  transaction_type: string
  is_reconciled: boolean
  reconciled_at?: string
  reconciled_by?: { full_name: string }
  journal_entry_id?: string
}

interface Summary {
  total_in: number
  total_out: number
  reconciled_count: number
  unreconciled_count: number
}

export default function BankReconciliationPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [reconciling, setReconciling] = useState(false)

  const [filters, setFilters] = useState({
    bank_account_id: 'all',
    status: 'all',
    date_from: '',
    date_to: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.bank_account_id !== 'all') params.append('bank_account_id', filters.bank_account_id)
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)

      const res = await fetch(`/api/finance/bank-reconciliation?${params.toString()}`)
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to fetch')
      const data = await res.json()

      setAccounts(data.accounts || [])
      setTransactions(data.transactions || [])
      setSummary(data.summary)
      setSelectedIds([])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load bank data')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const toggleSelectPage = () => {
    const pageIds = transactions.map((t) => t.id)
    const allSelected = pageIds.every((id) => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const updateReconciliation = async (reconcile: boolean) => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one transaction')
      return
    }
    setReconciling(true)
    try {
      const res = await fetch('/api/finance/bank-reconciliation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, is_reconciled: reconcile }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update')
      toast.success(`${selectedIds.length} transactions ${reconcile ? 'reconciled' : 'unreconciled'}`)
      await fetchData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setReconciling(false)
    }
  }

  const formatMoney = (val?: number) => {
    if (val === undefined || val === null) return '—'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val)
  }

  const formatDate = (date?: string) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const selectedAccount = accounts.find((a) => a.id === filters.bank_account_id)

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-8 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <LandmarkIcon className="w-8 h-8 text-blue-400" />
              Bank Reconciliation
            </h1>
            <p className="text-gray-400">
              Match bank statement transactions with journal entries
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchData}
            className="border-gray-600 text-gray-200 hover:bg-gray-700"
            disabled={loading}
          >
            {loading ? <Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCwIcon className="w-4 h-4 mr-2" />}
            Reload
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 bg-gray-800/50 border-b border-gray-700">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[240px]">
            <label className="block text-sm font-medium text-gray-400 mb-1">Bank Account</label>
            <Select
              value={filters.bank_account_id}
              onValueChange={(v) => setFilters((f) => ({ ...f, bank_account_id: v }))}
            >
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Select Account" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="all" className="text-white">All Accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-white">
                    {a.account_name} — {a.bank_name} ({a.account_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters((f) => ({ ...f, status: v }))}
            >
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="all" className="text-white">All</SelectItem>
                <SelectItem value="unreconciled" className="text-white">Unreconciled</SelectItem>
                <SelectItem value="reconciled" className="text-white">Reconciled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">From</label>
            <Input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value }))}
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">To</label>
            <Input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value }))}
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
        </div>
      </div>

      {/* Account Summary */}
      {selectedAccount && (
        <div className="px-8 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400">Opening Balance</p>
              <p className="text-2xl font-bold text-white">{formatMoney(selectedAccount.opening_balance)}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400">Current Balance</p>
              <p className="text-2xl font-bold text-blue-400">{formatMoney(selectedAccount.current_balance)}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400">Difference</p>
              <p className={`text-2xl font-bold ${(selectedAccount.current_balance - selectedAccount.opening_balance) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatMoney(selectedAccount.current_balance - selectedAccount.opening_balance)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Global Summary */}
      {summary && !selectedAccount && (
        <div className="px-8 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <SummaryCard label="Total In (Debit)" value={summary.total_in} type="positive" />
            <SummaryCard label="Total Out (Credit)" value={summary.total_out} type="negative" />
            <SummaryCard label="Reconciled" value={summary.reconciled_count} type="neutral" raw />
            <SummaryCard label="Unreconciled" value={summary.unreconciled_count} type="warn" raw />
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">
            {selectedIds.length} selected
          </span>
          {selectedIds.length > 0 && (
            <>
              <Button
                size="sm"
                onClick={() => updateReconciliation(true)}
                disabled={reconciling}
                className="bg-green-600 hover:bg-green-500 text-white"
              >
                {reconciling ? <Loader2Icon className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircleIcon className="w-4 h-4 mr-1" />}
                Reconcile
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateReconciliation(false)}
                disabled={reconciling}
                className="border-red-600 text-red-400 hover:bg-red-900/30"
              >
                <XIcon className="w-4 h-4 mr-1" />
                Unreconcile
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="px-8 pb-8">
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800/80">
                <th className="px-4 py-3 w-12 text-center">
                  <button onClick={toggleSelectPage} className="focus:outline-none">
                    {transactions.length > 0 && transactions.every((t) => selectedIds.includes(t.id)) ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    ) : (
                      <CircleIcon className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-400">Date</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-400">Reference</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-400">Description</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-400">Type</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-400 text-right">Debit</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-400 text-right">Credit</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-400 text-right">Balance</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <Loader2Icon className="w-8 h-8 animate-spin mx-auto text-blue-400" />
                    <p className="text-gray-400 mt-2">Loading...</p>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <LandmarkIcon className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400">No bank transactions found</p>
                    <p className="text-sm text-gray-500 mt-1">Try changing filter or add bank statement data</p>
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const isSel = selectedIds.includes(t.id)
                  return (
                    <tr
                      key={t.id}
                      onClick={() => toggleRow(t.id)}
                      className={`border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer transition-colors ${isSel ? 'bg-blue-900/20' : ''}`}
                    >
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button className="focus:outline-none">
                          {isSel ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-400" />
                          ) : (
                            <CircleIcon className="w-5 h-5 text-gray-500" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(t.transaction_date)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-300">{t.reference || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-200">{t.description || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant={t.transaction_type === 'deposit' ? 'default' : 'secondary'} className="capitalize">
                          {t.transaction_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-400">
                        {t.debit_amount > 0 ? formatMoney(t.debit_amount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-red-400">
                        {t.credit_amount > 0 ? formatMoney(t.credit_amount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-200">{formatMoney(t.balance_after)}</td>
                      <td className="px-4 py-3 text-sm">
                        {t.is_reconciled ? (
                          <span className="inline-flex items-center gap-1 text-green-400 text-xs font-medium">
                            <CheckIcon className="w-3 h-3" /> Reconciled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-yellow-400 text-xs font-medium">
                            <CircleIcon className="w-3 h-3" /> Unreconciled
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ---------- Simple helpers ---------- */

function SummaryCard({ label, value, type, raw }: { label: string; value: number; type: 'positive' | 'negative' | 'neutral' | 'warn'; raw?: boolean }) {
  const color =
    type === 'positive' ? 'text-green-400' : type === 'negative' ? 'text-red-400' : type === 'warn' ? 'text-yellow-400' : 'text-blue-400'
  const show = raw ? String(value) : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{show}</p>
    </div>
  )
}
