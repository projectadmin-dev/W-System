import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

// PATCH /api/finance/tax/bukti-potong
// Body: { arah: 'keluaran'|'masukan', payment_id, nomor_bukti_potong?, tanggal_bukti_potong? }
// Records the withholding-slip number/date on the underlying payment row.
//   keluaran → ap_payment_history (slip we issue to the vendor)
//   masukan  → ar_payment_history (slip we received from the customer)
export async function PATCH(request: NextRequest) {
  try {
    const db = createAdminClient()
    const body = await request.json().catch(() => ({}))
    const { arah, payment_id, nomor_bukti_potong, tanggal_bukti_potong } = body

    if (!payment_id || (arah !== 'keluaran' && arah !== 'masukan')) {
      return NextResponse.json({ error: 'arah (keluaran|masukan) dan payment_id wajib' }, { status: 400 })
    }
    const table = arah === 'keluaran' ? 'ap_payment_history' : 'ar_payment_history'

    const { data, error } = await db
      .from(table)
      .update({
        nomor_bukti_potong: nomor_bukti_potong?.trim() || null,
        tanggal_bukti_potong: tanggal_bukti_potong || null,
      })
      .eq('id', payment_id)
      .eq('tenant_id', TENANT)
      .select('id, nomor_bukti_potong, tanggal_bukti_potong')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
