import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = createAdminClient()
    const { id } = await params

    const { data, error } = await db
      .from('ap_invoices')
      .select(`
        *,
        project:project_id(id, project_code, project_name)
      `)
      .eq('id', id)
      .eq('tenant_id', TENANT)
      .is('deleted_at', null)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 })

    const [{ data: items }, { data: steps }] = await Promise.all([
      db.from('ap_invoice_items').select('*').eq('ap_invoice_id', id).order('urutan'),
      db.from('ap_approval_steps').select('*').eq('ap_invoice_id', id).order('created_at', { ascending: true }),
    ])

    const inv = {
      ...data,
      project: Array.isArray((data as any).project) ? (data as any).project[0] ?? null : (data as any).project ?? null,
      items: items ?? [],
      approval_steps: steps ?? [],
    }

    return NextResponse.json({ data: inv })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Edit — DRAFT or REJECTED only
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = createAdminClient()
    const { id } = await params
    const body = await request.json()

    const { data: existing } = await db
      .from('ap_invoices')
      .select('status')
      .eq('id', id).eq('tenant_id', TENANT).is('deleted_at', null)
      .single()
    if (!existing) return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 })
    if (!['DRAFT', 'REJECTED'].includes(existing.status)) {
      return NextResponse.json({ error: 'Hanya tagihan Draft/Ditolak yang dapat diubah' }, { status: 422 })
    }

    const allowed = [
      'no_invoice', 'no_ref_dokumen', 'tgl_terima', 'tgl_jatuh_tempo',
      'dasar_pengajuan', 'pihak_ketiga', 'vendor_id', 'project_id', 'project_name',
      'deskripsi', 'mata_uang', 'kurs', 'attachment_url',
    ]
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const k of allowed) if (k in body) updates[k] = body[k] === '' ? null : body[k]

    // Replace line items if provided
    if (Array.isArray(body.items)) {
      const items = body.items
      const subtotal = items.reduce((s: number, it: any) => s + Number(it.qty || 0) * Number(it.harga || 0), 0)
      const totalDiscount = Number(body.discount_amount || 0) + items.reduce((s: number, it: any) => s + Number(it.diskon || 0), 0)
      const totalTax = Number(body.tax_amount || 0) + items.reduce((s: number, it: any) => s + Number(it.pajak || 0), 0)
      updates.subtotal = subtotal
      updates.discount_amount = totalDiscount
      updates.tax_amount = totalTax
      updates.grand_total = subtotal - totalDiscount + totalTax

      await db.from('ap_invoice_items').delete().eq('ap_invoice_id', id)
      await db.from('ap_invoice_items').insert(
        items.map((it: any, i: number) => ({
          ap_invoice_id: id, urutan: i + 1, deskripsi: it.deskripsi,
          qty: Number(it.qty || 1), harga: Number(it.harga || 0),
          diskon: Number(it.diskon || 0), pajak: Number(it.pajak || 0),
          coa_id: it.coa_id || null, coa_kode: it.coa_kode || null, coa_nama: it.coa_nama || null,
        }))
      )
    }

    const { data, error } = await db
      .from('ap_invoices')
      .update(updates)
      .eq('id', id).eq('tenant_id', TENANT)
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = createAdminClient()
    const { id } = await params

    const { data: existing } = await db
      .from('ap_invoices').select('status')
      .eq('id', id).eq('tenant_id', TENANT).single()
    if (existing && existing.status === 'PAID') {
      return NextResponse.json({ error: 'Tagihan yang sudah lunas tidak dapat dihapus' }, { status: 422 })
    }

    const { error } = await db
      .from('ap_invoices')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id).eq('tenant_id', TENANT)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
