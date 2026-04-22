import { createAdminClient } from '../supabase-server'
import type { Database } from '../../src/types/database'

type Vendor = Database['public']['Tables']['vendors']['Row']
type VendorInsert = Database['public']['Tables']['vendors']['Insert']
type VendorUpdate = Database['public']['Tables']['vendors']['Update']

type Customer = Database['public']['Tables']['customers']['Row']
type CustomerInsert = Database['public']['Tables']['customers']['Insert']
type CustomerUpdate = Database['public']['Tables']['customers']['Update']

type VendorBill = Database['public']['Tables']['vendor_bills']['Row']
type VendorBillInsert = Database['public']['Tables']['vendor_bills']['Insert']
type VendorBillUpdate = Database['public']['Tables']['vendor_bills']['Update']

type VendorBillLine = Database['public']['Tables']['vendor_bill_lines']['Row']
type VendorBillLineInsert = Database['public']['Tables']['vendor_bill_lines']['Insert']

type CustomerInvoice = Database['public']['Tables']['customer_invoices']['Row']
type CustomerInvoiceInsert = Database['public']['Tables']['customer_invoices']['Insert']
type CustomerInvoiceUpdate = Database['public']['Tables']['customer_invoices']['Update']

type CustomerInvoiceLine = Database['public']['Tables']['customer_invoice_lines']['Row']
type CustomerInvoiceLineInsert = Database['public']['Tables']['customer_invoice_lines']['Insert']

type Payment = Database['public']['Tables']['payments']['Row']
type PaymentInsert = Database['public']['Tables']['payments']['Insert']
type PaymentUpdate = Database['public']['Tables']['payments']['Update']

type Receipt = Database['public']['Tables']['receipts']['Row']
type ReceiptInsert = Database['public']['Tables']['receipts']['Insert']
type ReceiptUpdate = Database['public']['Tables']['receipts']['Update']

type PaymentAllocation = Database['public']['Tables']['payment_allocations']['Row']
type ReceiptAllocation = Database['public']['Tables']['receipt_allocations']['Row']

/**
 * Core Transactions Repository
 * PSAK 13 & 23 compliant - Accounts Payable, Receivable, Payments, Receipts
 * 
 * Uses Admin Client for server-side operations to bypass RLS
 */

// ============================================
// VENDOR REPOSITORY
// ============================================

export async function getVendors(entityId?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('vendors')
    .select('*, coa:coa_id(account_code, account_name)')
    .is('deleted_at', null)
    .order('vendor_code', { ascending: true })

  if (entityId) query = query.eq('entity_id', entityId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch vendors: ${error.message}`)
  return data || []
}

export async function getVendorById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('vendors')
    .select('*, coa:coa_id(account_code, account_name)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch vendor: ${error.message}`)
  return data
}

export async function createVendor(vendor: VendorInsert) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('vendors')
    .insert(vendor)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create vendor: ${error.message}`)
  return data
}

export async function updateVendor(id: string, updates: VendorUpdate) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('vendors')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update vendor: ${error.message}`)
  return data
}

export async function deleteVendor(id: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('vendors')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete vendor: ${error.message}`)
  return { success: true }
}

// ============================================
// CUSTOMER REPOSITORY
// ============================================

export async function getCustomers(entityId?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('customers')
    .select('*, coa:coa_id(account_code, account_name)')
    .is('deleted_at', null)
    .order('customer_code', { ascending: true })

  if (entityId) query = query.eq('entity_id', entityId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch customers: ${error.message}`)
  return data || []
}

export async function getCustomerById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*, coa:coa_id(account_code, account_name)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch customer: ${error.message}`)
  return data
}

export async function createCustomer(customer: CustomerInsert) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create customer: ${error.message}`)
  return data
}

export async function updateCustomer(id: string, updates: CustomerUpdate) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('customers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update customer: ${error.message}`)
  return data
}

export async function deleteCustomer(id: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('customers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete customer: ${error.message}`)
  return { success: true }
}

// ============================================
// VENDOR BILLS (ACCOUNTS PAYABLE) REPOSITORY
// ============================================

export async function getVendorBills(entityId?: string, status?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('vendor_bills')
    .select(`
      *,
      vendor:vendors(vendor_name, vendor_code),
      coa:coa_id(account_code, account_name),
      lines:vendor_bill_lines(*)
    `)
    .is('deleted_at', null)
    .order('bill_date', { ascending: false })

  if (entityId) query = query.eq('entity_id', entityId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch vendor bills: ${error.message}`)
  return data || []
}

export async function getVendorBillById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('vendor_bills')
    .select(`
      *,
      vendor:vendors(vendor_name, vendor_code),
      coa:coa_id(account_code, account_name),
      lines:vendor_bill_lines(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch vendor bill: ${error.message}`)
  return data
}

export async function createVendorBill(bill: VendorBillInsert, lines: VendorBillLineInsert[]) {
  const supabase = await createAdminClient()
  
  // Insert bill
  const { data: billData, error: billError } = await supabase
    .from('vendor_bills')
    .insert(bill)
    .select()
    .single()
  
  if (billError) throw new Error(`Failed to create vendor bill: ${billError.message}`)
  
  // Insert lines
  if (lines.length > 0) {
    const { error: linesError } = await supabase
      .from('vendor_bill_lines')
      .insert(lines.map(line => ({ ...line, bill_id: billData.id })))
    
    if (linesError) throw new Error(`Failed to create bill lines: ${linesError.message}`)
  }
  
  return billData
}

export async function updateVendorBill(id: string, updates: VendorBillUpdate, lines?: VendorBillLineInsert[]) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('vendor_bills')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update vendor bill: ${error.message}`)
  
  // Update lines if provided
  if (lines && lines.length > 0) {
    // Delete existing lines
    const { error: deleteError } = await supabase
      .from('vendor_bill_lines')
      .delete()
      .eq('bill_id', id)
    
    if (deleteError) throw new Error(`Failed to delete existing bill lines: ${deleteError.message}`)
    
    // Insert new lines
    const { error: linesError } = await supabase
      .from('vendor_bill_lines')
      .insert(lines.map(line => ({ ...line, bill_id: id })))
    
    if (linesError) throw new Error(`Failed to create bill lines: ${linesError.message}`)
  }
  
  return data
}

export async function deleteVendorBill(id: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('vendor_bills')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete vendor bill: ${error.message}`)
  return { success: true }
}

// ============================================
// CUSTOMER INVOICES (ACCOUNTS RECEIVABLE) REPOSITORY
// ============================================

export async function getCustomerInvoices(entityId?: string, status?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('customer_invoices')
    .select(`
      *,
      customer:customers(customer_name, customer_code),
      coa:coa_id(account_code, account_name),
      lines:customer_invoice_lines(*)
    `)
    .is('deleted_at', null)
    .order('invoice_date', { ascending: false })

  if (entityId) query = query.eq('entity_id', entityId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch customer invoices: ${error.message}`)
  return data || []
}

export async function getCustomerInvoiceById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('customer_invoices')
    .select(`
      *,
      customer:customers(customer_name, customer_code),
      coa:coa_id(account_code, account_name),
      lines:customer_invoice_lines(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch customer invoice: ${error.message}`)
  return data
}

export async function createCustomerInvoice(invoice: CustomerInvoiceInsert, lines: CustomerInvoiceLineInsert[]) {
  const supabase = await createAdminClient()
  
  // Insert invoice
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('customer_invoices')
    .insert(invoice)
    .select()
    .single()
  
  if (invoiceError) throw new Error(`Failed to create customer invoice: ${invoiceError.message}`)
  
  // Insert lines
  if (lines.length > 0) {
    const { error: linesError } = await supabase
      .from('customer_invoice_lines')
      .insert(lines.map(line => ({ ...line, invoice_id: invoiceData.id })))
    
    if (linesError) throw new Error(`Failed to create invoice lines: ${linesError.message}`)
  }
  
  return invoiceData
}

export async function updateCustomerInvoice(id: string, updates: CustomerInvoiceUpdate, lines?: CustomerInvoiceLineInsert[]) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('customer_invoices')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update customer invoice: ${error.message}`)
  
  // Update lines if provided
  if (lines && lines.length > 0) {
    // Delete existing lines
    const { error: deleteError } = await supabase
      .from('customer_invoice_lines')
      .delete()
      .eq('invoice_id', id)
    
    if (deleteError) throw new Error(`Failed to delete existing invoice lines: ${deleteError.message}`)
    
    // Insert new lines
    const { error: linesError } = await supabase
      .from('customer_invoice_lines')
      .insert(lines.map(line => ({ ...line, invoice_id: id })))
    
    if (linesError) throw new Error(`Failed to create invoice lines: ${linesError.message}`)
  }
  
  return data
}

export async function deleteCustomerInvoice(id: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('customer_invoices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete customer invoice: ${error.message}`)
  return { success: true }
}

// ============================================
// PAYMENTS REPOSITORY
// ============================================

export async function getPayments(entityId?: string, status?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('payments')
    .select(`
      *,
      vendor:vendors(vendor_name),
      payment_method:payment_methods(method_name),
      allocations:payment_allocations(*)
    `)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false })

  if (entityId) query = query.eq('entity_id', entityId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch payments: ${error.message}`)
  return data || []
}

export async function getPaymentById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      vendor:vendors(vendor_name),
      payment_method:payment_methods(method_name),
      allocations:payment_allocations(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch payment: ${error.message}`)
  return data
}

export async function createPayment(payment: PaymentInsert) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create payment: ${error.message}`)
  return data
}

export async function updatePayment(id: string, updates: PaymentUpdate) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('payments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update payment: ${error.message}`)
  return data
}

export async function deletePayment(id: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('payments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete payment: ${error.message}`)
  return { success: true }
}

export async function createPaymentAllocation(paymentId: string, billId: string, amount: number) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('payment_allocations')
    .insert({ payment_id: paymentId, bill_id: billId, amount })
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create payment allocation: ${error.message}`)
  return data
}

// ============================================
// RECEIPTS REPOSITORY
// ============================================

export async function getReceipts(entityId?: string, status?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('receipts')
    .select(`
      *,
      customer:customers(customer_name),
      payment_method:payment_methods(method_name),
      allocations:receipt_allocations(*)
    `)
    .is('deleted_at', null)
    .order('receipt_date', { ascending: false })

  if (entityId) query = query.eq('entity_id', entityId)
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch receipts: ${error.message}`)
  return data || []
}

export async function getReceiptById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('receipts')
    .select(`
      *,
      customer:customers(customer_name),
      payment_method:payment_methods(method_name),
      allocations:receipt_allocations(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch receipt: ${error.message}`)
  return data
}

export async function createReceipt(receipt: ReceiptInsert) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('receipts')
    .insert(receipt)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create receipt: ${error.message}`)
  return data
}

export async function updateReceipt(id: string, updates: ReceiptUpdate) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('receipts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update receipt: ${error.message}`)
  return data
}

export async function deleteReceipt(id: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('receipts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete receipt: ${error.message}`)
  return { success: true }
}

export async function createReceiptAllocation(receiptId: string, invoiceId: string, amount: number) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('receipt_allocations')
    .insert({ receipt_id: receiptId, invoice_id: invoiceId, amount })
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create receipt allocation: ${error.message}`)
  return data
}
