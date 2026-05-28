import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

async function genDocNumber(db: ReturnType<typeof createAdminClient>): Promise<string> {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `PAY-${yyyy}-${mm}-`
  const { count } = await db
    .from('pembayaran')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TENANT)
    .like('doc_number', `${prefix}%`)
  return `${prefix}${String((count ?? 0) + 1).padStart(4, '0')}`
}

async function getPembayaranRows(db: ReturnType<typeof createAdminClient>, ids: string[]) {
  if (ids.length === 0) return {}
  const { data } = await db
    .from('pembayaran_biaya_lain')
    .select('*')
    .in('pembayaran_id', ids)
    .order('urutan')
  const map: Record<string, any[]> = {}
  for (const b of data ?? []) {
    if (!map[b.pembayaran_id]) map[b.pembayaran_id] = []
    map[b.pembayaran_id].push(b)
  }
  return map
}

export async function GET(request: NextRequest) {
  try {
    const db = createAdminClient()
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const search = searchParams.get('search') ?? ''
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const size = Math.min(100, Number(searchParams.get('size') ?? 20))

    let query = db
      .from('pembayaran')
      .select(`
        id, doc_number, status, tanggal_pembayaran, nominal_bayar, mata_uang,
        bank_dari_nama, bank_dari_kode,
        bank_tujuan_nama, bank_tujuan_nomor, bank_tujuan_atas_nama,
        requestor_name, approver_name, pic_finance_name,
        permintaan_uang_id, catatan, submitted_at, approved_at, paid_at, created_at,
        permintaan_uang:permintaan_uang_id(id, doc_number, nominal, mata_uang, tanggal_kebutuhan, requestor_name, dasar_pengajuan, status)
      `)
      .eq('tenant_id', TENANT)
      .is('deleted_at', null)

    if (status) query = query.eq('status', status)
    if (search) query = query.or(`doc_number.ilike.%${search}%,bank_tujuan_nama.ilike.%${search}%`)

    const { data, error } = await query
      .order('tanggal_pembayaran', { ascending: true })
      .range((page - 1) * size, page * size - 1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const ids = (data ?? []).map((r: any) => r.id)
    const biayaMap = await getPembayaranRows(db, ids)

    const rows = (data ?? []).map((r: any) => ({
      ...r,
      permintaan_uang: Array.isArray(r.permintaan_uang) ? r.permintaan_uang[0] ?? null : r.permintaan_uang ?? null,
      biaya_lain: biayaMap[r.id] ?? [],
    }))

    return NextResponse.json({ data: rows, meta: { page, size, total: rows.length } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = createAdminClient()
    const body = await request.json()

    const {
      permintaan_uang_id, tanggal_pembayaran, nominal_bayar, mata_uang = 'IDR',
      bank_dari_coa_id, bank_dari_nama, bank_dari_kode,
      bank_tujuan_nama, bank_tujuan_nomor, bank_tujuan_atas_nama,
      requestor_id, requestor_name, requestor_dept, requestor_position, requestor_grade,
      approver_id, approver_name, approver_dept, approver_position, approver_grade,
      pic_finance_id, pic_finance_name, pic_finance_dept, pic_finance_position, pic_finance_grade,
      biaya_lain = [], catatan,
    } = body

    if (!permintaan_uang_id || !tanggal_pembayaran || !nominal_bayar || !bank_tujuan_nama || !bank_tujuan_nomor) {
      return NextResponse.json({ error: 'Field wajib: permintaan_uang_id, tanggal_pembayaran, nominal_bayar, bank_tujuan_nama, bank_tujuan_nomor' }, { status: 400 })
    }

    // Verify PU is APPROVED
    const { data: pu } = await db
      .from('permintaan_uang')
      .select('status')
      .eq('id', permintaan_uang_id)
      .eq('tenant_id', TENANT)
      .single()

    if (!pu || pu.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Permintaan Uang harus berstatus APPROVED' }, { status: 422 })
    }

    const doc_number = await genDocNumber(db)

    const { data: pay, error: insertErr } = await db
      .from('pembayaran')
      .insert({
        tenant_id: TENANT,
        doc_number,
        status: 'DRAFT',
        permintaan_uang_id,
        tanggal_pembayaran,
        nominal_bayar,
        mata_uang,
        bank_dari_coa_id: bank_dari_coa_id || null,
        bank_dari_nama: bank_dari_nama || null,
        bank_dari_kode: bank_dari_kode || null,
        bank_tujuan_nama,
        bank_tujuan_nomor,
        bank_tujuan_atas_nama: bank_tujuan_atas_nama || null,
        requestor_id: requestor_id || null,
        requestor_name: requestor_name || null,
        requestor_dept: requestor_dept || null,
        requestor_position: requestor_position || null,
        requestor_grade: requestor_grade || null,
        approver_id: approver_id || null,
        approver_name: approver_name || null,
        approver_dept: approver_dept || null,
        approver_position: approver_position || null,
        approver_grade: approver_grade || null,
        pic_finance_id: pic_finance_id || null,
        pic_finance_name: pic_finance_name || null,
        pic_finance_dept: pic_finance_dept || null,
        pic_finance_position: pic_finance_position || null,
        pic_finance_grade: pic_finance_grade || null,
        catatan: catatan || null,
        created_by: requestor_id || null,
      })
      .select()
      .single()

    if (insertErr || !pay) return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 500 })

    // Insert biaya lain-lain
    if (biaya_lain.length > 0) {
      await db.from('pembayaran_biaya_lain').insert(
        biaya_lain.map((b: any, i: number) => ({
          pembayaran_id: pay.id,
          urutan: i + 1,
          deskripsi: b.deskripsi,
          nominal: Number(b.nominal) || 0,
          coa_id: b.coa_id || null,
          coa_kode: b.coa_kode || null,
          coa_nama: b.coa_nama || null,
        }))
      )
    }

    return NextResponse.json({ data: { ...pay, biaya_lain } }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
