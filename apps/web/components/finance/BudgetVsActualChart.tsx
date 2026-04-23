'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { ExpenseSummary } from '../../../lib/repositories/finance-expenses'

function formatRupiahShort(amount: number) {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}M`
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}jt`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`
  return `${amount}`
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-sm font-semibold text-white mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2 text-gray-300">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-mono font-medium text-white">{formatRupiah(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function BudgetVsActualChart({ summary, loading }: { summary: ExpenseSummary | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="h-8 w-48 bg-gray-700 rounded animate-pulse mb-4" />
        <div className="h-64 bg-gray-700 rounded animate-pulse" />
      </div>
    )
  }

  if (!summary || summary.by_kind.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center text-gray-400">
        Tidak ada data budget untuk periode ini
      </div>
    )
  }

  const chartData = summary.by_kind.map((item) => ({
    name: item.label,
    budget: item.budget,
    actual: item.actual,
    variance: item.variance,
    variance_pct: item.variance_pct,
  }))

  // Calculate totals
  const totalBudget = summary.total_budget
  const totalActual = summary.total_actual
  const totalVariance = summary.variance
  const isOverBudget = totalVariance < 0

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Budget vs Actual</h3>
        <span className="text-sm text-gray-400">Periode: {summary.period}</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">Total Budget</div>
          <div className="text-lg font-semibold text-blue-400 font-mono">{formatRupiah(totalBudget)}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">Total Actual</div>
          <div className="text-lg font-semibold text-emerald-400 font-mono">{formatRupiah(totalActual)}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="text-xs text-gray-400 mb-1">Variance</div>
          <div className={`text-lg font-semibold font-mono ${isOverBudget ? 'text-red-400' : 'text-green-400'}`}>
            {isOverBudget ? '+' : ''}{formatRupiah(Math.abs(totalVariance))}
            <span className="text-xs ml-1">({summary.variance_pct.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={{ stroke: '#4b5563' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={{ stroke: '#4b5563' }}
              tickLine={false}
              tickFormatter={formatRupiahShort}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ color: '#9ca3af' }}
            />
            <Bar
              dataKey="budget"
              name="Budget"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="actual"
              name="Actual"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Kind breakdown table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-400 border-b border-gray-700">
            <tr>
              <th className="text-left py-2 px-3">Jenis</th>
              <th className="text-right py-2 px-3">Budget</th>
              <th className="text-right py-2 px-3">Actual</th>
              <th className="text-right py-2 px-3">Variance</th>
              <th className="text-right py-2 px-3">%</th>
              <th className="text-center py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {summary.by_kind.map((item) => {
              const isOver = item.variance < 0
              return (
                <tr key={item.kind}>
                  <td className="py-2 px-3">{item.label}</td>
                  <td className="py-2 px-3 text-right font-mono text-blue-400">{formatRupiah(item.budget)}</td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-400">{formatRupiah(item.actual)}</td>
                  <td className={`py-2 px-3 text-right font-mono ${isOver ? 'text-red-400' : 'text-green-400'}`}>
                    {isOver ? '-' : '+'}{formatRupiah(Math.abs(item.variance))}
                  </td>
                  <td className={`py-2 px-3 text-right font-mono ${isOver ? 'text-red-400' : 'text-green-400'}`}>
                    {item.variance_pct.toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-center">
                    {isOver ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/50 text-red-300 border border-red-700">
                        Over Budget
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
                        Under Budget
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
