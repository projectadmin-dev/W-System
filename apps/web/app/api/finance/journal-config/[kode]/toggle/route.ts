import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

// PATCH /api/finance/journal-config/:kode/toggle
// Toggles is_aktif, or sets it explicitly via body { is_aktif: boolean }.
// Disabling a config makes the engine skip its trigger (no journal produced).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ kode: string }> },
) {
  try {
    const db = createAdminClient()
    const { kode } = await params
    const body = await request.json().catch(() => ({}))

    const { data: current } = await db
      .from('konfigurasi_jurnal')
      .select('id, is_aktif')
      .eq('tenant_id', TENANT)
      .eq('kode_konfigurasi', kode)
      .is('deleted_at', null)
      .maybeSingle()

    if (!current) {
      return NextResponse.json({ error: `Konfigurasi "${kode}" tidak ditemukan` }, { status: 404 })
    }

    const nextActive =
      typeof body.is_aktif === 'boolean' ? body.is_aktif : !current.is_aktif

    const { data, error } = await db
      .from('konfigurasi_jurnal')
      .update({ is_aktif: nextActive, updated_at: new Date().toISOString() })
      .eq('id', current.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
