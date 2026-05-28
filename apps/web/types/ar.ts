// W. System — AR Monitoring Types

export type InvoiceType = 'one_time' | 'recurring'
export type StatusBayar = 'belum' | 'sebagian' | 'lunas' | 'jatuh_tempo'
export type StatusKirim = 'reminder' | 'sent'
export type RecurringInterval = 'monthly' | 'quarterly' | 'biannual' | 'annual'

export interface ARBankAccount {
  id: string
  kode: string
  nama_bank: string
  nama_akun: string
  no_rekening: string | null
  label: string // "B001 - BCA IRFAN ARSANDI"
  is_active: boolean
}

export interface ARPaymentHistory {
  id: string
  invoice_id: string
  sudah_dibayar_lama: number
  sisa_piutang_lama: number
  bayar_sekarang: number
  status_baru: string
  bank_label: string | null
  deadline_baru: string | null
  catatan_pembayaran: string | null
  created_at: string
  actor_name: string | null
}

export interface ARInvoice {
  id: string
  no_invoice: string
  tgl_invoice: string
  tipe_invoice: InvoiceType
  description: string | null
  qty: number
  harga_satuan: number
  ppn_11_persen: boolean
  subtotal: number
  ppn_amount: number
  total_piutang: number
  sudah_dibayar: number
  sisa_piutang: number
  note_termin: string | null
  payment_method: string | null
  bank_id: string | null
  bank_label: string | null
  deadline_bayar: string | null
  days_overdue: number
  status_bayar: StatusBayar
  status_kirim: StatusKirim
  is_archived: boolean
  recurring_parent_id: string | null
  recurring_sequence: number | null
  recurring_interval: RecurringInterval | null
  recurring_start_date: string | null
  recurring_end_date: string | null
  payment_history?: ARPaymentHistory[]
  created_at: string
}

export interface ARProjectGroup {
  project_id: string
  project_name: string
  client_name: string
  nilai_kontrak: number
  total_piutang: number
  sudah_dibayar: number
  sisa_piutang: number
  status_project: StatusBayar
  is_archived: boolean
  invoice_count: number
  invoices: ARInvoice[]
}

export interface ARSummary {
  total_piutang: number
  sudah_dibayar: number
  collection_pct: number
  sisa_piutang: number
  outstanding_pct: number
  jatuh_tempo_count: number
  total_invoice_count: number
  dso_hari: number
}

export interface ARListResponse {
  data: ARProjectGroup[]
  meta: { page: number; size: number; total: number }
  summary: ARSummary
}

// ─── Request types ────────────────────────────────────────────────────────────

export interface CreateInvoiceRequest {
  project_id: string
  tipe_invoice: InvoiceType
  no_invoice?: string
  tgl_invoice: string
  description: string
  qty: number
  harga_satuan: number
  ppn_11_persen: boolean
  recurring_start_date?: string
  recurring_end_date?: string
  recurring_interval?: RecurringInterval
  sudah_dibayar: number
  note_termin: string
  payment_method: string
  bank_id?: string
  deadline_bayar?: string
  status_bayar: StatusBayar
}

export interface UpdatePaymentRequest {
  bayar_sekarang: number
  status_baru: StatusBayar
  bank_id: string
  deadline_baru?: string
  catatan_pembayaran: string
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const STATUS_BAYAR_LABEL: Record<StatusBayar, string> = {
  belum: 'Belum',
  sebagian: 'Sebagian',
  lunas: 'Lunas',
  jatuh_tempo: 'Jatuh Tempo',
}

export const STATUS_KIRIM_LABEL: Record<StatusKirim, string> = {
  reminder: 'Reminder',
  sent: 'Sent',
}

export const INTERVAL_LABEL: Record<RecurringInterval, string> = {
  monthly: 'Bulanan',
  quarterly: 'Triwulan (3 bln)',
  biannual: 'Semester (6 bln)',
  annual: 'Tahunan',
}

export const PAYMENT_METHODS = ['BCA', 'Mandiri', 'BRI', 'Cash']

// ─── Utilities ────────────────────────────────────────────────────────────────

export const formatRp = (n: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)

export const formatRpShort = (n: number): string => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}jt`
  return formatRp(n)
}

export const formatDate = (iso?: string | null): string => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export const isOverdue = (deadline?: string | null, status?: StatusBayar): boolean =>
  !!deadline && status !== 'lunas' && new Date(deadline) < new Date()

export const daysOverdue = (deadline?: string | null): number => {
  if (!deadline) return 0
  const diff = Date.now() - new Date(deadline).getTime()
  return Math.max(0, Math.floor(diff / 86_400_000))
}

export const previewRecurringDates = (
  startDate: string,
  endDate: string,
  interval: RecurringInterval
): string[] => {
  if (!startDate || !endDate || !interval) return []
  const dates: string[] = []
  let current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end && dates.length < 60) {
    dates.push(current.toISOString().split('T')[0])
    const next = new Date(current)
    switch (interval) {
      case 'monthly':   next.setMonth(next.getMonth() + 1); break
      case 'quarterly': next.setMonth(next.getMonth() + 3); break
      case 'biannual':  next.setMonth(next.getMonth() + 6); break
      case 'annual':    next.setFullYear(next.getFullYear() + 1); break
    }
    current = next
  }
  return dates
}
