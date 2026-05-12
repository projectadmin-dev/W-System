import { createAdminClient } from '../supabase-server'

export async function getPaymentVouchers(tenantId?: string, vtype?: string, status?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('payment_vouchers')
    .select('*')
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
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch voucher: ${error.message}`)
  return data
}

export async function getPaymentVoucherWithItems(id: string) {
  const supabase = await createAdminClient()
  const { data: pv, error: pvError } = await supabase
    .from('payment_vouchers')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (pvError) throw new Error(`Failed to fetch voucher: ${pvError.message}`)

  const { data: items, error: itemsError } = await supabase
    .from('payment_voucher_items')
    .select('*')
    .eq('payment_voucher_id', id)
    .order('sort_order', { ascending: true })

  if (itemsError) throw new Error(`Failed to fetch voucher items: ${itemsError.message}`)

  return { ...pv, items: items || [] }
}

export async function createPaymentVoucher(voucher: any, items: any[]) {
  const supabase = await createAdminClient()
  
  const { data: pv, error: pvError } = await supabase
    .from('payment_vouchers')
    .insert(voucher)
    .select()
    .single()
  
  if (pvError) throw new Error(`Failed to create voucher: ${pvError.message}`)
  
  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from('payment_voucher_items')
      .insert(items.map((it: any, i: number) => ({ ...it, payment_voucher_id: pv.id, sort_order: i })))
    
    if (itemsError) throw new Error(`Failed to create voucher items: ${itemsError.message}`)
  }
  
  return pv
}

export async function updatePaymentVoucher(id: string, updates: any, items?: any[]) {
  const supabase = await createAdminClient()
  
  const { data, error } = await supabase
    .from('payment_vouchers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update voucher: ${error.message}`)
  
  if (items && items.length > 0) {
    await supabase.from('payment_voucher_items').delete().eq('payment_voucher_id', id)
    const { error: itemsError } = await supabase
      .from('payment_voucher_items')
      .insert(items.map((it: any, i: number) => ({ ...it, payment_voucher_id: id, sort_order: i })))
    if (itemsError) throw new Error(`Failed to update voucher items: ${itemsError.message}`)
  }
  
  return data
}

export async function deletePaymentVoucher(id: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('payment_vouchers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete voucher: ${error.message}`)
  return { success: true }
}

export async function getPaymentVoucherOptions() {
  const supabase = await createAdminClient()
  
  const { data: banks, error: bankError } = await supabase
    .from('bank_accounts')
    .select('id, bank_name, account_name, account_number, current_balance')
    .eq('is_active', true)
    .is('deleted_at', null)

  if (bankError) throw new Error(`Failed to fetch bank accounts: ${bankError.message}`)

  const bankOptions = (banks || []).map((b: any) => ({
    ...b,
    sender_type: 'bank',
    label: `${b.bank_name} — ${b.account_number} (Saldo: ${b.current_balance})`,
  }))

  const { data: pcs, error: pcError } = await supabase
    .from('petty_cash_custodians')
    .select('id, custodian_name, account_name, current_balance, department')
    .eq('is_active', true)
    .is('deleted_at', null)

  if (pcError) throw new Error(`Failed to fetch petty cash: ${pcError.message}`)

  const pcOptions = (pcs || []).map((p: any) => ({
    ...p,
    sender_type: 'petty_cash',
    bank_name: 'Petty Cash',
    account_number: '-',
    label: `${p.custodian_name} — Petty Cash (Saldo: ${p.current_balance})`,
  }))

  const { data: vendors, error: vendorError } = await supabase
    .from('fin_vendors')
    .select('id, vendor_name, bank_name, bank_account_number, bank_account_name')
    .eq('is_active', true)
    .is('deleted_at', null)

  if (vendorError) throw new Error(`Failed to fetch vendors: ${vendorError.message}`)

  const { data: coaRows, error: coaError } = await supabase
    .from('coa')
    .select('id, account_code, account_name, account_type')
    .order('account_code', { ascending: true })

  if (coaError) throw new Error(`Failed to fetch COA: ${coaError.message}`)

  return {
    bankAccounts: bankOptions,
    pettyCash: pcOptions,
    vendors: vendors || [],
    coa: coaRows || [],
  }
}
