// W. System — AR Monitoring Service
// Business logic for AR invoices, payments, and KPI summaries.

import { createAdminClient } from '@/lib/supabase-server'
import type {
  ARBankAccount,
  ARInvoice,
  ARProjectGroup,
  ARSummary,
  ARListResponse,
  CreateInvoiceRequest,
  UpdatePaymentRequest,
  StatusBayar,
  RecurringInterval,
} from '@/types/ar'
import { previewRecurringDates } from '@/types/ar'

// ─── Bank Accounts ────────────────────────────────────────────────────────────

export async function getBankAccounts(tenantId: string): Promise<ARBankAccount[]> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('ar_bank_accounts')
    .select('id, kode, nama_bank, nama_akun, no_rekening, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('kode')

  if (error) throw new Error(error.message)

  return (data ?? []).map((b) => ({
    ...b,
    label: `${b.kode} - ${b.nama_bank} ${b.nama_akun}`,
  }))
}

// ─── Doc Number Generation ────────────────────────────────────────────────────

export async function getNextInvoiceNumber(tenantId: string, date: string): Promise<string> {
  const db = createAdminClient()
  const dateKey = date.replace(/-/g, '') // YYYYMMDD
  const prefix = `INV-${dateKey}-`

  const { count, error } = await db
    .from('ar_invoices')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .like('no_invoice', `${prefix}%`)

  if (error) throw new Error(error.message)

  const seq = String((count ?? 0) + 1).padStart(3, '0')
  return `${prefix}${seq}`
}

// ─── AR Summary KPIs ──────────────────────────────────────────────────────────

export async function getARSummary(tenantId: string): Promise<ARSummary> {
  const db = createAdminClient()

  const { data, error } = await db
    .from('ar_invoices')
    .select('total_piutang, sudah_dibayar, sisa_piutang, status_bayar, tgl_invoice, updated_at')
    .eq('tenant_id', tenantId)
    .eq('is_archived', false)
    .is('deleted_at', null)

  if (error) throw new Error(error.message)
  const rows = data ?? []

  const total_piutang = rows.reduce((s, r) => s + Number(r.total_piutang ?? 0), 0)
  const sudah_dibayar = rows.reduce((s, r) => s + Number(r.sudah_dibayar ?? 0), 0)
  const sisa_piutang = rows.reduce((s, r) => s + Number(r.sisa_piutang ?? 0), 0)
  const jatuh_tempo_count = rows.filter((r) => r.status_bayar === 'jatuh_tempo').length
  const total_invoice_count = rows.length

  const collection_pct = total_piutang > 0 ? (sudah_dibayar / total_piutang) * 100 : 0
  const outstanding_pct = total_piutang > 0 ? (sisa_piutang / total_piutang) * 100 : 0

  // DSO: avg days from tgl_invoice to updated_at for lunas invoices
  const lunasRows = rows.filter((r) => r.status_bayar === 'lunas' && r.updated_at)
  const dso_hari =
    lunasRows.length > 0
      ? Math.round(
          lunasRows.reduce((s, r) => {
            const inv = new Date(r.tgl_invoice).getTime()
            const paid = new Date(r.updated_at!).getTime()
            return s + Math.max(0, (paid - inv) / 86_400_000)
          }, 0) / lunasRows.length
        )
      : 0

  return {
    total_piutang,
    sudah_dibayar,
    collection_pct: Math.round(collection_pct * 10) / 10,
    sisa_piutang,
    outstanding_pct: Math.round(outstanding_pct * 10) / 10,
    jatuh_tempo_count,
    total_invoice_count,
    dso_hari,
  }
}

// ─── List Invoices (grouped by project) ──────────────────────────────────────

type FilterStatus = StatusBayar | 'arsip' | 'semua'

export async function listInvoicesGrouped(
  tenantId: string,
  options: {
    status?: FilterStatus
    search?: string
    page?: number
    size?: number
  }
): Promise<ARListResponse> {
  const db = createAdminClient()
  const { status = 'semua', search = '', page = 1, size = 50 } = options

  let query = db
    .from('ar_invoices')
    .select(
      `id, no_invoice, tgl_invoice, tipe_invoice, description,
       qty, harga_satuan, ppn_11_persen, subtotal, ppn_amount, total_piutang,
       sudah_dibayar, sisa_piutang, note_termin, payment_method,
       bank_id, bank_label, deadline_bayar, status_bayar, status_kirim,
       is_archived, recurring_parent_id, recurring_sequence, recurring_interval,
       recurring_start_date, recurring_end_date, created_at,
       project_id, project_name, client_name, nilai_kontrak`
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  if (status === 'arsip') {
    query = query.eq('is_archived', true)
  } else {
    query = query.eq('is_archived', false)
    if (status !== 'semua') {
      query = query.eq('status_bayar', status)
    }
  }

  if (search) {
    query = query.or(`project_name.ilike.%${search}%,client_name.ilike.%${search}%`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  const rows = data ?? []
  const today = new Date()

  // Group by project
  const projectMap = new Map<string, ARProjectGroup>()

  for (const row of rows) {
    const overdue =
      row.deadline_bayar && row.status_bayar !== 'lunas' && new Date(row.deadline_bayar) < today
        ? Math.floor((today.getTime() - new Date(row.deadline_bayar).getTime()) / 86_400_000)
        : 0

    const invoice: ARInvoice = {
      id: row.id,
      no_invoice: row.no_invoice,
      tgl_invoice: row.tgl_invoice,
      tipe_invoice: row.tipe_invoice,
      description: row.description,
      qty: Number(row.qty),
      harga_satuan: Number(row.harga_satuan),
      ppn_11_persen: row.ppn_11_persen,
      subtotal: Number(row.subtotal),
      ppn_amount: Number(row.ppn_amount),
      total_piutang: Number(row.total_piutang),
      sudah_dibayar: Number(row.sudah_dibayar),
      sisa_piutang: Number(row.sisa_piutang),
      note_termin: row.note_termin,
      payment_method: row.payment_method,
      bank_id: row.bank_id,
      bank_label: row.bank_label,
      deadline_bayar: row.deadline_bayar,
      days_overdue: overdue,
      status_bayar: row.status_bayar,
      status_kirim: row.status_kirim,
      is_archived: row.is_archived,
      recurring_parent_id: row.recurring_parent_id,
      recurring_sequence: row.recurring_sequence,
      recurring_interval: row.recurring_interval,
      recurring_start_date: row.recurring_start_date,
      recurring_end_date: row.recurring_end_date,
      created_at: row.created_at,
    }

    if (!projectMap.has(row.project_id)) {
      projectMap.set(row.project_id, {
        project_id: row.project_id,
        project_name: row.project_name,
        client_name: row.client_name,
        nilai_kontrak: Number(row.nilai_kontrak),
        total_piutang: 0,
        sudah_dibayar: 0,
        sisa_piutang: 0,
        status_project: 'belum',
        is_archived: row.is_archived,
        invoice_count: 0,
        invoices: [],
      })
    }

    const grp = projectMap.get(row.project_id)!
    grp.invoices.push(invoice)
    grp.total_piutang += invoice.total_piutang
    grp.sudah_dibayar += invoice.sudah_dibayar
    grp.sisa_piutang += invoice.sisa_piutang
    grp.invoice_count += 1
  }

  // Derive project status
  for (const grp of projectMap.values()) {
    const statuses = grp.invoices.map((i) => i.status_bayar)
    if (statuses.includes('jatuh_tempo')) grp.status_project = 'jatuh_tempo'
    else if (statuses.every((s) => s === 'lunas')) grp.status_project = 'lunas'
    else if (statuses.includes('sebagian')) grp.status_project = 'sebagian'
    else grp.status_project = 'belum'
  }

  const allGroups = Array.from(projectMap.values())
  const total = allGroups.length
  const pagedGroups = allGroups.slice((page - 1) * size, page * size)

  const summary = await getARSummary(tenantId)

  return {
    data: pagedGroups,
    meta: { page, size, total },
    summary,
  }
}

// ─── Invoice Detail + History ─────────────────────────────────────────────────

export async function getInvoiceDetail(
  tenantId: string,
  invoiceId: string
): Promise<ARInvoice | null> {
  const db = createAdminClient()

  const { data: inv, error } = await db
    .from('ar_invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !inv) return null

  const { data: history } = await db
    .from('ar_payment_history')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false })

  const today = new Date()
  const overdue =
    inv.deadline_bayar && inv.status_bayar !== 'lunas' && new Date(inv.deadline_bayar) < today
      ? Math.floor((today.getTime() - new Date(inv.deadline_bayar).getTime()) / 86_400_000)
      : 0

  return {
    id: inv.id,
    no_invoice: inv.no_invoice,
    tgl_invoice: inv.tgl_invoice,
    tipe_invoice: inv.tipe_invoice,
    description: inv.description,
    qty: Number(inv.qty),
    harga_satuan: Number(inv.harga_satuan),
    ppn_11_persen: inv.ppn_11_persen,
    subtotal: Number(inv.subtotal),
    ppn_amount: Number(inv.ppn_amount),
    total_piutang: Number(inv.total_piutang),
    sudah_dibayar: Number(inv.sudah_dibayar),
    sisa_piutang: Number(inv.sisa_piutang),
    note_termin: inv.note_termin,
    payment_method: inv.payment_method,
    bank_id: inv.bank_id,
    bank_label: inv.bank_label,
    deadline_bayar: inv.deadline_bayar,
    days_overdue: overdue,
    status_bayar: inv.status_bayar,
    status_kirim: inv.status_kirim,
    is_archived: inv.is_archived,
    recurring_parent_id: inv.recurring_parent_id,
    recurring_sequence: inv.recurring_sequence,
    recurring_interval: inv.recurring_interval,
    recurring_start_date: inv.recurring_start_date,
    recurring_end_date: inv.recurring_end_date,
    payment_history: history ?? [],
    created_at: inv.created_at,
  }
}

// ─── Create Invoice ───────────────────────────────────────────────────────────

export async function createInvoice(
  tenantId: string,
  userId: string,
  actorName: string,
  payload: CreateInvoiceRequest
): Promise<ARInvoice[]> {
  const db = createAdminClient()

  // Fetch project snapshot
  const { data: project, error: projErr } = await db
    .from('projects')
    .select('id, project_name, budget_amount, client_id')
    .eq('id', payload.project_id)
    .eq('tenant_id', tenantId)
    .single()

  if (projErr || !project) throw new Error('AR_PROJECT_NOT_FOUND')

  // Fetch client name
  let clientName = 'Unknown Client'
  if (project.client_id) {
    const { data: client } = await db
      .from('clients')
      .select('name')
      .eq('id', project.client_id)
      .single()
    if (client) clientName = client.name
  }

  const nilaiKontrak = Number(project.budget_amount ?? 0)

  // Build invoice dates (one or many for recurring)
  let dates: string[]
  if (payload.tipe_invoice === 'recurring') {
    if (!payload.recurring_start_date || !payload.recurring_end_date || !payload.recurring_interval) {
      throw new Error('AR_INVALID_RECURRING_DATES')
    }
    if (payload.recurring_start_date >= payload.recurring_end_date) {
      throw new Error('AR_INVALID_RECURRING_DATES')
    }
    dates = previewRecurringDates(
      payload.recurring_start_date,
      payload.recurring_end_date,
      payload.recurring_interval as RecurringInterval
    )
  } else {
    dates = [payload.tgl_invoice]
  }

  // Generate invoice rows
  const created: ARInvoice[] = []
  let parentId: string | null = null

  for (let i = 0; i < dates.length; i++) {
    const tglInvoice = dates[i]

    // Generate or use provided no_invoice
    let noInvoice: string
    if (payload.tipe_invoice === 'one_time' && payload.no_invoice && i === 0) {
      noInvoice = payload.no_invoice
    } else {
      noInvoice = await getNextInvoiceNumber(tenantId, tglInvoice)
    }

    // Check uniqueness
    const { count: dupCount } = await db
      .from('ar_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('no_invoice', noInvoice)

    if ((dupCount ?? 0) > 0) throw new Error(`AR_DUPLICATE_NO_INVOICE: ${noInvoice}`)

    const row = {
      tenant_id: tenantId,
      project_id: payload.project_id,
      project_name: project.project_name,
      client_name: clientName,
      nilai_kontrak: nilaiKontrak,
      no_invoice: noInvoice,
      tgl_invoice: tglInvoice,
      tipe_invoice: payload.tipe_invoice,
      description: payload.description || null,
      qty: payload.qty,
      harga_satuan: payload.harga_satuan,
      ppn_11_persen: payload.ppn_11_persen,
      recurring_start_date: payload.recurring_start_date || null,
      recurring_end_date: payload.recurring_end_date || null,
      recurring_interval: payload.recurring_interval || null,
      recurring_parent_id: i > 0 ? parentId : null,
      recurring_sequence: payload.tipe_invoice === 'recurring' ? i + 1 : null,
      sudah_dibayar: i === 0 ? payload.sudah_dibayar : 0,
      note_termin: payload.note_termin || null,
      payment_method: payload.payment_method || null,
      bank_id: payload.bank_id || null,
      deadline_bayar: payload.deadline_bayar || null,
      status_bayar: i === 0 ? payload.status_bayar : 'belum',
      status_kirim: payload.tipe_invoice === 'recurring' ? 'reminder' : 'sent',
      created_by: userId,
    }

    const { data: inserted, error: insertErr } = await db
      .from('ar_invoices')
      .insert(row)
      .select()
      .single()

    if (insertErr || !inserted) throw new Error(insertErr?.message ?? 'Insert failed')

    if (i === 0 && payload.tipe_invoice === 'recurring') {
      parentId = inserted.id
    }

    const detail = await getInvoiceDetail(tenantId, inserted.id)
    if (detail) created.push(detail)
  }

  return created
}

// ─── Update Payment ───────────────────────────────────────────────────────────

export async function updatePayment(
  tenantId: string,
  invoiceId: string,
  userId: string,
  actorName: string,
  payload: UpdatePaymentRequest
): Promise<ARInvoice> {
  const db = createAdminClient()

  const { data: inv, error: fetchErr } = await db
    .from('ar_invoices')
    .select('id, sudah_dibayar, sisa_piutang, total_piutang, is_archived, tenant_id')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .single()

  if (fetchErr || !inv) throw new Error('Invoice not found')
  if (inv.is_archived) throw new Error('AR_INVOICE_ARCHIVED')

  const sisaLama = Number(inv.sisa_piutang)
  if (payload.bayar_sekarang <= 0) throw new Error('Bayar sekarang harus > 0')
  if (payload.bayar_sekarang > sisaLama) throw new Error('AR_OVERPAY')

  // Fetch bank label if bank_id provided
  let bankLabel: string | null = null
  if (payload.bank_id) {
    const { data: bank } = await db
      .from('ar_bank_accounts')
      .select('kode, nama_bank, nama_akun')
      .eq('id', payload.bank_id)
      .single()
    if (bank) bankLabel = `${bank.kode} - ${bank.nama_bank} ${bank.nama_akun}`
  }

  const sudahDibayarLama = Number(inv.sudah_dibayar)
  const newSudahDibayar = sudahDibayarLama + payload.bayar_sekarang

  // Save to payment history
  await db.from('ar_payment_history').insert({
    tenant_id: tenantId,
    invoice_id: invoiceId,
    sudah_dibayar_lama: sudahDibayarLama,
    sisa_piutang_lama: sisaLama,
    bayar_sekarang: payload.bayar_sekarang,
    status_baru: payload.status_baru,
    bank_id: payload.bank_id || null,
    bank_label: bankLabel,
    deadline_baru: payload.deadline_baru || null,
    catatan_pembayaran: payload.catatan_pembayaran || null,
    created_by: userId,
    actor_name: actorName,
  })

  // Update invoice
  const updateData: Record<string, unknown> = {
    sudah_dibayar: newSudahDibayar,
    status_bayar: payload.status_baru,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }
  if (payload.deadline_baru) updateData.deadline_bayar = payload.deadline_baru
  if (payload.bank_id) {
    updateData.bank_id = payload.bank_id
    updateData.bank_label = bankLabel
  }

  await db.from('ar_invoices').update(updateData).eq('id', invoiceId)

  const detail = await getInvoiceDetail(tenantId, invoiceId)
  if (!detail) throw new Error('Invoice not found after update')
  return detail
}

// ─── Archive ──────────────────────────────────────────────────────────────────

export async function archiveInvoice(
  tenantId: string,
  invoiceId: string,
  userId: string
): Promise<void> {
  const db = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await db
    .from('ar_invoices')
    .update({ is_archived: true, archived_at: now, archived_by: userId })
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
}

export async function archiveProjectInvoices(
  tenantId: string,
  projectId: string,
  userId: string
): Promise<void> {
  const db = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await db
    .from('ar_invoices')
    .update({ is_archived: true, archived_at: now, archived_by: userId })
    .eq('project_id', projectId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
}

// ─── Bulk Status Kirim ────────────────────────────────────────────────────────

export async function bulkUpdateStatusKirim(
  tenantId: string,
  invoiceIds: string[]
): Promise<void> {
  if (invoiceIds.length < 1) throw new Error('Minimal 1 invoice harus dipilih')

  const db = createAdminClient()
  const { error } = await db
    .from('ar_invoices')
    .update({ status_kirim: 'sent', updated_at: new Date().toISOString() })
    .in('id', invoiceIds)
    .eq('tenant_id', tenantId)
    .eq('tipe_invoice', 'recurring')
    .eq('status_kirim', 'reminder')

  if (error) throw new Error(error.message)
}
