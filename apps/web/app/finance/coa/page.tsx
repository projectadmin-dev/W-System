'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface COA {
  id: string;
  code: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id: string | null;
  description: string | null;
  is_active: boolean;
}

export default function COAPage() {
  const [coaList, setCoaList] = useState<COA[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadCOA();
  }, [filterType]);

  const loadCOA = async () => {
    setLoading(true);
    try {
      const url = filterType === 'all' 
        ? '/api/finance/coa' 
        : `/api/finance/coa?type=${filterType}`;
      const res = await fetch(url);
      const data = await res.json();
      setCoaList(data);
    } catch (error) {
      console.error('Failed to load COA:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      asset: 'text-blue-400 bg-blue-900/30 border-blue-700',
      liability: 'text-red-400 bg-red-900/30 border-red-700',
      equity: 'text-purple-400 bg-purple-900/30 border-purple-700',
      revenue: 'text-green-400 bg-green-900/30 border-green-700',
      expense: 'text-yellow-400 bg-yellow-900/30 border-yellow-700',
    };
    return colors[type] || 'text-gray-400 bg-gray-900/30 border-gray-700';
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
            <h1 className="text-3xl font-bold">Chart of Accounts</h1>
            <p className="text-gray-400 mt-1">Manage your account structure</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors">
            + Add Account
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {['all', 'asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                filterType === type
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* COA Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Code</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Account Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Description</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : coaList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No accounts found
                  </td>
                </tr>
              ) : (
                coaList.map((coa) => (
                  <tr key={coa.id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-blue-400">{coa.code}</td>
                    <td className="px-6 py-4 text-sm font-medium">{coa.account_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getTypeColor(coa.account_type)}`}>
                        {coa.account_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">
                      {coa.description || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        coa.is_active 
                          ? 'bg-green-900/30 text-green-400 border border-green-700' 
                          : 'bg-gray-700 text-gray-400 border border-gray-600'
                      }`}>
                        {coa.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                          Edit
                        </button>
                        <button className="text-red-400 hover:text-red-300 text-sm font-medium">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="mt-6 grid grid-cols-5 gap-4">
          {['asset', 'liability', 'equity', 'revenue', 'expense'].map((type) => (
            <div key={type} className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
              <div className="text-2xl font-bold text-gray-300">
                {coaList.filter(c => c.account_type === type).length}
              </div>
              <div className="text-sm text-gray-400 capitalize">{type}s</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
