import { NextRequest, NextResponse } from 'next/server'

// Dummy data for development/testing — replace with real Supabase query when ready
const DUMMY_PROJECTS = [
  {
    id: '1',
    project_name: 'Implementasi ERP SAP Business One',
    project_code: 'PRJ-2026-001',
    status: 'planning',
    budget_amount: 850000000,
    currency: 'IDR',
    start_date: '2026-06-01',
    end_date: '2026-11-30',
    client: { id: 'c1', name: 'PT Garudafood Putra Jaya', code: 'GARUDAFOOD' },
    pm: { id: 'u1', full_name: 'Rudi Permana', email: 'rudi@wit.id' },
  },
  {
    id: '2',
    project_name: 'Dashboard Analytics Real-Time',
    project_code: 'PRJ-2026-002',
    status: 'planning',
    budget_amount: 320000000,
    currency: 'IDR',
    start_date: '2026-07-01',
    end_date: '2026-09-30',
    client: { id: 'c2', name: 'PT Indomedia Digital Solusi', code: 'INDOMEDIA' },
    pm: { id: 'u1', full_name: 'Rudi Permana', email: 'rudi@wit.id' },
  },
  {
    id: '3',
    project_name: 'Sistem Inventory Warehouse Management',
    project_code: 'PRJ-2026-003',
    status: 'active',
    budget_amount: 450000000,
    currency: 'IDR',
    start_date: '2026-03-01',
    end_date: '2026-08-31',
    client: { id: 'c3', name: 'CV Maju Logistik Nusantara', code: 'MAJU-LOG' },
    pm: { id: 'u1', full_name: 'Rudi Permana', email: 'rudi@wit.id' },
  },
  {
    id: '4',
    project_name: 'Mobile App Pasien - Telemedicine',
    project_code: 'PRJ-2026-004',
    status: 'active',
    budget_amount: 275000000,
    currency: 'IDR',
    start_date: '2026-04-15',
    end_date: '2026-07-15',
    client: { id: 'c4', name: 'Klinik Sehat Sentosa', code: 'KLINIK-SEHAT' },
    pm: { id: 'u1', full_name: 'Rudi Permana', email: 'rudi@wit.id' },
  },
  {
    id: '5',
    project_name: 'Integration API e-Faktur with ERP',
    project_code: 'PRJ-2026-005',
    status: 'active',
    budget_amount: 180000000,
    currency: 'IDR',
    start_date: '2026-02-01',
    end_date: '2026-05-31',
    client: { id: 'c1', name: 'PT Garudafood Putra Jaya', code: 'GARUDAFOOD' },
    pm: { id: 'u1', full_name: 'Rudi Permana', email: 'rudi@wit.id' },
  },
  {
    id: '6',
    project_name: 'Digital Marketing Automation Platform',
    project_code: 'PRJ-2026-006',
    status: 'active',
    budget_amount: 520000000,
    currency: 'IDR',
    start_date: '2026-01-15',
    end_date: '2026-06-30',
    client: { id: 'c2', name: 'PT Indomedia Digital Solusi', code: 'INDOMEDIA' },
    pm: { id: 'u1', full_name: 'Rudi Permana', email: 'rudi@wit.id' },
  },
  {
    id: '7',
    project_name: 'Smart Grid Monitoring System',
    project_code: 'PRJ-2025-008',
    status: 'on_hold',
    budget_amount: 1200000000,
    currency: 'IDR',
    start_date: '2025-10-01',
    end_date: '2026-03-31',
    client: { id: 'c5', name: 'PT Borneo Energi Terbarukan', code: 'BORNE-ENERGI' },
    pm: { id: 'u1', full_name: 'Rudi Permana', email: 'rudi@wit.id' },
  },
  {
    id: '8',
    project_name: 'Blockchain Supply Chain Tracking',
    project_code: 'PRJ-2025-009',
    status: 'on_hold',
    budget_amount: 750000000,
    currency: 'IDR',
    start_date: '2025-11-01',
    end_date: '2026-04-30',
    client: { id: 'c3', name: 'CV Maju Logistik Nusantara', code: 'MAJU-LOG' },
    pm: { id: 'u1', full_name: 'Rudi Permana', email: 'rudi@wit.id' },
  },
  {
    id: '9',
    project_name: 'Website Redesign Corporate',
    project_code: 'PRJ-2025-006',
    status: 'completed',
    budget_amount: 95000000,
    currency: 'IDR',
    start_date: '2025-08-01',
    end_date: '2025-11-30',
    client: { id: 'c4', name: 'Klinik Sehat Sentosa', code: 'KLINIK-SEHAT' },
    pm: { id: 'u1', full_name: 'Rudi Permana', email: 'rudi@wit.id' },
  },
  {
    id: '10',
    project_name: 'CRM Implementation Salesforce',
    project_code: 'PRJ-2025-007',
    status: 'completed',
    budget_amount: 380000000,
    currency: 'IDR',
    start_date: '2025-07-01',
    end_date: '2025-12-31',
    client: { id: 'c1', name: 'PT Garudafood Putra Jaya', code: 'GARUDAFOOD' },
    pm: { id: 'u1', full_name: 'Rudi Permana', email: 'rudi@wit.id' },
  },
  {
    id: '11',
    project_name: 'POS System untuk Retail Chain',
    project_code: 'PRJ-2026-007',
    status: 'cancelled',
    budget_amount: 220000000,
    currency: 'IDR',
    start_date: '2026-02-15',
    end_date: '2026-05-15',
    client: { id: 'c3', name: 'CV Maju Logistik Nusantara', code: 'MAJU-LOG' },
    pm: { id: 'u1', full_name: 'Rudi Permana', email: 'rudi@wit.id' },
  },
]

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Try real Supabase first, fall back to dummy data
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let query = supabase
      .from('projects')
      .select(`
        *,
        client:clients (id, name, code),
        pm:user_profiles!project_manager (id, full_name, email)
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)

    const { data, error, count } = await query

    if (!error && data && data.length > 0) {
      return NextResponse.json({
        data,
        pagination: { total: count || 0, limit, offset, hasMore: (count || 0) > offset + limit }
      })
    }
  } catch (e) {
    console.warn('Supabase unavailable, using dummy data:', e)
  }

  // Fallback: return dummy data for development/testing
  let filtered = DUMMY_PROJECTS
  if (status) filtered = DUMMY_PROJECTS.filter(p => p.status === status)

  const paginated = filtered.slice(offset, offset + limit)
  return NextResponse.json({
    data: paginated,
    pagination: {
      total: filtered.length,
      limit,
      offset,
      hasMore: offset + limit < filtered.length
    }
  })
}
