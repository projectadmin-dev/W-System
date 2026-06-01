'use client'

// Import (XLSX/CSV → preview → commit) and Import/Export history modals.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'
import { UploadCloud, History, Loader2, CheckCircle2, XCircle, FileDown } from 'lucide-react'
import { COA_COLUMNS, parseGrid, type ParsedGridRow } from '@/lib/coa-import-schema'
import type { CoaNode } from './types'

// ─── Minimal CSV → grid parser (used for textarea paste) ─────────────────────
function parseCsvToGrid(text: string): string[][] {
  const out: string[][] = []
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue
    const cells: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i]
      if (inQ) {
        if (ch === '"' && raw[i + 1] === '"') { cur += '"'; i++ }
        else if (ch === '"') inQ = false
        else cur += ch
      } else if (ch === '"') inQ = true
      else if (ch === ',') { cells.push(cur); cur = '' }
      else cur += ch
    }
    cells.push(cur)
    out.push(cells.map((c) => c.trim()))
  }
  return out
}

// ─── Parent resolution ────────────────────────────────────────────────────────
function resolveParentId(accountCode: string, byFullCode: Map<string, CoaNode>): string | null {
  const segs = accountCode.split('-')
  for (let n = segs.length - 1; n >= 1; n--) {
    const prefix = segs.slice(0, n).join('-')
    const hit = byFullCode.get(prefix)
    if (hit) return hit.id
  }
  return null
}

// ─── Download template (real .xlsx, 3 sheets) ─────────────────────────────────
async function downloadTemplate() {
  const XLSX = await import('xlsx')

  // Sheet 1: Template with example rows
  const EXAMPLE_ROWS = [
    ['account_code', 'account_name', 'name_en', 'coa_layer', 'account_type', 'normal_balance', 'sort_order',
      'enum_laporan_keuangan', 'enum_laporan_keuangan_category', 'cash_flow_category', 'enum_cf_section',
      'enum_cf_line', 'direct_indirect_cost', 'enum_cost_category', 'tax_code',
      'contra_account', 'is_working_capital', 'is_non_cash_item', 'is_budgeted',
      'is_tax_deductible', 'is_restricted', 'is_trial_balance', 'is_taxation_report',
      'required_sub_gl', 'is_washed_out_account', 'required_child', 'is_active', 'description'],
    // category — asset
    ['1', 'Aset', 'Assets', 'category', 'asset', 'debit', 1, 'BALANCE_SHEET', 'ASSET', '', '', '', '', '', '', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', 'Kelompok akun aset'],
    // type — asset
    ['1-1', 'Aset Lancar', 'Current Assets', 'type', 'asset', 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', '', '', '', '', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', ''],
    // sub_account — asset
    ['1-1-01', 'Kas & Setara Kas', 'Cash & Cash Equivalents', 'sub_account', 'asset', 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', '', '', '', '', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', ''],
    // general_ledger — asset
    ['1-1-01-1', 'Kas Besar', 'Petty Cash', 'general_ledger', 'asset', 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', '', '', '', '', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', ''],
    // detail_ledger — asset
    ['1-1-01-1-0001', 'Kas Operasional', 'Operational Cash', 'detail_ledger', 'asset', 'debit', 1, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', '', '', '', '', 'FALSE', 'TRUE', 'FALSE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', 'Kas untuk operasional harian'],
    // category — revenue
    ['4', 'Pendapatan', 'Revenue', 'category', 'revenue', 'credit', 4, 'INCOME_STATEMENT', 'REVENUE', '', '', '', '', '', '', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', ''],
    // type — revenue
    ['4-1', 'Pendapatan Usaha', 'Operating Revenue', 'type', 'revenue', 'credit', 1, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', '', '', '', '', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', ''],
    // sub_account — revenue
    ['4-1-01', 'Pendapatan Jasa', 'Service Revenue', 'sub_account', 'revenue', 'credit', 1, 'INCOME_STATEMENT', 'REVENUE', 'operating', 'OPERATING', '', '', '', '', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', ''],
    // expense + cost category example
    ['5', 'Beban', 'Expenses', 'category', 'expense', 'debit', 5, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', '', '', '', '', 'FALSE', 'FALSE', 'FALSE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', ''],
    ['5-1', 'Beban Operasional', 'Operational Expenses', 'type', 'expense', 'debit', 1, 'INCOME_STATEMENT', 'OPEX', 'operating', 'OPERATING', '', 'DIRECT', 'OPERATIONAL', '', 'FALSE', 'FALSE', 'FALSE', 'TRUE', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', ''],
    // contra account example
    ['1-3-01-1-9999', 'Akumulasi Penyusutan', 'Accumulated Depreciation', 'detail_ledger', 'asset', 'credit', 99, 'BALANCE_SHEET', 'ASSET', 'operating', 'OPERATING', '', '', '', '', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'TRUE', 'FALSE', 'FALSE', 'FALSE', 'FALSE', 'TRUE', 'Akun kontra aset tetap'],
  ]

  const ws1 = XLSX.utils.aoa_to_sheet(EXAMPLE_ROWS)

  // Column widths
  const wscols = [
    { wch: 20 }, // account_code
    { wch: 28 }, // account_name
    { wch: 28 }, // name_en
    { wch: 16 }, // coa_layer
    { wch: 14 }, // account_type
    { wch: 14 }, // normal_balance
    { wch: 10 }, // sort_order
    { wch: 22 }, // enum_laporan_keuangan
    { wch: 30 }, // enum_laporan_keuangan_category
    { wch: 20 }, // cash_flow_category
    { wch: 16 }, // enum_cf_section
    { wch: 16 }, // enum_cf_line
    { wch: 18 }, // direct_indirect_cost
    { wch: 18 }, // enum_cost_category
    { wch: 12 }, // tax_code
    { wch: 14 }, // contra_account
    { wch: 14 }, // is_working_capital
    { wch: 14 }, // is_non_cash_item
    { wch: 12 }, // is_budgeted
    { wch: 14 }, // is_tax_deductible
    { wch: 12 }, // is_restricted
    { wch: 14 }, // is_trial_balance
    { wch: 16 }, // is_taxation_report
    { wch: 14 }, // required_sub_gl
    { wch: 20 }, // is_washed_out_account
    { wch: 14 }, // required_child
    { wch: 10 }, // is_active
    { wch: 36 }, // description
  ]
  ws1['!cols'] = wscols

  // Sheet 2: Reference (valid values + descriptions)
  const refHeaders = ['Kolom (key)', 'Label', 'Wajib', 'Tipe Data', 'Nilai Valid', 'Keterangan']
  const refRows = COA_COLUMNS.map((c) => [
    c.key,
    c.label,
    c.required ? 'YA' : 'Opsional',
    c.type === 'boolean' ? 'TRUE/FALSE' : c.type === 'integer' ? 'Angka' : c.type === 'enum' ? 'Enum' : 'Teks',
    c.valid ? c.valid.join(' | ') : (c.type === 'boolean' ? 'TRUE | FALSE | 1 | 0 | ya | tidak' : '(teks bebas)'),
    c.description,
  ])
  const ws2 = XLSX.utils.aoa_to_sheet([refHeaders, ...refRows])
  ws2['!cols'] = [{ wch: 34 }, { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 80 }, { wch: 60 }]

  // Sheet 3: Petunjuk
  const petunjuk = [
    ['PETUNJUK IMPORT CHART OF ACCOUNT'],
    [''],
    ['1. Gunakan sheet "Template COA" sebagai panduan format pengisian.'],
    ['   Baris 1 adalah header — JANGAN diubah. Baris 2 dst adalah data.'],
    [''],
    ['2. Kolom wajib (* di label): account_code, account_name, coa_layer, account_type.'],
    ['   Kolom lain opsional; jika dikosongkan, sistem akan mengisi otomatis.'],
    [''],
    ['3. account_code = kode COA lengkap hierarki (mis. 1-1-01-1-0001).'],
    ['   Sistem mengenali parent dari prefix kode secara otomatis.'],
    [''],
    ['4. coa_layer valid: category | type | sub_account | general_ledger | detail_ledger'],
    ['   Alias: sub = sub_account, gl = general_ledger, detail = detail_ledger'],
    [''],
    ['5. account_type valid: asset | liability | equity | revenue | expense'],
    [''],
    ['6. Kolom report (enum_laporan_keuangan, _category, dll) boleh dikosongkan.'],
    ['   Sistem otomatis mengisi berdasarkan account_type agar akun langsung'],
    ['   muncul di Laporan Keuangan.'],
    [''],
    ['7. Boolean flags: isi TRUE/FALSE, 1/0, ya/tidak, yes/no, atau kosongkan (pakai default).'],
    [''],
    ['8. Lihat sheet "Referensi" untuk daftar lengkap kolom + nilai valid.'],
    [''],
    ['9. Import mendukung file .xlsx (Excel) dan .csv.'],
    ['   Untuk .csv, pisahkan kolom dengan koma (,).'],
    [''],
    ['10. Setelah import, cek Audit Trail di halaman COA untuk log perubahan.'],
  ]
  const ws3 = XLSX.utils.aoa_to_sheet(petunjuk)
  ws3['!cols'] = [{ wch: 90 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws1, 'Template COA')
  XLSX.utils.book_append_sheet(wb, ws2, 'Referensi')
  XLSX.utils.book_append_sheet(wb, ws3, 'Petunjuk')

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `coa-import-template-${new Date().toISOString().slice(0, 10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── ImportModal ──────────────────────────────────────────────────────────────
export function ImportModal({ open, allNodes, onClose, onDone }: {
  open: boolean
  allNodes: CoaNode[]
  onClose: () => void
  onDone: () => void
}) {
  const [fileGrid, setFileGrid] = useState<string[][] | null>(null)
  const [csvText, setCsvText] = useState('')
  const [filename, setFilename] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number; errors: { code: string; reason: string }[] } | null>(null)

  useEffect(() => {
    if (open) { setFileGrid(null); setCsvText(''); setFilename(''); setResult(null) }
  }, [open])

  const byFullCode = useMemo(() => new Map(allNodes.map((n) => [n.coaFullCode, n])), [allNodes])

  // Build the raw string grid from either file upload or textarea
  const rawGrid = useMemo<string[][] | null>(() => {
    if (fileGrid) return fileGrid
    if (!csvText.trim()) return null
    return parseCsvToGrid(csvText)
  }, [fileGrid, csvText])

  // Parse + resolve parents
  const parsedRows = useMemo<ParsedGridRow[]>(() => {
    if (!rawGrid) return []
    return parseGrid(rawGrid)
  }, [rawGrid])

  // Enrich with parent_account_id; flag parent-not-found
  const rows = useMemo(() => {
    return parsedRows.map(({ raw, result: nr }) => {
      const code = raw['account_code'] ?? ''
      if (!nr.ok) return { ok: false as const, code, reason: nr.reason }
      const layer = nr.row.coa_layer
      const parentId = resolveParentId(nr.row.account_code, byFullCode)
      if (layer !== 'category' && !parentId) {
        return { ok: false as const, code, reason: `parent tidak ditemukan untuk kode "${code}"` }
      }
      return { ok: true as const, code, name: nr.row.account_name, layer, row: { ...nr.row, parent_account_id: parentId } }
    })
  }, [parsedRows, byFullCode])

  const validRows = rows.filter((r) => r.ok)

  const onFile = useCallback(async (file: File) => {
    setFilename(file.name)
    setCsvText('')
    try {
      const XLSX = await import('xlsx')
      const ab = await file.arrayBuffer()
      const wb = XLSX.read(ab, { type: 'array' })
      const sheetName = wb.SheetNames[0]
      if (!sheetName) { toast.error('File kosong atau tidak memiliki sheet'); return }
      const ws = wb.Sheets[sheetName]!
      const grid: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      const strGrid = grid.map((row) => (row as unknown[]).map((c) => (c == null ? '' : String(c))))
      setFileGrid(strGrid)
    } catch {
      toast.error('Gagal membaca file. Pastikan format .xlsx atau .csv.')
      setFileGrid(null)
    }
  }, [])

  const commit = async () => {
    if (validRows.length === 0) return toast.error('Tidak ada baris valid untuk diimpor')
    setBusy(true)
    try {
      const payload = validRows.map((r) => (r.ok ? r.row : null)).filter(Boolean)
      const res = await fetch('/api/finance/coa/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, rows: payload }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Import gagal')
      setResult(json.data)
      toast.success(`Import selesai: ${json.data.success}/${json.data.total} berhasil`)
      onDone()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="coa-workspace sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UploadCloud className="size-5" /> Import COA (Excel / CSV)</DialogTitle>
          <DialogDescription>
            Upload file <code>.xlsx</code> atau <code>.csv</code>, atau paste CSV di bawah. Download template untuk format lengkap beserta referensi nilai valid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              className="text-sm"
            />
            {filename && <span className="text-xs text-muted-foreground">{filename}</span>}
          </div>

          {!fileGrid && (
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={'account_code,account_name,coa_layer,account_type\n1,Aset,category,asset\n1-1,Aset Lancar,type,asset'}
              className="h-24 w-full rounded-xl border bg-muted/30 p-3 font-mono text-xs outline-none"
            />
          )}

          {rows.length > 0 && (
            <div className="max-h-52 overflow-y-auto rounded-xl border text-xs">
              <div className="sticky top-0 grid grid-cols-[18px_1fr_120px_80px] gap-2 border-b bg-muted/60 px-3 py-1.5 font-semibold text-muted-foreground">
                <span />
                <span>Kode · Nama</span>
                <span>Layer</span>
                <span>Status</span>
              </div>
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[18px_1fr_120px_80px] items-center gap-2 border-b px-3 py-1.5 last:border-0">
                  {r.ok
                    ? <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
                    : <XCircle className="size-3.5 shrink-0 text-destructive" />}
                  <div className="min-w-0">
                    <span className="font-mono">{r.code || '—'}</span>
                    {r.ok && <span className="ml-2 truncate text-muted-foreground">{r.name}</span>}
                    {!r.ok && <span className="ml-2 text-destructive">{r.reason}</span>}
                  </div>
                  <span className="text-muted-foreground">{r.ok ? r.layer : ''}</span>
                  <span className={r.ok ? 'text-emerald-700' : 'text-destructive'}>{r.ok ? 'valid' : 'error'}</span>
                </div>
              ))}
            </div>
          )}

          {result && (
            <div className="rounded-xl border bg-muted/30 p-3 text-sm">
              <div className="font-medium">{result.success} berhasil · {result.failed} gagal</div>
              {result.errors.length > 0 && (
                <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                  {result.errors.slice(0, 8).map((e, i) => <li key={i}>{e.code}: {e.reason}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={downloadTemplate} disabled={busy} className="mr-auto gap-2">
            <FileDown className="size-4" /> Download Template
          </Button>
          <Button variant="outline" onClick={onClose} disabled={busy}>Tutup</Button>
          <Button onClick={commit} disabled={busy || validRows.length === 0}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Import {validRows.length} baris
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── ImportHistoryModal ───────────────────────────────────────────────────────
interface ImportLog {
  id: string
  target_name: string | null
  note: string | null
  after_data: { total?: number; success?: number; failed?: number } | null
  created_at: string
  actor_nama: string | null
}

export function ImportHistoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<ImportLog[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/finance/coa/audit?action=IMPORT', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setRows(j.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="coa-workspace sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="size-5" /> Import/Export History</DialogTitle>
          <DialogDescription>Riwayat import COA. Export bersifat unduhan langsung di sisi klien.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Belum ada riwayat import.</div>
          ) : (
            rows.map((r) => {
              const ok = (r.after_data?.failed ?? 0) === 0
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border p-3 text-sm">
                  {ok ? <CheckCircle2 className="size-4 text-emerald-600" /> : <XCircle className="size-4 text-amber-600" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.target_name ?? 'CSV import'}</div>
                    <div className="text-xs text-muted-foreground">{r.note} · {new Date(r.created_at).toLocaleString('id-ID')}</div>
                  </div>
                  <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{r.after_data?.success ?? 0}/{r.after_data?.total ?? 0}</span>
                </div>
              )
            })
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
