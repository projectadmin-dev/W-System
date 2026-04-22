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
  MoreVerticalIcon,
  Loader2Icon,
  MailIcon,
  PhoneIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'

interface Customer {
  id: string
  customer_code: string
  customer_name: string
  customer_type: string
  email: string
  phone: string
  address?: string
  tax_id?: string
  payment_terms_days: number
  credit_limit?: number
  is_active: boolean
  coa?: {
    account_code: string
    account_name: string
  }
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Form state for new customer
  const [newCustomer, setNewCustomer] = useState({
    customer_name: '',
    customer_type: 'company',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
    payment_terms_days: 30,
    credit_limit: '',
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  async function fetchCustomers() {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/customers')
      const data = await res.json()
      if (data.data) {
        setCustomers(data.data)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(customer => {
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'active' ? customer.is_active :
      !customer.is_active

    const matchesSearch =
      customer.customer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesFilter && matchesSearch
  })

  const handleCreateCustomer = async () => {
    try {
      const response = await fetch('/api/finance/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCustomer,
          credit_limit: newCustomer.credit_limit ? parseFloat(newCustomer.credit_limit) : undefined,
        }),
      })

      if (response.ok) {
        toast.success('Customer created successfully')
        setCreateDialogOpen(false)
        fetchCustomers()
        setNewCustomer({
          customer_name: '',
          customer_type: 'company',
          email: '',
          phone: '',
          address: '',
          tax_id: '',
          payment_terms_days: 30,
          credit_limit: '',
        })
      } else {
        toast.error('Failed to create customer')
      }
    } catch (error) {
      console.error('Error creating customer:', error)
      toast.error('Failed to create customer')
    }
  }

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return

    try {
      const response = await fetch(`/api/finance/customers/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Customer deleted successfully')
        fetchCustomers()
      } else {
        toast.error('Failed to delete customer')
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast.error('Failed to delete customer')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Customer Management</h1>
            <p className="text-gray-400">Manage customers and client master data</p>
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
              New Customer
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
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('inactive')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'inactive'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Inactive
              </button>
            </div>
            <div className="text-gray-400 text-sm">
              Showing {filteredCustomers.length} of {customers.length} customers
            </div>
            <Button variant="outline" onClick={fetchCustomers} className="border-gray-600">
              <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <Loader2Icon className="w-8 h-8 mx-auto mb-2 animate-spin" />
              Loading customers...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No customers found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Code</TableHead>
                  <TableHead className="text-gray-300">Name</TableHead>
                  <TableHead className="text-gray-300">Type</TableHead>
                  <TableHead className="text-gray-300">Contact</TableHead>
                  <TableHead className="text-gray-300">Payment Terms</TableHead>
                  <TableHead className="text-gray-300">Credit Limit</TableHead>
                  <TableHead className="text-gray-300">COA Account</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="border-gray-700 hover:bg-gray-750">
                    <TableCell className="font-mono text-white">{customer.customer_code}</TableCell>
                    <TableCell className="text-white font-medium">{customer.customer_name}</TableCell>
                    <TableCell className="text-gray-300 capitalize">{customer.customer_type}</TableCell>
                    <TableCell className="text-gray-300">
                      <div className="flex items-center gap-2">
                        <MailIcon className="w-3 h-3 text-gray-500" />
                        {customer.email}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <PhoneIcon className="w-3 h-3" />
                        {customer.phone}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {customer.payment_terms_days} days
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {customer.credit_limit ? (
                        <span className="text-white font-medium">
                          Rp {customer.credit_limit.toLocaleString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-gray-500">No limit</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {customer.coa ? (
                        <div>
                          <div className="font-mono text-white">{customer.coa.account_code}</div>
                          <div className="text-xs text-gray-500">{customer.coa.account_name}</div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          customer.is_active
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-600 text-gray-300'
                        }
                      >
                        {customer.is_active ? 'Active' : 'Inactive'}
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
                              setSelectedCustomer(customer)
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
                            onClick={() => handleDeleteCustomer(customer.id)}
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

      {/* Create Customer Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter the customer details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Customer Name</label>
                <Input
                  value={newCustomer.customer_name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, customer_name: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="PT Customer Sejahtera"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Customer Type</label>
                <select
                  value={newCustomer.customer_type}
                  onChange={(e) => setNewCustomer({ ...newCustomer, customer_type: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="company">Company</option>
                  <option value="individual">Individual</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Email</label>
                <Input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="contact@customer.com"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Phone</label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="+62 812 3456 7890"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Address</label>
              <Input
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Jl. Contoh No. 123, Jakarta"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Tax ID (NPWP)</label>
                <Input
                  value={newCustomer.tax_id}
                  onChange={(e) => setNewCustomer({ ...newCustomer, tax_id: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="01.234.567.8-901.000"
                />
              </div>
              <div>
                <label className="text-sm text-gray-300 mb-1 block">Payment Terms (Days)</label>
                <Input
                  type="number"
                  value={newCustomer.payment_terms_days}
                  onChange={(e) => setNewCustomer({ ...newCustomer, payment_terms_days: parseInt(e.target.value) })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="30"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-1 block">Credit Limit (Rp)</label>
              <Input
                type="number"
                value={newCustomer.credit_limit}
                onChange={(e) => setNewCustomer({ ...newCustomer, credit_limit: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="10000000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="border-gray-600">
              Cancel
            </Button>
            <Button onClick={handleCreateCustomer} className="bg-blue-600 hover:bg-blue-700">
              Create Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Customer Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Customer Code</p>
                  <p className="font-mono text-white">{selectedCustomer.customer_code}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Status</p>
                  <Badge
                    className={
                      selectedCustomer.is_active
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-gray-300'
                    }
                  >
                    {selectedCustomer.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Customer Name</p>
                <p className="text-white font-medium text-lg">{selectedCustomer.customer_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Type</p>
                  <p className="text-white capitalize">{selectedCustomer.customer_type}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Tax ID</p>
                  <p className="text-white font-mono">{selectedCustomer.tax_id || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Contact Information</p>
                <div className="space-y-1 mt-1">
                  <div className="flex items-center gap-2 text-white">
                    <MailIcon className="w-4 h-4 text-gray-500" />
                    {selectedCustomer.email}
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <PhoneIcon className="w-4 h-4 text-gray-500" />
                    {selectedCustomer.phone}
                  </div>
                </div>
              </div>
              {selectedCustomer.address && (
                <div>
                  <p className="text-gray-400 text-sm">Address</p>
                  <p className="text-white">{selectedCustomer.address}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Payment Terms</p>
                  <p className="text-white">{selectedCustomer.payment_terms_days} days</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Credit Limit</p>
                  <p className="text-white font-medium">
                    {selectedCustomer.credit_limit
                      ? `Rp ${selectedCustomer.credit_limit.toLocaleString('id-ID')}`
                      : 'No limit'}
                  </p>
                </div>
              </div>
              {selectedCustomer.coa && (
                <div>
                  <p className="text-gray-400 text-sm">COA Account</p>
                  <div className="text-white">
                    <div className="font-mono">{selectedCustomer.coa.account_code}</div>
                    <div className="text-sm text-gray-400">{selectedCustomer.coa.account_name}</div>
                  </div>
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
