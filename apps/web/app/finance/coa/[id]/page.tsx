'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface GLRow {
  id: string;
  transaction_date: string;
  entry_number: string;
  description: string;
  movement_type: 'debit' | 'credit';
  movement_amount: number;
  running_balance: number;
  status: string;
}

interface AccountInfo {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  is_active: boolean;
}

export default function GeneralLedgerPage() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [lines, setLines] = useState<GLRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!id) return;
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    setStartDate(firstDay);
    setEndDate(today);
    loadData(id, firstDay, today);
  }, [id]);

  const loadData = async (coaId: string, sd: string, ed: string) => {
    setLoading(true);
    setError('');
    try {
      const [accRes, glRes] = await Promise.all([
        fetch(`/api/finance/coa?id=${coaId}`),
        fetch(`/api/finance/journal?coaId=${coaId}&startDate=${sd}&endDate=${ed}`),
      ]);
      const acc = await accRes.json();
      const gl = await glRes.json();

      if (!accRes.ok) throw new Error(acc.error || acc.message || 'Account not found');
      setAccount(acc);

      if (Array.isArray(gl)) {
        // Calculate running balance
        let balance = 0;
        const rows = gl.map((l: any) => {
          const debit = Number(l.debit_amount || 0);
          const credit = Number(l.credit_amount || 0);
          const isDebit = debit > credit;
          const amount = isDebit ? debit : credit;
          balance += isDebit ? amount : -amount;
          return {
            id: l.id,
            transaction_date: l.journal_entries?.transaction_date || l.created_at,
            entry_number: l.journal_entries?.entry_number || '-',
            description: l.line_description || l.journal_entries?.description || '-',
            movement_type: isDebit ? 'debit' as const : 'credit' as const,
            movement_amount: amount,
            running_balance: balance,
            status: l.journal_entries?.status || 'posted',
          };
        });
        setLines(rows);
      } else {
        setLines([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatC = (n: number) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
  const fmtDate = (str: string) => str ? new Date(str).toLocaleDateString('id-ID') : '-';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/finance/coa" className="text-gray-400 hover:text-white text-sm mb-2 block">← Back to Chart of Accounts</Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">General Ledger</h1>
            {account && (
              <span className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full text-sm border border-blue-700 font-mono">
                {account.account_code}
              </span>
            )}
          </div>
          {account && (
            <p className="text-gray-400 mt-1">{account.account_name} — {account.account_type} | Normal: {account.normal_balance} {account.is_active ? '' : '(Inactive)'}</p>
          )}
        </div>

        {error && <div className="mb-4 bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg">{error}</div>}

        {/* Date Filter */}
        <div className="mb-6 flex gap-4 items-center">
          <div>
            <label className="text-sm text-gray-400 mr-2">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={e => { const v = e.target.value; setStartDate(v); loadData(String(id), v, endDate); }}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mr-2">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={e => { const v = e.target.value; setEndDate(v); loadData(String(id), startDate, v); }}
              className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">Entry #</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">Description</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400">Debit</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400">Credit</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-400">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">Loading...</td>
                </tr>
              ) : lines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">No transactions found for this period.</td>
                </tr>
              ) : (
                lines.map((line) => (
                  <tr key={line.id} className="hover:bg-gray-750">
                    <td className="px-6 py-3 text-sm text-gray-300">{fmtDate(line.transaction_date)}</td>
                    <td className="px-6 py-3 text-sm font-mono">
                      <Link href={`/finance/journal/${line.entry_number.replace('JE-', '')}`} className="text-blue-400 hover:underline">
                        {line.entry_number}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-300">{line.description}</td>
                    <td className="px-6 py-3 text-sm text-green-400 text-right font-medium">{line.movement_type === 'debit' ? formatC(line.movement_amount) : '-'}</td>
                    <td className="px-6 py-3 text-sm text-red-400 text-right font-medium">{line.movement_type === 'credit' ? formatC(line.movement_amount) : '-'}</td>
                    <td className="px-6 py-3 text-sm font-bold text-right">{formatC(line.running_balance)}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs border ${
                        line.status === 'posted' ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-gray-700 text-gray-400 border-gray-600'
                      }`}>
                        {line.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-gray-900/30 border-t border-gray-700">
              <tr>
                <td colSpan={3} className="px-6 py-3 text-right text-sm font-semibold text-gray-400">Totals</td>
                <td className="px-6 py-3 text-right text-sm font-bold text-green-400">{formatC(lines.reduce((s, l) => s + (l.movement_type === 'debit' ? l.movement_amount : 0), 0))}</td>
                <td className="px-6 py-3 text-right text-sm font-bold text-red-400">{formatC(lines.reduce((s, l) => s + (l.movement_type === 'credit' ? l.movement_amount : 0), 0))}</td>
                <td className="px-6 py-3 text-right text-sm font-bold">{formatC(lines.length > 0 ? lines[lines.length - 1].running_balance : 0)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
