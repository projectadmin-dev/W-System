import { NextRequest, NextResponse } from 'next/server'
import { bulkUpdateAttributes, type AttributeImportRow } from '@/lib/repositories/finance-coa-hierarchy'

/**
 * POST /api/finance/coa/hierarchy/attributes
 * Body: { rows: [{ layer, coa_full_code, updates: {flag: value} }] }
 * Phase 2: COA Attribute Import (flags only, no create/delete)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rows, tenantId } = body as { rows: { layer: string; coa_full_code: string; updates: Record<string, any> }[]; tenantId?: string }

    // Convert to AttributeImportRow format
    const importRows: AttributeImportRow[] = rows.map((r) => ({
      layer: r.layer,
      coa_full_code: r.coa_full_code,
      name: r.coa_full_code, // not used by BE
      updates: r.updates,
    }))

    const result = await bulkUpdateAttributes(importRows, tenantId)

    return NextResponse.json({
      job_id: `attr-import-${Date.now()}`,
      total_rows: rows.length,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors,
    })
  } catch (error) {
    console.error('COA Attribute Import error:', error)
    return NextResponse.json(
      { error: 'Failed to process attribute import', message: (error as Error).message },
      { status: 500 }
    )
  }
}
