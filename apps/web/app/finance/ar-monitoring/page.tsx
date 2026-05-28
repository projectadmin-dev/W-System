'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
  ArchiveIcon,
  PencilIcon,
  SearchIcon,
  RefreshCwIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  SendIcon,
  CheckIcon,
} from 'lucide-react'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@workspace/ui/components/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { toast } from 'sonner'
import { cn } from '@workspace/ui/lib/utils'
import type {
  ARProjectGroup,
  ARInvoice,
  ARSummary,
  ARBankAccount,
  ARPaymentHistory,
  StatusBayar,
  CreateInvoiceRequest,
  UpdatePaymentRequest,
  RecurringInterval,
} from '@/types/ar'
import {
  STATUS_BAYAR_LABEL,
  STATUS_KIRIM_LABEL,
  INTERVAL_LABEL,
  PAYMENT_METHODS,
  formatRp,
  formatRpShort,
  formatDate,
  isOverdue,
  previewRecurringDates,
} from '@/types/ar'

// ─── Searchable Select ───────────────────────────────────────────────────────

interface SearchableSelectOption { value: string; label: string }

function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = 'Pilih...',
  searchPlaceholder = 'Cari...',
  disabled,
}: {
  options: SearchableSelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((o) => !o); setSearch('') }}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background',
          'hover:bg-accent/30 focus:outline-none focus:ring-1 focus:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          open && 'ring-1 ring-ring'
        )}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDownIcon className={cn('ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="p-2 border-b">
            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded border-0 bg-transparent pl-7 pr-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Tidak ada hasil.</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent',
                    value === o.value && 'bg-accent/60 font-medium'
                  )}
                  onClick={() => { onValueChange(o.value); setOpen(false); setSearch('') }}
                >
                  <CheckIcon className={cn('h-3.5 w-3.5 shrink-0', value === o.value ? 'opacity-100' : 'opacity-0')} />
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Status badges ────────────────────────────────────────────────────────────

function StatusBayarBadge({ status }: { status: StatusBayar }) {
  const cls: Record<StatusBayar, string> = {
    belum: 'bg-gray-500 text-white',
    sebagian: 'bg-violet-600 text-white',
    lunas: 'bg-green-600 text-white',
    jatuh_tempo: 'bg-orange-500 text-white',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', cls[status])}>
      {STATUS_BAYAR_LABEL[status]}
    </span>
  )
}

function StatusKirimBadge({ status }: { status: 'reminder' | 'sent' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        status === 'sent' ? 'bg-green-600 text-white' : 'bg-yellow-400 text-yellow-900'
      )}
    >
      {STATUS_KIRIM_LABEL[status]}
    </span>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
  code,
  codeColor,
  title,
  value,
  subtitle,
}: {
  code: string
  codeColor: string
  title: string
  value: string
  subtitle: string
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
          style={{ background: codeColor }}
        >
          {code}
        </div>
        <div>
          <p className="text-lg font-bold leading-tight">{value}</p>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Overdue indicator ────────────────────────────────────────────────────────

function DeadlineCell({ deadline, status }: { deadline?: string | null; status: StatusBayar }) {
  if (!deadline) return <span className="text-muted-foreground">—</span>
  const overdue = isOverdue(deadline, status)
  const diffDays = overdue
    ? Math.floor((Date.now() - new Date(deadline).getTime()) / 86_400_000)
    : 0
  return (
    <div>
      <span className={overdue ? 'text-red-500 font-medium' : ''}>{formatDate(deadline)}</span>
      {overdue && <p className="text-red-500 text-xs">{diffDays} hari lewat</p>}
    </div>
  )
}

// ─── Payment History Table ────────────────────────────────────────────────────

function PaymentHistoryTable({ history }: { history: ARPaymentHistory[] }) {
  if (history.length === 0) return null
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Riwayat Pembayaran</p>
      <div className="overflow-x-auto rounded border text-xs">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 text-left">
              <th className="px-3 py-2">Tgl</th>
              <th className="px-3 py-2">Dibayar</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Bank</th>
              <th className="px-3 py-2">Catatan</th>
              <th className="px-3 py-2">Oleh</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(h.created_at)}</td>
                <td className="px-3 py-2 whitespace-nowrap font-medium">{formatRp(h.bayar_sekarang)}</td>
                <td className="px-3 py-2">
                  <StatusBayarBadge status={h.status_baru as StatusBayar} />
                </td>
                <td className="px-3 py-2">{h.bank_label ?? '—'}</td>
                <td className="px-3 py-2">{h.catatan_pembayaran ?? '—'}</td>
                <td className="px-3 py-2">{h.actor_name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Edit Payment Modal ───────────────────────────────────────────────────────

function EditPaymentModal({
  invoice,
  banks,
  open,
  onClose,
  onSaved,
}: {
  invoice: ARInvoice | null
  banks: ARBankAccount[]
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<UpdatePaymentRequest>({
    bayar_sekarang: 0,
    status_baru: 'sebagian',
    bank_id: '',
    deadline_baru: '',
    catatan_pembayaran: '',
  })
  const [history, setHistory] = useState<ARPaymentHistory[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (invoice && open) {
      setForm({
        bayar_sekarang: 0,
        status_baru: invoice.status_bayar,
        bank_id: invoice.bank_id ?? '',
        deadline_baru: invoice.deadline_bayar ?? '',
        catatan_pembayaran: '',
      })
      setHistory(invoice.payment_history ?? [])
    }
  }, [invoice, open])

  if (!invoice) return null

  const sisaSetelah = invoice.sisa_piutang - form.bayar_sekarang

  const handleSave = async () => {
    if (form.bayar_sekarang <= 0) { toast.error('Bayar sekarang harus > 0'); return }
    if (form.bayar_sekarang > invoice.sisa_piutang) { toast.error('Tidak boleh melebihi sisa piutang'); return }
    if (!form.bank_id) { toast.error('Bank wajib dipilih'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/ar/invoices/${invoice.id}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))).error) ?? `HTTP ${res.status}`)
      toast.success('Pembayaran berhasil dicatat')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Pembayaran — {invoice.no_invoice}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/30 p-3 text-xs">
            <div><p className="text-muted-foreground">Total Piutang</p><p className="font-semibold">{formatRp(invoice.total_piutang)}</p></div>
            <div><p className="text-muted-foreground">Sudah Dibayar</p><p className="font-semibold">{formatRp(invoice.sudah_dibayar)}</p></div>
            <div><p className="text-muted-foreground">Sisa Piutang</p><p className="font-semibold text-orange-500">{formatRp(invoice.sisa_piutang)}</p></div>
            <div><p className="text-muted-foreground">Sisa Setelah</p><p className={cn('font-semibold', sisaSetelah < 0 ? 'text-red-500' : 'text-green-600')}>{formatRp(Math.max(0, sisaSetelah))}</p></div>
          </div>

          <div>
            <label className="text-xs font-medium">Bayar Sekarang *</label>
            <Input
              type="number"
              value={form.bayar_sekarang || ''}
              onChange={(e) => setForm({ ...form, bayar_sekarang: Number(e.target.value) })}
              placeholder="0"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium">Status *</label>
            <Select value={form.status_baru} onValueChange={(v) => setForm({ ...form, status_baru: v as StatusBayar })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['belum','sebagian','lunas','jatuh_tempo'] as StatusBayar[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_BAYAR_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium">Bank Tujuan *</label>
            <div className="mt-1">
              <SearchableSelect
                options={banks.map((b) => ({ value: b.id, label: b.label }))}
                value={form.bank_id ?? ''}
                onValueChange={(v) => setForm({ ...form, bank_id: v })}
                placeholder="Pilih bank..."
                searchPlaceholder="Cari bank..."
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium">Deadline Baru (opsional)</label>
            <Input
              type="date"
              value={form.deadline_baru ?? ''}
              onChange={(e) => setForm({ ...form, deadline_baru: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-medium">Catatan Pembayaran</label>
            <Input
              value={form.catatan_pembayaran ?? ''}
              onChange={(e) => setForm({ ...form, catatan_pembayaran: e.target.value })}
              placeholder="misal: Transfer BCA 28 Mei 2026"
              className="mt-1"
            />
          </div>

          <PaymentHistoryTable history={history} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Pembayaran'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── New Invoice Modal ────────────────────────────────────────────────────────

interface ProjectOption { id: string; name: string; client_name: string; nilai_kontrak: number }

function NewInvoiceModal({
  open,
  onClose,
  onSaved,
  banks,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  banks: ARBankAccount[]
}) {
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [form, setForm] = useState<Partial<CreateInvoiceRequest>>({
    tipe_invoice: 'one_time',
    tgl_invoice: new Date().toISOString().split('T')[0],
    qty: 1,
    harga_satuan: 0,
    ppn_11_persen: false,
    sudah_dibayar: 0,
    status_bayar: 'belum',
    note_termin: '',
    payment_method: 'BCA',
    description: '',
  })
  const [noInvoice, setNoInvoice] = useState('')
  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(null)
  const [recurringDates, setRecurringDates] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    fetch('/api/ar/projects')
      .then((r) => r.json())
      .then((d) => {
        const list = (d.data ?? []).map((p: { id: string; project_name: string; client_name?: string; budget_amount?: number }) => ({
          id: p.id,
          name: p.project_name,
          client_name: p.client_name ?? '—',
          nilai_kontrak: p.budget_amount ?? 0,
        }))
        setProjects(list)
      })
      .catch(() => {})

    // Get next invoice number for today
    const today = new Date().toISOString().split('T')[0]
    fetch(`/api/ar/invoices/next-number?date=${today}`)
      .then((r) => r.json())
      .then((d) => setNoInvoice(d.no_invoice ?? ''))
      .catch(() => {})
  }, [open])

  useEffect(() => {
    if (
      form.tipe_invoice === 'recurring' &&
      form.recurring_start_date &&
      form.recurring_end_date &&
      form.recurring_interval
    ) {
      setRecurringDates(
        previewRecurringDates(
          form.recurring_start_date,
          form.recurring_end_date,
          form.recurring_interval as RecurringInterval
        )
      )
    } else {
      setRecurringDates([])
    }
  }, [form.tipe_invoice, form.recurring_start_date, form.recurring_end_date, form.recurring_interval])

  const subtotal = (form.qty ?? 0) * (form.harga_satuan ?? 0)
  const ppnAmount = form.ppn_11_persen ? subtotal * 0.11 : 0
  const totalPiutang = subtotal + ppnAmount
  const sisaPiutang = totalPiutang - (form.sudah_dibayar ?? 0)

  const handleProjectChange = (id: string) => {
    const proj = projects.find((p) => p.id === id) ?? null
    setSelectedProject(proj)
    setForm((f) => ({ ...f, project_id: id }))
  }

  const handleSave = async () => {
    if (!form.project_id) { toast.error('Pilih project terlebih dahulu'); return }
    if (!form.tgl_invoice) { toast.error('Tanggal invoice wajib diisi'); return }
    if ((form.qty ?? 0) <= 0) { toast.error('Qty harus > 0'); return }
    if ((form.sudah_dibayar ?? 0) > totalPiutang) { toast.error('Sudah dibayar tidak boleh melebihi total piutang'); return }

    setSaving(true)
    try {
      const payload: CreateInvoiceRequest = {
        project_id: form.project_id!,
        tipe_invoice: form.tipe_invoice!,
        no_invoice: noInvoice,
        tgl_invoice: form.tgl_invoice!,
        description: form.description ?? '',
        qty: form.qty!,
        harga_satuan: form.harga_satuan!,
        ppn_11_persen: form.ppn_11_persen!,
        recurring_start_date: form.recurring_start_date,
        recurring_end_date: form.recurring_end_date,
        recurring_interval: form.recurring_interval,
        sudah_dibayar: form.sudah_dibayar!,
        note_termin: form.note_termin ?? '',
        payment_method: form.payment_method ?? '',
        bank_id: form.bank_id,
        deadline_bayar: form.deadline_bayar,
        status_bayar: form.status_bayar!,
      }
      const res = await fetch('/api/ar/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      toast.success(`${json.data?.length ?? 1} invoice berhasil dibuat`)
      onSaved()
      onClose()
    } catch (e) {
      toast.error(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Baru</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          {/* Section: Project */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Informasi Project</p>
            <div>
              <label className="text-xs font-medium">Nama Project *</label>
              <div className="mt-1">
                <SearchableSelect
                  options={projects.map((p) => ({ value: p.id, label: p.name }))}
                  value={form.project_id ?? ''}
                  onValueChange={handleProjectChange}
                  placeholder="Pilih project..."
                  searchPlaceholder="Cari nama project..."
                />
              </div>
            </div>
            {selectedProject && (
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/30 p-3 text-xs">
                <div><p className="text-muted-foreground">Client</p><p className="font-medium">{selectedProject.client_name}</p></div>
                <div><p className="text-muted-foreground">Nilai Kontrak</p><p className="font-medium">{formatRp(selectedProject.nilai_kontrak)}</p></div>
              </div>
            )}
            <div>
              <label className="text-xs font-medium">Tipe Invoice *</label>
              <Select
                value={form.tipe_invoice}
                onValueChange={(v) => setForm((f) => ({ ...f, tipe_invoice: v as 'one_time' | 'recurring' }))}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-Time</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.tipe_invoice === 'recurring' && (
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-xs font-semibold">Konfigurasi Recurring</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">Tanggal Awal *</label>
                    <Input type="date" value={form.recurring_start_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, recurring_start_date: e.target.value }))} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Tanggal Akhir *</label>
                    <Input type="date" value={form.recurring_end_date ?? ''} onChange={(e) => setForm((f) => ({ ...f, recurring_end_date: e.target.value }))} className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium">Interval *</label>
                  <Select value={form.recurring_interval ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, recurring_interval: v as RecurringInterval }))}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih interval..." /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(INTERVAL_LABEL) as [RecurringInterval, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {recurringDates.length > 0 && (
                  <div className="rounded bg-muted/40 p-2 text-xs">
                    <p className="font-medium mb-1">{recurringDates.length} invoice akan dibuat:</p>
                    <p className="text-muted-foreground">{recurringDates.slice(0, 6).map(formatDate).join(' · ')}{recurringDates.length > 6 ? ` · +${recurringDates.length - 6} lagi` : ''}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Detail */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Detail Invoice</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">No Invoice</label>
                <Input value={noInvoice} onChange={(e) => setNoInvoice(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Tgl Invoice *</label>
                <Input type="date" value={form.tgl_invoice} onChange={(e) => setForm((f) => ({ ...f, tgl_invoice: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Deskripsi</label>
              <Input value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Keterangan pekerjaan..." className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Qty *</label>
                <Input type="number" value={form.qty ?? ''} onChange={(e) => setForm((f) => ({ ...f, qty: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Harga Satuan *</label>
                <Input type="number" value={form.harga_satuan ?? ''} onChange={(e) => setForm((f) => ({ ...f, harga_satuan: Number(e.target.value) }))} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ppn"
                checked={form.ppn_11_persen}
                onCheckedChange={(c) => setForm((f) => ({ ...f, ppn_11_persen: Boolean(c) }))}
              />
              <label htmlFor="ppn" className="text-xs cursor-pointer">PPN 11%</label>
            </div>
            <div className="grid grid-cols-3 gap-3 rounded-lg bg-muted/30 p-3 text-xs">
              <div><p className="text-muted-foreground">Subtotal</p><p className="font-medium">{formatRp(subtotal)}</p></div>
              <div><p className="text-muted-foreground">PPN</p><p className="font-medium">{formatRp(ppnAmount)}</p></div>
              <div><p className="text-muted-foreground">Total Piutang</p><p className="font-semibold text-primary">{formatRp(totalPiutang)}</p></div>
            </div>
          </div>

          {/* Section: Pembayaran */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Informasi Pembayaran</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Sudah Dibayar</label>
                <Input type="number" value={form.sudah_dibayar ?? ''} onChange={(e) => setForm((f) => ({ ...f, sudah_dibayar: Number(e.target.value) }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Sisa Piutang</label>
                <Input value={formatRp(Math.max(0, sisaPiutang))} readOnly className="mt-1 bg-muted" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Note / Termin</label>
              <Input value={form.note_termin ?? ''} onChange={(e) => setForm((f) => ({ ...f, note_termin: e.target.value }))} placeholder="misal: Pembayaran termin ke-1 dari 3" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Payment Method</label>
              <div className="mt-1 flex gap-2 flex-wrap">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, payment_method: m }))}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      form.payment_method === m
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-muted'
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Deadline Bayar</label>
                <Input type="date" value={form.deadline_bayar ?? ''} onChange={(e) => setForm((f) => ({ ...f, deadline_bayar: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Status</label>
                <Select value={form.status_bayar} onValueChange={(v) => setForm((f) => ({ ...f, status_bayar: v as StatusBayar }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['belum','sebagian','lunas','jatuh_tempo'] as StatusBayar[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_BAYAR_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Bank</label>
              <div className="mt-1">
                <SearchableSelect
                  options={banks.map((b) => ({ value: b.id, label: b.label }))}
                  value={form.bank_id ?? ''}
                  onValueChange={(v) => setForm((f) => ({ ...f, bank_id: v }))}
                  placeholder="Pilih bank (opsional)..."
                  searchPlaceholder="Cari bank..."
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : recurringDates.length > 1 ? `Buat ${recurringDates.length} Invoice` : 'Buat Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Invoice Row (Layer 2) ────────────────────────────────────────────────────

function InvoiceRow({
  invoice,
  onEdit,
  onArchive,
  selected,
  onSelect,
}: {
  invoice: ARInvoice
  onEdit: (inv: ARInvoice) => void
  onArchive: (inv: ARInvoice) => void
  selected: boolean
  onSelect: (id: string, checked: boolean) => void
}) {
  return (
    <tr className="border-t border-border/50 hover:bg-muted/20 text-xs">
      {invoice.tipe_invoice === 'recurring' && (
        <td className="px-2 py-2 w-8">
          <Checkbox
            checked={selected}
            onCheckedChange={(c) => onSelect(invoice.id, Boolean(c))}
          />
        </td>
      )}
      {invoice.tipe_invoice !== 'recurring' && <td className="w-8" />}
      <td className="px-3 py-2 font-mono font-medium">{invoice.no_invoice}</td>
      <td className="px-3 py-2 whitespace-nowrap">{formatDate(invoice.tgl_invoice)}</td>
      <td className="px-3 py-2">
        <span className={cn(
          'inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium',
          invoice.tipe_invoice === 'recurring' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
        )}>
          {invoice.tipe_invoice === 'recurring' ? `Recurring #${invoice.recurring_sequence}` : 'One-Time'}
        </span>
      </td>
      <td className="px-3 py-2 text-right font-medium">{formatRp(invoice.total_piutang)}</td>
      <td className="px-3 py-2 text-right text-green-600">{formatRp(invoice.sudah_dibayar)}</td>
      <td className={cn('px-3 py-2 text-right font-medium', invoice.sisa_piutang > 0 ? 'text-red-500' : '')}>
        {formatRp(invoice.sisa_piutang)}
      </td>
      <td className="px-3 py-2">
        <DeadlineCell deadline={invoice.deadline_bayar} status={invoice.status_bayar} />
      </td>
      <td className="px-3 py-2">
        <StatusBayarBadge status={invoice.status_bayar} />
      </td>
      <td className="px-3 py-2">
        {invoice.tipe_invoice === 'recurring' && (
          <StatusKirimBadge status={invoice.status_kirim} />
        )}
      </td>
      <td className="px-3 py-2 text-muted-foreground">{invoice.bank_label ?? '—'}</td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onEdit(invoice)}
          >
            <PencilIcon className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => onArchive(invoice)}
          >
            <ArchiveIcon className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ─── Project Row (Layer 1) ────────────────────────────────────────────────────

function ProjectRow({
  group,
  expanded,
  onToggle,
  onEditInvoice,
  onArchiveInvoice,
  onArchiveProject,
  selectedInvoices,
  onSelectInvoice,
}: {
  group: ARProjectGroup
  expanded: boolean
  onToggle: () => void
  onEditInvoice: (inv: ARInvoice) => void
  onArchiveInvoice: (inv: ARInvoice) => void
  onArchiveProject: (g: ARProjectGroup) => void
  selectedInvoices: Set<string>
  onSelectInvoice: (id: string, checked: boolean) => void
}) {
  return (
    <>
      <tr
        className="border-t cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <td className="px-3 py-3 w-8">
          {expanded ? (
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </td>
        <td className="px-3 py-3">
          <p className="font-semibold text-sm">{group.project_name}</p>
          <p className="text-xs text-muted-foreground">{group.invoice_count} invoice</p>
        </td>
        <td className="px-3 py-3 text-sm text-muted-foreground">{group.client_name}</td>
        <td className="px-3 py-3 text-sm text-right">{formatRpShort(group.nilai_kontrak)}</td>
        <td className="px-3 py-3 text-sm text-right font-medium">{formatRpShort(group.total_piutang)}</td>
        <td className="px-3 py-3 text-sm text-right text-green-600">{formatRpShort(group.sudah_dibayar)}</td>
        <td className={cn('px-3 py-3 text-sm text-right font-medium', group.sisa_piutang > 0 ? 'text-red-500' : '')}>
          {formatRpShort(group.sisa_piutang)}
        </td>
        <td className="px-3 py-3">
          <StatusBayarBadge status={group.status_project} />
        </td>
        <td className="px-3 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onArchiveProject(group) }}
          >
            <ArchiveIcon className="h-3 w-3 mr-1" />
            Arsipkan
          </Button>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={9} className="p-0">
            <div className="bg-muted/10 border-l-2 border-primary/30 ml-8 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wide">
                    <th className="w-8 px-2 py-2" />
                    <th className="px-3 py-2 text-left">No Invoice</th>
                    <th className="px-3 py-2 text-left">Tgl</th>
                    <th className="px-3 py-2 text-left">Tipe</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Dibayar</th>
                    <th className="px-3 py-2 text-right">Sisa</th>
                    <th className="px-3 py-2 text-left">Deadline</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Kirim</th>
                    <th className="px-3 py-2 text-left">Bank</th>
                    <th className="px-3 py-2 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {group.invoices.map((inv) => (
                    <InvoiceRow
                      key={inv.id}
                      invoice={inv}
                      onEdit={onEditInvoice}
                      onArchive={onArchiveInvoice}
                      selected={selectedInvoices.has(inv.id)}
                      onSelect={onSelectInvoice}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Confirm Archive Dialog ───────────────────────────────────────────────────

function ConfirmDialog({
  open,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Konfirmasi</DialogTitle>
        </DialogHeader>
        <p className="text-sm">{message}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Batal</Button>
          <Button variant="destructive" onClick={onConfirm}>Ya, Arsipkan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { key: 'semua', label: 'Semua' },
  { key: 'belum', label: 'Belum Dibayar' },
  { key: 'sebagian', label: 'Sebagian' },
  { key: 'jatuh_tempo', label: 'Jatuh Tempo' },
  { key: 'lunas', label: 'Lunas' },
  { key: 'arsip', label: 'Arsip' },
] as const

type FilterKey = (typeof FILTER_TABS)[number]['key']

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ARMonitoringPage() {
  const [groups, setGroups] = useState<ARProjectGroup[]>([])
  const [summary, setSummary] = useState<ARSummary | null>(null)
  const [banks, setBanks] = useState<ARBankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('semua')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())

  // Modals
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [editInvoice, setEditInvoice] = useState<ARInvoice | null>(null)
  const [confirmArchive, setConfirmArchive] = useState<{
    message: string
    onConfirm: () => Promise<void>
  } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'semua') params.set('status_bayar', filter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/ar/invoices?${params}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(json.error === 'Unauthorized' ? 'Sesi habis, silakan login kembali' : (json.error ?? `Error ${res.status}`))
        return
      }
      setGroups(json.data ?? [])
      setSummary(json.summary ?? null)
    } catch {
      toast.error('Gagal memuat data AR')
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    fetch('/api/ar/bank-accounts')
      .then((r) => r.json())
      .then((d) => setBanks(d.data ?? []))
      .catch(() => {})
  }, [])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const expandAll = () => setExpandedIds(new Set(groups.map((g) => g.project_id)))
  const collapseAll = () => setExpandedIds(new Set())

  const handleSelectInvoice = (id: string, checked: boolean) => {
    setSelectedInvoices((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }

  const handleBulkKirim = async () => {
    if (selectedInvoices.size === 0) return
    try {
      const res = await fetch('/api/ar/invoices/bulk-kirim', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_ids: Array.from(selectedInvoices) }),
      })
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))).error) ?? `HTTP ${res.status}`)
      toast.success(`${selectedInvoices.size} invoice ditandai Sent`)
      setSelectedInvoices(new Set())
      fetchData()
    } catch (e) {
      toast.error(String(e))
    }
  }

  const handleArchiveInvoice = (inv: ARInvoice) => {
    setConfirmArchive({
      message: `Yakin mengarsipkan invoice ${inv.no_invoice}?`,
      onConfirm: async () => {
        const res = await fetch(`/api/ar/invoices/${inv.id}/archive`, { method: 'PATCH' })
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))).error) ?? `HTTP ${res.status}`)
        toast.success('Invoice diarsipkan')
        setConfirmArchive(null)
        fetchData()
      },
    })
  }

  const handleArchiveProject = (grp: ARProjectGroup) => {
    setConfirmArchive({
      message: `Yakin mengarsipkan semua invoice dari project "${grp.project_name}"?`,
      onConfirm: async () => {
        const res = await fetch('/api/ar/invoices/bulk-archive', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: grp.project_id }),
        })
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))).error) ?? `HTTP ${res.status}`)
        toast.success('Semua invoice project diarsipkan')
        setConfirmArchive(null)
        fetchData()
      },
    })
  }

  const handleEditInvoice = async (inv: ARInvoice) => {
    // Fetch latest detail + history
    const res = await fetch(`/api/ar/invoices/${inv.id}`)
    const json = await res.json()
    setEditInvoice(json.data ?? inv)
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">AR Monitoring</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitoring piutang per project — track invoice, deadline, dan status pembayaran client.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard
          code="AR"
          codeColor="#2563eb"
          title="Total Piutang"
          value={summary ? formatRpShort(summary.total_piutang) : '—'}
          subtitle={`${summary?.total_invoice_count ?? 0} invoice aktif`}
        />
        <KPICard
          code="PD"
          codeColor="#16a34a"
          title="Sudah Dibayar"
          value={summary ? formatRpShort(summary.sudah_dibayar) : '—'}
          subtitle={summary ? `${summary.collection_pct.toFixed(1)}% collection rate` : ''}
        />
        <KPICard
          code="SP"
          codeColor="#ea580c"
          title="Sisa Piutang"
          value={summary ? formatRpShort(summary.sisa_piutang) : '—'}
          subtitle={summary ? `${summary.outstanding_pct.toFixed(1)}% outstanding` : ''}
        />
        <KPICard
          code="OD"
          codeColor="#d97706"
          title="Jatuh Tempo"
          value={summary ? String(summary.jatuh_tempo_count) : '—'}
          subtitle="invoice overdue"
        />
        <KPICard
          code="DSO"
          codeColor="#7c3aed"
          title="DSO"
          value={summary ? `${summary.dso_hari} hari` : '—'}
          subtitle="avg collection days"
        />
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari project atau client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                filter === tab.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk toolbar */}
      {selectedInvoices.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-4 py-2 text-sm">
          <span className="font-medium text-blue-700 dark:text-blue-300">
            {selectedInvoices.size} invoice dipilih
          </span>
          <Button size="sm" variant="default" className="h-7 text-xs" onClick={handleBulkKirim}>
            <SendIcon className="h-3 w-3 mr-1" />
            Tandai Sudah Dikirim
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedInvoices(new Set())}>
            Batal
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
          <p className="text-sm font-semibold">
            AR Daftar Project &amp; Piutang ({groups.length})
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={collapseAll}>
              <ChevronsDownUpIcon className="h-3 w-3 mr-1" />
              Collapse All
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={expandAll}>
              <ChevronsUpDownIcon className="h-3 w-3 mr-1" />
              Expand All
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchData}>
              <RefreshCwIcon className="h-3 w-3 mr-1" />
              Refresh
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => setNewModalOpen(true)}>
              <PlusIcon className="h-3 w-3 mr-1" />
              Invoice Baru
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wide">
                <th className="w-8 px-3 py-3" />
                <th className="px-3 py-3 text-left">Project</th>
                <th className="px-3 py-3 text-left">Client</th>
                <th className="px-3 py-3 text-right">Kontrak</th>
                <th className="px-3 py-3 text-right">Piutang</th>
                <th className="px-3 py-3 text-right">Dibayar</th>
                <th className="px-3 py-3 text-right">Sisa</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Memuat data...
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Tidak ada data piutang {filter !== 'semua' ? `dengan status "${filter}"` : ''}.
                  </td>
                </tr>
              ) : (
                groups.map((grp) => (
                  <ProjectRow
                    key={grp.project_id}
                    group={grp}
                    expanded={expandedIds.has(grp.project_id)}
                    onToggle={() => toggleExpand(grp.project_id)}
                    onEditInvoice={handleEditInvoice}
                    onArchiveInvoice={handleArchiveInvoice}
                    onArchiveProject={handleArchiveProject}
                    selectedInvoices={selectedInvoices}
                    onSelectInvoice={handleSelectInvoice}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <NewInvoiceModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onSaved={fetchData}
        banks={banks}
      />

      <EditPaymentModal
        invoice={editInvoice}
        banks={banks}
        open={!!editInvoice}
        onClose={() => setEditInvoice(null)}
        onSaved={fetchData}
      />

      <ConfirmDialog
        open={!!confirmArchive}
        message={confirmArchive?.message ?? ''}
        onConfirm={async () => {
          try {
            await confirmArchive?.onConfirm()
          } catch (e) {
            toast.error(String(e))
            setConfirmArchive(null)
          }
        }}
        onCancel={() => setConfirmArchive(null)}
      />
    </div>
  )
}
