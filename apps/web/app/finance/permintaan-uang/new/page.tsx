'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, Trash2Icon, CheckIcon } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select'
import { toast } from 'sonner'
import { cn } from '@workspace/ui/lib/utils'
import type { EmployeeOption, MataUang } from '@/types/fund-request'

// ─── Searchable Select ────────────────────────────────────────────────────────
function SearchableSelect({
  options, value, onValueChange, placeholder = 'Pilih...', disabled,
}: {
  options: { value: string; label: string }[]
  value: string
  onValueChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const filtered = options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()))
  const selected = options.find(o => o.value === value)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative w-full">
      <button type="button" disabled={disabled}
        className={cn('w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          disabled && 'opacity-50 cursor-not-allowed')}
        onClick={() => setOpen(p => !p)}>
        <span className={selected ? '' : 'text-muted-foreground'}>{selected?.label ?? placeholder}</span>
        <span className="text-muted-foreground">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="p-2">
            <Input placeholder="Cari..." value={q} onChange={e => setQ(e.target.value)} className="h-8 text-sm" autoFocus />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? <p className="px-3 py-2 text-sm text-muted-foreground">Tidak ditemukan</p> :
              filtered.map(o => (
                <button key={o.value} type="button"
                  className={cn('w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left',
                    value === o.value && 'bg-accent/60 font-medium')}
                  onClick={() => { onValueChange(o.value); setOpen(false); setQ('') }}>
                  <CheckIcon className={cn('h-3.5 w-3.5 shrink-0', value === o.value ? 'opacity-100' : 'opacity-0')} />
                  {o.label}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Employee Picker ──────────────────────────────────────────────────────────
function EmployeePicker({
  label, value, onSelect,
}: {
  label: string
  value: EmployeeOption | null
  onSelect: (emp: EmployeeOption) => void
}) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<EmployeeOption[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (search.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/finance/employees?search=${encodeURIComponent(search)}&size=20`)
      const json = await res.json().catch(() => ({}))
      setResults(json.data ?? [])
      setOpen(true)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="space-y-2">
      <label className="text-sm font-medium">{label} <span className="text-red-500">*</span></label>
      <div className="relative">
        <Input placeholder="Ketik NIK atau nama karyawan..."
          value={value ? `${value.nik ? value.nik + ' — ' : ''}${value.full_name}` : search}
          onChange={e => { setSearch(e.target.value); if (value) onSelect({ ...value, full_name: '' }) }}
          onFocus={() => search.length >= 2 && setOpen(true)} />
        {open && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-52 overflow-y-auto">
            {results.map(emp => (
              <button key={emp.id} type="button"
                className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                onMouseDown={() => { onSelect(emp); setSearch(''); setOpen(false) }}>
                <p className="font-semibold">{emp.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {emp.nik && <span className="mr-2">{emp.nik}</span>}
                  {emp.department}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
      {value && value.full_name && (
        <div className="grid grid-cols-3 gap-2">
          {[['Departemen', value.department ?? '—'], ['Jabatan', value.position_name ?? '—'], ['Golongan', value.grade ?? '—']].map(([lbl, val]) => (
            <div key={lbl}>
              <p className="text-xs text-muted-foreground">{lbl}</p>
              <Input value={val} readOnly className="h-8 text-xs bg-muted/30 cursor-default" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Internal Items Builder ───────────────────────────────────────────────────
interface InternalItem { _key: string; deskripsi: string; nominal: string }

function InternalItemsBuilder({ items, onChange }: { items: InternalItem[]; onChange: (v: InternalItem[]) => void }) {
  const add = () => onChange([...items, { _key: crypto.randomUUID(), deskripsi: '', nominal: '' }])
  const remove = (k: string) => onChange(items.filter(i => i._key !== k))
  const update = (k: string, field: 'deskripsi' | 'nominal', val: string) =>
    onChange(items.map(i => i._key === k ? { ...i, [field]: val } : i))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Deskripsi Kebutuhan <span className="text-red-500">*</span></label>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <PlusIcon className="h-4 w-4 mr-1" />Tambah Item
        </Button>
      </div>
      {items.length === 0 && (
        <div className="text-center py-4 border rounded-md text-sm text-muted-foreground bg-muted/20">
          Klik "Tambah Item" untuk menambahkan kebutuhan
        </div>
      )}
      {items.map((item, idx) => (
        <div key={item._key} className="flex gap-2 items-start">
          <span className="mt-2 text-xs bg-muted rounded px-1.5 py-0.5 font-mono">{idx + 1}</span>
          <Input placeholder="Deskripsi kebutuhan..." value={item.deskripsi}
            onChange={e => update(item._key, 'deskripsi', e.target.value)} />
          <Input type="number" placeholder="Nominal (opsional)" className="w-40" min={0}
            value={item.nominal} onChange={e => update(item._key, 'nominal', e.target.value)} />
          <Button type="button" variant="ghost" size="sm" className="text-destructive mt-0.5"
            onClick={() => remove(item._key)}>
            <Trash2Icon className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function PermintaanUangNewPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState<{ value: string; label: string }[]>([])
  const [requestor, setRequestor] = useState<EmployeeOption | null>(null)
  const [internalItems, setInternalItems] = useState<InternalItem[]>([])

  const [form, setForm] = useState({
    tanggal_permintaan: new Date().toISOString().split('T')[0],
    tanggal_kebutuhan: '',
    nominal: '',
    mata_uang: 'IDR' as MataUang,
    dasar_pengajuan: 'PROJECT' as 'PROJECT' | 'INTERNAL',
    project_id: '',
    catatan: '',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    fetch('/api/ar/projects')
      .then(r => r.json())
      .then(d => setProjects((d.data ?? []).map((p: any) => ({
        value: p.id,
        label: `${p.project_name}${p.client_name && p.client_name !== '—' ? ` — ${p.client_name}` : ''}`,
      }))))
      .catch(() => {})
  }, [])

  const handleSave = async (submit: boolean) => {
    if (!form.tanggal_kebutuhan) { toast.error('Tanggal kebutuhan wajib diisi'); return }
    if (!form.nominal || Number(form.nominal) <= 0) { toast.error('Nominal harus lebih dari 0'); return }
    if (!requestor) { toast.error('Requestor wajib dipilih'); return }
    if (form.dasar_pengajuan === 'PROJECT' && !form.project_id) { toast.error('Project wajib dipilih'); return }
    if (form.dasar_pengajuan === 'INTERNAL' && internalItems.filter(i => i.deskripsi.trim()).length === 0) {
      toast.error('Minimal 1 item kebutuhan internal'); return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/finance/permintaan-uang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          nominal: Number(form.nominal),
          project_id: form.dasar_pengajuan === 'PROJECT' ? form.project_id : undefined,
          internal_items: form.dasar_pengajuan === 'INTERNAL'
            ? internalItems.filter(i => i.deskripsi.trim()).map(i => ({ deskripsi: i.deskripsi, nominal: i.nominal || undefined }))
            : [],
          requestor_id: requestor.id,
          requestor_nik: requestor.nik,
          requestor_name: requestor.full_name,
          requestor_dept: requestor.department,
          requestor_position: requestor.position_name,
          requestor_grade: requestor.grade,
          submit,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Gagal menyimpan'); return }
      toast.success(submit ? 'PU diajukan' : 'PU disimpan sebagai draft')
      router.push(`/finance/permintaan-uang/${json.data.id}`)
    } catch (e) { toast.error(String(e)) } finally { setSaving(false) }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Buat Permintaan Uang</h1>
        <p className="text-sm text-muted-foreground mt-1">Pengajuan dana baru</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4"><CardTitle className="text-base">Informasi Pengajuan</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Tanggal Permintaan <span className="text-red-500">*</span></label>
              <Input type="date" className="mt-1" value={form.tanggal_permintaan} onChange={e => set('tanggal_permintaan', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Tanggal Kebutuhan (Jatuh Tempo) <span className="text-red-500">*</span></label>
              <Input type="date" className="mt-1" value={form.tanggal_kebutuhan}
                min={form.tanggal_permintaan}
                onChange={e => set('tanggal_kebutuhan', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nominal <span className="text-red-500">*</span></label>
              <Input type="number" min={1} placeholder="0" className="mt-1" value={form.nominal}
                onChange={e => set('nominal', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Mata Uang</label>
              <Select value={form.mata_uang} onValueChange={v => set('mata_uang', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['IDR','USD','EUR','SGD'] as MataUang[]).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Dasar Pengajuan <span className="text-red-500">*</span></label>
            <div className="flex gap-4 mt-2">
              {(['PROJECT', 'INTERNAL'] as const).map(d => (
                <label key={d} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="dasar" value={d} checked={form.dasar_pengajuan === d}
                    onChange={() => set('dasar_pengajuan', d)} />
                  <span className="text-sm">{d === 'PROJECT' ? '📁 Project' : '📝 Kebutuhan Internal'}</span>
                </label>
              ))}
            </div>
          </div>

          {form.dasar_pengajuan === 'PROJECT' ? (
            <div>
              <label className="text-sm font-medium">Project <span className="text-red-500">*</span></label>
              <div className="mt-1">
                <SearchableSelect options={projects} value={form.project_id}
                  onValueChange={v => set('project_id', v)} placeholder="Pilih project..." />
              </div>
            </div>
          ) : (
            <InternalItemsBuilder items={internalItems} onChange={setInternalItems} />
          )}

          <div>
            <label className="text-sm font-medium">Catatan (Opsional)</label>
            <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
              placeholder="Keterangan tambahan..." value={form.catatan}
              onChange={e => set('catatan', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4"><CardTitle className="text-base">Audit Trail</CardTitle></CardHeader>
        <CardContent>
          <EmployeePicker label="Requestor" value={requestor} onSelect={setRequestor} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()} disabled={saving}>Batal</Button>
        <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Draft'}
        </Button>
        <Button onClick={() => handleSave(true)} disabled={saving}>
          {saving ? 'Mengajukan...' : 'Simpan & Ajukan'}
        </Button>
      </div>
    </div>
  )
}
