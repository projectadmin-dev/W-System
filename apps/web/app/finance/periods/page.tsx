'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface FiscalPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  period_type: 'monthly' | 'quarterly' | 'annual';
  is_active: boolean;
  is_closed: boolean;
  created_at: string;
}

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState<FiscalPeriod | null>(null);

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    setLoading(true);
    try {
      const [allRes, currentRes] = await Promise.all([
        fetch('/api/finance/periods'),
        fetch('/api/finance/periods?current=true'),
      ]);
      const allData = await allRes.json();
      const currentData = await currentRes.json();
      setPeriods(allData);
      setCurrentPeriod(currentData);
    } catch (error) {
      console.error('Failed to load fiscal periods:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annual: 'Annual',
    };
    return labels[type] || type;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <Link href="/finance" className="text-gray-400 hover:text-white text-sm mb-2 block">
              ← Back to Finance
            </Link>
            <h1 className="text-3xl font-bold">Fiscal Periods</h1>
            <p className="text-gray-400 mt-1">Manage accounting periods and fiscal years</p>
          </div>
          <button className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-medium transition-colors">
            + New Period
          </button>
        </div>

        {/* Current Period Highlight */}
        {currentPeriod && (
          <div className="mb-6 bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg p-6 border border-purple-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-purple-300 mb-1">Current Working Period</div>
                <div className="text-2xl font-bold text-white">{currentPeriod.period_name}</div>
                <div className="text-gray-400 mt-1">
                  {formatDate(currentPeriod.start_date)} - {formatDate(currentPeriod.end_date)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">Period Type</div>
                <div className="text-xl font-bold text-purple-400">
                  {getTypeLabel(currentPeriod.period_type)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Periods Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Period Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Start Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">End Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Duration</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : periods.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    No fiscal periods configured. Create your first period to get started.
                  </td>
                </tr>
              ) : (
                periods.map((period) => (
                  <tr key={period.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-white">{period.period_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {formatDate(period.start_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {formatDate(period.end_date)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-900/30 text-purple-400 border border-purple-700">
                        {getTypeLabel(period.period_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {Math.ceil((new Date(period.end_date).getTime() - new Date(period.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap">
                        {period.is_active && !period.is_closed && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-700">
                            Active
                          </span>
                        )}
                        {period.is_closed && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-400 border border-gray-600">
                            Closed
                          </span>
                        )}
                        {!period.is_active && !period.is_closed && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-700">
                            Inactive
                          </span>
                        )}
                        {period === currentPeriod && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-900/30 text-purple-400 border border-purple-700">
                            Current
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                          Edit
                        </button>
                        {!period.is_closed && (
                          <button className="text-red-400 hover:text-red-300 text-sm font-medium">
                            Delete
                          </button>
                        )}
                        {!period.is_closed && (
                          <button className="text-yellow-400 hover:text-yellow-300 text-sm font-medium">
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Quick Info */}
        <div className="mt-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Fiscal Period Guidelines</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-400">
            <div>
              <div className="text-white font-medium mb-1">Monthly Periods</div>
              12 periods per fiscal year, typically aligned with calendar months
            </div>
            <div>
              <div className="text-white font-medium mb-1">Quarterly Periods</div>
              4 periods per fiscal year, Q1-Q4
            </div>
            <div>
              <div className="text-white font-medium mb-1">Annual Periods</div>
              Full fiscal year, used for annual reporting
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
