import { NextRequest, NextResponse } from 'next/server'
import { reverseJournalsForSource } from '@/lib/finance/journal-engine'

const SYSTEM_USER = '812558af-8be8-4c53-b581-e6a4f1c91147'

/**
 * POST /api/finance/journal/reverse-source
 * Reverse all active journals tied to a source document (cancellation/void).
 * Body: { source_type, source_id, reason, created_by? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const sourceType = body.source_type ?? body.referensi_tipe
    const sourceId = body.source_id ?? body.referensi_id
    const reason = body.reason ?? body.alasan ?? 'Dibatalkan'
    const userId = body.created_by ?? SYSTEM_USER

    if (!sourceType || !sourceId) {
      return NextResponse.json({ error: 'source_type dan source_id wajib diisi' }, { status: 400 })
    }

    const result = await reverseJournalsForSource(sourceType, sourceId, reason, userId)
    return NextResponse.json({ data: result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
