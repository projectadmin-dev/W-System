'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2Icon, CheckCircleIcon, ArrowLeftIcon, Trash2Icon, PrinterIcon } from 'lucide-react';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@workspace/ui/components/card';

interface Line {
  id: string;
  line_number: number;
  coa_id: string;
  coa?: { account_code: string; account_name: string; account_type: string; normal_balance: string };
  debit_amount: number;
  credit_amount: number;
  line_description: string | null;
}

interface JournalEntry {
  id: string;
  entry_number: string;
  transaction_date: string;
  posting_date: string | null;
  description: string;
  reference_number: string | null;
  status: string;
  total_debit: number;
  total_credit: number;
  fiscal_periods?: { period_name: string; status: string };
  reversal_of_id: string | null;
  reversal_reason: string | null;
  prepared_by: string | null;
  posted_by: string | null;
  posted_at: string | null;
  created_at: string;
  journal_lines: Line[];
}

export default function JournalDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadEntry();
  }, [id]);

  async function loadEntry() {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/journal?id=${id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntry(data);
    } catch {
      toast.error('Failed to load journal entry');
    } finally {
      setLoading(false);
    }
  }

  async function handlePost() {
    if (!entry) return;
    if (!confirm('Post this journal entry? Once posted, it cannot be edited (PSAK compliance).')) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/finance/journal/post?id=${entry.id}`, { method: 'POST' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || d.error || 'Failed to post');
      }
      toast.success('Journal entry posted');
      loadEntry();
    } catch (err: any) {
      toast.error(err.message || 'Failed to post');
    } finally {
      setPosting(false);
    }
  }

  async function handleVoid() {
    if (!entry) return;
    if (!confirm('Void this journal entry?')) return;
    setVoiding(true);
    try {
      const res = await fetch('/api/finance/journal/void', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || d.error || 'Failed to void');
      }
      toast.success('Journal entry voided');
      loadEntry();
    } catch (err: any) {
      toast.error(err.message || 'Failed to void');
    } finally {
      setVoiding(false);
    }
  }

  async function handleDelete() {
    if (!entry) return;
    if (!confirm('Delete this journal entry? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/finance/journal?id=${entry.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || d.error || 'Failed to delete');
      }
      toast.success('Journal entry deleted');
      router.push('/finance/journal');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2 }).format(n || 0);
  const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('id-ID') : '—';

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-6 px-4 lg:px-6 items-center justify-center min-h-[50vh]">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading journal entry...</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
        <Link href="/finance/journal" className="text-muted-foreground hover:text-foreground text-sm">
          ← Back to Journal Entries
        </Link>
        <p className="text-muted-foreground">Journal entry not found.</p>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    posted: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    draft: 'bg-amber-50 text-amber-600 border-amber-200',
    void: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className="flex flex-col gap-6 py-6 px-4 lg:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/finance/journal" className="text-muted-foreground hover:text-foreground text-sm mb-2 block">
            ← Back to Journal Entries
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{entry.entry_number}</h1>
            <span className={`px-3 py-1 rounded-full text-xs border font-medium capitalize ${statusColor[entry.status] || 'bg-muted text-muted-foreground'}`}>
              {entry.status}
            </span>
            {entry.reversal_of_id && <Badge variant="secondary">Reversal</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <PrinterIcon className="h-4 w-4 mr-1" /> Print
          </Button>
          {entry.status === 'draft' && (
            <>
              <Button size="sm" onClick={handlePost} disabled={posting}>
                {posting && <Loader2Icon className="h-4 w-4 mr-1 animate-spin" />}
                <CheckCircleIcon className="h-4 w-4 mr-1" /> Post
              </Button>
              <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive border-destructive hover:bg-destructive/10">
                <Trash2Icon className="h-4 w-4 mr-1" /> Delete
              </Button>
            </>
          )}
          {entry.status === 'posted' && !entry.reversal_of_id && (
            <Button variant="outline" size="sm" onClick={handleVoid} disabled={voiding} className="text-destructive border-destructive hover:bg-destructive/10">
              {voiding && <Loader2Icon className="h-4 w-4 mr-1 animate-spin" />}
              Void
            </Button>
          )}
        </div>
      </div>

      {/* Entry Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{fmtDate(entry.transaction_date)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Posting Date</span><span>{fmtDate(entry.posting_date || '')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fiscal Period</span><span>{entry.fiscal_periods?.period_name || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span>{entry.reference_number || '—'}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Description</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-muted-foreground">{entry.description || '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Audit Trail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{fmtDate(entry.created_at)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Posted By</span><span>{entry.posted_by || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Posted At</span><span>{fmtDate(entry.posted_at || '')}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Balance Summary */}
      <div className={`p-4 rounded-lg border ${entry.status === 'posted' ? 'bg-emerald-50 border-emerald-200' : entry.status === 'draft' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex justify-between items-center">
          <div className="flex gap-8">
            <div>
              <div className="text-sm text-muted-foreground">Total Debit</div>
              <div className="text-xl font-bold text-emerald-600">{fmt(entry.total_debit)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total Credit</div>
              <div className="text-xl font-bold text-destructive">{fmt(entry.total_credit)}</div>
            </div>
          </div>
          <div className="text-lg font-bold">
            {Math.abs((entry.total_debit || 0) - (entry.total_credit || 0)) < 0.01 ? '✓ Balanced' : '⚠ Imbalanced'}
          </div>
        </div>
      </div>

      {/* Journal Lines */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Journal Lines</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-background border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Account</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Debit</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entry.journal_lines?.map((line) => (
                <tr key={line.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm text-muted-foreground">{line.line_number}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium">{line.coa?.account_code} — {line.coa?.account_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{line.coa?.account_type} | Normal: {line.coa?.normal_balance}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{line.line_description || '—'}</td>
                  <td className="px-4 py-3 text-sm text-right text-emerald-600 font-medium">{line.debit_amount ? fmt(line.debit_amount) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-right text-destructive font-medium">{line.credit_amount ? fmt(line.credit_amount) : '—'}</td>
                </tr>
              )) || (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No lines</td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold">Total</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-emerald-600">{fmt(entry.total_debit)}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-destructive">{fmt(entry.total_credit)}</td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
