'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2Icon, CalendarIcon, LockIcon, UnlockIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'

interface Period {
  id: string
  period_name: string
  start_date: string
  end_date: string
  status: 'open' | 'closed' | 'locked'
}

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPeriods() }, [])

  async function loadPeriods() {
    setLoading(true)
    try {
      const res = await fetch('/api/finance/periods')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPeriods(data.data || [])
    } catch {
      toast.error('Failed to load periods')
    } finally { setLoading(false) }
  }

  async function closePeriod(id: string) {
    try {
      const res = await fetch(`/api/finance/periods/close?id=${id}`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('Period closed')
      await loadPeriods()
    } catch { toast.error('Failed to close period') }
  }

  async function reopenPeriod(id: string) {
    try {
      const res = await fetch(`/api/finance/periods/reopen?id=${id}`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('Period reopened')
      await loadPeriods()
    } catch { toast.error('Failed to reopen period') }
  }

  function fmt(d: string) { return new Date(d).toLocaleDateString('id-ID') }

  const statusBadge = (s: string) => {
    if (s === 'open') return <Badge variant="default"><UnlockIcon className="h-3 w-3 mr-1" />Open</Badge>
    if (s === 'closed') return <Badge variant="secondary"><LockIcon className="h-3 w-3 mr-1" />Closed</Badge>
    return <Badge variant="outline"><LockIcon className="h-3 w-3 mr-1" />Locked</Badge>
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fiscal Periods</h1>
        <p className="text-muted-foreground">Manage accounting periods and closing status.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Period</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Start Date</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">End Date</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-12"><Loader2Icon className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /></td></tr>
                ) : periods.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No periods configured.</td></tr>
                ) : periods.map(p => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium">{p.period_name}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{fmt(p.start_date)}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{fmt(p.end_date)}</td>
                    <td className="px-6 py-3">{statusBadge(p.status)}</td>
                    <td className="px-6 py-3">
                      {p.status === 'open' ? (
                        <Button variant="outline" size="sm" onClick={() => closePeriod(p.id)}><LockIcon className="h-3 w-3 mr-1" />Close</Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => reopenPeriod(p.id)}><UnlockIcon className="h-3 w-3 mr-1" />Reopen</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
