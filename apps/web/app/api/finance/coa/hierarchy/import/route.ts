import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import { createAdminClient } from '@/lib/supabase-server'
import {
  createCategory, createType, createSubAccount, createGl, createDetail,
} from '@/lib/repositories/finance-coa-hierarchy'

/* ── Template CSV ── */
const CSV_TEMPLATE = `Layer,Parent COA Full Code,COA Code,Name,Normal Balance,LK Category,Contra Account,Direct/Indirect,Restricted,CF Section,Working Capital,Non-Cash,Budgeted,Tax Deductible,Sub GL,Washed Out,Trial Balance,Taxation Report,Status
category,,1,AKTIVA,DEBIT,ASSET,,,,,,,,,,,,,Active
category,,2,KEWAJIBAN,CREDIT,LIABILITY,,,,,,,,,,,,,Active
category,,3,EKUITAS,CREDIT,EQUITY,,,,,,,,,,,,,Active
category,,4,PENDAPATAN,CREDIT,REVENUE,,,,,,,,,,,,,Active
category,,5,BEBAN,DEBIT,EXPENSE,,,,,,,,,,,,,Active
type,1,1-1,AKTIVA LANCAR,,,No,Direct,,,,,,,,,,,Active
type,1,1-2,AKTIVA TETAP,,,No,Direct,,,,,,,,,,,Active
sub,1-1,1-1-01,KAS DAN SETARA KAS,,,,,No,OPERATING,Yes,No,Yes,No,,,,,Active
gl,1-1-01,1-1-01-1,KAS IDR,,,,,No,,,,,,,,,,Active
detail,1-1-01-1,1-1-01-1-1000,KAS BESAR,,,,,,,,,,,No,No,Yes,No,Active
detail,1-1-01-1,1-1-01-1-2000,KAS KECIL,,,,,,,,,,,No,No,Yes,No,Active`

const CSV_FILENAME = 'coa_import_template.csv'

/* ── GET: Download template ── */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const action = searchParams.get('action')

    if (action === 'template') {
      return new NextResponse(CSV_TEMPLATE, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${CSV_FILENAME}"`,
        },
      })
    }

    return NextResponse.json({ error: 'Use ?action=template to download' }, { status: 400 })
  } catch (error) {
    console.error('COA import GET error:', error)
    return NextResponse.json({ error: 'Failed', message: (error as Error).message }, { status: 500 })
  }
}

/* ── POST: Import CSV ── */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const csvText = await file.text()
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
    })

    if (parsed.errors.length > 0 && parsed.errors.some(e => e.type === 'Delimiter')) {
      return NextResponse.json({ error: 'Invalid CSV format', details: parsed.errors }, { status: 400 })
    }

    const rows = parsed.data as Record<string, string>[]
    const results = { created: 0, skipped: 0, errors: [] as any[] }

    // Get tenant
    const supabase = await createAdminClient()
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', '00000000-0000-0000-0000-000000000000')
      .single()
    const tenantId = profile?.tenant_id || '00000000-0000-0000-0000-000000000001'

    // Build lookup maps for parent resolution
    const categoryMap: Record<string, string> = {}   // coa_full_code → id
    const typeMap: Record<string, string> = {}
    const subMap: Record<string, string> = {}
    const glMap: Record<string, string> = {}

    for (const row of rows) {
      const layer = (row.layer || '').trim().toLowerCase()
        const coaCode = (row.coa_code || '').trim()
        const name = (row.name || '').trim()
        const parentCode = (row.parent_coa_full_code || '').trim()
        const coaFullCode = (row.coa_full_code || '').trim()

        if (!layer || !coaCode || !name) {
          results.skipped++
          results.errors.push({ row, reason: 'Missing layer, coa_code, or name' })
          continue
        }

        try {
          const isActive = (row.status || 'Active').toLowerCase() === 'active'

          switch (layer) {
            case 'category': {
              const fullCode = coaFullCode || coaCode
              const record = {
                coa_code: coaCode,
                coa_full_code: fullCode,
                name,
                normal_balance: (row.normal_balance || 'debit').toLowerCase(),
                enum_laporan_keuangan_category: (row.lk_category || '').toUpperCase() || null,
                is_active: isActive,
                tenant_id: tenantId,
              }
              const created = await createCategory(record)
              if (created) {
                categoryMap[fullCode] = created.id
                results.created++
              }
              break
            }

            case 'type': {
              let parentId = categoryMap[parentCode]
              if (!parentId) {
                const { data: found } = await supabase
                  .from('coa_account_category')
                  .select('id, coa_full_code')
                  .eq('coa_full_code', parentCode)
                  .is('deleted_at', null)
                  .single()
                if (found) parentId = found.id
              }
              if (!parentId) {
                results.skipped++
                results.errors.push({ row, reason: `Parent category not found: ${parentCode}` })
                continue
              }
              const fullCode = coaFullCode || `${parentCode}-${coaCode}`
              const record = {
                coa_code: coaCode,
                coa_full_code: fullCode,
                name,
                parent_id: parentId,
                contra_account: (row.contra_account || '').toLowerCase() === 'yes',
                direct_indirect_cost: (row.direct_indirect || '').toUpperCase() || null,
                is_active: isActive,
                tenant_id: tenantId,
              }
              const created = await createType(record)
              if (created) {
                typeMap[fullCode] = created.id
                results.created++
              }
              break
            }

            case 'sub':
            case 'sub_account':
            case 'sub_account_type': {
              let parentId = typeMap[parentCode]
              if (!parentId) {
                const { data: found } = await supabase
                  .from('coa_account_type')
                  .select('id, coa_full_code')
                  .eq('coa_full_code', parentCode)
                  .is('deleted_at', null)
                  .single()
                if (found) parentId = found.id
              }
              if (!parentId) {
                results.skipped++
                results.errors.push({ row, reason: `Parent type not found: ${parentCode}` })
                continue
              }
              const fullCode = coaFullCode || `${parentCode}-${coaCode}`
              const record = {
                coa_code: coaCode,
                coa_full_code: fullCode,
                name,
                parent_id: parentId,
                is_restricted: (row.restricted || '').toLowerCase() === 'yes',
                enum_cf_section: (row.cf_section || '').toUpperCase() || null,
                is_working_capital: (row.working_capital || '').toLowerCase() === 'yes',
                is_non_cash_item: (row.non_cash || '').toLowerCase() === 'yes',
                is_budgeted: (row.budgeted || '').toLowerCase() === 'yes',
                is_tax_deductible: (row.tax_deductible || '').toLowerCase() === 'yes',
                is_active: isActive,
                tenant_id: tenantId,
              }
              const created = await createSubAccount(record)
              if (created) {
                subMap[fullCode] = created.id
                results.created++
              }
              break
            }

            case 'gl':
            case 'general_ledger': {
              let parentId = subMap[parentCode]
              if (!parentId) {
                const { data: found } = await supabase
                  .from('coa_sub_account')
                  .select('id, coa_full_code')
                  .eq('coa_full_code', parentCode)
                  .is('deleted_at', null)
                  .single()
                if (found) parentId = found.id
              }
              if (!parentId) {
                results.skipped++
                results.errors.push({ row, reason: `Parent sub not found: ${parentCode}` })
                continue
              }
              const fullCode = coaFullCode || `${parentCode}-${coaCode}`
              const record = {
                coa_code: coaCode,
                coa_full_code: fullCode,
                name,
                parent_id: parentId,
                is_restricted: (row.restricted || '').toLowerCase() === 'yes',
                is_active: isActive,
                tenant_id: tenantId,
              }
              const created = await createGl(record)
              if (created) {
                glMap[fullCode] = created.id
                results.created++
              }
              break
            }

            case 'detail':
            case 'detail_ledger': {
              let parentId = glMap[parentCode]
              if (!parentId) {
                const { data: found } = await supabase
                  .from('coa_general_ledger')
                  .select('id, coa_full_code')
                  .eq('coa_full_code', parentCode)
                  .is('deleted_at', null)
                  .single()
                if (found) parentId = found.id
              }
              if (!parentId) {
                results.skipped++
                results.errors.push({ row, reason: `Parent GL not found: ${parentCode}` })
                continue
              }
              const fullCode = coaFullCode || `${parentCode}-${coaCode}`
              const record = {
                coa_code: coaCode,
                coa_full_code: fullCode,
                name,
                parent_id: parentId,
                required_sub_gl: (row.sub_gl || '').toLowerCase() === 'yes',
                is_washed_out_account: (row.washed_out || '').toLowerCase() === 'yes',
                is_trial_balance: (row.trial_balance || '').toLowerCase() === 'yes',
                is_taxation_report: (row.taxation_report || '').toLowerCase() === 'yes',
                is_active: isActive,
                tenant_id: tenantId,
              }
              const created = await createDetail(record)
              if (created) results.created++
              break
            }

            default: {
              results.skipped++
              results.errors.push({ row, reason: `Unknown layer: ${layer}` })
            }
          }
      } catch (err: any) {
        results.skipped++
        results.errors.push({ row, reason: err.message || 'Create failed' })
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: rows.length,
        created: results.created,
        skipped: results.skipped,
        errors: results.errors.length,
      },
      errors: results.errors.slice(0, 20), // cap at 20
    })
  } catch (error) {
    console.error('COA import POST error:', error)
    return NextResponse.json(
      { error: 'Import failed', message: (error as Error).message },
      { status: 500 }
    )
  }
}

async function lookupParent(supabase: any, table: string, coaFullCode: string) {
  const { data } = await supabase
    .from(table)
    .select('id')
    .eq('coa_full_code', coaFullCode)
    .is('deleted_at', null)
    .single()
  return data?.id || null
}
