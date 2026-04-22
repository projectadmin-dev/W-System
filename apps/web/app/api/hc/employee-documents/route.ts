import { NextRequest, NextResponse } from 'next/server'
import {
  getEmployeeDocuments,
  createDocument,
  getDocumentUploadUrl,
} from '@/lib/repositories/hr-employee-documents'
import { createServerClient } from '@/lib/supabase-server'

/**
 * GET /api/hc/employee-documents?employee_id=xxx
 * Get all documents for an employee
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const employeeId = searchParams.get('employee_id')

    if (!employeeId) {
      return NextResponse.json(
        { error: 'employee_id query param is required' },
        { status: 400 }
      )
    }

    const documents = await getEmployeeDocuments(employeeId)
    return NextResponse.json({ data: documents })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/hc/employee-documents
 * Create document record (after file upload to storage)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 403 })
    }

    const body = await request.json()

    if (!body.employee_id || !body.document_type || !body.document_name || !body.file_url) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, document_type, document_name, file_url' },
        { status: 400 }
      )
    }

    const document = await createDocument({
      tenant_id: profile.tenant_id,
      employee_id: body.employee_id,
      document_type: body.document_type,
      document_name: body.document_name,
      file_url: body.file_url,
      file_size: body.file_size || null,
      mime_type: body.mime_type || null,
      is_verified: false,
      notes: body.notes || null,
    })

    return NextResponse.json(
      { message: 'Document recorded', data: document },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
