import { NextRequest, NextResponse } from 'next/server'
import {
  getDocumentById,
  updateDocument,
  deleteDocument,
  verifyDocument,
} from '@/lib/repositories/hr-employee-documents'

/**
 * GET /api/hc/employee-documents/[id]
 * Get single document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const document = await getDocumentById(id)
    return NextResponse.json({ data: document })
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/hc/employee-documents/[id]
 * Update document metadata, or verify it
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (body.action === 'verify') {
      const { data: { user } } = await (await import('@/lib/supabase-server')).createServerClient().auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const document = await verifyDocument(id, user.id)
      return NextResponse.json({ message: 'Document verified', data: document })
    }

    const updates: Record<string, any> = {}
    const allowedFields = [
      'document_type', 'document_name', 'notes',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const document = await updateDocument(id, updates)
    return NextResponse.json({ message: 'Document updated', data: document })
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/hc/employee-documents/[id]
 * Delete document (including file from storage)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get document first to get file path
    const document = await getDocumentById(id)

    // Delete from storage if URL exists
    if (document?.file_url) {
      try {
        const supabase = (await import('@/lib/supabase-server')).createServerClient()
        const url = new URL(document.file_url)
        const pathMatch = url.pathname.match(/employee-documents\/(.*)/)
        if (pathMatch) {
          await supabase.storage.from('employee-documents').remove([pathMatch[1]])
        }
      } catch (storageError) {
        console.warn('Failed to delete file from storage:', storageError)
      }
    }

    await deleteDocument(id)
    return NextResponse.json({ message: 'Document deleted' })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
