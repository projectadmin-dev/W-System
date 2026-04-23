'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  TrendingUpIcon,
  AlertTriangleIcon,
  DollarSignIcon,
  FileTextIcon,
  LandmarkIcon,
  BookOpenIcon,
  CalendarIcon,
  CalculatorIcon,
  WalletIcon,
  ClipboardListIcon,
  ReceiptIcon,
  BarChart3Icon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'

interface ARStats {
  total: number
  current: number
  days_1_30: number
  days_31_60: number
  days_61_90: number
  over_90: number
}

interface InvoiceSummary {
  total_count: number
  total_amount: number
  paid_total: number
  overdue_count: number
  draft_count: number
  sent_count: number
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export default function FinanceDashboard() {
  const [stats, setStats] = useState<ARStats | null>(null)
  const [summary, setSummary] = useState<InvoiceSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)
    try {
      const arRes = await fetch('/api/finance/ar-aging')
      if (arRes.ok) {
        const { data } = await arRes.json()
        setStats(data)
      }
      const invRes = await fetch('/api/finance/customer-invoices')
      if (invRes.ok) {
        const { data: invoices } = await invRes.json()
        const s: InvoiceSummary = {
          total_count: invoices?.length || 0,
          total_amount: invoices?.reduce((acc: number, inv: any) => acc + (Number(inv.total_amount) || 0), 0) || 0,
          paid_total: invoices?.reduce((acc: number, inv: any) => acc + (Number(inv.paid_amount) || 0), 0) || 0,
          overdue_count: invoices?.filter((inv: any) => inv.status === 'overdue').length || 0,
          draft_count: invoices?.filter((inv: any) => inv.status === 'draft').length || 0,
          sent_count: invoices?.filter((inv: any) => inv.status === 'sent' || inv.status === 'partial').length || 0,
        }
        setSummary(s)
      }
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finance Dashboard</h1>
        <p className="text-muted-foreground">Overview of your financial position and performance.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding AR</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <LoadingPulse /> : formatCurrency(stats?.total || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue AR</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {loading ? <LoadingPulse /> : formatCurrency((stats?.days_31_60 || 0) + (stats?.days_61_90 || 0) + (stats?.over_90 || 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">31-60 / 61-90 / 90+ days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Paid (YTD)</CardTitle>
            <DollarSignIcon className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {loading ? <LoadingPulse /> : formatCurrency(summary?.paid_total || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Invoices</CardTitle>
            <FileTextIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <LoadingPulse /> : summary?.sent_count || 0} Unpaid
            </div>
            <p className="text-xs text-muted-foreground mt-1">{summary?.overdue_count || 0} Overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* AR Aging */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>AR Aging Breakdown</CardTitle>
          <Link href="/finance/ar-aging" className="text-sm text-primary hover:underline">View Detail →</Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-20 bg-muted rounded animate-pulse" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Current', value: stats?.current, variant: 'default' as const },
                { label: '1-30 Days', value: stats?.days_1_30, variant: 'secondary' as const },
                { label: '31-60 Days', value: stats?.days_31_60, variant: 'outline' as const },
                { label: '61-90 Days', value: stats?.days_61_90, variant: 'destructive' as const },
                { label: '90+ Days', value: stats?.over_90, variant: 'destructive' as const },
              ].map((item) => (
                <div key={item.label} className="text-center p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                  <p className="text-lg font-semibold">{formatCurrency(item.value || 0)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ModuleCard
          title="Chart of Accounts"
          description="Manage account structure (add, edit, activate)"
          href="/finance/coa"
          icon={<BookOpenIcon className="h-5 w-5" />}
        />
        <ModuleCard
          title="Journal Entries"
          description="Double-entry bookkeeping — create, post, reverse"
          href="/finance/journal"
          icon={<FileTextIcon className="h-5 w-5" />}
        />
        <ModuleCard
          title="Fiscal Periods"
          description="Configure accounting periods"
          href="/finance/periods"
          icon={<CalendarIcon className="h-5 w-5" />}
        />
        <ModuleCard
          title="Cash / Bank Register"
          description="Tracking daily in & out + running balance"
          href="/finance/cash-register"
          icon={<WalletIcon className="h-5 w-5" />}
        />
        <ModuleCard
          title="Bank Reconciliation"
          description="Match bank statements with journal entries"
          href="/finance/bank-reconciliation"
          icon={<LandmarkIcon className="h-5 w-5" />}
        />
        <ModuleCard
          title="Money Requests"
          description="Procurement, Reimbursement, Cash Advance via NIK"
          href="/finance/money-requests"
          icon={<ClipboardListIcon className="h-5 w-5" />}
        />
        <ModuleCard
          title="Expense Tracking"
          description="Budget vs Actual + transaction detail"
          href="/finance/expenses"
          icon={<ReceiptIcon className="h-5 w-5" />}
        />
        <ModuleCard
          title="AR Aging (Piutang)"
          description="Customer receivable aging analysis"
          href="/finance/ar-aging"
          icon={<CalculatorIcon className="h-5 w-5" />}
        />
        <ModuleCard
          title="AP Aging (Hutang)"
          description="Vendor payable aging analysis"
          href="/finance/ap-aging"
          icon={<BarChart3Icon className="h-5 w-5" />}
        />
      </div>

      {/* Reports Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Financial Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ReportCard title="Trial Balance" description="Account balances with debit=credit check" href="/finance/reports/trial-balance" />
          <ReportCard title="Income Statement" description="Revenue vs expenses profitability" href="/finance/reports/profit-loss" />
          <ReportCard title="Balance Sheet" description="Assets, liabilities, and equity position" href="/finance/reports/balance-sheet" />
        </div>
      </div>
    </div>
  )
}

/* ---------- Subcomponents ---------- */

function LoadingPulse() {
  return <div className="h-8 bg-muted rounded animate-pulse" />
}

function ModuleCard({ title, description, href, icon }: { title: string; description: string; href: string; icon: React.ReactNode }) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary transition-colors cursor-pointer h-full">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="mt-1 text-primary">{icon}</div>
          <div>
            <h4 className="font-semibold">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function ReportCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary transition-colors cursor-pointer">
        <CardContent className="p-5">
          <h4 className="font-semibold mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
          <Badge variant="secondary" className="mt-3">Report</Badge>
        </CardContent>
      </Card>
    </Link>
  )
}
