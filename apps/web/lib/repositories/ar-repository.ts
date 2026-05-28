import { createAdminClient } from '../supabase-server'

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceType = 'one_time' | 'recurring'
export type StatusBayar = 'belum' | 'sebagian' | 'lunas' | 'jatuh_tempo'
export type StatusKirim = 'reminder' | 'sent'
export type RecurringInterval = 'monthly' | 'quarterly' | 'biannual' | 'annual'

export interface ARBankAccount {
  id: string
  kode: string
  nama_bank: string
  nama_akun: string
  no_rekening: string
  label: string
}

export interface ARPaymentHistory {
  id: string
  invoice_id: string
  sudah_dibayar_lama: number
  sisa_piutang_lama: number
  bayar_sekarang: number
  status_baru: string
  bank_label: string
  deadline_baru?: string
  catatan_pembayaran: string
  created_at: string
  actor_name: string
}

export interface ARInvoice {
  id: string
  no_invoice: string
  tgl_invoice: string
  tipe_invoice: InvoiceType
  description: string
  qty: number
  harga_satuan: number
  ppn_11_persen: boolean
  subtotal: number
  ppn_amount: number
  total_piutang: number
  sudah_dibayar: number
  sisa_piutang: number
  note_termin: string
  payment_method: string
  bank_id?: string
  bank_label: string
  deadline_bayar?: string
  days_overdue: number
  status_bayar: StatusBayar
  status_kirim: StatusKirim
  is_archived: boolean
  project_id: string
  project_name: string
  client_name: string
  nilai_kontrak: number
  recurring_parent_id?: string
  recurring_sequence?: number
  recurring_interval?: RecurringInterval
  recurring_start_date?: string
  recurring_end_date?: string
  payment_history?: ARPaymentHistory[]
  created_at: string
}

export interface ARProjectGroup {
  project_id: string
  project_name: string
  client_name: string
  nilai_kontrak: number
  total_piutang: number
  sudah_dibayar: number
  sisa_piutang: number
  status_project: StatusBayar
  is_archived: boolean
  invoice_count: number
  invoices: ARInvoice[]
}

export interface ARSummary {
  total_piutang: number
  sudah_dibayar: number
  collection_pct: number
  sisa_piutang: number
  outstanding_pct: number
  jatuh_tempo_count: number
  total_invoice_count: number
  dso_hari: number
}

export interface CreateInvoicePayload {
  project_id: string
  tipe_invoice: InvoiceType
  no_invoice?: string
  tgl_invoice: string
  description?: string
  qty: number
  harga_satuan: number
  ppn_11_persen: boolean
  recurring_start_date?: string
  recurring_end_date?: string
  recurring_interval?: RecurringInterval
  sudah_dibayar?: number
  note_termin?: string
  payment_method?: string
  bank_id?: string
  deadline_bayar?: string
  status_bayar: StatusBayar
}

export interface UpdatePaymentPayload {
  bayar_sekarang: number
  status_baru: StatusBayar
  bank_id: string
  deadline_baru?: string
  catatan_pembayaran?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getTenantId(): Promise<string> {
  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('user_id', '00000000-0000-0000-0000-000000000000')
    .single()
  return profile?.tenant_id || '00000000-0000-0000-0000-000000000001'
}

function deriveProjectStatus(invoices: ARInvoice[]): StatusBayar {
  let hasOverdue = false
  let hasSebagian = false
  let allLunas = true
  for (const inv of invoices) {
    switch (inv.status_bayar) {
      case 'jatuh_tempo': hasOverdue = true; allLunas = false; break
      case 'sebagian': hasSebagian = true; allLunas = false; break
      case 'belum': allLunas = false; break
    }
  }
  if (hasOverdue) return 'jatuh_tempo'
  if (allLunas) return 'lunas'
  if (hasSebagian) return 'sebagian'
  return 'belum'
}

function computeDaysOverdue(inv: ARInvoice): number {
  if (!inv.deadline_bayar || inv.status_bayar === 'lunas') return 0
  const deadline = new Date(inv.deadline_bayar)
  const today = new Date()
  if (deadline < today) {
    return Math.floor((today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24))
  }
  return 0
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export async function getARSummary(tenantId?: string): Promise<ARSummary> {
  const tid = tenantId || await getTenantId()
  const supabase = createAdminClient()

  const { data: rows, error } = await supabase.rpc('ar_get_summary', { p_tenant_id: tid })
  if (error) {
    // Fallback: query directly
    const { data: invs } = await supabase
      .schema('ar').from('invoices')
      .select('total_piutang,sudah_dibayar,sisa_piutang,status_bayar,updated_at,tgl_invoice')
      .eq('tenant_id', tid)
      .is('deleted_at', null)
      .eq('is_archived', false)

    let totalPiutang = 0, sudahDibayar = 0, sisaPiutang = 0, jatuhTempo = 0, count = 0, dsoSum = 0, dsoCount = 0
    for (const inv of (invs || [])) {
      totalPiutang += Number(inv.total_piutang || 0)
      sudahDibayar += Number(inv.sudah_dibayar || 0)
      sisaPiutang += Number(inv.sisa_piutang || 0)
      count++
      if (inv.status_bayar === 'jatuh_tempo') jatuhTempo++
      if (inv.status_bayar === 'lunas' && inv.updated_at && inv.tgl_invoice) {
        const days = Math.floor((new Date(inv.updated_at).getTime() - new Date(inv.tgl_invoice).getTime()) / (1000 * 60 * 60 * 24))
        if (days >= 0) { dsoSum += days; dsoCount++ }
      }
    }
    return {
      total_piutang: totalPiutang,
      sudah_dibayar: sudahDibayar,
      collection_pct: totalPiutang > 0 ? +(sudahDibayar / totalPiutang * 100).toFixed(1) : 0,
      sisa_piutang: sisaPiutang,
      outstanding_pct: totalPiutang > 0 ? +(sisaPiutang / totalPiutang * 100).toFixed(1) : 0,
      jatuh_tempo_count: jatuhTempo,
      total_invoice_count: count,
      dso_hari: dsoCount > 0 ? +(dsoSum / dsoCount).toFixed(1) : 0,
    }
  }
  return rows as ARSummary
}

// ─── List Grouped ─────────────────────────────────────────────────────────────

export interface ListFilters {
  status_bayar?: string
  search?: string
  page?: number
  size?: number
}

export async function listARInvoicesGrouped(filters: ListFilters = {}, tenantId?: string): Promise<{ groups: ARProjectGroup[], total: number }> {
  const tid = tenantId || await getTenantId()
  const supabase = createAdminClient()

  let query = supabase
    .schema('ar').from('invoices')
    .select('*')
    .eq('tenant_id', tid)
    .is('deleted_at', null)
    .order('project_id', { ascending: true })
    .order('tgl_invoice', { ascending: true })

  if (filters.status_bayar === 'arsip') {
    query = query.eq('is_archived', true)
  } else {
    query = query.eq('is_archived', false)
    if (filters.status_bayar) {
      query = query.eq('status_bayar', filters.status_bayar)
    }
  }

  if (filters.search) {
    query = query.or(`project_name.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`)
  }

  const { data: invoices, error } = await query.limit(filters.size || 500)
  if (error) throw error

  // Group by project
  const projectMap = new Map<string, ARProjectGroup>()
  const allProjectIds = new Set<string>()
  for (const raw of (invoices || [])) {
    const inv: ARInvoice = {
      ...raw,
      qty: Number(raw.qty),
      harga_satuan: Number(raw.harga_satuan),
      subtotal: Number(raw.subtotal),
      ppn_amount: Number(raw.ppn_amount),
      total_piutang: Number(raw.total_piutang),
      sudah_dibayar: Number(raw.sudah_dibayar),
      sisa_piutang: Number(raw.sisa_piutang),
      nilai_kontrak: Number(raw.nilai_kontrak),
      days_overdue: computeDaysOverdue(raw as ARInvoice),
    } as ARInvoice

    allProjectIds.add(inv.project_id)
    let g = projectMap.get(inv.project_id)
    if (!g) {
      g = {
        project_id: inv.project_id,
        project_name: inv.project_name,
        client_name: inv.client_name,
        nilai_kontrak: inv.nilai_kontrak,
        total_piutang: 0,
        sudah_dibayar: 0,
        sisa_piutang: 0,
        status_project: 'belum',
        is_archived: true,
        invoice_count: 0,
        invoices: [],
      }
      projectMap.set(inv.project_id, g)
    }
    g.total_piutang += inv.total_piutang
    g.sudah_dibayar += inv.sudah_dibayar
    g.sisa_piutang += inv.sisa_piutang
    g.invoice_count++
    if (!inv.is_archived) g.is_archived = false
    g.invoices.push(inv)
  }

  const groups: ARProjectGroup[] = []
  for (const g of projectMap.values()) {
    g.status_project = deriveProjectStatus(g.invoices)
    groups.push(g)
  }

  return { groups, total: allProjectIds.size }
}

// ─── Get Detail ───────────────────────────────────────────────────────────────

export async function getARInvoiceById(id: string, tenantId?: string): Promise<ARInvoice | null> {
  const tid = tenantId || await getTenantId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('ar').from('invoices')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tid)
    .is('deleted_at', null)
    .single()
  if (error || !data) return null
  const inv = data as ARInvoice
  inv.days_overdue = computeDaysOverdue(inv)
  // Fetch payment history
  const { data: hist } = await supabase
    .schema('ar').from('payment_history')
    .select('*')
    .eq('invoice_id', id)
    .order('created_at', { ascending: false })
  inv.payment_history = (hist || []) as ARPaymentHistory[]
  return inv
}

// ─── Create Invoice ───────────────────────────────────────────────────────────

export async function createARInvoice(payload: CreateInvoicePayload, actorId?: string, tenantId?: string): Promise<ARInvoice[]> {
  const tid = tenantId || await getTenantId()
  const supabase = createAdminClient()

  // Fetch project info
  const { data: project } = await supabase
    .from('projects')
    .select('project_name, client_id, budget_amount')
    .eq('id', payload.project_id)
    .single()
  // Fetch client name from contacts/customers
  let clientName = ''
  if (project?.client_id) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('name')
      .eq('id', project.client_id)
      .maybeSingle()
    if (contact?.name) clientName = contact.name
    // fallback: try customers table
    if (!clientName) {
      const { data: cust } = await supabase
        .from('customers')
        .select('name')
        .eq('id', project.client_id)
        .maybeSingle()
      if (cust?.name) clientName = cust.name
    }
  }

  const projectName = project?.project_name || ''
  const nilaiKontrak = Number(project?.budget_amount || 0)
  // clientName already defined above
  // nilaiKontrak already defined above

  // Generate invoice number if not provided
  let noInvoice = payload.no_invoice
  if (!noInvoice) {
    const dateKey = payload.tgl_invoice.replace(/-/g, '')
    const { data: seqRow } = await supabase
      .from('doc_sequences')
      .select('last_seq')
      .eq('tenant_id', tid)
      .eq('prefix', 'INV')
      .eq('year_month', dateKey)
      .single()
    const seq = (seqRow?.last_seq || 0) + 1
    noInvoice = `INV-${dateKey}-${String(seq).padStart(3, '0')}`
    // Upsert sequence
    await supabase.from('doc_sequences').upsert({
      tenant_id: tid, prefix: 'INV', year_month: dateKey, last_seq: seq,
    }, { onConflict: 'tenant_id,prefix,year_month' })
  }

  // Check duplicate
  const { data: dup } = await supabase
    .schema('ar').from('invoices')
    .select('id')
    .eq('tenant_id', tid)
    .eq('no_invoice', noInvoice)
    .maybeSingle()
  if (dup) throw new Error(`AR_DUPLICATE_NO_INVOICE: No invoice ${noInvoice} already exists`)

  const statusKirim: StatusKirim = payload.tipe_invoice === 'recurring' ? 'reminder' : 'sent'

  const base = {
    tenant_id: tid,
    project_id: payload.project_id,
    project_name: projectName,
    client_name: clientName,
    nilai_kontrak: nilaiKontrak,
    no_invoice: noInvoice,
    tgl_invoice: payload.tgl_invoice,
    tipe_invoice: payload.tipe_invoice,
    description: payload.description || '',
    qty: payload.qty,
    harga_satuan: payload.harga_satuan,
    ppn_11_persen: payload.ppn_11_persen,
    sudah_dibayar: payload.sudah_dibayar || 0,
    note_termin: payload.note_termin || '',
    payment_method: payload.payment_method || 'BCA',
    bank_id: payload.bank_id || null,
    deadline_bayar: payload.deadline_bayar || null,
    status_bayar: payload.status_bayar,
    status_kirim: statusKirim,
    created_by: actorId || null,
  }

  // One-time
  if (payload.tipe_invoice === 'one_time') {
    const { data, error } = await supabase.schema('ar').from('invoices').insert(base).select().single()
    if (error) throw error
    return [data as ARInvoice]
  }

  // Recurring
  if (!payload.recurring_start_date || !payload.recurring_end_date || !payload.recurring_interval) {
    throw new Error('AR_INVALID_RECURRING_DATES: start_date, end_date, interval required')
  }
  const start = new Date(payload.recurring_start_date)
  const end = new Date(payload.recurring_end_date)
  if (start >= end) throw new Error('AR_INVALID_RECURRING_DATES: end_date must be after start_date')

  // Generate termin dates
  const dates: string[] = []
  let cur = new Date(start)
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0])
    const next = new Date(cur)
    switch (payload.recurring_interval) {
      case 'monthly': next.setMonth(next.getMonth() + 1); break
      case 'quarterly': next.setMonth(next.getMonth() + 3); break
      case 'biannual': next.setMonth(next.getMonth() + 6); break
      case 'annual': next.setFullYear(next.getFullYear() + 1); break
    }
    cur = next
  }
  if (dates.length === 0) throw new Error('No termin dates generated')

  // Generate all invoices
  const invoices: any[] = []
  let parentId: string | null = null
  for (let i = 0; i < dates.length; i++) {
    const tgl = dates[i]
    const dateKey = tgl.replace(/-/g, '')
    const { data: seqRow } = await supabase
      .from('doc_sequences')
      .select('last_seq')
      .eq('tenant_id', tid)
      .eq('prefix', 'INV')
      .eq('year_month', dateKey)
      .single()
    const seq = (seqRow?.last_seq || 0) + 1
    const termNo = `INV-${dateKey}-${String(seq).padStart(3, '0')}`
    await supabase.from('doc_sequences').upsert({
      tenant_id: tid, prefix: 'INV', year_month: dateKey, last_seq: seq,
    }, { onConflict: 'tenant_id,prefix,year_month' })

    const inv = {
      ...base,
      id: crypto.randomUUID(),
      no_invoice: termNo,
      tgl_invoice: tgl,
      recurring_start_date: payload.recurring_start_date,
      recurring_end_date: payload.recurring_end_date,
      recurring_interval: payload.recurring_interval,
      recurring_parent_id: i === 0 ? null : parentId,
      recurring_sequence: i + 1,
    }
    invoices.push(inv)
    if (i === 0) parentId = inv.id
  }

  // Update children parent_id
  for (let i = 1; i < invoices.length; i++) {
    invoices[i].recurring_parent_id = parentId
  }

  const { data, error } = await supabase.schema('ar').from('invoices').insert(invoices).select()
  if (error) throw error
  return (data || []) as ARInvoice[]
}

// ─── Update Payment ───────────────────────────────────────────────────────────

export async function updateARPayment(
  invoiceId: string,
  payload: UpdatePaymentPayload,
  actorId?: string,
  actorName?: string,
  tenantId?: string,
): Promise<void> {
  const tid = tenantId || await getTenantId()
  const supabase = createAdminClient()

  // Fetch current invoice
  const { data: inv, error: fetchErr } = await supabase
    .schema('ar').from('invoices')
    .select('sudah_dibayar,sisa_piutang,total_piutang,is_archived')
    .eq('id', invoiceId)
    .eq('tenant_id', tid)
    .single()
  if (fetchErr || !inv) throw new Error('Invoice not found')
  if (inv.is_archived) throw new Error('AR_INVOICE_ARCHIVED: cannot edit archived invoice')
  if (payload.bayar_sekarang > Number(inv.sisa_piutang) + 0.001) {
    throw new Error(`AR_OVERPAY: bayar_sekarang exceeds sisa_piutang`)
  }

  // Get bank label
  let bankLabel = ''
  if (payload.bank_id) {
    const { data: bank } = await supabase
      .schema('ar').from('bank_accounts')
      .select('kode,nama_bank,nama_akun')
      .eq('id', payload.bank_id)
      .single()
    if (bank) bankLabel = `${bank.kode} - ${bank.nama_bank} ${bank.nama_akun}`
  }

  // Insert payment history
  const { error: histErr } = await supabase.schema('ar').from('payment_history').insert({
    tenant_id: tid,
    invoice_id: invoiceId,
    sudah_dibayar_lama: inv.sudah_dibayar,
    sisa_piutang_lama: inv.sisa_piutang,
    bayar_sekarang: payload.bayar_sekarang,
    status_baru: payload.status_baru,
    bank_id: payload.bank_id,
    bank_label: bankLabel,
    deadline_baru: payload.deadline_baru || null,
    catatan_pembayaran: payload.catatan_pembayaran || '',
    created_by: actorId || null,
    actor_name: actorName || '',
  })
  if (histErr) throw histErr

  // Update invoice
  const newPaid = Number(inv.sudah_dibayar) + payload.bayar_sekarang
  const update: any = {
    sudah_dibayar: newPaid,
    status_bayar: payload.status_baru,
    bank_id: payload.bank_id,
    bank_label: bankLabel,
    updated_at: new Date().toISOString(),
    updated_by: actorId || null,
  }
  if (payload.deadline_baru) update.deadline_bayar = payload.deadline_baru

  const { error: updErr } = await supabase.schema('ar').from('invoices').update(update).eq('id', invoiceId).eq('tenant_id', tid)
  if (updErr) throw updErr
}

// ─── Archive ──────────────────────────────────────────────────────────────────

export async function archiveARInvoice(invoiceId: string, actorId?: string, tenantId?: string): Promise<void> {
  const tid = tenantId || await getTenantId()
  const supabase = createAdminClient()
  const { error } = await supabase
    .schema('ar').from('invoices')
    .update({ is_archived: true, archived_at: new Date().toISOString(), archived_by: actorId || null, updated_at: new Date().toISOString() })
    .eq('id', invoiceId)
    .eq('tenant_id', tid)
  if (error) throw error
}

export async function archiveARProject(projectId: string, actorId?: string, tenantId?: string): Promise<void> {
  const tid = tenantId || await getTenantId()
  const supabase = createAdminClient()
  const { error } = await supabase
    .schema('ar').from('invoices')
    .update({ is_archived: true, archived_at: new Date().toISOString(), archived_by: actorId || null, updated_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('tenant_id', tid)
    .is('deleted_at', null)
    .eq('is_archived', false)
  if (error) throw error
}

// ─── Bulk Status Kirim ────────────────────────────────────────────────────────

export async function bulkUpdateStatusKirim(invoiceIds: string[], tenantId?: string): Promise<void> {
  const tid = tenantId || await getTenantId()
  const supabase = createAdminClient()
  const { error } = await supabase
    .schema('ar').from('invoices')
    .update({ status_kirim: 'sent', updated_at: new Date().toISOString() })
    .eq('tenant_id', tid)
    .eq('tipe_invoice', 'recurring')
    .eq('status_kirim', 'reminder')
    .in('id', invoiceIds)
  if (error) throw error
}

// ─── Next Invoice Number ──────────────────────────────────────────────────────

export async function nextInvoiceNumber(dateStr: string, tenantId?: string): Promise<string> {
  const tid = tenantId || await getTenantId()
  const supabase = createAdminClient()
  const dateKey = dateStr.replace(/-/g, '')
  const { data: seqRow } = await supabase
    .from('doc_sequences')
    .select('last_seq')
    .eq('tenant_id', tid)
    .eq('prefix', 'INV')
    .eq('year_month', dateKey)
    .single()
  const seq = (seqRow?.last_seq || 0) + 1
  return `INV-${dateKey}-${String(seq).padStart(3, '0')}`
}

// ─── Bank Accounts ────────────────────────────────────────────────────────────

export async function listARBankAccounts(tenantId?: string): Promise<ARBankAccount[]> {
  const tid = tenantId || await getTenantId()
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .schema('ar').from('bank_accounts')
    .select('*')
    .eq('tenant_id', tid)
    .eq('is_active', true)
    .order('kode')
  if (error) throw error
  return (data || []).map(b => ({
    ...b,
    label: `${b.kode} - ${b.nama_bank} ${b.nama_akun}`,
  })) as ARBankAccount[]
}
