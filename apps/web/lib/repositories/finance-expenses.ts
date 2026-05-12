/**
 * Expense Tracking Types & Mock Service
 * Realistic Indonesian business expense data
 */

export type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'cancelled'
export type ExpenseKind = 'operating' | 'cogs' | 'payroll' | 'marketing' | 'development' | 'office' | 'travel' | 'other'

export interface ExpenseCategory {
  id: string
  name: string
  kind: ExpenseKind
  description?: string
  budget: number
  created_at: string
}

export interface ExpenseKindBudget {
  kind: ExpenseKind
  label: string
  budget: number
}

export interface Expense {
  id: string
  kind: ExpenseKind
  category_id: string
  category_name: string
  description: string
  amount: number
  date: string
  vendor?: string
  payment_method: 'cash' | 'transfer' | 'corporate_card' | 'reimbursement'
  status: ExpenseStatus
  approved_by?: string
  rejection_reason?: string
  receipt_url?: string
  created_by: string
  created_at: string
  updated_at: string
  entity_id?: string
  notes?: string
}

export interface CreateExpenseInput {
  kind: ExpenseKind
  category_id: string
  description: string
  amount: number
  date: string
  vendor?: string
  payment_method: 'cash' | 'transfer' | 'corporate_card' | 'reimbursement'
  notes?: string
}

export interface UpdateExpenseInput {
  kind?: ExpenseKind
  category_id?: string
  description?: string
  amount?: number
  date?: string
  vendor?: string
  payment_method?: 'cash' | 'transfer' | 'corporate_card' | 'reimbursement'
  status?: ExpenseStatus
  notes?: string
}

export interface ExpenseSummary {
  period: string
  total_budget: number
  total_actual: number
  variance: number
  variance_pct: number
  by_kind: {
    kind: ExpenseKind
    label: string
    budget: number
    actual: number
    variance: number
    variance_pct: number
    count: number
  }[]
}

export interface ExpenseFilter {
  period?: string // YYYY-MM
  kind?: ExpenseKind
  status?: ExpenseStatus
  search?: string
  page?: number
  limit?: number
  sort_by?: 'date' | 'amount' | 'created_at'
  sort_order?: 'asc' | 'desc'
}

// ============================================
// EXPENSE CATEGORIES
// ============================================

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-001', name: 'Listrik & Air Kantor', kind: 'office', description: 'Tagihan listrik, air, dan internet kantor', budget: 8_500_000, created_at: '2026-01-01' },
  { id: 'cat-002', name: 'Sewa Kantor', kind: 'office', description: 'Sewa ruangan kantor bulanan', budget: 35_000_000, created_at: '2026-01-01' },
  { id: 'cat-003', name: 'ATK & Perlengkapan', kind: 'office', description: 'Alat tulis kantor dan perlengkapan', budget: 3_000_000, created_at: '2026-01-01' },
  { id: 'cat-004', name: 'Gaji Karyawan', kind: 'payroll', description: 'Gaji pokok dan tunjangan karyawan', budget: 185_000_000, created_at: '2026-01-01' },
  { id: 'cat-005', name: 'THR & Bonus', kind: 'payroll', description: 'Tunjangan Hari Raya dan bonus kinerja', budget: 45_000_000, created_at: '2026-01-01' },
  { id: 'cat-006', name: 'BPJS Kesehatan', kind: 'payroll', description: 'Iuran BPJS Kesehatan perusahaan', budget: 12_500_000, created_at: '2026-01-01' },
  { id: 'cat-007', name: 'Iklan Digital', kind: 'marketing', description: 'Google Ads, Meta Ads, LinkedIn Ads', budget: 28_000_000, created_at: '2026-01-01' },
  { id: 'cat-008', name: 'Event & Promosi', kind: 'marketing', description: 'Event, seminar, dan promosi produk', budget: 15_000_000, created_at: '2026-01-01' },
  { id: 'cat-009', name: 'Bahan Baku', kind: 'cogs', description: 'Pembelian bahan baku produksi', budget: 120_000_000, created_at: '2026-01-01' },
  { id: 'cat-010', name: 'Packaging', kind: 'cogs', description: 'Kemasan dan label produk', budget: 8_000_000, created_at: '2026-01-01' },
  { id: 'cat-011', name: 'Server & Cloud', kind: 'development', description: 'AWS, Vercel, Supabase, hosting', budget: 18_000_000, created_at: '2026-01-01' },
  { id: 'cat-012', name: 'Lisensi Software', kind: 'development', description: 'Lisensi GitHub, Figma, Slack, dll', budget: 7_500_000, created_at: '2026-01-01' },
  { id: 'cat-013', name: 'Transportasi Dinas', kind: 'travel', description: 'Tiket pesawat, kereta, taksi', budget: 12_000_000, created_at: '2026-01-01' },
  { id: 'cat-014', name: 'Akomodasi', kind: 'travel', description: 'Hotel dan penginapan dinas', budget: 6_500_000, created_at: '2026-01-01' },
  { id: 'cat-015', name: 'Entertainment Client', kind: 'travel', description: 'Makan client dan entertainment', budget: 4_500_000, created_at: '2026-01-01' },
  { id: 'cat-016', name: 'Konsultan Pajak', kind: 'operating', description: 'Jasa konsultan pajak dan akuntan', budget: 5_000_000, created_at: '2026-01-01' },
  { id: 'cat-017', name: 'Izin & Legal', kind: 'operating', description: 'Perizinan, legal, dan notaris', budget: 3_500_000, created_at: '2026-01-01' },
  { id: 'cat-018', name: 'Asuransi', kind: 'operating', description: 'Asuransi perusahaan dan kendaraan', budget: 9_000_000, created_at: '2026-01-01' },
  { id: 'cat-019', name: 'Maintenance IT', kind: 'other', description: 'Perbaikan dan maintenance perangkat IT', budget: 5_000_000, created_at: '2026-01-01' },
  { id: 'cat-020', name: 'Lain-lain', kind: 'other', description: 'Pengeluaran tidak terduga', budget: 3_000_000, created_at: '2026-01-01' },
]

// ============================================
// KIND BUDGETS (Annual /12 for monthly)
// ============================================

export const KIND_BUDGETS: Record<ExpenseKind, { label: string; monthly_budget: number }> = {
  operating: { label: 'Pengeluaran Operasional', monthly_budget: 17_500_000 },
  cogs: { label: 'Harga Pokok Penjualan', monthly_budget: 128_000_000 },
  payroll: { label: 'Gaji & Tunjangan', monthly_budget: 242_500_000 },
  marketing: { label: 'Pemasaran', monthly_budget: 43_000_000 },
  development: { label: 'Pengembangan Produk', monthly_budget: 25_500_000 },
  office: { label: 'Kantor & Fasilitas', monthly_budget: 46_500_000 },
  travel: { label: 'Perjalanan Dinas', monthly_budget: 23_000_000 },
  other: { label: 'Lain-lain', monthly_budget: 8_000_000 },
}

// Derived array for UI dropdowns
export const EXPENSE_KINDS = Object.entries(KIND_BUDGETS).map(([kind, meta]) => ({
  kind: kind as ExpenseKind,
  label: meta.label,
}))

// ============================================
// MOCK DATA GENERATOR
// ============================================

function generateMockExpenses(): Expense[] {
  const baseDate = new Date('2026-05-01')
  const data: Omit<Expense, 'id' | 'created_at' | 'updated_at'>[] = [
    { kind: 'office', category_id: 'cat-001', category_name: 'Listrik & Air Kantor', description: 'Tagihan listrik PLN Mei 2026', amount: 4_850_000, date: '2026-05-05', vendor: 'PLN', payment_method: 'transfer', status: 'paid', approved_by: 'Rudi Susanto', created_by: 'admin', notes: 'Termasuk listrik dan air' },
    { kind: 'office', category_id: 'cat-002', category_name: 'Sewa Kantor', description: 'Sewa gedung Sudirman Tower lantai 12', amount: 35_000_000, date: '2026-05-01', vendor: 'PT Mega Properti', payment_method: 'transfer', status: 'paid', approved_by: 'Rudi Susanto', created_by: 'admin', notes: 'Sewa Mei 2026' },
    { kind: 'office', category_id: 'cat-003', category_name: 'ATK & Perlengkapan', description: 'Pembelian kertas A4, toner, dan stationery', amount: 2_150_000, date: '2026-05-08', vendor: 'Mega Stationery', payment_method: 'corporate_card', status: 'approved', approved_by: 'Rudi Susanto', created_by: 'admin', notes: 'Stok bulanan' },
    { kind: 'payroll', category_id: 'cat-004', category_name: 'Gaji Karyawan', description: 'Gaji pokok karyawan bulan Mei', amount: 182_500_000, date: '2026-05-25', vendor: 'Bank BCA', payment_method: 'transfer', status: 'paid', approved_by: 'Arie Anggono', created_by: 'finance', notes: 'Transfer payroll 45 karyawan' },
    { kind: 'payroll', category_id: 'cat-006', category_name: 'BPJS Kesehatan', description: 'Iuran BPJS Kesehatan bulan Mei', amount: 12_100_000, date: '2026-05-20', vendor: 'BPJS Kesehatan', payment_method: 'transfer', status: 'paid', approved_by: 'Arie Anggono', created_by: 'finance', notes: 'Iuran kelas 1 dan 2' },
    { kind: 'marketing', category_id: 'cat-007', category_name: 'Iklan Digital', description: 'Meta Ads campaign lead generation', amount: 8_500_000, date: '2026-05-10', vendor: 'Meta Platforms', payment_method: 'corporate_card', status: 'approved', approved_by: 'Rudi Susanto', created_by: 'marketing', notes: 'Campaign 1-15 Mei' },
    { kind: 'marketing', category_id: 'cat-007', category_name: 'Iklan Digital', description: 'Google Ads search campaign', amount: 4_200_000, date: '2026-05-12', vendor: 'Google Asia Pacific', payment_method: 'corporate_card', status: 'approved', approved_by: 'Rudi Susanto', created_by: 'marketing', notes: 'PPC campaign produk A' },
    { kind: 'marketing', category_id: 'cat-008', category_name: 'Event & Promosi', description: 'Booth & souvenir event Jakarta Tech Summit', amount: 12_500_000, date: '2026-05-15', vendor: 'Event Organizer Nusantara', payment_method: 'transfer', status: 'submitted', created_by: 'marketing', notes: 'Event tanggal 20 Mei' },
    { kind: 'cogs', category_id: 'cat-009', category_name: 'Bahan Baku', description: 'Pembelian bahan baku produksi batch 1', amount: 62_000_000, date: '2026-05-03', vendor: 'PT Sukses Abadi', payment_method: 'transfer', status: 'paid', approved_by: 'Arie Anggono', created_by: 'procurement', notes: 'PO-2026-0042' },
    { kind: 'cogs', category_id: 'cat-010', category_name: 'Packaging', description: 'Pembelian kardus dan bubble wrap', amount: 5_800_000, date: '2026-05-06', vendor: 'Kemas Jaya', payment_method: 'transfer', status: 'paid', approved_by: 'Rudi Susanto', created_by: 'procurement', notes: 'Stok 2 bulan' },
    { kind: 'development', category_id: 'cat-011', category_name: 'Server & Cloud', description: 'AWS billing Mei 2026', amount: 14_200_000, date: '2026-05-07', vendor: 'Amazon Web Services', payment_method: 'corporate_card', status: 'paid', approved_by: 'Rudi Susanto', created_by: 'devops', notes: 'EC2, RDS, S3' },
    { kind: 'development', category_id: 'cat-012', category_name: 'Lisensi Software', description: 'Lisensi Vercel Pro plan', amount: 1_450_000, date: '2026-05-01', vendor: 'Vercel Inc.', payment_method: 'corporate_card', status: 'paid', approved_by: 'Rudi Susanto', created_by: 'devops', notes: 'Monthly subscription' },
    { kind: 'development', category_id: 'cat-012', category_name: 'Lisensi Software', description: 'Lisensi GitHub Team (10 seats)', amount: 2_100_000, date: '2026-05-01', vendor: 'GitHub Inc.', payment_method: 'corporate_card', status: 'paid', approved_by: 'Rudi Susanto', created_by: 'devops', notes: 'Annual plan / 12' },
    { kind: 'travel', category_id: 'cat-013', category_name: 'Transportasi Dinas', description: 'Tiket pesawat CGK-SUB business trip', amount: 3_850_000, date: '2026-05-14', vendor: 'Garuda Indonesia', payment_method: 'corporate_card', status: 'approved', approved_by: 'Rudi Susanto', created_by: 'sales', notes: 'Meeting client Surabaya' },
    { kind: 'travel', category_id: 'cat-014', category_name: 'Akomodasi', description: 'Hotel Grand Indonesia 2 malam', amount: 2_400_000, date: '2026-05-14', vendor: 'Hotel Grand Indonesia', payment_method: 'corporate_card', status: 'approved', approved_by: 'Rudi Susanto', created_by: 'sales', notes: 'Business trip Jakarta' },
    { kind: 'travel', category_id: 'cat-015', category_name: 'Entertainment Client', description: 'Makan malam meeting dengan PT Sejahtera', amount: 1_850_000, date: '2026-05-16', vendor: 'Steak 21', payment_method: 'corporate_card', status: 'approved', approved_by: 'Rudi Susanto', created_by: 'sales', notes: 'Entertainment 5 orang' },
    { kind: 'operating', category_id: 'cat-016', category_name: 'Konsultan Pajak', description: 'Jasa konsultan pajak bulan Mei', amount: 5_000_000, date: '2026-05-10', vendor: 'KAP Pratama & Co', payment_method: 'transfer', status: 'paid', approved_by: 'Arie Anggono', created_by: 'finance', notes: 'Retainer fee' },
    { kind: 'operating', category_id: 'cat-018', category_name: 'Asuransi', description: 'Premi asuransi kendaraan operasional', amount: 2_450_000, date: '2026-05-05', vendor: 'Adira Insurance', payment_method: 'transfer', status: 'paid', approved_by: 'Arie Anggono', created_by: 'finance', notes: '3 unit mobil' },
    { kind: 'other', category_id: 'cat-019', category_name: 'Maintenance IT', description: 'Perbaikan server dan upgrade RAM', amount: 3_800_000, date: '2026-05-18', vendor: 'IT Solution PT', payment_method: 'transfer', status: 'submitted', created_by: 'it_support' },
    { kind: 'other', category_id: 'cat-020', category_name: 'Lain-lain', description: 'Biaya kurir dan pengiriman dokumen', amount: 680_000, date: '2026-05-11', vendor: 'JNE Express', payment_method: 'cash', status: 'paid', approved_by: 'Rudi Susanto', created_by: 'admin', notes: 'Dokumen ke klien' },
    { kind: 'cogs', category_id: 'cat-009', category_name: 'Bahan Baku', description: 'Bahan baku produksi batch 2', amount: 48_500_000, date: '2026-05-22', vendor: 'PT Sukses Abadi', payment_method: 'transfer', status: 'submitted', created_by: 'procurement', notes: 'PO-2026-0048' },
    { kind: 'marketing', category_id: 'cat-007', category_name: 'Iklan Digital', description: 'LinkedIn Ads B2B campaign', amount: 5_600_000, date: '2026-05-20', vendor: 'LinkedIn', payment_method: 'corporate_card', status: 'draft', created_by: 'marketing', notes: 'Target HR managers' },
    { kind: 'travel', category_id: 'cat-013', category_name: 'Transportasi Dinas', description: 'Taksi dan Grab klien visit Bandung', amount: 780_000, date: '2026-05-24', vendor: 'Grab Indonesia', payment_method: 'reimbursement', status: 'submitted', created_by: 'sales' },
    { kind: 'office', category_id: 'cat-001', category_name: 'Listrik & Air Kantor', description: 'Tagihan internet IndiHome', amount: 1_250_000, date: '2026-05-05', vendor: 'Telkom Indonesia', payment_method: 'transfer', status: 'paid', approved_by: 'Rudi Susanto', created_by: 'admin', notes: 'Paket bisnis 50 Mbps' },
    { kind: 'payroll', category_id: 'cat-005', category_name: 'THR & Bonus', description: 'THR karyawan Lebaran 2026 (partial)', amount: 22_500_000, date: '2026-05-20', vendor: 'Bank BCA', payment_method: 'transfer', status: 'approved', approved_by: 'Arie Anggono', created_by: 'finance', notes: '50% dari total THR' },
  ]

  return data.map((item, index) => ({
    ...item,
    id: `exp-${String(index + 1).padStart(3, '0')}`,
    created_at: item.date + 'T09:00:00.000Z',
    updated_at: item.date + 'T09:00:00.000Z',
  }))
}

// ============================================
// MOCK SERVICE
// ============================================

const _expenses = generateMockExpenses()

export const mockExpenseService = {
  getAll(filter: ExpenseFilter = {}): { data: Expense[]; count: number; total_pages: number } {
    let result = [..._expenses]

    // Period filter
    if (filter.period) {
      result = result.filter(e => e.date.startsWith(filter.period!))
    }

    // Kind filter
    if (filter.kind) {
      result = result.filter(e => e.kind === filter.kind)
    }

    // Status filter
    if (filter.status) {
      result = result.filter(e => e.status === filter.status)
    }

    // Search
    if (filter.search) {
      const q = filter.search.toLowerCase()
      result = result.filter(e =>
        e.description.toLowerCase().includes(q) ||
        (e.vendor?.toLowerCase().includes(q) ?? false) ||
        e.category_name.toLowerCase().includes(q)
      )
    }

    // Sort
    const sortBy = filter.sort_by ?? 'date'
    const sortOrder = filter.sort_order ?? 'desc'
    result.sort((a, b) => {
      let av: any = a[sortBy as keyof Expense]
      let bv: any = b[sortBy as keyof Expense]
      if (sortOrder === 'asc') return av > bv ? 1 : av < bv ? -1 : 0
      return av < bv ? 1 : av > bv ? -1 : 0
    })

    // Pagination
    const page = filter.page ?? 1
    const limit = filter.limit ?? 20
    const count = result.length
    const total_pages = Math.ceil(count / limit)
    result = result.slice((page - 1) * limit, page * limit)

    return { data: result, count, total_pages }
  },

  getById(id: string): Expense | undefined {
    return _expenses.find(e => e.id === id)
  },

  create(data: CreateExpenseInput & { created_by: string }): Expense {
    const category = EXPENSE_CATEGORIES.find(c => c.id === data.category_id)
    const now = new Date().toISOString()
    const newExpense: Expense = {
      id: `exp-${String(_expenses.length + 1).padStart(3, '0')}`,
      kind: data.kind,
      category_id: data.category_id,
      category_name: category?.name ?? 'Unknown',
      description: data.description,
      amount: data.amount,
      date: data.date,
      vendor: data.vendor,
      payment_method: data.payment_method,
      status: 'draft',
      created_by: data.created_by,
      created_at: now,
      updated_at: now,
      notes: data.notes,
    }
    _expenses.push(newExpense)
    return newExpense
  },

  update(id: string, data: UpdateExpenseInput): Expense | undefined {
    const idx = _expenses.findIndex(e => e.id === id)
    if (idx === -1) return undefined

    const old = _expenses[idx]
    if (data.category_id && data.category_id !== old.category_id) {
      const cat = EXPENSE_CATEGORIES.find(c => c.id === data.category_id)
      old.category_name = cat?.name ?? 'Unknown'
    }

    Object.assign(old, data, { updated_at: new Date().toISOString() })
    return old
  },

  delete(id: string): boolean {
    const idx = _expenses.findIndex(e => e.id === id)
    if (idx === -1) return false
    _expenses[idx].status = 'cancelled'
    _expenses[idx].updated_at = new Date().toISOString()
    return true
  },

  getSummary(period: string): ExpenseSummary {
    const monthExpenses = _expenses.filter(e => e.date.startsWith(period) && e.status !== 'cancelled')
    const totalActual = monthExpenses.reduce((sum, e) => sum + e.amount, 0)

    const by_kind = Object.entries(KIND_BUDGETS).map(([kind, meta]) => {
      const kindExpenses = monthExpenses.filter(e => e.kind === kind)
      const actual = kindExpenses.reduce((s, e) => s + e.amount, 0)
      return {
        kind: kind as ExpenseKind,
        label: meta.label,
        budget: meta.monthly_budget,
        actual,
        variance: meta.monthly_budget - actual,
        variance_pct: meta.monthly_budget > 0 ? ((actual - meta.monthly_budget) / meta.monthly_budget) * 100 : 0,
        count: kindExpenses.length,
      }
    })

    const totalBudget = Object.values(KIND_BUDGETS).reduce((s, b) => s + b.monthly_budget, 0)

    return {
      period,
      total_budget: totalBudget,
      total_actual: totalActual,
      variance: totalBudget - totalActual,
      variance_pct: totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget) * 100 : 0,
      by_kind,
    }
  },
}
