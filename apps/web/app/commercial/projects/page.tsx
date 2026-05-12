'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog';
import {
  Calculator,
  Search,
  Trash2,
  Eye,
  Plus,
  Pencil,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Percent,
  Package,
  Clock,
  CheckCircle2,
  FileText,
  CalendarDays,
  Download,
} from 'lucide-react';
import { fmtIDR } from '@/lib/commercial-data';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface SavedProject {
  id: string;
  projectCode: string;
  projectName: string;
  pic: string;
  status: string;
  type: string;
  quotationPublish: number;
  actualDeal: number;
  manpower: Array<{
    group: string;
    role: string;
    nama: string;
    qty: number;
    months: number;
  }>;
  deductions: {
    pajak: number;
    founderFee: number;
    managementFee: number;
    seFee: number;
  };
  topp: {
    cogsPct: number;
    opexPct: number;
  };
  summary: {
    totalHPP: number;
    totalPublish: number;
    totalSpecial: number;
    salesProject: number;
    profitPublish: number;
    marginPublish: number;
    profitActual: number;
    marginActual: number;
    variance: number;
    variancePct: number;
    maxMonths: number;
    cogsAmount: number;
    opexAmount: number;
    marginActual: number;
    profitActual: number;
  };
  createdAt: string;
}

const PROJECT_TYPES = ['Consultant', 'Networking', 'Project', 'Web', 'WMS'];
const PROJECT_STATUSES = ['Draft', 'Submitted', 'Negotiation', 'Won', 'Lost', 'On Hold'];

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-600',
  Submitted: 'bg-blue-700',
  Negotiation: 'bg-yellow-700',
  Won: 'bg-emerald-700',
  Lost: 'bg-red-800',
  'On Hold': 'bg-orange-800',
};

type SortField = 'none' | 'createdAt' | 'projectName' | 'totalPublish' | 'totalHPP' | 'actualDeal' | 'profitActual' | 'maxMonths';

// ─── Helper: format tanggal Indonesia ───
function fmtTanggalIndonesia(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = d.getDate();
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} ${hours}:${mins}`;
}

export default function CommercialProjectsPage() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  // Load from server API
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/commercial-projects')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: any) => {
        const list = Array.isArray(data) ? data : (data.data || []);
        setProjects(
          list.sort(
            (a: any, b: any) =>
              new Date(b.createdAt || b.created_at).getTime() -
              new Date(a.createdAt || a.created_at).getTime()
          )
        );
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch projects:', err);
        setError(String(err));
        setLoading(false);
      });
  }, []);

  // Sort handler — click kolom
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // sudah sort field ini → toggle asc/desc, atau reset
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortField('none');
      }
    } else {
      setSortField(field);
      setSortAsc(false); // default desc
    }
  };

  const filtered = useMemo(() => {
    let result = projects;

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          (p.projectName || '').toLowerCase().includes(q) ||
          (p.pic || '').toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filterStatus !== 'ALL') {
      result = result.filter((p) => p.status === filterStatus);
    }

    // Type filter
    if (filterType !== 'ALL') {
      result = result.filter((p) => p.type === filterType);
    }

    // Tanggal filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter((p) => {
        const d = new Date(p.createdAt);
        d.setHours(0, 0, 0, 0);
        return d >= fromDate;
      });
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((p) => {
        const d = new Date(p.createdAt);
        return d <= toDate;
      });
    }

    // Budget range filter
    const minVal = parseFloat(budgetMin.replace(/[^\d.]/g, '')) || 0;
    const maxVal = parseFloat(budgetMax.replace(/[^\d.]/g, '')) || Infinity;
    if (minVal > 0 || maxVal < Infinity) {
      result = result.filter((p) => {
        const pub = p.summary?.totalPublish || 0;
        return pub >= minVal && pub <= maxVal;
      });
    }

    // Sort
    if (sortField !== 'none') {
      result = [...result].sort((a, b) => {
        let valA: number;
        let valB: number;
        switch (sortField) {
          case 'projectName':
            return sortAsc
              ? (a.projectName || '').localeCompare(b.projectName || '')
              : (b.projectName || '').localeCompare(a.projectName || '');
          case 'createdAt':
            valA = new Date(a.createdAt).getTime();
            valB = new Date(b.createdAt).getTime();
            break;
          case 'totalPublish':
            valA = a.summary?.totalPublish || 0;
            valB = b.summary?.totalPublish || 0;
            break;
          case 'totalHPP':
            valA = a.summary?.totalHPP || 0;
            valB = b.summary?.totalHPP || 0;
            break;
          case 'actualDeal':
            valA = a.actualDeal || 0;
            valB = b.actualDeal || 0;
            break;
          case 'profitActual':
            valA = a.summary?.profitActual || 0;
            valB = b.summary?.profitActual || 0;
            break;
          case 'maxMonths':
            valA = a.summary?.maxMonths || 0;
            valB = b.summary?.maxMonths || 0;
            break;
          default:
            return 0;
        }
        return sortAsc ? valA - valB : valB - valA;
      });
    }

    return result;
  }, [
    projects,
    search,
    filterStatus,
    filterType,
    filterDateFrom,
    filterDateTo,
    budgetMin,
    budgetMax,
    sortField,
    sortAsc,
  ]);

  const getOriginalIndex = (filteredIdx: number) => {
    if (filteredIdx < 0 || filteredIdx >= filtered.length) return -1;
    const filteredId = filtered[filteredIdx].id;
    return projects.findIndex((original) => original.id === filteredId);
  };

  const deleteProject = async (filteredIdx: number) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    const originalIdx = getOriginalIndex(filteredIdx);
    if (originalIdx < 0) return;
    const id = projects[originalIdx].id;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch(`/api/commercial-projects?id=${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  // ─── STATS: hanya WON ───
  const wonProjects = useMemo(() => projects.filter((p) => p.status === 'Won'), [projects]);

  const stats = useMemo(() => {
    const total = projects.length;

    // WON-only stats
    const wonActual = wonProjects.reduce(
      (acc, p) => acc + (p.actualDeal || 0),
      0
    );
    const wonProfit = wonProjects.reduce(
      (acc, p) => acc + (p.summary?.profitActual || 0),
      0
    );
    const wonPublish = wonProjects.reduce(
      (acc, p) => acc + (p.summary?.totalPublish || 0),
      0
    );
    const wonHPP = wonProjects.reduce(
      (acc, p) => acc + (p.summary?.totalHPP || 0),
      0
    );
    const wonCOGS = wonProjects.reduce(
      (acc, p) => acc + (p.summary?.cogsAmount || 0),
      0
    );

    const avgMarginWon =
      wonProjects.length > 0
        ? wonProjects.reduce(
            (acc, p) => acc + (p.summary?.marginActual || 0),
            0
          ) / wonProjects.length
        : 0;

    const won = wonProjects.length;
    const lost = projects.filter((p) => p.status === 'Lost').length;
    const draft = projects.filter((p) => p.status === 'Draft').length;
    const submitted = projects.filter((p) => p.status === 'Submitted').length;
    const negotiation = projects.filter((p) => p.status === 'Negotiation').length;

    const successRate =
      projects.length > 0 ? (won / projects.length) * 100 : 0;

    const avgTimeline =
      projects.length > 0
        ? projects.reduce(
            (acc, p) => acc + (p.summary?.maxMonths || 0),
            0
          ) / projects.length
        : 0;

    return {
      total,
      wonActual,
      wonProfit,
      wonPublish,
      wonHPP,
      wonCOGS,
      avgMarginWon,
      won,
      lost,
      draft,
      submitted,
      negotiation,
      successRate,
      avgTimeline,
    };
  }, [projects, wonProjects]);

  // Helper: sort indicator
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUp className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-50" />;
    }
    return sortAsc ? (
      <ArrowUp className="h-3 w-3 text-blue-400" />
    ) : (
      <ArrowDown className="h-3 w-3 text-blue-400" />
    );
  };

  // ─── Export Excel ───
  const exportToExcel = () => {
    if (projects.length === 0) {
      alert('No projects to export');
      return;
    }
    const data = projects.map((p, i) => ({
      No: i + 1,
      'Project Name': p.projectName || '-',
      PIC: p.pic || '-',
      Status: p.status || '-',
      Type: p.type || '-',
      'HPP': p.summary?.totalHPP || 0,
      'Published': p.summary?.totalPublish || 0,
      'Actual Deal': p.actualDeal || 0,
      'Profit': p.summary?.profitActual || 0,
      'Margin %': (p.summary?.marginActual || 0),
      'Timeline (M)': p.summary?.maxMonths || 0,
      'Manpower Rows': p.manpower?.length || 0,
      Created: p.createdAt || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Projects');
    const filename = `commercial-projects-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─── Chart Data Generators (5 types) ───
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of PROJECT_STATUSES) counts[s] = 0;
    for (const p of projects) if (counts[p.status] !== undefined) counts[p.status]++;
    return PROJECT_STATUSES.map((s) => ({
      name: s,
      count: counts[s] || 0,
      fill:
        s === 'Won' ? '#34d399' : s === 'Lost' ? '#f87171' : s === 'Draft' ? '#9ca3af'
        : s === 'Negotiation' ? '#fbbf24' : s === 'Submitted' ? '#3b82f6' : '#fb923c',
    }));
  }, [projects]);

  const profitData = useMemo(() => {
    return projects.map((p) => ({
      name: p.projectName?.slice(0, 20) || 'Untitled',
      Profit: p.summary?.profitActual || 0,
      Revenue: p.actualDeal || 0,
      HPP: -(p.summary?.totalHPP || 0),
    }));
  }, [projects]);

  const marginData = useMemo(() => {
    return projects
      .filter((p) => (p.summary?.marginActual || 0) !== 0)
      .map((p) => ({
        name: p.projectName?.slice(0, 20) || 'Untitled',
        margin: p.summary?.marginActual || 0,
      }))
      .sort((a, b) => b.margin - a.margin);
  }, [projects]);

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of PROJECT_TYPES) counts[t] = 0;
    for (const p of projects) if (counts[p.type] !== undefined) counts[p.type]++;
    const colors = ['#3b82f6', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];
    return PROJECT_TYPES.map((t, i) => ({ name: t, value: counts[t] || 0, fill: colors[i] }));
  }, [projects]);

  const trendData = useMemo(() => {
    const monthly: Record<
      string,
      { month: string; profit: number; revenue: number; count: number }
    > = {};
    for (const p of projects) {
      const d = new Date(p.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) monthly[key] = { month: key, profit: 0, revenue: 0, count: 0 };
      monthly[key].profit += p.summary?.profitActual || 0;
      monthly[key].revenue += p.actualDeal || 0;
      monthly[key].count += 1;
    }
    return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
  }, [projects]);

  type ChartType = 'status' | 'profit' | 'margin' | 'type' | 'trend';
  const [mainChart, setMainChart] = useState<ChartType>('profit');
  const [sideChart, setSideChart] = useState<ChartType>('status');

  const chartOptions: { key: ChartType; label: string }[] = [
    { key: 'status', label: 'Win Rate by Status' },
    { key: 'profit', label: 'Profit vs Revenue' },
    { key: 'margin', label: 'Margin by Project' },
    { key: 'type', label: 'Projects by Type' },
    { key: 'trend', label: 'Trend by Month' },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-6 w-6 text-blue-500" />
          Commercial Projects
        </h1>
        <p className="text-muted-foreground">
          Project list published from the calculator.
        </p>
      </div>

      {/* Summary Stats — WON only */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard label="Total Projects" value={stats.total.toString()} />
        <SummaryCard
          label="Quotation Publish"
          value={fmtIDR(stats.wonPublish)}
          icon={<FileText className="h-4 w-4" />}
        />
        <SummaryCard
          label="Revenue (Won)"
          value={fmtIDR(stats.wonActual)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <SummaryCard
          label="Total Profit (Won)"
          value={fmtIDR(stats.wonProfit)}
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <SummaryCard
          label="Avg Margin (Won)"
          value={stats.avgMarginWon.toFixed(1) + '%'}
          icon={<Percent className="h-4 w-4" />}
        />
        <SummaryCard
          label="Success Rate"
          value={stats.successRate.toFixed(1) + '%'}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        <MiniStat label="Draft" value={stats.draft} color="text-gray-400" />
        <MiniStat label="Submitted" value={stats.submitted} color="text-blue-400" />
        <MiniStat label="Negotiation" value={stats.negotiation} color="text-yellow-400" />
        <MiniStat label="Won" value={stats.won} color="text-emerald-400" />
        <MiniStat label="Lost" value={stats.lost} color="text-red-400" />
        <MiniStat label="Avg Timeline" value={stats.avgTimeline.toFixed(1) + ' M'} icon={<Clock className="h-3 w-3" />} />
        <MiniStat label="HPP (Won)" value={fmtIDR(stats.wonHPP)} />
        <MiniStat label="COGS (Won)" value={fmtIDR(stats.wonCOGS)} icon={<Package className="h-3 w-3" />} />
      </div>

      {/* Analytics Dashboard — 2 Slot Charts */}
      {projects.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Main Chart (2/3) */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                Analytics Dashboard
              </CardTitle>
              <Select value={mainChart} onValueChange={(v) => setMainChart(v as ChartType)}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chartOptions.map((o) => (
                    <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="w-full" style={{ minHeight: 320 }}>
                <ResponsiveContainer width="100%" height={300}>
                  {mainChart === 'status' && (
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ backgroundColor:'#1e293b', border:'1px solid #334155', borderRadius:6, fontSize:12 }} cursor={{ fill:'rgba(255,255,255,0.05)' }} />
                      <Legend />
                      <Bar dataKey="count" name="Total Projects" radius={[4,4,0,0]} >
                        {statusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  )}
                  {mainChart === 'profit' && (
                    <BarChart data={profitData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-30} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip formatter={(v: number, n: string) => [fmtIDR(Math.abs(v)), n]} contentStyle={{ backgroundColor:'#1e293b', border:'1px solid #334155', borderRadius:6, fontSize:12 }} cursor={{ fill:'rgba(255,255,255,0.05)' }} />
                      <Legend />
                      <Bar dataKey="Profit" fill="#34d399" radius={[4,4,0,0]} />
                      <Bar dataKey="Revenue" fill="#3b82f6" radius={[4,4,0,0]} />
                      <Bar dataKey="HPP" fill="#f87171" radius={[4,4,0,0]} />
                    </BarChart>
                  )}
                  {mainChart === 'margin' && (
                    <BarChart data={marginData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={120} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Margin']} contentStyle={{ backgroundColor:'#1e293b', border:'1px solid #334155', borderRadius:6, fontSize:12 }} cursor={{ fill:'rgba(255,255,255,0.05)' }} />
                      <Bar dataKey="margin" name="Margin %" radius={[0,4,4,0]} >
                        {marginData.map((e, i) => <Cell key={i} fill={e.margin >= 0 ? '#34d399' : '#f87171'} />)}
                      </Bar>
                    </BarChart>
                  )}
                  {mainChart === 'type' && (
                    <PieChart>
                      <Tooltip contentStyle={{ backgroundColor:'#1e293b', border:'1px solid #334155', borderRadius:6, fontSize:12 }} />
                      <Legend />
                      <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => `${e.name}: ${e.value}`}>
                        {typeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                    </PieChart>
                  )}
                  {mainChart === 'trend' && (
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip formatter={(v: number, n: string) => [fmtIDR(Math.abs(v)), n]} contentStyle={{ backgroundColor:'#1e293b', border:'1px solid #334155', borderRadius:6, fontSize:12 }} />
                      <Legend />
                      <Line type="monotone" dataKey="profit" name="Profit" stroke="#34d399" strokeWidth={2} dot={{ r:4 }} />
                      <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r:4 }} />
                      <Line type="monotone" dataKey="count" name="# Projects" stroke="#fbbf24" strokeWidth={2} dot={{ r:4 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Side Chart (1/3) */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Percent className="h-4 w-4 text-purple-400" />
                Quick View
              </CardTitle>
              <Select value={sideChart} onValueChange={(v) => setSideChart(v as ChartType)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chartOptions.map((o) => (
                    <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="w-full" style={{ minHeight: 260 }}>
                <ResponsiveContainer width="100%" height={240}>
                  {sideChart === 'status' && (
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ backgroundColor:'#1e293b', border:'1px solid #334155', borderRadius:6, fontSize:12 }} cursor={{ fill:'rgba(255,255,255,0.05)' }} />
                      <Legend />
                      <Bar dataKey="count" name="Total Projects" radius={[4,4,0,0]} >
                        {statusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  )}
                  {sideChart === 'profit' && (
                    <BarChart data={profitData.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} angle={-30} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip formatter={(v: number, n: string) => [fmtIDR(Math.abs(v)), n]} contentStyle={{ backgroundColor:'#1e293b', border:'1px solid #334155', borderRadius:6, fontSize:12 }} />
                      <Legend />
                      <Bar dataKey="Profit" fill="#34d399" radius={[4,4,0,0]} />
                      <Bar dataKey="Revenue" fill="#3b82f6" radius={[4,4,0,0]} />
                    </BarChart>
                  )}
                  {sideChart === 'margin' && (
                    <BarChart data={marginData.slice(0, 5)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#94a3b8' }} width={100} />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Margin']} contentStyle={{ backgroundColor:'#1e293b', border:'1px solid #334155', borderRadius:6, fontSize:12 }} />
                      <Bar dataKey="margin" name="Margin %" radius={[0,4,4,0]} >
                        {marginData.slice(0,5).map((e, i) => <Cell key={i} fill={e.margin >= 0 ? '#34d399' : '#f87171'} />)}
                      </Bar>
                    </BarChart>
                  )}
                  {sideChart === 'type' && (
                    <PieChart>
                      <Tooltip contentStyle={{ backgroundColor:'#1e293b', border:'1px solid #334155', borderRadius:6, fontSize:12 }} />
                      <Legend />
                      <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                        {typeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                    </PieChart>
                  )}
                  {sideChart === 'trend' && (
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip formatter={(v: number, n: string) => [fmtIDR(Math.abs(v)), n]} contentStyle={{ backgroundColor:'#1e293b', border:'1px solid #334155', borderRadius:6, fontSize:12 }} />
                      <Legend />
                      <Line type="monotone" dataKey="profit" name="Profit" stroke="#34d399" strokeWidth={2} dot={{ r:3 }} />
                      <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r:3 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search project name / PIC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {PROJECT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={(v) => setFilterType(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            {PROJECT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Date Filters */}
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="w-[130px] text-xs h-8"
            title="From Date"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="w-[130px] text-xs h-8"
            title="To Date"
          />
        </div>
        {/* Budget Range Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Budget:</span>
          <Input
            placeholder="Min"
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
            className="w-[80px] text-xs h-8"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            placeholder="Max"
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            className="w-[80px] text-xs h-8"
          />
        </div>
        <Button asChild>
          <Link href="/commercial">
            <Plus className="h-4 w-4 mr-1" /> Calculator Baru
          </Link>
        </Button>
        <Button variant="outline" onClick={exportToExcel}>
          <Download className="h-4 w-4 mr-1" /> Export Excel
        </Button>
      </div>

      {/* Table — with clickable sort headers */}
      <Card>
        <CardContent className="p-0">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer group" onClick={() => handleSort('projectName')}>
                    <div className="flex items-center gap-1">
                      Project <SortIcon field="projectName" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer group" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center gap-1">
                      Created <SortIcon field="createdAt" />
                    </div>
                  </TableHead>
                  <TableHead>PIC</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleSort('totalPublish')}>
                    <div className="flex items-center justify-end gap-1">
                      Publish Rate <SortIcon field="totalPublish" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleSort('totalHPP')}>
                    <div className="flex items-center justify-end gap-1">
                      HPP <SortIcon field="totalHPP" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleSort('actualDeal')}>
                    <div className="flex items-center justify-end gap-1">
                      Actual Deal <SortIcon field="actualDeal" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer group" onClick={() => handleSort('profitActual')}>
                    <div className="flex items-center justify-end gap-1">
                      Profit <SortIcon field="profitActual" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer group" onClick={() => handleSort('maxMonths')}>
                    <div className="flex items-center gap-1">
                      Timeline <SortIcon field="maxMonths" />
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="text-center py-12 text-muted-foreground"
                    >
                      {projects.length === 0
                        ? 'No projects yet. Click "New Calculator" to create a project.'
                        : 'No projects match the filter / search.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p, idx) => (
                    <TableRow
                      key={idx}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {p.projectName || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmtTanggalIndonesia(p.createdAt)}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate">
                        {p.pic || '-'}
                      </TableCell>
                      <TableCell>{p.type}</TableCell>
                      <TableCell className="text-right font-mono">
                        {fmtIDR(p.summary?.totalPublish || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-400">
                        {fmtIDR(p.summary?.totalHPP || 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fmtIDR(p.actualDeal || 0)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono font-bold ${
                          (p.summary?.profitActual || 0) >= 0
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}
                      >
                        {fmtIDR(Math.abs(p.summary?.profitActual || 0))}
                      </TableCell>
                      <TableCell className="text-center">
                        {p.summary?.maxMonths || 0} M
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${
                            STATUS_COLORS[p.status] || 'bg-gray-600'
                          } text-white`}
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {/* Edit */}
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/commercial/projects/${getOriginalIndex(idx)}/edit`}>
                              <Pencil className="h-4 w-4 text-blue-400" />
                            </Link>
                          </Button>

                          {/* Detail Dialog */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>
                                  Detail Project: {p.projectName}
                                </DialogTitle>
                              </DialogHeader>
                              <ProjectDetailDialog p={p} />
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-300"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this project?'))
                                deleteProject(idx);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Footer info */}
      <p className="text-xs text-muted-foreground text-center">
        Showing {filtered.length} of {projects.length} projects
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-card border rounded-md px-2 py-1.5 text-center">
      <div className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
        {icon}
        {label}
      </div>
      <div className={`text-sm font-bold mt-0.5 ${color || ''}`}>{value}</div>
    </div>
  );
}

function ProjectDetailDialog({ p }: { p: SavedProject }) {
  const timeline = p.summary?.maxMonths || 0;
  const cogsPerMonth =
    timeline > 0 ? (p.summary?.cogsAmount || 0) / timeline : 0;

  return (
    <div className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">PIC:</span>{' '}
          <span className="font-medium">{p.pic || '-'}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Status:</span>{' '}
          <Badge
            className={`${
              STATUS_COLORS[p.status] || 'bg-gray-600'
            } text-white`}
          >
            {p.status}
          </Badge>
        </div>
        <div>
          <span className="text-muted-foreground">Type:</span>{' '}
          <span className="font-medium">{p.type}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Timeline:</span>{' '}
          <span className="font-medium">{timeline} Month(s)</span>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="border rounded-md p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Publish Rate:</span>
          <span className="font-mono">
            {fmtIDR(p.summary?.totalPublish || 0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">HPP Total:</span>
          <span className="font-mono text-red-400">
            {fmtIDR(p.summary?.totalHPP || 0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Special Rate:</span>
          <span className="font-mono">
            {fmtIDR(p.summary?.totalSpecial || 0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Sales Project:</span>
          <span className="font-mono">
            {fmtIDR(p.summary?.salesProject || 0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Actual Deal:</span>
          <span className="font-mono">
            {fmtIDR(p.actualDeal || 0)}
          </span>
        </div>
      </div>

      {/* COGS TOPP Section - gabungan */}
      <div className="border border-cyan-500/30 rounded-md p-3 space-y-2 text-sm">
        <div className="text-xs text-cyan-400 uppercase font-semibold">
          COGS &amp; OPEX Breakdown
          {p.status === 'Won' && (
            <span className="ml-2 text-[10px] bg-emerald-600/20 text-emerald-400 px-1.5 rounded">
              Actual
            </span>
          )}
        </div>

        {/* COGS Total */}
        <div className="flex justify-between items-baseline">
          <span className="text-muted-foreground">
            COGS TOTAL ({(p.topp?.cogsPct || 20).toFixed(1)}%):
          </span>
          <span className="font-mono font-bold text-cyan-400">
            {fmtIDR(p.summary?.cogsAmount || 0)}
          </span>
        </div>

        {/* Allocation / Month - font lebih kecil, indent */}
        <div className="flex justify-between items-baseline pl-4">
          <span className="text-muted-foreground text-xs">
            Allocation / Month:
          </span>
          <span className="font-mono text-xs text-cyan-300">
            {timeline > 0
              ? fmtIDR(cogsPerMonth) + ' / month'
              : 'N/A'}
          </span>
        </div>

        {/* OPEX Allocation */}
        <div className="flex justify-between items-baseline pt-2 border-t border-cyan-500/20">
          <span className="text-muted-foreground">
            Opex Allocation ({(p.topp?.opexPct || 80).toFixed(1)}%):
          </span>
          <span className="font-mono font-bold text-purple-400">
            {fmtIDR(p.summary?.opexAmount || 0)}
          </span>
        </div>
      </div>

      {/* Profit Summary */}
      <div className="border rounded-md p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Profit (Publish):</span>
          <span
            className={`font-mono font-bold ${
              (p.summary?.profitPublish || 0) >= 0
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {fmtIDR(Math.abs(p.summary?.profitPublish || 0))}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Margin (Publish):</span>
          <span
            className={`font-mono font-bold ${
              (p.summary?.marginPublish || 0) >= 0
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {(p.summary?.marginPublish || 0).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Profit (Actual):</span>
          <span
            className={`font-mono font-bold ${
              (p.summary?.profitActual || 0) >= 0
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {fmtIDR(Math.abs(p.summary?.profitActual || 0))}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Margin (Actual):</span>
          <span
            className={`font-mono font-bold ${
              (p.summary?.marginActual || 0) >= 0
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {(p.summary?.marginActual || 0).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Variance:</span>
          <span className="font-mono text-purple-400">
            {fmtIDR(p.summary?.variance || 0)}
          </span>
        </div>
      </div>

      {/* Manpower Table */}
      {p.manpower?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Manpower</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Months</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.manpower.map((m, i) => (
                <TableRow key={i}>
                  <TableCell>{m.group}</TableCell>
                  <TableCell>{m.role}</TableCell>
                  <TableCell>{m.nama || '-'}</TableCell>
                  <TableCell className="text-right">{m.qty}</TableCell>
                  <TableCell className="text-right">{m.months}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
