'use client'

import { useState } from 'react'
import { EXPENSE_CATEGORIES, EXPENSE_KINDS, mockExpenseService } from '../../lib/repositories/finance-expenses'
import type { Expense, ExpenseFilter, ExpenseStatus, ExpenseKind } from '../../lib/repositories/finance-expenses'

const statusClasses: Record<ExpenseStatus, string> = {
  draft: 'bg-gray-600 text-gray-100',
  submitted: 'bg-blue-600 text-blue-100',
  approved: 'bg-emerald-600 text-emerald-100',
  rejected: 'bg-red-600 text-red-100',
  paid: 'bg-purple-600 text-purple-100',
  cancelled: 'bg-gray-700 text-gray-400 line-through',
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Tunai',
  transfer: 'Transfer',
  corporate_card: 'Corporate Card',
  reimbursement: 'Reimbursement',
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function ExpenseFilters({ filter, onChange }: { filter: ExpenseFilter; onChange: (f: ExpenseFilter) => void }) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="Cari deskripsi, vendor, kategori..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filter.search || ''}
          onChange={(e) => onChange({ ...filter, search: e.target.value, page: 1 })}
        />
      </div>

      {/* Period */}
      <select
        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={filter.period || '2026-05'}
        onChange={(e) => onChange({ ...filter, period: e.target.value, page: 1 })}
      >
        <option value="2026-05">Mei 2026</option>
        <option value="2026-04">April 2026</option>
        <option value="2026-03">Maret 2026</option>
        <option value="2026-02">Februari 2026</option>
        <option value="2026-01">Januari 2026</option>
      </select>

      {/* Kind */}
      <select
        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={filter.kind || ''}
        onChange={(e) => onChange({ ...filter, kind: e.target.value as ExpenseKind, page: 1 })}
      >
        <option value="">Semua Jenis</option>
        {EXPENSE_KINDS.map((k) => (
          <option key={k.kind} value={k.kind}>{k.label}</option>
        ))}
      </select>

      {/* Status */}
      <select
        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={filter.status || ''}
        onChange={(e) => onChange({ ...filter, status: e.target.value as ExpenseStatus, page: 1 })}
      >
        <option value="">Semua Status</option>
        <option value="draft">Draft</option>
        <option value="submitted">Submitted</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="paid">Paid</option>
        <option value="cancelled">Cancelled</option>
      </select>

      {/* Sort */}
      <select
        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={`${filter.sort_by || 'date'}-${filter.sort_order || 'desc'}`}
        onChange={(e) => {
          const [sort_by, sort_order] = e.target.value.split('-') as [ExpenseFilter['sort_by'], ExpenseFilter['sort_order']]
          onChange({ ...filter, sort_by, sort_order })
        }}
      >
        <option value="date-desc">Tanggal (Terbaru)</option>
        <option value="date-asc">Tanggal (Terlama)</option>
        <option value="amount-desc">Jumlah (Terbesar)</option>
        <option value="amount-asc">Jumlah (Terkecil)</option>
      </select>
    </div>
  )
}

export function ExpenseTable({
  data,
  count,
  total_pages,
  page,
  limit,
  onPageChange,
  onRefresh,
  onEdit,
}: {
  data: Expense[]
  count: number
  total_pages: number
  page: number
  limit: number
  onPageChange: (page: number) => void
  onRefresh: () => void
  onEdit: (expense: Expense) => void
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin membatalkan pengeluaran ini?')) return
    setLoadingId(id)
    try {
      const res = await fetch(`/api/finance/expenses/${id}`, { method: 'DELETE' })
      if (res.ok) {
        onRefresh()
      } else {
        alert('Gagal membatalkan pengeluaran')
      }
    } catch {
      alert('Gagal membatalkan pengeluaran')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800 text-gray-300 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Deskripsi</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Metode</th>
              <th className="px-4 py-3 text-right">Jumlah</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {data.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Tidak ada data pengeluaran
                </td>
              </tr>
            )}
            {data.map((expense) => (
              <tr
                key={expense.id}
                className="bg-gray-800/40 hover:bg-gray-800/70 transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(expense.date)}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{expense.description}</div>
                  {expense.notes && (
                    <div className="text-xs text-gray-500 mt-0.5">{expense.notes}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded bg-gray-700 text-xs">{expense.category_name}</span>
                </td>
                <td className="px-4 py-3 text-gray-400">{expense.vendor || '-'}</td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-400">{paymentMethodLabels[expense.payment_method]}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold">
                  {formatRupiah(expense.amount)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusClasses[expense.status]}`}>
                    {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(expense)}
                      className="text-blue-400 hover:text-blue-300"
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      disabled={loadingId === expense.id}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50"
                      title="Cancel"
                    >
                      {loadingId === expense.id ? '...' : '✕'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">
          Menampilkan {data.length} dari {count} data
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
          >
            ← Prev
          </button>
          <span className="px-3 py-1 text-gray-400">
            Halaman {page} dari {total_pages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= total_pages}
            className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
