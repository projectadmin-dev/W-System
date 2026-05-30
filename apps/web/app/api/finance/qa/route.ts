import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

const TENANT = '00000000-0000-0000-0000-000000000001'

// ── GET: list test runs (optionally filtered by module) + their cases ────────
export async function GET(request: NextRequest) {
  try {
    const db = createAdminClient()
    const module = request.nextUrl.searchParams.get('module')

    let q = db
      .from('qa_test_runs')
      .select('*')
      .eq('tenant_id', TENANT)
      .is('deleted_at', null)
      .order('executed_at', { ascending: false })
    if (module) q = q.eq('module', module)

    const { data: runs, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const ids = (runs ?? []).map((r) => r.id)
    const casesByRun: Record<string, any[]> = {}
    if (ids.length > 0) {
      const { data: cases } = await db
        .from('qa_test_cases')
        .select('*')
        .in('run_id', ids)
        .order('seq', { ascending: true })
      for (const c of cases ?? []) {
        ;(casesByRun[c.run_id] ??= []).push(c)
      }
    }

    const data = (runs ?? []).map((r) => ({ ...r, cases: casesByRun[r.id] ?? [] }))
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── POST: log a new test run with its cases ──────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const db = createAdminClient()
    const body = await request.json()
    const {
      module, title, description, environment, executed_by,
      cases = [],
    } = body

    if (!module || !title) {
      return NextResponse.json({ error: 'Wajib: module, title' }, { status: 400 })
    }

    const arr: any[] = Array.isArray(cases) ? cases : []
    const passed = arr.filter((c) => c.status === 'PASS').length
    const failed = arr.filter((c) => c.status === 'FAIL').length
    const blocked = arr.filter((c) => c.status === 'BLOCKED').length
    const skipped = arr.filter((c) => c.status === 'NA').length
    const total = arr.length
    const pass_rate = total > 0 ? Math.round((passed / total) * 10000) / 100 : 0
    const status = failed > 0 ? 'FAIL' : blocked > 0 ? 'PARTIAL' : 'PASS'

    const { data: run, error: runErr } = await db
      .from('qa_test_runs')
      .insert({
        tenant_id: TENANT,
        module, title,
        description: description || null,
        environment: environment || null,
        executed_by: executed_by || null,
        total, passed, failed, blocked, skipped, pass_rate, status,
      })
      .select()
      .single()
    if (runErr || !run) return NextResponse.json({ error: runErr?.message ?? 'Insert gagal' }, { status: 500 })

    if (arr.length > 0) {
      await db.from('qa_test_cases').insert(
        arr.map((c, i) => ({
          run_id: run.id,
          tenant_id: TENANT,
          case_code: c.case_code ?? `TC-${String(i + 1).padStart(3, '0')}`,
          user_story: c.user_story ?? null,
          title: c.title ?? '',
          category: c.category ?? 'functional',
          method: c.method ?? 'Automated',
          priority: c.priority ?? 'Medium',
          expected: c.expected ?? null,
          actual: c.actual ?? null,
          status: c.status ?? 'PASS',
          notes: c.notes ?? null,
          seq: i + 1,
        }))
      )
    }

    return NextResponse.json({ data: run }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
