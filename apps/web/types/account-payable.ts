// ── Account Payable (Pengelolaan Tagihan) types ─────────────────────────────

export type APStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID' | 'REJECTED'

// Derived display status used by the dashboard filters
export type APDisplayStatus = 'open' | 'overdue' | 'paid'

export type DasarPengajuanAP =
  | 'purchase_order'
  | 'ppn'
  | 'infrastructure'
  | 'overhead'
  | 'server'
  | 'lain_lain'

export const AP_STATUS_LABEL: Record<APStatus, string> = {
  DRAFT:     'Draft',
  SUBMITTED: 'Diajukan',
  APPROVED:  'Disetujui',
  PAID:      'Lunas',
  REJECTED:  'Ditolak',
}

export const AP_STATUS_COLOR: Record<APStatus, string> = {
  DRAFT:     'bg-muted text-muted-foreground',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  APPROVED:  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  PAID:      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export const DASAR_PENGAJUAN_LABEL: Record<DasarPengajuanAP, string> = {
  purchase_order: 'Purchase Order',
  ppn:            'PPN',
  infrastructure: 'Infrastructure',
  overhead:       'Overhead',
  server:         'Server',
  lain_lain:      'Lain-lain',
}

export interface APItem {
  id?: string
  ap_invoice_id?: string
  urutan: number
  deskripsi: string
  qty: number
  harga: number
  subtotal?: number
  diskon?: number
  pajak?: number
  coa_id?: string | null
  coa_kode?: string | null
  coa_nama?: string | null
}

export interface APApprovalStep {
  id: string
  ap_invoice_id: string
  step: number
  action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'PAY'
  actor_id: string | null
  actor_name: string | null
  notes: string | null
  created_at: string
}

export interface APInvoice {
  id: string
  tenant_id: string
  ap_number: string
  no_invoice: string
  no_ref_dokumen: string | null
  tgl_terima: string
  tgl_jatuh_tempo: string
  dasar_pengajuan: DasarPengajuanAP
  pihak_ketiga: string
  vendor_id: string | null
  project_id: string | null
  project_name: string | null
  deskripsi: string | null
  mata_uang: string
  kurs: number
  subtotal: number
  discount_amount: number
  tax_amount: number
  grand_total: number
  amount_paid: number
  amount_due: number
  status: APStatus
  journal_entry_id: string | null
  attachment_url: string | null
  submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
  approver_name: string | null
  rejected_at: string | null
  reject_reason: string | null
  paid_at: string | null
  created_at: string
  updated_at: string | null
  items: APItem[]
  approval_steps?: APApprovalStep[]
  project?: { id: string; project_code?: string; project_name: string } | null
}

export interface APAgingBucket {
  label: string
  amount: number
  count: number
}

export interface APForecastBucket {
  label: string
  date_from: string
  date_to: string
  amount: number
}

export interface APSummary {
  open_count: number
  overdue_count: number
  paid_total: number
  total_due: number
  aging: APAgingBucket[]
  forecast: APForecastBucket[]
}

// ── helpers ─────────────────────────────────────────────────────────────────

export function formatRpAP(n: number | null | undefined, currency = 'IDR'): string {
  const v = Number(n ?? 0)
  if (currency !== 'IDR') return `${currency} ${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  return 'Rp ' + v.toLocaleString('id-ID', { maximumFractionDigits: 0 })
}

export function formatDateAP(d: string | null | undefined): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** days until due (negative = overdue). null when no due date */
export function daysToDue(due: string | null | undefined): number | null {
  if (!due) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(due); d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}

export function isOverdueAP(inv: Pick<APInvoice, 'tgl_jatuh_tempo' | 'amount_due' | 'status'>): boolean {
  if (inv.status === 'PAID' || inv.amount_due <= 0) return false
  const d = daysToDue(inv.tgl_jatuh_tempo)
  return d !== null && d < 0
}

export function displayStatusAP(inv: Pick<APInvoice, 'tgl_jatuh_tempo' | 'amount_due' | 'status'>): APDisplayStatus {
  if (inv.status === 'PAID' || inv.amount_due <= 0) return 'paid'
  if (isOverdueAP(inv)) return 'overdue'
  return 'open'
}
