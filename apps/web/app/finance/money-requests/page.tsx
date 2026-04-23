'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  PlusIcon, SearchIcon, RefreshCwIcon, EyeIcon, CheckCircleIcon, XCircleIcon,
  Trash2Icon, MoreVerticalIcon, Loader2Icon, FilterIcon, FileTextIcon,
  DollarSignIcon, AlertTriangleIcon
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Badge } from '@workspace/ui/components/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@workspace/ui/components/table'

interface MoneyRequest {
  id: string
  request_number: string
  employee_nik: string
  employee_name: string
  department: string
  request_type: 'procurement' | 'reimbursement' | 'cash_in_advance' | 'other'
  purpose: string
  amount: number
  receipt_amount: number
  approval_status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  paid_at?: string
  paid_by?: string
  status: 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected' | 'closed'
  notes?: string
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  procurement: 'Procurement',
  reimbursement: 'Reimbursement',
  cash_in_advance: 'Cash in Advance',
  other: 'Other',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted',
  submitted: 'bg-blue-600',
  approved: 'bg-yellow-500',
  paid: 'bg-green-500',
  rejected: 'bg-red-500',
  closed: 'bg-muted',
}

export default function MoneyRequestsPage() {
  const [requests, setRequests] = useState<MoneyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const [createOpen, setCreateOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [selected, setSelected] = useState<MoneyRequest | null>(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Form state
  const [form, setForm] = useState({
    employee_nik: '', employee_name: '', department: '',
    request_type: 'procurement' as const, purpose: '',
    amount: '', notes: '',
  })

  useEffect(() => { fetchRequests() }, [statusFilter, typeFilter])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      const res = await fetch(`/api/finance/money-requests?${params}`)
      if (res.ok) {
        const { data } = await res.json()
        setRequests(data || [])
      }
    } catch {
      toast.error('Failed to load money requests')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.employee_nik || !form.purpose || !form.amount) {
      toast.error('Please fill all required fields')
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch('/api/finance/money-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          status: 'submitted',
          approval_status: 'pending',
        }),
      })
      if (res.ok) {
        toast.success('Money request submitted successfully')
        setCreateOpen(false)
        setForm({ employee_nik: '', employee_name: '', department: '', request_type: 'procurement', purpose: '', amount: '', notes: '' })
        fetchRequests()
      } else {
        const { error } = await res.json()
        toast.error(error || 'Failed to create')
      }
    } catch {
      toast.error('Error creating request')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/finance/money-requests/${selected.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: approvalNotes }),
      })
      if (res.ok) {
        toast.success('Request approved')
        setApproveOpen(false)
        setViewOpen(false)
        fetchRequests()
      } else {
        const { error } = await res.json()
        toast.error(error || 'Failed to approve')
      }
    } catch {
      toast.error('Error approving')
    } finally {
      setActionLoading(false)
      setApprovalNotes('')
    }
  }

  const handleReject = async () => {
    if (!selected) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/finance/money-requests/${selected.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: approvalNotes }),
      })
      if (res.ok) {
        toast.success('Request rejected')
        setRejectOpen(false)
        setViewOpen(false)
        fetchRequests()
      } else {
        const { error } = await res.json()
        toast.error(error || 'Failed to reject')
      }
    } catch {
      toast.error('Error rejecting')
    } finally {
      setActionLoading(false)
      setApprovalNotes('')
    }
  }

  const handlePay = async (req: MoneyRequest) => {
    if (!confirm(`Pay ${formatCurrency(req.amount)} for request ${req.request_number}?`)) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/finance/money-requests/${req.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        toast.success('Payment recorded and cash register updated')
        fetchRequests()
        setViewOpen(false)
      } else {
        const { error } = await res.json()
        toast.error(error || 'Failed to pay')
      }
    } catch {
      toast.error('Error processing payment')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this request?')) return
    try {
      const res = await fetch(`/api/finance/money-requests/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Request deleted')
        fetchRequests()
      }
    } catch {
      toast.error('Error deleting')
    }
  }

  const filtered = requests.filter(r =>
    (r.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     r.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
     r.employee_nik.includes(searchTerm))
  )

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID') : '-'

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Money Requests</h1>
            <p className="text-muted-foreground">Permintaan uang oleh departemen via NIK</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/finance" className="text-primary hover:text-primary/80">← Back to Finance</Link>
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" /> New Request
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold text-amber-600">{requests.filter(r => r.approval_status === 'pending').length}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Approved</div>
            <div className="text-2xl font-bold text-primary">{requests.filter(r => r.approval_status === 'approved').length}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Paid</div>
            <div className="text-2xl font-bold text-emerald-600">{requests.filter(r => r.status === 'paid').length}</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Total Amount</div>
            <div className="text-2xl font-bold text-cyan-400">
              {formatCurrency(requests.reduce((s, r) => s + r.amount, 0))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by NIK, name, or request number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="procurement">Procurement</option>
              <option value="reimbursement">Reimbursement</option>
              <option value="cash_in_advance">Cash in Advance</option>
              <option value="other">Other</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <Button variant="outline" onClick={fetchRequests} disabled={loading}>
              <RefreshCwIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* Table */}
        <div>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-muted-foreground">Request #</TableHead>
                <TableHead className="text-muted-foreground">NIK</TableHead>
                <TableHead className="text-muted-foreground">Employee</TableHead>
                <TableHead className="text-muted-foreground">Department</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Purpose</TableHead>
                <TableHead className="text-muted-foreground text-right">Amount</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="h-24 text-center"><Loader2Icon className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : filtered.length > 0 ? filtered.map(r => (
                <TableRow key={r.id} className="border-border">
                  <TableCell className="font-medium">{r.request_number}</TableCell>
                  <TableCell className="font-mono text-sm">{r.employee_nik}</TableCell>
                  <TableCell>{r.employee_name}</TableCell>
                  <TableCell>{r.department}</TableCell>
                  <TableCell>{TYPE_LABELS[r.request_type]}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={r.purpose}>{r.purpose}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(r.amount)}</TableCell>
                  <TableCell><Badge className={STATUS_COLORS[r.status]}>{r.status.toUpperCase()}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVerticalIcon className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelected(r); setViewOpen(true) }}>
                          <EyeIcon className="h-4 w-4 mr-2" /> View
                        </DropdownMenuItem>
                        {r.approval_status === 'pending' && (
                          <>
                            <DropdownMenuItem onClick={() => { setSelected(r); setApproveOpen(true) }} className="text-emerald-600">
                              <CheckCircleIcon className="h-4 w-4 mr-2" /> Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelected(r); setRejectOpen(true) }} className="text-destructive">
                              <XCircleIcon className="h-4 w-4 mr-2" /> Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        {r.approval_status === 'approved' && r.status !== 'paid' && (
                          <DropdownMenuItem onClick={() => handlePay(r)} className="text-cyan-400">
                            <DollarSignIcon className="h-4 w-4 mr-2" /> Pay
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(r.id)} className="text-red-600">
                          <Trash2Icon className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No requests found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Money Request</DialogTitle><DialogDescription>Submit a new money request via NIK</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">NIK (Employee ID)</label>
                <Input value={form.employee_nik} onChange={e => setForm({ ...form, employee_nik: e.target.value })} placeholder="e.g. 12345" className="bg-background border-border" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Employee Name</label>
                <Input value={form.employee_name} onChange={e => setForm({ ...form, employee_name: e.target.value })} placeholder="e.g. Budi Santoso" className="bg-background border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Department</label>
                <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="e.g. IT" className="bg-background border-border" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Request Type</label>
                <select value={form.request_type} onChange={e => setForm({ ...form, request_type: e.target.value as any })} className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground text-sm">
                  <option value="procurement">Procurement</option>
                  <option value="reimbursement">Reimbursement</option>
                  <option value="cash_in_advance">Cash in Advance</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Purpose</label>
              <Input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} placeholder="Detail of the request" className="bg-background border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Amount (IDR)</label>
                <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="1000000" className="bg-background border-border" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes (Optional)</label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes" className="bg-background border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={actionLoading}>
              {actionLoading ? <Loader2Icon className="h-4 w-4 mr-2 animate-spin" /> : null}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Money Request Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-sm text-muted-foreground">Request Number</div><div className="font-mono">{selected.request_number}</div></div>
                <div><div className="text-sm text-muted-foreground">Status</div><Badge className={STATUS_COLORS[selected.status]}>{selected.status.toUpperCase()}</Badge></div>
                <div><div className="text-sm text-muted-foreground">NIK</div><div>{selected.employee_nik}</div></div>
                <div><div className="text-sm text-muted-foreground">Employee</div><div>{selected.employee_name}</div></div>
                <div><div className="text-sm text-muted-foreground">Department</div><div>{selected.department}</div></div>
                <div><div className="text-sm text-muted-foreground">Type</div><div>{TYPE_LABELS[selected.request_type]}</div></div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Purpose</div>
                <div className="bg-background p-3 rounded-lg mt-1">{selected.purpose}</div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between mb-2"><span className="text-muted-foreground">Amount:</span><span className="font-semibold">{formatCurrency(selected.amount)}</span></div>
                {selected.approved_by && <div className="flex justify-between mb-2"><span className="text-muted-foreground">Approved By:</span><span>{selected.approved_by} at {formatDate(selected.approved_at)}</span></div>}
                {selected.paid_by && <div className="flex justify-between mb-2"><span className="text-muted-foreground">Paid By:</span><span>{selected.paid_by} at {formatDate(selected.paid_at)}</span></div>}
              </div>
              {selected.approval_status === 'pending' && (
                <div className="flex gap-3">
                  <Button onClick={() => setApproveOpen(true)} className="bg-green-600 hover:bg-green-700"><CheckCircleIcon className="h-4 w-4 mr-2" /> Approve</Button>
                  <Button onClick={() => setRejectOpen(true)} variant="destructive"><XCircleIcon className="h-4 w-4 mr-2" /> Reject</Button>
                </div>
              )}
              {selected.approval_status === 'approved' && selected.status !== 'paid' && (
                <Button onClick={() => handlePay(selected)} className="bg-cyan-600 hover:bg-cyan-700"><DollarSignIcon className="h-4 w-4 mr-2" /> Record Payment</Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approve Request</DialogTitle><DialogDescription>Approve {selected?.request_number} for {formatCurrency(selected?.amount || 0)}</DialogDescription></DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Approval Notes (Optional)</label>
            <Input value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)} placeholder="Notes..." className="bg-background border-border" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={actionLoading} className="bg-green-600"><CheckCircleIcon className="h-4 w-4 mr-2" /> Confirm Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Request</DialogTitle><DialogDescription>Reject {selected?.request_number}</DialogDescription></DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Rejection Reason</label>
            <Input value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)} placeholder="Reason for rejection..." className="bg-background border-border" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button onClick={handleReject} disabled={actionLoading} variant="destructive"><XCircleIcon className="h-4 w-4 mr-2" /> Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
