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
  FileTextIcon,
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

interface PayrollSlip {
  id: string
  payroll_period_id: string
  payroll_period_name: string
  employee_id: string
  employee_name: string
  employee_code: string
  basic_salary: number
  transportation_allowance: number
  meal_allowance: number
  communication_allowance: number
  overtime_pay: number
  tax_deduction: number
  bpjs_kesehatan: number
  bpjs_ketenagakerjaan: number
  total_deduction: number
  net_salary: number
  status: 'draft' | 'approved' | 'paid'
  generated_at: string
  paid_at?: string
}

export default function PayrollSlipsPage() {
  const [slips, setSlips] = useState<PayrollSlip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewDetailOpen, setViewDetailOpen] = useState(false)
  const [selectedSlip, setSelectedSlip] = useState<PayrollSlip | null>(null)

  useEffect(() => {
    fetchSlips()
  }, [])

  const fetchSlips = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/payroll-slips')
      if (response.ok) {
        const data = await response.json()
        setSlips(data)
      }
    } catch (error) {
      console.error('Error fetching payroll slips:', error)
      toast.error('Failed to load payroll slips')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredSlips = slips.filter(slip => {
    const matchesSearch =
      slip.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slip.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slip.payroll_period_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || slip.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    }
    return (
      <Badge className={colors[status as keyof typeof colors] || ''}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleViewDetail = (slip: PayrollSlip) => {
    setSelectedSlip(slip)
    setViewDetailOpen(true)
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between space-y-2 mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Payroll Slips</h2>
        <div className="flex items-center space-x-2">
          <Link href="/finance/payroll-periods">
            <Button variant="outline">
              <FileTextIcon className="mr-2 h-4 w-4" />
              Go to Payroll Periods
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <Input
            placeholder="Search employee name or period..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64"
          />
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-2 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
        <Button onClick={fetchSlips} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Net Salary</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSlips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No payroll slips found
                </TableCell>
              </TableRow>
            ) : (
              filteredSlips.map((slip) => (
                <TableRow key={slip.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{slip.employee_name}</span>
                      <span className="text-xs text-muted-foreground">{slip.employee_code}</span>
                    </div>
                  </TableCell>
                  <TableCell>{slip.payroll_period_name}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(slip.net_salary)}
                  </TableCell>
                  <TableCell>{getStatusBadge(slip.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVerticalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetail(slip)}>
                          <EyeIcon className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 hover:text-red-700">
                          <XCircleIcon className="mr-2 h-4 w-4" />
                          Mark as Draft
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-green-600 hover:text-green-700">
                          <CheckCircleIcon className="mr-2 h-4 w-4" />
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <DownloadIcon className="mr-2 h-4 w-4" />
                          Download PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {filteredSlips.length} of {slips.length} payroll slips
        </div>
      </div>

      {/* View Detail Dialog */}
      <Dialog open={viewDetailOpen} onOpenChange={setViewDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payroll Slip Details</DialogTitle>
            <DialogDescription>
              Employee: <strong>{selectedSlip?.employee_name}</strong> ({selectedSlip?.employee_code})
            </DialogDescription>
          </DialogHeader>
          {selectedSlip && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Period</h4>
                  <p>{selectedSlip.payroll_period_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Generated: {new Date(selectedSlip.generated_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Payment Status</h4>
                  {getStatusBadge(selectedSlip.status)}
                  {selectedSlip.paid_at && (
                    <p className="text-sm text-muted-foreground">
                      Paid: {new Date(selectedSlip.paid_at).toLocaleDateString('id-ID')}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold border-b pb-2">Earnings</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Basic Salary</span>
                    <span>{formatCurrency(selectedSlip.basic_salary || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transportation</span>
                    <span>{formatCurrency(selectedSlip.transportation_allowance || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Meal Allowance</span>
                    <span>{formatCurrency(selectedSlip.meal_allowance || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Communication</span>
                    <span>{formatCurrency(selectedSlip.communication_allowance || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overtime</span>
                    <span>{formatCurrency(selectedSlip.overtime_pay || 0)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold border-b pb-2">Deductions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Income Tax (PPh 21)</span>
                    <span className="text-red-600">-{formatCurrency(selectedSlip.tax_deduction || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BPJS Kesehatan</span>
                    <span className="text-red-600">-{formatCurrency(selectedSlip.bpjs_kesehatan || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BPJS Ketenagakerjaan</span>
                    <span className="text-red-600">-{formatCurrency(selectedSlip.bpjs_ketenagakerjaan || 0)}</span>
                  </div>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total Deduction</span>
                  <span className="text-red-600">-{formatCurrency(selectedSlip.total_deduction || 0)}</span>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-lg">Net Salary (THP)</h4>
                  <span className="font-bold text-xl text-green-600">
                    {formatCurrency(selectedSlip.net_salary)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
