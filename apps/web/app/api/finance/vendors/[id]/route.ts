import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = createAdminClient()
    const { id } = await params

    const { data, error } = await db
      .from('fin_vendors')
      .select(`
        id, tenant_id, vendor_code, vendor_name, vendor_type, vendor_category,
        email, phone, address, website,
        npwp, tax_type,
        payment_terms_days, payment_method, currency, credit_limit,
        bank_name, bank_account_name, bank_account_number,
        pic_name, pic_email, pic_phone,
        notes, is_active, created_at, updated_at,
        coa:coa_id(id, account_code, account_name)
      `)
      .eq('id', id)
      .eq('tenant_id', TENANT)
      .is('deleted_at', null)
      .single()

    if (error) return NextResponse.json({ error: 'Vendor tidak ditemukan' }, { status: 404 })

    const vendor = {
      ...data,
      coa: Array.isArray((data as any).coa)
        ? (data as any).coa[0] ?? null
        : (data as any).coa ?? null,
    }

    return NextResponse.json({ data: vendor })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = createAdminClient()
    const { id } = await params
    const body = await request.json()

    const allowed = [
      'vendor_name', 'vendor_type', 'vendor_category',
      'email', 'phone', 'address', 'website',
      'npwp', 'tax_type',
      'payment_terms_days', 'payment_method', 'currency', 'credit_limit', 'coa_id',
      'bank_name', 'bank_account_name', 'bank_account_number',
      'pic_name', 'pic_email', 'pic_phone',
      'notes', 'is_active', 'vendor_code',
    ]
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (key in body) updates[key] = body[key] === '' ? null : body[key]
    }

    if ('vendor_name' in updates && !String(updates.vendor_name ?? '').trim()) {
      return NextResponse.json({ error: 'vendor_name wajib diisi' }, { status: 400 })
    }

    const { data, error } = await db
      .from('fin_vendors')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', TENANT)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = createAdminClient()
    const { id } = await params

    const { error } = await db
      .from('fin_vendors')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', TENANT)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
