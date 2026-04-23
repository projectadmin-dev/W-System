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
  FilterIcon,
  RefreshCwIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  DownloadIcon,
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

interface VendorBill {
  id: string
  bill_number: string
  vendor_name: string
  vendor_id: string
  amount: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  amount_due: number
  status: 'draft' | 'pending' | 'approved' | 'paid' | 'partial' | 'cancelled'
  bill_date: string
  due_date: string
  paid_date?: string
  paid_at?: string
  paid_days?: number
  description?: string
  created_at: string
  updated_at: string
}

export default function VendorBillsPage() {
  const [bills, setBills] = useState<VendorBill[]>([])
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
  const [selectedBill, setSelectedBill] = useState<VendorBill | null>(null)

  // Form state for new bill
  const [newBill, setNewBill] = useState({
    vendor_id: '',
    vendor_name: '',
    description: '',
    amount: '',
    tax_rate: '11', // PPN 11%
    bill_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
  })

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/finance/vendor-bills')
      if (response.ok) {
        const data = await response.json()
        setBills(data)
      }
    } catch (error) {
      console.error('Error fetching bills:', error)
      toast.error('Failed to load vendor bills')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredBills = bills.filter(bill => {
    const matchesSearch =
      bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || bill.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-muted text-foreground',
      pending: 'bg-yellow-600 text-foreground',
      approved: 'bg-blue-600 text-foreground',
      paid: 'bg-green-600 text-foreground',
      cancelled: 'bg-red-600 text-foreground',
    }
    return badges[status] || 'bg-muted text-foreground'
  }

  const handleCreateBill = async () => {
    try {
      const response = await fetch('/api/finance/vendor-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newBill,
          amount: parseFloat(newBill.amount),
          tax_rate: parseFloat(newBill.tax_rate),
        }),
      })

      if (response.ok) {
        toast.success('Vendor bill created successfully')
        setCreateDialogOpen(false)
        fetchBills()
        setNewBill({
          vendor_id: '',
          vendor_name: '',
          description: '',
          amount: '',
          tax_rate: '11',
          bill_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
      } else {
        toast.error('Failed to create vendor bill')
      }
    } catch (error) {
      console.error('Error creating bill:', error)
      toast.error('Failed to create vendor bill')
    }
  }

  const handleDeleteBill = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return

    try {
      const response = await fetch(`/api/finance/vendor-bills/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Vendor bill deleted successfully')
        fetchBills()
      } else {
        toast.error('Failed to delete vendor bill')
      }
    } catch (error) {
      console.error('Error deleting bill:', error)
      toast.error('Failed to delete vendor bill')
    }
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vendor Bills</h1>
            <p className="text-muted-foreground">Manage supplier invoices and bills</p>
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
              New Bill
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
                  placeholder="Search bills..."
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
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <Button variant="outline" onClick={fetchBills} className="border-border">
              <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Bills Table */}
        <div>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2Icon className="w-8 h-8 mx-auto mb-2 animate-spin" />
              Loading bills...
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No vendor bills found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground">Bill Number</TableHead>
                  <TableHead className="text-foreground">Vendor</TableHead>
                  <TableHead className="text-foreground">Bill Date</TableHead>
                  <TableHead className="text-foreground">Due Date</TableHead>
                  <TableHead className="text-foreground text-right">Amount</TableHead>
                  <TableHead className="text-foreground text-right">Tax</TableHead>
                  <TableHead className="text-foreground text-right">Total</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => (
                  <TableRow key={bill.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-foreground">{bill.bill_number}</TableCell>
                    <TableCell className="text-foreground">{bill.vendor_name}</TableCell>
                    <TableCell className="text-foreground">{bill.bill_date}</TableCell>
                    <TableCell className="text-foreground">{bill.due_date}</TableCell>
                    <TableCell className="text-right text-foreground">
                      Rp {bill.amount.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      Rp {bill.tax_amount.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      Rp {bill.total_amount.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(bill.status)}>
                        {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
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
                              setSelectedBill(bill)
                              setViewDialogOpen(true)
                            }}
                            className="text-foreground hover:bg-muted"
                          >
                            <EyeIcon className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-foreground hover:bg-muted">
                            <PencilIcon className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-muted" />
                          <DropdownMenuItem
                            onClick={() => handleDeleteBill(bill.id)}
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

      {/* Create Bill Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Vendor Bill</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter the details of the vendor bill
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Vendor Name</label>
                <Input
                  value={newBill.vendor_name}
                  onChange={(e) => setNewBill({ ...newBill, vendor_name: e.target.value })}
                 
                  placeholder="PT Supplier Utama"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Bill Date</label>
                <Input
                  type="date"
                  value={newBill.bill_date}
                  onChange={(e) => setNewBill({ ...newBill, bill_date: e.target.value })}
                 
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Description</label>
              <Input
                value={newBill.description}
                onChange={(e) => setNewBill({ ...newBill, description: e.target.value })}
               
                placeholder="Office supplies, equipment, etc."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Amount (Rp)</label>
                <Input
                  type="number"
                  value={newBill.amount}
                  onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
                 
                  placeholder="1000000"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Tax Rate (%)</label>
                <Input
                  type="number"
                  value={newBill.tax_rate}
                  onChange={(e) => setNewBill({ ...newBill, tax_rate: e.target.value })}
                 
                  placeholder="11"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Due Date</label>
              <Input
                type="date"
                value={newBill.due_date}
                onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })}
               
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-border">
              Cancel
            </Button>
            <Button onClick={handleCreateBill} className="bg-blue-600 hover:bg-blue-700">
              Create Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Bill Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vendor Bill Details</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">Bill Number</p>
                  <p className="font-mono text-foreground">{selectedBill.bill_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Status</p>
                  <Badge className={getStatusBadge(selectedBill.status)}>
                    {selectedBill.status.charAt(0).toUpperCase() + selectedBill.status.slice(1)}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Vendor</p>
                <p className="text-foreground">{selectedBill.vendor_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Description</p>
                <p className="text-foreground">{selectedBill.description || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">Bill Date</p>
                  <p className="text-foreground">{selectedBill.bill_date}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Due Date</p>
                  <p className="text-foreground">{selectedBill.due_date}</p>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-foreground">
                    <span>Subtotal</span>
                    <span>Rp {selectedBill.amount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-foreground">
                    <span>Tax</span>
                    <span>Rp {selectedBill.tax_amount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground text-lg">
                    <span>Total</span>
                    <span>Rp {selectedBill.total_amount.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
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
