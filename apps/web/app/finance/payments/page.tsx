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
      pending: 'bg-yellow-600 text-white',
      completed: 'bg-green-600 text-white',
      cancelled: 'bg-red-600 text-white',
    }
    return badges[status] || 'bg-gray-600 text-white'
  }

  const getTypeBadge = (type: string) => {
    return type === 'incoming'
      ? 'bg-emerald-600 text-white'
      : 'bg-blue-600 text-white'
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Payments</h1>
            <p className="text-gray-400">Manage incoming and outgoing payments</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/finance/transactions"
              className="text-blue-400 hover:text-blue-300 transition-colors"
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
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="all">All Types</option>
                <option value="incoming">Incoming</option>
                <option value="outgoing">Outgoing</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <Button variant="outline" onClick={fetchPayments} className="border-gray-600">
              <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">
              <Loader2Icon className="w-8 h-8 mx-auto mb-2 animate-spin" />
              Loading payments...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No payments found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Payment #</TableHead>
                  <TableHead className="text-gray-300">Type</TableHead>
                  <TableHead className="text-gray-300">Party</TableHead>
                  <TableHead className="text-gray-300">Payment Date</TableHead>
                  <TableHead className="text-gray-300">Method</TableHead>
                  <TableHead className="text-gray-300 text-right">Amount</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id} className="border-gray-700 hover:bg-gray-750">
                    <TableCell className="font-mono text-white">{payment.payment_number}</TableCell>
                    <TableCell>
                      <Badge className={getTypeBadge(payment.payment_type)}>
                        {payment.payment_type === 'incoming' ? '↓ Incoming' : '↑ Outgoing'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">{payment.party_name}</TableCell>
                    <TableCell className="text-gray-300">{payment.payment_date}</TableCell>
                    <TableCell className="text-gray-300 capitalize">
                      {payment.payment_method.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-white">
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
                        <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedPayment(payment)
                              setViewDialogOpen(true)
                            }}
                            className="text-gray-300 hover:bg-gray-700"
                          >
                            <EyeIcon className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {payment.status === 'pending' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleApprovePayment(payment.id)}
                                className="text-green-400 hover:bg-gray-700"
                              >
                                <CheckCircleIcon className="w-4 h-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleCancelPayment(payment.id)}
                                className="text-red-400 hover:bg-gray-700"
                              >
                                <XCircleIcon className="w-4 h-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator className="bg-gray-700" />
                          <DropdownMenuItem
                            onClick={() => handleDeletePayment(payment.id)}
                            className="text-red-400 hover:bg-gray-700"
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
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Payment</DialogTitle>
            <DialogDescription className="text-gray-400">
              Record a new incoming or outgoing payment
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Payment Type</label>
                <select
                  value={newPayment.payment_type}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_type: e.target.value as 'incoming' | 'outgoing' })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="outgoing">Outgoing (Payment)</option>
                  <option value="incoming">Incoming (Receipt)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Payment Date</label>
                <Input
                  type="date"
                  value={newPayment.payment_date}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Party Name</label>
              <Input
                value={newPayment.party_name}
                onChange={(e) => setNewPayment({ ...newPayment, party_name: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder={newPayment.payment_type === 'outgoing' ? 'Vendor name' : 'Customer name'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Amount (Rp)</label>
                <Input
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="1000000"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Payment Method</label>
                <select
                  value={newPayment.payment_method}
                  onChange={(e) => setNewPayment({ ...newPayment, payment_method: e.target.value as any })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Notes</label>
              <Input
                value={newPayment.notes}
                onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Payment reference, notes, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-gray-600">
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
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Payment Number</p>
                  <p className="font-mono text-white">{selectedPayment.payment_number}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <Badge className={getStatusBadge(selectedPayment.status)}>
                    {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Type</p>
                  <Badge className={getTypeBadge(selectedPayment.payment_type)}>
                    {selectedPayment.payment_type === 'incoming' ? '↓ Incoming' : '↑ Outgoing'}
                  </Badge>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Payment Method</p>
                  <p className="text-white capitalize">{selectedPayment.payment_method.replace('_', ' ')}</p>
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Party</p>
                <p className="text-white">{selectedPayment.party_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Payment Date</p>
                  <p className="text-white">{selectedPayment.payment_date}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Amount</p>
                  <p className="text-white font-semibold">Rp {selectedPayment.amount.toLocaleString('id-ID')}</p>
                </div>
              </div>
              {selectedPayment.notes && (
                <div>
                  <p className="text-gray-400 text-sm">Notes</p>
                  <p className="text-white">{selectedPayment.notes}</p>
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
