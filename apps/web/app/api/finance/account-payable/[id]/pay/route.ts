import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { processJournalAutomation } from '@/lib/finance/journal-engine'
import { getCoaIdByCode, DEFAULT_CASH_CODE } from '@/lib/finance/journal-defaults'

const TENANT = '00000000-0000-0000-0000-000000000001'
const SYSTEM_USER = '812558af-8be8-4c53-b581-e6a4f1c91147'

// Record a (partial or full) payment against an approved bill.
// Body: { amount?, bank_coa_id?, bank_label?, actor_id?, actor_name?, notes? }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = createAdminClient()
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { amount, bank_coa_id, bank_label, actor_id, actor_name, notes } = body

    const { data: inv } = await db
      .from('ap_invoices').select('*')
      .eq('id', id).eq('tenant_id', TENANT).is('deleted_at', null).single()
    if (!inv) return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 })
    if (inv.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Tagihan harus berstatus Disetujui sebelum dibayar' }, { status: 422 })
    }

    // Default: pay the full remaining amount
    const due = Number(inv.amount_due || 0)
    const payAmt = amount != null ? Number(amount) : due
    if (payAmt <= 0) return NextResponse.json({ error: 'Nominal pembayaran harus > 0' }, { status: 400 })
    if (payAmt > due + 0.009) {
      return NextResponse.json({ error: `Nominal melebihi sisa tagihan (${due})` }, { status: 400 })
    }

    const paidBefore = Number(inv.amount_paid || 0)
    const newPaid = paidBefore + payAmt
    const fullyPaid = newPaid >= Number(inv.grand_total || 0) - 0.009

    const { data, error } = await db
      .from('ap_invoices')
      .update({
        amount_paid: newPaid,
        status: fullyPaid ? 'PAID' : 'APPROVED',
        paid_at: fullyPaid ? new Date().toISOString() : inv.paid_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id).eq('tenant_id', TENANT)
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await db.from('ap_approval_steps').insert({
      ap_invoice_id: id, step: 3, action: 'PAY',
      actor_id: actor_id || null, actor_name: actor_name || null,
      notes: notes || `Pembayaran ${payAmt.toLocaleString('id-ID')}${fullyPaid ? ' (LUNAS)' : ' (sebagian)'}`,
    })

    // Record the payment (carries the bank/cash COA) — becomes the journal source.
    const { data: payHist } = await db.from('ap_payment_history').insert({
      tenant_id: TENANT,
      ap_invoice_id: id,
      amount_paid_lama: paidBefore,
      amount_due_lama: due,
      bayar_sekarang: payAmt,
      status_baru: fullyPaid ? 'PAID' : 'APPROVED',
      bank_coa_id: bank_coa_id || null,
      bank_label: bank_label || null,
      catatan_pembayaran: notes || null,
      created_by: actor_id || null,
      actor_name: actor_name || null,
    }).select('id').single()

    // UC#4: auto-journal Dr Hutang / Cr Kas/Bank (non-blocking).
    let journal_entry_id: string | null = null
    let warning: string | null = null
    if (payHist?.id) {
      try {
        const bankCoaId = bank_coa_id || (await getCoaIdByCode(db, TENANT, DEFAULT_CASH_CODE))
        const result = await processJournalAutomation({
          triggerCode: 'AP-PAY',
          sourceType: 'ap_payment',
          sourceId: payHist.id,
          tenantId: TENANT,
          transactionDate: new Date().toISOString().slice(0, 10),
          createdBy: actor_id || SYSTEM_USER,
          description: `Pembayaran AP ${inv.ap_number} — ${inv.pihak_ketiga}`,
          referenceNumber: inv.no_invoice,
          currency: inv.mata_uang || 'IDR',
          nominals: { bayar_sekarang: payAmt },
          dynamicAccounts: { ap_bank_coa: bankCoaId },
        })
        journal_entry_id = result.journalEntryId ?? null
        if (!result.success) warning = `Journal entry dilewati: ${result.errorCode} — ${result.message}`
      } catch (e) {
        warning = `Journal entry error: ${String(e)}`
      }
    }

    return NextResponse.json({ data, journal_entry_id, warning })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
