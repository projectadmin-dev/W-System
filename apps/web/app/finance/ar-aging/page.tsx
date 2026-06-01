"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ChevronsUpDown, ChevronsDownUp } from "lucide-react";

interface Invoice {
  invoice_number: string;
  issue_date?: string;
  due_date: string;
  amount: number;
  days_overdue: number;
  status: string;
  client_id: string;
}

interface ClientInvoices {
  client_id: string;
  client_name: string;
  invoices: Invoice[];
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_91_180: number;
  over_180: number;
  total: number;
}

interface ARAgingData {
  data: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    days_91_180: number;
    over_180: number;
    total: number;
    clients: ClientInvoices[];
  };
}

type BucketKey = "days_1_30" | "days_31_60" | "days_61_90" | "days_91_180" | "over_180" | "current" | "total";
type Density = "comfortable" | "compact";

export default function ARAgingPage() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ClientInvoices[]>([]);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [density, setDensity] = useState<Density>("comfortable");
  const [asOfDate, setAsOfDate] = useState(new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "2-digit" }));

  useEffect(() => {
    const fetchARAgingData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/finance/ar-aging");
        if (!response.ok) {
          throw new Error(`Failed to fetch AR Aging data: ${response.statusText}`);
        }
        const result: ARAgingData = await response.json();
        setData(result.data.clients);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("Error fetching AR Aging data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchARAgingData();
  }, []);

  const filtered = useMemo(
    () =>
      data.filter((c) =>
        c.client_name.toLowerCase().includes(search.toLowerCase())
      ),
    [data, search]
  );

  const grand = filtered.reduce<Record<BucketKey, number>>(
    (acc, r) => ({
      current: acc.current + r.current,
      days_1_30: acc.days_1_30 + r.days_1_30,
      days_31_60: acc.days_31_60 + r.days_31_60,
      days_61_90: acc.days_61_90 + r.days_61_90,
      days_91_180: acc.days_91_180 + r.days_91_180,
      over_180: acc.over_180 + r.over_180,
      total: acc.total + r.total,
    }),
    { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_91_180: 0, over_180: 0, total: 0 }
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  const getAgingBucketColor = (daysOverdue: number): string => {
    if (daysOverdue <= 0) return "text-emerald-600";
    if (daysOverdue <= 30) return "text-amber-600";
    if (daysOverdue <= 60) return "text-orange-400";
    if (daysOverdue <= 90) return "text-destructive";
    return "text-red-500";
  };

  const getAgingBucketLabel = (daysOverdue: number): string => {
    if (daysOverdue <= 0) return "Current";
    if (daysOverdue <= 30) return "1-30 hari";
    if (daysOverdue <= 60) return "31-60 hari";
    if (daysOverdue <= 90) return "61-90 hari";
    if (daysOverdue <= 180) return "91-180 hari";
    return ">180 hari";
  };

  const toggleClientExpand = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const expandAll = () => {
    setExpandedClients(new Set(filtered.map((c) => c.client_id)));
  };

  const collapseAll = () => {
    setExpandedClients(new Set());
  };

  const Row = ({ label, current, d1, d2, d3, d4, d5, total, bold }: any) => (
    <tr className={`${bold ? "bg-card font-semibold" : "hover:bg-muted/40"}`}>
      <td className="px-4 py-3">{label}</td>
      <td className="px-4 py-3 text-right">{current ? fmt(current) : "-"}</td>
      <td className="px-4 py-3 text-right">{d1 ? fmt(d1) : "-"}</td>
      <td className="px-4 py-3 text-right">{d2 ? fmt(d2) : "-"}</td>
      <td className="px-4 py-3 text-right">{d3 ? fmt(d3) : "-"}</td>
      <td className="px-4 py-3 text-right">{d4 ? fmt(d4) : "-"}</td>
      <td className="px-4 py-3 text-right text-destructive">{d5 ? fmt(d5) : "-"}</td>
      <td className="px-4 py-3 text-right font-bold">{total ? fmt(total) : "-"}</td>
    </tr>
  );

  const rowPadding = density === "compact" ? "py-2" : "py-3";
  const headerPadding = density === "compact" ? "py-2" : "py-3";

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">AR Aging</h1>
              <p className="text-muted-foreground text-sm mt-1">Piutang Usaha per Customer — umur piutang</p>
            </div>
          </div>
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">AR Aging</h1>
              <p className="text-muted-foreground text-sm mt-1">Piutang Usaha per Customer — umur piutang</p>
            </div>
          </div>
          <div className="text-center py-8 text-destructive">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">AR Aging</h1>
            <p className="text-muted-foreground text-sm mt-1">Piutang Usaha per Customer — umur piutang</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">As of: {asOfDate}</span>
            <Link
              href="/finance"
              className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
            >
              ← Kembali
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          {[
            { label: "Total Piutang", value: grand.total, cls: "text-foreground" },
            { label: "Current (≤0 hari)", value: grand.current, cls: "text-emerald-600" },
            { label: "1-30 hari", value: grand.days_1_30, cls: "text-amber-600" },
            { label: "31-60 hari", value: grand.days_31_60, cls: "text-orange-400" },
            { label: "61-90 hari", value: grand.days_61_90, cls: "text-destructive" },
            { label: "91-180 hari", value: grand.days_91_180, cls: "text-orange-600" },
            { label: ">180 hari", value: grand.over_180, cls: "text-red-500" },
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
            placeholder="Cari customer..."
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
                  <th className={`px-4 ${headerPadding} text-left font-medium`}>Customer</th>
                  <th className={`px-4 ${headerPadding} text-right font-medium text-muted-foreground`}>Current</th>
                  <th className={`px-4 ${headerPadding} text-right font-medium text-amber-600`}>1 – 30</th>
                  <th className={`px-4 ${headerPadding} text-right font-medium text-orange-400`}>31 – 60</th>
                  <th className={`px-4 ${headerPadding} text-right font-medium text-destructive`}>61 – 90</th>
                  <th className={`px-4 ${headerPadding} text-right font-medium text-orange-600`}>91 – 180</th>
                  <th className={`px-4 ${headerPadding} text-right font-medium text-red-500`}>&gt; 180</th>
                  <th className={`px-4 ${headerPadding} text-right font-medium`}>Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Tidak ada data
                    </td>
                  </tr>
                )}
                {filtered.map((client) => (
                  <>
                    <tr
                      key={client.client_id}
                      onClick={() => toggleClientExpand(client.client_id)}
                      className="cursor-pointer hover:bg-muted/40 border-b border-border"
                    >
                      <td className={`px-4 ${rowPadding} flex items-center gap-2`}>
                        <ChevronDown
                          size={16}
                          className={`transition-transform flex-shrink-0 ${expandedClients.has(client.client_id) ? "rotate-180" : ""}`}
                        />
                        <span className="font-medium">{client.client_name || `Client ${client.client_id.substring(0, 8)}`}</span>
                      </td>
                      <td className={`px-4 ${rowPadding} text-right`}>{client.current ? fmt(client.current) : "-"}</td>
                      <td className={`px-4 ${rowPadding} text-right`}>{client.days_1_30 ? fmt(client.days_1_30) : "-"}</td>
                      <td className={`px-4 ${rowPadding} text-right`}>{client.days_31_60 ? fmt(client.days_31_60) : "-"}</td>
                      <td className={`px-4 ${rowPadding} text-right`}>{client.days_61_90 ? fmt(client.days_61_90) : "-"}</td>
                      <td className={`px-4 ${rowPadding} text-right`}>{client.days_91_180 ? fmt(client.days_91_180) : "-"}</td>
                      <td className={`px-4 ${rowPadding} text-right text-destructive`}>{client.over_180 ? fmt(client.over_180) : "-"}</td>
                      <td className={`px-4 ${rowPadding} text-right font-bold`}>{client.total ? fmt(client.total) : "-"}</td>
                    </tr>

                    {expandedClients.has(client.client_id) &&
                      client.invoices.map((inv) => (
                        <tr key={`${client.client_id}-${inv.invoice_number}`} className="bg-muted/30 border-b border-border">
                          <td colSpan={8} className={`px-4 ${rowPadding}`}>
                            <div className="ml-8 py-1">
                              <div className={`grid ${density === "compact" ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2" : "grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4"}`}>
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase font-medium">Invoice</p>
                                  <p className="font-mono font-semibold text-sm">{inv.invoice_number}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase font-medium">Issue Date</p>
                                  <p className={density === "compact" ? "text-xs" : "text-sm"}>
                                    {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString("id-ID") : "—"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase font-medium">Due Date</p>
                                  <p className={density === "compact" ? "text-xs" : "text-sm"}>{new Date(inv.due_date).toLocaleDateString("id-ID")}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase font-medium">AR Status</p>
                                  <p className={`${density === "compact" ? "text-xs" : "text-sm"} font-semibold ${getAgingBucketColor(inv.days_overdue)}`}>
                                    {getAgingBucketLabel(inv.days_overdue)}
                                  </p>
                                  {inv.days_overdue > 0 && (
                                    <p className="text-xs text-muted-foreground">{inv.days_overdue} hari overdue</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground uppercase font-medium">Amount</p>
                                  <p className={`${density === "compact" ? "text-xs" : "text-sm"} font-bold`}>{fmt(inv.amount)}</p>
                                  <p className={`text-xs ${inv.status === "paid" ? "text-emerald-600" : "text-orange-600"}`}>
                                    {inv.status === "paid" ? "Paid" : "Outstanding"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </>
                ))}

                {/* Grand Total */}
                <Row
                  label="GRAND TOTAL"
                  current={grand.current}
                  d1={grand.days_1_30}
                  d2={grand.days_31_60}
                  d3={grand.days_61_90}
                  d4={grand.days_91_180}
                  d5={grand.over_180}
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
