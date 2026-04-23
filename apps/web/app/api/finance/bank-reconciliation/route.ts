import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
  }

  const tenant_id = profile.tenant_id;

  const searchParams = req.nextUrl.searchParams;
  const bank_account_id = searchParams.get('bank_account_id');
  const status = searchParams.get('status'); // reconciled, unreconciled
  const date_from = searchParams.get('date_from');
  const date_to = searchParams.get('date_to');

  try {
    // Fetch bank accounts for this tenant
    const { data: bankAccounts, error: accountError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .order('account_name');

    if (accountError) throw accountError;

    // Build query for bank transactions
    let trxQuery = supabase
      .from('bank_transactions')
      .select(`
        *,
        bank_account:bank_accounts(account_name, bank_name, account_number),
        reconciled_by:user_profiles(full_name)
      `, { count: 'exact' })
      .eq('tenant_id', tenant_id)
      .order('transaction_date', { ascending: false });

    if (bank_account_id) {
      trxQuery = trxQuery.eq('bank_account_id', bank_account_id);
    }
    if (status === 'reconciled') {
      trxQuery = trxQuery.eq('is_reconciled', true);
    } else if (status === 'unreconciled') {
      trxQuery = trxQuery.eq('is_reconciled', false);
    }
    if (date_from) {
      trxQuery = trxQuery.gte('transaction_date', date_from);
    }
    if (date_to) {
      trxQuery = trxQuery.lte('transaction_date', date_to);
    }

    const { data: transactions, error, count } = await trxQuery;

    if (error) throw error;

    return NextResponse.json({
      accounts: bankAccounts || [],
      transactions: transactions || [],
      total: count,
      summary: {
        total_in: transactions?.reduce((sum, t) => sum + Number(t.debit_amount || 0), 0) || 0,
        total_out: transactions?.reduce((sum, t) => sum + Number(t.credit_amount || 0), 0) || 0,
        reconciled_count: transactions?.filter(t => t.is_reconciled).length || 0,
        unreconciled_count: transactions?.filter(t => !t.is_reconciled).length || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch bank reconciliation data' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ids, is_reconciled } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const { error } = await supabase
      .from('bank_transactions')
      .update({
        is_reconciled,
        reconciled_at: is_reconciled ? new Date().toISOString() : null,
        reconciled_by: is_reconciled ? user.id : null,
      })
      .in('id', ids);

    if (error) throw error;

    return NextResponse.json({ success: true, updated: ids.length });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update reconciliation status' },
      { status: 500 }
    );
  }
}
