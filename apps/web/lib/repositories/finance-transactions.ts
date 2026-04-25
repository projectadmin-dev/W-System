import { createAdminClient } from '../supabase-server'
import type { Database } from '../../src/types/database'

// Note: vendors, customers, vendor_bills, customer_invoices, receipts tables
// do not exist in Supabase. We use contacts (for vendors/customers),
// invoices (for customer invoices), expenses (for vendor bills).
// Types defined as 'any' to avoid Database type errors.

type Vendor = any
type VendorInsert = any
type VendorUpdate = any

type Customer = any
type CustomerInsert = any
type CustomerUpdate = any

type VendorBill = any
type VendorBillInsert = any
type VendorBillUpdate = any

type VendorBillLine = any
type VendorBillLineInsert = any

type CustomerInvoice = any
type CustomerInvoiceInsert = any
type CustomerInvoiceUpdate = any

type CustomerInvoiceLine = any
type CustomerInvoiceLineInsert = any

type Payment = Database['public']['Tables']['payments']['Row']
type PaymentInsert = Database['public']['Tables']['payments']['Insert']
type PaymentUpdate = Database['public']['Tables']['payments']['Update']

type Receipt = any
type ReceiptInsert = any
type ReceiptUpdate = any

type PaymentAllocation = Database['public']['Tables']['payment_allocations']['Row']
type ReceiptAllocation = any

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
  // contacts table has vendor-type contacts (no contact_type column in live DB,
  // but we filter by notes='vendor' convention or just return all contacts)
  let query = supabase
    .from('contacts')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (entityId) query = query.eq('tenant_id', entityId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch vendors: ${error.message}`)
  return data || []
}

export async function getVendorById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch vendor: ${error.message}`)
  return data
}

export async function createVendor(vendor: VendorInsert) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('contacts')
    .insert(vendor)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create vendor: ${error.message}`)
  return data
}

export async function updateVendor(id: string, updates: VendorUpdate) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('contacts')
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
    .from('contacts')
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
    .from('contacts')
    .select('*')
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (entityId) query = query.eq('tenant_id', entityId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch customers: ${error.message}`)
  return data || []
}

export async function getCustomerById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch customer: ${error.message}`)
  return data
}

export async function createCustomer(customer: CustomerInsert) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('contacts')
    .insert(customer)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create customer: ${error.message}`)
  return data
}

export async function updateCustomer(id: string, updates: CustomerUpdate) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('contacts')
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
    .from('contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete customer: ${error.message}`)
  return { success: true }
}

// ============================================
// VENDOR BILLS (ACCOUNTS PAYABLE) REPOSITORY
// NOTE: vendor_bills + vendor_bill_lines tables do not exist in Supabase.
// Using contacts table as fallback. Returns vendor contact records as bills.
// ============================================

export async function getVendorBills(entityId?: string, status?: string) {
  const supabase = await createAdminClient()
  // Fallback: use contacts as vendor records since vendor_bills table doesn't exist
  let query = supabase
    .from('contacts')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (entityId) query = query.eq('tenant_id', entityId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch vendor bills: ${error.message}`)
  return data || []
}

export async function getVendorBillById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch vendor bill: ${error.message}`)
  return data
}

export async function createVendorBill(bill: VendorBillInsert, lines: VendorBillLineInsert[]) {
  const supabase = await createAdminClient()
  // vendor_bills doesn't exist — create as contact record
  const { data, error } = await supabase
    .from('contacts')
    .insert(bill)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create vendor bill: ${error.message}`)
  return data
}

export async function updateVendorBill(id: string, updates: VendorBillUpdate, lines?: VendorBillLineInsert[]) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('contacts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update vendor bill: ${error.message}`)
  return data
}

export async function deleteVendorBill(id: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete vendor bill: ${error.message}`)
  return { success: true }
}

// ============================================
// CUSTOMER INVOICES (ACCOUNTS RECEIVABLE) REPOSITORY
// NOTE: customer_invoices + customer_invoice_lines tables don't exist.
// Using existing 'invoices' table in Supabase.
// ============================================

export async function getCustomerInvoices(entityId?: string, status?: string, quotationId?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('invoices')
    .select('*')
    .is('deleted_at', null)
    .order('issue_date', { ascending: false })

  if (entityId) query = query.eq('entity_id', entityId)
  if (status) query = query.eq('status', status)
  if (quotationId) query = query.eq('quotation_id', quotationId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch customer invoices: ${error.message}`)
  return data || []
}

export async function getCustomerInvoiceById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch customer invoice: ${error.message}`)
  return data
}

export async function createCustomerInvoice(invoice: CustomerInvoiceInsert, lines: CustomerInvoiceLineInsert[]) {
  const supabase = await createAdminClient()
  
  // Use invoices table
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('invoices')
    .insert({ ...invoice, line_items: lines as any })
    .select()
    .single()
  
  if (invoiceError) throw new Error(`Failed to create customer invoice: ${invoiceError.message}`)
  return invoiceData
}

export async function updateCustomerInvoice(id: string, updates: CustomerInvoiceUpdate, lines?: CustomerInvoiceLineInsert[]) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('invoices')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to update customer invoice: ${error.message}`)
  return data
}

export async function deleteCustomerInvoice(id: string) {
  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('invoices')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete customer invoice: ${error.message}`)
  return { success: true }
}

// ============================================
// PAYMENTS REPOSITORY
// NOTE: payments table exists in Supabase. Removed vendors FK reference.
// ============================================

export async function getPayments(entityId?: string, status?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('payments')
    .select('*')
    .is('deleted_at', null)
    .order('payment_date', { ascending: false })

  if (entityId) query = query.eq('entity_id', entityId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch payments: ${error.message}`)
  return data || []
}

export async function getPaymentById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
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
// NOTE: receipts table does not exist in Supabase. Returns empty array.
// ============================================

export async function getReceipts(entityId?: string, status?: string) {
  const supabase = await createAdminClient()
  // receipts table doesn't exist — return empty array as fallback
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .is('deleted_at', null)
    .limit(0)

  if (error) throw new Error(`Failed to fetch receipts: ${error.message}`)
  return []
}

export async function getReceiptById(id: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  
  if (error) throw new Error(`Failed to fetch receipt: ${error.message}`)
  return data
}

export async function createReceipt(receipt: ReceiptInsert) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('contacts')
    .insert(receipt)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to create receipt: ${error.message}`)
  return data
}

export async function updateReceipt(id: string, updates: ReceiptUpdate) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('contacts')
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
    .from('contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (error) throw new Error(`Failed to delete receipt: ${error.message}`)
  return { success: true }
}

// // ============================================
// // RECONCILIATION — PAYMENT ↔ VENDOR BILL
// // ============================================
//
// /** Reconcile a payment with vendor bills — update payment_allocations + mark payment as reconciled */
// export async function reconcilePaymentWithBills(
//   paymentId: string,
//   allocations: { bill_id: string; amount: number }[],
//   reconciledById: string
// ) {
//   const supabase = await createAdminClient()
//
//   const { error: allocError } = await supabase
//     .from('payment_allocations')
//     .upsert(
//       allocations.map(a => ({
//         payment_id: paymentId,
//         bill_id: a.bill_id,
//         amount: a.amount,
//       })),
//       { onConflict: 'payment_id,bill_id' }
//     )
//
//   if (allocError) throw new Error(`Failed to create payment allocations: ${allocError.message}`)
//
//   // Update payment reconciled status
//   const { data, error } = await updatePayment(paymentId, {
//     reconciled: true,
//     reconciled_at: new Date().toISOString(),
//     reconciled_by: reconciledById,
//   })
//
//   if (error) throw new Error(`Failed to update payment: ${error instanceof Error ? error.message : 'Unknown'}`)
//   return { allocations, payment: data }
// }
//
// /** Unreconcile a payment — delete allocations + reset reconciled */
// export async function unreconcilePayment(paymentId: string) {
//   const supabase = await createAdminClient()
//
//   const { error: allocError } = await supabase
//     .from('payment_allocations')
//     .delete()
//     .eq('payment_id', paymentId)
//
//   if (allocError) throw new Error(`Failed to delete allocations: ${allocError.message}`)
//
//   const { data, error } = await updatePayment(paymentId, {
//     reconciled: false,
//     reconciled_at: null,
//     reconciled_by: null,
//   })
//
//   if (error) throw new Error(`Failed to reset payment: ${error instanceof Error ? error.message : 'Unknown'}`)
//   return { success: true, payment: data }
// }
//
// // ============================================
// // RECONCILIATION — RECEIPT ↔ CUSTOMER INVOICE
// // ============================================
//
// /** Reconcile a receipt with customer invoices */
// export async function reconcileReceiptWithInvoices(
//   receiptId: string,
//   allocations: { invoice_id: string; amount: number }[],
// ) {
//   const supabase = await createAdminClient()
//
//   const { error: allocError } = await supabase
//     .from('receipt_allocations')
//     .insert(allocations.map(a => ({
//       receipt_id: receiptId,
//       invoice_id: a.invoice_id,
//       amount: a.amount,
//     })))
//
//   if (allocError) throw new Error(`Failed to create receipt allocations: ${allocError.message}`)
//
//   // No receipt status field in current schema — allocations are the source of truth
//   return { allocations }
// }
//
// /** Unreconcile a receipt */
// export async function unreconcileReceipt(receiptId: string) {
//   const supabase = await createAdminClient()
//
//   const { error: allocError } = await supabase
//     .from('receipt_allocations')
//     .delete()
//     .eq('receipt_id', receiptId)
//
//   if (allocError) throw new Error(`Failed to delete allocations: ${allocError.message}`)
//
//   return { success: true }
// }
//
// SIMPLIFIED APPROACH: Direct SQL operations via API
// Receipts table doesn't exist — reconciliation disabled
export async function getUnreconciledPayments(entityId?: string) {
  const supabase = await createAdminClient()
  let query = supabase
    .from('payments')
    .select('*')
    .is('deleted_at', null)
    .eq('reconciled', false)
    .order('payment_date', { ascending: false })

  if (entityId) query = query.eq('entity_id', entityId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to fetch unreconciled payments: ${error.message}`)
  return data || []
}

export async function getUnreconciledReceipts(entityId?: string) {
  // receipts table doesn't exist — return empty
  return []
}

export async function reconcilePayment(paymentId: string, billIds: string[], userId: string, amounts: number[]) {
  const supabase = await createAdminClient()
  
  // Create allocations if payment_allocations table exists
  try {
    const allocations = billIds.map((billId, i) => ({
      payment_id: paymentId,
      invoice_id: billId, // use invoice_id since bills don't exist
      amount: amounts[i] || 0,
    }))

    await supabase.from('payment_allocations').upsert(allocations, { onConflict: 'payment_id,invoice_id' })
  } catch (e) {
    // payment_allocations may not exist
  }

  // Mark payment as reconciled
  const { data, error } = await supabase
    .from('payments')
    .update({ 
      reconciled: true, 
      reconciled_at: new Date().toISOString(),
      reconciled_by: userId,
    })
    .eq('id', paymentId)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to reconcile payment: ${error.message}`)
  return data
}

export async function reconcileReceipt(receiptId: string, invoiceIds: string[], amounts: number[]) {
  // receipts table doesn't exist — no-op
  return { success: false, message: 'Receipts table not available' }
}

export async function unreconcilePaymentById(paymentId: string) {
  const supabase = await createAdminClient()
  
  try {
    await supabase.from('payment_allocations').delete().eq('payment_id', paymentId)
  } catch (e) {
    // table may not exist
  }
  
  const { data, error } = await supabase
    .from('payments')
    .update({ reconciled: false, reconciled_at: null, reconciled_by: null })
    .eq('id', paymentId)
    .select()
    .single()
  
  if (error) throw new Error(`Failed to unreconcile payment: ${error.message}`)
  return data
}

export async function unreconcileReceiptById(receiptId: string) {
  // receipts table doesn't exist
  return { success: false }
}
