'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  PlusIcon, SearchIcon, RefreshCwIcon, EyeIcon, Trash2Icon,
  MoreVerticalIcon, Loader2Icon, PrinterIcon, ReceiptIcon,
  CheckCircleIcon, XCircleIcon, WalletIcon, Building2Icon,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Badge } from '@workspace/ui/components/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@workspace/ui/components/table'

interface VoucherItem {
  id: string
  description: string
  coa_id: string
  amount: string
  notes: string
}

interface SenderOption {
  id: string
  sender_type: 'bank' | 'petty_cash'
  label: string
  current_balance?: number
  currency?: string
}

interface VendorOption {
  id: string
  vendor_name: string
  bank_name: string | null
  bank_account_number: string | null
  bank_account_name: string | null
}

interface CoaOption {
  id: string
  account_code: string
  account_name: string
  level: number
  account_type: string
}

interface PaymentVoucher {
  id: string
  voucher_type: 'BKK' | 'BBK'
  voucher_number: string
  voucher_date: string
  sender_type: string
  sender_account_id: string
  receiver_name: string
  receiver_account_no: string | null
  receiver_bank: string | null
  main_coa_id: string
  main_amount: number
  total_amount: number
  currency: string
  status: 'draft' | 'issued' | 'paid' | 'cancelled' | 'voided'
  notes: string | null
  description: string | null
  reference_number: string | null
  prepared_by: string
  approved_by: string | null
  approved_at: string | null
  journal_entry_id: string | null
  created_at: string
  main_coa?: { account_code: string; account_name: string }
  vendor?: { vendor_name: string }
  items?: Array<{
    id: string; description: string; amount: number; notes: string | null
    coa?: { account_code: string; account_name: string }
  }>
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted',
  issued: 'bg-yellow-500',
  paid: 'bg-green-500',
  cancelled: 'bg-red-500',
  voided: 'bg-red-700',
}

export default function PaymentVouchersPage() {
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [createOpen, setCreateOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selected, setSelected] = useState<PaymentVoucher | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Dropdown data
  const [senders, setSenders] = useState<SenderOption[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [coaOptions, setCoaOptions] = useState<CoaOption[]>([])

  // Form state
  const [form, setForm] = useState({
    voucher_type: 'BBK' as 'BKK' | 'BBK',
    sender_type: 'bank' as 'bank' | 'petty_cash',
    sender_account_id: '',
    receiver_name: '',
    receiver_account_no: '',
    receiver_bank: '',
    vendor_id: '',
    main_coa_id: '',
    main_amount: '',
    currency: 'IDR',
    notes: '',
    description: '',
    reference_number: '',
  })
  const [items, setItems] = useState<VoucherItem[]>([
    { id: crypto.randomUUID(), description: '', coa_id: '', amount: '', notes: '' }
  ])

  useEffect(() => { loadAll() }, [typeFilter, statusFilter])
  useEffect(() => { loadDropdowns() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      const res = await fetch(`/api/finance/payment-vouchers?${params}`)
      if (res.ok) {
        const { data } = await res.json()
        setVouchers(data || [])
      }
    } catch (e) { toast.error('Failed to load vouchers') }
    finally { setLoading(false) }
  }

  async function loadDropdowns() {
    try {
      const [sRes, vRes, cRes] = await Promise.all([
        fetch('/api/finance/payment-vouchers/helpers?action=senders'),
        fetch('/api/finance/payment-vouchers/helpers?action=vendors'),
        fetch('/api/finance/payment-vouchers/helpers?action=coa'),
      ])
      if (sRes.ok) setSenders((await sRes.json()).data || [])
      if (vRes.ok) setVendors((await vRes.json()).data || [])
      if (cRes.ok) setCoaOptions((await cRes.json()).data || [])
    } catch { toast.error('Failed to load dropdown data') }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID') : '-'

  const totalMain = parseFloat(form.main_amount) || 0
  const totalItems = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
  const grandTotal = totalMain + totalItems

  const onSelectSender = (value: string) => {
    const s = senders.find(x => `${x.id}|${x.sender_type}` === value)
    if (s) setForm({ ...form, sender_account_id: s.id, sender_type: s.sender_type })
  }

  const onSelectVendor = (vid: string) => {
    const v = vendors.find(x => x.id === vid)
    if (v) setForm({ ...form,
      vendor_id: vid,
      receiver_name: v.vendor_name,
      receiver_account_no: v.bank_account_number || '',
      receiver_bank: v.bank_name || '',
    })
  }

  const addItem = () =>
    setItems(prev => [...prev, { id: crypto.randomUUID(), description: '', coa_id: '', amount: '', notes: '' }])

  const removeItem = (id: string) =>
    setItems(prev => prev.filter(i => i.id !== id))

  const updateItem = (id: string, field: 'description' | 'coa_id' | 'amount' | 'notes', value: string) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))

  const handleCreate = async () => {
    if (!form.sender_account_id || !form.receiver_name || !form.main_coa_id) {
      toast.error('Mohon lengkapi Sender, Receiver, dan COA Utama')
      return
    }
    setActionLoading(true)
    try {
      const payload = {
        ...form,
        main_amount: parseFloat(form.main_amount) || 0,
        total_amount: grandTotal,
        items: items
          .filter(i => i.description.trim() !== '')
          .map(i => ({
            description: i.description,
            coa_id: i.coa_id,
            amount: parseFloat(i.amount) || 0,
            notes: i.notes || null,
          })),
      }
      const res = await fetch('/api/finance/payment-vouchers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success('Payment Voucher berhasil dibuat')
        setCreateOpen(false)
        resetForm()
        loadAll()
      } else {
        const { error } = await res.json()
        toast.error(error || 'Gagal membuat voucher')
      }
    } catch { toast.error('Error creating voucher') }
    finally { setActionLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus voucher ini?')) return
    try {
      const res = await fetch('/api/finance/payment-vouchers', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
      })
      if (res.ok) { toast.success('Voucher dihapus'); loadAll() }
    } catch { toast.error('Gagal menghapus') }
  }

  const handleApprove = async () => {
    if (!selected) return
    try {
      const res = await fetch(`/api/finance/payment-vouchers/${selected.id}/issue`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      })
      if (res.ok) {
        toast.success('Voucher di-approve & auto-jurnal terbit')
        setViewOpen(false)
        loadAll()
      } else {
        const { error } = await res.json()
        toast.error(error || 'Gagal issue')
      }
    } catch { toast.error('Error') }
  }

  const resetForm = () => {
    setForm({
      voucher_type: 'BBK', sender_type: 'bank', sender_account_id: '',
      receiver_name: '', receiver_account_no: '', receiver_bank: '',
      vendor_id: '', main_coa_id: '', main_amount: '', currency: 'IDR',
      notes: '', description: '', reference_number: '',
    })
    setItems([{ id: crypto.randomUUID(), description: '', coa_id: '', amount: '', notes: '' }])
  }

  const filtered = vouchers.filter(v =>
    (v.voucher_number.toLowerCase().includes(search.toLowerCase()) ||
     v.receiver_name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Payment Vouchers</h1>
          <p className="text-muted-foreground">BKK (Kas) &amp; BBK (Bank) — Bukti Pembayaran Keluar</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/finance" className="text-primary hover:text-primary/80">← Back to Finance</Link>
          <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
            <PlusIcon className="h-4 w-4 mr-2" /> New Voucher
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {(['BKK','BBK']).map(t => (
          <div key={t} className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">{t} — Bulan Ini</div>
            <div className="text-2xl font-bold text-primary">
              {fmt(vouchers.filter(v => v.voucher_type === t).reduce((s, v) => s + v.total_amount, 0))}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1"><SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cari nomor voucher atau penerima..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
          <option value="all">Semua Type</option><option value="BKK">BKK (Kas)</option><option value="BBK">BBK (Bank)</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
          <option value="all">Semua Status</option><option value="draft">Draft</option><option value="issued">Issued</option>
          <option value="paid">Paid</option><option value="cancelled">Cancelled</option>
        </select>
        <Button variant="outline" onClick={loadAll} disabled={loading}><RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button>
      </div>

      {/* Table */}
      <div>
        <Table><TableHeader><TableRow className="border-border">
          <TableHead className="text-muted-foreground">Voucher #</TableHead>
          <TableHead className="text-muted-foreground">Type</TableHead>
          <TableHead className="text-muted-foreground">Tanggal</TableHead>
          <TableHead className="text-muted-foreground">Penerima</TableHead>
          <TableHead className="text-muted-foreground text-right">Total</TableHead>
          <TableHead className="text-muted-foreground">Status</TableHead>
          <TableHead className="text-muted-foreground text-right">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {loading ? <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2Icon className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
          : filtered.length > 0 ? filtered.map(v => (
            <TableRow key={v.id} className="border-border">
              <TableCell className="font-mono font-medium">{v.voucher_number}</TableCell>
              <TableCell><Badge variant={v.voucher_type === 'BKK' ? 'secondary' : 'default'}>{v.voucher_type}</Badge></TableCell>
              <TableCell>{fmtDate(v.voucher_date)}</TableCell>
              <TableCell className="max-w-[180px] truncate" title={v.receiver_name}>{v.receiver_name}</TableCell>
              <TableCell className="text-right font-semibold">{fmt(v.total_amount)}</TableCell>
              <TableCell><Badge className={STATUS_COLORS[v.status]}>{v.status.toUpperCase()}</Badge></TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVerticalIcon className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setSelected(v); setViewOpen(true) }}><EyeIcon className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                    {v.status === 'draft' && <DropdownMenuItem onClick={() => { setSelected(v); setViewOpen(true) }} className="text-emerald-600"><CheckCircleIcon className="h-4 w-4 mr-2" /> Issue</DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleDelete(v.id)} className="text-red-600"><Trash2Icon className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          )) : <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Tidak ada voucher</TableCell></TableRow>}
        </TableBody></Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Payment Voucher</DialogTitle><DialogDescription>Buat bukti pembayaran BKK atau BBK</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Type */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Jenis Voucher</label>
                <select value={form.voucher_type} onChange={e => setForm({ ...form, voucher_type: e.target.value as 'BKK'|'BBK' })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                  <option value="BBK">BBK — Bukti Bank Keluar</option>
                  <option value="BKK">BKK — Bukti Kas Keluar</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Mata Uang</label>
                <Input value={form.currency} readOnly className="bg-muted/50 border-border cursor-not-allowed text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Referensi</label>
                <Input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} placeholder="No Invoice / Referensi" className="bg-background border-border text-sm" />
              </div>
            </div>

            {/* Sender */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <label className="text-sm font-semibold flex items-center gap-2"><WalletIcon className="h-4 w-4 text-primary" /> Sumber Dana (Sender)</label>
              <select value={form.sender_account_id ? `${form.sender_account_id}|${form.sender_type}` : ''} onChange={e => onSelectSender(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                <option value="">-- Pilih Rekening --</option>
                {senders.map(s => <option key={`${s.id}|${s.sender_type}`} value={`${s.id}|${s.sender_type}`}>{s.label}</option>)}
              </select>
            </div>

            {/* Receiver */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <label className="text-sm font-semibold flex items-center gap-2"><Building2Icon className="h-4 w-4 text-primary" /> Penerima (Receiver)</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Pilih Vendor (opsional)</label>
                  <select value={form.vendor_id} onChange={e => onSelectVendor(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                    <option value="">-- Manual / Non-Vendor --</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nama Penerima</label>
                  <Input value={form.receiver_name} onChange={e => setForm({ ...form, receiver_name: e.target.value })} placeholder="Nama penerima" className="bg-background border-border text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input value={form.receiver_account_no} onChange={e => setForm({ ...form, receiver_account_no: e.target.value })} placeholder="No Rekening Penerima" className="bg-background border-border text-sm" />
                <Input value={form.receiver_bank} onChange={e => setForm({ ...form, receiver_bank: e.target.value })} placeholder="Nama Bank Penerima" className="bg-background border-border text-sm" />
              </div>
            </div>

            {/* Main Payment */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <label className="text-sm font-semibold">Rincian Pembayaran Utama</label>
              <div className="grid grid-cols-2 gap-4">
                <select value={form.main_coa_id} onChange={e => setForm({ ...form, main_coa_id: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm">
                  <option value="">-- Pilih COA / Akun Beban --</option>
                  {coaOptions.map(c => <option key={c.id} value={c.id}>{c.account_code} — {c.account_name}</option>)}
                </select>
                <Input type="number" value={form.main_amount} onChange={e => setForm({ ...form, main_amount: e.target.value })} placeholder="Jumlah (IDR)" className="bg-background border-border text-sm" />
              </div>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Keterangan pembayaran" className="bg-background border-border text-sm" />
            </div>

            {/* Biaya Lainnya — Dynamic */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Biaya Lainnya (Add More)</label>
                <span className="text-sm text-muted-foreground">Jumlah Item: {items.filter(i => i.description.trim() !== '').length}</span>
              </div>
              {items.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                  <Input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder={`Item ${idx+1}: Deskripsi`} className="bg-background border-border text-sm" />
                  <select value={item.coa_id} onChange={e => updateItem(item.id, 'coa_id', e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm">
                    <option value="">-- COA --</option>
                    {coaOptions.map(c => <option key={c.id} value={c.id}>{c.account_code} — {c.account_name}</option>)}
                  </select>
                  <Input type="number" value={item.amount} onChange={e => updateItem(item.id, 'amount', e.target.value)} placeholder="Jumlah" className="bg-background border-border text-sm w-28" />
                  {items.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 h-8 w-8">
                      <XCircleIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addItem} className="w-full"><PlusIcon className="h-3 w-3 mr-1" /> Tambah Biaya Lainnya</Button>
            </div>

            {/* Summary */}
            <div className="bg-muted p-4 rounded-lg space-y-1">
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Pembayaran Utama:</span><span className="text-sm font-medium">{fmt(totalMain)}</span></div>
              <div className="flex justify-between"><span className="text-sm text-muted-foreground">Biaya Lainnya:</span><span className="text-sm font-medium">{fmt(totalItems)}</span></div>
              <div className="flex justify-between pt-2 border-t border-border mt-1"><span className="text-sm font-bold">TOTAL:</span><span className="text-lg font-bold text-primary">{fmt(grandTotal)}</span></div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Notes Tambahan</label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Catatan tambahan..." className="bg-background border-border text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={actionLoading || grandTotal <= 0}>
              {actionLoading ? <Loader2Icon className="h-4 w-4 mr-2 animate-spin" /> : null}
              Simpan Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detail Payment Voucher</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-sm text-muted-foreground">Voucher Number</div><div className="font-mono font-medium">{selected.voucher_number}</div></div>
                <div><div className="text-sm text-muted-foreground">Status</div><Badge className={STATUS_COLORS[selected.status]}>{selected.status.toUpperCase()}</Badge></div>
                <div><div className="text-sm text-muted-foreground">Type</div><Badge variant={selected.voucher_type==='BKK'?'secondary':'default'}>{selected.voucher_type}</Badge></div>
                <div><div className="text-sm text-muted-foreground">Tanggal</div><div>{fmtDate(selected.voucher_date)}</div></div>
                <div><div className="text-sm text-muted-foreground">Penerima</div><div>{selected.receiver_name}</div></div>
                <div><div className="text-sm text-muted-foreground">Referensi</div><div>{selected.reference_number || '-'}</div></div>
              </div>
              {selected.main_coa && <div className="flex justify-between text-sm"><span className="text-muted-foreground">COA Utama:</span><span className="font-medium">{selected.main_coa.account_code} — {selected.main_coa.account_name}</span></div>}

              {/* Items */}
              {selected.items && selected.items.length > 0 && (
                <div>
                  <div className="text-sm font-semibold mb-2">Biaya Lainnya</div>
                  <div className="bg-muted/50 rounded-lg overflow-hidden">
                    <Table><TableHeader><TableRow><TableHead className="text-muted-foreground">#</TableHead><TableHead className="text-muted-foreground">Deskripsi</TableHead><TableHead className="text-muted-foreground">COA</TableHead><TableHead className="text-muted-foreground text-right">Jumlah</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {selected.items.map((it, i) => (
                        <TableRow key={it.id} className="border-border">
                          <TableCell className="text-sm text-muted-foreground">{i+1}</TableCell>
                          <TableCell className="text-sm">{it.description}</TableCell>
                          <TableCell className="text-sm">{it.coa ? `${it.coa.account_code}` : '-'}</TableCell>
                          <TableCell className="text-sm text-right font-medium">{fmt(it.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
                </div>
              )}

              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between mb-2 pt-2 border-t border-border"><span className="font-bold">TOTAL:</span><span className="font-bold text-primary">{fmt(selected.total_amount)}</span></div>
                {selected.journal_entry_id && <div className="flex justify-between"><span className="text-muted-foreground">Journal:</span><span className="text-emerald-600 font-medium text-sm">✓ Auto-Journal Terbit</span></div>}
              </div>

              {selected.status === 'draft' && (
                <div className="flex gap-3">
                  <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700"><CheckCircleIcon className="h-4 w-4 mr-2" /> Issue &amp; Auto-Journal</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
