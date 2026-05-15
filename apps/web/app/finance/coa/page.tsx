'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  PlusIcon, Loader2Icon, FilterIcon, DropletsIcon,
  Trash2Icon, PencilIcon
} from 'lucide-react'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@workspace/ui/components/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@workspace/ui/components/select'

interface COA {
  id: string
  code?: string
  account_code?: string
  account_name: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  parent_id?: string | null
  parent_account_id?: string | null
  description: string | null
  is_active: boolean
  cash_flow_category?: string | null
}

const typeConfig: Record<string, { color: string; bg: string }> = {
  asset: { color: 'text-blue-700', bg: 'bg-blue-50' },
  liability: { color: 'text-red-700', bg: 'bg-red-50' },
  equity: { color: 'text-purple-700', bg: 'bg-purple-50' },
  revenue: { color: 'text-emerald-700', bg: 'bg-emerald-50' },
  expense: { color: 'text-amber-700', bg: 'bg-amber-50' },
}

const cfConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  operating: { label: 'Operating', color: 'text-blue-700', bg: 'bg-blue-50', icon: '🔄' },
  investing: { label: 'Investing', color: 'text-purple-700', bg: 'bg-purple-50', icon: '📊' },
  financing: { label: 'Financing', color: 'text-amber-700', bg: 'bg-amber-50', icon: '💰' },
  non_cash: { label: 'Non-Cash', color: 'text-slate-700', bg: 'bg-slate-100', icon: '⚡' },
  not_applicable: { label: 'N/A', color: 'text-muted-foreground', bg: 'bg-muted', icon: '—' },
}

function getNormalBalance(type: string) {
  return type === 'asset' || type === 'expense' ? 'debit' : 'credit'
}

const emptyForm = {
  code: '',
  account_name: '',
  account_type: 'asset',
  parent_id: '',
  description: '',
  cash_flow_category: 'not_applicable' as string,
  is_active: true,
}

export default function COAPage() {
  const [coaList, setCoaList] = useState<COA[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [filterCF, setFilterCF] = useState('all')

  // Create modal
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ ...emptyForm })
  const [updating, setUpdating] = useState(false)

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => { loadCOA() }, [filterType, filterCF])

  async function loadCOA() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') params.set('type', filterType)
      if (filterCF !== 'all') params.set('cashFlowCategory', filterCF)
      const url = `/api/finance/coa${params.toString() ? '?' + params.toString() : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCoaList(Array.isArray(data) ? data : data.data || [])
    } catch {
      toast.error('Gagal memuat Chart of Accounts')
    } finally { setLoading(false) }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code.trim() || !form.account_name.trim()) {
      toast.error('Kode akun dan nama akun wajib diisi')
      return
    }
    setSaving(true)
    try {
      const payload = {
        account_code: form.code.trim(),
        account_name: form.account_name.trim(),
        account_type: form.account_type,
        level: 1,
        normal_balance: getNormalBalance(form.account_type),
        parent_account_id: form.parent_id?.trim() || null,
        description: form.description?.trim() || null,
        cash_flow_category: form.cash_flow_category === 'not_applicable' ? null : form.cash_flow_category,
        is_active: form.is_active,
      }
      const res = await fetch('/api/finance/coa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || err.message || 'Gagal membuat akun')
      }
      toast.success('Akun berhasil dibuat')
      setIsOpen(false)
      setForm({ ...emptyForm })
      await loadCOA()
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat akun')
    } finally { setSaving(false) }
  }

  function openEdit(coa: COA) {
    setEditId(coa.id)
    setEditForm({
      code: coa.account_code || coa.code || '',
      account_name: coa.account_name,
      account_type: coa.account_type,
      parent_id: coa.parent_account_id || coa.parent_id || '',
      description: coa.description || '',
      cash_flow_category: coa.cash_flow_category || 'not_applicable',
      is_active: coa.is_active,
    })
    setEditOpen(true)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    if (!editForm.code.trim() || !editForm.account_name.trim()) {
      toast.error('Kode akun dan nama akun wajib diisi')
      return
    }
    setUpdating(true)
    try {
      const payload = {
        account_code: editForm.code.trim(),
        account_name: editForm.account_name.trim(),
        account_type: editForm.account_type,
        normal_balance: getNormalBalance(editForm.account_type),
        parent_account_id: editForm.parent_id?.trim() || null,
        description: editForm.description?.trim() || null,
        cash_flow_category: editForm.cash_flow_category === 'not_applicable' ? null : editForm.cash_flow_category,
        is_active: editForm.is_active,
      }
      const res = await fetch(`/api/finance/coa?id=${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || err.message || 'Gagal memperbarui akun')
      }
      toast.success('Akun berhasil diperbarui')
      setEditOpen(false)
      setEditId(null)
      await loadCOA()
    } catch (err: any) {
      toast.error(err.message || 'Gagal memperbarui akun')
    } finally { setUpdating(false) }
  }

  function openDelete(id: string) {
    setDeleteId(id)
    setConfirmOpen(true)
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/finance/coa?id=${deleteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || err.message || 'Gagal menghapus akun')
      }
      toast.success('Akun berhasil dihapus')
      setConfirmOpen(false)
      setDeleteId(null)
      await loadCOA()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus akun')
    } finally { setDeleting(false) }
  }

  const filteredList = coaList

  const cfCounts: Record<string, number> = {}
  coaList.forEach(c => {
    const cf = c.cash_flow_category || 'not_applicable'
    cfCounts[cf] = (cfCounts[cf] || 0) + 1
  })

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DropletsIcon className="w-6 h-6 text-blue-600" />
            Chart of Accounts
          </h1>
          <p className="text-muted-foreground">Kelola struktur akun — termasuk tagging Cash Flow untuk laporan arus kas.</p>
        </div>
        <Button onClick={() => setIsOpen(true)}><PlusIcon className="h-4 w-4 mr-2" /> Tambah Akun</Button>
      </div>

      {/* Cash Flow Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(cfConfig).map(([key, cfg]) => {
          const count = cfCounts[key] || 0
          return (
            <Card key={key} className={`cursor-pointer transition-colors hover:border-primary ${filterCF === key ? 'border-primary ring-1 ring-primary' : ''}`}
              onClick={() => setFilterCF(filterCF === key ? 'all' : key)}>
              <CardContent className="p-3 text-center">
                <p className="text-2xl">{cfg.icon}</p>
                <p className={`text-lg font-bold ${cfg.color}`}>{count}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {['all', 'asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => (
            <Button key={type} variant={filterType === type ? 'default' : 'outline'} size="sm"
              onClick={() => setFilterType(type)}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <FilterIcon className="w-4 h-4 text-muted-foreground" />
          <Select value={filterCF} onValueChange={setFilterCF}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Cash Flow Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="operating">🔄 Operating</SelectItem>
              <SelectItem value="investing">📊 Investing</SelectItem>
              <SelectItem value="financing">💰 Financing</SelectItem>
              <SelectItem value="non_cash">⚡ Non-Cash</SelectItem>
              <SelectItem value="not_applicable">— Not Applicable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Code</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Account Name</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Cash Flow</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Description</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Loader2Icon className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">Tidak ada akun ditemukan.</td>
                  </tr>
                ) : (
                  filteredList.map((coa) => {
                    const cfg = typeConfig[coa.account_type] || {}
                    const cf = cfConfig[coa.cash_flow_category || 'not_applicable'] || cfConfig.not_applicable
                    return (
                      <tr key={coa.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3 text-sm font-mono">{coa.account_code || coa.code}</td>
                        <td className="px-6 py-3 text-sm font-medium">{coa.account_name}</td>
                        <td className="px-6 py-3">
                          <Badge variant="outline" className={`capitalize ${cfg.color} ${cfg.bg}`}>
                            {coa.account_type}
                          </Badge>
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant="outline" className={`${cf.color} ${cf.bg}`}>
                            {cf.icon} {cf.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-sm text-muted-foreground truncate max-w-[180px]">{coa.description || '—'}</td>
                        <td className="px-6 py-3">
                          <Badge variant={coa.is_active ? 'default' : 'secondary'}>
                            {coa.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(coa)}>
                              <PencilIcon className="h-4 w-4 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => openDelete(coa.id)}>
                              <Trash2Icon className="h-4 w-4 mr-1" /> Hapus
                            </Button>
                          </div>
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

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => {
          const count = coaList.filter((c) => c.account_type === type).length
          const cfg = typeConfig[type]
          return (
            <Card key={type}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
                <p className="text-sm text-muted-foreground capitalize">{type}s</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── ADD ACCOUNT MODAL ── */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Akun Baru</DialogTitle>
            <DialogDescription>
              Buat akun baru di Chart of Accounts. Kode akun harus unique.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kode Akun *</Label>
                <Input
                  id="code"
                  placeholder="e.g. 6-1000"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_name">Nama Akun *</Label>
                <Input
                  id="account_name"
                  placeholder="e.g. Biaya Transportasi"
                  value={form.account_name}
                  onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_type">Tipe Akun *</Label>
                <Select
                  value={form.account_type}
                  onValueChange={(v) => setForm({ ...form, account_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cash_flow_category">Cash Flow Category</Label>
                <Select
                  value={form.cash_flow_category}
                  onValueChange={(v) => setForm({ ...form, cash_flow_category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operating">🔄 Operating</SelectItem>
                    <SelectItem value="investing">📊 Investing</SelectItem>
                    <SelectItem value="financing">💰 Financing</SelectItem>
                    <SelectItem value="non_cash">⚡ Non-Cash</SelectItem>
                    <SelectItem value="not_applicable">— Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent_id">Parent Account ID (Optional)</Label>
              <Input
                id="parent_id"
                placeholder="UUID of parent account"
                value={form.parent_id}
                onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe this account..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT ACCOUNT MODAL ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Akun</DialogTitle>
            <DialogDescription>
              Perbarui data akun Chart of Accounts.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Kode Akun *</Label>
                <Input
                  id="edit-code"
                  placeholder="e.g. 6-1000"
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-account_name">Nama Akun *</Label>
                <Input
                  id="edit-account_name"
                  placeholder="e.g. Biaya Transportasi"
                  value={editForm.account_name}
                  onChange={(e) => setEditForm({ ...editForm, account_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-account_type">Tipe Akun *</Label>
                <Select
                  value={editForm.account_type}
                  onValueChange={(v) => setEditForm({ ...editForm, account_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cash_flow_category">Cash Flow Category</Label>
                <Select
                  value={editForm.cash_flow_category}
                  onValueChange={(v) => setEditForm({ ...editForm, cash_flow_category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operating">🔄 Operating</SelectItem>
                    <SelectItem value="investing">📊 Investing</SelectItem>
                    <SelectItem value="financing">💰 Financing</SelectItem>
                    <SelectItem value="non_cash">⚡ Non-Cash</SelectItem>
                    <SelectItem value="not_applicable">— Not Applicable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-parent_id">Parent Account ID (Optional)</Label>
              <Input
                id="edit-parent_id"
                placeholder="UUID of parent account"
                value={editForm.parent_id}
                onChange={(e) => setEditForm({ ...editForm, parent_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Describe this account..."
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={updating}>
                {updating && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRMATION ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus akun ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
