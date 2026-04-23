'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Loader2Icon, PlusIcon, RefreshCwIcon, Trash2Icon, WalletIcon,
  ArrowDownLeftIcon, ArrowUpRightIcon, ArrowRightLeftIcon, MinusIcon,
  AlertTriangleIcon, CheckIcon, XIcon, Building2Icon, PiggyBankIcon, TrendingDownIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Badge } from '@workspace/ui/components/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@workspace/ui/components/select'

function fmt(v?: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0)
}

interface Custodian {
  id: string
  custodian_name: string
  department: string
  current_balance: number
  opening_balance: number
  max_limit: number
}

interface Entry {
  id: string
  entry_date: string
  entry_type: 'topup' | 'expense' | 'settlement' | 'return' | 'adjustment'
  amount: number
  description: string
  category: string
  reference_number?: string
  running_balance: number
  recipient_name?: string
  recipient_department?: string
  custodian?: { custodian_name: string }
  money_request?: { request_number: string; employee_name: string; purpose: string; amount: number }
  bank_account?: { account_name: string }
}

interface PendingRequest {
  id: string
  request_number: string
  employee_name: string
  department: string
  purpose: string
  amount: number
}

const ENTRY_LABELS: Record<string, { label: string; icon: typeof ArrowDownLeftIcon; color: string; bg: string }> = {
  topup:      { label: 'Top-up',       icon: ArrowDownLeftIcon,  color: 'text-emerald-700', bg: 'bg-emerald-100' },
  expense:    { label: 'Expense',      icon: ArrowUpRightIcon,   color: 'text-destructive',   bg: 'bg-destructive/10' },
  settlement: { label: 'Settlement',   icon: ArrowRightLeftIcon, color: 'text-blue-700',    bg: 'bg-blue-100' },
  return:     { label: 'Return',       icon: MinusIcon,          color: 'text-amber-700',   bg: 'bg-amber-100' },
  adjustment: { label: 'Adjustment',   icon: AlertTriangleIcon,    color: 'text-purple-700',  bg: 'bg-purple-100' },
}

export default function PettyCashPage() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<Entry[]>([])
  const [custodians, setCustodians] = useState<Custodian[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])

  // Filters
  const [custodianFilter, setCustodianFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Dialog: New Entry
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState<any>({
    custodian_id: '',
    entry_type: 'expense',
    amount: '',
    description: '',
    category: 'other',
    reference_number: '',
    recipient_name: '',
  })
  const [saving, setSaving] = useState(false)

  // Dialog: Settlement
  const [settleDialog, setSettleDialog] = useState(false)
  const [settleForm, setSettleForm] = useState({ custodian_id: '', money_request_id: '', amount: '', description: '' })
  const [settling, setSettling] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [sumRes, entRes, custRes, penRes] = await Promise.all([
        fetch('/api/finance/petty-cash?action=summary'),
        fetch('/api/finance/petty-cash?action=entries'),
        fetch('/api/finance/petty-cash?action=custodians'),
        fetch('/api/finance/petty-cash?action=pending-requests'),
      ])

      if (sumRes.ok) setSummary((await sumRes.json()).data)
      if (entRes.ok) setEntries((await entRes.json()).data || [])
      if (custRes.ok) setCustodians((await custRes.json()).data || [])
      if (penRes.ok) setPendingRequests((await penRes.json()).data || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load data')
    } finally { setLoading(false) }
  }

  async function createEntry() {
    if (!form.custodian_id || !form.amount || !form.description) {
      toast.error('Custodian, amount, and description are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/finance/petty-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'entry',
          custodian_id: form.custodian_id,
          entry_type: form.entry_type,
          amount: Number(form.amount),
          description: form.description,
          category: form.category,
          reference_number: form.reference_number || null,
          recipient_name: form.recipient_name || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Entry created successfully')
      setShowDialog(false)
      setForm({ custodian_id: '', entry_type: 'expense', amount: '', description: '', category: 'other', reference_number: '', recipient_name: '' })
      loadAll()
    } catch (err: any) {
      toast.error(err.message)
    } finally { setSaving(false) }
  }

  async function createSettlement() {
    if (!settleForm.custodian_id || !settleForm.money_request_id) {
      toast.error('Custodian and Money Request are required')
      return
    }
    setSettling(true)
    try {
      // Ambil data money request untuk amount
      const mr = pendingRequests.find(r => r.id === settleForm.money_request_id)
      const res = await fetch('/api/finance/petty-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'entry',
          custodian_id: settleForm.custodian_id,
          entry_type: 'settlement',
          amount: Number(settleForm.amount) || mr?.amount || 0,
          description: settleForm.description || `Settlement for ${mr?.request_number} — ${mr?.purpose}`,
          category: 'other',
          money_request_id: settleForm.money_request_id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Settlement created successfully')
      setSettleDialog(false)
      setSettleForm({ custodian_id: '', money_request_id: '', amount: '', description: '' })
      loadAll()
    } catch (err: any) {
      toast.error(err.message)
    } finally { setSettling(false) }
  }

  async function deleteEntry(id: string) {
    if (!confirm('Delete this entry? Balance will be reversed.')) return
    try {
      const res = await fetch('/api/finance/petty-cash', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'entry', id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Entry deleted')
      loadAll()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const filtered = entries.filter(e => {
    if (custodianFilter !== 'all' && e.custodian?.custodian_name !== custodianFilter) return false
    if (typeFilter !== 'all' && e.entry_type !== typeFilter) return false
    if (fromDate && e.entry_date < fromDate) return false
    if (toDate && e.entry_date > toDate) return false
    return true
  })

  const currentBalance = summary?.current_balance || 0
  const pctUsed = summary?.max_limit ? Math.min((currentBalance / summary.max_limit) * 100, 100) : 0

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <WalletIcon className="w-6 h-6 text-primary" /> Petty Cash (Kas Kecil)
          </h1>
          <p className="text-muted-foreground">Manage small cash fund: top-up, expenses, settlement, running balance.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAll} disabled={loading}>
            {loading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <RefreshCwIcon className="h-4 w-4" />}

          </Button>
          <Button variant="outline" onClick={() => setSettleDialog(true)}>
            <CheckIcon className="h-4 w-4 mr-2" />Settle MR
          </Button>
          <Button onClick={() => setShowDialog(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />New Entry
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <PiggyBankIcon className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <LoadingPulse /> : fmt(currentBalance)}</div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pctUsed}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{pctUsed.toFixed(0)}% of limit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Top-up</CardTitle>
            <ArrowDownLeftIcon className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {loading ? <LoadingPulse /> : fmt(summary?.total_topup || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Expense</CardTitle>
            <TrendingDownIcon className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {loading ? <LoadingPulse /> : fmt(summary?.total_expense || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Settlement</CardTitle>
            <ArrowRightLeftIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {loading ? <LoadingPulse /> : fmt(summary?.total_settlement || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-muted/50 p-3 rounded-lg">
        <Select value={custodianFilter} onValueChange={setCustodianFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Custodians" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Custodians</SelectItem>
            {custodians.map(c => (
              <SelectItem key={c.id} value={c.custodian_name}>{c.custodian_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="topup">Top-up</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="settlement">Settlement</SelectItem>
            <SelectItem value="return">Return</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
          </SelectContent>
        </Select>

        <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" />
        <span className="text-muted-foreground text-sm">to</span>
        <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40" />

        <Button variant="ghost" size="sm" onClick={() => { setCustodianFilter('all'); setTypeFilter('all'); setFromDate(''); setToDate('') }}>
          <XIcon className="h-3 w-3 mr-1" />Clear
        </Button>
      </div>

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Custodian</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground text-right">Amount</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground text-right">Running Balance</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12"><Loader2Icon className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No entries found.</td></tr>
                ) : (
                  filtered.map((e) => {
                    const meta = ENTRY_LABELS[e.entry_type] || ENTRY_LABELS.adjustment
                    const Icon = meta.icon
                    return (
                      <tr key={e.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-muted-foreground">{e.entry_date}</td>
                        <td className="px-4 py-3 text-sm">{e.custodian?.custodian_name || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className={`${meta.bg} ${meta.color} border-0`}>
                            <Icon className="h-3 w-3 mr-1" /> {meta.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm max-w-xs truncate" title={e.description}>{e.description}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{e.category}</td>
                        <td className="px-4 py-3 text-sm text-right font-mono font-medium">
                          <span className={e.entry_type === 'topup' || e.entry_type === 'settlement' ? 'text-emerald-600' : 'text-destructive'}>
                            {e.entry_type === 'topup' || e.entry_type === 'settlement' ? '+' : '-'} {fmt(e.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono">{fmt(e.running_balance)}</td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="ghost" onClick={() => deleteEntry(e.id)}>
                            <Trash2Icon className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pending Money Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Money Requests (For Settlement)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Request #</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Employee</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Department</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Purpose</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground text-right">Amount</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8"><Loader2Icon className="w-5 h-5 mx-auto animate-spin text-muted-foreground" /></td></tr>
                ) : pendingRequests.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No pending money requests.</td></tr>
                ) : (
                  pendingRequests.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium">{r.request_number}</td>
                      <td className="px-4 py-3 text-sm">{r.employee_name}</td>
                      <td className="px-4 py-3 text-sm">{r.department}</td>
                      <td className="px-4 py-3 text-sm">{r.purpose}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono">{fmt(r.amount)}</td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSettleForm({
                              custodian_id: custodians[0]?.id || '',
                              money_request_id: r.id,
                              amount: String(r.amount),
                              description: `Settlement for ${r.request_number} — ${r.purpose}`,
                            })
                            setSettleDialog(true)
                          }}
                        >
                          <CheckIcon className="h-3 w-3 mr-1" /> Settle
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: New Entry */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Petty Cash Entry</DialogTitle>
            <DialogDescription>Record a top-up, expense, return, or adjustment.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium">Custodian</label>
              <Select value={form.custodian_id} onValueChange={v => setForm({ ...form, custodian_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select custodian" /></SelectTrigger>
                <SelectContent>
                  {custodians.map(c => <SelectItem key={c.id} value={c.id}>{c.custodian_name} ({fmt(c.current_balance)})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select value={form.entry_type} onValueChange={v => setForm({ ...form, entry_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="topup">Top-up (In)</SelectItem>
                  <SelectItem value="expense">Expense (Out)</SelectItem>
                  <SelectItem value="return">Return (Out)</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meal">Meal</SelectItem>
                  <SelectItem value="parking">Parking</SelectItem>
                  <SelectItem value="stationery">Stationery (ATK)</SelectItem>
                  <SelectItem value="toll">Toll</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Amount (IDR)</label>
              <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What is this for?" />
            </div>
            <div>
              <label className="text-sm font-medium">Reference # (optional)</label>
              <Input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Recipient Name (optional)</label>
              <Input value={form.recipient_name} onChange={e => setForm({ ...form, recipient_name: e.target.value })} placeholder="Who received this?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={createEntry} disabled={saving}>
              {saving ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Settlement */}
      <Dialog open={settleDialog} onOpenChange={setSettleDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Settle Money Request from Petty Cash</DialogTitle>
            <DialogDescription>Pay an approved money request directly from petty cash fund.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium">Custodian</label>
              <Select value={settleForm.custodian_id} onValueChange={v => setSettleForm({ ...settleForm, custodian_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select custodian" /></SelectTrigger>
                <SelectContent>
                  {custodians.map(c => <SelectItem key={c.id} value={c.id}>{c.custodian_name} ({fmt(c.current_balance)})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Money Request</label>
              <Select value={settleForm.money_request_id} onValueChange={v => {
                const mr = pendingRequests.find(r => r.id === v)
                setSettleForm({
                  ...settleForm,
                  money_request_id: v,
                  amount: String(mr?.amount || ''),
                  description: `Settlement for ${mr?.request_number} — ${mr?.purpose}`,
                })
              }}>
                <SelectTrigger><SelectValue placeholder="Select request" /></SelectTrigger>
                <SelectContent>
                  {pendingRequests.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.request_number} — {r.employee_name} ({fmt(r.amount)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Amount (IDR)</label>
              <Input type="number" value={settleForm.amount} onChange={e => setSettleForm({ ...settleForm, amount: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input value={settleForm.description} onChange={e => setSettleForm({ ...settleForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleDialog(false)}>Cancel</Button>
            <Button onClick={createSettlement} disabled={settling}>
              {settling ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4 mr-2" />}
              Settle & Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LoadingPulse() {
  return <div className="h-8 bg-muted rounded animate-pulse" />
}
