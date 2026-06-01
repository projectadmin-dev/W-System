'use client'

// Import (CSV → preview → commit) and Import/Export history modals (Phase 5).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'
import { UploadCloud, History, Loader2, CheckCircle2, XCircle, FileDown } from 'lucide-react'
import { LAYER_ORDER, toDbLayer, type CoaLayer } from '@/lib/coa-logic'
import type { CoaNode } from './types'

// Minimal CSV parser (handles quoted fields + commas inside quotes).
function parseCsv(text: string): string[][] {
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

interface ParsedRow {
  account_code: string
  account_name: string
  account_type: string
  level: number
  normal_balance: 'debit' | 'credit'
  coa_layer: string
  parent_account_id: string | null
  valid: boolean
  reason?: string
}

function feLayerFrom(raw: string): CoaLayer | null {
  const v = raw.toLowerCase().trim()
  if (LAYER_ORDER.includes(v as CoaLayer)) return v as CoaLayer
  const map: Record<string, CoaLayer> = { sub_account: 'sub', general_ledger: 'gl', detail_ledger: 'detail' }
  return map[v] ?? null
}

/** Resolve the parent node by the longest existing full-code prefix. */
function resolveParent(fullCode: string, byFullCode: Map<string, CoaNode>): CoaNode | null {
  const segs = fullCode.split('-')
  for (let n = segs.length - 1; n >= 1; n--) {
    const prefix = segs.slice(0, n).join('-')
    const hit = byFullCode.get(prefix)
    if (hit) return hit
  }
  return null
}

function downloadTemplate() {
  const csv = [
    'account_code,account_name,coa_layer,account_type',
    '1,Aset,category,asset',
    '1-1,Aset Lancar,type,asset',
    '1-1-01,Kas & Setara Kas,sub,asset',
    '1-1-01-1,Kas Besar,gl,asset',
    '1-1-01-1-0001,Kas Operasional,detail,asset',
    '2,Kewajiban,category,liability',
    '2-1,Kewajiban Jangka Pendek,type,liability',
    '2-1-01,Hutang Usaha,sub,liability',
    '2-1-01-1,Hutang Dagang,gl,liability',
    '2-1-01-1-0001,Hutang Dagang Lokal,detail,liability',
  ].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'coa-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function ImportModal({ open, allNodes, onClose, onDone }: { open: boolean; allNodes: CoaNode[]; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('')
  const [filename, setFilename] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number; errors: { code: string; reason: string }[] } | null>(null)

  useEffect(() => {
    if (open) { setText(''); setFilename(''); setResult(null) }
  }, [open])

  const byFullCode = useMemo(() => new Map(allNodes.map((n) => [n.coaFullCode, n])), [allNodes])

  const rows: ParsedRow[] = useMemo(() => {
    if (!text.trim()) return []
    const grid = parseCsv(text)
    if (grid.length < 2) return []
    const header = grid[0]!.map((h) => h.toLowerCase().replace(/\s+/g, '_'))
    const idx = (...names: string[]) => names.map((n) => header.indexOf(n)).find((i) => i >= 0) ?? -1
    const iCode = idx('coa_full_code', 'account_code', 'code', 'full_code')
    const iName = idx('account_name', 'name', 'nama')
    const iLayer = idx('coa_layer', 'layer')
    const iType = idx('account_type', 'type')
    return grid.slice(1).map((cells): ParsedRow => {
      const code = (cells[iCode] ?? '').trim()
      const name = (cells[iName] ?? '').trim()
      const fe = feLayerFrom(cells[iLayer] ?? '')
      const base: ParsedRow = { account_code: code, account_name: name, account_type: '', level: 0, normal_balance: 'debit', coa_layer: '', parent_account_id: null, valid: false }
      if (!code || !name) return { ...base, reason: 'code/name kosong' }
      if (!fe) return { ...base, reason: 'layer tidak dikenal' }
      const parent = resolveParent(code, byFullCode)
      if (fe !== 'category' && !parent) return { ...base, reason: 'parent tidak ditemukan' }
      const typeRaw = (cells[iType] ?? '').trim().toLowerCase()
      const accountType = typeRaw || parent?.accountType || 'asset'
      const normal: 'debit' | 'credit' = parent ? parent.normalBalance : accountType === 'asset' || accountType === 'expense' ? 'debit' : 'credit'
      return {
        account_code: code, account_name: name, account_type: accountType,
        level: LAYER_ORDER.indexOf(fe) + 1, normal_balance: normal, coa_layer: toDbLayer(fe),
        parent_account_id: parent?.id ?? null, valid: true,
      }
    })
  }, [text, byFullCode])

  const validRows = rows.filter((r) => r.valid)

  const onFile = useCallback((file: File) => {
    setFilename(file.name)
    const reader = new FileReader()
    reader.onload = () => setText(String(reader.result ?? ''))
    reader.readAsText(file)
  }, [])

  const commit = async () => {
    if (validRows.length === 0) return toast.error('Tidak ada baris valid untuk diimpor')
    setBusy(true)
    try {
      const payload = validRows.map(({ valid, reason, ...r }) => r)
      const res = await fetch('/api/finance/coa/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename, rows: payload }) })
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
          <DialogTitle className="flex items-center gap-2"><UploadCloud className="size-5" /> Import COA (CSV)</DialogTitle>
          <DialogDescription>
            Kolom: <code>account_code</code> (full, mis. 1-1-01-1-2000), <code>account_name</code>, <code>coa_layer</code> (category|type|sub|gl|detail), <code>account_type</code> (opsional). Parent &amp; level diturunkan otomatis dari kode.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="text-sm" />
            {filename && <span className="text-xs text-muted-foreground">{filename}</span>}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'account_code,account_name,coa_layer,account_type\n1-1-01-1-3000,KAS TEST,detail,asset'}
            className="h-28 w-full rounded-xl border bg-muted/30 p-3 font-mono text-xs outline-none"
          />

          {rows.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-xl border text-xs">
              {rows.map((r, i) => (
                <div key={i} className="flex items-center gap-2 border-b px-3 py-1.5 last:border-0">
                  {r.valid ? <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" /> : <XCircle className="size-3.5 shrink-0 text-destructive" />}
                  <span className="font-mono">{r.account_code || '—'}</span>
                  <span className="truncate text-muted-foreground">{r.account_name}</span>
                  {!r.valid && <span className="ml-auto text-destructive">{r.reason}</span>}
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
          <Button variant="outline" onClick={downloadTemplate} disabled={busy} className="mr-auto">
            <FileDown className="mr-2 size-4" /> Download Template
          </Button>
          <Button variant="outline" onClick={onClose} disabled={busy}>Tutup</Button>
          <Button onClick={commit} disabled={busy || validRows.length === 0}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Import {validRows.length} baris
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface ImportLog { id: string; target_name: string | null; note: string | null; after_data: { total?: number; success?: number; failed?: number } | null; created_at: string; actor_nama: string | null }

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
          <DialogDescription>Riwayat import COA. (Export bersifat unduhan langsung di sisi klien.)</DialogDescription>
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
