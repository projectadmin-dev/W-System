/**
 * Shared option sets for the journal module, mirroring the DB CHECK constraints
 * on `journal_entries` so the UI can never produce an invalid value.
 */

export const JOURNAL_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'posted', label: 'Posted' },
  { value: 'reversed', label: 'Reversed' },
  { value: 'void', label: 'Void' },
] as const

// journal_entries.kategori_jurnal CHECK constraint
export const KATEGORI_JURNAL = [
  { value: 'REGULAR', label: 'Regular', description: 'Jurnal transaksi operasional harian' },
  { value: 'BEGINNING_BALANCE', label: 'Beginning Balance', description: 'Saldo awal periode/tahun' },
  { value: 'ADJUSTMENT', label: 'Adjustment', description: 'Jurnal penyesuaian (accrual, depresiasi, dll)' },
  { value: 'CLOSING', label: 'Closing', description: 'Jurnal penutup akhir periode' },
] as const

// journal_entries.source_type CHECK constraint
export const SOURCE_TYPES = [
  { value: 'manual', label: 'Manual', description: 'Input manual oleh user' },
  { value: 'invoice', label: 'Invoice', description: 'Berasal dari faktur penjualan' },
  { value: 'payment', label: 'Payment', description: 'Berasal dari pembayaran' },
  { value: 'expense_claim', label: 'Expense Claim', description: 'Berasal dari klaim biaya' },
  { value: 'payroll', label: 'Payroll', description: 'Berasal dari penggajian' },
  { value: 'depreciation', label: 'Depreciation', description: 'Berasal dari penyusutan aset' },
  { value: 'adjustment', label: 'Adjustment', description: 'Jurnal penyesuaian sistem' },
] as const

export const CURRENCIES = [
  { value: 'IDR', label: 'IDR — Rupiah' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
] as const

export function labelOf(set: readonly { value: string; label: string }[], value?: string | null) {
  if (!value) return '—'
  return set.find((o) => o.value === value)?.label ?? value
}
