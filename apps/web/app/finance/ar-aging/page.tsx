"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface ARCustomer {
  id: string;
  name: string;
  invoices: {
    id: string;
    date: string;     // invoice date (YYYY-MM-DD)
    dueDate: string;  // due date
    amount: number;
    paid: number;
  }[];
}

/* ── Mock Data (tgl hari ini = 2026-04-22) ─────────────────────── */
const NOW = new Date("2026-04-22");

function diffDays(a: string, b: string) {
  return Math.max(0, Math.round((new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24)));
}

const MOCK: ARCustomer[] = [
  {
    id: "c1",
    name: "PT Maju Jaya Sentosa",
    invoices: [
      { id: "INV-1001", date: "2026-04-02", dueDate: "2026-04-12", amount: 12_500_000, paid: 0 },
      { id: "INV-1002", date: "2026-03-15", dueDate: "2026-03-30", amount: 28_000_000, paid: 5_000_000 },
    ],
  },
  {
    id: "c2",
    name: "PT Sukses Abadi",
    invoices: [
      { id: "INV-1003", date: "2026-03-01", dueDate: "2026-03-15", amount: 45_000_000, paid: 0 },
    ],
  },
  {
    id: "c3",
    name: "CV Delta Prima",
    invoices: [
      { id: "INV-1004", date: "2026-04-10", dueDate: "2026-04-20", amount: 8_500_000, paid: 8_500_000 },         // paid in full
      { id: "INV-1005", date: "2026-01-20", dueDate: "2026-02-05", amount: 15_000_000, paid: 0 },             // >90
    ],
  },
  {
    id: "c4",
    name: "PT Mitra Sejahtera",
    invoices: [
      { id: "INV-1006", date: "2026-03-20", dueDate: "2026-04-05", amount: 33_750_000, paid: 10_000_000 },
    ],
  },
  {
    id: "c5",
    name: "UD Sumber Rejeki",
    invoices: [
      { id: "INV-1007", date: "2026-04-18", dueDate: "2026-05-01", amount: 5_200_000, paid: 0 },                // belum jatuh tempo
    ],
  },
];

type BucketKey = "bucket1" | "bucket2" | "bucket3" | "bucket4" | "current" | "total";

export default function ARAgingPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      MOCK.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  /* ── hitung bucket per customer ─────────────────────────────── */
  const rows = filtered.map((c) => {
    const out: Record<Exclude<BucketKey, "total">, number> = {
      current: 0,
      bucket1: 0,
      bucket2: 0,
      bucket3: 0,
      bucket4: 0,
    };

    c.invoices.forEach((inv) => {
      const outstanding = inv.amount - inv.paid;
      if (outstanding <= 0) return;

      const daysOverdue = diffDays("2026-04-22", inv.dueDate);
      if (daysOverdue <= 0) out.current += outstanding;
      else if (daysOverdue <= 30) out.bucket1 += outstanding;
      else if (daysOverdue <= 60) out.bucket2 += outstanding;
      else if (daysOverdue <= 90) out.bucket3 += outstanding;
      else out.bucket4 += outstanding;
    });

    const total = Object.values(out).reduce((a, b) => a + b, 0);
    return { customer: c, ...out, total };
  });

  /* ── grand total per kolom ─────────────────────────────────── */
  const grand = rows.reduce<Record<BucketKey, number>>(
    (acc, r) => ({
      current: acc.current + r.current,
      bucket1: acc.bucket1 + r.bucket1,
      bucket2: acc.bucket2 + r.bucket2,
      bucket3: acc.bucket3 + r.bucket3,
      bucket4: acc.bucket4 + r.bucket4,
      total:   acc.total   + r.total,
    }),
    { current: 0, bucket1: 0, bucket2: 0, bucket3: 0, bucket4: 0, total: 0 }
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  const Row = ({ label, current, b1, b2, b3, b4, total, bold }: any) => (
    <tr className={`${bold ? "bg-gray-800 font-semibold" : "hover:bg-gray-700/40"}`}>
      <td className="px-4 py-3">{label}</td>
      <td className="px-4 py-3 text-right">{current ? fmt(current) : "-"}</td>
      <td className="px-4 py-3 text-right">{b1 ? fmt(b1) : "-"}</td>
      <td className="px-4 py-3 text-right">{b2 ? fmt(b2) : "-"}</td>
      <td className="px-4 py-3 text-right">{b3 ? fmt(b3) : "-"}</td>
      <td className="px-4 py-3 text-right text-red-400">{b4 ? fmt(b4) : "-"}</td>
      <td className="px-4 py-3 text-right font-bold">{total ? fmt(total) : "-"}</td>
    </tr>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">AR Aging</h1>
            <p className="text-gray-400 text-sm mt-1">Piutang Usaha per Customer — umur piutang</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">As of: 22 Apr 2026</span>
            <Link
              href="/finance"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              ← Kembali
            </Link>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Total Piutang", value: grand.total, cls: "text-white" },
            { label: "Current (≤0 hari)", value: grand.current, cls: "text-green-400" },
            { label: "1-30 hari", value: grand.bucket1, cls: "text-yellow-400" },
            { label: "31-60 hari", value: grand.bucket2, cls: "text-orange-400" },
            { label: "61-90 hari", value: grand.bucket3, cls: "text-red-400" },
            { label: ">90 hari", value: grand.bucket4, cls: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase font-medium">{s.label}</p>
              <p className={`text-lg font-bold mt-1 ${s.cls}`}>{fmt(s.value)}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Cari customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-80 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Table */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900/60 text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-400">Current</th>
                  <th className="px-4 py-3 text-right font-medium text-yellow-400">1 – 30</th>
                  <th className="px-4 py-3 text-right font-medium text-orange-400">31 – 60</th>
                  <th className="px-4 py-3 text-right font-medium text-red-400">61 – 90</th>
                  <th className="px-4 py-3 text-right font-medium text-red-500">&gt; 90</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Tidak ada data
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <Row
                    key={r.customer.id}
                    label={r.customer.name}
                    current={r.current}
                    b1={r.bucket1}
                    b2={r.bucket2}
                    b3={r.bucket3}
                    b4={r.bucket4}
                    total={r.total}
                    bold={false}
                  />
                ))}
                {/* Grand total */}
                <Row
                  label="GRAND TOTAL"
                  current={grand.current}
                  b1={grand.bucket1}
                  b2={grand.bucket2}
                  b3={grand.bucket3}
                  b4={grand.bucket4}
                  total={grand.total}
                  bold={true}
                />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
