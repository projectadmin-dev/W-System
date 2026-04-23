 'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

// Allow nested customer object from Supabase join
interface ReceiptCustomer {
  customer_name?: string
}

interface ReceiptPaymentMethod {
  method_name?: string
}

interface Receipt {
  id: string
  receipt_number: string
  customer_id?: string
  customer?: ReceiptCustomer | ReceiptCustomer[] | null
  customer_name?: string // fallback flat
  invoice_number?: string
  amount: number
  payment_method_id?: string
  payment_method?: ReceiptPaymentMethod | ReceiptPaymentMethod[] | null
  method_name?: string
  status: 'draft' | 'issued' | 'sent' | 'cancelled'
  receipt_date: string
  reference_number?: string
  notes?: string
  created_at: string
  updated_at: string
}

function extractCustomerName(r: Receipt): string {
  if (!r.customer) return r.customer_name || 'Unknown'
  const c = Array.isArray(r.customer) ? r.customer[0] : r.customer
  return c?.customer_name || r.customer_name || 'Unknown'
}

function extractPaymentMethod(r: Receipt): string {
  if (!r.payment_method) return r.method_name || 'Bank Transfer'
  const p = Array.isArray(r.payment_method) ? r.payment_method[0] : r.payment_method
  return p?.method_name || r.method_name || 'Bank Transfer'
}

export default function ReceiptsPage() {
  const router = useRouter()
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
          // Handle Supabase join response format
          const formatted = (data.data || data).map((r: any) => ({
            ...r,
            customer_name: r.customer?.customer_name || r.customer_name,
            payment_method: r.payment_method?.method_name || r.method_name,
          }))
          setReceipts(formatted)
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
      extractCustomerName(receipt).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (receipt.invoice_number && receipt.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-muted text-foreground',
      issued: 'bg-blue-600 text-foreground',
      sent: 'bg-green-600 text-foreground',
      cancelled: 'bg-red-600 text-foreground',
    }
    return badges[status] || 'bg-muted text-foreground'
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
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Receipts</h1>
            <p className="text-muted-foreground">Manage customer payment receipts</p>
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
              New Receipt
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
                  placeholder="Search receipts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-muted border-border text-foreground"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-muted border border-border rounded-lg px-4 py-2 text-foreground"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
                <option value="sent">Sent</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <Button variant="outline" onClick={fetchReceipts} className="border-border">
              <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Receipts Table */}
        <div>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2Icon className="w-8 h-8 mx-auto mb-2 animate-spin" />
              Loading receipts...
            </div>
          ) : filteredReceipts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No receipts found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Receipt #</TableHead>
                  <TableHead className="text-foreground">Customer</TableHead>
                  <TableHead className="text-foreground">Invoice #</TableHead>
                  <TableHead className="text-foreground">Receipt Date</TableHead>
                  <TableHead className="text-foreground">Payment Method</TableHead>
                  <TableHead className="text-foreground text-right">Amount</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => (
                  <TableRow key={receipt.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-foreground">{receipt.receipt_number}</TableCell>
                    <TableCell className="text-foreground">{extractCustomerName(receipt)}</TableCell>
                    <TableCell className="text-foreground">
                      {receipt.invoice_number || '-'}
                    </TableCell>
                    <TableCell className="text-foreground">{receipt.receipt_date}</TableCell>
                    <TableCell className="text-foreground capitalize">
                      {extractPaymentMethod(receipt).replace('_', ' ')}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
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
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedReceipt(receipt)
                              setViewDialogOpen(true)
                            }}
                            className="text-foreground hover:bg-muted"
                          >
                            <EyeIcon className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {receipt.status === 'issued' && (
                            <DropdownMenuItem
                              onClick={() => handleSendReceipt(receipt.id)}
                              className="text-primary hover:bg-muted"
                            >
                              <MailIcon className="w-4 h-4 mr-2" />
                              Send
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => router.push(`/finance/receipts/${receipt.id}/bkm`)}
                            className="text-foreground hover:bg-muted"
                          >
                            <PrinterIcon className="w-4 h-4 mr-2" />
                            Print
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-muted" />
                          <DropdownMenuItem
                            onClick={() => handleDeleteReceipt(receipt.id)}
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

      {/* Create Receipt Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Receipt</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Record a customer payment receipt
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Customer Name</label>
                <Input
                  value={newReceipt.customer_name}
                  onChange={(e) => setNewReceipt({ ...newReceipt, customer_name: e.target.value })}
                 
                  placeholder="PT Customer Abadi"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Receipt Date</label>
                <Input
                  type="date"
                  value={newReceipt.receipt_date}
                  onChange={(e) => setNewReceipt({ ...newReceipt, receipt_date: e.target.value })}
                 
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Invoice Number (Optional)</label>
              <Input
                value={newReceipt.invoice_number}
                onChange={(e) => setNewReceipt({ ...newReceipt, invoice_number: e.target.value })}
               
                placeholder="INV-2025-001"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Amount (Rp)</label>
                <Input
                  type="number"
                  value={newReceipt.amount}
                  onChange={(e) => setNewReceipt({ ...newReceipt, amount: e.target.value })}
                 
                  placeholder="1000000"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Payment Method</label>
                <select
                  value={newReceipt.payment_method}
                  onChange={(e) => setNewReceipt({ ...newReceipt, payment_method: e.target.value as any })}
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
                value={newReceipt.notes}
                onChange={(e) => setNewReceipt({ ...newReceipt, notes: e.target.value })}
               
                placeholder="Payment reference, bank name, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-border">
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
        <DialogContent className="bg-card border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">Receipt Number</p>
                  <p className="font-mono text-foreground">{selectedReceipt.receipt_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Status</p>
                  <Badge className={getStatusBadge(selectedReceipt.status)}>
                    {selectedReceipt.status.charAt(0).toUpperCase() + selectedReceipt.status.slice(1)}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Customer</p>
                <p className="text-foreground">{extractCustomerName(selectedReceipt)}</p>
              </div>
              {selectedReceipt.invoice_number && (
                <div>
                  <p className="text-muted-foreground text-sm">Invoice Reference</p>
                  <p className="font-mono text-foreground">{selectedReceipt.invoice_number}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">Receipt Date</p>
                  <p className="text-foreground">{selectedReceipt.receipt_date}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Payment Method</p>
                  <p className="text-foreground capitalize">{extractPaymentMethod(selectedReceipt).replace('_', ' ')}</p>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount Received</span>
                  <span className="text-foreground font-bold text-xl">Rp {selectedReceipt.amount.toLocaleString('id-ID')}</span>
                </div>
              </div>
              {selectedReceipt.notes && (
                <div>
                  <p className="text-muted-foreground text-sm">Notes</p>
                  <p className="text-foreground">{selectedReceipt.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <div className="flex gap-2">
              <Button variant="outline" className="border-border">
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
