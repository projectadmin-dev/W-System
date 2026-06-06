import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { processJournalAutomation } from '@/lib/finance/journal-engine'
import { getCoaIdByCode, getDefaultExpenseCoaId, DEFAULT_CASH_CODE } from '@/lib/finance/journal-defaults'

const TENANT = '00000000-0000-0000-0000-000000000001'
const SYSTEM_USER = '812558af-8be8-4c53-b581-e6a4f1c91147'

// POST /api/finance/pembayaran/:id/execute — mark as PAID + auto-journal (UC#5)
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = createAdminClient()

    const { data: pay } = await db
      .from('pembayaran')
      .select('id, status, permintaan_uang_id, doc_number, tanggal_pembayaran, nominal_bayar, mata_uang, bank_dari_coa_id, created_by')
      .eq('id', id)
      .eq('tenant_id', TENANT)
      .single()

    if (!pay) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const now = new Date().toISOString()

    await db.from('pembayaran').update({
      status: 'PAID',
      paid_at: now,
      updated_at: now,
    }).eq('id', id)

    // Mark linked PU as PAID
    await db.from('permintaan_uang').update({
      status: 'PAID',
      paid_at: now,
      updated_at: now,
    }).eq('id', pay.permintaan_uang_id)

    // UC#5: auto-journal Dr Beban (+ biaya lain) / Cr Kas/Bank (non-blocking).
    let journal_entry_id: string | null = null
    let warning: string | null = null
    try {
      // Expense account from the money request (fallback to a default expense account).
      const { data: pu } = await db
        .from('permintaan_uang')
        .select('expense_coa_id, catatan, dasar_pengajuan')
        .eq('id', pay.permintaan_uang_id)
        .maybeSingle()
      const expenseCoaId = pu?.expense_coa_id || (await getDefaultExpenseCoaId(db, TENANT))
      const bankCoaId = pay.bank_dari_coa_id || (await getCoaIdByCode(db, TENANT, DEFAULT_CASH_CODE))

      // Additional charges (each its own debit line).
      const { data: biaya } = await db
        .from('pembayaran_biaya_lain')
        .select('coa_id, nominal, deskripsi')
        .eq('pembayaran_id', id)
      const biayaLines = (biaya ?? []).map((b: any) => ({
        coaId: b.coa_id,
        amount: Number(b.nominal || 0),
        description: b.deskripsi || 'Biaya lain',
      }))
      const biayaTotal = biayaLines.reduce((s: number, l: any) => s + l.amount, 0)
      const nominalBayar = Number(pay.nominal_bayar || 0)

      const result = await processJournalAutomation({
        triggerCode: 'PMB-INTERNAL',
        sourceType: 'pembayaran',
        sourceId: pay.id,
        tenantId: TENANT,
        transactionDate: pay.tanggal_pembayaran || now.slice(0, 10),
        createdBy: pay.created_by || SYSTEM_USER,
        description: `Pembayaran internal ${pay.doc_number}`,
        referenceNumber: pay.doc_number,
        currency: pay.mata_uang || 'IDR',
        nominals: {
          nominal_bayar: nominalBayar,
          grand_total: nominalBayar + biayaTotal, // total cash out = main + biaya lain
        },
        dynamicAccounts: { pmb_expense_coa: expenseCoaId, pmb_bank_coa: bankCoaId },
        dynamicLines: { pmb_biaya_lain_coa: biayaLines },
      })
      journal_entry_id = result.journalEntryId ?? null
      if (!result.success) warning = `Journal entry dilewati: ${result.errorCode} — ${result.message}`
    } catch (e) {
      warning = `Journal entry error: ${String(e)}`
    }

    return NextResponse.json({ data: { status: 'PAID' }, journal_entry_id, warning })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
