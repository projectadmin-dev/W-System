import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'public' }, auth: { autoRefreshToken: false, persistSession: false } }
)

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001'

/* ── auto-generate project code ── */
async function generateProjectCode(): Promise<string> {
  const year = new Date().getFullYear().toString()
  const prefix = `CMP-${year}-`

  const { data } = await supabase
    .from('commercial_projects')
    .select('project_code')
    .ilike('project_code', `${prefix}%`)
    .order('project_code', { ascending: false })
    .limit(1)
    .single()

  let nextNum = 1
  if (data?.project_code) {
    const suffix = data.project_code.slice(prefix.length)
    nextNum = (parseInt(suffix, 10) || 0) + 1
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`
}
/* ── helpers: snake <-> camel ── */
interface ManpowerPayload {
  group: string
  role: string
  nama?: string
  qty: number
  months: number
}

interface DeductionsPayload {
  pajak: number
  founderFee: number
  managementFee: number
  seFee: number
}

interface ToppPayload {
  cogsPct: number
  opexPct: number
}

interface ProjectPayload {
  projectName: string
  pic?: string
  status: string
  type: string
  quotationPublish?: number
  actualDeal?: number
  manpower?: ManpowerPayload[]
  deductions?: DeductionsPayload
  topp?: ToppPayload
  summary?: any
  createdAt?: string
}

function manpowerDbToClient(db: any): any {
  return {
    group: db.group_name,
    role: db.role_name,
    nama: db.employee_name,
    qty: db.qty,
    months: db.months,
    hppRate: db.hpp_rate,
    specialRate: db.special_rate,
    publishRate: db.publish_rate,
    rateCardId: db.rate_card_id,
  }
}

function manpowerClientToDb(projectId: string, payload: ManpowerPayload, rateCard?: any): any {
  return {
    commercial_project_id: projectId,
    rate_card_id: rateCard?.id ?? null,
    group_name: payload.group || '',
    role_name: payload.role || '',
    employee_name: payload.nama || null,
    qty: Math.max(1, payload.qty || 1),
    months: Math.max(0.1, payload.months || 1),
    hpp_rate: rateCard?.hpp ?? 0,
    special_rate: rateCard?.special_rate ?? 0,
    publish_rate: rateCard?.publish_rate ?? 0,
  }
}

function projectDbToClient(db: any): any {
  return {
    id: db.id,
    projectCode: db.project_code || '',
    projectName: db.project_name,
    pic: db.pic || '',
    status: db.status,
    type: db.project_type,
    quotationPublish: Number(db.quotation_publish || 0),
    actualDeal: Number(db.actual_deal || 0),
    deductions: {
      pajak: Number(db.deduction_pajak || 0),
      founderFee: Number(db.deduction_founder_fee || 0),
      managementFee: Number(db.deduction_management_fee || 0),
      seFee: Number(db.deduction_se_fee || 0),
    },
    topp: {
      cogsPct: Number(db.topp_cogs_pct || 0),
      opexPct: Number(db.topp_opex_pct || 0),
    },
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    quotationId: db.quotation_id,
    projectId: db.project_id,
    invoiceId: db.invoice_id,
  }
}

function summaryDbToClient(db: any): any {
  if (!db) return null
  return {
    totalHPP: Number(db.total_hpp || 0),
    totalPublish: Number(db.total_publish || 0),
    totalSpecial: Number(db.total_special || 0),
    maxMonths: Number(db.max_months || 0),
    salesProject: Number(db.sales_project || 0),
    totalDeductions: Number(db.total_deductions || 0),
    profitPublish: Number(db.profit_publish || 0),
    marginPublish: Number(db.margin_publish_pct || 0),
    profitActual: Number(db.profit_actual || 0),
    marginActual: Number(db.margin_actual_pct || 0),
    variance: Number(db.variance || 0),
    variancePct: Number(db.variance_pct || 0),
    cogsAmount: Number(db.cogs_amount || 0),
    opexAmount: Number(db.opex_amount || 0),
  }
}

// Fetch rate-card map to resolve snapshots
async function getRateCardMap() {
  const { data, error } = await supabase
    .from('commercial_rate_cards')
    .select('id,type,group_name,role_name,hpp,special_rate,publish_rate')
    .eq('tenant_id', DEFAULT_TENANT_ID)
    .eq('is_active', true)

  if (error) throw error
  const map = new Map<string, any>()
  data?.forEach((rc) => map.set(`${rc.type}|${rc.group_name}|${rc.role_name}`, rc))
  return map
}

// GET a project fully (project + manpower + summary)
async function getFullProject(projectId: string) {
  const { data: project, error } = await supabase
    .from('commercial_projects')
    .select('*')
    .eq('id', projectId)
    .eq('tenant_id', DEFAULT_TENANT_ID)
    .single()

  if (error) throw error
  if (!project) throw new Error('Project not found')

  const { data: manpower } = await supabase
    .from('commercial_project_manpower')
    .select('*')
    .eq('commercial_project_id', projectId)

  const { data: summary } = await supabase
    .from('v_commercial_project_summary')
    .select('*')
    .eq('id', projectId)
    .eq('tenant_id', DEFAULT_TENANT_ID)
    .single()

  return {
    ...projectDbToClient(project),
    manpower: (manpower || []).map(manpowerDbToClient),
    summary: summaryDbToClient(summary) || {},
  }
}

// ───────────────────────── GET ─────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '500')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Single fetch
    if (id) {
      const result = await getFullProject(id)
      return NextResponse.json(result)
    }

    // List via summary view
    let query = supabase
      .from('v_commercial_project_summary')
      .select('*', { count: 'exact' })
      .eq('tenant_id', DEFAULT_TENANT_ID)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (type) query = query.eq('project_type', type)

    const { data, error, count } = await query

    if (error) throw error

    const mapped = (data || []).map((r: any) => ({
      ...projectDbToClient(r),
      summary: summaryDbToClient(r),
    }))

    return NextResponse.json(mapped)
  } catch (error: any) {
    console.error('Projects GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects', message: error.message },
      { status: 500 }
    )
  }
}

// ───────────────────────── POST ─────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body: ProjectPayload = await request.json()

    if (!body.projectName || !body.projectName.trim()) {
      return NextResponse.json(
        { error: 'Nama project wajib diisi' },
        { status: 400 }
      )
    }

    const rcMap = await getRateCardMap()

    const projectData = {
      tenant_id: DEFAULT_TENANT_ID,
      project_name: body.projectName.trim(),
      pic: body.pic || null,
      status: body.status || 'Draft',
      project_type: body.type,
      quotation_publish: body.quotationPublish || 0,
      actual_deal: body.actualDeal || 0,
      deduction_pajak: body.deductions?.pajak ?? 11,
      deduction_founder_fee: body.deductions?.founderFee ?? 3,
      deduction_management_fee: body.deductions?.managementFee ?? 2,
      deduction_se_fee: body.deductions?.seFee ?? 0,
      topp_cogs_pct: body.topp?.cogsPct ?? 25,
      topp_opex_pct: body.topp?.opexPct ?? 75,
      created_at: body.createdAt ? new Date(body.createdAt).toISOString() : new Date().toISOString(),
    }

    const { data: project, error: pErr } = await supabase
      .from('commercial_projects')
      .insert([projectData])
      .select()
      .single()

    if (pErr) throw pErr
    if (!project) throw new Error('Project insert failed')

    // ── Re-fetch to get trigger-generated project_code ──
    if (body.manpower?.length) {
      const rows = body.manpower.map((m) => {
        const rc = rcMap.get(`${body.type}|${m.group}|${m.role}`)
        return manpowerClientToDb(project.id, m, rc)
      })

      const { error: mErr } = await supabase
        .from('commercial_project_manpower')
        .insert(rows)

      if (mErr) {
        // Rollback
        await supabase.from('commercial_projects').delete().eq('id', project.id)
        throw mErr
      }
    }

    const result = await getFullProject(project.id)
    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Projects POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create project' },
      { status: 500 }
    )
  }
}

// ───────────────────────── PUT ─────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, projectName, pic, status, type, quotationPublish, actualDeal, manpower, deductions, topp } = body

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const updatePayload: any = {}
    if (projectName !== undefined) updatePayload.project_name = projectName
    if (pic !== undefined) updatePayload.pic = pic || null
    if (status !== undefined) updatePayload.status = status
    if (type !== undefined) updatePayload.project_type = type
    if (quotationPublish !== undefined) updatePayload.quotation_publish = Number(quotationPublish)
    if (actualDeal !== undefined) updatePayload.actual_deal = Number(actualDeal)
    if (deductions) {
      updatePayload.deduction_pajak = deductions.pajak
      updatePayload.deduction_founder_fee = deductions.founderFee
      updatePayload.deduction_management_fee = deductions.managementFee
      updatePayload.deduction_se_fee = deductions.seFee
    }
    if (topp) {
      updatePayload.topp_cogs_pct = topp.cogsPct
      updatePayload.topp_opex_pct = topp.opexPct
    }

    const { error: updateErr } = await supabase
      .from('commercial_projects')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', DEFAULT_TENANT_ID)

    if (updateErr) throw updateErr

    // Replace manpower
    if (manpower && Array.isArray(manpower)) {
      await supabase.from('commercial_project_manpower').delete().eq('commercial_project_id', id)

      if (manpower.length > 0) {
        const rcMap = await getRateCardMap()
        const rows = manpower.map((m: ManpowerPayload) => {
          const rc = rcMap.get(`${type || ''}|${m.group}|${m.role}`)
          return manpowerClientToDb(id, m, rc)
        })

        const { error: mpErr } = await supabase
          .from('commercial_project_manpower')
          .insert(rows)

        if (mpErr) throw mpErr
      }
    }

    const result = await getFullProject(id)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Projects PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update project', message: error.message },
      { status: 500 }
    )
  }
}

// ───────────────────────── DELETE (single by query param) ─────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // manpower auto-deleted via CASCADE
    const { error } = await supabase
      .from('commercial_projects')
      .delete()
      .eq('id', id)
      .eq('tenant_id', DEFAULT_TENANT_ID)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Projects DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete project', message: error.message },
      { status: 500 }
    )
  }
}
