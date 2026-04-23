'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { PlusIcon, Loader2Icon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'

interface COA {
  id: string
  code: string
  account_name: string
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  parent_id: string | null
  description: string | null
  is_active: boolean
}

const typeConfig: Record<string, { color: string; bg: string }> = {
  asset: { color: 'text-blue-700', bg: 'bg-blue-50' },
  liability: { color: 'text-red-700', bg: 'bg-red-50' },
  equity: { color: 'text-purple-700', bg: 'bg-purple-50' },
  revenue: { color: 'text-emerald-700', bg: 'bg-emerald-50' },
  expense: { color: 'text-amber-700', bg: 'bg-amber-50' },
}

export default function COAPage() {
  const [coaList, setCoaList] = useState<COA[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    loadCOA()
  }, [filterType])

  async function loadCOA() {
    setLoading(true)
    try {
      const url = filterType === 'all' ? '/api/finance/coa' : `/api/finance/coa?type=${filterType}`
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCoaList(data)
    } catch {
      toast.error('Failed to load Chart of Accounts')
    } finally {
      setLoading(false)
    }
  }

  const filteredList = filterType === 'all'
    ? coaList
    : coaList.filter((c) => c.account_type === filterType)

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground">Manage your account structure.</p>
        </div>
        <Button><PlusIcon className="h-4 w-4 mr-2" /> Add Account</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => (
          <Button
            key={type}
            variant={filterType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType(type)}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        ))}
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
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Description</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <Loader2Icon className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">No accounts found.</td>
                  </tr>
                ) : (
                  filteredList.map((coa) => {
                    const cfg = typeConfig[coa.account_type] || {}
                    return (
                      <tr key={coa.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-3 text-sm font-mono">{coa.code}</td>
                        <td className="px-6 py-3 text-sm font-medium">{coa.account_name}</td>
                        <td className="px-6 py-3">
                          <Badge variant="outline" className={`capitalize ${cfg.color} ${cfg.bg}`}>
                            {coa.account_type}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-sm text-muted-foreground truncate max-w-[200px]">{coa.description || '—'}</td>
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
