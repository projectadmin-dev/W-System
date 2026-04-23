'use client'

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
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
  FilterIcon,
  RefreshCwIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  DownloadIcon,
  SendIcon,
  MoreVerticalIcon,
  Loader2Icon,
  CheckCircleIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'

interface CustomerInvoice {
  id: string
  invoice_number: string
  customer_name: string
  customer_id: string
  amount: number
  tax_amount: number
  total_amount: number
  paid_amount: number
  balance_due: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partial'
  issue_date: string
  due_date: string
  paid_date?: string
  paid_at?: string
  paid_days?: number
  description?: string
  created_at: string
  updated_at: string
}

export default function CustomerInvoicesPage() {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('transfer')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoice | null>(null)

  // Form state for new invoice
  const [newInvoice, setNewInvoice] = useState({
    customer_id: '',
    customer_name: '',
    description: '',
    amount: '',
    tax_rate: '11', // PPN 11%
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
  })

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/finance/customer-invoices')
      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
      } else {
        toast.error('Failed to fetch invoices')
      }
    } catch (error) {
      toast.error('Error fetching invoices')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateInvoice = async () => {
    try {
      const amount = parseFloat(newInvoice.amount)
      const taxRate = parseFloat(newInvoice.tax_rate)
      const taxAmount = amount * (taxRate / 100)
      const totalAmount = amount + taxAmount

      const response = await fetch('/api/finance/customer-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newInvoice,
          amount,
          tax_amount: taxAmount,
          total_amount: totalAmount,
        }),
      })

      if (response.ok) {
        toast.success('Invoice created successfully')
        setCreateDialogOpen(false)
        fetchInvoices()
        // Reset form
        setNewInvoice({
          customer_id: '',
          customer_name: '',
          description: '',
          amount: '',
          tax_rate: '11',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to create invoice')
      }
    } catch (error) {
      toast.error('Error creating invoice')
    }
  }

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }
    if (amount > selectedInvoice.balance_due) {
      toast.error(`Payment amount cannot exceed balance due (${formatCurrency(selectedInvoice.balance_due)})`)
      return
    }

    setPaymentLoading(true)
    try {
      const response = await fetch(`/api/finance/customer-invoices/${selectedInvoice.id}/record-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          notes: paymentNotes || `Payment for invoice ${selectedInvoice.invoice_number}`,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Payment ${formatCurrency(amount)} recorded successfully`)
        setPaymentDialogOpen(false)
        setPaymentAmount('')
        setPaymentNotes('')
        fetchInvoices()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to record payment')
      }
    } catch (error) {
      toast.error('Error recording payment')
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleSendInvoice = async (invoice: CustomerInvoice) => {
    try {
      const response = await fetch(`/api/finance/customer-invoices/${invoice.id}/send`, {
        method: 'POST',
      })
      if (response.ok) {
        toast.success('Invoice sent to customer')
        fetchInvoices()
      } else {
        toast.error('Failed to send invoice')
      }
    } catch (error) {
      toast.error('Error sending invoice')
    }
  }

  const handleDeleteInvoice = async (invoice: CustomerInvoice) => {
    if (!confirm(`Delete invoice ${invoice.invoice_number}?`)) return

    try {
      const response = await fetch(`/api/finance/customer-invoices/${invoice.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast.success('Invoice deleted')
        fetchInvoices()
      } else {
        toast.error('Failed to delete invoice')
      }
    } catch (error) {
      toast.error('Error deleting invoice')
    }
  }

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      draft: 'secondary',
      sent: 'outline',
      paid: 'default',
      partial: 'outline',
      overdue: 'destructive',
      cancelled: 'secondary',
    }
    return <Badge variant={variants[status] || 'secondary'}>{status.toUpperCase()}</Badge>
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Customer Invoices</h1>
            <p className="text-muted-foreground">Manage accounts receivable and customer billing</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/finance/transactions"
              className="text-primary hover:text-primary/80"
            >
              ← Back to Transactions
            </Link>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div>
            <div className="text-2xl font-bold text-primary">
              {invoices.filter((i) => i.status === 'draft').length}
            </div>
            <div className="text-sm text-muted-foreground">Draft Invoices</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">
              {invoices.filter((i) => i.status === 'sent').length}
            </div>
            <div className="text-sm text-muted-foreground">Sent (Unpaid)</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">
              {invoices.filter((i) => i.status === 'paid').length}
            </div>
            <div className="text-sm text-muted-foreground">Paid Invoices</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-destructive">
              {invoices.filter((i) => i.status === 'overdue').length}
            </div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </div>
        </div>

        {/* Filters */}
        <div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px] bg-background border-border">
                <FilterIcon className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchInvoices} disabled={isLoading}>
              <RefreshCwIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Table */}
        <div>
          <Table>
            <TableHeader className="bg-muted">
              <TableRow className="bg-muted border-b">
                <TableHead className="text-muted-foreground font-semibold">Invoice Number</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Customer</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">Amount</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">Tax (11%)</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">Total</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-right">Balance Due</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Due Date</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    <Loader2Icon className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading invoices...</span>
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id} className="border-border">
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.customer_name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.tax_amount)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(invoice.total_amount)}</TableCell>
                    <TableCell className={`text-right font-semibold ${invoice.balance_due > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                      {formatCurrency(invoice.balance_due || 0)}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>{formatDate(invoice.due_date)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVerticalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedInvoice(invoice); setViewDialogOpen(true) }}>
                            <EyeIcon className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {(invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'partial') && (
                            <DropdownMenuItem onClick={() => { setSelectedInvoice(invoice); setPaymentAmount(String(invoice.balance_due)); setPaymentDialogOpen(true) }}>
                              <CheckCircleIcon className="h-4 w-4 mr-2" />
                              Record Payment
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleSendInvoice(invoice)}>
                            <SendIcon className="h-4 w-4 mr-2" />
                            Send
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteInvoice(invoice)}
                            className="text-red-600"
                          >
                            <Trash2Icon className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Customer Invoice</DialogTitle>
            <DialogDescription>
              Create a new invoice for customer billing with PPN 11% tax
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Customer Name</label>
                <Input
                  value={newInvoice.customer_name}
                  onChange={(e) => setNewInvoice({ ...newInvoice, customer_name: e.target.value })}
                  placeholder="PT. Example Customer"
                  className="bg-background border-border"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Invoice Date</label>
                <Input
                  type="date"
                  value={newInvoice.issue_date}
                  onChange={(e) => setNewInvoice({ ...newInvoice, issue_date: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Input
                value={newInvoice.description}
                onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                placeholder="Services rendered, products sold, etc."
                className="bg-background border-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Amount (IDR)</label>
                <Input
                  type="number"
                  value={newInvoice.amount}
                  onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                  placeholder="10000000"
                  className="bg-background border-border"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tax Rate (%)</label>
                <Input
                  type="number"
                  value={newInvoice.tax_rate}
                  onChange={(e) => setNewInvoice({ ...newInvoice, tax_rate: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Due Date</label>
              <Input
                type="date"
                value={newInvoice.due_date}
                onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                className="bg-background border-border"
              />
            </div>
            {newInvoice.amount && (
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(parseFloat(newInvoice.amount) || 0)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">PPN ({newInvoice.tax_rate}%):</span>
                  <span>
                    {formatCurrency((parseFloat(newInvoice.amount) || 0) * (parseFloat(newInvoice.tax_rate) / 100))}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-border pt-2">
                  <span>Total:</span>
                  <span>
                    {formatCurrency(
                      (parseFloat(newInvoice.amount) || 0) * (1 + (parseFloat(newInvoice.tax_rate) / 100))
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateInvoice}>
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoice_number} - {selectedInvoice?.customer_name}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="mt-1">{getStatusBadge(selectedInvoice.status)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Invoice Date</div>
                  <div className="mt-1">{formatDate(selectedInvoice.issue_date)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Due Date</div>
                  <div className="mt-1">{formatDate(selectedInvoice.due_date)}</div>
                </div>
                {selectedInvoice.paid_date && (
                  <div>
                    <div className="text-sm text-muted-foreground">Paid Date</div>
                    <div className="mt-1">{formatDate(selectedInvoice.paid_date)}</div>
                  </div>
                )}
              </div>
              {selectedInvoice.description && (
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Description</div>
                  <div className="bg-muted p-4 rounded-lg">{selectedInvoice.description}</div>
                </div>
              )}
              <div className="bg-background p-6 rounded-lg">
                <div className="flex justify-between mb-3">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(selectedInvoice.amount)}</span>
                </div>
                <div className="flex justify-between mb-3">
                  <span className="text-muted-foreground">Tax (PPN 11%):</span>
                  <span>{formatCurrency(selectedInvoice.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-xl border-t border-border pt-3">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedInvoice.total_amount)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => selectedInvoice && handleSendInvoice(selectedInvoice)}>
              <SendIcon className="h-4 w-4 mr-2" />
              Send Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoice_number} - Balance Due: {selectedInvoice && formatCurrency(selectedInvoice.balance_due)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Payment Amount</label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={selectedInvoice ? String(selectedInvoice.balance_due) : ''}
                  className="bg-background border-border"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                >
                  <option value="transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Payment Date</label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Input
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Payment reference, notes, etc."
                className="bg-background border-border"
              />
            </div>
            {selectedInvoice && (
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span>{formatCurrency(selectedInvoice.total_amount)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Paid Amount:</span>
                  <span>{formatCurrency(selectedInvoice.paid_amount || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-border pt-2">
                  <span>Balance Due:</span>
                  <span className="text-destructive">{formatCurrency(selectedInvoice.balance_due)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={paymentLoading}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={paymentLoading}>
              {paymentLoading ? (
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircleIcon className="h-4 w-4 mr-2" />
              )}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
