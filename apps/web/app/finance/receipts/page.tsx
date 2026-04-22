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
  Trash2Icon,
  MoreVerticalIcon,
  Loader2Icon,
  ReceiptIcon,
  PrinterIcon,
  MailIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'

interface Receipt {
  id: string
  receipt_number: string
  customer_name: string
  customer_id: string
  invoice_number?: string
  amount: number
  payment_method: 'bank_transfer' | 'cash' | 'check' | 'credit_card'
  status: 'draft' | 'issued' | 'sent' | 'cancelled'
  receipt_date: string
  notes?: string
  created_at: string
  updated_at: string
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)

  // Form state for new receipt
  const [newReceipt, setNewReceipt] = useState({
    customer_name: '',
    invoice_number: '',
    amount: '',
    payment_method: 'bank_transfer' as 'bank_transfer' | 'cash' | 'check' | 'credit_card',
    receipt_date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  useEffect(() => {
    fetchReceipts()
  }, [])

  const fetchReceipts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/finance/receipts')
      if (response.ok) {
        const data = await response.json()
        setReceipts(data)
      }
    } catch (error) {
      console.error('Error fetching receipts:', error)
      toast.error('Failed to load receipts')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch =
      receipt.receipt_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (receipt.invoice_number && receipt.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-gray-600 text-white',
      issued: 'bg-blue-600 text-white',
      sent: 'bg-green-600 text-white',
      cancelled: 'bg-red-600 text-white',
    }
    return badges[status] || 'bg-gray-600 text-white'
  }

  const handleCreateReceipt = async () => {
    try {
      const response = await fetch('/api/finance/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newReceipt,
          amount: parseFloat(newReceipt.amount),
        }),
      })

      if (response.ok) {
        toast.success('Receipt created successfully')
        setCreateDialogOpen(false)
        fetchReceipts()
        setNewReceipt({
          customer_name: '',
          invoice_number: '',
          amount: '',
          payment_method: 'bank_transfer',
          receipt_date: new Date().toISOString().split('T')[0],
          notes: '',
        })
      } else {
        toast.error('Failed to create receipt')
      }
    } catch (error) {
      console.error('Error creating receipt:', error)
      toast.error('Failed to create receipt')
    }
  }

  const handleDeleteReceipt = async (id: string) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return

    try {
      const response = await fetch(`/api/finance/receipts/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Receipt deleted successfully')
        fetchReceipts()
      } else {
        toast.error('Failed to delete receipt')
      }
    } catch (error) {
      console.error('Error deleting receipt:', error)
      toast.error('Failed to delete receipt')
    }
  }

  const handleSendReceipt = async (id: string) => {
    try {
      const response = await fetch(`/api/finance/receipts/${id}/send`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Receipt sent successfully')
        fetchReceipts()
      } else {
        toast.error('Failed to send receipt')
      }
    } catch (error) {
      console.error('Error sending receipt:', error)
      toast.error('Failed to send receipt')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Receipts</h1>
            <p className="text-gray-400">Manage customer payment receipts</p>
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
              New Receipt
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
                  placeholder="Search receipts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
                <option value="sent">Sent</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <Button variant="outline" onClick={fetchReceipts} className="border-gray-600">
              <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Receipts Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">
              <Loader2Icon className="w-8 h-8 mx-auto mb-2 animate-spin" />
              Loading receipts...
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No receipts found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Receipt #</TableHead>
                  <TableHead className="text-gray-300">Customer</TableHead>
                  <TableHead className="text-gray-300">Invoice #</TableHead>
                  <TableHead className="text-gray-300">Receipt Date</TableHead>
                  <TableHead className="text-gray-300">Payment Method</TableHead>
                  <TableHead className="text-gray-300 text-right">Amount</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id} className="border-gray-700 hover:bg-gray-750">
                    <TableCell className="font-mono text-white">{receipt.receipt_number}</TableCell>
                    <TableCell className="text-white">{receipt.customer_name}</TableCell>
                    <TableCell className="text-gray-300">
                      {receipt.invoice_number || '-'}
                    </TableCell>
                    <TableCell className="text-gray-300">{receipt.receipt_date}</TableCell>
                    <TableCell className="text-gray-300 capitalize">
                      {receipt.payment_method.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-white">
                      Rp {receipt.amount.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(receipt.status)}>
                        {receipt.status.charAt(0).toUpperCase() + receipt.status.slice(1)}
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
                              setSelectedReceipt(receipt)
                              setViewDialogOpen(true)
                            }}
                            className="text-gray-300 hover:bg-gray-700"
                          >
                            <EyeIcon className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {receipt.status === 'issued' && (
                            <DropdownMenuItem
                              onClick={() => handleSendReceipt(receipt.id)}
                              className="text-blue-400 hover:bg-gray-700"
                            >
                              <MailIcon className="w-4 h-4 mr-2" />
                              Send
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                            <PrinterIcon className="w-4 h-4 mr-2" />
                            Print
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-gray-700" />
                          <DropdownMenuItem
                            onClick={() => handleDeleteReceipt(receipt.id)}
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

      {/* Create Receipt Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Receipt</DialogTitle>
            <DialogDescription className="text-gray-400">
              Record a customer payment receipt
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Customer Name</label>
                <Input
                  value={newReceipt.customer_name}
                  onChange={(e) => setNewReceipt({ ...newReceipt, customer_name: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="PT Customer Abadi"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Receipt Date</label>
                <Input
                  type="date"
                  value={newReceipt.receipt_date}
                  onChange={(e) => setNewReceipt({ ...newReceipt, receipt_date: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Invoice Number (Optional)</label>
              <Input
                value={newReceipt.invoice_number}
                onChange={(e) => setNewReceipt({ ...newReceipt, invoice_number: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="INV-2025-001"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Amount (Rp)</label>
                <Input
                  type="number"
                  value={newReceipt.amount}
                  onChange={(e) => setNewReceipt({ ...newReceipt, amount: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="1000000"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Payment Method</label>
                <select
                  value={newReceipt.payment_method}
                  onChange={(e) => setNewReceipt({ ...newReceipt, payment_method: e.target.value as any })}
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
                value={newReceipt.notes}
                onChange={(e) => setNewReceipt({ ...newReceipt, notes: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Payment reference, bank name, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-gray-600">
              Cancel
            </Button>
            <Button onClick={handleCreateReceipt} className="bg-blue-600 hover:bg-blue-700">
              Create Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Receipt Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Receipt Number</p>
                  <p className="font-mono text-white">{selectedReceipt.receipt_number}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <Badge className={getStatusBadge(selectedReceipt.status)}>
                    {selectedReceipt.status.charAt(0).toUpperCase() + selectedReceipt.status.slice(1)}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Customer</p>
                <p className="text-white">{selectedReceipt.customer_name}</p>
              </div>
              {selectedReceipt.invoice_number && (
                <div>
                  <p className="text-gray-400 text-sm">Invoice Reference</p>
                  <p className="font-mono text-white">{selectedReceipt.invoice_number}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Receipt Date</p>
                  <p className="text-white">{selectedReceipt.receipt_date}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Payment Method</p>
                  <p className="text-white capitalize">{selectedReceipt.payment_method.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="border-t border-gray-700 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Amount Received</span>
                  <span className="text-white font-bold text-xl">Rp {selectedReceipt.amount.toLocaleString('id-ID')}</span>
                </div>
              </div>
              {selectedReceipt.notes && (
                <div>
                  <p className="text-gray-400 text-sm">Notes</p>
                  <p className="text-white">{selectedReceipt.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <div className="flex gap-2">
              <Button variant="outline" className="border-gray-600">
                <PrinterIcon className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button onClick={() => setViewDialogOpen(false)} className="bg-blue-600 hover:bg-blue-700">
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
