import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

function getTenant() { return TENANT }

async function genDocNumber(db: ReturnType<typeof createAdminClient>): Promise<string> {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `PU-${yyyy}-${mm}-`
  const { count } = await db
    .from('permintaan_uang')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TENANT)
    .like('doc_number', `${prefix}%`)
  const seq = String((count ?? 0) + 1).padStart(4, '0')
  return `${prefix}${seq}`
}

export async function GET(request: NextRequest) {
  try {
    const db = createAdminClient()
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const search = searchParams.get('search') ?? ''
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const size = Math.min(100, Number(searchParams.get('size') ?? 20))

    let query = db
      .from('permintaan_uang')
      .select(`
        id, doc_number, status, tanggal_permintaan, tanggal_kebutuhan,
        nominal, mata_uang, dasar_pengajuan, catatan,
        project_id, requestor_id, requestor_name, requestor_dept, requestor_position, requestor_grade,
        submitted_at, approved_at, rejected_at, paid_at, created_at,
        projects:project_id(id, project_code, project_name)
      `)
      .eq('tenant_id', TENANT)
      .is('deleted_at', null)

    if (status) query = query.eq('status', status)
    if (search) query = query.or(`requestor_name.ilike.%${search}%,doc_number.ilike.%${search}%`)
    if (dateFrom) query = query.gte('tanggal_permintaan', dateFrom)
    if (dateTo) query = query.lte('tanggal_permintaan', dateTo)

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * size, page * size - 1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Attach items for each PU
    const ids = (data ?? []).map((r: any) => r.id)
    let itemsMap: Record<string, any[]> = {}
    if (ids.length > 0) {
      const { data: items } = await db
        .from('permintaan_uang_items')
        .select('*')
        .in('permintaan_uang_id', ids)
        .order('urutan')
      for (const it of items ?? []) {
        if (!itemsMap[it.permintaan_uang_id]) itemsMap[it.permintaan_uang_id] = []
        itemsMap[it.permintaan_uang_id].push(it)
      }
    }

    const rows = (data ?? []).map((r: any) => ({
      ...r,
      project: Array.isArray(r.projects) ? r.projects[0] ?? null : r.projects ?? null,
      projects: undefined,
      items: itemsMap[r.id] ?? [],
      approval_steps: [],
    }))

    return NextResponse.json({ data: rows, meta: { page, size, total: count ?? rows.length } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = createAdminClient()
    const body = await request.json()

    const { tanggal_permintaan, tanggal_kebutuhan, nominal, mata_uang = 'IDR',
      dasar_pengajuan, project_id, internal_items = [], requestor_id,
      requestor_nik, requestor_name, requestor_dept, requestor_position, requestor_grade,
      catatan, submit = false } = body

    if (!tanggal_kebutuhan || !nominal || !dasar_pengajuan || !requestor_id) {
      return NextResponse.json({ error: 'Wajib: tanggal_kebutuhan, nominal, dasar_pengajuan, requestor_id' }, { status: 400 })
    }
    if (dasar_pengajuan === 'PROJECT' && !project_id) {
      return NextResponse.json({ error: 'project_id wajib jika dasar_pengajuan = PROJECT' }, { status: 400 })
    }
    if (dasar_pengajuan === 'INTERNAL' && (!internal_items || internal_items.length === 0)) {
      return NextResponse.json({ error: 'Minimal 1 item kebutuhan internal' }, { status: 400 })
    }

    const doc_number = await genDocNumber(db)

    const { data: pu, error: insertErr } = await db
      .from('permintaan_uang')
      .insert({
        tenant_id: TENANT,
        doc_number,
        status: submit ? 'PENDING_APPROVAL' : 'DRAFT',
        tanggal_permintaan: tanggal_permintaan || new Date().toISOString().split('T')[0],
        tanggal_kebutuhan,
        nominal,
        mata_uang,
        dasar_pengajuan,
        project_id: project_id || null,
        requestor_id,
        requestor_nik: requestor_nik || null,
        requestor_name: requestor_name || null,
        requestor_dept: requestor_dept || null,
        requestor_position: requestor_position || null,
        requestor_grade: requestor_grade || null,
        catatan: catatan || null,
        submitted_at: submit ? new Date().toISOString() : null,
        created_by: requestor_id,
      })
      .select()
      .single()

    if (insertErr || !pu) return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 500 })

    // Insert items if INTERNAL
    if (dasar_pengajuan === 'INTERNAL' && internal_items.length > 0) {
      await db.from('permintaan_uang_items').insert(
        internal_items.map((it: any, i: number) => ({
          permintaan_uang_id: pu.id,
          urutan: i + 1,
          deskripsi: it.deskripsi,
          nominal: it.nominal ? Number(it.nominal) : null,
        }))
      )
    }

    return NextResponse.json({ data: { ...pu, items: internal_items, approval_steps: [] } }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
