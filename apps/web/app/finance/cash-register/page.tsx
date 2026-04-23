'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  PlusIcon, SearchIcon, RefreshCwIcon, FilterIcon,
  ArrowDownLeftIcon, ArrowUpRightIcon, DollarSignIcon,
  Loader2Icon,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Badge } from '@workspace/ui/components/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@workspace/ui/components/dialog'

interface CashEntry {
  id: string
  entry_date: string
  entry_type: 'in' | 'out'
  source_type: string
  source_id?: string
  account_name: string
  amount: number
  description: string
  reference_number?: string
  running_balance: number
  created_by?: string
  created_at: string
}

interface Summary {
  total_in: number
  total_out: number
  running_balance: number
  net: number
}

const SOURCE_LABELS: Record<string, string> = {
  money_request: 'Money Request',
  customer_payment: 'Customer Payment',
  vendor_payment: 'Vendor Payment',
  salary_payment: 'Salary',
  journal_entry: 'Journal',
  adjustment: 'Adjustment',
  opening_balance: 'Opening Balance',
  other: 'Other',
}

export default function CashRegisterPage() {
  const [entries, setEntries] = useState<CashEntry[]>([])
  const [summary, setSummary] = useState<Summary>({ total_in: 0, total_out: 0, running_balance: 0, net: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    entry_type: 'out' as 'in' | 'out',
    source_type: 'other' as string,
    account_name: 'Kas Kecil',
    amount: '',
    description: '',
    reference_number: '',
  })

  useEffect(() => { fetchData() }, [typeFilter, fromDate, toDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)

      const [entriesRes, summaryRes] = await Promise.all([
        fetch(`/api/finance/cash-register?${params}`),
        fetch('/api/finance/cash-register/summary'),
      ])

      if (entriesRes.ok) {
        const { data } = await entriesRes.json()
        setEntries(data || [])
      }
      if (summaryRes.ok) {
        const { data } = await summaryRes.json()
        setSummary(data || { total_in: 0, total_out: 0, running_balance: 0, net: 0 })
      }
    } catch {
      toast.error('Failed to load cash register')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.amount || !form.description) {
      toast.error('Please fill amount and description')
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch('/api/finance/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
        }),
      })
      if (res.ok) {
        toast.success('Entry recorded')
        setCreateOpen(false)
        setForm({
          entry_date: new Date().toISOString().split('T')[0],
          entry_type: 'out',
          source_type: 'other',
          account_name: 'Kas Kecil',
          amount: '',
          description: '',
          reference_number: '',
        })
        fetchData()
      } else {
        const { error } = await res.json()
        toast.error(error || 'Failed to record')
      }
    } catch {
      toast.error('Error recording entry')
    } finally {
      setActionLoading(false)
    }
  }

  const filtered = entries.filter(e =>
    (e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (e.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false))
  )

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 border-b border-gray-700 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Cash / Bank Register</h1>
            <p className="text-gray-400">Tracking uang masuk & keluar harian + saldo real-time</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/finance" className="text-blue-400 hover:text-blue-300 transition-colors">← Back to Finance</Link>
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" /> Tambah Entry
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 border border-green-700/50 rounded-lg p-4">
            <div className="text-sm text-green-400 mb-1">Total Masuk</div>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(summary.total_in)}</div>
            <ArrowDownLeftIcon className="h-4 w-4 text-green-400 mt-1" />
          </div>
          <div className="bg-gray-800 border border-red-700/50 rounded-lg p-4">
            <div className="text-sm text-red-400 mb-1">Total Keluar</div>
            <div className="text-2xl font-bold text-red-400">{formatCurrency(summary.total_out)}</div>
            <ArrowUpRightIcon className="h-4 w-4 text-red-400 mt-1" />
          </div>
          <div className="bg-gray-800 border border-cyan-700/50 rounded-lg p-4 md:col-span-2">
            <div className="text-sm text-cyan-400 mb-1">Saldo Akhir</div>
            <div className="text-3xl font-bold text-cyan-400">{formatCurrency(summary.running_balance)}</div>
            <div className="text-xs text-gray-500 mt-1">Auto-calculated from all entries</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search description or reference..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 bg-gray-900 border-gray-700"
              />
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm">
              <option value="all">All Types</option>
              <option value="in">Cash In</option>
              <option value="out">Cash Out</option>
            </select>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-gray-900 border-gray-700 w-40" placeholder="From" />
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-gray-900 border-gray-700 w-40" placeholder="To" />
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Source</th>
                  <th className="px-4 py-3 text-left font-medium">Account</th>
                  <th className="px-4 py-3 text-left font-medium">Reference</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-right font-medium">Debit (In)</th>
                  <th className="px-4 py-3 text-right font-medium">Credit (Out)</th>
                  <th className="px-4 py-3 text-right font-medium">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500"><Loader2Icon className="h-6 w-6 animate-spin mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Tidak ada transaksi</td></tr>
                ) : filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-700/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">{e.entry_date}</td>
                    <td>
                      <Badge className={e.entry_type === 'in' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
                        {e.entry_type === 'in' ? 'IN' : 'OUT'}
                      </Badge>
                    </td>
                    <td className="text-gray-400">{SOURCE_LABELS[e.source_type] || e.source_type}</td>
                    <td>{e.account_name}</td>
                    <td className="font-mono text-gray-400 text-sm">{e.reference_number || '-'}</td>
                    <td className="max-w-[250px] truncate" title={e.description}>{e.description}</td>
                    <td className="px-4 py-3 text-right text-green-400">{e.entry_type === 'in' ? formatCurrency(e.amount) : '-'}</td>
                    <td className="px-4 py-3 text-right text-red-400">{e.entry_type === 'out' ? formatCurrency(e.amount) : '-'}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${e.running_balance >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                      {formatCurrency(e.running_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Tambah Entry Baru</DialogTitle><DialogDescription>Record cash / bank transaction</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Tanggal</label>
                <Input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} className="bg-gray-900 border-gray-700" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tipe</label>
                <select value={form.entry_type} onChange={e => setForm({ ...form, entry_type: e.target.value as 'in' | 'out' })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm">
                  <option value="out">Cash Out (Keluar)</option>
                  <option value="in">Cash In (Masuk)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Source</label>
                <select value={form.source_type} onChange={e => setForm({ ...form, source_type: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm">
                  <option value="other">Other</option>
                  <option value="money_request">Money Request</option>
                  <option value="customer_payment">Customer Payment</option>
                  <option value="vendor_payment">Vendor Payment</option>
                  <option value="salary_payment">Salary</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Account</label>
                <select value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm">
                  <option value="Kas Kecil">Kas Kecil</option>
                  <option value="Bank BCA">Bank BCA</option>
                  <option value="Bank Mandiri">Bank Mandiri</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Bayar vendor" className="bg-gray-900 border-gray-700" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nominal (IDR)</label>
                <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="1000000" className="bg-gray-900 border-gray-700" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Reference No (Optional)</label>
                <Input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} placeholder="e.g. INV-001" className="bg-gray-900 border-gray-700" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={actionLoading}>
              {actionLoading ? <Loader2Icon className="h-4 w-4 mr-2 animate-spin" /> : <PlusIcon className="h-4 w-4 mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
