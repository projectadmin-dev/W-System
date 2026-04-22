import { createServerClient } from '../supabase-server'
import type { HrEmployeeDocument, HrEmployeeDocumentInsert, HrEmployeeDocumentUpdate } from '../types/hc'

/**
 * Get all documents for an employee
 */
export async function getEmployeeDocuments(employeeId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_employee_documents')
    .select(`
      *,
      verifier:verified_by(full_name)
    `)
    .eq('employee_id', employeeId)
    .order('document_type', { ascending: true })

  if (error) throw new Error(`Failed to fetch documents: ${error.message}`)
  return data || []
}

/**
 * Get single document by ID
 */
export async function getDocumentById(id: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_employee_documents')
    .select(`
      *,
      verifier:verified_by(full_name)
    `)
    .eq('id', id)
    .single()

  if (error) throw new Error(`Failed to fetch document: ${error.message}`)
  return data
}

/**
 * Get documents by type
 */
export async function getDocumentsByType(employeeId: string, documentType: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_employee_documents')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('document_type', documentType)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch documents: ${error.message}`)
  return data || []
}

/**
 * Create document record
 */
export async function createDocument(document: HrEmployeeDocumentInsert) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_employee_documents')
    .insert(document)
    .select()
    .single()

  if (error) throw new Error(`Failed to create document: ${error.message}`)
  return data
}

/**
 * Update document
 */
export async function updateDocument(id: string, updates: HrEmployeeDocumentUpdate) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_employee_documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update document: ${error.message}`)
  return data
}

/**
 * Delete document
 */
export async function deleteDocument(id: string) {
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('hr_employee_documents')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete document: ${error.message}`)
  return { success: true }
}

/**
 * Verify a document (mark as verified)
 */
export async function verifyDocument(id: string, verifiedByUserId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('hr_employee_documents')
    .update({
      is_verified: true,
      verified_by: verifiedByUserId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to verify document: ${error.message}`)
  return data
}

/**
 * Get upload URL for document files (via Supabase Storage)
 */
export async function getDocumentUploadUrl(
  employeeId: string,
  documentType: string,
  fileName: string
): Promise<{ signedUrl: string; filePath: string }> {
  const supabase = await createServerClient()

  const fileExt = fileName.split('.').pop() || 'pdf'
  const timestamp = Date.now()
  const filePath = `${employeeId}/${documentType}/${timestamp}.${fileExt}`

  const { data, error } = await supabase.storage
    .from('employee-documents')
    .createSignedUploadUrl(filePath)

  if (error) throw new Error(`Failed to get upload URL: ${error.message}`)
  return { signedUrl: data.signedUrl, filePath }
}

/**
 * Get public URL for a document file
 */
export async function getDocumentPublicUrl(filePath: string): Promise<string> {
  const supabase = await createServerClient()
  const { data } = supabase.storage
    .from('employee-documents')
    .getPublicUrl(filePath)

  return data.publicUrl
}
