import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

// Hutang PPh 23 (we owe) and PPh 23 Dibayar Dimuka (our credit).
const COA_HUTANG_PPH23 = '2-10200-2'
const COA_PPH23_DD = '1-10400-3'

// GET /api/finance/tax/withholding-report?periode=YYYY-MM
// Returns the PPh withholding registers for the period:
//   - keluaran: PPh we withheld from vendors (AP) → must be remitted (SPT Masa).
//   - masukan:  PPh withheld from us by customers (AR) → creditable (SPT Tahunan).
// Plus cumulative GL balances of the two PPh accounts as a cross-check.
export async function GET(request: NextRequest) {
  try {
    const db = createAdminClient()
    const periode = request.nextUrl.searchParams.get('periode') || new Date().toISOString().slice(0, 7)
    const start = `${periode}-01`
    const y = Number(periode.slice(0, 4))
    const m = Number(periode.slice(5, 7))
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

    // ── AP register (PPh keluaran — we withhold) ──
    const { data: apRows } = await db
      .from('ap_payment_history')
      .select('id, bayar_sekarang, pph_amount, kas_neto, created_at, nomor_bukti_potong, tanggal_bukti_potong, ap_invoices(no_invoice, pihak_ketiga, pph_tarif, pph_jenis)')
      .eq('tenant_id', TENANT)
      .gt('pph_amount', 0)
      .gte('created_at', start)
      .lt('created_at', next)
      .order('created_at', { ascending: true })

    // ── AR register (PPh masukan — withheld from us) ──
    const { data: arRows } = await db
      .from('ar_payment_history')
      .select('id, bayar_sekarang, pph_amount, kas_neto, created_at, nomor_bukti_potong, tanggal_bukti_potong, ar_invoices(no_invoice, client_name, pph_tarif, pph_jenis)')
      .eq('tenant_id', TENANT)
      .gt('pph_amount', 0)
      .gte('created_at', start)
      .lt('created_at', next)
      .order('created_at', { ascending: true })

    const mapRow = (r: any, partyKey: string, inv: any) => {
      const tarif = Number(inv?.pph_tarif || 0)
      const pph = Number(r.pph_amount || 0)
      return {
        id: r.id,
        tanggal: r.created_at,
        no_invoice: inv?.no_invoice ?? null,
        pihak: inv?.[partyKey] ?? null,
        jenis_pph: inv?.pph_jenis ?? 'pph23',
        tarif,
        dpp: tarif > 0 ? Math.round(pph / (tarif / 100)) : null,
        pph_amount: pph,
        bayar_sekarang: Number(r.bayar_sekarang || 0),
        kas_neto: Number(r.kas_neto || 0),
        nomor_bukti_potong: r.nomor_bukti_potong ?? null,
        tanggal_bukti_potong: r.tanggal_bukti_potong ?? null,
      }
    }

    const keluaran = (apRows ?? []).map((r: any) => mapRow(r, 'pihak_ketiga', r.ap_invoices))
    const masukan = (arRows ?? []).map((r: any) => mapRow(r, 'client_name', r.ar_invoices))
    const sum = (rows: any[]) => rows.reduce((s, r) => s + r.pph_amount, 0)

    // ── Cumulative GL balances (posted, non-deleted) ──
    const balanceOf = async (code: string, normal: 'credit' | 'debit') => {
      const { data: coa } = await db
        .from('coa').select('id').eq('tenant_id', TENANT).eq('account_code', code).maybeSingle()
      if (!coa) return 0
      const { data: lines } = await db
        .from('journal_lines')
        .select('debit_amount, credit_amount, journal_entries!inner(status, deleted_at)')
        .eq('coa_id', coa.id)
        .eq('journal_entries.status', 'posted')
        .is('journal_entries.deleted_at', null)
        .is('deleted_at', null)
      const d = (lines ?? []).reduce((s: number, l: any) => s + Number(l.debit_amount || 0), 0)
      const c = (lines ?? []).reduce((s: number, l: any) => s + Number(l.credit_amount || 0), 0)
      return normal === 'credit' ? c - d : d - c
    }

    const [hutangPph23, pph23DibayarDimuka] = await Promise.all([
      balanceOf(COA_HUTANG_PPH23, 'credit'),
      balanceOf(COA_PPH23_DD, 'debit'),
    ])

    return NextResponse.json({
      periode,
      keluaran: { rows: keluaran, total_pph: sum(keluaran), count: keluaran.length },
      masukan: { rows: masukan, total_pph: sum(masukan), count: masukan.length },
      saldo: { hutang_pph23: hutangPph23, pph23_dibayar_dimuka: pph23DibayarDimuka },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
