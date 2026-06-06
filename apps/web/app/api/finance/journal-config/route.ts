import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { validateConfig, type ConfigHeaderInput } from '@/lib/finance/journal-config-options'

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

// POST /api/finance/journal-config — create a new config (header + detail lines)
// Body: { kode_konfigurasi, nama_fitur, modul_referensi, tipe_jurnal, keterangan?, detail: [...] }
//
// NOTE: a new trigger code is *dormant* until a business route calls
// processJournalAutomation({ triggerCode }) with a matching nominals/dynamic
// payload. Storing the config here does not by itself generate any journal.
export async function POST(request: NextRequest) {
  try {
    const db = createAdminClient()
    const body = (await request.json()) as ConfigHeaderInput

    const { ok, errors } = validateConfig(body)
    if (!ok) {
      return NextResponse.json({ error: errors.join('; '), errors }, { status: 400 })
    }

    // Reject duplicate kode (active rows only).
    const { data: existing } = await db
      .from('konfigurasi_jurnal')
      .select('id')
      .eq('tenant_id', TENANT)
      .eq('kode_konfigurasi', body.kode_konfigurasi)
      .is('deleted_at', null)
      .maybeSingle()
    if (existing) {
      return NextResponse.json(
        { error: `Konfigurasi "${body.kode_konfigurasi}" sudah ada` },
        { status: 409 },
      )
    }

    const { data: header, error: headerErr } = await db
      .from('konfigurasi_jurnal')
      .insert({
        tenant_id: TENANT,
        kode_konfigurasi: body.kode_konfigurasi.trim(),
        nama_fitur: body.nama_fitur.trim(),
        modul_referensi: body.modul_referensi,
        tipe_jurnal: body.tipe_jurnal.trim(),
        keterangan: body.keterangan?.trim() || null,
        is_aktif: true,
      })
      .select()
      .single()
    if (headerErr) return NextResponse.json({ error: headerErr.message }, { status: 500 })

    const detailRows = body.detail.map((d, i) => ({
      tenant_id: TENANT,
      konfigurasi_id: header.id,
      coa_id: d.coa_id || null,
      dynamic_source: d.dynamic_source || null,
      posisi: d.posisi,
      sumber_nominal: d.sumber_nominal,
      urutan: d.urutan ?? i + 1,
      keterangan_baris: d.keterangan_baris?.trim() || null,
      is_optional: !!d.is_optional,
    }))

    const { error: detailErr } = await db.from('konfigurasi_jurnal_detail').insert(detailRows)
    if (detailErr) {
      // Roll back the header so we never leave an orphan config with no lines.
      await db.from('konfigurasi_jurnal').delete().eq('id', header.id)
      return NextResponse.json({ error: detailErr.message }, { status: 500 })
    }

    return NextResponse.json({ data: header }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
