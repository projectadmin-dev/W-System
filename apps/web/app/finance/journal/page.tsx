'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  total_debit: number;
  total_credit: number;
  is_posted: boolean;
  created_at: string;
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJournalEntries();
  }, []);

  const loadJournalEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/journal');
      const data = await res.json();
      setEntries(data);
    } catch (error) {
      console.error('Failed to load journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
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
            <h1 className="text-3xl font-bold">Journal Entries</h1>
            <p className="text-gray-400 mt-1">Record and manage financial transactions</p>
          </div>
          <button className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-medium transition-colors">
            + New Entry
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Total Entries</div>
            <div className="text-2xl font-bold text-white">{entries.length}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Posted</div>
            <div className="text-2xl font-bold text-green-400">
              {entries.filter(e => e.is_posted).length}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Draft</div>
            <div className="text-2xl font-bold text-yellow-400">
              {entries.filter(e => !e.is_posted).length}
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-blue-400">
              {formatCurrency(entries.reduce((sum, e) => sum + e.total_debit, 0))}
            </div>
          </div>
        </div>

        {/* Journal Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Entry #</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Description</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Debit</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Credit</th>
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
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    No journal entries found. Create your first entry to get started.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-green-400">{entry.entry_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {new Date(entry.entry_date).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{entry.description}</td>
                    <td className="px-6 py-4 text-sm font-medium text-green-400">
                      {formatCurrency(entry.total_debit)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-red-400">
                      {formatCurrency(entry.total_credit)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        entry.is_posted 
                          ? 'bg-green-900/30 text-green-400 border border-green-700' 
                          : 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
                      }`}>
                        {entry.is_posted ? 'Posted' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                          View
                        </button>
                        <button className="text-gray-400 hover:text-gray-300 text-sm font-medium">
                          Edit
                        </button>
                        {!entry.is_posted && (
                          <button className="text-red-400 hover:text-red-300 text-sm font-medium">
                            Delete
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
      </div>
    </div>
  );
}
