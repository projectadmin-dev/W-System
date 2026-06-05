import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

// GET /api/finance/journal-config — list journal automation configs (+ detail lines)
// Query: ?modul=penjualan&is_aktif=1&kode=AR-INV-ISSUE
export async function GET(request: NextRequest) {
  try {
    const db = createAdminClient()
    const sp = request.nextUrl.searchParams
    const modul = sp.get('modul')
    const isAktif = sp.get('is_aktif')
    const kode = sp.get('kode')

    let q = db
      .from('konfigurasi_jurnal')
      .select(
        `*, detail:konfigurasi_jurnal_detail(
            id, coa_id, dynamic_source, posisi, sumber_nominal, urutan, keterangan_baris, is_optional,
            coa:coa_id ( account_code, account_name )
        )`,
      )
      .eq('tenant_id', TENANT)
      .is('deleted_at', null)
      .order('kode_konfigurasi', { ascending: true })

    if (modul) q = q.eq('modul_referensi', modul)
    if (kode) q = q.eq('kode_konfigurasi', kode)
    if (isAktif != null) q = q.eq('is_aktif', isAktif === '1' || isAktif === 'true')

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Sort detail lines by urutan (nested order is not guaranteed by the embed).
    const result = (data ?? []).map((cfg: any) => ({
      ...cfg,
      detail: (cfg.detail ?? []).sort((a: any, b: any) => a.urutan - b.urutan),
    }))

    return NextResponse.json({ data: result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
