import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getPaymentVouchers, createPaymentVoucher, updatePaymentVoucher,
  deletePaymentVoucher, getSenderAccounts, getVendorOptions,
  getCoaOptionsForVoucher, getPaymentVoucherById,
} from '@/lib/repositories/payment-vouchers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function adminClient() { return createClient(supabaseUrl, supabaseKey) }

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const tenant = sp.get('tenant_id') || undefined
    const vtype = sp.get('type') || undefined
    const status = sp.get('status') || undefined
    const data = await getPaymentVouchers(tenant, vtype, status)
    return NextResponse.json({ data })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = await createPaymentVoucher(body)
    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...rest } = body
    if (!id) throw new Error('ID required')
    const data = await updatePaymentVoucher(id, rest)
    return NextResponse.json({ data })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await deletePaymentVoucher(id)
    return NextResponse.json({ success: true })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}
