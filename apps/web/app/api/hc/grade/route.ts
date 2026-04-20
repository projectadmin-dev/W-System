import { NextRequest, NextResponse } from 'next/server'
import { 
  getJobGrades, 
  getJobGradeById, 
  createJobGrade, 
  updateJobGrade, 
  deleteJobGrade 
} from '@/lib/repositories/hr-job-grades'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    if (id) {
      const grade = await getJobGradeById(id)
      return NextResponse.json(grade)
    }
    
    const entityId = searchParams.get('entityId') || undefined
    const branchId = searchParams.get('branchId') || undefined
    const grades = await getJobGrades(entityId, branchId)
    return NextResponse.json(grades)
  } catch (error) {
    console.error('Failed to fetch job grades:', error)
    return NextResponse.json({ error: 'Failed to fetch job grades' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await request.json()
    const grade = await createJobGrade({ ...body, tenant_id: profile.tenant_id })
    return NextResponse.json(grade)
  } catch (error) {
    console.error('Failed to create job grade:', error)
    return NextResponse.json({ error: 'Failed to create job grade' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const body = await request.json()
    const grade = await updateJobGrade(id, body)
    return NextResponse.json(grade)
  } catch (error) {
    console.error('Failed to update job grade:', error)
    return NextResponse.json({ error: 'Failed to update job grade' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const result = await deleteJobGrade(id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to delete job grade:', error)
    return NextResponse.json({ error: 'Failed to delete job grade' }, { status: 500 })
  }
}
