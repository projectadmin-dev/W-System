import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

async function genVendorCode(db: ReturnType<typeof createAdminClient>): Promise<string> {
  const yyyy = new Date().getFullYear()
  const { count } = await db
    .from('fin_vendors')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', TENANT)
    .like('vendor_code', `VND-${yyyy}-%`)
  return `VND-${yyyy}-${String((count ?? 0) + 1).padStart(4, '0')}`
}

export async function GET(request: NextRequest) {
  try {
    const db = createAdminClient()
    const { searchParams } = request.nextUrl
    const search    = searchParams.get('search') ?? ''
    const status    = searchParams.get('status')   // 'active' | 'inactive'
    const category  = searchParams.get('category') // vendor_category value
    const page      = Math.max(1, Number(searchParams.get('page') ?? 1))
    const size      = Math.min(200, Number(searchParams.get('size') ?? 100))

    let q = db
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
      `, { count: 'exact' })
      .eq('tenant_id', TENANT)
      .is('deleted_at', null)

    if (status === 'active')   q = q.eq('is_active', true)
    if (status === 'inactive') q = q.eq('is_active', false)
    if (category)              q = q.eq('vendor_category', category)
    if (search) {
      q = q.or(
        `vendor_name.ilike.%${search}%,vendor_code.ilike.%${search}%,email.ilike.%${search}%,npwp.ilike.%${search}%`
      )
    }

    const { data, error, count } = await q
      .order('vendor_name', { ascending: true })
      .range((page - 1) * size, page * size - 1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? []).map((v: any) => ({
      ...v,
      coa: Array.isArray(v.coa) ? v.coa[0] ?? null : v.coa ?? null,
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

    const {
      vendor_name, vendor_type = 'company', vendor_category = 'supplier',
      email, phone, address, website,
      npwp, tax_type = 'non_pkp',
      payment_terms_days = 30, payment_method = 'transfer', currency = 'IDR',
      credit_limit, coa_id,
      bank_name, bank_account_name, bank_account_number,
      pic_name, pic_email, pic_phone,
      notes, is_active = true,
      vendor_code: providedCode,
    } = body

    if (!vendor_name?.trim()) {
      return NextResponse.json({ error: 'vendor_name wajib diisi' }, { status: 400 })
    }

    const vendor_code = providedCode?.trim() || await genVendorCode(db)

    const { data, error } = await db
      .from('fin_vendors')
      .insert({
        tenant_id: TENANT,
        vendor_code,
        vendor_name: vendor_name.trim(),
        vendor_type,
        vendor_category,
        email:                email || null,
        phone:                phone || null,
        address:              address || null,
        website:              website || null,
        npwp:                 npwp || null,
        tax_type,
        payment_terms_days,
        payment_method,
        currency,
        credit_limit:         credit_limit ? Number(credit_limit) : null,
        coa_id:               coa_id || null,
        bank_name:            bank_name || null,
        bank_account_name:    bank_account_name || null,
        bank_account_number:  bank_account_number || null,
        pic_name:             pic_name || null,
        pic_email:            pic_email || null,
        pic_phone:            pic_phone || null,
        notes:                notes || null,
        is_active,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
