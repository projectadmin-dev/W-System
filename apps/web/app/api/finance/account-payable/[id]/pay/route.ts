import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { processJournalAutomation } from '@/lib/finance/journal-engine'
import { getCoaIdByCode, DEFAULT_CASH_CODE } from '@/lib/finance/journal-defaults'
import { computeWithholding, type PihakPajak } from '@/lib/finance/tax-withholding'

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
    const {
      amount, bank_coa_id, bank_label, actor_id, actor_name, notes,
      // PPh withholding premise (optional; falls back to the bill header).
      pph_dipotong_oleh, pph_jenis, lawan_punya_npwp, pph_tarif,
      pph_dpp_kategori_id, pph_dpp_manual,
    } = body

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

    // ── PPh withholding (timing = at payment, PSAK). Premise comes from the
    // request body, falling back to the bill header. The route computes the
    // authoritative amounts (never trusts a client-sent pph_amount). DPP basis
    // is the bill subtotal; finance may pick a DPP category or enter it manually.
    const dipotong: PihakPajak = (pph_dipotong_oleh ?? inv.pph_dipotong_oleh ?? 'tidak_ada') as PihakPajak
    const jenis = pph_jenis ?? inv.pph_jenis ?? null
    const berNpwp = (lawan_punya_npwp ?? inv.lawan_punya_npwp ?? true) !== false
    const dppKategoriId = pph_dpp_kategori_id ?? inv.pph_dpp_kategori_id ?? null
    const manualDpp = pph_dpp_manual ?? inv.pph_dpp ?? null

    let pphAmount = 0
    let kasNeto = payAmt
    let dppResolved: number | null = null
    let tarifUsed: number | null = null

    if (dipotong !== 'tidak_ada' && jenis) {
      // Resolve rate: explicit override → header → default table (jenis, npwp).
      let tarif = pph_tarif ?? inv.pph_tarif ?? null
      if (tarif == null) {
        const { data: rate } = await db
          .from('pph_tarif_default')
          .select('tarif')
          .eq('tenant_id', TENANT).eq('pph_jenis', jenis).eq('ber_npwp', berNpwp)
          .eq('is_aktif', true).maybeSingle()
        tarif = rate ? Number(rate.tarif) : 0
      }
      // Resolve DPP category (metode/faktor) if one was chosen.
      let kategori: { metode: any; faktor: number | null } | null = null
      if (dppKategoriId) {
        const { data: kat } = await db
          .from('dpp_kategori').select('metode, faktor').eq('id', dppKategoriId).maybeSingle()
        if (kat) kategori = { metode: kat.metode, faktor: kat.faktor != null ? Number(kat.faktor) : null }
      }
      const w = computeWithholding({
        grossSettled: payAmt,
        base: Number(inv.subtotal || 0),
        dipotongOleh: dipotong,
        tarif: Number(tarif),
        kategori,
        manualDpp: manualDpp != null ? Number(manualDpp) : null,
      })
      pphAmount = w.pphAmount
      kasNeto = w.kasNeto
      dppResolved = w.dpp
      tarifUsed = Number(tarif)
    }

    const { data, error } = await db
      .from('ap_invoices')
      .update({
        amount_paid: newPaid,
        status: fullyPaid ? 'PAID' : 'APPROVED',
        paid_at: fullyPaid ? new Date().toISOString() : inv.paid_at,
        updated_at: new Date().toISOString(),
        // Snapshot the withholding premise on the bill for audit.
        pph_dipotong_oleh: dipotong,
        pph_jenis: jenis,
        lawan_punya_npwp: berNpwp,
        pph_tarif: tarifUsed,
        pph_dpp_kategori_id: dppKategoriId,
        pph_dpp: dppResolved,
        pph_amount: pphAmount,
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
      pph_amount: pphAmount,
      kas_neto: kasNeto,
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
          // bayar_sekarang = gross settled (clears Hutang); kas_neto = actual
          // cash out (gross − PPh); pph_amount = withheld → Cr Hutang PPh.
          // When no PPh: pphAmount=0 (line skipped) and kasNeto=payAmt, so the
          // journal is identical to the pre-withholding behavior.
          nominals: { bayar_sekarang: payAmt, pph_amount: pphAmount, kas_neto: kasNeto },
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
