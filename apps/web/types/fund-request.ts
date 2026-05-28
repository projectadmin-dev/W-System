// W. System — Permintaan Uang & Pembayaran Types

export type PUStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED'
export type PayStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PAID' | 'CANCELLED'
export type DasarPengajuan = 'PROJECT' | 'INTERNAL'
export type MataUang = 'IDR' | 'USD' | 'EUR' | 'SGD'
export type ApprovalStepStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export const PU_STATUS_LABEL: Record<PUStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Menunggu Approval',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  PAID: 'Sudah Dibayar',
  CANCELLED: 'Dibatalkan',
}

export const PU_STATUS_COLOR: Record<PUStatus, string> = {
  DRAFT: 'bg-gray-500 text-white',
  PENDING_APPROVAL: 'bg-yellow-500 text-white',
  APPROVED: 'bg-blue-600 text-white',
  REJECTED: 'bg-red-600 text-white',
  PAID: 'bg-green-600 text-white',
  CANCELLED: 'bg-gray-400 text-white',
}

export const PAY_STATUS_LABEL: Record<PayStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Menunggu Approval',
  APPROVED: 'Disetujui',
  PAID: 'Lunas',
  CANCELLED: 'Dibatalkan',
}

export const PAY_STATUS_COLOR: Record<PayStatus, string> = {
  DRAFT: 'bg-gray-500 text-white',
  PENDING_APPROVAL: 'bg-yellow-500 text-white',
  APPROVED: 'bg-blue-600 text-white',
  PAID: 'bg-green-600 text-white',
  CANCELLED: 'bg-gray-400 text-white',
}

export interface PUItem {
  id: string
  permintaan_uang_id: string
  urutan: number
  deskripsi: string
  nominal?: number
}

export interface ApprovalStep {
  id: string
  level: number
  approver_id?: string
  approver_name?: string
  approver_dept?: string
  status: ApprovalStepStatus
  notes?: string
  actioned_at?: string
  created_at: string
}

export interface PermintaanUang {
  id: string
  tenant_id: string
  doc_number: string
  status: PUStatus
  tanggal_permintaan: string
  tanggal_kebutuhan: string
  nominal: number
  mata_uang: MataUang
  catatan?: string
  dasar_pengajuan: DasarPengajuan
  project_id?: string
  project?: { id: string; project_code: string; project_name: string } | null
  requestor_id?: string
  requestor_nik?: string
  requestor_name?: string
  requestor_dept?: string
  requestor_position?: string
  requestor_grade?: string
  items: PUItem[]
  approval_steps: ApprovalStep[]
  submitted_at?: string
  approved_at?: string
  rejected_at?: string
  paid_at?: string
  created_at: string
  updated_at?: string
}

export interface BiayaLain {
  id: string
  pembayaran_id: string
  urutan: number
  deskripsi: string
  nominal: number
  coa_id?: string
  coa_kode?: string
  coa_nama?: string
}

export interface Pembayaran {
  id: string
  tenant_id: string
  doc_number: string
  status: PayStatus
  permintaan_uang_id: string
  permintaan_uang?: PermintaanUang | null
  tanggal_pembayaran: string
  nominal_bayar: number
  mata_uang: MataUang
  bank_dari_coa_id?: string
  bank_dari_nama?: string
  bank_dari_kode?: string
  bank_tujuan_nama: string
  bank_tujuan_nomor: string
  bank_tujuan_atas_nama?: string
  requestor_id?: string
  requestor_name?: string
  requestor_dept?: string
  requestor_position?: string
  requestor_grade?: string
  approver_id?: string
  approver_name?: string
  approver_dept?: string
  approver_position?: string
  approver_grade?: string
  pic_finance_id?: string
  pic_finance_name?: string
  pic_finance_dept?: string
  pic_finance_position?: string
  pic_finance_grade?: string
  catatan?: string
  biaya_lain: BiayaLain[]
  submitted_at?: string
  approved_at?: string
  paid_at?: string
  created_at: string
  updated_at?: string
}

export interface EmployeeOption {
  id: string
  full_name: string
  nik?: string
  department?: string
  department_id?: string
  position_name?: string
  grade?: string
}

export interface COAOption {
  id: string
  account_code: string
  account_name: string
  account_type: string
}

export function formatRpFR(amount: number, currency: MataUang = 'IDR'): string {
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export function formatDateFR(d?: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function isOverdueFR(tanggal_kebutuhan: string, status: PUStatus): boolean {
  return status === 'APPROVED' && new Date(tanggal_kebutuhan) < new Date()
}
