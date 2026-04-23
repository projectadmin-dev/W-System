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
      draft: 'bg-gray-600 text-white',
      pending: 'bg-yellow-600 text-white',
      approved: 'bg-blue-600 text-white',
      paid: 'bg-green-600 text-white',
      cancelled: 'bg-red-600 text-white',
    }
    return badges[status] || 'bg-gray-600 text-white'
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
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Vendor Bills</h1>
            <p className="text-gray-400">Manage supplier invoices and bills</p>
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
              New Bill
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
                  placeholder="Search bills..."
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
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <Button variant="outline" onClick={fetchBills} className="border-gray-600">
              <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Bills Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">
              <Loader2Icon className="w-8 h-8 mx-auto mb-2 animate-spin" />
              Loading bills...
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No vendor bills found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Bill Number</TableHead>
                  <TableHead className="text-gray-300">Vendor</TableHead>
                  <TableHead className="text-gray-300">Bill Date</TableHead>
                  <TableHead className="text-gray-300">Due Date</TableHead>
                  <TableHead className="text-gray-300 text-right">Amount</TableHead>
                  <TableHead className="text-gray-300 text-right">Tax</TableHead>
                  <TableHead className="text-gray-300 text-right">Total</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => (
                  <TableRow key={bill.id} className="border-gray-700 hover:bg-gray-750">
                    <TableCell className="font-mono text-white">{bill.bill_number}</TableCell>
                    <TableCell className="text-white">{bill.vendor_name}</TableCell>
                    <TableCell className="text-gray-300">{bill.bill_date}</TableCell>
                    <TableCell className="text-gray-300">{bill.due_date}</TableCell>
                    <TableCell className="text-right text-gray-300">
                      Rp {bill.amount.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right text-gray-300">
                      Rp {bill.tax_amount.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-white">
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
                        <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedBill(bill)
                              setViewDialogOpen(true)
                            }}
                            className="text-gray-300 hover:bg-gray-700"
                          >
                            <EyeIcon className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-gray-300 hover:bg-gray-700">
                            <PencilIcon className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-gray-700" />
                          <DropdownMenuItem
                            onClick={() => handleDeleteBill(bill.id)}
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

      {/* Create Bill Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Vendor Bill</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter the details of the vendor bill
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Vendor Name</label>
                <Input
                  value={newBill.vendor_name}
                  onChange={(e) => setNewBill({ ...newBill, vendor_name: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="PT Supplier Utama"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Bill Date</label>
                <Input
                  type="date"
                  value={newBill.bill_date}
                  onChange={(e) => setNewBill({ ...newBill, bill_date: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Description</label>
              <Input
                value={newBill.description}
                onChange={(e) => setNewBill({ ...newBill, description: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Office supplies, equipment, etc."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Amount (Rp)</label>
                <Input
                  type="number"
                  value={newBill.amount}
                  onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="1000000"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Tax Rate (%)</label>
                <Input
                  type="number"
                  value={newBill.tax_rate}
                  onChange={(e) => setNewBill({ ...newBill, tax_rate: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="11"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Due Date</label>
              <Input
                type="date"
                value={newBill.due_date}
                onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-gray-600">
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
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vendor Bill Details</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Bill Number</p>
                  <p className="font-mono text-white">{selectedBill.bill_number}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <Badge className={getStatusBadge(selectedBill.status)}>
                    {selectedBill.status.charAt(0).toUpperCase() + selectedBill.status.slice(1)}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Vendor</p>
                <p className="text-white">{selectedBill.vendor_name}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Description</p>
                <p className="text-white">{selectedBill.description || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Bill Date</p>
                  <p className="text-white">{selectedBill.bill_date}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Due Date</p>
                  <p className="text-white">{selectedBill.due_date}</p>
                </div>
              </div>
              <div className="border-t border-gray-700 pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal</span>
                    <span>Rp {selectedBill.amount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Tax</span>
                    <span>Rp {selectedBill.tax_amount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-white text-lg">
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
