'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2Icon, TrendingUpIcon, TrendingDownIcon, MinusIcon,
  WalletIcon, ArrowDownLeftIcon, ArrowUpRightIcon, RefreshCwIcon,
  PrinterIcon, DownloadIcon, InfoIcon, BarChart3Icon, PieChartIcon,
  DropletsIcon, ChevronDownIcon, ChevronUpIcon, ArrowRightLeftIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@workspace/ui/components/table'
import { Skeleton } from '@workspace/ui/components/skeleton'

interface CFLine {
  account: string
  code: string
  amount: number
  flow: 'inflow' | 'outflow'
}

interface CFData {
  meta: { method: string; startDate: string; endDate: string; generatedAt: string }
  summary: {
    netIncome: number; operatingCF: number; investingCF: number
    financingCF: number; netChange: number; beginningCashBalance: number
    endingCashBalance: number
  }
  operating: { label: string; labelEn: string; total: number; items: CFLine[]; detail: Record<string, number> }
  investing: { label: string; labelEn: string; total: number; items: CFLine[]; detail: Record<string, number> }
  financing: { label: string; labelEn: string; total: number; items: CFLine[]; detail: Record<string, number> }
  nonCashAdjustments: { account: string; code: string; amount: number }[]
}

const methodLabels = {
  indirect: { title: 'Indirect Method', subtitle: 'Arus Kas dari Laba Bersih + Penyesuaian' },
  direct: { title: 'Direct Method', subtitle: 'Arus Kas dari Penerimaan & Pembayaran Kas' },
}

function fmt(v: number, sign = false) {
  const abs = new Intl.NumberFormat('id-ID', { style: 'decimal', maximumFractionDigits: 0 }).format(Math.abs(v))
  if (sign && v !== 0) return v > 0 ? `+${abs}` : `-${abs}`
  return v < 0 ? `-${abs}` : abs
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(v)
}

function InfoCard({ icon: Icon, label, value, sub, positive, negative }:
  { icon: any; label: string; value: number; sub?: string; positive?: boolean; negative?: boolean }) {
  const color = positive ? 'text-emerald-600' : negative ? 'text-red-600' : 'text-slate-700'
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{fmtCurrency(value)}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
      {/* Decorative bottom bar */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${positive ? 'bg-emerald-500' : negative ? 'bg-red-500' : 'bg-primary'}`} />
    </Card>
  )
}

function CFSection({ title, titleEn, total, items, detail, icon: Icon, colorClass }: {
  title: string; titleEn: string; total: number; items: CFLine[]
  detail: Record<string, number>; icon: any; colorClass: string
}) {
  const [expanded, setExpanded] = useState(true)
  const isPositive = total >= 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClass}`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <p className="text-xs text-muted-foreground">{titleEn}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-lg font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {fmtCurrency(total)}
            </span>
            <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-muted rounded">
              {expanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {/* Detail breakdown */}
          <div className="space-y-1 mb-3">
            {Object.entries(detail).filter(([, v]) => v > 0).map(([key, val]) => (
              <div key={key} className="flex justify-between text-xs py-1 border-b border-muted/50 last:border-0">
                <span className="capitalize text-muted-foreground">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="font-medium">{fmtCurrency(val)}</span>
              </div>
            ))}
          </div>

          {/* Line items */}
          {items.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <tr className="bg-muted/50">
                    <TableHead className="text-xs">Code</TableHead>
                    <TableHead className="text-xs">Account</TableHead>
                    <TableHead className="text-xs text-right">Inflow</TableHead>
                    <TableHead className="text-xs text-right">Outflow</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {items.slice(0, 10).map((item, i) => (
                    <tr key={i} className="text-xs">
                      <TableCell className="font-mono text-muted-foreground">{item.code}</TableCell>
                      <TableCell>{item.account}</TableCell>
                      <TableCell className="text-right text-emerald-600">
                        {item.flow === 'inflow' ? fmtCurrency(item.amount) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {item.flow === 'outflow' ? fmtCurrency(item.amount) : '—'}
                      </TableCell>
                    </tr>
                  ))}
                  {items.length > 10 && (
                    <tr>
                      <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-2">
                        +{items.length - 10} more items...
                      </TableCell>
                    </tr>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function NetChangeBadge({ value }: { value: number }) {
  if (value > 0) return <Badge className="bg-emerald-100 text-emerald-700 gap-1"><TrendingUpIcon className="w-3 h-3" /> Positive Net Cash Flow</Badge>
  if (value < 0) return <Badge className="bg-red-100 text-red-700 gap-1"><TrendingDownIcon className="w-3 h-3" /> Negative Net Cash Flow</Badge>
  return <Badge variant="outline" className="gap-1"><MinusIcon className="w-3 h-3" /> No Change</Badge>
}

export default function CashFlowStatementPage() {
  const [data, setData] = useState<CFData | null>(null)
  const [loading, setLoading] = useState(true)
  const [method, setMethod] = useState<'indirect' | 'direct'>('indirect')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); return d.toISOString().split('T')[0]
  })

  useEffect(() => { loadData() }, [method, startDate, endDate])

  async function loadData() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        method,
        startDate,
        endDate,
      })
      const res = await fetch(`/api/finance/reports/cash-flow-statement?${params}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json)
    } catch {
      toast.error('Gagal memuat Cash Flow Statement')
    } finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <DropletsIcon className="w-6 h-6 text-blue-600" />
            Cash Flow Statement
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Laporan Arus Kas — PSAK/IFRS Compliant ({methodLabels[method].title})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}><PrinterIcon className="w-4 h-4 mr-1" /> Print</Button>
          <Button variant="outline" size="sm"><DownloadIcon className="w-4 h-4 mr-1" /> Export</Button>
          <Button variant="ghost" size="icon" onClick={loadData} disabled={loading}>
            <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Method Toggle + Period */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Method</label>
          <Tabs value={method} onValueChange={(v) => setMethod(v as 'indirect' | 'direct')} className="w-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="indirect">Indirect</TabsTrigger>
              <TabsTrigger value="direct">Direct</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="flex h-9 w-auto rounded-md border border-input bg-background px-3 py-1 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="flex h-9 w-auto rounded-md border border-input bg-background px-3 py-1 text-sm" />
        </div>
      </div>

      {/* Method explanation badge */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
        <InfoIcon className="w-4 h-4 text-blue-600 shrink-0" />
        <p className="text-xs text-blue-700">
          <strong>Indirect Method:</strong> {methodLabels.indirect.subtitle}<br />
          <strong>Direct Method:</strong> {methodLabels.direct.subtitle}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : data ? (
        <>
          {/* ── Summary Grid Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <InfoCard
              icon={TrendingUpIcon} label="Operating Cash Flow"
              value={data.summary.operatingCF} sub="Arus Kas Operasi"
              positive={data.summary.operatingCF >= 0} negative={data.summary.operatingCF < 0}
            />
            <InfoCard
              icon={ArrowRightLeftIcon} label="Investing Cash Flow"
              value={data.summary.investingCF} sub="Arus Kas Investasi"
              positive={data.summary.investingCF >= 0} negative={data.summary.investingCF < 0}
            />
            <InfoCard
              icon={WalletIcon} label="Financing Cash Flow"
              value={data.summary.financingCF} sub="Arus Kas Pendanaan"
              positive={data.summary.financingCF >= 0} negative={data.summary.financingCF < 0}
            />
            <InfoCard
              icon={data.summary.netChange >= 0 ? TrendingUpIcon : TrendingDownIcon}
              label="Net Change in Cash"
              value={data.summary.netChange} sub="Perubahan Bersih Kas"
              positive={data.summary.netChange >= 0} negative={data.summary.netChange < 0}
            />
          </div>

          {/* ── Net Income & Net Change Summary ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Net Income</p>
                  <p className="text-lg font-bold text-slate-800">{fmtCurrency(data.summary.netIncome)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Laba Bersih Periode Ini</p>
                </div>
                <BarChart3Icon className="w-8 h-8 text-slate-400" />
              </CardContent>
            </Card>
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Beginning Cash</p>
                  <p className="text-lg font-bold text-slate-800">{fmtCurrency(data.summary.beginningCashBalance)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Saldo Kas Awal</p>
                </div>
                <ArrowDownLeftIcon className="w-8 h-8 text-slate-400" />
              </CardContent>
            </Card>
            <Card className={`${data.summary.netChange >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Ending Cash</p>
                  <p className={`text-lg font-bold ${data.summary.netChange >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {fmtCurrency(data.summary.endingCashBalance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Saldo Kas Akhir &nbsp;<NetChangeBadge value={data.summary.netChange} />
                  </p>
                </div>
                <ArrowUpRightIcon className={`w-8 h-8 ${data.summary.netChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
              </CardContent>
            </Card>
          </div>

          {/* ── Cash Flow Sections ── */}
          <div className="space-y-4">
            <CFSection
              title={data.operating.label} titleEn={data.operating.labelEn}
              total={data.operating.total} items={data.operating.items}
              detail={data.operating.detail} icon={TrendingUpIcon}
              colorClass="bg-blue-500"
            />
            <CFSection
              title={data.investing.label} titleEn={data.investing.labelEn}
              total={data.investing.total} items={data.investing.items}
              detail={data.investing.detail} icon={PieChartIcon}
              colorClass="bg-purple-500"
            />
            <CFSection
              title={data.financing.label} titleEn={data.financing.labelEn}
              total={data.financing.total} items={data.financing.items}
              detail={data.financing.detail} icon={WalletIcon}
              colorClass="bg-amber-500"
            />
          </div>

          {/* ── Non-Cash Adjustments ── */}
          {data.nonCashAdjustments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Non-Cash Adjustments (Pos Non-Kas)</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {data.nonCashAdjustments.map((adj, i) => (
                    <div key={i} className="flex justify-between text-sm py-1 border-b border-muted/50 last:border-0">
                      <span>{adj.account}</span>
                      <span className="font-medium text-muted-foreground">{fmtCurrency(adj.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Footer info ── */}
          <div className="text-center text-xs text-muted-foreground">
            <p>Generated: {new Date(data.meta.generatedAt).toLocaleString('id-ID')}</p>
            <p>Period: {data.meta.startDate} to {data.meta.endDate}</p>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Tidak ada data untuk periode ini. Pastikan journal entries sudah di-post.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
