import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'
const AP_CONTROL_CODE = '2-10100' // Hutang Usaha (Accounts Payable control account)

async function genEntryNumber(db: ReturnType<typeof createAdminClient>): Promise<string> {
  const now = new Date()
  const prefix = `JE-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`
  const { count } = await db
    .from('journal_entries')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TENANT)
    .like('entry_number', `${prefix}%`)
  return `${prefix}${String((count ?? 0) + 1).padStart(4, '0')}`
}

/**
 * Best-effort auto-journal on approval (US-005).
 * Dr Expense (per line item) / Cr Hutang Usaha. Never throws — returns null on failure.
 */
async function tryCreateJournal(
  db: ReturnType<typeof createAdminClient>,
  inv: any, items: any[], actorId: string | null
): Promise<{ id: string } | { warning: string }> {
  try {
    if (!actorId) return { warning: 'Journal entry dilewati: approver_id (user) tidak tersedia' }

    // Resolve AP control account
    const { data: apAcc } = await db.from('coa').select('id').eq('tenant_id', TENANT)
      .eq('account_code', AP_CONTROL_CODE).is('deleted_at', null).limit(1).maybeSingle()
    if (!apAcc) return { warning: `Journal entry dilewati: akun Hutang Usaha (${AP_CONTROL_CODE}) tidak ditemukan` }

    // Fallback expense account for items without coa_id
    const { data: defExp } = await db.from('coa').select('id').eq('tenant_id', TENANT)
      .eq('account_type', 'expense').is('deleted_at', null)
      .order('account_code', { ascending: true }).limit(1).maybeSingle()

    const grand = Number(inv.grand_total || 0)
    if (grand <= 0) return { warning: 'Journal entry dilewati: grand total nol' }

    // Build debit lines from items (net = qty*harga - diskon + pajak)
    const debitLines = items.map((it: any) => ({
      coa_id: it.coa_id || defExp?.id || null,
      amount: Number(it.qty || 0) * Number(it.harga || 0) - Number(it.diskon || 0) + Number(it.pajak || 0),
    })).filter((l: any) => l.coa_id && l.amount > 0)

    if (debitLines.length === 0) {
      if (!defExp) return { warning: 'Journal entry dilewati: tidak ada akun beban (expense) untuk posting' }
      debitLines.push({ coa_id: defExp.id, amount: grand })
    }

    // Force debit total to equal grand_total exactly (absorb header-level tax/discount)
    const debitSum = debitLines.reduce((s: number, l: any) => s + l.amount, 0)
    const diff = grand - debitSum
    if (Math.abs(diff) > 0.009 && debitLines.length > 0) {
      debitLines[debitLines.length - 1]!.amount += diff
    }

    const entry_number = await genEntryNumber(db)
    const { data: je, error: jeErr } = await db.from('journal_entries').insert({
      tenant_id: TENANT,
      entry_number,
      transaction_date: inv.tgl_terima,
      posting_date: new Date().toISOString().split('T')[0],
      source_type: 'invoice',
      source_id: inv.id,
      description: `AP ${inv.ap_number} — ${inv.pihak_ketiga} (${inv.no_invoice})`,
      reference_number: inv.no_invoice,
      currency: inv.mata_uang || 'IDR',
      exchange_rate: inv.kurs || 1,
      status: 'posted',
      prepared_by: actorId,
      posted_by: actorId,
      created_by: actorId,
    }).select('id').single()
    if (jeErr || !je) return { warning: `Journal entry gagal: ${jeErr?.message ?? 'unknown'}` }

    const lines = [
      ...debitLines.map((l: any, i: number) => ({
        tenant_id: TENANT, journal_entry_id: je.id, line_number: i + 1,
        coa_id: l.coa_id, debit_amount: l.amount, credit_amount: 0,
        currency: inv.mata_uang || 'IDR',
        debit_amount_base: l.amount, credit_amount_base: 0,
        line_description: `Tagihan ${inv.pihak_ketiga}`,
        project_id: inv.project_id || null, created_by: actorId,
      })),
      {
        tenant_id: TENANT, journal_entry_id: je.id, line_number: debitLines.length + 1,
        coa_id: apAcc.id, debit_amount: 0, credit_amount: grand,
        currency: inv.mata_uang || 'IDR',
        debit_amount_base: 0, credit_amount_base: grand,
        line_description: `Hutang ${inv.pihak_ketiga}`,
        project_id: inv.project_id || null, created_by: actorId,
      },
    ]
    const { error: lnErr } = await db.from('journal_lines').insert(lines)
    if (lnErr) {
      await db.from('journal_entries').delete().eq('id', je.id)
      return { warning: `Journal lines gagal: ${lnErr.message}` }
    }
    return { id: je.id }
  } catch (e) {
    return { warning: `Journal entry error: ${String(e)}` }
  }
}

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

    // Best-effort GL posting
    const jr = await tryCreateJournal(db, inv, items ?? [], approver_id || null)
    const journal_entry_id = 'id' in jr ? jr.id : null
    const warning = 'warning' in jr ? jr.warning : null

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
