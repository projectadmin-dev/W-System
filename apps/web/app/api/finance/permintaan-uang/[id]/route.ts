import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

async function getPUWithDetails(db: ReturnType<typeof createAdminClient>, id: string) {
  const { data: pu, error } = await db
    .from('permintaan_uang')
    .select(`
      *,
      projects:project_id(id, project_code, project_name)
    `)
    .eq('id', id)
    .eq('tenant_id', TENANT)
    .is('deleted_at', null)
    .single()

  if (error || !pu) return null

  const { data: items } = await db
    .from('permintaan_uang_items')
    .select('*')
    .eq('permintaan_uang_id', id)
    .order('urutan')

  const { data: steps } = await db
    .from('pu_approval_steps')
    .select('*')
    .eq('permintaan_uang_id', id)
    .order('level')

  return {
    ...pu,
    project: Array.isArray(pu.projects) ? pu.projects[0] ?? null : pu.projects ?? null,
    projects: undefined,
    items: items ?? [],
    approval_steps: steps ?? [],
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = createAdminClient()
    const pu = await getPUWithDetails(db, id)
    if (!pu) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: pu })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = createAdminClient()
    const body = await request.json()

    // Only allow editing DRAFT
    const { data: existing } = await db
      .from('permintaan_uang')
      .select('status')
      .eq('id', id)
      .eq('tenant_id', TENANT)
      .single()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Hanya dokumen DRAFT yang bisa diedit' }, { status: 422 })
    }

    const allowed = ['tanggal_permintaan','tanggal_kebutuhan','nominal','mata_uang',
      'dasar_pengajuan','project_id','catatan','requestor_id','requestor_nik',
      'requestor_name','requestor_dept','requestor_position','requestor_grade']
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const k of allowed) { if (k in body) patch[k] = body[k] }

    await db.from('permintaan_uang').update(patch).eq('id', id)

    // Replace items if provided
    if (body.internal_items !== undefined) {
      await db.from('permintaan_uang_items').delete().eq('permintaan_uang_id', id)
      if (body.internal_items.length > 0) {
        await db.from('permintaan_uang_items').insert(
          body.internal_items.map((it: any, i: number) => ({
            permintaan_uang_id: id,
            urutan: i + 1,
            deskripsi: it.deskripsi,
            nominal: it.nominal ? Number(it.nominal) : null,
          }))
        )
      }
    }

    const updated = await getPUWithDetails(db, id)
    return NextResponse.json({ data: updated })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
