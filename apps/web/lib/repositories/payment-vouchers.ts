import { createAdminClient } from '../supabase-server'

// ── Payment Vouchers ──────────────────────────────────

export async function getPaymentVouchers(tenantId?: string, vtype?: string, status?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('payment_vouchers')
    .select(`
      *,
      main_coa:coa!main_coa_id(account_code, account_name),
      vendor:fin_vendors!vendor_id(vendor_name),
      items:payment_voucher_items(*, coa:coa(coa_id:id, account_code, account_name))
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (tenantId) query = query.eq('tenant_id', tenantId)
  if (vtype) query = query.eq('voucher_type', vtype)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch vouchers: ${error.message}`)
  return data || []
}

export async function getPaymentVoucherById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('payment_vouchers')
    .select(`
      *,
      main_coa:coa!main_coa_id(account_code, account_name),
      vendor:fin_vendors!vendor_id(vendor_name),
      items:payment_voucher_items(*, coa:coa(coa_id:id, account_code, account_name)),
      journal:journal_entries!journal_entry_id(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) throw new Error(`Failed to fetch voucher: ${error.message}`)
  return data
}

export async function createPaymentVoucher(voucher: any) {
  const supabase = await createAdminClient()
  const { items, ...data } = voucher

  // Auto-generate voucher number
  const type = data.voucher_type || 'BBK'
  const prefix = `${type}-${new Date().toISOString().slice(0,7).replace('-','')}`
  const { data: last } = await supabase
    .from('payment_vouchers')
    .select('voucher_number')
    .ilike('voucher_number', `${prefix}-%`)
    .order('voucher_number', { ascending: false })
    .limit(1)
    .single()

  const seq = last ? parseInt(last.voucher_number.split('-')[2]) + 1 : 1
  const voucher_number = `${prefix}-${String(seq).padStart(4, '0')}`

  const { data: pv, error } = await supabase
    .from('payment_vouchers')
    .insert({ ...data, voucher_number, total_amount: data.main_amount || 0, status: 'draft' })
    .select()
    .single()

  if (error) throw new Error(`Failed to create voucher: ${error.message}`)

  // Insert items
  if (items && items.length > 0) {
    await supabase
      .from('payment_voucher_items')
      .insert(items.map((it: any) => ({ ...it, payment_voucher_id: pv.id })))
  }

  return pv
}

export async function updatePaymentVoucher(id: string, updates: any) {
  const supabase = await createAdminClient()
  const { items, ...data } = updates

  const { data: pv, error } = await supabase
    .from('payment_vouchers')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update voucher: ${error.message}`)

  // Replace items if provided
  if (items) {
    await supabase.from('payment_voucher_items').delete().eq('payment_voucher_id', id)
    if (items.length > 0) {
      await supabase.from('payment_voucher_items').insert(
        items.map((it: any) => ({ ...it, payment_voucher_id: id }))
      )
    }
  }

  return pv
}

export async function deletePaymentVoucher(id: string) {
  const supabase = await createAdminClient()
  await supabase.from('payment_vouchers').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  return { success: true }
}

// ── Get Bank & Petty Cash for Sender dropdown ─────────

export async function getSenderAccounts(tenantId?: string) {
  const supabase = await createAdminClient()

  const { data: banks, error: bErr } = await supabase
    .from('bank_accounts')
    .select('id, account_name, bank_name, account_number, current_balance, currency')
    .is('deleted_at', null)
    .eq('is_active', true)
    .eq('tenant_id', tenantId || '00000000-0000-0000-0000-000000000000')

  // Also get petty cash custodians
  const { data: pcs } = await supabase
    .from('petty_cash_custodians')
    .select('id, custodian_name as account_name, department, current_balance')
    .eq('is_active', true)
    .is('deleted_at', null)

  const bankOptions = (banks || []).map((b: any) => ({ ...b, sender_type: 'bank', label: `${b.account_name} — ${b.bank_name} (${b.account_number})` }))
  const pcOptions = (pcs || []).map((p: any) => ({ ...p, sender_type: 'petty_cash', bank_name: 'Petty Cash', account_number: '-', label: `${p.account_name} — Petty Cash (Saldo: ${p.current_balance})` }))

  return [...bankOptions, ...pcOptions]
}

// ── Get Vendors for Receiver dropdown ──────────────────

export async function getVendorOptions(tenantId?: string, limit: number = 500) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('fin_vendors')
    .select('id, vendor_name, bank_name, bank_account_number, bank_account_name')
    .is('deleted_at', null)
    .order('vendor_name', { ascending: true })
    .limit(limit)

  if (tenantId) query = query.eq('tenant_id', tenant_id)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch vendors: ${error.message}`)
  return data || []
}

// ── COA Options (Biaya + Bank/Kas) ────────────────────

export async function getCoaOptionsForVoucher(entityId?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('coa')
    .select('id, account_code, account_name, level, account_type')
    .is('deleted_at', null)
    .not('account_code', 'is', null)
    .order('account_code', { ascending: true })

  // Only include expense (5.xxxx), bank (1.1.xxxx), cash accounts
  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch COA: ${error.message}`)

  return (data || []).filter((c: any) =>
    /^5/.test(c.account_code) ||  // Biaya
    /^1\.1/.test(c.account_code) || // Kas & Bank
    /^1\.11/.test(c.account_code) ||
    /^1\.12/.test(c.account_code)
  )
}
