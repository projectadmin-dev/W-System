"use client";

import { useState } from "react";
import Link from "next/link";

interface CashEntry {
  id: string;
  date: string;
  account: string;
  description: string;
  debit: number;
  credit: number;
  reference: string;
  type: "in" | "out";
}

const MOCK_ENTRIES: CashEntry[] = [
  { id: "1", date: "2026-04-01", account: "Kas Kecil (10101)", description: "Saldo Awal April", debit: 5000000, credit: 0, reference: "SA-0001", type: "in" },
  { id: "2", date: "2026-04-02", account: "Bank BCA (10201)", description: "Terima pembayaran Invoice #1001", debit: 12500000, credit: 0, reference: "RV-0001", type: "in" },
  { id: "3", date: "2026-04-03", account: "Kas Kecil (10101)", description: "Biaya belanja kantor", debit: 0, credit: 750000, reference: "PV-0001", type: "out" },
  { id: "4", date: "2026-04-05", account: "Bank BCA (10201)", description: "Transfer ke Kas Kecil", debit: 0, credit: 2000000, reference: "TF-0001", type: "out" },
  {
    id: "5", date: "2026-04-07", account: "Kas Kecil (10101)", description: "Bayar biaya jasa IT", debit: 0, credit: 1200000, reference: "PV-0002", type: "out" },
  { id: "6", date: "2026-04-08", account: "Bank BCA (10201)", description: "Terima pembayaran Invoice #1002", debit: 8500000, credit: 0, reference: "RV-0002", type: "in" },
  { id: "7", date: "2026-04-10", account: "Kas Kecil (10101)", description: "Bayar transportasi", debit: 0, credit: 350000, reference: "PV-0003", type: "out" },
  { id: "8", date: "2026-04-12", account: "Bank BCA (10201)", description: "Bayar vendor ABC", debit: 0, credit: 5600000, reference: "PV-0004", type: "out" },
];

const ACCOUNTS = ["Semua", "Kas Kecil (10101)", "Bank BCA (10201)"];

export default function CashBankRegister() {
  const [activeFilter, setActiveFilter] = useState("Semua");
  const [showAdd, setShowAdd] = useState(false);

  const filtered =
    activeFilter === "Semua"
      ? MOCK_ENTRIES
      : MOCK_ENTRIES.filter((e) => e.account === activeFilter);

  const runningBalance = filtered.reduce((bal, e) => {
    const balance = bal.at(-1) || 0;
    return [...bal, balance + e.debit - e.credit];
  }, [] as number[]);

  const totalDebit = filtered.reduce((s, e) => s + e.debit, 0);
  const totalCredit = filtered.reduce((s, e) => s + e.credit, 0);
  const saldoAkhir = totalDebit - totalCredit;

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cash / Bank Register</h1>
            <p className="text-gray-400 text-sm mt-1">Tracking uang masuk &amp; keluar harian per rekening</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              {showAdd ? "Tutup Form" : "+ Tambah Entry"}
            </button>
            <Link
              href="/finance"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              ← Kembali
            </Link>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
            <p className="text-green-400 text-xs font-medium uppercase">Total Masuk</p>
            <p className="text-xl font-bold mt-1">{fmt(totalDebit)}</p>
          </div>
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <p className="text-red-400 text-xs font-medium uppercase">Total Keluar</p>
            <p className="text-xl font-bold mt-1">{fmt(totalCredit)}</p>
          </div>
          <div className="bg-cyan-900/30 border border-cyan-700 rounded-lg p-4 md:col-span-2">
            <p className="text-cyan-400 text-xs font-medium uppercase">Saldo Akhir</p>
            <p className={`text-2xl font-bold mt-1 ${saldoAkhir >= 0 ? "text-cyan-400" : "text-red-400"}`}>
              {fmt(saldoAkhir)}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          {ACCOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => setActiveFilter(a)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                activeFilter === a
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500"
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Add entry form */}
        {showAdd && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-6">
            <h2 className="text-lg font-semibold mb-4">Tambah Entry Baru</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tanggal</label>
                <input type="date" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Rekening / Akun</label>
                <select className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                  <option>Kas Kecil (10101)</option>
                  <option>Bank BCA (10201)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tipe</label>
                <select className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500">
                  <option value="in">Cash In (Masuk)</option>
                  <option value="out">Cash Out (Keluar)</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Deskripsi</label>
                <input type="text" placeholder="e.g. Bayar vendor ABC" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nominal</label>
                <input type="number" placeholder="0" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
                Simpan
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900/50 text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Tanggal</th>
                  <th className="px-4 py-3 text-left font-medium">Rekening</th>
                  <th className="px-4 py-3 text-left font-medium">No. Ref</th>
                  <th className="px-4 py-3 text-left font-medium">Deskripsi</th>
                  <th className="px-4 py-3 text-right font-medium text-green-400">Debit (Masuk)</th>
                  <th className="px-4 py-3 text-right font-medium text-red-400">Credit (Keluar)</th>
                  <th className="px-4 py-3 text-right font-medium">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Tidak ada transaksi
                    </td>
                  </tr>
                )}
                {filtered.map((entry, idx) => {
                  const balance = runningBalance[idx];
                  return (
                    <tr key={entry.id} className="hover:bg-gray-700/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{entry.date}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{entry.account}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-400">{entry.reference}</td>
                      <td className="px-4 py-3">{entry.description}</td>
                      <td className="px-4 py-3 text-right text-green-400">
                        {entry.debit ? fmt(entry.debit) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {entry.credit ? fmt(entry.credit) : "-"}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${balance >= 0 ? "text-cyan-400" : "text-red-400"}`}>
                        {fmt(balance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
