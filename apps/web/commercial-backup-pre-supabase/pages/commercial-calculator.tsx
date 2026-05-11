'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Input } from '@workspace/ui/components/input';
import { Button } from '@workspace/ui/components/button';
import { Badge } from '@workspace/ui/components/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ui/components/select';
import { Trash2, Plus, Calculator, FileText, Percent, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  RATE_CARD,
  PROJECT_TYPES,
  PROJECT_STATUSES,
  getGroups,
  getRoles,
  fmtIDR,
  parseIDR,
  pct,
  calculateSummary,
  type ManpowerRow,
  type Deductions,
  type ToppAllocation,
  type ProjectInfo,
} from '@/lib/commercial-data';

interface CalculatorRow {
  id: string;
  group: string;
  role: string;
  nama: string;
  qty: number;
  months: number;
}

let uidCounter = 0;
function nextId() {
  return `row-${++uidCounter}`;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-600',
  Submitted: 'bg-blue-700',
  Negotiation: 'bg-yellow-700',
  Won: 'bg-emerald-700',
  Lost: 'bg-red-800',
  'On Hold': 'bg-orange-800',
};

export default function CommercialCalculatorPage() {
  // Project Info
  const [project, setProject] = useState<ProjectInfo>({
    projectName: '',
    pic: '',
    status: 'Draft',
    type: 'Consultant',
  });

  // Manpower Rows
  const [rows, setRows] = useState<CalculatorRow[]>([
    { id: nextId(), group: '', role: '', nama: '', qty: 1, months: 1 },
    { id: nextId(), group: '', role: '', nama: '', qty: 1, months: 1 },
  ]);

  // Deductions
  const [deductions, setDeductions] = useState<Deductions>({
    pajak: 11,
    founderFee: 3,
    managementFee: 0,
    seFee: 0,
  });

  // TOPP
  const [topp, setTopp] = useState<ToppAllocation>({ cogsPct: 20, opexPct: 80 });

  // Deal inputs
  const [quotationRaw, setQuotationRaw] = useState('');
  const [actualDealRaw, setActualDealRaw] = useState('');

  // Derive quoted/actual numbers
  const quotationPublish = useMemo(() => parseIDR(quotationRaw), [quotationRaw]);
  const actualDeal = useMemo(() => parseIDR(actualDealRaw), [actualDealRaw]);

  // Groups for current selected type
  const groups = useMemo(() => getGroups(project.type), [project.type]);

  // Build data rows with rate card entries
  const dataRows = useMemo(() => {
    return rows.map((r) => {
      const entry = RATE_CARD.find(
        (rc) => rc.type === project.type && rc.group === r.group && rc.role === r.role
      );
      return { entry, qty: r.qty || 0, months: r.months || 0 };
    });
  }, [rows, project.type]);

  // Calculate summary
  const summary = useMemo(
    () => calculateSummary(dataRows, deductions, topp, quotationPublish, actualDeal),
    [dataRows, deductions, topp, quotationPublish, actualDeal]
  );

  // Add row
  const addRow = useCallback(() => {
    setRows((prev) => [...prev, { id: nextId(), group: '', role: '', nama: '', qty: 1, months: 1 }]);
  }, []);

  // Remove row
  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Update row field
  const updateRow = useCallback((id: string, field: keyof CalculatorRow, value: string | number) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        // Reset role when group changes
        if (field === 'group') {
          updated.role = '';
        }
        return updated;
      })
    );
  }, []);

  // Change project type -> reset rows
  const selectType = useCallback(
    (type: string) => {
      setProject((p) => ({ ...p, type }));
      setRows([
        { id: nextId(), group: '', role: '', nama: '', qty: 1, months: 1 },
        { id: nextId(), group: '', role: '', nama: '', qty: 1, months: 1 },
      ]);
    },
    []
  );

  // Reset all
  const resetForm = useCallback(() => {
    setProject({ projectName: '', pic: '', status: 'Draft', type: 'Consultant' });
    setRows([
      { id: nextId(), group: '', role: '', nama: '', qty: 1, months: 1 },
      { id: nextId(), group: '', role: '', nama: '', qty: 1, months: 1 },
    ]);
    setDeductions({ pajak: 11, founderFee: 3, managementFee: 0, seFee: 0 });
    setTopp({ cogsPct: 20, opexPct: 80 });
    setQuotationRaw('');
    setActualDealRaw('');
    toast.success('Form reset');
  }, []);

  // Save / Publish → POST to server API
  const publishProject = useCallback(async () => {
    if (!project.projectName.trim()) {
      toast.error('Project Name is required!');
      return;
    }
    const payload = {
      ...project,
      quotationPublish,
      actualDeal,
      manpower: rows.map((r) => ({
        group: r.group,
        role: r.role,
        nama: r.nama,
        qty: r.qty,
        months: r.months,
      })),
      deductions,
      topp,
      summary,
      createdAt: new Date().toISOString(),
    };
    try {
      const res = await fetch('/api/commercial-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Server error');
      toast.success(`Project "${project.projectName}" berhasil disimpan!`);
    } catch (err) {
      toast.error('Failed to save project to server');
    }
  }, [project, quotationPublish, actualDeal, rows, deductions, topp, summary]);

  // Currency input helpers
  const handleCurrencyInput = (value: string, setter: (v: string) => void) => {
    // Strip non-numeric except dot/comma
    let clean = value.replace(/[^\d.,]/g, '');
    // Only allow one decimal separator
    const parts = clean.split(/[.,]/);
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
    setter(clean);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-6 w-6 text-blue-500" />
          Commercial Calculator
        </h1>
        <p className="text-muted-foreground">Rate Card &amp; Pricing Simulator — WIT Indonesia</p>
      </div>

      {/* Project Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Project Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Project Name</label>
              <Input
                value={project.projectName}
                onChange={(e) => setProject((p) => ({ ...p, projectName: e.target.value }))}
                placeholder="Project Name"
                className=''
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">PIC</label>
              <Input
                value={project.pic}
                onChange={(e) => setProject((p) => ({ ...p, pic: e.target.value }))}
                placeholder="PIC Name"
                className=''
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select
                value={project.status}
                onValueChange={(v) => setProject((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Badge className={`${STATUS_COLORS[project.status] || 'bg-gray-600'} text-white`}>
                {project.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Project Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Project Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {PROJECT_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => selectType(t)}
                    className={`border rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                      project.type === t
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-border bg-card text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Manpower Calculator */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Manpower Calculator
              </CardTitle>
              <Button onClick={addRow} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" /> Add Manpower
              </Button>
            </CardHeader>
            <CardContent>
              {/* Header Row */}
              <div className="hidden sm:grid grid-cols-[40px_1fr_1fr_1fr_70px_80px_100px_40px] gap-2 text-xs text-muted-foreground uppercase font-bold mb-2 px-1">
                <div className="text-center">No</div>
                <div>Group</div>
                <div>Role</div>
                <div>Name (optional)</div>
                <div className="text-center">Qty</div>
                <div className="text-right">Months</div>
                <div className="text-right">Rate</div>
                <div></div>
              </div>

              {/* Rows */}
              <div className="space-y-2">
                {rows.map((row, idx) => {
                  const entry = RATE_CARD.find(
                    (rc) => rc.type === project.type && rc.group === row.group && rc.role === row.role
                  );
                  const calc = entry
                    ? {
                        publish: entry.publishRate * (row.qty || 0) * (row.months || 0),
                      }
                    : { publish: 0 };
                  const roleOptions = getRoles(project.type, row.group);

                  return (
                    <div
                      key={row.id}
                      className="grid grid-cols-1 sm:grid-cols-[40px_1fr_1fr_1fr_70px_80px_100px_40px] gap-2 items-center bg-muted/40 rounded-md p-2 sm:p-0 sm:bg-transparent"
                    >
                      <div className="text-center text-sm text-muted-foreground font-bold hidden sm:block">
                        {idx + 1}
                      </div>
                      <div>
                        <label className="sm:hidden text-xs text-muted-foreground">Group</label>
                        <Select
                          value={row.group || 'ALL'}
                          onValueChange={(v) => updateRow(row.id, 'group', v === 'ALL' ? '' : v)}
                        >
                          <SelectTrigger className='h-8 text-xs'>
                            <SelectValue placeholder="Select Group" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">Select Group</SelectItem>
                            {groups.map((g) => (
                              <SelectItem key={g} value={g}>
                                {g}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="sm:hidden text-xs text-muted-foreground">Role</label>
                        <Select
                          value={row.role || 'ALL'}
                          onValueChange={(v) => updateRow(row.id, 'role', v === 'ALL' ? '' : v)}
                        >
                          <SelectTrigger className='h-8 text-xs'>
                            <SelectValue placeholder="Select Role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">Select Role</SelectItem>
                            {roleOptions.map((r) => (
                              <SelectItem key={`${r.group}-${r.role}`} value={r.role}>
                                {r.role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="sm:hidden text-xs text-muted-foreground">Name</label>
                        <Input
                          className="h-8 text-xs"
                          value={row.nama}
                          onChange={(e) => updateRow(row.id, 'nama', e.target.value)}
                          placeholder="Name"
                        />
                      </div>
                      <div>
                        <label className="sm:hidden text-xs text-muted-foreground">Qty</label>
                        <Input
                          type="number"
                          min={1}
                          className="h-8 text-xs text-center"
                          value={row.qty}
                          onChange={(e) => updateRow(row.id, 'qty', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="sm:hidden text-xs text-muted-foreground">Months</label>
                        <Input
                          type="number"
                          min={0.1}
                          step={0.1}
                          className="h-8 text-xs text-right"
                          value={row.months}
                          onChange={(e) => updateRow(row.id, 'months', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="text-right text-sm font-bold text-blue-500 hidden sm:block">
                        {fmtIDR(calc.publish)}
                      </div>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300"
                          onClick={() => removeRow(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t grid grid-cols-[1fr_100px] gap-2 text-sm font-bold">
                <div className="text-right text-red-400">Total HPP:</div>
                <div className="text-right text-red-400">{fmtIDR(summary.totalHPP)}</div>
              </div>
              <div className="grid grid-cols-[1fr_100px] gap-2 text-sm font-bold">
                <div className="text-right text-blue-400">Total Publish:</div>
                <div className="text-right text-blue-400">{fmtIDR(summary.totalPublish)}</div>
              </div>
              <div className="grid grid-cols-[1fr_100px] gap-2 text-sm font-bold mt-2 pt-2 border-t">
                <div className="text-right">Timeline:</div>
                <div className="text-right">{summary.maxMonths} Month(s)</div>
              </div>
            </CardContent>
          </Card>

          {/* Deductions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Cost Deductions (% from Publish Rate)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {([
                  { key: 'pajak' as const, label: 'Tax (%)' },
                  { key: 'founderFee' as const, label: 'Founder Fee (%)' },
                  { key: 'managementFee' as const, label: 'Management Fee (%)' },
                  { key: 'seFee' as const, label: 'SE / Marketing Fee (%)' },
                ]).map((field) => (
                  <div key={field.key}>
                    <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={deductions[field.key]}
                      onChange={(e) =>
                        setDeductions((d) => ({
                          ...d,
                          [field.key]: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* TOPP */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                TOPP Allocation (% from Sales Project)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">COGS TOPP (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={topp.cogsPct}
                    onChange={(e) =>
                      setTopp((t) => {
                        const cogs = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                        return { ...t, cogsPct: cogs, opexPct: Math.round((100 - cogs) * 10) / 10 };
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">OPEX Allocation (%)</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={topp.opexPct}
                    onChange={(e) =>
                      setTopp((t) => {
                        const opex = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                        return { ...t, opexPct: opex, cogsPct: Math.round((100 - opex) * 10) / 10 };
                      })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💡 COGS TOPP + OPEX Allocation must = 100%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN - Summary */}
        <div className="space-y-4">
          {/* Quotation */}
          <Card className="border-blue-500/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Quotation Publish <span className="text-blue-400">(Initial Plan)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={quotationRaw}
                onChange={(e) => handleCurrencyInput(e.target.value, setQuotationRaw)}
                onBlur={() => {
                  if (quotationRaw) setQuotationRaw(fmtIDR(parseIDR(quotationRaw)).replace('IDR ', ''));
                }}
                placeholder="IDR 0"
                className="text-lg font-bold"
              />
              <div className="flex justify-between mt-2 text-sm">
                <span className="text-muted-foreground">vs Publish Rate:</span>
                <span className="font-semibold">{pct(summary.quotVsPublish)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actual Deal */}
          <Card className="border-emerald-500/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Actual Deal <span className="text-emerald-400">(Actual)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={actualDealRaw}
                onChange={(e) => handleCurrencyInput(e.target.value, setActualDealRaw)}
                onBlur={() => {
                  if (actualDealRaw) setActualDealRaw(fmtIDR(parseIDR(actualDealRaw)).replace('IDR ', ''));
                }}
                placeholder="IDR 0"
                className="text-lg font-bold"
              />
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount dari Publish:</span>
                  <span className="font-semibold">{pct(summary.discPublish)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount dari Special Rate:</span>
                  <span className="font-semibold text-yellow-400">{pct(summary.discSpecial)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={publishProject} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              <Save className="h-4 w-4 mr-1" /> Publish Project
            </Button>
            <Button variant="outline" onClick={resetForm}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Summary Cards */}
          <SummaryCard label="Publish Rate (Recommended)" value={summary.totalPublish} color="text-blue-400" />
          <SummaryCard label="HPP Total (Floor)" value={summary.totalHPP} color="text-red-400" />
          <SummaryCard label="Special Rate Total (Ceiling)" value={summary.totalSpecial} color="text-yellow-400" />
          <SummaryCard label="Sales Project (after deduction)" value={summary.salesProject} color="text-blue-400" />

          {/* Deduction Breakdown */}
          <Card className="bg-muted/30">
            <CardContent className="py-3 space-y-1 text-sm">
              <DeductRow label={`Tax (${pct(deductions.pajak)})`} value={summary.deductionDetails.pajakVal} />
              <DeductRow label={`Founder Fee (${pct(deductions.founderFee)})`} value={summary.deductionDetails.founderVal} />
              <DeductRow label={`Mgmt Fee (${pct(deductions.managementFee)})`} value={summary.deductionDetails.mgmtVal} />
              <DeductRow label={`SE/Marketing (${pct(deductions.seFee)})`} value={summary.deductionDetails.seVal} />
            </CardContent>
          </Card>

          {/* TOPP */}
          <Card className="bg-muted/30">
            <CardContent className="py-3 space-y-1 text-sm">
              {/* COGS TOPP */}
              <div className="flex justify-between items-baseline">
                <span className="text-cyan-400">COGS TOPP Total ({pct(topp.cogsPct)}):</span>
                <span className="font-bold text-cyan-400">{fmtIDR(summary.cogsAmount)}</span>
              </div>
              {/* Allocation / Month — font lebih kecil */}
              <div className="flex justify-between items-baseline pl-4">
                <span className="text-xs text-cyan-300/70">Allocation / Month:</span>
                <span className="font-mono text-xs text-cyan-300">
                  {summary.maxMonths > 0
                    ? fmtIDR(summary.cogsAmount / summary.maxMonths) + ' / month'
                    : 'N/A'}
                </span>
              </div>
              {/* OPEX Allocation */}
              <div className="flex justify-between items-baseline pt-1 border-t border-cyan-500/20">
                <span className="text-purple-400">OPEX Allocation ({pct(topp.opexPct)}):</span>
                <span className="font-bold text-purple-400">{fmtIDR(summary.opexAmount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* STATUS Margin Kotor */}
          <Card className={`border-2 ${summary.statusMargin === "UNDER BUDGET" ? "border-yellow-500/50" : "border-emerald-500/50"}`}>
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground uppercase">STATUS Margin Kotor (OPEX)</div>
              <div className={`text-xl font-bold mt-1 ${summary.statusMargin === "UNDER BUDGET" ? "text-yellow-400" : "text-emerald-400"}`}>
                🟡 {summary.statusMargin}
              </div>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>OPEX (HPP):</span>
                  <span className="font-mono">{fmtIDR(summary.opexHPP)}</span>
                </div>
                <div className="flex justify-between">
                  <span>OPEX (Actual):</span>
                  <span className="font-mono">{fmtIDR(summary.opexActualVal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gross Profit Publish */}
          <Card className="border-emerald-600/30">
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground uppercase">Gross Profit (Publish Rate)</div>
              <div className="flex items-end gap-2 mt-1">
                <div className={`text-2xl font-bold ${summary.profitPublish >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {summary.profitPublish < 0 ? '− ' : ''}{fmtIDR(Math.abs(summary.profitPublish))}
                </div>
                <span className={`text-sm font-semibold pb-1 ${summary.profitPublish >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {summary.profitPublish < 0 ? 'LOSS ' : ''}{pct(summary.marginPublish)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Profit = Publish Rate - HPP</p>
            </CardContent>
          </Card>

          {/* Gross Profit Actual */}
          <Card className="border-yellow-600/30">
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground uppercase">Gross Profit (Actual Deal)</div>
              <div className="flex items-end gap-2 mt-1">
                <div className={`text-2xl font-bold ${summary.profitActual >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {summary.profitActual < 0 ? '− ' : ''}{fmtIDR(Math.abs(summary.profitActual))}
                </div>
                <span className={`text-sm font-semibold pb-1 ${summary.profitActual >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {summary.profitActual < 0 ? 'UNVIABLE ' : ''}{pct(summary.marginActual)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Profit = Actual Deal - HPP</p>
            </CardContent>
          </Card>

          {/* Variance */}
          <Card className="border-purple-600/30">
            <CardContent className="py-3">
              <div className="text-xs text-muted-foreground uppercase">Variance (Quotation vs Actual)</div>
              <div className="flex items-end gap-2 mt-1">
                <div className="text-2xl font-bold text-purple-400">{fmtIDR(summary.variance)}</div>
                <span className="text-sm text-purple-400 pb-1">({pct(summary.variancePct)})</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="py-3">
        <div className="text-xs text-muted-foreground uppercase">{label}</div>
        <div className={`text-2xl font-bold mt-1 ${color}`}>{fmtIDR(value)}</div>
      </CardContent>
    </Card>
  );
}

function DeductRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">− {label}</span>
      <span className="text-red-400 font-mono">{fmtIDR(value)}</span>
    </div>
  );
}
