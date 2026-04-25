'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2Icon, CalendarIcon, LockIcon, UnlockIcon, PlusIcon, PencilIcon, Trash2Icon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@workspace/ui/components/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@workspace/ui/components/select'

interface Period {
  id: string
  period_name: string
  start_date: string
  end_date: string
  status: 'open' | 'closed' | 'locked'
  period_type?: string
  fiscal_year?: number
}

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Form state
  const [formPeriodName, setFormPeriodName] = useState('')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formPeriodType, setFormPeriodType] = useState('monthly')
  const [formFiscalYear, setFormFiscalYear] = useState('')

  useEffect(() => { loadPeriods() }, [])

  async function loadPeriods() {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/periods')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPeriods(data.data || [])
    } catch {
      toast.error('Failed to load periods')
    } finally { setLoading(false) }
  }

  function openAddModal() {
    setEditingPeriod(null)
    setFormPeriodName('')
    setFormStartDate('')
    setFormEndDate('')
    setFormPeriodType('monthly')
    setFormFiscalYear(new Date().getFullYear().toString())
    setShowModal(true)
  }

  function openEditModal(p: Period) {
    setEditingPeriod(p)
    setFormPeriodName(p.period_name)
    setFormStartDate(p.start_date)
    setFormEndDate(p.end_date)
    setFormPeriodType(p.period_type || 'monthly')
    setFormFiscalYear(p.fiscal_year?.toString() || new Date().getFullYear().toString())
    setShowModal(true)
  }

  async function handleSubmit() {
    if (!formPeriodName || !formStartDate || !formEndDate) {
      toast.error('Please fill in all required fields')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        period_name: formPeriodName,
        start_date: formStartDate,
        end_date: formEndDate,
        period_type: formPeriodType,
        fiscal_year: parseInt(formFiscalYear) || new Date().getFullYear(),
      }

      const url = editingPeriod
        ? `/api/finance/periods?id=${editingPeriod.id}`
        : '/api/finance/periods'
      const method = editingPeriod ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Save failed')
      }

      toast.success(editingPeriod ? 'Period updated' : 'Period created')
      setShowModal(false)
      await loadPeriods()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save period')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/finance/periods?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Delete failed')
      }
      toast.success('Period deleted')
      setDeleteConfirmId(null)
      await loadPeriods()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete period')
    }
  }

  async function closePeriod(id: string) {
    try {
      const res = await fetch(`/api/finance/periods/close?id=${id}`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('Period closed')
      await loadPeriods()
    } catch { toast.error('Failed to close period') }
  }

  async function reopenPeriod(id: string) {
    try {
      const res = await fetch(`/api/finance/periods/reopen?id=${id}`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('Period reopened')
      await loadPeriods()
    } catch { toast.error('Failed to reopen period') }
  }

  function fmt(d: string) { return new Date(d).toLocaleDateString('id-ID') }

  const statusBadge = (s: string) => {
    if (s === 'open') return <Badge variant="default"><UnlockIcon className="h-3 w-3 mr-1" />Open</Badge>
    if (s === 'closed') return <Badge variant="secondary"><LockIcon className="h-3 w-3 mr-1" />Closed</Badge>
    return <Badge variant="outline"><LockIcon className="h-3 w-3 mr-1" />Locked</Badge>
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fiscal Periods</h1>
          <p className="text-muted-foreground">Manage accounting periods and closing status.</p>
        </div>
        <Button onClick={openAddModal}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Period
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Period</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Start Date</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">End Date</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-12"><Loader2Icon className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /></td></tr>
                ) : periods.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No periods configured. Click "Add Period" to create one.</td></tr>
                ) : periods.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium">{p.period_name}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{fmt(p.start_date)}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{fmt(p.end_date)}</td>
                    <td className="px-6 py-3">{statusBadge(p.status)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === 'open' ? (
                          <Button variant="outline" size="sm" onClick={() => closePeriod(p.id)}>
                            <LockIcon className="h-3 w-3 mr-1" />Close
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => reopenPeriod(p.id)}>
                            <UnlockIcon className="h-3 w-3 mr-1" />Reopen
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(p)}
                          disabled={p.status === 'closed'}
                        >
                          <PencilIcon className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(p.id)}
                        >
                          <Trash2Icon className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPeriod ? 'Edit Fiscal Period' : 'Add Fiscal Period'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="period_name">Period Name *</Label>
              <Input
                id="period_name"
                placeholder="e.g., 2026-01 or Q1-2026"
                value={formPeriodName}
                onChange={e => setFormPeriodName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formStartDate}
                  onChange={e => setFormStartDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formEndDate}
                  onChange={e => setFormEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="period_type">Period Type</Label>
                <Select value={formPeriodType} onValueChange={setFormPeriodType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fiscal_year">Fiscal Year</Label>
                <Input
                  id="fiscal_year"
                  type="number"
                  placeholder="e.g., 2026"
                  value={formFiscalYear}
                  onChange={e => setFormFiscalYear(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
              {editingPeriod ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={v => !v && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Period</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Are you sure you want to delete this period? This action cannot be undone.
            Periods with journal entries cannot be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteConfirmId!)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
