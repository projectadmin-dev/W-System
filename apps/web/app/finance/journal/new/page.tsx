'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface COA {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
}

interface JournalLine {
  id: number;
  coa_id: string;
  debit_amount: string;
  credit_amount: string;
  line_description: string;
}

interface FiscalPeriod {
  id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: string;
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const [coaList, setCoaList] = useState<COA[]>([]);
  const [periods, setPeriods] = useState<FiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [transactionDate, setTransactionDate] = useState('');
  const [postingDate, setPostingDate] = useState('');
  const [description, setDescription] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([
    { id: 1, coa_id: '', debit_amount: '', credit_amount: '', line_description: '' },
    { id: 2, coa_id: '', debit_amount: '', credit_amount: '', line_description: '' },
  ]);

  useEffect(() => {
    loadData();
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    setTransactionDate(today);
    setPostingDate(today);
  }, []);

  const loadData = async () => {
    try {
      const [coaRes, periodRes] = await Promise.all([
        fetch('/api/finance/coa'),
        fetch('/api/finance/periods'),
      ]);
      const coaData = await coaRes.json();
      const periodData = await periodRes.json();
      setCoaList(coaData);
      setPeriods(periodData);
      // Default to first available period
      if (periodData.length > 0) setSelectedPeriod(periodData[0].id);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => {
    setLines([...lines, {
      id: Date.now(),
      coa_id: '',
      debit_amount: '',
      credit_amount: '',
      line_description: ''
    }]);
  };

  const removeLine = (id: number) => {
    if (lines.length <= 2) {
      setError('Minimum 2 journal lines required (PSAK double-entry)');
      return;
    }
    setLines(lines.filter(l => l.id !== id));
    setError('');
  };

  const updateLine = (id: number, field: keyof JournalLine, value: string) => {
    setLines(lines.map(l => {
      if (l.id !== id) return l;
      // If debit is entered, clear credit (and vice versa)
      if (field === 'debit_amount' && value) {
        return { ...l, [field]: value, credit_amount: '' };
      }
      if (field === 'credit_amount' && value) {
        return { ...l, [field]: value, debit_amount: '' };
      }
      return { ...l, [field]: value };
    }));
  };

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit_amount) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit_amount) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
  const allLinesValid = lines.every(l => l.coa_id && (l.debit_amount || l.credit_amount));

  const handleSubmit = async () => {
    if (!description.trim()) { setError('Description is required'); return; }
    if (!selectedPeriod) { setError('Please select a fiscal period'); return; }
    if (!isBalanced) { setError(`Journal not balanced: Debit ${formatCurrency(totalDebit)} ≠ Credit ${formatCurrency(totalCredit)}`); return; }
    if (!allLinesValid) { setError('All lines must have a COA account and an amount'); return; }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        entry_number: `JE-${Date.now()}`,
        transaction_date: transactionDate,
        posting_date: postingDate,
        description,
        reference_number: referenceNumber || null,
        fiscal_period_id: selectedPeriod,
        currency: 'IDR',
        exchange_rate: 1,
        lines: lines.map((l, idx) => ({
          coa_id: l.coa_id,
          debit_amount: Number(l.debit_amount) || 0,
          credit_amount: Number(l.credit_amount) || 0,
          line_description: l.line_description || null,
          line_number: idx + 1,
        })),
      };

      const res = await fetch('/api/finance/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || errData.error || 'Failed to create journal entry');
      }

      router.push('/finance/journal');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(amount);
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      asset: 'text-blue-400',
      liability: 'text-red-400',
      equity: 'text-purple-400',
      revenue: 'text-green-400',
      expense: 'text-yellow-400',
    };
    return colors[type] || 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/finance/journal" className="text-gray-400 hover:text-white text-sm mb-2 block">
            &larr; Back to Journal Entries
          </Link>
          <h1 className="text-3xl font-bold">New Journal Entry</h1>
          <p className="text-gray-400 mt-1">Create a new double-entry journal (PSAK compliant)</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Balance Warning/Status */}
        <div className={`mb-6 p-4 rounded-lg border ${isBalanced ? 'bg-green-900/20 border-green-700' : 'bg-yellow-900/20 border-yellow-700'}`}>
          <div className="flex justify-between items-center">
            <div className="flex gap-8">
              <div>
                <div className="text-sm text-gray-400">Total Debit</div>
                <div className="text-xl font-bold text-green-400">{formatCurrency(totalDebit)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Total Credit</div>
                <div className="text-xl font-bold text-red-400">{formatCurrency(totalCredit)}</div>
              </div>
            </div>
            <div className={`text-lg font-bold ${isBalanced ? 'text-green-400' : 'text-yellow-400'}`}>
              {isBalanced ? '✓ Balanced' : '⚠ Not Balanced'}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Transaction Date *</label>
              <input
                type="date"
                value={transactionDate}
                onChange={e => setTransactionDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Posting Date</label>
              <input
                type="date"
                value={postingDate}
                onChange={e => setPostingDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Fiscal Period *</label>
              <select
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                {periods.map(p => (
                  <option key={p.id} value={p.id}>{p.period_name} ({p.status})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Reference Number</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
                placeholder="e.g. INV-2026-001"
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Enter journal entry description..."
              rows={2}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Journal Lines */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold">Journal Lines</h3>
            <span className="text-sm text-gray-400">Minimum 2 lines required</span>
          </div>
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Account *</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Debit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Credit</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {lines.map((line, idx) => (
                <tr key={line.id} className="hover:bg-gray-750">
                  <td className="px-4 py-3 text-sm text-gray-400">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <select
                      value={line.coa_id}
                      onChange={e => updateLine(line.id, 'coa_id', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select Account...</option>
                      {coaList.map(coa => (
                        <option key={coa.id} value={coa.id}>
                          {coa.account_code} - {coa.account_name}
                        </option>
                      ))}
                    </select>
                    {line.coa_id && (
                      <div className={`text-xs mt-0.5 ml-1 ${getTypeColor(coaList.find(c => c.id === line.coa_id)?.account_type || '')}`}>
                        {coaList.find(c => c.id === line.coa_id)?.account_type} | Normal: {coaList.find(c => c.id === line.coa_id)?.normal_balance}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={line.line_description}
                      onChange={e => updateLine(line.id, 'line_description', e.target.value)}
                      placeholder="Line description..."
                      className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.debit_amount}
                      onChange={e => updateLine(line.id, 'debit_amount', e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-right text-green-400 focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.credit_amount}
                      onChange={e => updateLine(line.id, 'credit_amount', e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-1.5 text-sm text-right text-red-400 focus:border-blue-500 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => removeLine(line.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                      title="Remove line"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-900/30 border-t border-gray-700">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Totals:</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-green-400">{formatCurrency(totalDebit)}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-red-400">{formatCurrency(totalCredit)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          <div className="px-6 py-3 border-t border-gray-700">
            <button
              onClick={addLine}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1"
            >
              <span>+</span> Add Line
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || !isBalanced || !allLinesValid}
            className={`px-8 py-3 rounded-lg font-medium transition-colors ${
              isBalanced && allLinesValid
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {submitting ? 'Creating...' : 'Create Journal Entry'}
          </button>
          <Link href="/finance/journal">
            <button className="bg-gray-700 hover:bg-gray-600 px-8 py-3 rounded-lg font-medium transition-colors text-white">
              Cancel
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
