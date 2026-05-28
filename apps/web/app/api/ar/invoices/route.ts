import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { listInvoicesGrouped, createInvoice } from '@/lib/services/ar-service'
import type { CreateInvoiceRequest } from '@/types/ar'

async function resolveTenant(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const session = await supabase.auth.getSession()
  const tenantId =
    session.data.session?.user?.user_metadata?.tenant_id ??
    session.data.session?.user?.app_metadata?.tenant_id ??
    '00000000-0000-0000-0000-000000000001'

  return { user, tenantId: tenantId as string }
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveTenant(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = request.nextUrl
    const status = (searchParams.get('status_bayar') ?? 'semua') as Parameters<typeof listInvoicesGrouped>[1]['status']
    const search = searchParams.get('search') ?? ''
    const page = Number(searchParams.get('page') ?? 1)
    const size = Number(searchParams.get('size') ?? 50)

    const result = await listInvoicesGrouped(ctx.tenantId, { status, search, page, size })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[AR invoices GET]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveTenant(request)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await request.json()) as CreateInvoiceRequest

    const actorName = ctx.user.user_metadata?.full_name ?? ctx.user.email ?? 'Unknown'
    const result = await createInvoice(ctx.tenantId, ctx.user.id, actorName, body)

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (err) {
    const msg = String(err)
    console.error('[AR invoices POST]', err)
    if (msg.includes('AR_DUPLICATE_NO_INVOICE')) return NextResponse.json({ error: msg }, { status: 409 })
    if (msg.includes('AR_INVALID_RECURRING_DATES')) return NextResponse.json({ error: msg }, { status: 422 })
    if (msg.includes('AR_PROJECT_NOT_FOUND')) return NextResponse.json({ error: msg }, { status: 404 })
    if (msg.includes('AR_OVERPAY')) return NextResponse.json({ error: msg }, { status: 422 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
