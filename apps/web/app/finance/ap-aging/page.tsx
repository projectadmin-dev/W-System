"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronDown, ChevronsUpDown, ChevronsDownUp } from "lucide-react";

interface Bill {
  id: string;
  date: string;
  dueDate: string;
  amount: number;
  paid: number;
}

interface APVendor {
  id: string;
  name: string;
  bills: Bill[];
}

/* ── Mock Data ────────────────────────────────────── */
function diffDays(a: string, b: string) {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)));
}

const MOCK: APVendor[] = [
  {
    id: "v1",
    name: "PT Sumber Supplier Indah",
    bills: [
      { id: "BILL-2001", date: "2026-04-01", dueDate: "2026-04-15", amount: 18_500_000, paid: 0 },
      { id: "BILL-2002", date: "2026-03-10", dueDate: "2026-03-25", amount: 42_000_000, paid: 20_000_000 },
    ],
  },
  {
    id: "v2",
    name: "PT Abadi Teknologi",
    bills: [
      { id: "BILL-2003", date: "2026-02-20", dueDate: "2026-03-05", amount: 28_000_000, paid: 0 },
    ],
  },
  {
    id: "v3",
    name: "CV Maju Bersama",
    bills: [
      { id: "BILL-2004", date: "2026-04-10", dueDate: "2026-04-25", amount: 7_200_000, paid: 0 },
      { id: "BILL-2005", date: "2026-03-01", dueDate: "2026-03-15", amount: 15_000_000, paid: 15_000_000 },
      { id: "BILL-2006", date: "2026-03-20", dueDate: "2026-04-05", amount: 11_500_000, paid: 0 },
    ],
  },
  {
    id: "v4",
    name: "PT Karya Mandiri",
    bills: [
      { id: "BILL-2007", date: "2026-01-15", dueDate: "2026-01-30", amount: 9_000_000, paid: 0 },
    ],
  },
  {
    id: "v5",
    name: "UD Sahabat Jaya",
    bills: [
      { id: "BILL-2008", date: "2026-04-18", dueDate: "2026-05-02", amount: 3_500_000, paid: 0 },
    ],
  },
];

type BucketKey = "bucket1" | "bucket2" | "bucket3" | "bucket4" | "current" | "total";
type Density = "comfortable" | "compact";

interface VendorRow {
  vendor: APVendor;
  current: number;
  bucket1: number;
  bucket2: number;
  bucket3: number;
  bucket4: number;
  total: number;
}

export default function APAgingPage() {
  const [search, setSearch] = useState("");
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());
  const [density, setDensity] = useState<Density>("comfortable");

  const filtered = useMemo(
    () =>
      MOCK.filter((v) =>
        v.name.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  const rows = useMemo(() => {
    return filtered.map((v) => {
      const out: Record<Exclude<BucketKey, "total">, number> = {
        current: 0,
        bucket1: 0,
        bucket2: 0,
        bucket3: 0,
        bucket4: 0,
      };

      v.bills.forEach((b) => {
        const outstanding = b.amount - b.paid;
        if (outstanding <= 0) return;

        const daysOverdue = diffDays(b.dueDate, "2026-04-22");
        if (daysOverdue <= 0) out.current += outstanding;
        else if (daysOverdue <= 30) out.bucket1 += outstanding;
        else if (daysOverdue <= 60) out.bucket2 += outstanding;
        else if (daysOverdue <= 90) out.bucket3 += outstanding;
        else out.bucket4 += outstanding;
      });

      const total = Object.values(out).reduce((a, b) => a + b, 0);
      return { vendor: v, ...out, total } as VendorRow;
    });
  }, [filtered]);

  const grand = rows.reduce<Record<BucketKey, number>>(
    (acc, r) => ({
      current: acc.current + r.current,
      bucket1: acc.bucket1 + r.bucket1,
      bucket2: acc.bucket2 + r.bucket2,
      bucket3: acc.bucket3 + r.bucket3,
      bucket4: acc.bucket4 + r.bucket4,
      total: acc.total + r.total,
    }),
    { current: 0, bucket1: 0, bucket2: 0, bucket3: 0, bucket4: 0, total: 0 }
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  const getBillingBucketColor = (daysOverdue: number): string => {
    if (daysOverdue <= 0) return "text-emerald-600";
    if (daysOverdue <= 30) return "text-amber-600";
    if (daysOverdue <= 60) return "text-orange-400";
    if (daysOverdue <= 90) return "text-destructive";
    return "text-red-500";
  };

  const getBillingBucketLabel = (daysOverdue: number): string => {
    if (daysOverdue <= 0) return "Current";
    if (daysOverdue <= 30) return "1-30 hari";
    if (daysOverdue <= 60) return "31-60 hari";
    if (daysOverdue <= 90) return "61-90 hari";
    return ">90 hari";
  };

  const toggleVendorExpand = (vendorId: string) => {
    const newExpanded = new Set(expandedVendors);
    if (newExpanded.has(vendorId)) {
      newExpanded.delete(vendorId);
    } else {
      newExpanded.add(vendorId);
    }
    setExpandedVendors(newExpanded);
  };

  const expandAll = () => {
    setExpandedVendors(new Set(rows.map((r) => r.vendor.id)));
  };

  const collapseAll = () => {
    setExpandedVendors(new Set());
  };

  const Row = ({ label, current, b1, b2, b3, b4, total, bold }: any) => (
    <tr className={`${bold ? "bg-card font-semibold" : "hover:bg-muted/40"}`}>
      <td className="px-4 py-3">{label}</td>
      <td className="px-4 py-3 text-right">{current ? fmt(current) : "-"}</td>
      <td className="px-4 py-3 text-right">{b1 ? fmt(b1) : "-"}</td>
      <td className="px-4 py-3 text-right">{b2 ? fmt(b2) : "-"}</td>
      <td className="px-4 py-3 text-right">{b3 ? fmt(b3) : "-"}</td>
      <td className="px-4 py-3 text-right text-destructive">{b4 ? fmt(b4) : "-"}</td>
      <td className="px-4 py-3 text-right font-bold">{total ? fmt(total) : "-"}</td>
    </tr>
  );

  const rowPadding = density === "compact" ? "py-2" : "py-3";
  const headerPadding = density === "compact" ? "py-2" : "py-3";

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">AP Aging</h1>
            <p className="text-muted-foreground text-sm mt-1">Hutang Usaha per Vendor — analisis umur hutang</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">As of: 22 Apr 2026</span>
            <Link
              href="/finance"
              className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
            >
              ← Kembali
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Total Hutang", value: grand.total, cls: "text-foreground" },
            { label: "Current (≤0 hari)", value: grand.current, cls: "text-emerald-600" },
            { label: "1-30 hari", value: grand.bucket1, cls: "text-amber-600" },
            { label: "31-60 hari", value: grand.bucket2, cls: "text-orange-400" },
            { label: "61-90 hari", value: grand.bucket3, cls: "text-destructive" },
            { label: ">90 hari", value: grand.bucket4, cls: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase font-medium">{s.label}</p>
              <p className={`text-lg font-bold mt-1 ${s.cls}`}>{fmt(s.value)}</p>
            </div>
          ))}
        </div>

        {/* Toolbar with Density Toggle & Expand/Collapse */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <input
            type="text"
            placeholder="Cari vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 sm:max-w-xs bg-card border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />

          <div className="flex items-center gap-2">
            {/* Density Toggle */}
            <div className="inline-flex items-center gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={() => setDensity("comfortable")}
                className={`px-3 py-2 text-sm font-medium rounded transition-all ${
                  density === "comfortable"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Comfortable spacing"
              >
                <span className="hidden sm:inline">Comfortable</span>
                <span className="sm:hidden">☰</span>
              </button>
              <button
                onClick={() => setDensity("compact")}
                className={`px-3 py-2 text-sm font-medium rounded transition-all ${
                  density === "compact"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Compact spacing"
              >
                <span className="hidden sm:inline">Compact</span>
                <span className="sm:hidden">▪</span>
              </button>
            </div>

            {/* Expand/Collapse Buttons */}
            <div className="inline-flex items-center gap-1 bg-muted rounded-lg p-1">
              <button
                onClick={expandAll}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-card rounded transition-all"
                title="Expand all"
              >
                <ChevronsUpDown size={18} />
              </button>
              <button
                onClick={collapseAll}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-card rounded transition-all"
                title="Collapse all"
              >
                <ChevronsDownUp size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Table with Drill-down */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-card border-b border-border">
                  <th className={`px-4 ${headerPadding} text-left font-medium`}>Vendor</th>
                  <th className={`px-4 ${headerPadding} text-right font-medium text-muted-foreground`}>Current</th>
                  <th className={`px-4 ${headerPadding} text-right font-medium text-amber-600`}>1 – 30</th>
                  <th className={`px-4 ${headerPadding} text-right font-medium text-orange-400`}>31 – 60</th>
                  <th className={`px-4 ${headerPadding} text-right font-medium text-destructive`}>61 – 90</th>
                  <th className={`px-4 ${headerPadding} text-right font-medium text-red-500`}>&gt; 90</th>
                  <th className={`px-4 ${headerPadding} text-right font-medium`}>Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Tidak ada data
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <>
                    <tr
                      key={r.vendor.id}
                      onClick={() => toggleVendorExpand(r.vendor.id)}
                      className="cursor-pointer hover:bg-muted/40 border-b border-border"
                    >
                      <td className={`px-4 ${rowPadding} flex items-center gap-2`}>
                        <ChevronDown
                          size={16}
                          className={`transition-transform flex-shrink-0 ${expandedVendors.has(r.vendor.id) ? "rotate-180" : ""}`}
                        />
                        <span className="font-medium">{r.vendor.name}</span>
                      </td>
                      <td className={`px-4 ${rowPadding} text-right`}>{r.current ? fmt(r.current) : "-"}</td>
                      <td className={`px-4 ${rowPadding} text-right`}>{r.bucket1 ? fmt(r.bucket1) : "-"}</td>
                      <td className={`px-4 ${rowPadding} text-right`}>{r.bucket2 ? fmt(r.bucket2) : "-"}</td>
                      <td className={`px-4 ${rowPadding} text-right`}>{r.bucket3 ? fmt(r.bucket3) : "-"}</td>
                      <td className={`px-4 ${rowPadding} text-right text-destructive`}>{r.bucket4 ? fmt(r.bucket4) : "-"}</td>
                      <td className={`px-4 ${rowPadding} text-right font-bold`}>{r.total ? fmt(r.total) : "-"}</td>
                    </tr>

                    {expandedVendors.has(r.vendor.id) &&
                      r.vendor.bills
                        .filter((bill) => bill.amount - bill.paid > 0)
                        .map((bill) => {
                          const outstanding = bill.amount - bill.paid;
                          const daysOverdue = diffDays(bill.dueDate, "2026-04-22");
                          return (
                            <tr key={`${r.vendor.id}-${bill.id}`} className="bg-muted/30 border-b border-border">
                              <td colSpan={7} className={`px-4 ${rowPadding}`}>
                                <div className="ml-8 py-1">
                                  <div className={`grid ${density === "compact" ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2" : "grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4"}`}>
                                    <div>
                                      <p className="text-xs text-muted-foreground uppercase font-medium">Bill ID</p>
                                      <p className="font-mono font-semibold text-sm">{bill.id}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground uppercase font-medium">Bill Date</p>
                                      <p className={density === "compact" ? "text-xs" : "text-sm"}>
                                        {new Date(bill.date).toLocaleDateString("id-ID")}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground uppercase font-medium">Due Date</p>
                                      <p className={density === "compact" ? "text-xs" : "text-sm"}>
                                        {new Date(bill.dueDate).toLocaleDateString("id-ID")}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground uppercase font-medium">AP Status</p>
                                      <p className={`${density === "compact" ? "text-xs" : "text-sm"} font-semibold ${getBillingBucketColor(daysOverdue)}`}>
                                        {getBillingBucketLabel(daysOverdue)}
                                      </p>
                                      {daysOverdue > 0 && (
                                        <p className="text-xs text-muted-foreground">{daysOverdue} hari overdue</p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs text-muted-foreground uppercase font-medium">Outstanding</p>
                                      <p className={`${density === "compact" ? "text-xs" : "text-sm"} font-bold`}>{fmt(outstanding)}</p>
                                      <p className="text-xs text-orange-600">Unpaid</p>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                  </>
                ))}

                {/* Grand Total */}
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
