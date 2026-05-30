import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

async function genApNumber(db: ReturnType<typeof createAdminClient>): Promise<string> {
  const now = new Date()
  const prefix = `AP-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`
  const { count } = await db
    .from('ap_invoices')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TENANT)
    .like('ap_number', `${prefix}%`)
  return `${prefix}${String((count ?? 0) + 1).padStart(4, '0')}`
}

function startOfToday(): Date { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
function addDays(base: Date, days: number): Date { const d = new Date(base); d.setDate(d.getDate() + days); return d }
function ymd(d: Date): string { return d.toISOString().split('T')[0] as string }
function dlabel(d: Date): string { return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }) }

// ── GET: list + dashboard summary (aging + cash-out forecast) ────────────────
export async function GET(request: NextRequest) {
  try {
    const db = createAdminClient()
    const { searchParams } = request.nextUrl
    const display = searchParams.get('display')   // open | overdue | paid
    const status  = searchParams.get('status')    // workflow status
    const search  = searchParams.get('search') ?? ''
    const dateFrom = searchParams.get('date_from')
    const dateTo   = searchParams.get('date_to')

    let q = db
      .from('ap_invoices')
      .select(`
        id, tenant_id, ap_number, no_invoice, no_ref_dokumen,
        tgl_terima, tgl_jatuh_tempo, dasar_pengajuan, pihak_ketiga,
        vendor_id, project_id, project_name, deskripsi,
        mata_uang, kurs, subtotal, discount_amount, tax_amount,
        grand_total, amount_paid, amount_due, status,
        journal_entry_id, attachment_url,
        submitted_at, approved_at, approver_name, rejected_at, reject_reason, paid_at,
        created_at, updated_at,
        project:project_id(id, project_code, project_name)
      `)
      .eq('tenant_id', TENANT)
      .is('deleted_at', null)

    if (status) q = q.eq('status', status)
    if (dateFrom) q = q.gte('tgl_jatuh_tempo', dateFrom)
    if (dateTo) q = q.lte('tgl_jatuh_tempo', dateTo)
    if (search) q = q.or(`pihak_ketiga.ilike.%${search}%,no_invoice.ilike.%${search}%,ap_number.ilike.%${search}%`)

    const { data, error } = await q.order('tgl_jatuh_tempo', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let rows = (data ?? []).map((r: any) => ({
      ...r,
      project: Array.isArray(r.project) ? r.project[0] ?? null : r.project ?? null,
    }))

    // Attach line items
    const ids = rows.map((r: any) => r.id)
    if (ids.length > 0) {
      const { data: items } = await db
        .from('ap_invoice_items')
        .select('*')
        .in('ap_invoice_id', ids)
        .order('urutan')
      const map: Record<string, any[]> = {}
      for (const it of items ?? []) {
        if (!map[it.ap_invoice_id]) map[it.ap_invoice_id] = []
        ;(map[it.ap_invoice_id] as any[]).push(it)
      }
      rows = rows.map((r: any) => ({ ...r, items: map[r.id] ?? [] }))
    } else {
      rows = rows.map((r: any) => ({ ...r, items: [] }))
    }

    const today = startOfToday()
    const isPaid    = (r: any) => r.status === 'PAID' || Number(r.amount_due) <= 0
    const isOverdue = (r: any) => !isPaid(r) && new Date(r.tgl_jatuh_tempo) < today
    const isOpen    = (r: any) => !isPaid(r) && !isOverdue(r) && r.status !== 'REJECTED' && r.status !== 'DRAFT'

    // ── Summary over the full (unfiltered-by-display) set ──
    const active = rows.filter((r: any) => r.status !== 'REJECTED')
    const open_count    = active.filter(isOpen).length
    const overdue_count = active.filter(isOverdue).length
    const paid_total    = active.reduce((s: number, r: any) => s + Number(r.amount_paid || 0), 0)
    const total_due     = active.filter((r: any) => !isPaid(r)).reduce((s: number, r: any) => s + Number(r.amount_due || 0), 0)

    // ── AP Aging (unpaid only, by days overdue) ──
    const agingDefs = [
      { label: 'Current', lo: -Infinity, hi: 0 },
      { label: '1-30 Hari', lo: 1, hi: 30 },
      { label: '31-60 Hari', lo: 31, hi: 60 },
      { label: '61-90 Hari', lo: 61, hi: 90 },
      { label: '>90 Hari', lo: 91, hi: Infinity },
    ]
    const aging = agingDefs.map(d => ({ label: d.label, amount: 0, count: 0 }))
    for (const r of active) {
      if (isPaid(r)) continue
      const overdueDays = Math.round((today.getTime() - new Date(r.tgl_jatuh_tempo).getTime()) / 86_400_000)
      const idx = agingDefs.findIndex(d => overdueDays >= d.lo && overdueDays <= d.hi)
      if (idx >= 0) { aging[idx]!.amount += Number(r.amount_due || 0); aging[idx]!.count += 1 }
    }

    // ── Cash-out forecast (next 4 weekly buckets, approved+unpaid by due date) ──
    const forecast = [] as { label: string; date_from: string; date_to: string; amount: number }[]
    for (let w = 0; w < 4; w++) {
      const from = addDays(today, w * 7)
      const to = addDays(today, w * 7 + 6)
      const amount = active
        .filter((r: any) => !isPaid(r) && r.status === 'APPROVED')
        .filter((r: any) => { const due = new Date(r.tgl_jatuh_tempo); return due >= from && due <= to })
        .reduce((s: number, r: any) => s + Number(r.amount_due || 0), 0)
      forecast.push({ label: `${dlabel(from)} - ${dlabel(to)}`, date_from: ymd(from), date_to: ymd(to), amount })
    }

    // ── Apply display filter to returned rows ──
    let outRows = rows
    if (display === 'paid')    outRows = rows.filter(isPaid)
    if (display === 'overdue') outRows = rows.filter(isOverdue)
    if (display === 'open')    outRows = rows.filter(isOpen)

    return NextResponse.json({
      data: outRows,
      summary: { open_count, overdue_count, paid_total, total_due, aging, forecast },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── POST: create a new bill (Draft or Submitted) ─────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const db = createAdminClient()
    const body = await request.json()

    const {
      no_invoice, no_ref_dokumen, tgl_terima, tgl_jatuh_tempo,
      dasar_pengajuan = 'lain_lain', pihak_ketiga, vendor_id,
      project_id, project_name, deskripsi,
      mata_uang = 'IDR', kurs = 1,
      items = [], discount_amount = 0, tax_amount = 0,
      submit = false, created_by, attachment_url,
    } = body

    if (!no_invoice?.trim() || !tgl_terima || !tgl_jatuh_tempo || !pihak_ketiga?.trim()) {
      return NextResponse.json({ error: 'Wajib: no_invoice, tgl_terima, tgl_jatuh_tempo, pihak_ketiga' }, { status: 400 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Minimal 1 item detail transaksi' }, { status: 400 })
    }

    // US-001 AC#1: duplicate check (vendor + nomor invoice + tanggal terima)
    const { data: dup } = await db
      .from('ap_invoices')
      .select('id')
      .eq('tenant_id', TENANT)
      .eq('pihak_ketiga', pihak_ketiga.trim())
      .eq('no_invoice', no_invoice.trim())
      .eq('tgl_terima', tgl_terima)
      .is('deleted_at', null)
      .maybeSingle()
    if (dup) {
      return NextResponse.json({ error: 'Invoice duplikat: kombinasi vendor + nomor invoice + tanggal terima sudah ada' }, { status: 409 })
    }

    // Totals
    const subtotal = items.reduce((s: number, it: any) => s + (Number(it.qty || 0) * Number(it.harga || 0)), 0)
    const itemDiskon = items.reduce((s: number, it: any) => s + Number(it.diskon || 0), 0)
    const itemPajak  = items.reduce((s: number, it: any) => s + Number(it.pajak || 0), 0)
    const totalDiscount = Number(discount_amount || 0) + itemDiskon
    const totalTax = Number(tax_amount || 0) + itemPajak
    const grand_total = subtotal - totalDiscount + totalTax

    const ap_number = await genApNumber(db)

    const { data: inv, error: insErr } = await db
      .from('ap_invoices')
      .insert({
        tenant_id: TENANT,
        ap_number,
        no_invoice: no_invoice.trim(),
        no_ref_dokumen: no_ref_dokumen || null,
        tgl_terima,
        tgl_jatuh_tempo,
        dasar_pengajuan,
        pihak_ketiga: pihak_ketiga.trim(),
        vendor_id: vendor_id || null,
        project_id: project_id || null,
        project_name: project_name || null,
        deskripsi: deskripsi || null,
        mata_uang,
        kurs,
        subtotal,
        discount_amount: totalDiscount,
        tax_amount: totalTax,
        grand_total,
        status: submit ? 'SUBMITTED' : 'DRAFT',
        attachment_url: attachment_url || null,
        submitted_at: submit ? new Date().toISOString() : null,
        created_by: created_by || null,
      })
      .select()
      .single()

    if (insErr || !inv) return NextResponse.json({ error: insErr?.message ?? 'Insert gagal' }, { status: 500 })

    // Items
    await db.from('ap_invoice_items').insert(
      items.map((it: any, i: number) => ({
        ap_invoice_id: inv.id,
        urutan: i + 1,
        deskripsi: it.deskripsi,
        qty: Number(it.qty || 1),
        harga: Number(it.harga || 0),
        diskon: Number(it.diskon || 0),
        pajak: Number(it.pajak || 0),
        coa_id: it.coa_id || null,
        coa_kode: it.coa_kode || null,
        coa_nama: it.coa_nama || null,
      }))
    )

    if (submit) {
      await db.from('ap_approval_steps').insert({
        ap_invoice_id: inv.id, step: 1, action: 'SUBMIT',
        actor_id: created_by || null, notes: 'Tagihan diajukan',
      })
    }

    return NextResponse.json({ data: { ...inv, items } }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
