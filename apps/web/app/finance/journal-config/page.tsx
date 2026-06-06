'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  Loader2Icon,
  SettingsIcon,
} from 'lucide-react'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Switch } from '@workspace/ui/components/switch'

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

// ── Dynamic-source display labels ─────────────────────────────────────────────

const DYNAMIC_LABELS: Record<string, string> = {
  invoice_revenue_coa: 'Revenue COA (per invoice)',
  ar_bank_coa: 'Bank COA (AR bank account)',
  ap_line_coa: 'Expense/Asset COA (per AP line)',
  ap_bank_coa: 'Bank COA (AP payment)',
  pmb_expense_coa: 'Expense COA (permintaan uang)',
  pmb_bank_coa: 'Bank COA (pembayaran)',
  pmb_biaya_lain_coa: 'Other Cost COA (biaya lain, per line)',
}

// ── Nominal labels ────────────────────────────────────────────────────────────

const NOMINAL_LABELS: Record<string, string> = {
  grand_total: 'Grand Total',
  subtotal: 'Subtotal',
  pajak: 'Pajak (PPN)',
  total_piutang: 'Total Piutang',
  bayar_sekarang: 'Bayar Sekarang',
  nominal_bayar: 'Nominal Bayar',
  line_amount: 'Jumlah per Line',
  biaya_lain_amount: 'Biaya Lain per Line',
}

// ── Module badge colors ───────────────────────────────────────────────────────

const modulVariant = (modul: string): 'default' | 'secondary' | 'outline' => {
  if (modul === 'penjualan') return 'default'
  if (modul === 'pembelian') return 'secondary'
  return 'outline'
}

// ── Sub-component: detail lines table ─────────────────────────────────────────

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
                <Badge
                  variant={r.posisi === 'debit' ? 'default' : 'secondary'}
                  className="text-xs"
                >
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
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({r.keterangan_baris})
                      </span>
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
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadConfigs()
  }, [])

  async function loadConfigs() {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/journal-config')
      if (!res.ok) throw new Error('Gagal memuat konfigurasi')
      const json = await res.json()
      setConfigs(json.data ?? [])
      // Expand all by default so Finance can immediately see the mappings
      setExpanded(new Set((json.data ?? []).map((c: JournalConfig) => c.kode_konfigurasi)))
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal memuat konfigurasi jurnal')
    } finally {
      setLoading(false)
    }
  }

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
        prev.map((c) =>
          c.kode_konfigurasi === kode ? { ...c, is_aktif: !currentValue } : c,
        ),
      )
      toast.success(`Konfigurasi ${kode} ${!currentValue ? 'diaktifkan' : 'dinonaktifkan'}`)
    } catch (e: any) {
      toast.error(e.message ?? 'Gagal mengubah status konfigurasi')
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

  const activeCount = configs.filter((c) => c.is_aktif).length

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            Konfigurasi Jurnal Otomatis
          </h1>
          <p className="text-muted-foreground mt-1">
            Aturan pemetaan akun untuk pembangkitan jurnal double-entry otomatis per trigger
            transaksi. Toggle untuk mengaktifkan atau menonaktifkan setiap konfigurasi.
          </p>
        </div>
        <div className="text-right text-sm text-muted-foreground shrink-0 ml-4">
          <div className="font-medium text-foreground">{activeCount} / {configs.length}</div>
          <div>aktif</div>
        </div>
      </div>

      {/* Status summary badges */}
      {!loading && (
        <div className="flex gap-2 flex-wrap">
          {configs.map((c) => (
            <Badge
              key={c.kode_konfigurasi}
              variant={c.is_aktif ? 'default' : 'outline'}
              className="text-xs"
            >
              {c.kode_konfigurasi}
            </Badge>
          ))}
        </div>
      )}

      {/* Config cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : configs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Tidak ada konfigurasi ditemukan. Jalankan seed migration terlebih dahulu.
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
                    {/* Left: expand + title */}
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
                          <CardTitle className="text-base font-mono">
                            {cfg.kode_konfigurasi}
                          </CardTitle>
                          <Badge variant={modulVariant(cfg.modul_referensi)} className="text-xs">
                            {cfg.modul_referensi}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {cfg.tipe_jurnal}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                          {cfg.nama_fitur}
                        </p>
                        {cfg.keterangan && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {cfg.keterangan}
                          </p>
                        )}
                      </div>
                    </button>

                    {/* Right: toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {cfg.is_aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <Switch
                        checked={cfg.is_aktif}
                        disabled={toggling === cfg.kode_konfigurasi}
                        onCheckedChange={() => handleToggle(cfg.kode_konfigurasi, cfg.is_aktif)}
                      />
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
                        <p className="px-4 py-3 text-sm text-muted-foreground">
                          Tidak ada detail baris.
                        </p>
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
                <span className="font-medium text-foreground">Akun tetap</span> — COA dikunci di
                konfigurasi (tidak berubah per dokumen)
              </span>
              <span>
                <span className="font-medium italic text-foreground">Akun dinamis</span> — COA
                dibaca dari dokumen sumber saat runtime
              </span>
              <span>
                <Badge variant="outline" className="text-xs mr-1">Opsional</Badge>
                Baris dilewati jika nominal = 0 (mis. PPN)
              </span>
              <span>
                Toggle nonaktif → engine tidak membuat jurnal untuk trigger ini
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
