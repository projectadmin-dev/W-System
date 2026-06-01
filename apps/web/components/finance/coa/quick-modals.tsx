'use client'

// Quick-action modals: Audit Trail (immutable log + before/after diff).
import { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select'
import { ScrollText, ShieldCheck, Loader2 } from 'lucide-react'

const SEVERITY_CLS: Record<string, string> = {
  high: 'bg-red-100 text-red-800', medium: 'bg-amber-100 text-amber-800', low: 'bg-emerald-100 text-emerald-800',
}
const fmtTs = (s: string) => { try { return new Date(s).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return s } }

interface AuditEntry {
  id: string; action: string; severity: string
  actor_nama: string | null; actor_nik: string | null
  target_coa_code: string | null; target_name: string | null; target_layer: string | null
  field: string | null; before_data: unknown; after_data: unknown; note: string | null; created_at: string
}

export function AuditTrailModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/coa/audit?action=${action}&severity=${severity}&q=${encodeURIComponent(q)}`, { cache: 'no-store' })
      const json = await res.json()
      setRows(json.data ?? [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [action, severity, q])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="coa-workspace sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ScrollText className="size-5" /> Audit Trail</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> ISO 27001 · SOX 404 — immutable, retensi 7 tahun. Setiap perubahan COA tercatat.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Cari nama/kode/aktor…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-[220px]" />
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent className="coa-workspace">
              {['all', 'CREATE', 'EDIT', 'DELETE', 'CONFIG', 'STATUS', 'APPROVAL', 'IMPORT'].map((a) => (
                <SelectItem key={a} value={a}>{a === 'all' ? 'Semua aksi' : a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent className="coa-workspace">
              {['all', 'high', 'medium', 'low'].map((s) => (
                <SelectItem key={s} value={s}>{s === 'all' ? 'Semua severity' : s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex justify-center py-10 text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Belum ada entri audit untuk filter ini.</div>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="rounded-xl border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${SEVERITY_CLS[r.severity] ?? 'bg-muted'}`}>{r.action}</span>
                  <span className="font-medium">{r.target_name ?? '—'}</span>
                  {r.target_coa_code && <span className="font-mono text-xs text-muted-foreground">{r.target_coa_code}</span>}
                  <span className="ml-auto text-xs text-muted-foreground">{fmtTs(r.created_at)}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {r.actor_nama ?? 'System'} {r.field ? `· field: ${r.field}` : ''} {r.note ? `· ${r.note}` : ''}
                </div>
                {(!!r.before_data || !!r.after_data) && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <pre className="overflow-x-auto rounded bg-muted/50 p-2">{JSON.stringify(r.before_data ?? null, null, 0)}</pre>
                    <pre className="overflow-x-auto rounded bg-emerald-50 p-2">{JSON.stringify(r.after_data ?? null, null, 0)}</pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

