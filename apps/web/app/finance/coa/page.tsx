'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PlusIcon, Loader2Icon, FilterIcon, DropletsIcon } from 'lucide-react'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@workspace/ui/components/select'

interface COA {
  id: string
  code: string
  account_name: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  parent_id: string | null
  description: string | null
  is_active: boolean
  cash_flow_category?: string | null
}

const typeConfig: Record<string, { color: string; bg: string }> = {
  asset: { color: 'text-blue-700', bg: 'bg-blue-50' },
  liability: { color: 'text-red-700', bg: 'bg-red-50' },
  equity: { color: 'text-purple-700', bg: 'bg-purple-50' },
  revenue: { color: 'text-emerald-700', bg: 'bg-emerald-50' },
  expense: { color: 'text-amber-700', bg: 'bg-amber-50' },
}

const cfConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  operating: { label: 'Operating', color: 'text-blue-700', bg: 'bg-blue-50', icon: '🔄' },
  investing: { label: 'Investing', color: 'text-purple-700', bg: 'bg-purple-50', icon: '📊' },
  financing: { label: 'Financing', color: 'text-amber-700', bg: 'bg-amber-50', icon: '💰' },
  non_cash: { label: 'Non-Cash', color: 'text-slate-700', bg: 'bg-slate-100', icon: '⚡' },
  not_applicable: { label: 'N/A', color: 'text-muted-foreground', bg: 'bg-muted', icon: '—' },
}

export default function COAPage() {
  const [coaList, setCoaList] = useState<COA[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [filterCF, setFilterCF] = useState('all')

  useEffect(() => { loadCOA() }, [filterType, filterCF])

  async function loadCOA() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') params.set('type', filterType)
      if (filterCF !== 'all') params.set('cashFlowCategory', filterCF)
      const url = `/api/finance/coa${params.toString() ? '?' + params.toString() : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCoaList(Array.isArray(data) ? data : data.data || [])
    } catch {
      toast.error('Gagal memuat Chart of Accounts')
    } finally { setLoading(false) }
  }

  const filteredList = coaList

  const cfCounts: Record<string, number> = {}
  coaList.forEach(c => {
    const cf = c.cash_flow_category || 'not_applicable'
    cfCounts[cf] = (cfCounts[cf] || 0) + 1
  })

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DropletsIcon className="w-6 h-6 text-blue-600" />
            Chart of Accounts
          </h1>
          <p className="text-muted-foreground">Kelola struktur akun — termasuk tagging Cash Flow untuk laporan arus kas.</p>
        </div>
        <Button><PlusIcon className="h-4 w-4 mr-2" /> Tambah Akun</Button>
      </div>

      {/* Cash Flow Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(cfConfig).map(([key, cfg]) => {
          const count = cfCounts[key] || 0
          return (
            <Card key={key} className={`cursor-pointer transition-colors hover:border-primary ${filterCF === key ? 'border-primary ring-1 ring-primary' : ''}`}
              onClick={() => setFilterCF(filterCF === key ? 'all' : key)}>
              <CardContent className="p-3 text-center">
                <p className="text-2xl">{cfg.icon}</p>
                <p className={`text-lg font-bold ${cfg.color}`}>{count}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {['all', 'asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => (
            <Button key={type} variant={filterType === type ? 'default' : 'outline'} size="sm"
              onClick={() => setFilterType(type)}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <FilterIcon className="w-4 h-4 text-muted-foreground" />
          <Select value={filterCF} onValueChange={setFilterCF}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Cash Flow Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="operating">🔄 Operating</SelectItem>
              <SelectItem value="investing">📊 Investing</SelectItem>
              <SelectItem value="financing">💰 Financing</SelectItem>
              <SelectItem value="non_cash">⚡ Non-Cash</SelectItem>
              <SelectItem value="not_applicable">— Not Applicable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Code</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Account Name</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Cash Flow</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Description</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Loader2Icon className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">Tidak ada akun ditemukan.</td>
                  </tr>
                ) : (
                  filteredList.map((coa) => {
                    const cfg = typeConfig[coa.account_type] || {}
                    const cf = cfConfig[coa.cash_flow_category || 'not_applicable'] || cfConfig.not_applicable
                    return (
                      <tr key={coa.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3 text-sm font-mono">{coa.code}</td>
                        <td className="px-6 py-3 text-sm font-medium">{coa.account_name}</td>
                        <td className="px-6 py-3">
                          <Badge variant="outline" className={`capitalize ${cfg.color} ${cfg.bg}`}>
                            {coa.account_type}
                          </Badge>
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant="outline" className={`${cf.color} ${cf.bg}`}>
                            {cf.icon} {cf.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-sm text-muted-foreground truncate max-w-[180px]">{coa.description || '—'}</td>
                        <td className="px-6 py-3">
                          <Badge variant={coa.is_active ? 'default' : 'secondary'}>
                            {coa.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex gap-2">
                            <Link href={`/finance/coa/${coa.id}`}>
                              <Button variant="ghost" size="sm">Edit</Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => {
          const count = coaList.filter((c) => c.account_type === type).length
          const cfg = typeConfig[type]
          return (
            <Card key={type}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
                <p className="text-sm text-muted-foreground capitalize">{type}s</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
