'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, PlusIcon, Trash2Icon, ScaleIcon, Loader2Icon } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { SearchableSelect } from '@/components/finance/searchable-select'
import { KATEGORI_JURNAL, SOURCE_TYPES, CURRENCIES } from '@/lib/finance/journal-constants'

interface COA {
  id: string
  account_code: string
  account_name: string
  account_type: string
  normal_balance: string
  is_active?: boolean
}

interface FiscalPeriod {
  id: string
  period_name: string
  status: string
}

interface CostCenter {
  id: string
  kode: string
  nama: string
}

interface JournalLine {
  id: number
  coa_id: string
  cost_center_value_id: string
  debit_amount: string
  credit_amount: string
  line_description: string
}

const emptyLine = (id: number): JournalLine => ({
  id,
  coa_id: '',
  cost_center_value_id: '',
  debit_amount: '',
  credit_amount: '',
  line_description: '',
})

export default function NewJournalEntryPage() {
  const router = useRouter()
  const [coaList, setCoaList] = useState<COA[]>([])
  const [periods, setPeriods] = useState<FiscalPeriod[]>([])
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const [transactionDate, setTransactionDate] = useState(today)
  const [postingDate, setPostingDate] = useState(today)
  const [description, setDescription] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [kategoriJurnal, setKategoriJurnal] = useState('REGULAR')
  const [sourceType, setSourceType] = useState('manual')
  const [currency, setCurrency] = useState('IDR')
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(1), emptyLine(2)])

  useEffect(() => {
    ;(async () => {
      try {
        const [coaRes, periodRes, ccRes] = await Promise.all([
          fetch('/api/finance/coa'),
          fetch('/api/finance/periods'),
          fetch('/api/finance/cost-centers/values').catch(() => null),
        ])
        const coaData = await coaRes.json()
        const periodData = await periodRes.json()
        setCoaList(Array.isArray(coaData) ? coaData.filter((c: COA) => c.is_active !== false) : [])
        setPeriods(Array.isArray(periodData) ? periodData : [])
        if (ccRes && ccRes.ok) {
          const ccJson = await ccRes.json()
          setCostCenters(Array.isArray(ccJson?.data) ? ccJson.data : [])
        }
        // Default to the first open period
        const open = (periodData as FiscalPeriod[]).find((p) => p.status === 'open')
        if (open) setSelectedPeriod(open.id)
        else if (periodData.length > 0) setSelectedPeriod(periodData[0].id)
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const addLine = () => setLines((p) => [...p, emptyLine(Date.now())])

  const removeLine = (id: number) => {
    if (lines.length <= 2) {
      setError('Minimal 2 baris jurnal diperlukan (double-entry PSAK)')
      return
    }
    setLines((p) => p.filter((l) => l.id !== id))
    setError('')
  }

  const updateLine = (id: number, field: keyof JournalLine, value: string) => {
    setLines((p) =>
      p.map((l) => {
        if (l.id !== id) return l
        if (field === 'debit_amount' && value) return { ...l, debit_amount: value, credit_amount: '' }
        if (field === 'credit_amount' && value) return { ...l, credit_amount: value, debit_amount: '' }
        return { ...l, [field]: value }
      }),
    )
  }

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit_amount) || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit_amount) || 0), 0)
  const difference = totalDebit - totalCredit
  const isBalanced = Math.abs(difference) < 0.01 && totalDebit > 0
  const allLinesValid = lines.every((l) => l.coa_id && (l.debit_amount || l.credit_amount))

  const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(n)

  const coaOptions = useMemo(
    () =>
      coaList.map((c) => ({
        value: c.id,
        label: `${c.account_code} — ${c.account_name}`,
        description: `${c.account_type} · normal ${c.normal_balance}`,
        keywords: `${c.account_code} ${c.account_name} ${c.account_type}`,
      })),
    [coaList],
  )
  const ccOptions = useMemo(
    () => costCenters.map((c) => ({ value: c.id, label: `${c.kode} — ${c.nama}` })),
    [costCenters],
  )
  const periodOptions = periods.map((p) => ({
    value: p.id,
    label: p.period_name,
    description: `Status: ${p.status}`,
  }))

  const handleSubmit = async () => {
    if (!description.trim()) return setError('Deskripsi wajib diisi')
    if (!selectedPeriod) return setError('Pilih periode fiskal')
    if (!kategoriJurnal) return setError('Pilih kategori jurnal')
    if (!allLinesValid) return setError('Setiap baris harus memiliki akun (COA) dan nominal')
    if (!isBalanced)
      return setError(`Jurnal tidak balance: Debit ${fmt(totalDebit)} ≠ Credit ${fmt(totalCredit)}`)

    setSubmitting(true)
    setError('')
    try {
      const payload = {
        transaction_date: transactionDate,
        posting_date: postingDate,
        description,
        reference_number: referenceNumber || null,
        fiscal_period_id: selectedPeriod,
        kategori_jurnal: kategoriJurnal,
        source_type: sourceType,
        currency,
        exchange_rate: 1,
        lines: lines.map((l, idx) => ({
          coa_id: l.coa_id,
          cost_center_value_id: l.cost_center_value_id || null,
          debit_amount: Number(l.debit_amount) || 0,
          credit_amount: Number(l.credit_amount) || 0,
          line_description: l.line_description || null,
          line_number: idx + 1,
        })),
      }
      const res = await fetch('/api/finance/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.message || d.error || 'Gagal membuat jurnal')
      }
      router.push('/finance/journal')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-muted-foreground">
        <Loader2Icon className="h-6 w-6 animate-spin" /> Memuat…
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-6">
      {/* Header */}
      <div>
        <Link
          href="/finance/journal"
          className="mb-2 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="h-4 w-4" /> Kembali ke Jurnal
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Jurnal Memorial Baru</h1>
        <p className="text-muted-foreground">Buat jurnal double-entry (PSAK compliant).</p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Balance bar */}
      <Card className={isBalanced ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex gap-8">
            <div>
              <div className="text-xs text-muted-foreground">Total Debit</div>
              <div className="text-xl font-bold tabular-nums text-emerald-600">{fmt(totalDebit)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Credit</div>
              <div className="text-xl font-bold tabular-nums text-destructive">{fmt(totalCredit)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Selisih</div>
              <div className={`text-xl font-bold tabular-nums ${isBalanced ? 'text-emerald-600' : 'text-amber-600'}`}>
                {fmt(Math.abs(difference))}
              </div>
            </div>
          </div>
          <Badge variant={isBalanced ? 'default' : 'secondary'} className="gap-1">
            <ScaleIcon className="h-3.5 w-3.5" />
            {isBalanced ? 'Balanced' : 'Belum Balance'}
          </Badge>
        </CardContent>
      </Card>

      {/* Header fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Informasi Jurnal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Tanggal Transaksi" required>
            <Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="h-9" />
          </Field>
          <Field label="Tanggal Posting" required>
            <Input type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} className="h-9" />
          </Field>
          <Field label="Periode Fiskal" required>
            <SearchableSelect
              options={periodOptions}
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
              placeholder="Pilih periode…"
              searchPlaceholder="Cari periode…"
            />
          </Field>
          <Field label="Kategori Jurnal" required>
            <SearchableSelect
              options={KATEGORI_JURNAL.map((k) => ({ value: k.value, label: k.label, description: k.description }))}
              value={kategoriJurnal}
              onValueChange={setKategoriJurnal}
              placeholder="Pilih kategori…"
              searchPlaceholder="Cari kategori…"
            />
          </Field>
          <Field label="Sumber (Source)" required>
            <SearchableSelect
              options={SOURCE_TYPES.map((s) => ({ value: s.value, label: s.label, description: s.description }))}
              value={sourceType}
              onValueChange={setSourceType}
              placeholder="Pilih sumber…"
              searchPlaceholder="Cari sumber…"
            />
          </Field>
          <Field label="Mata Uang" required>
            <SearchableSelect
              options={CURRENCIES.map((c) => ({ value: c.value, label: c.label }))}
              value={currency}
              onValueChange={setCurrency}
              placeholder="Pilih mata uang…"
              searchPlaceholder="Cari mata uang…"
            />
          </Field>
          <Field label="No. Referensi">
            <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="cth. INV-2026-001" className="h-9" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Deskripsi" required>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Keterangan jurnal…"
                rows={2}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Lines */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm">Baris Jurnal</CardTitle>
          <span className="text-xs text-muted-foreground">Minimal 2 baris · setiap baris debit ATAU kredit</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="w-10 px-3 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
                  <th className="min-w-[240px] px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Akun (COA) *</th>
                  <th className="min-w-[180px] px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Cost Center</th>
                  <th className="min-w-[160px] px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Keterangan</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Debit</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">Credit</th>
                  <th className="w-10 px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lines.map((line, idx) => (
                  <tr key={line.id} className="align-top hover:bg-muted/20">
                    <td className="px-3 py-2 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <SearchableSelect
                        options={coaOptions}
                        value={line.coa_id}
                        onValueChange={(v) => updateLine(line.id, 'coa_id', v)}
                        placeholder="Pilih akun…"
                        searchPlaceholder="Cari kode / nama akun…"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <SearchableSelect
                        options={ccOptions}
                        value={line.cost_center_value_id}
                        onValueChange={(v) => updateLine(line.id, 'cost_center_value_id', v)}
                        placeholder={ccOptions.length ? 'Pilih…' : 'Tidak tersedia'}
                        searchPlaceholder="Cari cost center…"
                        disabled={ccOptions.length === 0}
                        clearable
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={line.line_description}
                        onChange={(e) => updateLine(line.id, 'line_description', e.target.value)}
                        placeholder="Keterangan baris…"
                        className="h-9"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit_amount}
                        onChange={(e) => updateLine(line.id, 'debit_amount', e.target.value)}
                        placeholder="0.00"
                        className="h-9 text-right tabular-nums"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit_amount}
                        onChange={(e) => updateLine(line.id, 'credit_amount', e.target.value)}
                        placeholder="0.00"
                        className="h-9 text-right tabular-nums"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeLine(line.id)}
                        title="Hapus baris"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-muted/30">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right text-sm font-semibold">Total</td>
                  <td className="px-3 py-2 text-right text-sm font-bold tabular-nums text-emerald-600">{fmt(totalDebit)}</td>
                  <td className="px-3 py-2 text-right text-sm font-bold tabular-nums text-destructive">{fmt(totalCredit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="border-t p-3">
            <Button variant="ghost" size="sm" onClick={addLine} className="text-primary">
              <PlusIcon className="mr-1 h-4 w-4" /> Tambah Baris
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={submitting || !isBalanced || !allLinesValid}>
          {submitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Jurnal
        </Button>
        <Link href="/finance/journal">
          <Button variant="outline">Batal</Button>
        </Link>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}
