// W. System -- AR Monitoring Frontend Types
// Re-export dari repository + utility helpers

export type {
  InvoiceType, StatusBayar, StatusKirim, RecurringInterval,
  ARBankAccount, ARPaymentHistory, ARInvoice, ARProjectGroup,
  ARSummary, CreateInvoicePayload, UpdatePaymentPayload,
} from '@/lib/repositories/ar-repository'

export const STATUS_BAYAR_LABEL: Record<string, string> = {
  belum: 'Belum',
  sebagian: 'Sebagian',
  lunas: 'Lunas',
  jatuh_tempo: 'Jatuh Tempo',
}

export const STATUS_BAYAR_COLOR: Record<string, string> = {
  belum: '#6c757d',
  sebagian: '#6c5ce7',
  lunas: '#28a745',
  jatuh_tempo: '#fd7e14',
}

export const STATUS_KIRIM_LABEL: Record<string, string> = {
  reminder: 'Reminder',
  sent: 'Sent',
}

export const INTERVAL_LABEL: Record<string, string> = {
  monthly: 'Bulanan',
  quarterly: 'Triwulan (3 bulan)',
  biannual: 'Semester (6 bulan)',
  annual: 'Tahunan',
}

export const PAYMENT_METHODS = ['BCA', 'Mandiri', 'BRI', 'Cash']

export const formatRp = (n: number): string =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

export const formatDate = (iso?: string): string => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const isOverdue = (deadline?: string, status?: string): boolean =>
  !!deadline && status !== 'lunas' && new Date(deadline) < new Date()

export const previewRecurringDates = (
  startDate: string,
  endDate: string,
  interval: string
): string[] => {
  if (!startDate || !endDate || !interval) return []
  const dates: string[] = []
  let current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    const next = new Date(current)
    switch (interval) {
      case 'monthly': next.setMonth(next.getMonth() + 1); break
      case 'quarterly': next.setMonth(next.getMonth() + 3); break
      case 'biannual': next.setMonth(next.getMonth() + 6); break
      case 'annual': next.setFullYear(next.getFullYear() + 1); break
    }
    current = next
  }
  return dates
}
