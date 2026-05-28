import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

async function getFullPembayaran(db: ReturnType<typeof createAdminClient>, id: string) {
  const { data, error } = await db
    .from('pembayaran')
    .select(`
      *,
      permintaan_uang:permintaan_uang_id(
        id, doc_number, status, nominal, mata_uang, tanggal_kebutuhan,
        dasar_pengajuan, requestor_name, catatan,
        projects:project_id(id, project_code, project_name)
      )
    `)
    .eq('id', id)
    .eq('tenant_id', TENANT)
    .is('deleted_at', null)
    .single()

  if (error || !data) return null

  const { data: biaya } = await db
    .from('pembayaran_biaya_lain')
    .select('*')
    .eq('pembayaran_id', id)
    .order('urutan')

  const puRaw: any = Array.isArray(data.permintaan_uang)
    ? data.permintaan_uang[0] ?? null
    : data.permintaan_uang ?? null

  const pu = puRaw ? {
    ...puRaw,
    project: Array.isArray(puRaw.projects) ? puRaw.projects[0] ?? null : puRaw.projects ?? null,
    projects: undefined,
  } : null

  return { ...data, permintaan_uang: pu, biaya_lain: biaya ?? [] }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = createAdminClient()
    const pay = await getFullPembayaran(db, id)
    if (!pay) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ data: pay })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
