import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// GET /api/finance/employees?search=&size=30
export async function GET(request: NextRequest) {
  try {
    const db = createAdminClient()
    const { searchParams } = request.nextUrl
    const search = searchParams.get('search') ?? ''
    const size = Math.min(Number(searchParams.get('size') ?? 30), 100)

    let query = db
      .from('user_profiles')
      .select(`
        id, full_name, nik, department,
        department_id,
        position:hr_positions(id, name),
        grade:hr_job_grades(id, code, name)
      `)
      .eq('is_active', true)
      .is('deleted_at', null)
      .limit(size)

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,nik.ilike.%${search}%`)
    }

    const { data, error } = await query.order('full_name')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const employees = (data ?? []).map((u: any) => ({
      id: u.id,
      full_name: u.full_name,
      nik: u.nik ?? '',
      department: u.department ?? '',
      department_id: u.department_id ?? '',
      position_name: Array.isArray(u.position) ? (u.position[0]?.name ?? '') : (u.position?.name ?? ''),
      grade: Array.isArray(u.grade) ? (u.grade[0]?.code ?? '') : (u.grade?.code ?? ''),
    }))

    return NextResponse.json({ data: employees })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
