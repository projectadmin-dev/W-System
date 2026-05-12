import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getUnreconciledPayments,
  reconcilePaymentById,
  unreconcilePaymentById,
} from '@/lib/repositories/finance-transactions'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Helper untuk ambil user + tenant
async function getAuth(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();
  return { user, tenantId: profile?.tenant_id };
}

/**
 * GET /api/finance/payment-reconciliation
 * Query params:
 *   - type: 'payments' | 'receipts' | 'bills' | 'invoices' | 'summary'
 *   - status: 'unreconciled' | 'reconciled' (default: unreconciled)
 */
export async function GET(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const auth = await getAuth(supabase);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { user, tenantId } = auth;

  if (!tenantId) return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });

  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'summary';

  try {
    // ── Summary ──────────────────────────────────────
    if (type === 'summary') {
      // Count unreconciled payments (outgoing)
      const { count: unrecPayments, error: payErr1 } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('reconciled', false)
        .is('deleted_at', null);

      // Count unreconciled receipts (incoming)
      const { count: unrecReceipts, error: recErr1 } = await supabase
        .from('receipts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('reconciled', false)
        .is('deleted_at', null);

      // Total unapplied on vendor bills
      const { data: billStats, error: billErr } = await supabase
        .from('vendor_bills')
        .select('total_amount, amount_paid')
        .eq('tenant_id', tenantId)
        .not('status', 'in', '(paid,cancelled)')
        .is('deleted_at', null);

      // Total unapplied on customer invoices
      const { data: invStats, error: invErr } = await supabase
        .from('customer_invoices')
        .select('total_amount, amount_paid')
        .eq('tenant_id', tenantId)
        .not('status', 'in', '(paid,cancelled)')
        .is('deleted_at', null);

      if (payErr1 || recErr1 || billErr || invErr) {
        console.error('Summary error:', { payErr1, recErr1, billErr, invErr });
      }

      const totalUnreconciled = (unrecPayments || 0) + (unrecReceipts || 0);
      const totalUnappliedBills = (billStats || []).reduce((s, r) => s + Math.max(0, Number(r.total_amount || 0) - Number(r.amount_paid || 0)), 0);
      const totalUnappliedInvoices = (invStats || []).reduce((s, r) => s + Math.max(0, Number(r.total_amount || 0) - Number(r.amount_paid || 0)), 0);

      return NextResponse.json({
        unreconciled_payments: unrecPayments || 0,
        unreconciled_receipts: unrecReceipts || 0,
        total_unreconciled: totalUnreconciled,
        total_unapplied_bills: totalUnappliedBills,
        total_unapplied_invoices: totalUnappliedInvoices,
        total_unapplied: totalUnappliedBills + totalUnappliedInvoices,
      });
    }

    // ── Unreconciled Payments (Outgoing) ─────────────
    if (type === 'payments') {
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          *,
          invoice:invoices(invoice_number, total_amount),
          client:clients(client_name)
        `)
        .eq('tenant_id', tenantId)
        .eq('reconciled', false)
        .is('deleted_at', null)
        .order('payment_date', { ascending: false })
        .limit(200);

      if (error) throw error;
      return NextResponse.json({ data: payments || [] });
    }

    // ── Unreconciled Receipts (Incoming) ────────────
    if (type === 'receipts') {
      const { data: receipts, error } = await supabase
        .from('receipts')
        .select(`
          *,
          customer:customers(customer_name)
        `)
        .eq('tenant_id', tenantId)
        .eq('reconciled', false)
        .is('deleted_at', null)
        .order('receipt_date', { ascending: false })
        .limit(200);

      if (error) throw error;
      return NextResponse.json({ data: receipts || [] });
    }

    // ── Open Vendor Bills (AP) ──────────────────────
    if (type === 'bills') {
      const { data: bills, error } = await supabase
        .from('vendor_bills')
        .select(`
          *,
          vendor:vendors(vendor_name, vendor_code),
          lines:vendor_bill_lines(*)
        `)
        .eq('tenant_id', tenantId)
        .not('status', 'in', '(paid,cancelled)')
        .is('deleted_at', null)
        .order('due_date', { ascending: true })
        .limit(200);

      if (error) throw error;
      return NextResponse.json({ data: bills || [] });
    }

    // ── Open Customer Invoices (AR) ─────────────────
    if (type === 'invoices') {
      const { data: invoices, error } = await supabase
        .from('customer_invoices')
        .select(`
          *,
          customer:customers(customer_name, customer_code),
          lines:customer_invoice_lines(*)
        `)
        .eq('tenant_id', tenantId)
        .not('status', 'in', '(paid,cancelled)')
        .is('deleted_at', null)
        .order('due_date', { ascending: true })
        .limit(200);

      if (error) throw error;
      return NextResponse.json({ data: invoices || [] });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (err: any) {
    console.error('Payment Reconciliation GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch data' }, { status: 500 });
  }
}

/**
 * POST /api/finance/payment-reconciliation
 * Reconcile a payment or receipt with bills/invoices
 * Body:
 *   {
 *     type: 'payment' | 'receipt',
 *     id: string,      // payment_id or receipt_id
 *     allocations: [
 *       { target_id: string, amount: number }  // bill_id or invoice_id
 *     ]
 *   }
 */
export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const auth = await getAuth(supabase);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { user } = auth;

  try {
    const body = await request.json();
    const { type, id, allocations } = body;

    if (!type || !id || !Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (type === 'payment') {
      const targetIds = allocations.map((a: any) => a.target_id);
      const amounts = allocations.map((a: any) => a.amount);

      // Check if payment exists and is unreconciled
      const { data: payment, error: payErr } = await supabase
        .from('payments')
        .select('id, amount, reconciled')
        .eq('id', id)
        .single();
      if (payErr || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      if (payment.reconciled) return NextResponse.json({ error: 'Payment already reconciled' }, { status: 409 });

      // Insert allocations
      const { error: allocError } = await supabase
        .from('payment_allocations')
        .upsert(
          targetIds.map((tid: string, i: number) => ({
            payment_id: id,
            bill_id: tid,
            amount: amounts[i] || 0,
          })),
          { onConflict: 'payment_id,bill_id' }
        );
      if (allocError) throw new Error(allocError.message);

      // Update payment as reconciled
      const { data, error } = await supabase
        .from('payments')
        .update({
          reconciled: true,
          reconciled_at: new Date().toISOString(),
          reconciled_by: user.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, data });
    }

    if (type === 'receipt') {
      const targetIds = allocations.map((a: any) => a.target_id);
      const amounts = allocations.map((a: any) => a.amount);

      // Check receipt
      const { data: receipt, error: recErr } = await supabase
        .from('receipts')
        .select('id, amount, reconciled')
        .eq('id', id)
        .single();
      if (recErr || !receipt) return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
      if (receipt.reconciled) return NextResponse.json({ error: 'Receipt already reconciled' }, { status: 409 });

      // Insert allocations
      const { error: allocError } = await supabase
        .from('receipt_allocations')
        .upsert(
          targetIds.map((tid: string, i: number) => ({
            receipt_id: id,
            invoice_id: tid,
            amount: amounts[i] || 0,
          })),
          { onConflict: 'receipt_id,invoice_id' }
        );
      if (allocError) throw new Error(allocError.message);

      // Update receipt as reconciled
      const { data, error } = await supabase
        .from('receipts')
        .update({
          reconciled: true,
          reconciled_at: new Date().toISOString(),
          reconciled_by: user.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'Invalid type. Use payment or receipt' }, { status: 400 });
  } catch (err: any) {
    console.error('Payment Reconciliation POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to reconcile' }, { status: 500 });
  }
}

/**
 * DELETE /api/finance/payment-reconciliation
 * Unreconcile a payment or receipt
 * Body:
 *   { type: 'payment' | 'receipt', id: string }
 */
export async function DELETE(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const auth = await getAuth(supabase);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { type, id } = body;

    if (!type || !id) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (type === 'payment') {
      // Delete allocations
      await supabase.from('payment_allocations').delete().eq('payment_id', id);
      // Mark unreconciled
      const { data, error } = await supabase
        .from('payments')
        .update({
          reconciled: false,
          reconciled_at: null,
          reconciled_by: null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, data });
    }

    if (type === 'receipt') {
      await supabase.from('receipt_allocations').delete().eq('receipt_id', id);
      const { data: upd, error } = await supabase
        .from('receipts')
        .update({
          reconciled: false,
          reconciled_at: null,
          reconciled_by: null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, data: upd });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    console.error('Payment Reconciliation DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Failed to unreconcile' }, { status: 500 });
  }
}
