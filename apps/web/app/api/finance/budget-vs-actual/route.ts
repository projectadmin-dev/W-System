import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: kinds, error: kindsErr } = await supabase
      .from('expense_kinds')
      .select('*')
      .eq('is_active', true)
      .order('kind_code')

    if (kindsErr) throw kindsErr

    const { data: categories, error: catErr } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('is_active', true)
      .order('category_name')

    if (catErr) throw catErr

    const { data: expenses, error: expErr } = await supabase
      .from('expenses')
      .select('kind_code, category_id, amount, status')
      .in('status', ['approved', 'paid'])
      .not('deleted_at', 'is', null)

    if (expErr) throw expErr

    // Aggregate actual by kind_code
    const actualByKind: Record<string, number> = {}
    const actualByCategory: Record<string, number> = {}
    for (const e of expenses || []) {
      if (e.kind_code) {
        actualByKind[e.kind_code] = (actualByKind[e.kind_code] || 0) + Number(e.amount || 0)
      }
      if (e.category_id) {
        actualByCategory[e.category_id] = (actualByCategory[e.category_id] || 0) + Number(e.amount || 0)
      }
    }

    const kindRows = (kinds || []).map((k: any) => ({
      kind_code: k.kind_code,
      label: k.label,
      budget: Number(k.monthly_budget || 0),
      actual: actualByKind[k.kind_code] || 0,
      variance: Number(k.monthly_budget || 0) - (actualByKind[k.kind_code] || 0),
      percent_used: k.monthly_budget > 0
        ? Math.round(((actualByKind[k.kind_code] || 0) / k.monthly_budget) * 100)
        : 0,
    }))

    const categoryRows = (categories || []).map((c: any) => ({
      category_code: c.category_code,
      category_name: c.category_name,
      kind_code: c.kind_code,
      budget: Number(c.budget || 0),
      actual: actualByCategory[c.id] || 0,
      variance: Number(c.budget || 0) - (actualByCategory[c.id] || 0),
      percent_used: c.budget > 0
        ? Math.round(((actualByCategory[c.id] || 0) / c.budget) * 100)
        : 0,
    }))

    const totalBudget = kindRows.reduce((s, r) => s + r.budget, 0)
    const totalActual = kindRows.reduce((s, r) => s + r.actual, 0)
    const totalVariance = totalBudget - totalActual

    return NextResponse.json({
      summary: { total_budget: totalBudget, total_actual: totalActual, total_variance: totalVariance },
      kinds: kindRows,
      categories: categoryRows,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
