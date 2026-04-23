'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Badge } from '@workspace/ui/components/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  PlusIcon,
  SearchIcon,
  RefreshCwIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  DownloadIcon,
  MoreVerticalIcon,
  Loader2Icon,
  CheckCircleIcon,
  XCircleIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'

interface Payment {
  id: string
  invoice_id?: string
  invoice_number?: string
  payment_number: string
  payment_type: 'incoming' | 'outgoing'
  reference_type: 'invoice' | 'bill' | 'other'
  reference_id?: string
  party_name: string
  party_id: string
  amount: number
  payment_method: 'bank_transfer' | 'cash' | 'check' | 'credit_card'
  status: 'pending' | 'completed' | 'cancelled'
  payment_date: string
  notes?: string
  created_at: string
  updated_at: string
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  // Form state for new payment
  const [newPayment, setNewPayment] = useState({
    payment_type: 'outgoing' as 'incoming' | 'outgoing',
    party_name: '',
    amount: '',
    payment_method: 'bank_transfer' as 'bank_transfer' | 'cash' | 'check' | 'credit_card',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/finance/payments')
      if (response.ok) {
        const data = await response.json()
        setPayments(data)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Failed to load payments')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch =
      payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.party_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || payment.payment_type === typeFilter
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-yellow-600 text-foreground',
      completed: 'bg-green-600 text-foreground',
      cancelled: 'bg-red-600 text-foreground',
    }
    return badges[status] || 'bg-muted text-foreground'
  }

  const getTypeBadge = (type: string) => {
    return type === 'incoming'
      ? 'bg-emerald-600 text-foreground'
      : 'bg-blue-600 text-foreground'
  }

  const handleCreatePayment = async () => {
    try {
      const response = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPayment,
          amount: parseFloat(newPayment.amount),
        }),
      })

      if (response.ok) {
        toast.success('Payment created successfully')
        setCreateDialogOpen(false)
        fetchPayments()
        setNewPayment({
          payment_type: 'outgoing',
          party_name: '',
          amount: '',
          payment_method: 'bank_transfer',
          payment_date: new Date().toISOString().split('T')[0],
          notes: '',
        })
      } else {
        toast.error('Failed to create payment')
      }
    } catch (error) {
      console.error('Error creating payment:', error)
      toast.error('Failed to create payment')
    }
  }

  const handleDeletePayment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return

    try {
      const response = await fetch(`/api/finance/payments/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Payment deleted successfully')
        fetchPayments()
      } else {
        toast.error('Failed to delete payment')
      }
    } catch (error) {
      console.error('Error deleting payment:', error)
      toast.error('Failed to delete payment')
    }
  }

  const handleApprovePayment = async (id: string) => {
    try {
      const response = await fetch(`/api/finance/payments/${id}/approve`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Payment approved successfully')
        fetchPayments()
      } else {
        toast.error('Failed to approve payment')
      }
    } catch (error) {
      console.error('Error approving payment:', error)
      toast.error('Failed to approve payment')
    }
  }

  const handleCancelPayment = async (id: string) => {
    try {
      const response = await fetch(`/api/finance/payments/${id}/cancel`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Payment cancelled successfully')
        fetchPayments()
      } else {
        toast.error('Failed to cancel payment')
      }
    } catch (error) {
      console.error('Error cancelling payment:', error)
      toast.error('Failed to cancel payment')
    }
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
            <p className="text-muted-foreground">Manage incoming and outgoing payments</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/finance/transactions"
              className="text-primary hover:text-primary/80"
            >
              ← Back to Transactions
            </Link>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Payment
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Filters */}
        <div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-muted border-border text-foreground"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-muted border border-border rounded-lg px-4 py-2 text-foreground"
              >
                <option value="all">All Types</option>
                <option value="incoming">Incoming</option>
                <option value="outgoing">Outgoing</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-muted border border-border rounded-lg px-4 py-2 text-foreground"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <Button variant="outline" onClick={fetchPayments} className="border-border">
              <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Payments Table */}
        <div>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2Icon className="w-8 h-8 mx-auto mb-2 animate-spin" />
              Loading payments...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No payments found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Payment #</TableHead>
                  <TableHead className="text-foreground">Type</TableHead>
                  <TableHead className="text-foreground">Party</TableHead>
                  <TableHead className="text-foreground">Linked Invoice</TableHead>
                  <TableHead className="text-foreground">Payment Date</TableHead>
                  <TableHead className="text-foreground">Method</TableHead>
                  <TableHead className="text-foreground text-right">Amount</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-foreground">{payment.payment_number}</TableCell>
                    <TableCell>
                      <Badge className={getTypeBadge(payment.payment_type)}>
                        {payment.payment_type === 'incoming' ? '↓ Incoming' : '↑ Outgoing'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{payment.party_name}</TableCell>
                    <TableCell>
                      {payment.invoice_id ? (
                        <Link
                          href={`/finance/customer-invoices?id=${payment.invoice_id}`}
                          className="text-primary hover:text-blue-300 underline font-mono text-sm"
                        >
                          {payment.invoice_number || payment.reference_id || payment.invoice_id}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground">{payment.payment_date}</TableCell>
                    <TableCell className="text-foreground capitalize">
                      {payment.payment_method.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      Rp {payment.amount.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(payment.status)}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVerticalIcon className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedPayment(payment)
                              setViewDialogOpen(true)
                            }}
                            className="text-foreground hover:bg-muted"
                          >
                            <EyeIcon className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {payment.status === 'pending' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleApprovePayment(payment.id)}
                                className="text-emerald-600 hover:bg-muted"
                              >
                                <CheckCircleIcon className="w-4 h-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleCancelPayment(payment.id)}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <XCircleIcon className="w-4 h-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator className="bg-muted" />
                          <DropdownMenuItem
                            onClick={() => handleDeletePayment(payment.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2Icon className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Create Payment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Payment</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Record a new incoming or outgoing payment
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Payment Type</label>
                <select
                  value={newPayment.payment_type}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_type: e.target.value as 'incoming' | 'outgoing' })}
                  className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground"
                >
                  <option value="outgoing">Outgoing (Payment)</option>
                  <option value="incoming">Incoming (Receipt)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Payment Date</label>
                <Input
                  type="date"
                  value={newPayment.payment_date}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                 
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Party Name</label>
              <Input
                value={newPayment.party_name}
                onChange={(e) => setNewPayment({ ...newPayment, party_name: e.target.value })}
               
                placeholder={newPayment.payment_type === 'outgoing' ? 'Vendor name' : 'Customer name'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Amount (Rp)</label>
                <Input
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                 
                  placeholder="1000000"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Payment Method</label>
                <select
                  value={newPayment.payment_method}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value as any })}
                  className="w-full bg-muted border border-border rounded-lg px-4 py-2 text-foreground"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Notes</label>
              <Input
                value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
               
                placeholder="Payment reference, notes, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-border">
              Cancel
            </Button>
            <Button onClick={handleCreatePayment} className="bg-blue-600 hover:bg-blue-700">
              Create Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Payment Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">Payment Number</p>
                  <p className="font-mono text-foreground">{selectedPayment.payment_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Status</p>
                  <Badge className={getStatusBadge(selectedPayment.status)}>
                    {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">Type</p>
                  <Badge className={getTypeBadge(selectedPayment.payment_type)}>
                    {selectedPayment.payment_type === 'incoming' ? '↓ Incoming' : '↑ Outgoing'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Payment Method</p>
                  <p className="text-foreground capitalize">{selectedPayment.payment_method.replace('_', ' ')}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Party</p>
                <p className="text-foreground">{selectedPayment.party_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">Payment Date</p>
                  <p className="text-foreground">{selectedPayment.payment_date}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Amount</p>
                  <p className="text-foreground font-semibold">Rp {selectedPayment.amount.toLocaleString('id-ID')}</p>
                </div>
              </div>
              {selectedPayment.notes && (
                <div>
                  <p className="text-muted-foreground text-sm">Notes</p>
                  <p className="text-foreground">{selectedPayment.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)} className="bg-blue-600 hover:bg-blue-700">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
