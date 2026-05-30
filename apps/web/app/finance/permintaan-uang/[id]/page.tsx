'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, SendIcon } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { toast } from 'sonner'
import { cn } from '@workspace/ui/lib/utils'
import type { PermintaanUang, PUStatus, EmployeeOption } from '@/types/fund-request'
import { PU_STATUS_LABEL, PU_STATUS_COLOR, formatRpFR, formatDateFR } from '@/types/fund-request'

function PUStatusBadge({ status }: { status: PUStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', PU_STATUS_COLOR[status])}>
      {PU_STATUS_LABEL[status]}
    </span>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? '—'}</p>
    </div>
  )
}

// ─── Employee Picker (inline, minimal) ───────────────────────────────────────
function EmployeePickerInline({
  value, onSelect, placeholder,
}: { value: EmployeeOption | null; onSelect: (e: EmployeeOption) => void; placeholder: string }) {
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
    <div ref={ref} className="relative">
      <Input placeholder={placeholder}
        value={value ? value.full_name : search}
        onChange={e => { setSearch(e.target.value); if (value) onSelect({ id: '', full_name: '' }) }} />
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-40 overflow-y-auto">
          {results.map(emp => (
            <button key={emp.id} type="button"
              className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
              onMouseDown={() => { onSelect(emp); setSearch(''); setOpen(false) }}>
              <p className="font-semibold">{emp.full_name}</p>
              <p className="text-xs text-muted-foreground">{emp.nik} · {emp.department}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ActionModal({
  open, onClose, title, requireNote, onConfirm, loading,
}: {
  open: boolean; onClose: () => void; title: string; requireNote: boolean
  onConfirm: (note: string, approver: EmployeeOption | null) => void; loading: boolean
}) {
  const [note, setNote] = useState('')
  const [approver, setApprover] = useState<EmployeeOption | null>(null)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Approver</label>
            <div className="mt-1">
              <EmployeePickerInline value={approver} onSelect={setApprover} placeholder="Pilih approver..." />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">
              Catatan {requireNote && <span className="text-red-500">*</span>}
            </label>
            <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
              placeholder={requireNote ? 'Alasan wajib diisi...' : 'Catatan (opsional)...'}
              value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => onConfirm(note, approver)}
            disabled={loading || (requireNote && !note.trim())}>
            {loading ? 'Memproses...' : 'Konfirmasi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PermintaanUangDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [pu, setPu] = useState<PermintaanUang | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'approve' | 'reject' | null>(null)
  const [acting, setActing] = useState(false)

  const fetchPU = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/permintaan-uang/${id}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Not found'); return }
      setPu(json.data)
    } catch { toast.error('Gagal memuat data') } finally { setLoading(false) }
  }

  useEffect(() => { fetchPU() }, [id])

  const handleSubmit = async () => {
    setActing(true)
    try {
      const res = await fetch(`/api/finance/permintaan-uang/${id}/submit`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Gagal'); return }
      toast.success('PU diajukan untuk approval')
      fetchPU()
    } catch (e) { toast.error(String(e)) } finally { setActing(false) }
  }

  const handleAction = async (action: 'approve' | 'reject', note: string, approver: EmployeeOption | null) => {
    setActing(true)
    try {
      const res = await fetch(`/api/finance/permintaan-uang/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: note,
          approver_id: approver?.id,
          approver_name: approver?.full_name,
          approver_dept: approver?.department,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'Gagal'); return }
      toast.success(action === 'approve' ? 'PU disetujui' : 'PU ditolak')
      setModal(null)
      fetchPU()
    } catch (e) { toast.error(String(e)) } finally { setActing(false) }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Memuat data...</div>
  if (!pu) return <div className="p-6 text-destructive">Data tidak ditemukan</div>

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-mono">{pu.doc_number}</h1>
            <p className="text-sm text-muted-foreground">Permintaan Uang</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PUStatusBadge status={pu.status} />
          {pu.status === 'DRAFT' && (
            <Button size="sm" onClick={handleSubmit} disabled={acting}>
              <SendIcon className="h-4 w-4 mr-1" />Ajukan
            </Button>
          )}
          {pu.status === 'PENDING_APPROVAL' && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700"
                onClick={() => setModal('approve')} disabled={acting}>
                <CheckCircleIcon className="h-4 w-4 mr-1" />Approve
              </Button>
              <Button size="sm" variant="destructive"
                onClick={() => setModal('reject')} disabled={acting}>
                <XCircleIcon className="h-4 w-4 mr-1" />Tolak
              </Button>
            </>
          )}
          {pu.status === 'APPROVED' && (
            <Button size="sm" variant="outline" asChild>
              <a href={`/finance/pembayaran/new?pu_id=${pu.id}`}>Buat Pembayaran</a>
            </Button>
          )}
        </div>
      </div>

      {/* Info utama */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Detail Pengajuan</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoRow label="Tanggal Permintaan" value={formatDateFR(pu.tanggal_permintaan)} />
            <InfoRow label="Jatuh Tempo" value={
              <span className={pu.status === 'APPROVED' && new Date(pu.tanggal_kebutuhan) < new Date() ? 'text-red-500' : ''}>
                {formatDateFR(pu.tanggal_kebutuhan)}
              </span>
            } />
            <InfoRow label="Nominal" value={<span className="text-lg font-bold">{formatRpFR(pu.nominal, pu.mata_uang)}</span>} />
            <InfoRow label="Mata Uang" value={pu.mata_uang} />
            <InfoRow label="Dasar Pengajuan" value={pu.dasar_pengajuan} />
            {pu.dasar_pengajuan === 'PROJECT' && pu.project && (
              <InfoRow label="Project" value={`${pu.project.project_code} — ${pu.project.project_name}`} />
            )}
          </div>
          {pu.catatan && <p className="mt-4 text-sm text-muted-foreground border-t pt-3">{pu.catatan}</p>}
        </CardContent>
      </Card>

      {/* Internal items */}
      {pu.dasar_pengajuan === 'INTERNAL' && pu.items.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Deskripsi Kebutuhan</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2 px-3">No</th><th className="text-left py-2 px-3">Deskripsi</th><th className="text-right py-2 px-3">Nominal</th></tr></thead>
              <tbody>
                {pu.items.map(item => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2 px-3 text-muted-foreground">{item.urutan}</td>
                    <td className="py-2 px-3">{item.deskripsi}</td>
                    <td className="py-2 px-3 text-right">{item.nominal ? formatRpFR(item.nominal) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Requestor */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3"><CardTitle className="text-base">Audit Trail</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoRow label="Requestor" value={pu.requestor_name} />
            <InfoRow label="Departemen" value={pu.requestor_dept} />
            <InfoRow label="Jabatan" value={pu.requestor_position} />
            <InfoRow label="Golongan" value={pu.requestor_grade} />
            {pu.submitted_at && <InfoRow label="Diajukan" value={formatDateFR(pu.submitted_at)} />}
            {pu.approved_at && <InfoRow label="Disetujui" value={formatDateFR(pu.approved_at)} />}
            {pu.rejected_at && <InfoRow label="Ditolak" value={formatDateFR(pu.rejected_at)} />}
            {pu.paid_at && <InfoRow label="Dibayar" value={formatDateFR(pu.paid_at)} />}
          </div>
        </CardContent>
      </Card>

      {/* Approval history */}
      {pu.approval_steps.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Riwayat Approval</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pu.approval_steps.map(step => (
                <div key={step.id} className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  step.status === 'APPROVED' ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                    : step.status === 'REJECTED' ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                    : 'bg-muted/30'
                )}>
                  <span className={cn('mt-0.5', step.status === 'APPROVED' ? 'text-green-600' : step.status === 'REJECTED' ? 'text-red-600' : 'text-muted-foreground')}>
                    {step.status === 'APPROVED' ? '✅' : step.status === 'REJECTED' ? '❌' : '⏳'}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.approver_name ?? 'Approver'}</p>
                    {step.approver_dept && <p className="text-xs text-muted-foreground">{step.approver_dept}</p>}
                    {step.notes && <p className="text-sm mt-1 italic">"{step.notes}"</p>}
                    {step.actioned_at && <p className="text-xs text-muted-foreground mt-1">{formatDateFR(step.actioned_at)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Modals */}
      <ActionModal
        open={modal === 'approve'} onClose={() => setModal(null)}
        title="Konfirmasi Approval" requireNote={false} loading={acting}
        onConfirm={(note, approver) => handleAction('approve', note, approver)}
      />
      <ActionModal
        open={modal === 'reject'} onClose={() => setModal(null)}
        title="Tolak Permintaan Uang" requireNote={true} loading={acting}
        onConfirm={(note, approver) => handleAction('reject', note, approver)}
      />
    </div>
  )
}
