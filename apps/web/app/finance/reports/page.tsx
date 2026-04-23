'use client'

import Link from 'next/link'
import {
  TrendingUpIcon,
  ScaleIcon,
  TableIcon,
  FileBarChartIcon,
} from 'lucide-react'

const reportCards = [
  {
    title: 'Profit \u0026 Loss',
    description: 'Laporkan pendapatan, biaya, \u0026 laba/rugi bersih per periode.',
    href: '/finance/reports/profit-loss',
    icon: TrendingUpIcon,
    color: 'text-emerald-600',
    border: 'border-green-500/30',
    bg: 'bg-green-500/10',
  },
  {
    title: 'Balance Sheet',
    description: 'Posisi keuangan: Aset, Kewajiban, \u0026 Ekuitas.',
    href: '/finance/reports/balance-sheet',
    icon: ScaleIcon,
    color: 'text-primary',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
  },
  {
    title: 'Trial Balance',
    description: 'Daftar saldo akun buku besar untuk verifikasi dual debit=kredit.',
    href: '/finance/reports/trial-balance',
    icon: TableIcon,
    color: 'text-purple-400',
    border: 'border-purple-500/30',
    bg: 'bg-purple-500/10',
  },
  {
    title: 'Dashboard Summary',
    description: 'Ringkasan keuangan: revenue, laba, aset, \u0026 aging overview.',
    href: '/finance/reports?type=dashboard',
    icon: FileBarChartIcon,
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
  },
]

export default function ReportsHubPage() {
  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Financial Reports</h1>
          <p className="text-muted-foreground">
            PSAK-compliant reports for period close, audit, and management review.
          </p>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {reportCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`block bg-card rounded-xl p-6 border ${card.border} hover:bg-muted/50 transition group`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${card.bg}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1 group-hover:text-blue-300 transition">
                    {card.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Compliance Note */}
        <div className="rounded-lg border border-border bg-card/50 p-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            PSAK Compliance Notes
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>
              Reports use double-entry journal data (debit = credit verified
              at posting time).
            </li>
            <li>
              P&L covers revenue/expense accounts only; Balance Sheet covers
              asset/liability/equity.
            </li>
            <li>
              Period close locks transactions — reopening requires dual approval
              per Compliance §6.1.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
