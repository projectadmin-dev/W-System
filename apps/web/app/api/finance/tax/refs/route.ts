import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

// GET /api/finance/tax/refs — reference data for the withholding UI:
// active DPP categories + the PPh default-rate table. Keeps the input form's
// preview in sync with the data-driven config (no hard-coded rates).
export async function GET() {
  try {
    const db = createAdminClient()
    const [{ data: dpp }, { data: tarif }] = await Promise.all([
      db
        .from('dpp_kategori')
        .select('id, kode, nama, jenis_pajak, metode, faktor')
        .eq('tenant_id', TENANT)
        .eq('is_aktif', true)
        .order('kode', { ascending: true }),
      db
        .from('pph_tarif_default')
        .select('pph_jenis, ber_npwp, tarif')
        .eq('tenant_id', TENANT)
        .eq('is_aktif', true),
    ])
    return NextResponse.json({ dpp_kategori: dpp ?? [], pph_tarif: tarif ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
