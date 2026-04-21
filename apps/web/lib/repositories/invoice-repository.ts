import { createServerClient } from '@/lib/supabase-server'
// Temporarily use any for Database type
type Invoice = any
type InvoiceInsert = any
type InvoiceUpdate = any
type Payment = any
type PaymentInsert = any

export interface InvoiceFilters {
  search?: string
  client_id?: string
  project_id?: string
  status?: string
  min_amount?: number
  max_amount?: number
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

export interface InvoiceResult {
  data: Invoice[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface InvoiceWithDetails extends Invoice {
  client_name?: string
  project_name?: string
  quotation_number?: string
}

class InvoiceRepository {
  /**
   * List invoices with filtering and pagination
   */
  async list(filters: InvoiceFilters = {}): Promise<InvoiceResult> {
    const supabase = await createServerClient()
    
    const limit = filters.limit || 50
    const offset = filters.offset || 0

    // Build query
    let query = supabase
      .from('invoices')
      .select('*', { count: 'exact' })

    // Apply filters
    if (filters.search) {
      query = query.or(`invoice_number.ilike.%${filters.search}%`)
    }

    if (filters.client_id) {
      query = query.eq('client_id', filters.client_id)
    }

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.min_amount !== undefined) {
      query = query.gte('total_amount', filters.min_amount)
    }

    if (filters.max_amount !== undefined) {
      query = query.lte('total_amount', filters.max_amount)
    }

    if (filters.date_from) {
      query = query.gte('issue_date', filters.date_from)
    }

    if (filters.date_to) {
      query = query.lte('issue_date', filters.date_to)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    // Order by created_at desc
    query = query.order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching invoices:', error)
      throw new Error('Failed to fetch invoices')
    }

    return {
      data: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
    }
  }

  /**
   * Get single invoice by ID
   */
  async getById(id: string): Promise<InvoiceWithDetails | null> {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (
          id,
          client_name,
          client_code
        ),
        projects (
          id,
          project_name
        ),
        quotations (
          id,
          quotation_number
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching invoice:', error)
      return null
    }

    // Transform data
    const invoice = data as any
    return {
      ...invoice,
      client_name: invoice.clients?.client_name,
      project_name: invoice.projects?.project_name,
      quotation_number: invoice.quotations?.quotation_number,
    }
  }

  /**
   * Create new invoice
   */
  async create(data: InvoiceInsert): Promise<Invoice> {
    const supabase = await createServerClient()

    // Generate invoice number if not provided
    const invoiceNumber = data.invoice_number || await this.generateInvoiceNumber()

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        ...data,
        invoice_number: invoiceNumber,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invoice:', error)
      
      // Handle duplicate invoice number
      if (error.code === '23505') {
        throw new Error('Invoice number already exists')
      }
      
      throw new Error('Failed to create invoice')
    }

    return invoice
  }

  /**
   * Update invoice
   */
  async update(id: string, data: InvoiceUpdate): Promise<Invoice> {
    const supabase = await createServerClient()

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating invoice:', error)
      throw new Error('Failed to update invoice')
    }

    return invoice
  }

  /**
   * Soft delete invoice
   */
  async delete(id: string): Promise<void> {
    const supabase = await createServerClient()

    const { error } = await supabase
      .from('invoices')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'cancelled',
      })
      .eq('id', id)

    if (error) {
      console.error('Error deleting invoice:', error)
      throw new Error('Failed to delete invoice')
    }
  }

  /**
   * Send invoice to client (update status)
   */
  async send(id: string): Promise<Invoice> {
    return this.update(id, {
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
  }

  /**
   * Record payment for invoice
   */
  async recordPayment(data: PaymentInsert): Promise<Payment> {
    const supabase = await createServerClient()

    // Generate payment number
    const paymentNumber = await this.generatePaymentNumber()

    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        ...data,
        payment_number: paymentNumber,
      })
      .select()
      .single()

    if (error) {
      console.error('Error recording payment:', error)
      
      if (error.code === '23505') {
        throw new Error('Payment number already exists')
      }
      
      throw new Error('Failed to record payment')
    }

    return payment
  }

  /**
   * Get invoice statistics
   */
  async getStats(tenantId?: string): Promise<{
    total_invoices: number
    total_amount: number
    total_paid: number
    total_due: number
    overdue_count: number
    overdue_amount: number
  }> {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('invoices')
      .select('status, total_amount, amount_due, aging_days')

    if (error) {
      console.error('Error fetching invoice stats:', error)
      throw new Error('Failed to fetch invoice statistics')
    }

    const stats = {
      total_invoices: data?.length || 0,
      total_amount: 0,
      total_paid: 0,
      total_due: 0,
      overdue_count: 0,
      overdue_amount: 0,
    }

    data?.forEach((invoice: any) => {
      stats.total_amount += Number(invoice.total_amount) || 0
      
      if (invoice.status === 'paid') {
        stats.total_paid += Number(invoice.total_amount) || 0
      } else {
        stats.total_due += Number(invoice.amount_due) || 0
      }

      if (invoice.status === 'overdue' || (invoice.aging_days || 0) > 0) {
        stats.overdue_count += 1
        stats.overdue_amount += Number(invoice.amount_due) || 0
      }
    })

    return stats
  }

  /**
   * Generate unique invoice number
   * Format: INV-YYYY-MM-NNNN
   */
  private async generateInvoiceNumber(): Promise<string> {
    const supabase = await createServerClient()
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')

    // Get last invoice number for this month
    const { data } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `INV-${year}-${month}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .single()

    let sequence = 1
    if (data?.invoice_number) {
      const parts = data.invoice_number.split('-')
      const lastSeq = parseInt(parts[parts.length - 1], 10)
      sequence = lastSeq + 1
    }

    return `INV-${year}-${month}-${String(sequence).padStart(4, '0')}`
  }

  /**
   * Generate unique payment number
   * Format: PMT-YYYY-MM-NNNN
   */
  private async generatePaymentNumber(): Promise<string> {
    const supabase = await createServerClient()
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')

    // Get last payment number for this month
    const { data } = await supabase
      .from('payments')
      .select('payment_number')
      .like('payment_number', `PMT-${year}-${month}-%`)
      .order('payment_number', { ascending: false })
      .limit(1)
      .single()

    let sequence = 1
    if (data?.payment_number) {
      const parts = data.payment_number.split('-')
      const lastSeq = parseInt(parts[parts.length - 1], 10)
      sequence = lastSeq + 1
    }

    return `PMT-${year}-${month}-${String(sequence).padStart(4, '0')}`
  }
}

// Export singleton instance
export const invoiceRepository = new InvoiceRepository()
