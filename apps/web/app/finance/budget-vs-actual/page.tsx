'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2Icon, BarChart3Icon, TrendingDownIcon, TrendingUpIcon,
  AlertTriangleIcon, TargetIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'

// Custom progress bar karena @workspace/ui/components/progress belum tersedia
function CustomProgress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`bg-muted rounded-full overflow-hidden ${className || ''}`}>
      <div
        className="h-full bg-primary transition-all duration-300 rounded-full"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  )
}

interface BudgetRow {
  kind_code: string
  label: string
  budget: number
  actual: number
  variance: number
  percent_used: number
}

interface CategoryRow {
  category_code: string
  category_name: string
  kind_code: string
  budget: number
  actual: number
  variance: number
  percent_used: number
}

function fmt(v?: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0)
}

export default function BudgetVsActualPage() {
  const [kinds, setKinds] = useState<BudgetRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [summary, setSummary] = useState({ total_budget: 0, total_actual: 0, total_variance: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/budget-vs-actual')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setKinds(data.kinds || [])
      setCategories(data.categories || [])
      setSummary(data.summary || { total_budget: 0, total_actual: 0, total_variance: 0 })
    } catch {
      toast.error('Failed to load budget data')
    } finally { setLoading(false) }
  }

  function percentColor(p: number) {
    if (p < 50) return 'bg-emerald-500'
    if (p < 80) return 'bg-amber-500'
    if (p < 100) return 'bg-orange-500'
    return 'bg-destructive'
  }

  function statusBadge(p: number) {
    if (p < 50) return <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"><TrendingUpIcon className="h-3 w-3 mr-1" /> On Track</Badge>
    if (p < 80) return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200"><TrendingDownIcon className="h-3 w-3 mr-1" /> Caution</Badge>
    if (p < 100) return <Badge variant="destructive" className="bg-orange-100 text-orange-700 hover:bg-orange-200"><AlertTriangleIcon className="h-3 w-3 mr-1" /> Warning</Badge>
    return <Badge variant="destructive">Over Budget</Badge>
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <TargetIcon className="w-6 h-6 text-primary" /> Budget vs Actual
          </h1>
          <p className="text-muted-foreground">Track monthly spending against budget.</p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          {loading ? <Loader2Icon className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3Icon className="h-4 w-4 mr-2" />}Reload
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <TargetIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <LoadingPulse /> : fmt(summary.total_budget)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Actual</CardTitle>
            <TrendingDownIcon className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? <LoadingPulse /> : fmt(summary.total_actual)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.total_variance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
              {loading ? <LoadingPulse /> : fmt(summary.total_variance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kind-level Budget Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Budget by Kind</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Kind</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground text-right">Budget</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground text-right">Actual</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground text-right">Variance</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">% Used</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12"><Loader2Icon className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /></td></tr>
                ) : kinds.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No data.</td></tr>
                ) : (
                  kinds.map((row) => (
                    <tr key={row.kind_code} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium">{row.label}</td>
                      <td className="px-6 py-3 text-sm text-right">{fmt(row.budget)}</td>
                      <td className="px-6 py-3 text-sm text-right">{fmt(row.actual)}</td>
                      <td className={`px-6 py-3 text-sm text-right font-medium ${row.variance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{fmt(row.variance)}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <CustomProgress value={Math.min(row.percent_used, 100)} className="h-2 w-24"/>
                          <span className="text-sm text-muted-foreground">{row.percent_used}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">{statusBadge(row.percent_used)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Category-level breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Budget by Category</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Category</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Kind</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground text-right">Budget</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground text-right">Actual</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">% Used</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-12"><Loader2Icon className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /></td></tr>
                ) : categories.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No data.</td></tr>
                ) : (
                  categories.map((row) => (
                    <tr key={row.category_code} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium">{row.category_name}</td>
                      <td className="px-6 py-3 text-sm"><Badge variant="outline" className="capitalize">{row.kind_code}</Badge></td>
                      <td className="px-6 py-3 text-sm text-right">{fmt(row.budget)}</td>
                      <td className="px-6 py-3 text-sm text-right">{fmt(row.actual)}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <CustomProgress value={Math.min(row.percent_used, 100)} className="h-2 w-24"/>
                          <span className="text-sm text-muted-foreground">{row.percent_used}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingPulse() {
  return <div className="h-8 bg-muted rounded animate-pulse" />
}
