'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { EXPENSE_KINDS, EXPENSE_CATEGORIES } from '../../lib/repositories/finance-expenses'
import type { Expense, ExpenseKind, CreateExpenseInput } from '../../lib/repositories/finance-expenses'
import { Loader2Icon } from 'lucide-react'

interface ExpenseFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: Expense | null
  onSuccess: () => void
}

const initialForm: CreateExpenseInput = {
  kind: 'operating',
  category_id: '',
  description: '',
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  vendor: '',
  payment_method: 'transfer',
  notes: '',
}

export function ExpenseForm({ open, onOpenChange, expense, onSuccess }: ExpenseFormProps) {
  const [form, setForm] = useState<CreateExpenseInput>(initialForm)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEdit = !!expense

  // Populate form on edit
  useEffect(() => {
    if (expense) {
      setForm({
        kind: expense.kind,
        category_id: expense.category_id,
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
        vendor: expense.vendor || '',
        payment_method: expense.payment_method,
        notes: expense.notes || '',
      })
    } else {
      setForm(initialForm)
    }
    setErrors({})
  }, [expense, open])

  // Filter categories by selected kind
  const filteredCategories = EXPENSE_CATEGORIES.filter(c => c.kind === form.kind)

  // Auto-select first category when kind changes
  useEffect(() => {
    const firstCat = EXPENSE_CATEGORIES.find(c => c.kind === form.kind)
    if (firstCat && !isEdit) {
      setForm(prev => ({ ...prev, category_id: firstCat.id }))
    }
  }, [form.kind, isEdit])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!form.category_id) newErrors.category_id = 'Kategori wajib dipilih'
    if (!form.description.trim()) newErrors.description = 'Deskripsi wajib diisi'
    if (!form.amount || form.amount <= 0) newErrors.amount = 'Jumlah harus lebih dari 0'
    if (!form.date) newErrors.date = 'Tanggal wajib diisi'
    if (!form.payment_method) newErrors.payment_method = 'Metode pembayaran wajib dipilih'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setLoading(true)
    try {
      const url = isEdit
        ? `/api/finance/expenses/${expense!.id}`
        : '/api/finance/expenses'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const json = await res.json()

      if (!json.success) {
        throw new Error(json.error || 'Gagal menyimpan')
      }

      onOpenChange(false)
      setForm(initialForm)
      onSuccess()
    } catch (err: any) {
      setErrors({ submit: err.message })
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (error?: string) =>
    `bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus-visible:ring-blue-500 ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">
            {isEdit ? 'Edit Pengeluaran' : 'Tambah Pengeluaran Baru'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 my-4">
          {/* Kind */}
          <div className="space-y-1.5">
            <Label className="text-gray-300">Jenis Pengeluaran</Label>
            <Select
              value={form.kind}
              onValueChange={(v) => setForm(prev => ({ ...prev, kind: v as ExpenseKind }))}
              disabled={isEdit}
            >
              <SelectTrigger className={inputClass()}>
                <SelectValue placeholder="Pilih jenis" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {EXPENSE_KINDS.map(k => (
                  <SelectItem key={k.kind} value={k.kind} className="text-white focus:bg-gray-700">{k.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-gray-300">Kategori</Label>
            <Select
              value={form.category_id}
              onValueChange={(v) => setForm(prev => ({ ...prev, category_id: v }))}
            >
              <SelectTrigger className={inputClass(errors.category_id)}>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {filteredCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id} className="text-white focus:bg-gray-700">{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && <p className="text-xs text-red-400">{errors.category_id}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-gray-300">Deskripsi</Label>
            <Input
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className={inputClass(errors.description)}
              placeholder="Contoh: Tagihan listrik PLN Mei 2026"
            />
            {errors.description && <p className="text-xs text-red-400">{errors.description}</p>}
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300">Jumlah (Rp)</Label>
              <Input
                type="number"
                value={form.amount || ''}
                onChange={e => setForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className={inputClass(errors.amount)}
                placeholder="1000000"
              />
              {errors.amount && <p className="text-xs text-red-400">{errors.amount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300">Tanggal</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                className={inputClass(errors.date)}
              />
              {errors.date && <p className="text-xs text-red-400">{errors.date}</p>}
            </div>
          </div>

          {/* Vendor + Payment Method */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-gray-300">Vendor (Opsional)</Label>
              <Input
                value={form.vendor}
                onChange={e => setForm(prev => ({ ...prev, vendor: e.target.value }))}
                className={inputClass()}
                placeholder="Contoh: PLN"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300">Metode Pembayaran</Label>
              <Select
                value={form.payment_method}
                onValueChange={(v) => setForm(prev => ({ ...prev, payment_method: v as any }))}
              >
                <SelectTrigger className={inputClass(errors.payment_method)}>
                  <SelectValue placeholder="Pilih metode" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="cash" className="text-white focus:bg-gray-700">Tunai</SelectItem>
                  <SelectItem value="transfer" className="text-white focus:bg-gray-700">Transfer</SelectItem>
                  <SelectItem value="corporate_card" className="text-white focus:bg-gray-700">Corporate Card</SelectItem>
                  <SelectItem value="reimbursement" className="text-white focus:bg-gray-700">Reimbursement</SelectItem>
                </SelectContent>
              </Select>
              {errors.payment_method && <p className="text-xs text-red-400">{errors.payment_method}</p>}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-gray-300">Catatan (Opsional)</Label>
            <Input
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className={inputClass()}
              placeholder="Catatan tambahan..."
            />
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
              {errors.submit}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-600 text-white hover:bg-gray-800">
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white">
            {loading && <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
