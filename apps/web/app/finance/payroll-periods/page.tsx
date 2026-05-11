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
  RefreshCwIcon,
  EyeIcon,
  FileTextIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarIcon,
  Loader2Icon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'

interface PayrollPeriod {
  id: string
  period_name: string
  month: number
  year: number
  start_date: string
  end_date: string
  status: 'draft' | 'closed' | 'archived'
  created_at: string
  updated_at: string
  slip_count?: number
  approved_count?: number
}

export default function PayrollPeriodsPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])

  const [employeeCheckboxes, setEmployeeCheckboxes] = useState<{[key: string]: boolean}>({})

  useEffect(() => {
    fetchPeriods()
  }, [])

  const fetchPeriods = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/payroll-periods')
      if (response.ok) {
        const data = await response.json()
        setPeriods(data)
      }
    } catch (error) {
      console.error('Error fetching periods:', error)
      toast.error('Failed to load payroll periods')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      closed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      archived: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
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

  const handleGenerateSlips = async () => {
    if (!selectedPeriod) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/payroll-periods/${selectedPeriod.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_ids: selectedEmployeeIds.length > 0 ? selectedEmployeeIds : null, // null = all active
        }),
      })
      
      if (response.ok) {
        toast.success('Payroll slips generated successfully!')
        setGenerateModalOpen(false)
        setSelectedPeriod(null)
        setSelectedEmployeeIds([])
        setEmployeeCheckboxes({})
        fetchPeriods()
      } else {
        const error = await response.json()
        toast.error(`Generate failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error generating slips:', error)
      toast.error('Failed to generate payroll slips')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleEmployee = (employeeId: string) => {
    setEmployeeCheckboxes(prev => ({
      ...prev,
      [employeeId]: !prev[employeeId]
    }))
    
    setSelectedEmployeeIds(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId)
      }
      return [...prev, employeeId]
    })
  }

  const selectedEmpCount = Object.values(employeeCheckboxes).filter(Boolean).length

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payroll Periods</h2>
          <p className="text-muted-foreground">Manage payroll calculation periods and generate slips</p>
        </div>
        <Link href="/finance/payroll-slips">
          <Button variant="outline">
            <FileTextIcon className="mr-2 h-4 w-4" />
            View Payroll Slips
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
        <Button onClick={fetchPeriods} disabled={isLoading}>
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
              <TableHead>Period Name</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No payroll periods found
                </TableCell>
              </TableRow>
            ) : (
              periods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{period.period_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {period.month}/{period.year}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>{new Date(period.start_date).toLocaleDateString('id-ID')}</span>
                      <span className="text-muted-foreground">
                        to {new Date(period.end_date).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">{period.slip_count || 0} slips</Badge>
                      {period.approved_count ? (
                        <Badge className="text-xs bg-green-100 text-green-800">
                          {period.approved_count} approved
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(period.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <FileTextIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {period.status === 'draft' && (
                          <DropdownMenuItem onClick={() => {
                            setSelectedPeriod(period)
                            setGenerateModalOpen(true)
                          }}>
                            <PlusIcon className="mr-2 h-4 w-4" />
                            Generate Slips
                          </DropdownMenuItem>
                        )}
                        {period.status === 'draft' && (
                          <DropdownMenuSeparator />
                        )}
                        <DropdownMenuItem>
                          <ClockIcon className="mr-2 h-4 w-4" />
                          View History
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

      {/* Generate Slips Modal */}
      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Payroll Slips</DialogTitle>
            <DialogDescription>
              Period: <strong>{selectedPeriod?.period_name}</strong> ({selectedPeriod?.month}/{selectedPeriod?.year})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <p className="font-semibold">All Active Employees</p>
                <p className="text-sm text-muted-foreground">
                  {selectedEmployeeIds.length} selected / {Object.keys(employeeCheckboxes).length} total
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={() => {
                  const allIds = Object.keys(employeeCheckboxes)
                  setSelectedEmployeeIds(allIds)
                  const allCheckboxes: {[key: string]: boolean} = {}
                  allIds.forEach(id => allCheckboxes[id] = true)
                  setEmployeeCheckboxes(allCheckboxes)
                }}
              >
                Select All
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(employeeCheckboxes).map(([empId, isChecked]) => (
                <label key={empId} className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleEmployee(empId)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm">{empId}</span>
                </label>
              ))}
            </div>
            
            <div className="text-sm text-muted-foreground text-center">
              (Employee list loading... - mock for demo)
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setGenerateModalOpen(false)
                setSelectedPeriod(null)
                setSelectedEmployeeIds([])
                setEmployeeCheckboxes({})
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateSlips}
              disabled={selectedEmpCount === 0 || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Generate {selectedEmpCount > 0 ? selectedEmpCount : 'All'} Slips
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
