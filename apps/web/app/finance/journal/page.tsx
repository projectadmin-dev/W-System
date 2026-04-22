'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface JournalEntry {
  id: string;
  entry_number: string;
  transaction_date: string;
  description: string;
  total_debit: number;
  total_credit: number;
  status: string;
  reversal_of_id: string | null;
  fiscal_periods?: { period_name: string } | null;
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadJournalEntries();
  }, [statusFilter]);

  const loadJournalEntries = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'all' ? '/api/finance/journal' : `/api/finance/journal?status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setEntries(data);
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error('Failed to load journal entries:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (id: string) => {
    if (!confirm('Are you sure you want to post this journal entry? Once posted, it cannot be edited (PSAK compliance).')) {
      return;
    }
    setPostingId(id);
    setError('');
    try {
      const res = await fetch(`/api/finance/journal/post?id=${id}`, { method: 'POST' });
      if (res.ok) {
        loadJournalEntries();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to post journal entry');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPostingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft journal entry?')) return;
    try {
      const res = await fetch(`/api/finance/journal?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadJournalEntries();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to delete');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const totalDebits = entries.reduce((sum, e) => sum + (Number(e.total_debit) || 0), 0);
  const totalCredits = entries.reduce((sum, e) => sum + (Number(e.total_credit) || 0), 0);
  const postedCount = entries.filter(e => e.status === 'posted').length;
  const draftCount = entries.filter(e => e.status === 'draft').length;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <Link href="/finance" className="text-gray-400 hover:text-white text-sm mb-2 block">
              &larr; Back to Finance
            </Link>
            <h1 className="text-3xl font-bold">Journal Entries</h1>
            <p className="text-gray-400 mt-1">Record and manage financial transactions</p>
          </div>
          <Link href="/finance/journal/new">
            <button className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-medium transition-colors">
              + New Entry
            </button>
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Total Entries</div>
            <div className="text-2xl font-bold text-white">{entries.length}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Posted</div>
            <div className="text-2xl font-bold text-green-400">{postedCount}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Draft</div>
            <div className="text-2xl font-bold text-yellow-400">{draftCount}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Total Debit</div>
            <div className="text-2xl font-bold text-green-400">{formatCurrency(totalDebits)}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-sm text-gray-400 mb-1">Total Credit</div>
            <div className="text-2xl font-bold text-red-400">{formatCurrency(totalCredits)}</div>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          {['all', 'draft', 'posted', 'void'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Journal Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Entry #</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Description</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Debit</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-300">Credit</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">Loading...</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    No journal entries found. <Link href="/finance/journal/new" className="text-blue-400 hover:underline">Create your first entry</Link>.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-green-400">
                      {entry.entry_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {entry.transaction_date ? new Date(entry.transaction_date).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                      {entry.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-green-400 text-right">
                      {formatCurrency(entry.total_debit)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-red-400 text-right">
                      {formatCurrency(entry.total_credit)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        entry.status === 'posted'
                          ? 'bg-green-900/30 text-green-400 border-green-700'
                          : entry.status === 'draft'
                          ? 'bg-yellow-900/30 text-yellow-400 border-yellow-700'
                          : 'bg-gray-900/30 text-gray-400 border-gray-700'
                      }`}>
                        {entry.status}
                      </span>
                      {entry.reversal_of_id && (
                        <span className="ml-2 px-2 py-0.5 rounded text-xs bg-purple-900/30 text-purple-400 border border-purple-700">
                          Reversal
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 items-center">
                        <Link href={`/finance/journal/${entry.id}`} className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                          View
                        </Link>
                        {entry.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handlePost(entry.id)}
                              disabled={postingId === entry.id}
                              className="text-green-400 hover:text-green-300 text-sm font-medium disabled:text-gray-600"
                            >
                              {postingId === entry.id ? 'Posting...' : 'Post'}
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-red-400 hover:text-red-300 text-sm font-medium"
                            >
                              Delete
                            </button>
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
      </div>
    </div>
  );
}
