'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  PrinterIcon,
  ArrowLeftIcon,
  MailIcon,
  Building2Icon,
  CalendarIcon,
  ReceiptIcon,
  UserIcon,
} from 'lucide-react'

interface ReceiptDetail {
  id: string
  receipt_number: string
  receipt_date: string
  customer: { customer_name: string; address?: string; phone?: string } | null
  customer_name?: string
  amount: number
  payment_method: { method_name: string } | null
  reference_number?: string
  notes?: string
  status: string
  created_at: string
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function terbilang(amount: number): string {
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas']
  const num = Math.floor(amount)

  if (num < 12) return satuan[num]
  if (num < 20) return satuan[num - 10] + ' Belas'
  if (num < 100) return satuan[Math.floor(num / 10)] + ' Puluh ' + satuan[num % 10]
  if (num < 200) return 'Seratus ' + terbilang(num - 100)
  if (num < 1000) return satuan[Math.floor(num / 100)] + ' Ratus ' + terbilang(num % 100)
  if (num < 2000) return 'Seribu ' + terbilang(num - 1000)
  if (num < 1000000) return terbilang(Math.floor(num / 1000)) + ' Ribu ' + terbilang(num % 1000)
  if (num < 1000000000) return terbilang(Math.floor(num / 1000000)) + ' Juta ' + terbilang(num % 1000000)
  return terbilang(Math.floor(num / 1000000000)) + ' Miliar ' + terbilang(num % 1000000000)
}

function formatDateLong(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function BKMPrintPage() {
  const params = useParams()
  const id = params?.id as string
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    fetchReceipt()
  }, [id])

  const fetchReceipt = async () => {
    try {
      const res = await fetch(`/api/finance/receipts/${id}`)
      const json = await res.json()
      if (!json.data) throw new Error('Receipt not found')
      setReceipt(json.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleSendEmail = async () => {
    try {
      const res = await fetch(`/api/finance/receipts/${id}/send`, { method: 'POST' })
      if (res.ok) {
        alert('Receipt sent successfully')
      } else {
        alert('Failed to send receipt')
      }
    } catch {
      alert('Failed to send receipt')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-red-500">{error || 'Receipt not found'}</div>
      </div>
    )
  }

  const customerName = receipt.customer?.customer_name || receipt.customer_name || 'Unknown'
  const customerAddress = receipt.customer?.address || '-'
  const methodName = receipt.payment_method?.method_name || 'Bank Transfer'

  return (
    <div className="min-h-screen bg-muted">
      {/* Toolbar - hidden on print */}
      <div className="bg-white border-b border-border px-6 py-3 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link
            href="/finance/receipts"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Kembali
          </Link>
          <span className="text-foreground">|</span>
          <h1 className="font-semibold text-foreground">Print BKM View</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSendEmail}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-foreground rounded-lg text-sm font-medium transition-colors"
          >
            <MailIcon className="w-4 h-4" />
            Kirim Email
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-muted text-foreground rounded-lg text-sm font-medium transition-colors"
          >
            <PrinterIcon className="w-4 h-4" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* BKM Document */}
      <div className="max-w-3xl mx-auto bg-white shadow-lg my-8">
        {/* Header */}
        <div className="border-b-2 border-gray-800 p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-background rounded-lg flex items-center justify-center">
                <Building2Icon className="w-8 h-8 text-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">PT WIT Teknologi Indonesia</h1>
                <p className="text-sm text-muted-foreground">Jl. Sudirman No. 123, Jakarta Selatan</p>
                <p className="text-sm text-muted-foreground">NPWP: 09.123.456.7-123.000</p>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block border-2 border-gray-800 px-6 py-2">
                <h2 className="text-lg font-bold text-foreground">BUKTI KAS MASUK</h2>
                <p className="text-sm text-muted-foreground">(BKM)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-8 p-8">
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Diterima Dari</p>
              <p className="font-semibold text-foreground">{customerName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Alamat</p>
              <p className="text-sm text-foreground">{customerAddress}</p>
            </div>
          </div>
          <div className="space-y-3 text-right">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Nomor BKM</p>
              <p className="font-mono font-semibold text-foreground">{receipt.receipt_number}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Tanggal</p>
              <p className="text-sm text-foreground">{formatDateLong(receipt.receipt_date)}</p>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="px-8">
          <div className="bg-gray-50 border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Jumlah</p>
                <p className="text-3xl font-bold text-foreground font-mono">{formatRupiah(receipt.amount)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Metode Pembayaran</p>
                <p className="text-sm font-medium text-foreground">{methodName}</p>
                {receipt.reference_number && (
                  <p className="text-xs text-muted-foreground mt-0.5">Ref: {receipt.reference_number}</p>
                )}
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Terbilang</p>
              <p className="text-sm font-medium text-foreground italic">
                {terbilang(receipt.amount)} Rupiah
              </p>
            </div>
          </div>
        </div>

        {/* Details */}
        {receipt.notes && (
          <div className="px-8 pt-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Keterangan</p>
            <p className="text-sm text-foreground">{receipt.notes}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="p-8 mt-8">
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-8">Dibuat Oleh,</p>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-sm font-medium text-foreground">Finance Staff</p>
                <p className="text-xs text-muted-foreground">Staff Keuangan</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-8">Disetujui Oleh,</p>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-sm font-medium text-foreground">Arie Anggono</p>
                <p className="text-xs text-muted-foreground">CFO</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-8">Diterima Oleh,</p>
              <div className="border-t border-gray-400 pt-2">
                <p className="text-sm font-medium text-foreground">{customerName}</p>
                <p className="text-xs text-muted-foreground">Customer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Dokumen ini sah tanpa tanda tangan basah jika telah diproses melalui sistem W.System
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dicetak pada {new Date().toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .max-w-3xl {
            max-width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  )
}
