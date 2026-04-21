import Link from 'next/link';

export default function FinanceDashboard() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Finance Module</h1>
          <p className="text-gray-400">W.System Financial Management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* COA Card */}
          <Link href="/finance/coa" className="block">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Chart of Accounts</h2>
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 36v-3m-3 3h.01M9 17h.01M9 21h.01M9 13h.01M9 9h.01M9 5h.01M9 1h.01M15 1h.01M15 5h.01M15 9h.01M15 13h.01M15 17h.01M15 21h.01M15 25h.01M15 29h.01" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">
                Manage your chart of accounts - assets, liabilities, equity, revenue, and expenses.
              </p>
              <div className="mt-4 text-blue-400 text-sm font-medium">
                Manage COA →
              </div>
            </div>
          </Link>

          {/* Journal Entries Card */}
          <Link href="/finance/journal" className="block">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Journal Entries</h2>
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">
                Record and manage financial transactions with double-entry bookkeeping.
              </p>
              <div className="mt-4 text-green-400 text-sm font-medium">
                Manage Journals →
              </div>
            </div>
          </Link>

          {/* Fiscal Periods Card */}
          <Link href="/finance/periods" className="block">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Fiscal Periods</h2>
                <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">
                Configure fiscal years and accounting periods for financial reporting.
              </p>
              <div className="mt-4 text-purple-400 text-sm font-medium">
                Manage Periods →
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">-</div>
              <div className="text-sm text-gray-400">Total Accounts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">-</div>
              <div className="text-sm text-gray-400">Journal Entries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">-</div>
              <div className="text-sm text-gray-400">Active Periods</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">-</div>
              <div className="text-sm text-gray-400">Current Period</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
