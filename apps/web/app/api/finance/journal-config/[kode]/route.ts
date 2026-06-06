import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { validateConfig, type ConfigHeaderInput } from '@/lib/finance/journal-config-options'

const TENANT = '00000000-0000-0000-0000-000000000001'

// PUT /api/finance/journal-config/:kode — update header + REPLACE all detail lines.
// Body: { nama_fitur, modul_referensi, tipe_jurnal, keterangan?, detail: [...] }
//
// Detail lines are replaced wholesale (delete + re-insert) rather than diffed —
// the line set is small and this keeps the balance/CHECK invariants atomic.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ kode: string }> },
) {
  try {
    const db = createAdminClient()
    const { kode } = await params
    const body = (await request.json()) as ConfigHeaderInput

    // Validate using the existing kode (path is authoritative over body).
    const { ok, errors } = validateConfig({ ...body, kode_konfigurasi: kode })
    if (!ok) {
      return NextResponse.json({ error: errors.join('; '), errors }, { status: 400 })
    }

    const { data: current } = await db
      .from('konfigurasi_jurnal')
      .select('id')
      .eq('tenant_id', TENANT)
      .eq('kode_konfigurasi', kode)
      .is('deleted_at', null)
      .maybeSingle()
    if (!current) {
      return NextResponse.json({ error: `Konfigurasi "${kode}" tidak ditemukan` }, { status: 404 })
    }

    const { error: headerErr } = await db
      .from('konfigurasi_jurnal')
      .update({
        nama_fitur: body.nama_fitur.trim(),
        modul_referensi: body.modul_referensi,
        tipe_jurnal: body.tipe_jurnal.trim(),
        keterangan: body.keterangan?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.id)
    if (headerErr) return NextResponse.json({ error: headerErr.message }, { status: 500 })

    // Replace detail lines.
    const { error: delErr } = await db
      .from('konfigurasi_jurnal_detail')
      .delete()
      .eq('konfigurasi_id', current.id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    const detailRows = body.detail.map((d, i) => ({
      tenant_id: TENANT,
      konfigurasi_id: current.id,
      coa_id: d.coa_id || null,
      dynamic_source: d.dynamic_source || null,
      posisi: d.posisi,
      sumber_nominal: d.sumber_nominal,
      urutan: d.urutan ?? i + 1,
      keterangan_baris: d.keterangan_baris?.trim() || null,
      is_optional: !!d.is_optional,
    }))

    const { error: insErr } = await db.from('konfigurasi_jurnal_detail').insert(detailRows)
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    return NextResponse.json({ data: { id: current.id, kode_konfigurasi: kode } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE /api/finance/journal-config/:kode — soft delete (set deleted_at).
// Existing journals already posted are unaffected; this only stops the engine
// from using this trigger going forward (same effect as toggling off, but hides it).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ kode: string }> },
) {
  try {
    const db = createAdminClient()
    const { kode } = await params

    const { data: current } = await db
      .from('konfigurasi_jurnal')
      .select('id')
      .eq('tenant_id', TENANT)
      .eq('kode_konfigurasi', kode)
      .is('deleted_at', null)
      .maybeSingle()
    if (!current) {
      return NextResponse.json({ error: `Konfigurasi "${kode}" tidak ditemukan` }, { status: 404 })
    }

    const { error } = await db
      .from('konfigurasi_jurnal')
      .update({ deleted_at: new Date().toISOString(), is_aktif: false })
      .eq('id', current.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: { kode_konfigurasi: kode, deleted: true } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
