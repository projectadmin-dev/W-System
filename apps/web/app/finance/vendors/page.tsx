'use client'

import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { cn } from '@workspace/ui/lib/utils'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Badge } from '@workspace/ui/components/badge'
import { Textarea } from '@workspace/ui/components/textarea'
import { Separator } from '@workspace/ui/components/separator'
import { Switch } from '@workspace/ui/components/switch'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Card, CardContent } from '@workspace/ui/components/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@workspace/ui/components/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@workspace/ui/components/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose,
} from '@workspace/ui/components/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import {
  PlusIcon, SearchIcon, RefreshCwIcon, MoreVerticalIcon,
  PencilIcon, Trash2Icon, BuildingIcon, UserIcon,
  CreditCardIcon, PhoneIcon, MailIcon, GlobeIcon,
  Loader2Icon, CheckCircle2Icon, XCircleIcon,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface COA { id: string; account_code: string; account_name: string }

interface Vendor {
  id: string
  vendor_code: string
  vendor_name: string
  vendor_type: 'company' | 'individual'
  vendor_category: string
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  npwp: string | null
  tax_type: 'pkp' | 'non_pkp'
  payment_terms_days: number
  payment_method: string
  currency: string
  credit_limit: number | null
  bank_name: string | null
  bank_account_name: string | null
  bank_account_number: string | null
  pic_name: string | null
  pic_email: string | null
  pic_phone: string | null
  notes: string | null
  is_active: boolean
  coa: COA | null
}

const EMPTY_FORM: Omit<Vendor, 'id' | 'vendor_code' | 'coa'> = {
  vendor_name: '',
  vendor_type: 'company',
  vendor_category: 'supplier',
  email: '',
  phone: '',
  address: '',
  website: '',
  npwp: '',
  tax_type: 'non_pkp',
  payment_terms_days: 30,
  payment_method: 'transfer',
  currency: 'IDR',
  credit_limit: null,
  bank_name: '',
  bank_account_name: '',
  bank_account_number: '',
  pic_name: '',
  pic_email: '',
  pic_phone: '',
  notes: '',
  is_active: true,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  software:       { label: 'Software',       color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  cloud_services: { label: 'Cloud/SaaS',     color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300' },
  hardware:       { label: 'Hardware',       color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  consulting:     { label: 'Consulting',     color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  freelancer:     { label: 'Freelancer',     color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
  service:        { label: 'Jasa Layanan',   color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  supplier:       { label: 'Supplier',       color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  other:          { label: 'Lainnya',        color: 'bg-muted text-muted-foreground' },
}

function CategoryBadge({ cat }: { cat: string }) {
  const m = CATEGORY_META[cat] ?? CATEGORY_META['other']!
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', m.color)}>
      {m.label}
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return active
    ? <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0 gap-1"><CheckCircle2Icon className="w-3 h-3" />Aktif</Badge>
    : <Badge className="bg-muted text-muted-foreground border-0 gap-1"><XCircleIcon className="w-3 h-3" />Nonaktif</Badge>
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{children}</p>
      <Separator className="mb-4" />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VendorsPage() {
  const [vendors, setVendors]         = useState<Vendor[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatus]     = useState<'all' | 'active' | 'inactive'>('all')
  const [categoryFilter, setCategory] = useState('all')
  const [sheetOpen, setSheetOpen]     = useState(false)
  const [editTarget, setEditTarget]   = useState<Vendor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)
  const [form, setForm]               = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM })
  const [vendorCode, setVendorCode]   = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/vendors?size=200')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? `Error ${res.status}`); return }
      setVendors(json.data ?? [])
    } catch { toast.error('Gagal memuat data vendor') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    vendors.length,
    active:   vendors.filter(v => v.is_active).length,
    inactive: vendors.filter(v => !v.is_active).length,
    pkp:      vendors.filter(v => v.tax_type === 'pkp').length,
  }), [vendors])

  // ── Filtered rows ──────────────────────────────────────────────────────────
  const rows = useMemo(() => vendors.filter(v => {
    if (statusFilter === 'active'   && !v.is_active) return false
    if (statusFilter === 'inactive' &&  v.is_active) return false
    if (categoryFilter !== 'all'    && v.vendor_category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        v.vendor_name.toLowerCase().includes(q) ||
        v.vendor_code.toLowerCase().includes(q) ||
        (v.email ?? '').toLowerCase().includes(q) ||
        (v.npwp ?? '').includes(q)
      )
    }
    return true
  }), [vendors, statusFilter, categoryFilter, search])

  // ── Sheet open helpers ─────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null)
    setVendorCode('')
    setForm({ ...EMPTY_FORM })
    setSheetOpen(true)
  }

  const openEdit = (v: Vendor) => {
    setEditTarget(v)
    setVendorCode(v.vendor_code)
    setForm({
      vendor_name:         v.vendor_name,
      vendor_type:         v.vendor_type,
      vendor_category:     v.vendor_category,
      email:               v.email ?? '',
      phone:               v.phone ?? '',
      address:             v.address ?? '',
      website:             v.website ?? '',
      npwp:                v.npwp ?? '',
      tax_type:            v.tax_type,
      payment_terms_days:  v.payment_terms_days ?? 30,
      payment_method:      v.payment_method ?? 'transfer',
      currency:            v.currency ?? 'IDR',
      credit_limit:        v.credit_limit,
      bank_name:           v.bank_name ?? '',
      bank_account_name:   v.bank_account_name ?? '',
      bank_account_number: v.bank_account_number ?? '',
      pic_name:            v.pic_name ?? '',
      pic_email:           v.pic_email ?? '',
      pic_phone:           v.pic_phone ?? '',
      notes:               v.notes ?? '',
      is_active:           v.is_active,
    })
    setSheetOpen(true)
  }

  const set = (k: keyof typeof EMPTY_FORM, val: unknown) =>
    setForm(f => ({ ...f, [k]: val }))

  // ── Save (create / update) ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.vendor_name.trim()) { toast.error('Nama vendor wajib diisi'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        vendor_code: vendorCode || undefined,
        payment_terms_days: Number(form.payment_terms_days),
        credit_limit: form.credit_limit ? Number(form.credit_limit) : null,
      }

      const res = editTarget
        ? await fetch(`/api/finance/vendors/${editTarget.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/finance/vendors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Gagal menyimpan'); return }

      toast.success(editTarget ? 'Vendor berhasil diperbarui' : 'Vendor berhasil ditambahkan')
      setSheetOpen(false)
      load()
    } catch (e) { toast.error(String(e)) } finally { setSaving(false) }
  }

  // ── Toggle active ──────────────────────────────────────────────────────────
  const toggleActive = async (v: Vendor) => {
    try {
      const res = await fetch(`/api/finance/vendors/${v.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !v.is_active }),
      })
      if (!res.ok) { toast.error('Gagal mengubah status'); return }
      toast.success(v.is_active ? 'Vendor dinonaktifkan' : 'Vendor diaktifkan')
      load()
    } catch { toast.error('Terjadi kesalahan') }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/finance/vendors/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Gagal menghapus vendor'); return }
      toast.success('Vendor dihapus')
      setDeleteTarget(null)
      load()
    } catch { toast.error('Terjadi kesalahan') }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Master Data Vendor</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola supplier, mitra teknologi, dan penyedia jasa
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <PlusIcon className="w-4 h-4" />
          Tambah Vendor
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Vendor',  value: stats.total,    color: 'text-foreground' },
          { label: 'Aktif',         value: stats.active,   color: 'text-green-600' },
          { label: 'Nonaktif',      value: stats.inactive, color: 'text-muted-foreground' },
          { label: 'PKP',           value: stats.pkp,      color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border shadow-none">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              {loading
                ? <Skeleton className="h-8 w-12" />
                : <p className={cn('text-3xl font-bold', color)}>{value}</p>
              }
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, kode, email, NPWP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status filter */}
        <div className="flex rounded-md border overflow-hidden text-sm">
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                'px-3 py-1.5 transition-colors',
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-muted text-muted-foreground'
              )}
            >
              {s === 'all' ? 'Semua' : s === 'active' ? 'Aktif' : 'Nonaktif'}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <Select value={categoryFilter} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            <SelectItem value="software">Software</SelectItem>
            <SelectItem value="cloud_services">Cloud / SaaS</SelectItem>
            <SelectItem value="hardware">Hardware</SelectItem>
            <SelectItem value="consulting">Consulting</SelectItem>
            <SelectItem value="freelancer">Freelancer</SelectItem>
            <SelectItem value="service">Jasa Layanan</SelectItem>
            <SelectItem value="supplier">Supplier Umum</SelectItem>
            <SelectItem value="other">Lainnya</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {rows.length} dari {vendors.length} vendor
        </span>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCwIcon className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-32">Kode</TableHead>
              <TableHead>Nama Vendor</TableHead>
              <TableHead className="w-36">Kategori</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead className="w-36">NPWP / Pajak</TableHead>
              <TableHead className="w-28 text-right">Term Bayar</TableHead>
              <TableHead>Bank Tujuan</TableHead>
              <TableHead className="w-24 text-center">Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  {search || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'Tidak ada vendor yang cocok dengan filter.'
                    : 'Belum ada vendor. Klik "+ Tambah Vendor" untuk memulai.'}
                </TableCell>
              </TableRow>
            ) : (
              rows.map(v => (
                <TableRow key={v.id} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-xs text-muted-foreground">{v.vendor_code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {v.vendor_type === 'company'
                          ? <BuildingIcon className="w-3.5 h-3.5" />
                          : <UserIcon className="w-3.5 h-3.5" />}
                      </span>
                      <span className="font-medium text-sm">{v.vendor_name}</span>
                    </div>
                  </TableCell>
                  <TableCell><CategoryBadge cat={v.vendor_category} /></TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {v.email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MailIcon className="w-3 h-3 shrink-0" />
                          {v.email}
                        </div>
                      )}
                      {v.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <PhoneIcon className="w-3 h-3 shrink-0" />
                          {v.phone}
                        </div>
                      )}
                      {v.pic_name && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <UserIcon className="w-3 h-3 shrink-0" />
                          {v.pic_name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {v.npwp
                      ? <div>
                          <p className="text-xs font-mono">{v.npwp}</p>
                          <span className={cn(
                            'text-[10px] font-semibold rounded px-1.5 py-0.5',
                            v.tax_type === 'pkp'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-muted text-muted-foreground'
                          )}>
                            {v.tax_type === 'pkp' ? 'PKP' : 'Non-PKP'}
                          </span>
                        </div>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {v.payment_terms_days
                      ? <span>{v.payment_terms_days}h</span>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {v.bank_name
                      ? <div>
                          <div className="flex items-center gap-1 text-xs">
                            <CreditCardIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="font-medium">{v.bank_name}</span>
                          </div>
                          {v.bank_account_number && (
                            <p className="text-xs text-muted-foreground font-mono ml-4">{v.bank_account_number}</p>
                          )}
                          {v.bank_account_name && (
                            <p className="text-xs text-muted-foreground ml-4">{v.bank_account_name}</p>
                          )}
                        </div>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge active={v.is_active} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreVerticalIcon className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(v)}>
                          <PencilIcon className="w-4 h-4 mr-2" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(v)}>
                          {v.is_active
                            ? <><XCircleIcon className="w-4 h-4 mr-2" />Nonaktifkan</>
                            : <><CheckCircle2Icon className="w-4 h-4 mr-2" />Aktifkan</>}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(v)}
                        >
                          <Trash2Icon className="w-4 h-4 mr-2" />Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Create / Edit Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto flex flex-col">
          <SheetHeader className="pb-2">
            <SheetTitle>{editTarget ? `Edit: ${editTarget.vendor_name}` : 'Tambah Vendor Baru'}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-6 pr-1">

            {/* — Identitas — */}
            <SectionTitle>Identitas Vendor</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nama Vendor" required>
                <Input
                  value={form.vendor_name}
                  onChange={e => set('vendor_name', e.target.value)}
                  placeholder="PT Teknologi Maju"
                />
              </FormField>
              <FormField label="Kode Vendor">
                <Input
                  value={vendorCode}
                  onChange={e => setVendorCode(e.target.value)}
                  placeholder="Auto-generate jika kosong"
                  className="font-mono"
                />
              </FormField>
              <FormField label="Tipe Entitas">
                <Select value={form.vendor_type} onValueChange={v => set('vendor_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Perusahaan (PT/CV/Firma)</SelectItem>
                    <SelectItem value="individual">Perorangan</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Kategori">
                <Select value={form.vendor_category} onValueChange={v => set('vendor_category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="software">Software</SelectItem>
                    <SelectItem value="cloud_services">Cloud / SaaS</SelectItem>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="consulting">Consulting</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="service">Jasa Layanan</SelectItem>
                    <SelectItem value="supplier">Supplier Umum</SelectItem>
                    <SelectItem value="other">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            {/* — Kontak & Alamat — */}
            <SectionTitle>Kontak &amp; Alamat</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email">
                <Input
                  type="email"
                  value={form.email ?? ''}
                  onChange={e => set('email', e.target.value)}
                  placeholder="finance@vendor.com"
                />
              </FormField>
              <FormField label="Telepon">
                <Input
                  value={form.phone ?? ''}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="+62 21 1234 5678"
                />
              </FormField>
              <FormField label="Website">
                <div className="relative">
                  <GlobeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={form.website ?? ''}
                    onChange={e => set('website', e.target.value)}
                    placeholder="https://vendor.com"
                    className="pl-8"
                  />
                </div>
              </FormField>
            </div>
            <FormField label="Alamat">
              <Textarea
                value={form.address ?? ''}
                onChange={e => set('address', e.target.value)}
                placeholder="Jl. Sudirman No. 1, Jakarta Pusat"
                rows={2}
              />
            </FormField>

            {/* — PIC — */}
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Nama PIC">
                <Input
                  value={form.pic_name ?? ''}
                  onChange={e => set('pic_name', e.target.value)}
                  placeholder="Budi Santoso"
                />
              </FormField>
              <FormField label="Email PIC">
                <Input
                  type="email"
                  value={form.pic_email ?? ''}
                  onChange={e => set('pic_email', e.target.value)}
                  placeholder="budi@vendor.com"
                />
              </FormField>
              <FormField label="Telepon PIC">
                <Input
                  value={form.pic_phone ?? ''}
                  onChange={e => set('pic_phone', e.target.value)}
                  placeholder="+62 812 3456 7890"
                />
              </FormField>
            </div>

            {/* — Perpajakan — */}
            <SectionTitle>Perpajakan</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="NPWP">
                <Input
                  value={form.npwp ?? ''}
                  onChange={e => set('npwp', e.target.value)}
                  placeholder="01.234.567.8-901.000"
                  className="font-mono"
                />
              </FormField>
              <FormField label="Status Pajak">
                <Select value={form.tax_type} onValueChange={v => set('tax_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pkp">PKP (Pengusaha Kena Pajak)</SelectItem>
                    <SelectItem value="non_pkp">Non-PKP</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            {/* — Keuangan — */}
            <SectionTitle>Informasi Keuangan</SectionTitle>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Term Pembayaran (Hari)">
                <Input
                  type="number"
                  min={0}
                  value={form.payment_terms_days}
                  onChange={e => set('payment_terms_days', Number(e.target.value))}
                  placeholder="30"
                />
              </FormField>
              <FormField label="Metode Pembayaran">
                <Select value={form.payment_method} onValueChange={v => set('payment_method', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transfer Bank</SelectItem>
                    <SelectItem value="cash">Tunai</SelectItem>
                    <SelectItem value="check">Cek / Giro</SelectItem>
                    <SelectItem value="virtual_account">Virtual Account</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Mata Uang">
                <Select value={form.currency} onValueChange={v => set('currency', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDR">IDR — Rupiah</SelectItem>
                    <SelectItem value="USD">USD — Dollar</SelectItem>
                    <SelectItem value="SGD">SGD — Singapore Dollar</SelectItem>
                    <SelectItem value="EUR">EUR — Euro</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Nama Bank">
                <Input
                  value={form.bank_name ?? ''}
                  onChange={e => set('bank_name', e.target.value)}
                  placeholder="BCA / Mandiri / BNI"
                />
              </FormField>
              <FormField label="No. Rekening">
                <Input
                  value={form.bank_account_number ?? ''}
                  onChange={e => set('bank_account_number', e.target.value)}
                  placeholder="1234567890"
                  className="font-mono"
                />
              </FormField>
              <FormField label="Atas Nama">
                <Input
                  value={form.bank_account_name ?? ''}
                  onChange={e => set('bank_account_name', e.target.value)}
                  placeholder="PT Teknologi Maju"
                />
              </FormField>
            </div>

            {/* — Catatan & Status — */}
            <SectionTitle>Lainnya</SectionTitle>
            <FormField label="Catatan Internal">
              <Textarea
                value={form.notes ?? ''}
                onChange={e => set('notes', e.target.value)}
                placeholder="Catatan internal tentang vendor ini..."
                rows={3}
              />
            </FormField>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Status Vendor</p>
                <p className="text-xs text-muted-foreground">Vendor nonaktif tidak dapat dipilih di transaksi baru</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={v => set('is_active', v)}
              />
            </div>
          </div>

          <SheetFooter className="pt-4 border-t gap-2 flex-shrink-0">
            <SheetClose asChild>
              <Button variant="outline" disabled={saving}>Batal</Button>
            </SheetClose>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2Icon className="w-4 h-4 animate-spin" />}
              {editTarget ? 'Simpan Perubahan' : 'Tambah Vendor'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              Vendor <span className="font-semibold">{deleteTarget?.vendor_name}</span> akan dihapus secara permanen.
              Aksi ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
