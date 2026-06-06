'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InfoIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
} from 'lucide-react'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Checkbox } from '@workspace/ui/components/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Switch } from '@workspace/ui/components/switch'
import { Textarea } from '@workspace/ui/components/textarea'
import { SearchableSelect, type SearchableOption } from '@/components/finance/searchable-select'
import {
  DYNAMIC_LABELS,
  DYNAMIC_SOURCE_OPTIONS,
  MODUL_OPTIONS,
  MULTI_DYNAMIC_VALUES,
  NOMINAL_LABELS,
  NOMINAL_SOURCE_OPTIONS,
  POSISI_OPTIONS,
  validateConfig,
  type ConfigHeaderInput,
} from '@/lib/finance/journal-config-options'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConfigDetailRow {
  id: string
  coa_id: string | null
  dynamic_source: string | null
  posisi: 'debit' | 'credit'
  sumber_nominal: string
  urutan: number
  keterangan_baris: string | null
  is_optional: boolean
  coa: { account_code: string; account_name: string } | null
}

interface JournalConfig {
  id: string
  kode_konfigurasi: string
  nama_fitur: string
  modul_referensi: string
  tipe_jurnal: string
  is_aktif: boolean
  keterangan: string | null
  detail: ConfigDetailRow[]
}

interface CoaAccount {
  id: string
  account_code: string
  account_name: string
}

// Local editor model for a detail row.
interface EditorRow {
  key: string
  accountMode: 'fixed' | 'dynamic'
  coa_id: string
  dynamic_source: string
  posisi: 'debit' | 'credit'
  sumber_nominal: string
  is_optional: boolean
  keterangan_baris: string
}

const modulVariant = (modul: string): 'default' | 'secondary' | 'outline' => {
  if (modul === 'penjualan') return 'default'
  if (modul === 'pembelian') return 'secondary'
  return 'outline'
}

let keyCounter = 0
const newRowKey = () => `row-${++keyCounter}`

function emptyRow(posisi: 'debit' | 'credit' = 'debit'): EditorRow {
  return {
    key: newRowKey(),
    accountMode: 'fixed',
    coa_id: '',
    dynamic_source: '',
    posisi,
    sumber_nominal: 'grand_total',
    is_optional: false,
    keterangan_baris: '',
  }
}

// ── Read-only detail table ────────────────────────────────────────────────────

function DetailTable({ rows }: { rows: ConfigDetailRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-4 py-2 font-medium text-muted-foreground w-8">#</th>
            <th className="px-4 py-2 font-medium text-muted-foreground w-20">Posisi</th>
            <th className="px-4 py-2 font-medium text-muted-foreground">Akun</th>
            <th className="px-4 py-2 font-medium text-muted-foreground">Sumber Nominal</th>
            <th className="px-4 py-2 font-medium text-muted-foreground w-24">Opsional</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
              <td className="px-4 py-2 text-muted-foreground">{r.urutan}</td>
              <td className="px-4 py-2">
                <Badge variant={r.posisi === 'debit' ? 'default' : 'secondary'} className="text-xs">
                  {r.posisi === 'debit' ? 'Debit' : 'Credit'}
                </Badge>
              </td>
              <td className="px-4 py-2">
                {r.coa ? (
                  <span>
                    <span className="font-mono text-xs text-muted-foreground mr-1">
                      {r.coa.account_code}
                    </span>
                    {r.coa.account_name}
                    {r.keterangan_baris && (
                      <span className="ml-1 text-xs text-muted-foreground">({r.keterangan_baris})</span>
                    )}
                  </span>
                ) : r.dynamic_source ? (
                  <span className="italic text-muted-foreground">
                    {DYNAMIC_LABELS[r.dynamic_source] ?? r.dynamic_source}
                  </span>
                ) : (
                  <span className="text-destructive text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                {NOMINAL_LABELS[r.sumber_nominal] ?? r.sumber_nominal}
              </td>
              <td className="px-4 py-2">
                {r.is_optional ? (
                  <Badge variant="outline" className="text-xs">Opsional</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JournalConfigPage() {
  const [configs, setConfigs] = useState<JournalConfig[]>([])
  const [coaList, setCoaList] = useState<CoaAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Editor dialog state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingKode, setEditingKode] = useState<string | null>(null) // null = create mode
  const [submitting, setSubmitting] = useState(false)
  const [fKode, setFKode] = useState('')
  const [fNama, setFNama] = useState('')
  const [fModul, setFModul] = useState<string>('penjualan')
  const [fTipe, setFTipe] = useState('')
  const [fKeterangan, setFKeterangan] = useState('')
  const [fRows, setFRows] = useState<EditorRow[]>([])

  const [deleteKode, setDeleteKode] = useState<string | null>(null)

  useEffect(() => {
    void loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [cfgRes, coaRes] = await Promise.all([
        fetch('/api/finance/journal-config'),
        fetch('/api/finance/coa'),
      ])
      if (!cfgRes.ok) throw new Error('Gagal memuat konfigurasi')
      const cfgJson = await cfgRes.json()
      setConfigs(cfgJson.data ?? [])
      setExpanded(new Set((cfgJson.data ?? []).map((c: JournalConfig) => c.kode_konfigurasi)))

      if (coaRes.ok) {
        const coaJson = await coaRes.json()
        const list: CoaAccount[] = Array.isArray(coaJson) ? coaJson : (coaJson.data ?? [])
        setCoaList(list)
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const coaOptions: SearchableOption[] = useMemo(
    () =>
      coaList.map((c) => ({
        value: c.id,
        label: `${c.account_code} — ${c.account_name}`,
        keywords: `${c.account_code} ${c.account_name}`,
      })),
    [coaList],
  )

  async function handleToggle(kode: string, currentValue: boolean) {
    setToggling(kode)
    try {
      const res = await fetch(`/api/finance/journal-config/${kode}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_aktif: !currentValue }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Toggle gagal')
      }
      setConfigs((prev) =>
        prev.map((c) => (c.kode_konfigurasi === kode ? { ...c, is_aktif: !currentValue } : c)),
      )
      toast.success(`Konfigurasi ${kode} ${!currentValue ? 'diaktifkan' : 'dinonaktifkan'}`)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal mengubah status')
    } finally {
      setToggling(null)
    }
  }

  function toggleExpand(kode: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(kode)) next.delete(kode)
      else next.add(kode)
      return next
    })
  }

  // ── Editor open/close ─────────────────────────────────────────────────────

  function openCreate() {
    setEditingKode(null)
    setFKode('')
    setFNama('')
    setFModul('penjualan')
    setFTipe('')
    setFKeterangan('')
    setFRows([emptyRow('debit'), emptyRow('credit')])
    setEditorOpen(true)
  }

  function openEdit(cfg: JournalConfig) {
    setEditingKode(cfg.kode_konfigurasi)
    setFKode(cfg.kode_konfigurasi)
    setFNama(cfg.nama_fitur)
    setFModul(cfg.modul_referensi)
    setFTipe(cfg.tipe_jurnal)
    setFKeterangan(cfg.keterangan ?? '')
    setFRows(
      cfg.detail.map((d) => ({
        key: newRowKey(),
        accountMode: d.dynamic_source ? 'dynamic' : 'fixed',
        coa_id: d.coa_id ?? '',
        dynamic_source: d.dynamic_source ?? '',
        posisi: d.posisi,
        sumber_nominal: d.sumber_nominal,
        is_optional: d.is_optional,
        keterangan_baris: d.keterangan_baris ?? '',
      })),
    )
    setEditorOpen(true)
  }

  function updateRow(key: string, patch: Partial<EditorRow>) {
    setFRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setFRows((prev) => [...prev, emptyRow(prev.length % 2 === 0 ? 'debit' : 'credit')])
  }

  function removeRow(key: string) {
    setFRows((prev) => prev.filter((r) => r.key !== key))
  }

  // Build the API payload from editor state.
  function buildPayload(): ConfigHeaderInput {
    return {
      kode_konfigurasi: fKode.trim(),
      nama_fitur: fNama.trim(),
      modul_referensi: fModul,
      tipe_jurnal: fTipe.trim(),
      keterangan: fKeterangan.trim() || null,
      detail: fRows.map((r, i) => ({
        coa_id: r.accountMode === 'fixed' ? r.coa_id || null : null,
        dynamic_source: r.accountMode === 'dynamic' ? r.dynamic_source || null : null,
        posisi: r.posisi,
        sumber_nominal: r.sumber_nominal,
        urutan: i + 1,
        keterangan_baris: r.keterangan_baris.trim() || null,
        is_optional: r.is_optional,
      })),
    }
  }

  // Live client-side validation (mirrors server) — drives the inline error list.
  const liveErrors = useMemo(() => {
    if (!editorOpen) return []
    return validateConfig(buildPayload()).errors
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorOpen, fKode, fNama, fModul, fTipe, fRows])

  async function handleSubmit() {
    const payload = buildPayload()
    const { ok, errors } = validateConfig(payload)
    if (!ok) {
      toast.error(errors[0])
      return
    }
    setSubmitting(true)
    try {
      const url = editingKode
        ? `/api/finance/journal-config/${editingKode}`
        : '/api/finance/journal-config'
      const method = editingKode ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Simpan gagal')
      }
      toast.success(editingKode ? `Konfigurasi ${editingKode} diperbarui` : `Konfigurasi ${payload.kode_konfigurasi} dibuat`)
      setEditorOpen(false)
      await loadAll()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menyimpan konfigurasi')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(kode: string) {
    try {
      const res = await fetch(`/api/finance/journal-config/${kode}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Hapus gagal')
      }
      toast.success(`Konfigurasi ${kode} dihapus`)
      setDeleteKode(null)
      await loadAll()
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal menghapus konfigurasi')
    }
  }

  const activeCount = configs.filter((c) => c.is_aktif).length
  const isCreate = editingKode === null

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            Konfigurasi Jurnal Otomatis
          </h1>
          <p className="text-muted-foreground mt-1">
            Aturan pemetaan akun untuk pembangkitan jurnal double-entry otomatis per trigger
            transaksi. Kelola COA, posisi debit/kredit, dan status tiap konfigurasi.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right text-sm text-muted-foreground">
            <div className="font-medium text-foreground">{activeCount} / {configs.length}</div>
            <div>aktif</div>
          </div>
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Trigger Baru
          </Button>
        </div>
      </div>

      {/* PSAK immutability notice — persistent so the impact of edits is unambiguous */}
      <div className="flex gap-2 rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-3 text-xs text-blue-900 dark:text-blue-200">
        <InfoIcon className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Perubahan hanya berlaku untuk transaksi ke depan.</p>
          <p className="mt-0.5">
            Mengubah COA atau posisi debit/kredit di sini <span className="font-medium">tidak</span>{' '}
            mengubah jurnal yang sudah ter-posting — sesuai prinsip PSAK, jurnal yang sudah diposting
            bersifat immutable (hanya dapat dikoreksi via reversal). Konfigurasi baru dipakai engine
            saat membuat jurnal berikutnya. Untuk mengoreksi jurnal lama secara retroaktif, gunakan
            mekanisme reversal/backfill terpisah.
          </p>
        </div>
      </div>

      {/* Config cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Tidak ada konfigurasi. Klik "Trigger Baru" untuk membuat.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {configs.map((cfg) => {
            const isOpen = expanded.has(cfg.kode_konfigurasi)
            return (
              <Card key={cfg.kode_konfigurasi} className={cfg.is_aktif ? '' : 'opacity-60'}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <button
                      className="flex items-center gap-3 text-left flex-1 min-w-0"
                      onClick={() => toggleExpand(cfg.kode_konfigurasi)}
                    >
                      {isOpen ? (
                        <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base font-mono">{cfg.kode_konfigurasi}</CardTitle>
                          <Badge variant={modulVariant(cfg.modul_referensi)} className="text-xs">
                            {cfg.modul_referensi}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{cfg.tipe_jurnal}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">{cfg.nama_fitur}</p>
                        {cfg.keterangan && (
                          <p className="text-xs text-muted-foreground mt-0.5">{cfg.keterangan}</p>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground mr-1">
                        {cfg.is_aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <Switch
                        checked={cfg.is_aktif}
                        disabled={toggling === cfg.kode_konfigurasi}
                        onCheckedChange={() => handleToggle(cfg.kode_konfigurasi, cfg.is_aktif)}
                      />
                      <Button variant="ghost" size="sm" onClick={() => openEdit(cfg)}>
                        <PencilIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteKode(cfg.kode_konfigurasi)}
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isOpen && (
                  <CardContent className="pt-0">
                    <div className="border rounded-md overflow-hidden">
                      <div className="px-4 py-2 bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                        Baris Jurnal ({cfg.detail.length} baris)
                      </div>
                      {cfg.detail.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted-foreground">Tidak ada detail baris.</p>
                      ) : (
                        <DetailTable rows={cfg.detail} />
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Legend */}
      {!loading && configs.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-4 px-5">
            <p className="text-xs font-medium text-muted-foreground mb-2">Keterangan</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">Akun tetap</span> — COA dikunci di konfigurasi
              </span>
              <span>
                <span className="font-medium italic text-foreground">Akun dinamis</span> — COA dibaca dari dokumen saat runtime
              </span>
              <span>
                <Badge variant="outline" className="text-xs mr-1">Opsional</Badge>
                Baris dilewati jika nominal = 0 (mis. PPN)
              </span>
              <span>Toggle nonaktif → engine tidak membuat jurnal untuk trigger ini</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Editor dialog ─────────────────────────────────────────────────── */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreate ? 'Buat Konfigurasi Trigger Baru' : `Edit Konfigurasi — ${editingKode}`}
            </DialogTitle>
          </DialogHeader>

          {/* PSAK reminder when editing an existing trigger */}
          {!isCreate && (
            <div className="flex gap-2 rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-3 text-xs text-blue-900 dark:text-blue-200">
              <InfoIcon className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Perubahan akun/posisi berlaku untuk jurnal yang dibuat{' '}
                <span className="font-medium">setelah</span> disimpan. Jurnal yang sudah ter-posting
                tetap tidak berubah (PSAK immutable) — koreksi retroaktif perlu reversal terpisah.
              </p>
            </div>
          )}

          {/* Dormant warning for new triggers */}
          {isCreate && (
            <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-200">
              <AlertTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Trigger baru bersifat dormant.</p>
                <p className="mt-0.5">
                  Konfigurasi akan tersimpan, tetapi jurnal hanya ter-generate jika ada route bisnis
                  yang memanggil <code className="font-mono">processJournalAutomation()</code> dengan
                  kode trigger ini beserta payload nominal-nya. Untuk trigger benar-benar baru,
                  koordinasikan dengan developer untuk wiring route-nya.
                </p>
              </div>
            </div>
          )}

          {/* Header fields */}
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="kode">Kode Konfigurasi *</Label>
                <Input
                  id="kode"
                  placeholder="mis. AR-INV-ISSUE"
                  value={fKode}
                  onChange={(e) => setFKode(e.target.value.toUpperCase())}
                  disabled={!isCreate}
                  className="font-mono"
                />
                {!isCreate && (
                  <p className="text-xs text-muted-foreground">Kode tidak dapat diubah setelah dibuat.</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="modul">Modul Referensi *</Label>
                <Select value={fModul} onValueChange={setFModul}>
                  <SelectTrigger id="modul">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODUL_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nama">Nama Fitur *</Label>
                <Input
                  id="nama"
                  placeholder="mis. Terbit invoice baru (AR)"
                  value={fNama}
                  onChange={(e) => setFNama(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tipe">Tipe Jurnal *</Label>
                <Input
                  id="tipe"
                  placeholder="mis. penjualan_kredit"
                  value={fTipe}
                  onChange={(e) => setFTipe(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ket">Keterangan</Label>
              <Textarea
                id="ket"
                placeholder="Deskripsi singkat (opsional)"
                value={fKeterangan}
                onChange={(e) => setFKeterangan(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Detail-row editor */}
          <div className="border rounded-md">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/40 border-b">
              <span className="text-sm font-medium">Baris Jurnal</span>
              <Button variant="outline" size="sm" onClick={addRow}>
                <PlusIcon className="h-3.5 w-3.5 mr-1" />
                Tambah Baris
              </Button>
            </div>

            <div className="space-y-3 p-3">
              {fRows.map((r, idx) => {
                const isMulti = MULTI_DYNAMIC_VALUES.includes(r.dynamic_source as any)
                return (
                  <div key={r.key} className="rounded-lg border bg-card p-4">
                    {/* Row header: badge + remove */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Baris {idx + 1}</span>
                        <Badge
                          variant={r.posisi === 'debit' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {r.posisi === 'debit' ? 'Debit' : 'Credit'}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-8"
                        onClick={() => removeRow(r.key)}
                      >
                        <Trash2Icon className="h-3.5 w-3.5 mr-1" />
                        Hapus
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Posisi */}
                      <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground">Posisi</Label>
                        <Select value={r.posisi} onValueChange={(v) => updateRow(r.key, { posisi: v as any })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {POSISI_OPTIONS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sumber nominal */}
                      <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground">Sumber Nominal</Label>
                        <Select
                          value={r.sumber_nominal}
                          onValueChange={(v) => updateRow(r.key, { sumber_nominal: v })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {NOMINAL_SOURCE_OPTIONS.map((nm) => (
                              <SelectItem key={nm.value} value={nm.value}>
                                {nm.label}{nm.perLine ? ' (per line)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isMulti && (
                          <p className="text-[11px] text-muted-foreground">
                            Sumber multi-line: gunakan nominal "per line".
                          </p>
                        )}
                      </div>

                      {/* Akun: mode + value (full width) */}
                      <div className="grid gap-1.5 md:col-span-2">
                        <Label className="text-xs text-muted-foreground">Akun</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Select
                            value={r.accountMode}
                            onValueChange={(v) => updateRow(r.key, { accountMode: v as any })}
                          >
                            <SelectTrigger className="w-full sm:w-32 shrink-0"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Akun Tetap</SelectItem>
                              <SelectItem value="dynamic">Akun Dinamis</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex-1 min-w-0">
                            {r.accountMode === 'fixed' ? (
                              <SearchableSelect
                                options={coaOptions}
                                value={r.coa_id}
                                onValueChange={(v) => updateRow(r.key, { coa_id: v })}
                                placeholder="Pilih COA…"
                                searchPlaceholder="Cari kode/nama akun…"
                              />
                            ) : (
                              <Select
                                value={r.dynamic_source}
                                onValueChange={(v) => updateRow(r.key, { dynamic_source: v })}
                              >
                                <SelectTrigger><SelectValue placeholder="Pilih sumber dinamis…" /></SelectTrigger>
                                <SelectContent>
                                  {DYNAMIC_SOURCE_OPTIONS.map((d) => (
                                    <SelectItem key={d.value} value={d.value}>
                                      {d.label}{d.multi ? ' (multi-line)' : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Keterangan baris (full width) */}
                      <div className="grid gap-1.5 md:col-span-2">
                        <Label className="text-xs text-muted-foreground">Keterangan Baris (opsional)</Label>
                        <Input
                          placeholder="mis. PPN Keluaran"
                          value={r.keterangan_baris}
                          onChange={(e) => updateRow(r.key, { keterangan_baris: e.target.value })}
                        />
                      </div>

                      {/* Optional flag */}
                      <div className="md:col-span-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
                          <Checkbox
                            checked={r.is_optional}
                            onCheckedChange={(v) => updateRow(r.key, { is_optional: !!v })}
                          />
                          <span>Baris opsional</span>
                          <span className="text-xs text-muted-foreground">
                            — dilewati otomatis jika nominal = 0 (mis. PPN)
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )
              })}
              {fRows.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Belum ada baris. Klik "Tambah Baris".
                </p>
              )}
            </div>
          </div>

          {/* Live validation feedback */}
          {liveErrors.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              <p className="font-medium mb-1">Perbaiki sebelum menyimpan:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {liveErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={submitting}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || liveErrors.length > 0}>
              {submitting && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
              {isCreate ? 'Buat Konfigurasi' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      <Dialog open={!!deleteKode} onOpenChange={(v) => !v && setDeleteKode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Konfigurasi</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Yakin menghapus konfigurasi <span className="font-mono font-medium">{deleteKode}</span>?
            Engine akan berhenti membuat jurnal untuk trigger ini. Jurnal yang sudah ter-posting
            tidak terpengaruh. Tindakan ini berupa soft-delete.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteKode(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => deleteKode && handleDelete(deleteKode)}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
