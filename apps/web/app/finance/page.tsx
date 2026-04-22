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
          {/* COA */}
          <Link href="/finance/coa" className="block">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors">
              <h2 className="text-xl font-semibold mb-2">Chart of Accounts</h2>
              <p className="text-gray-400 text-sm">Manage account structure (add, edit, activate)</p>
              <div className="mt-4 text-blue-400 text-sm font-medium">Manage COA →</div>
            </div>
          </Link>
          <Link href="/finance/journal" className="block">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-colors">
              <h2 className="text-xl font-semibold mb-2">Journal Entries</h2>
              <p className="text-gray-400 text-sm">Double-entry bookkeeping — create, post, reverse</p>
              <div className="mt-4 text-green-400 text-sm font-medium">Manage Journals →</div>
            </div>
          </Link>
          <Link href="/finance/periods" className="block">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors">
              <h2 className="text-xl font-semibold mb-2">Fiscal Periods</h2>
              <p className="text-gray-400 text-sm">Configure accounting periods</p>
              <div className="mt-4 text-purple-400 text-sm font-medium">Manage Periods →</div>
            </div>
          </Link>
        </div>

        {/* Operational */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Operational Daily</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/finance/cash-register" className="block">
              <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-cyan-500 transition-colors">
                <h4 className="font-semibold mb-2">Cash / Bank Register</h4>
                <p className="text-sm text-gray-400">Tracking uang masuk & keluar harian + saldo</p>
                <div className="mt-3 text-cyan-400 text-sm font-medium">View →</div>
              </div>
            </Link>
            <Link href="/finance/ar-aging" className="block">
              <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-green-500 transition-colors">
                <h4 className="font-semibold mb-2">AR Aging (Piutang)</h4>
                <p className="text-sm text-gray-400">Umur piutang per customer (1-30 / 31-60 / 61-90 / >90)</p>
                <div className="mt-3 text-green-400 text-sm font-medium">View →</div>
              </div>
            </Link>
            <Link href="/finance/ap-aging" className="block">
              <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-red-500 transition-colors">
                <h4 className="font-semibold mb-2">AP Aging (Hutang)</h4>
                <p className="text-sm text-gray-400">Umur hutang per vendor — analisis pembayaran</p>
                <div className="mt-3 text-red-400 text-sm font-medium">View →</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Reports */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Financial Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/finance/reports/trial-balance" className="block">
              <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-yellow-500 transition-colors">
                <h4 className="font-semibold mb-2">Trial Balance</h4>
                <p className="text-sm text-gray-400">Saldo akun + cek balance debit/credit + Export CSV</p>
                <div className="mt-3 text-yellow-400 text-sm font-medium">View →</div>
              </div>
            </Link>
            <Link href="/finance/reports/income-statement" className="block">
              <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-orange-500 transition-colors">
                <h4 className="font-semibold mb-2">Income Statement</h4>
                <p className="text-sm text-gray-400">Laporan Laba Rugi — revenue vs expenses + Export CSV</p>
                <div className="mt-3 text-orange-400 text-sm font-medium">View →</div>
              </div>
            </Link>
            <Link href="/finance/reports/balance-sheet" className="block">
              <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-cyan-500 transition-colors">
                <h4 className="font-semibold mb-2">Balance Sheet</h4>
                <p className="text-sm text-gray-400">Neraca — Assets, Liabilities, Equity + Export CSV</p>
                <div className="mt-3 text-cyan-400 text-sm font-medium">View →</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
