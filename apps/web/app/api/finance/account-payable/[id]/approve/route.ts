import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { processJournalAutomation } from '@/lib/finance/journal-engine'
import { getDefaultExpenseCoaId } from '@/lib/finance/journal-defaults'

const TENANT = '00000000-0000-0000-0000-000000000001'
const SYSTEM_USER = '812558af-8be8-4c53-b581-e6a4f1c91147'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = createAdminClient()
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { approver_id, approver_name, notes } = body

    const { data: inv } = await db
      .from('ap_invoices').select('*').eq('id', id).eq('tenant_id', TENANT).is('deleted_at', null).single()
    if (!inv) return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 })
    if (inv.status !== 'SUBMITTED') {
      return NextResponse.json({ error: 'Hanya tagihan yang Diajukan (Submitted) yang dapat disetujui' }, { status: 422 })
    }

    const { data: items } = await db.from('ap_invoice_items').select('*').eq('ap_invoice_id', id).order('urutan')

    // UC#3: config-driven auto-journal (AP-BILL-RCV) — Dr Beban/Aset per item + PPN / Cr Hutang.
    // Non-blocking: a journal failure must not stop the approval.
    let journal_entry_id: string | null = null
    let warning: string | null = null
    try {
      const defExp = await getDefaultExpenseCoaId(db, TENANT)
      const lines = (items ?? []).map((it: any) => ({
        coaId: it.coa_id || defExp,
        amount: Number(it.subtotal || 0),
        description: `Tagihan ${inv.pihak_ketiga}`,
      }))
      const result = await processJournalAutomation({
        triggerCode: 'AP-BILL-RCV',
        sourceType: 'ap_invoice',
        sourceId: inv.id,
        tenantId: TENANT,
        transactionDate: inv.tgl_terima,
        createdBy: approver_id || SYSTEM_USER,
        description: `AP ${inv.ap_number} — ${inv.pihak_ketiga} (${inv.no_invoice})`,
        referenceNumber: inv.no_invoice,
        currency: inv.mata_uang || 'IDR',
        nominals: {
          pajak: Number(inv.tax_amount || 0),
          grand_total: Number(inv.grand_total || 0),
        },
        dynamicLines: { ap_line_coa: lines },
      })
      journal_entry_id = result.journalEntryId ?? null
      if (!result.success) warning = `Journal entry dilewati: ${result.errorCode} — ${result.message}`
    } catch (e) {
      warning = `Journal entry error: ${String(e)}`
    }

    const { data, error } = await db
      .from('ap_invoices')
      .update({
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
        approved_by: approver_id || null,
        approver_name: approver_name || null,
        journal_entry_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id).eq('tenant_id', TENANT)
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await db.from('ap_approval_steps').insert({
      ap_invoice_id: id, step: 2, action: 'APPROVE',
      actor_id: approver_id || null, actor_name: approver_name || null,
      notes: notes || (journal_entry_id ? 'Disetujui & journal entry dibuat' : 'Disetujui'),
    })

    return NextResponse.json({ data, journal_entry_id, warning })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
