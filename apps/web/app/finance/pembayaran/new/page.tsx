'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PlusIcon, Trash2Icon, CheckIcon } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { toast } from 'sonner'
import { cn } from '@workspace/ui/lib/utils'
import type { PermintaanUang, EmployeeOption, COAOption, MataUang } from '@/types/fund-request'
import { formatRpFR, formatDateFR } from '@/types/fund-request'

// ─── Searchable Select ────────────────────────────────────────────────────────
function SearchableSelect({
  options, value, onValueChange, placeholder = 'Pilih...', disabled,
}: { options: { value: string; label: string }[]; value: string; onValueChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
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
        className={cn('w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm', disabled && 'opacity-50 cursor-not-allowed')}
        onClick={() => setOpen(p => !p)}>
        <span className={selected ? '' : 'text-muted-foreground'}>{selected?.label ?? placeholder}</span>
        <span className="text-muted-foreground text-xs">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="p-2"><Input placeholder="Cari..." value={q} onChange={e => setQ(e.target.value)} className="h-8 text-sm" autoFocus /></div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? <p className="px-3 py-2 text-sm text-muted-foreground">Tidak ditemukan</p> :
              filtered.map(o => (
                <button key={o.value} type="button"
                  className={cn('w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left', value === o.value && 'bg-accent/60 font-medium')}
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
function EmployeePicker({ label, value, onSelect }: { label: string; value: EmployeeOption | null; onSelect: (e: EmployeeOption) => void }) {
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
        <Input placeholder="Ketik NIK atau nama..."
          value={value && value.full_name ? `${value.nik ? value.nik + ' — ' : ''}${value.full_name}` : search}
          onChange={e => { setSearch(e.target.value); if (value) onSelect({ id: '', full_name: '' }) }} />
        {open && results.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
            {results.map(emp => (
              <button key={emp.id} type="button" className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                onMouseDown={() => { onSelect(emp); setSearch(''); setOpen(false) }}>
                <p className="font-semibold">{emp.full_name}</p>
                <p className="text-xs text-muted-foreground">{emp.nik} · {emp.department}</p>
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
              <Input value={val} readOnly className="h-8 text-xs bg-muted/30" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Biaya Lain Builder ───────────────────────────────────────────────────────
interface BiayaRow { _key: string; deskripsi: string; nominal: string; coa_id: string; coa_nama: string }

function BiayaLainBuilder({ rows, coaOptions, onChange }: {
  rows: BiayaRow[]; coaOptions: { value: string; label: string }[]; onChange: (r: BiayaRow[]) => void
}) {
  const add = () => onChange([...rows, { _key: crypto.randomUUID(), deskripsi: '', nominal: '', coa_id: '', coa_nama: '' }])
  const remove = (k: string) => onChange(rows.filter(r => r._key !== k))
  const update = (k: string, patch: Partial<BiayaRow>) => onChange(rows.map(r => r._key === k ? { ...r, ...patch } : r))
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Biaya Lain-Lain</label>
        <Button type="button" variant="outline" size="sm" onClick={add}><PlusIcon className="h-4 w-4 mr-1" />Tambah Biaya</Button>
      </div>
      {rows.length === 0 && <div className="text-center py-3 border rounded text-sm text-muted-foreground bg-muted/20">Tidak ada biaya tambahan</div>}
      {rows.map((row, idx) => (
        <div key={row._key} className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-end">
          <span className="text-xs bg-muted rounded px-1.5 py-1 font-mono">{idx + 1}</span>
          <div>
            <label className="text-xs text-muted-foreground">Deskripsi *</label>
            <Input placeholder="e.g. Biaya Admin Bank" value={row.deskripsi}
              onChange={e => update(row._key, { deskripsi: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Nominal *</label>
            <Input type="number" min={0} placeholder="0" value={row.nominal}
              onChange={e => update(row._key, { nominal: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Chart of Account</label>
            <SearchableSelect options={coaOptions} value={row.coa_id}
              onValueChange={v => { const opt = coaOptions.find(o => o.value === v); update(row._key, { coa_id: v, coa_nama: opt?.label ?? '' }) }}
              placeholder="Pilih COA..." />
          </div>
          <Button type="button" variant="ghost" size="sm" className="text-destructive"
            onClick={() => remove(row._key)}><Trash2Icon className="h-4 w-4" /></Button>
        </div>
      ))}
    </div>
  )
}

// ─── PU Reference Panel ───────────────────────────────────────────────────────
function PURefPanel({ pu, onClear }: { pu: PermintaanUang; onClear: () => void }) {
  const overdue = pu.status === 'APPROVED' && new Date(pu.tanggal_kebutuhan) < new Date()
  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <span className="font-mono font-bold text-primary">{pu.doc_number}</span>
          <span className="ml-2 text-xs bg-blue-600 text-white rounded-full px-2 py-0.5">APPROVED</span>
        </div>
        <span className="font-bold text-lg">{formatRpFR(pu.nominal, pu.mata_uang)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
        <span><strong>Dasar:</strong> {pu.dasar_pengajuan === 'PROJECT' ? pu.project?.project_name ?? 'Project' : 'Internal'}</span>
        <span className={overdue ? 'text-red-500 font-semibold' : ''}>
          <strong>Jatuh Tempo:</strong> {formatDateFR(pu.tanggal_kebutuhan)}{overdue && ' ⚠️'}
        </span>
        <span><strong>Requestor:</strong> {pu.requestor_name}</span>
      </div>
      <button type="button" className="text-xs text-muted-foreground underline" onClick={onClear}>Ganti PU</button>
    </div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function PembayaranNewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPUID = searchParams.get('pu_id') ?? ''

  const [saving, setSaving] = useState(false)
  const [approvedPUs, setApprovedPUs] = useState<PermintaanUang[]>([])
  const [selectedPU, setSelectedPU] = useState<PermintaanUang | null>(null)
  const [coaOptions, setCoaOptions] = useState<{ value: string; label: string }[]>([])
  const [requestor, setRequestor] = useState<EmployeeOption | null>(null)
  const [approver, setApprover] = useState<EmployeeOption | null>(null)
  const [picFinance, setPicFinance] = useState<EmployeeOption | null>(null)
  const [biayaLain, setBiayaLain] = useState<BiayaRow[]>([])
  const [bankCoaId, setBankCoaId] = useState('')
  const [bankCoaOptions, setBankCoaOptions] = useState<{ value: string; label: string }[]>([])

  const [form, setForm] = useState({
    tanggal_pembayaran: new Date().toISOString().split('T')[0],
    nominal_bayar: '',
    mata_uang: 'IDR' as MataUang,
    bank_tujuan_nama: '',
    bank_tujuan_nomor: '',
    bank_tujuan_atas_nama: '',
    catatan: '',
  })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  // Load COA options
  useEffect(() => {
    fetch('/api/finance/coa?type=asset')
      .then(r => r.json())
      .then(d => {
        const list = (Array.isArray(d) ? d : d.data ?? []).map((c: COAOption) => ({
          value: c.id,
          label: `${c.account_code} — ${c.account_name}`,
        }))
        setBankCoaOptions(list)
        setCoaOptions(list)
      })
      .catch(() => {})
  }, [])

  // Load approved PUs
  useEffect(() => {
    fetch('/api/finance/permintaan-uang?status=APPROVED&size=50')
      .then(r => r.json())
      .then(d => setApprovedPUs(d.data ?? []))
      .catch(() => {})
  }, [])

  // Auto-select from URL param
  useEffect(() => {
    if (preselectedPUID && approvedPUs.length > 0) {
      const found = approvedPUs.find(p => p.id === preselectedPUID)
      if (found) {
        setSelectedPU(found)
        set('nominal_bayar', String(found.nominal))
        set('mata_uang', found.mata_uang)
      }
    }
  }, [preselectedPUID, approvedPUs])

  const selectPU = (pu: PermintaanUang) => {
    setSelectedPU(pu)
    set('nominal_bayar', String(pu.nominal))
    set('mata_uang', pu.mata_uang)
  }

  const handleSave = async () => {
    if (!selectedPU) { toast.error('Pilih Permintaan Uang'); return }
    if (!form.tanggal_pembayaran) { toast.error('Tanggal pembayaran wajib diisi'); return }
    if (!form.nominal_bayar || Number(form.nominal_bayar) <= 0) { toast.error('Nominal harus > 0'); return }
    if (!form.bank_tujuan_nama) { toast.error('Nama bank tujuan wajib diisi'); return }
    if (!form.bank_tujuan_nomor) { toast.error('Nomor rekening tujuan wajib diisi'); return }
    if (!requestor) { toast.error('Requestor wajib dipilih'); return }

    setSaving(true)
    try {
      const bankCoa = bankCoaOptions.find(o => o.value === bankCoaId)
      const res = await fetch('/api/finance/pembayaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permintaan_uang_id: selectedPU.id,
          tanggal_pembayaran: form.tanggal_pembayaran,
          nominal_bayar: Number(form.nominal_bayar),
          mata_uang: form.mata_uang,
          bank_dari_coa_id: bankCoaId || undefined,
          bank_dari_nama: bankCoa?.label.split(' — ')[1] ?? undefined,
          bank_dari_kode: bankCoa?.label.split(' — ')[0] ?? undefined,
          bank_tujuan_nama: form.bank_tujuan_nama,
          bank_tujuan_nomor: form.bank_tujuan_nomor,
          bank_tujuan_atas_nama: form.bank_tujuan_atas_nama || undefined,
          requestor_id: requestor?.id,
          requestor_name: requestor?.full_name,
          requestor_dept: requestor?.department,
          requestor_position: requestor?.position_name,
          requestor_grade: requestor?.grade,
          approver_id: approver?.id,
          approver_name: approver?.full_name,
          approver_dept: approver?.department,
          approver_position: approver?.position_name,
          approver_grade: approver?.grade,
          pic_finance_id: picFinance?.id,
          pic_finance_name: picFinance?.full_name,
          pic_finance_dept: picFinance?.department,
          pic_finance_position: picFinance?.position_name,
          pic_finance_grade: picFinance?.grade,
          biaya_lain: biayaLain.filter(b => b.deskripsi.trim()).map((b, i) => ({
            deskripsi: b.deskripsi, nominal: Number(b.nominal) || 0,
            coa_id: b.coa_id || undefined, coa_nama: b.coa_nama || undefined, urutan: i + 1,
          })),
          catatan: form.catatan || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Gagal menyimpan'); return }
      toast.success('Pembayaran berhasil dibuat')
      router.push(`/finance/pembayaran/${json.data.id}`)
    } catch (e) { toast.error(String(e)) } finally { setSaving(false) }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Buat Pembayaran</h1>
        <p className="text-sm text-muted-foreground mt-1">Pembayaran atas Permintaan Uang yang telah disetujui</p>
      </div>

      {/* Ref PU */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Referensi Permintaan Uang</CardTitle></CardHeader>
        <CardContent>
          {selectedPU ? (
            <PURefPanel pu={selectedPU} onClear={() => setSelectedPU(null)} />
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Pilih PU yang sudah disetujui:</p>
              {approvedPUs.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm border rounded-lg">
                  Tidak ada Permintaan Uang berstatus APPROVED
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {approvedPUs.map(pu => {
                    const overdue = new Date(pu.tanggal_kebutuhan) < new Date()
                    return (
                      <button key={pu.id} type="button"
                        className={cn('w-full text-left rounded-lg border p-3 hover:bg-accent transition-colors',
                          overdue && 'border-red-300')}
                        onClick={() => selectPU(pu)}>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-primary">{pu.doc_number}</span>
                          <span className="font-bold">{formatRpFR(pu.nominal, pu.mata_uang)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          <span className={overdue ? 'text-red-500 font-semibold' : ''}>
                            Jatuh tempo: {formatDateFR(pu.tanggal_kebutuhan)}
                          </span>
                          <span className="mx-2">·</span>
                          <span>{pu.requestor_name}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Pembayaran */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Detail Pembayaran</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Tanggal Pembayaran <span className="text-red-500">*</span></label>
              <Input type="date" className="mt-1" value={form.tanggal_pembayaran} onChange={e => set('tanggal_pembayaran', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Nominal Bayar <span className="text-red-500">*</span></label>
              <Input type="number" min={1} className="mt-1" value={form.nominal_bayar} onChange={e => set('nominal_bayar', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Pembayaran Dari (COA Bank)</label>
            <div className="mt-1">
              <SearchableSelect options={bankCoaOptions} value={bankCoaId} onValueChange={setBankCoaId}
                placeholder="Pilih akun bank sumber..." />
            </div>
          </div>
          <div className="border-t pt-4">
            <p className="text-sm font-semibold mb-3">Pembayaran Kepada</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <label className="text-sm font-medium">Bank Tujuan <span className="text-red-500">*</span></label>
                <Input className="mt-1" placeholder="e.g. BCA" value={form.bank_tujuan_nama} onChange={e => set('bank_tujuan_nama', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">No. Rekening <span className="text-red-500">*</span></label>
                <Input className="mt-1" placeholder="0987654321" value={form.bank_tujuan_nomor} onChange={e => set('bank_tujuan_nomor', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Atas Nama</label>
                <Input className="mt-1" placeholder="Nama penerima" value={form.bank_tujuan_atas_nama} onChange={e => set('bank_tujuan_atas_nama', e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Biaya Lain */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <BiayaLainBuilder rows={biayaLain} coaOptions={coaOptions} onChange={setBiayaLain} />
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Audit Trail</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <EmployeePicker label="Requestor" value={requestor} onSelect={setRequestor} />
          <EmployeePicker label="Approver" value={approver} onSelect={setApprover} />
          <EmployeePicker label="PIC Finance" value={picFinance} onSelect={setPicFinance} />
          <div>
            <label className="text-sm font-medium">Catatan</label>
            <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
              placeholder="Keterangan tambahan..." value={form.catatan} onChange={e => set('catatan', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()} disabled={saving}>Batal</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Menyimpan...' : 'Buat Pembayaran'}
        </Button>
      </div>
    </div>
  )
}
