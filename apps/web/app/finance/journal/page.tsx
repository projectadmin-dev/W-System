'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  PlusIcon,
  Loader2Icon,
  FileTextIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'

interface JournalEntry {
  id: string
  entry_number: string
  transaction_date: string
  description: string
  total_debit: number
  total_credit: number
  status: string
  reversal_of_id: string | null
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [postingId, setPostingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadJournalEntries()
  }, [statusFilter])

  async function loadJournalEntries() {
    setLoading(true)
    try {
      const url = statusFilter === 'all' ? '/api/finance/journal' : `/api/finance/journal?status=${statusFilter}`
      const res = await fetch(url)
      const data = await res.json()
      setEntries(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load journal entries')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  async function handlePost(id: string) {
    if (!confirm('Post this journal entry? Once posted, it cannot be edited (PSAK compliance).')) return
    setPostingId(id)
    try {
      const res = await fetch(`/api/finance/journal/post?id=${id}`, { method: 'POST' })
      if (res.ok) {
        toast.success('Journal entry posted')
        await loadJournalEntries()
      } else {
        const d = await res.json()
        toast.error(d.message || 'Failed to post')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setPostingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this draft journal entry?')) return
    try {
      const res = await fetch(`/api/finance/journal?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Draft deleted')
        await loadJournalEntries()
      } else {
        const d = await res.json()
        toast.error(d.message || 'Failed to delete')
      }
    } catch {
      toast.error('Network error')
    }
  }

  function fmt(v: number) {
    return new Intl.NumberFormat('id-ID', { style: 'decimal', minimumFractionDigits: 2 }).format(v || 0)
  }

  const totalDebits = entries.reduce((s, e) => s + (Number(e.total_debit) || 0), 0)
  const totalCredits = entries.reduce((s, e) => s + (Number(e.total_credit) || 0), 0)
  const postedCount = entries.filter((e) => e.status === 'posted').length
  const draftCount = entries.filter((e) => e.status === 'draft').length

  const statusBadge = (s: string) => {
    if (s === 'posted') return <Badge variant="default"><CheckCircleIcon className="h-3 w-3 mr-1"></CheckCircleIcon>Posted</Badge>
    if (s === 'draft') return <Badge variant="secondary">Draft</Badge>
    if (s === 'void') return <Badge variant="outline">Void</Badge>
    return <Badge variant="secondary">{s}</Badge>
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Journal Entries</h1>
          <p className="text-muted-foreground">Record and manage financial transactions.</p>
        </div>
        <Link href="/finance/journal/new">
          <Button><PlusIcon className="h-4 w-4 mr-2" />New Entry</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Entries" value={entries.length} />
        <StatCard label="Posted" value={postedCount} positive />
        <StatCard label="Draft" value={draftCount} warn />
        <StatCard label="Total Debit" value={fmt(totalDebits)} raw />
        <StatCard label="Total Credit" value={fmt(totalCredits)} warn raw />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['all', 'draft', 'posted', 'void'].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
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
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Entry #</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground">Description</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground text-right">Debit</th>
                  <th className="px-6 py-3 text-sm font-medium text-muted-foreground text-right">Credit</th>
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
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      No journal entries. <Link href="/finance/journal/new" className="text-primary hover:underline">Create your first entry →</Link>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3 text-sm font-mono text-primary font-medium">{entry.entry_number}</td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">
                        {entry.transaction_date ? new Date(entry.transaction_date).toLocaleDateString('id-ID') : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground max-w-xs truncate">{entry.description || '—'}</td>
                      <td className="px-6 py-3 text-sm text-right text-emerald-600 font-medium">{fmt(entry.total_debit)}</td>
                      <td className="px-6 py-3 text-sm text-right text-destructive font-medium">{fmt(entry.total_credit)}</td>
                      <td className="px-6 py-3">
                        <div className="flex gap-1">
                          {statusBadge(entry.status)}
                          {entry.reversal_of_id && <Badge variant="secondary">Reversal</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/finance/journal/${entry.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                          {entry.status === 'draft' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePost(entry.id)}
                                disabled={postingId === entry.id}
                                className="text-emerald-600 hover:text-emerald-700"
                              >
                                {postingId === entry.id ? 'Posting...' : 'Post'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(entry.id)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                Delete
                              </Button>
                            </>
                          )}
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

function StatCard({ label, value, positive, warn, raw }: { label: string; value: string | number; positive?: boolean; warn?: boolean; raw?: boolean }) {
  const val = raw ? value : typeof value === 'number' ? new Intl.NumberFormat('id-ID').format(value) : value
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${positive ? 'text-emerald-600' : warn ? 'text-amber-600' : ''}`}>{val}</p>
      </CardContent>
    </Card>
  )
}
