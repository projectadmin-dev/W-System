'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  RefreshCwIcon, CheckCircleIcon, XIcon, LandmarkIcon,
  Loader2Icon, FilterIcon,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Badge } from '@workspace/ui/components/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@workspace/ui/components/select'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'

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
  transaction_date: string
  description: string
  reference: string
  debit_amount: number
  credit_amount: number
  balance_after: number
  transaction_type: string
  is_reconciled: boolean
}

export default function BankReconciliationPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [transactions, setTransactions] = useState<BankTransaction[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [reconciling, setReconciling] = useState(false)
  const [filters, setFilters] = useState({ bank_account_id: 'all', status: 'all', date_from: '', date_to: '' })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.bank_account_id !== 'all') params.append('bank_account_id', filters.bank_account_id)
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      const res = await fetch(`/api/finance/bank-reconciliation?${params.toString()}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAccounts(data.accounts || [])
      setTransactions(data.transactions || [])
      setSelectedIds([])
    } catch {
      toast.error('Failed to load bank data')
    } finally { setLoading(false) }
  }, [filters])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleRow = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const updateReconciliation = async (reconcile: boolean) => {
    if (selectedIds.length === 0) { toast.error('Select at least one transaction'); return }
    setReconciling(true)
    try {
      const res = await fetch('/api/finance/bank-reconciliation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, is_reconciled: reconcile })
      })
      if (!res.ok) throw new Error()
      toast.success(`${selectedIds.length} transactions ${reconcile ? 'reconciled' : 'unreconciled'}`)
      await fetchData()
    } catch { toast.error('Failed to update') } finally { setReconciling(false) }
  }

  const fmtMoney = (v?: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0)
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const selected = accounts.find(a => a.id === filters.bank_account_id)

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <LandmarkIcon className="w-6 h-6 text-primary" /> Bank Reconciliation
          </h1>
          <p className="text-muted-foreground">Match bank statement transactions with journal entries.</p>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          {loading ? <Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCwIcon className="w-4 h-4 mr-2" />}
          Reload
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="min-w-[240px]">
            <label className="block text-sm font-medium mb-1">Bank Account</label>
            <Select value={filters.bank_account_id} onValueChange={v => setFilters(f => ({ ...f, bank_account_id: v }))}>
              <SelectTrigger><SelectValue placeholder="All Accounts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name} — {a.bank_name} ({a.account_number})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium mb-1">Status</label>
            <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unreconciled">Unreconciled</SelectItem>
                <SelectItem value="reconciled">Reconciled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">From</label>
            <Input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To</label>
            <Input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      {/* Account summary */}
      {selected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Opening Balance</p><p className="text-2xl font-bold">{fmtMoney(selected.opening_balance)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Current Balance</p><p className="text-2xl font-bold text-primary">{fmtMoney(selected.current_balance)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Difference</p><p className={`text-2xl font-bold ${selected.current_balance - selected.opening_balance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{fmtMoney(selected.current_balance - selected.opening_balance)}</p></CardContent></Card>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
        {selectedIds.length > 0 && (
          <>
            <Button size="sm" onClick={() => updateReconciliation(true)} disabled={reconciling} className="bg-emerald-600 hover:bg-emerald-500 text-foreground">
              {reconciling ? <Loader2Icon className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircleIcon className="w-4 h-4 mr-1" />}Reconcile
            </Button>
            <Button size="sm" variant="outline" onClick={() => updateReconciliation(false)} disabled={reconciling} className="border-destructive text-destructive hover:bg-destructive/10">
              <XIcon className="w-4 h-4 mr-1" />Unreconcile
            </Button>
          </>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 w-12 text-center">
                    <input type="checkbox" checked={transactions.length > 0 && transactions.every(t => selectedIds.includes(t.id))} onChange={() => {
                      const allSelected = transactions.every(t => selectedIds.includes(t.id))
                      setSelectedIds(allSelected ? selectedIds.filter(id => !transactions.some(t => t.id === id)) : [...new Set([...selectedIds, ...transactions.map(t => t.id)])])
                    }} className="rounded border-border" />
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Reference</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground text-right">Debit</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground text-right">Credit</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12"><Loader2Icon className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No bank transactions found.</td></tr>
                ) : transactions.map(t => (
                  <tr key={t.id} onClick={() => toggleRow(t.id)} className={`border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors ${selectedIds.includes(t.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.includes(t.id)} onChange={() => toggleRow(t.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-3 text-sm">{fmtDate(t.transaction_date)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{t.reference || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t.description || '—'}</td>
                    <td className="px-4 py-3 text-sm"><Badge variant="outline" className="capitalize">{t.transaction_type}</Badge></td>
                    <td className="px-4 py-3 text-sm text-right text-emerald-600">{t.debit_amount > 0 ? fmtMoney(t.debit_amount) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-right text-destructive">{t.credit_amount > 0 ? fmtMoney(t.credit_amount) : '—'}</td>
                    <td className="px-4 py-3 text-sm">{t.is_reconciled ? <Badge variant="default">Reconciled</Badge> : <Badge variant="secondary">Unreconciled</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
