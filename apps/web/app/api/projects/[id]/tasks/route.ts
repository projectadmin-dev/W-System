import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Dummy task data for development
const DUMMY_TASKS = [
  {
    id: 't1',
    project_id: '1',
    title: 'Setup project infrastructure',
    description: 'Configure dev environment, CI/CD pipeline, and initial server setup',
    status: 'done',
    priority: 'high',
    position: 1,
    assignee_id: 'u1',
    due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    started_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    completed_at: new Date(Date.now() - 86400000).toISOString(),
    created_by: 'u1',
  },
  {
    id: 't2',
    project_id: '1',
    title: 'Design database schema',
    description: 'Create ERD and implement migrations for core modules',
    status: 'in_progress',
    priority: 'high',
    position: 2,
    assignee_id: 'u1',
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    started_at: new Date(Date.now() - 86400000).toISOString(),
    completed_at: null,
    created_by: 'u1',
  },
  {
    id: 't3',
    project_id: '1',
    title: 'Implement authentication module',
    description: 'Setup Supabase Auth, RBAC, and session management',
    status: 'todo',
    priority: 'medium',
    position: 3,
    assignee_id: 'u1',
    due_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    started_at: null,
    completed_at: null,
    created_by: 'u1',
  },
  {
    id: 't4',
    project_id: '1',
    title: 'Code review: API endpoints',
    description: 'Review and approve all REST API endpoints for security and performance',
    status: 'in_review',
    priority: 'medium',
    position: 4,
    assignee_id: 'u1',
    due_date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    started_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    completed_at: null,
    created_by: 'u1',
  },
  {
    id: 't5',
    project_id: '1',
    title: 'User acceptance testing',
    description: 'Conduct UAT with client stakeholders and document feedback',
    status: 'backlog',
    priority: 'low',
    position: 5,
    assignee_id: null,
    due_date: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
    started_at: null,
    completed_at: null,
    created_by: 'u1',
  },
  {
    id: 't6',
    project_id: '1',
    title: 'Setup monitoring & logging',
    description: 'Configure Sentry, log aggregation, and alerting dashboards',
    status: 'backlog',
    priority: 'medium',
    position: 6,
    assignee_id: null,
    due_date: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
    started_at: null,
    completed_at: null,
    created_by: 'u1',
  },
  {
    id: 't7',
    project_id: '1',
    title: 'Performance optimization',
    description: 'Profile and optimize slow queries, implement caching layer',
    status: 'todo',
    priority: 'medium',
    position: 7,
    assignee_id: 'u1',
    due_date: new Date(Date.now() + 86400000 * 8).toISOString().split('T')[0],
    started_at: null,
    completed_at: null,
    created_by: 'u1',
  },
  {
    id: 't8',
    project_id: '1',
    title: 'Documentation & knowledge base',
    description: 'Write technical docs, API reference, and user guides',
    status: 'in_progress',
    priority: 'low',
    position: 8,
    assignee_id: 'u1',
    due_date: new Date(Date.now() + 86400000 * 12).toISOString().split('T')[0],
    started_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    completed_at: null,
    created_by: 'u1',
  },
]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params

    // Try Supabase
    try {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data, error } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('position', { ascending: true })

      if (!error && data && data.length > 0) {
        return NextResponse.json({ data, status: 200 })
      }
    } catch (e) {
      console.warn('Supabase unavailable for tasks:', e)
    }

    // Fallback: filter dummy tasks by project_id
    const tasks = DUMMY_TASKS.filter((t) => t.project_id === projectId)
    return NextResponse.json({ data: tasks, status: 200 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const body = await request.json()

    // Try Supabase
    try {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data, error } = await supabase
        .from('project_tasks')
        .insert({
          ...body,
          project_id: projectId,
          position: body.position ?? 0,
        })
        .select()
        .single()

      if (!error && data) {
        return NextResponse.json({ data }, { status: 201 })
      }
    } catch (e) {
      console.warn('Supabase unavailable for tasks insert:', e)
    }

    // Fallback: return mock created task
    const mockTask = {
      id: `t${Date.now()}`,
      project_id: projectId,
      ...body,
      created_at: new Date().toISOString(),
    }
    return NextResponse.json({ data: mockTask }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
