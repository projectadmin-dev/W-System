import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'public' }, auth: { autoRefreshToken: false, persistSession: false } }
)

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001'

/* ── DB → frontend shape helpers ── */
function dbToRateCard(db: any) {
  return {
    id: db.id,
    type: db.type,
    group: db.group_name,      // map
    role: db.role_name,        // map
    hpp: Number(db.hpp),
    specialRate: Number(db.special_rate), // map
    publishRate: Number(db.publish_rate), // map
    isActive: db.is_active,
    notes: db.notes,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

function frontendToDb(body: any) {
  return {
    tenant_id: DEFAULT_TENANT_ID,
    type: body.type,
    group_name: body.group?.trim(),
    role_name: body.role?.trim(),
    hpp: Number(body.hpp),
    special_rate: Number(body.specialRate),
    publish_rate: Number(body.publishRate),
    is_active: body.isActive ?? true,
    notes: body.notes,
  }
}

// ───────────────────────── GET ─────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || undefined
    const group = searchParams.get('group') || undefined

    let query = supabase
      .from('commercial_rate_cards')
      .select('*')
      .eq('tenant_id', DEFAULT_TENANT_ID)
      .order('type', { ascending: true })
      .order('group_name', { ascending: true })

    if (type) query = query.eq('type', type)
    if (group) query = query.eq('group_name', group)

    const { data, error } = await query

    if (error) throw error

    const mapped = (data || []).map(dbToRateCard)
    const types  = [...new Set(mapped.map((r) => r.type))]
    const groups = [...new Set(mapped.map((r) => r.group))]

    return NextResponse.json({
      success: true,
      data: mapped,
      meta: { types, groups },
    }, { status: 200 })
  } catch (error: any) {
    console.error('Rate cards GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch rate cards', error: error.message },
      { status: 500 }
    )
  }
}

// ───────────────────────── POST ─────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.type || !body.group || !body.role || body.hpp === undefined || body.specialRate === undefined || body.publishRate === undefined) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const payload = frontendToDb(body)

    const { data, error } = await supabase
      .from('commercial_rate_cards')
      .insert([payload])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: dbToRateCard(data) }, { status: 201 })
  } catch (error: any) {
    console.error('Rate cards POST error:', error)
    if (error?.code === '23505') {
      return NextResponse.json(
        { success: false, message: 'Rate card combination already exists for this type/group/role' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, message: 'Failed to add rate card', error: error.message },
      { status: 500 }
    )
  }
}

// ───────────────────────── PUT ─────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID is required' },
        { status: 400 }
      )
    }

    const updatePayload: any = {}
    if (body.type !== undefined) updatePayload.type = body.type
    if (body.group !== undefined) updatePayload.group_name = body.group.trim()
    if (body.role !== undefined) updatePayload.role_name = body.role.trim()
    if (body.hpp !== undefined) updatePayload.hpp = Number(body.hpp)
    if (body.specialRate !== undefined) updatePayload.special_rate = Number(body.specialRate)
    if (body.publishRate !== undefined) updatePayload.publish_rate = Number(body.publishRate)

    const { data, error } = await supabase
      .from('commercial_rate_cards')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', DEFAULT_TENANT_ID)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: dbToRateCard(data) }, { status: 200 })
  } catch (error: any) {
    console.error('Rate cards PUT error:', error)
    if (error?.code === '23505') {
      return NextResponse.json(
        { success: false, message: 'Rate card combination already exists for this type/group/role' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, message: 'Failed to update rate card', error: error.message },
      { status: 500 }
    )
  }
}

// ───────────────────────── DELETE ─────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('commercial_rate_cards')
      .delete()
      .eq('id', id)
      .eq('tenant_id', DEFAULT_TENANT_ID)

    if (error) throw error

    return NextResponse.json(
      { success: true, message: 'Rate card deleted' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Rate cards DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete rate card', error: error.message },
      { status: 500 }
    )
  }
}
