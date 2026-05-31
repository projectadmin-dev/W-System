'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@workspace/ui/components/card'

interface GLRow {
  id: string
  transaction_date: string
  entry_number: string
  description: string
  movement_type: 'debit' | 'credit'
  movement_amount: number
  running_balance: number
  status: string
}

interface AccountInfo {
  id: string
  account_code: string
  account_name: string
  account_type: string
  normal_balance: string
  is_active: boolean
}

const todayStr = () => new Date().toISOString().slice(0, 10)
const firstOfMonthStr = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

export default function GeneralLedgerPage() {
  const { id } = useParams<{ id: string }>()
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [lines, setLines] = useState<GLRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (!id) return
    const today = todayStr()
    const firstDay = firstOfMonthStr()
    setStartDate(firstDay)
    setEndDate(today)
    loadData(id, firstDay, today)
  }, [id])

  const loadData = async (coaId: string, sd: string, ed: string) => {
    setLoading(true)
    setError('')
    try {
      const [accRes, glRes] = await Promise.all([
        fetch(`/api/finance/coa?id=${coaId}`),
        fetch(`/api/finance/journal?coaId=${coaId}&startDate=${sd}&endDate=${ed}`),
      ])
      const acc = await accRes.json()
      const gl = await glRes.json()

      if (!accRes.ok) throw new Error(acc.error || acc.message || 'Account not found')
      setAccount(acc)

      if (Array.isArray(gl)) {
        let balance = 0
        const rows: GLRow[] = gl.map((l: any) => {
          const debit = Number(l.debit_amount || 0)
          const credit = Number(l.credit_amount || 0)
          const isDebit = debit > credit
          const amount = isDebit ? debit : credit
          balance += isDebit ? amount : -amount
          return {
            id: l.id,
            transaction_date: l.journal_entries?.transaction_date || l.created_at,
            entry_number: l.journal_entries?.entry_number || '-',
            description: l.line_description || l.journal_entries?.description || '-',
            movement_type: isDebit ? 'debit' : 'credit',
            movement_amount: amount,
            running_balance: balance,
            status: l.journal_entries?.status || 'posted',
          }
        })
        setLines(rows)
      } else {
        setLines([])
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatC = (n: number) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)
  const fmtDate = (str: string) => (str ? new Date(str).toLocaleDateString('id-ID') : '-')

  const totalDebit = lines.reduce((s, l) => s + (l.movement_type === 'debit' ? l.movement_amount : 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (l.movement_type === 'credit' ? l.movement_amount : 0), 0)
  const endingBalance = lines.length > 0 ? (lines[lines.length - 1]?.running_balance ?? 0) : 0

  return (
    <div className="coa-workspace flex flex-col gap-6 px-4 py-6 lg:px-6" style={{ background: '#f1f1f1', minHeight: '100%' }}>
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6">
          <Link href="/finance/coa" className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Chart of Account
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold" style={{ color: '#132a3f' }}>
              General Ledger
            </h1>
            {account && (
              <span className="rounded-full border px-3 py-1 font-mono text-sm" style={{ background: '#e7eef8', color: '#132a3f', borderColor: '#132a3f33' }}>
                {account.account_code}
              </span>
            )}
          </div>
          {account && (
            <p className="text-muted-foreground mt-1">
              {account.account_name} — {account.account_type} | Normal: {account.normal_balance} {account.is_active ? '' : '(Inactive)'}
            </p>
          )}
        </div>

        {error && <div className="border-destructive/30 bg-destructive/5 text-destructive mb-4 rounded-xl border px-4 py-3">{error}</div>}

        {/* Date filter */}
        <div className="mb-6 flex items-center gap-4">
          <div>
            <label className="text-muted-foreground mr-2 text-sm">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                const v = e.target.value
                setStartDate(v)
                loadData(String(id), v, endDate)
              }}
              className="border-border bg-card text-foreground rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="text-muted-foreground mr-2 text-sm">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                const v = e.target.value
                setEndDate(v)
                loadData(String(id), startDate, v)
              }}
              className="border-border bg-card text-foreground rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        {/* Table */}
        <Card className="overflow-hidden p-0" style={{ borderRadius: '1.25rem' }}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-border border-b">
                  <tr>
                    <th className="text-muted-foreground px-6 py-3 text-left text-xs font-semibold">Date</th>
                    <th className="text-muted-foreground px-6 py-3 text-left text-xs font-semibold">Entry #</th>
                    <th className="text-muted-foreground px-6 py-3 text-left text-xs font-semibold">Description</th>
                    <th className="text-muted-foreground px-6 py-3 text-right text-xs font-semibold">Debit</th>
                    <th className="text-muted-foreground px-6 py-3 text-right text-xs font-semibold">Credit</th>
                    <th className="text-muted-foreground px-6 py-3 text-right text-xs font-semibold">Balance</th>
                    <th className="text-muted-foreground px-6 py-3 text-left text-xs font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-muted-foreground px-6 py-8 text-center">
                        Loading...
                      </td>
                    </tr>
                  ) : lines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-muted-foreground px-6 py-8 text-center">
                        No transactions found for this period.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line) => (
                      <tr key={line.id} className="hover:bg-muted/50">
                        <td className="text-foreground px-6 py-3 text-sm">{fmtDate(line.transaction_date)}</td>
                        <td className="px-6 py-3 font-mono text-sm">
                          <Link href={`/finance/journal/${line.entry_number.replace('JE-', '')}`} className="text-primary hover:underline">
                            {line.entry_number}
                          </Link>
                        </td>
                        <td className="text-foreground px-6 py-3 text-sm">{line.description}</td>
                        <td className="px-6 py-3 text-right text-sm font-medium text-emerald-600">{line.movement_type === 'debit' ? formatC(line.movement_amount) : '-'}</td>
                        <td className="text-destructive px-6 py-3 text-right text-sm font-medium">{line.movement_type === 'credit' ? formatC(line.movement_amount) : '-'}</td>
                        <td className="px-6 py-3 text-right text-sm font-bold">{formatC(line.running_balance)}</td>
                        <td className="px-6 py-3">
                          <span
                            className={`rounded border px-2 py-0.5 text-xs ${
                              line.status === 'posted' ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {line.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="border-t">
                  <tr>
                    <td colSpan={3} className="text-muted-foreground px-6 py-3 text-right text-sm font-semibold">
                      Totals
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-emerald-600">{formatC(totalDebit)}</td>
                    <td className="text-destructive px-6 py-3 text-right text-sm font-bold">{formatC(totalCredit)}</td>
                    <td className="px-6 py-3 text-right text-sm font-bold">{formatC(endingBalance)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
