import { NextRequest, NextResponse } from 'next/server'
import { getSenderAccounts, getVendorOptions, getCoaOptionsForVoucher } from '@/lib/repositories/payment-vouchers'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const action = sp.get('action')
    const tenant = sp.get('tenant_id') || undefined

    if (action === 'senders') {
      const data = await getSenderAccounts(tenant)
      return NextResponse.json({ data })
    }
    if (action === 'vendors') {
      const data = await getVendorOptions(tenant)
      return NextResponse.json({ data })
    }
    if (action === 'coa') {
      const data = await getCoaOptionsForVoucher()
      return NextResponse.json({ data })
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}
