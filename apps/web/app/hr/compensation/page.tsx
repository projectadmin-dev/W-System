"use client"

import { useState, useMemo, useCallback } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"
import {
  Switch,
} from "@workspace/ui/components/switch"
import { Separator } from "@workspace/ui/components/separator"
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/table"
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  Award, Layers, Grid3X3, Gift, Shield, Receipt, MapPin,
  Calculator, ChevronDown, TrendingUp, Building2, DollarSign,
  Save, Plus, Edit, Trash2, AlertCircle, CheckCircle2,
  Info, RefreshCcw, ArrowRightLeft, Clock, Percent, Users,
  BarChart3, FileText, Settings2, AlertTriangle, Eye,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

interface JobGrade {
  id: string; code: string; name: string; level: number
  salary_min: number; salary_mid: number; salary_max: number
  leave_quota: number; is_overtime_eligible: boolean
  is_bonus_eligible: boolean; is_car_allowance_eligible: boolean
}

interface SalaryMatrixEntry {
  id: string; grade_code: string; grade_name: string
  step: number; amount: number; effective_date: string
}

interface SalaryComponent {
  id: string; code: string; name: string
  component_type: "earning" | "deduction"
  category: string; amount_type: string
  fixed_amount: number | null; percentage: number | null
  is_taxable: boolean; is_bpjs_base: boolean
}

interface AllowanceType {
  id: string; code: string; name: string
  type: "FIXED" | "ATTENDANCE_BASED" | "CONDITIONAL" | "PRORATED"
  default_nominal: number; is_taxable: boolean
  deduct_on_alpha: boolean; deduct_on_sick: boolean; deduct_on_leave: boolean
  is_active: boolean
}

interface BpjsConfig {
  bpjs_tk_number: string; bpjs_kes_number: string
  jkk_rate: number; jkm_rate: number
  jht_employee_rate: number; jht_company_rate: number
  jp_employee_rate: number; jp_company_rate: number
  jp_salary_cap: number
  kes_employee_rate: number; kes_company_rate: number
  kes_salary_cap: number
  effective_date: string
}

interface Pph21Config {
  tax_year: number
  ptkp: Record<string, number>
  brackets: { min: number; max: number; rate: number }[]
  jabatan_rate: number; jabatan_max_monthly: number
  non_npwp_surcharge: number; use_ter: boolean
}

interface CityUmr {
  id: string; city: string; province: string; umr_amount: number
  year: number; effective_date: string; legal_basis: string
}

interface ThrConfig {
  calculation_base: "basic_salary" | "basic_plus_fixed"
  payment_timing: "with_payroll" | "separate"
  min_months_full: number; min_months_eligible: number
  is_active: boolean
}

interface ProRateConfig {
  default_working_days: number; payroll_cutoff_date: number
  prorate_salary: boolean; prorate_allowances: boolean
  prorate_method: "calendar_days" | "working_days"
}

interface OvertimeRule {
  id: string; code: string; name: string
  day_type: "weekday" | "weekend" | "holiday"
  first_hour_multiplier: number; next_hours_multiplier: number
  max_hours_per_day: number; is_active: boolean
}

// ─────────────────────────────────────────────────────────────────
// SEED DATA — minimal, realistic Indonesian enterprise
// PT. Maju Jaya Sejahtera
// ─────────────────────────────────────────────────────────────────

const seedGrades: JobGrade[] = [
  { id: "1", code: "G1", name: "Staff", level: 6, salary_min: 5000000, salary_mid: 7000000, salary_max: 9000000, leave_quota: 12, is_overtime_eligible: true, is_bonus_eligible: true, is_car_allowance_eligible: false },
  { id: "2", code: "G2", name: "Senior Staff", level: 5, salary_min: 8000000, salary_mid: 10500000, salary_max: 13000000, leave_quota: 12, is_overtime_eligible: true, is_bonus_eligible: true, is_car_allowance_eligible: false },
  { id: "3", code: "M1", name: "Supervisor", level: 4, salary_min: 12000000, salary_mid: 15000000, salary_max: 18000000, leave_quota: 14, is_overtime_eligible: false, is_bonus_eligible: true, is_car_allowance_eligible: false },
  { id: "4", code: "M2", name: "Manager", level: 3, salary_min: 18000000, salary_mid: 23000000, salary_max: 28000000, leave_quota: 14, is_overtime_eligible: false, is_bonus_eligible: true, is_car_allowance_eligible: true },
  { id: "5", code: "S1", name: "Sr. Manager", level: 2, salary_min: 28000000, salary_mid: 36000000, salary_max: 45000000, leave_quota: 16, is_overtime_eligible: false, is_bonus_eligible: true, is_car_allowance_eligible: true },
]

const seedMatrix: SalaryMatrixEntry[] = [
  { id: "1", grade_code: "G1", grade_name: "Staff", step: 1, amount: 5000000, effective_date: "2026-01-01" },
  { id: "2", grade_code: "G1", grade_name: "Staff", step: 2, amount: 6000000, effective_date: "2026-01-01" },
  { id: "3", grade_code: "G1", grade_name: "Staff", step: 3, amount: 7000000, effective_date: "2026-01-01" },
  { id: "4", grade_code: "G2", grade_name: "Senior Staff", step: 1, amount: 8000000, effective_date: "2026-01-01" },
  { id: "5", grade_code: "G2", grade_name: "Senior Staff", step: 2, amount: 10500000, effective_date: "2026-01-01" },
]

const seedComponents: SalaryComponent[] = [
  { id: "1", code: "BSC", name: "Gaji Pokok", component_type: "earning", category: "basic", amount_type: "fixed", fixed_amount: null, percentage: null, is_taxable: true, is_bpjs_base: true },
  { id: "2", code: "ALW-JAB", name: "Tunj. Jabatan", component_type: "earning", category: "allowance", amount_type: "fixed", fixed_amount: 2000000, percentage: null, is_taxable: true, is_bpjs_base: false },
  { id: "3", code: "ALW-TRP", name: "Tunj. Transport", component_type: "earning", category: "allowance", amount_type: "fixed", fixed_amount: 500000, percentage: null, is_taxable: true, is_bpjs_base: false },
  { id: "4", code: "DED-BPJS", name: "BPJS TK (Karyawan)", component_type: "deduction", category: "bpjs_tk", amount_type: "percentage", fixed_amount: null, percentage: 3.0, is_taxable: false, is_bpjs_base: false },
  { id: "5", code: "DED-PPH", name: "PPh 21", component_type: "deduction", category: "pph21", amount_type: "formula", fixed_amount: null, percentage: null, is_taxable: false, is_bpjs_base: false },
]

const seedAllowances: AllowanceType[] = [
  { id: "1", code: "TMAKAN", name: "Tunj. Makan", type: "ATTENDANCE_BASED", default_nominal: 35000, is_taxable: true, deduct_on_alpha: true, deduct_on_sick: false, deduct_on_leave: true, is_active: true },
  { id: "2", code: "TKEHADIRAN", name: "Tunj. Kehadiran", type: "ATTENDANCE_BASED", default_nominal: 300000, is_taxable: true, deduct_on_alpha: true, deduct_on_sick: true, deduct_on_leave: true, is_active: true },
  { id: "3", code: "TJABATAN", name: "Tunj. Jabatan", type: "FIXED", default_nominal: 2000000, is_taxable: true, deduct_on_alpha: false, deduct_on_sick: false, deduct_on_leave: false, is_active: true },
]

const seedBpjs: BpjsConfig = {
  bpjs_tk_number: "12345678901", bpjs_kes_number: "09876543210",
  jkk_rate: 0.24, jkm_rate: 0.30,
  jht_employee_rate: 2.00, jht_company_rate: 3.70,
  jp_employee_rate: 1.00, jp_company_rate: 2.00, jp_salary_cap: 10042300,
  kes_employee_rate: 1.00, kes_company_rate: 4.00, kes_salary_cap: 12000000,
  effective_date: "2026-01-01",
}

const seedPph21: Pph21Config = {
  tax_year: 2026,
  ptkp: { "TK/0": 54000000, "TK/1": 58500000, "TK/2": 63000000, "TK/3": 67500000, "K/0": 58500000, "K/1": 63000000, "K/2": 67500000, "K/3": 72000000 },
  brackets: [
    { min: 0, max: 60000000, rate: 5 },
    { min: 60000000, max: 250000000, rate: 15 },
    { min: 250000000, max: 500000000, rate: 25 },
    { min: 500000000, max: 5000000000, rate: 30 },
    { min: 5000000000, max: 0, rate: 35 },
  ],
  jabatan_rate: 5, jabatan_max_monthly: 500000,
  non_npwp_surcharge: 20, use_ter: true,
}

const seedUmr: CityUmr[] = [
  { id: "1", city: "DKI Jakarta", province: "DKI Jakarta", umr_amount: 5396760, year: 2026, effective_date: "2026-01-01", legal_basis: "Pergub DKI No. 120/2025" },
  { id: "2", city: "Kota Bandung", province: "Jawa Barat", umr_amount: 4395000, year: 2026, effective_date: "2026-01-01", legal_basis: "SK Gubernur Jabar No. 561/2025" },
  { id: "3", city: "Kota Surabaya", province: "Jawa Timur", umr_amount: 4975000, year: 2026, effective_date: "2026-01-01", legal_basis: "SK Gubernur Jatim No. 188/2025" },
  { id: "4", city: "Kota Semarang", province: "Jawa Tengah", umr_amount: 3480000, year: 2026, effective_date: "2026-01-01", legal_basis: "SK Gubernur Jateng No. 560/2025" },
  { id: "5", city: "Kota Yogyakarta", province: "DIY", umr_amount: 2825000, year: 2026, effective_date: "2026-01-01", legal_basis: "SK Gubernur DIY No. 370/2025" },
]

const seedThr: ThrConfig = {
  calculation_base: "basic_salary", payment_timing: "separate",
  min_months_full: 12, min_months_eligible: 1, is_active: true,
}

const seedProRate: ProRateConfig = {
  default_working_days: 22, payroll_cutoff_date: 23,
  prorate_salary: true, prorate_allowances: true,
  prorate_method: "working_days",
}

const seedOvertimeRules: OvertimeRule[] = [
  { id: "1", code: "OT-WD", name: "Lembur Hari Kerja", day_type: "weekday", first_hour_multiplier: 1.5, next_hours_multiplier: 2.0, max_hours_per_day: 4, is_active: true },
  { id: "2", code: "OT-WE", name: "Lembur Hari Libur", day_type: "weekend", first_hour_multiplier: 2.0, next_hours_multiplier: 3.0, max_hours_per_day: 8, is_active: true },
  { id: "3", code: "OT-HD", name: "Lembur Hari Besar", day_type: "holiday", first_hour_multiplier: 3.0, next_hours_multiplier: 4.0, max_hours_per_day: 8, is_active: true },
]

// ─────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────

const fmtRp = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
const fmtPct = (n: number) => `${n}%`

// ─────────────────────────────────────────────────────────────────
// PAYROLL CALCULATION ENGINE
// ─────────────────────────────────────────────────────────────────

function calculatePayroll(
  basicSalary: number,
  fixedAllowances: number,
  bpjs: BpjsConfig,
  pph21: Pph21Config,
  ptkpStatus: string,
  overtimeHours: number,
  overtimeDayType: "weekday" | "weekend" | "holiday",
  overtimeRules: OvertimeRule[],
  monthsWorked: number,
  thr: ThrConfig,
  proRate: ProRateConfig,
  actualWorkingDays: number,
  hasNpwp: boolean,
) {
  // BPJS Ketenagakerjaan — Employee
  const jhtEmp = basicSalary * bpjs.jht_employee_rate / 100
  const jpBase = Math.min(basicSalary, bpjs.jp_salary_cap)
  const jpEmp = jpBase * bpjs.jp_employee_rate / 100
  const bpjsTkEmployee = jhtEmp + jpEmp

  // BPJS Ketenagakerjaan — Company
  const jkkCo = basicSalary * bpjs.jkk_rate / 100
  const jkmCo = basicSalary * bpjs.jkm_rate / 100
  const jhtCo = basicSalary * bpjs.jht_company_rate / 100
  const jpCo = jpBase * bpjs.jp_company_rate / 100
  const bpjsTkCompany = jkkCo + jkmCo + jhtCo + jpCo

  // BPJS Kesehatan
  const kesBase = Math.min(basicSalary, bpjs.kes_salary_cap)
  const kesEmp = kesBase * bpjs.kes_employee_rate / 100
  const kesCo = kesBase * bpjs.kes_company_rate / 100

  const totalBpjsEmployee = bpjsTkEmployee + kesEmp
  const totalBpjsCompany = bpjsTkCompany + kesCo

  // Overtime — using rules
  const otRule = overtimeRules.find(r => r.day_type === overtimeDayType && r.is_active)
  const hourlyRate = basicSalary / 173
  let overtimePay = 0
  if (otRule && overtimeHours > 0) {
    const firstHourPay = Math.min(overtimeHours, 1) * hourlyRate * otRule.first_hour_multiplier
    const nextHoursPay = Math.max(overtimeHours - 1, 0) * hourlyRate * otRule.next_hours_multiplier
    overtimePay = Math.round(firstHourPay + nextHoursPay)
  }

  // Pro-rate calculation
  let proRateFactor = 1
  if (proRate.prorate_salary && actualWorkingDays < proRate.default_working_days) {
    proRateFactor = actualWorkingDays / proRate.default_working_days
  }
  const proratedSalary = Math.round(basicSalary * proRateFactor)
  const proratedAllowances = proRate.prorate_allowances
    ? Math.round(fixedAllowances * proRateFactor)
    : fixedAllowances

  // PPh21 — Monthly via annual projection
  const annualGross = (proratedSalary + proratedAllowances) * 12
  const biayaJabatanAnnual = Math.min(annualGross * pph21.jabatan_rate / 100, pph21.jabatan_max_monthly * 12)
  const annualBpjsDeduction = (jhtEmp + jpEmp) * 12
  const nettoAnnual = annualGross - biayaJabatanAnnual - annualBpjsDeduction
  const ptkpValue = pph21.ptkp[ptkpStatus] || 54000000
  const pkp = Math.max(nettoAnnual - ptkpValue, 0)
  const pkpRounded = Math.floor(pkp / 1000) * 1000

  let pph21Annual = 0
  let remaining = pkpRounded
  for (const bracket of pph21.brackets) {
    if (remaining <= 0) break
    const maxForBracket = bracket.max > 0 ? bracket.max - bracket.min : remaining
    const taxable = Math.min(remaining, maxForBracket)
    pph21Annual += taxable * bracket.rate / 100
    remaining -= taxable
  }
  const npwpMultiplier = hasNpwp ? 1 : (1 + pph21.non_npwp_surcharge / 100)
  const pph21Monthly = Math.round((pph21Annual * npwpMultiplier) / 12)

  // THR
  let thrAmount = 0
  if (thr.is_active && monthsWorked >= thr.min_months_eligible) {
    const thrBase = thr.calculation_base === "basic_plus_fixed"
      ? basicSalary + fixedAllowances
      : basicSalary
    const proportion = Math.min(monthsWorked, thr.min_months_full) / thr.min_months_full
    thrAmount = Math.round(thrBase * proportion)
  }

  // Net salary (monthly)
  const grossMonthly = proratedSalary + proratedAllowances + overtimePay
  const totalDeductions = totalBpjsEmployee + pph21Monthly
  const netMonthly = grossMonthly - totalDeductions
  const costToCompany = grossMonthly + totalBpjsCompany

  return {
    basicSalary, proratedSalary, proratedAllowances, fixedAllowances,
    proRateFactor, overtimePay, grossMonthly,
    jhtEmp, jpEmp, kesEmp, bpjsTkEmployee, totalBpjsEmployee,
    jkkCo, jkmCo, jhtCo, jpCo, kesCo, bpjsTkCompany, totalBpjsCompany,
    biayaJabatanMonthly: Math.round(biayaJabatanAnnual / 12),
    nettoAnnual, pkp: pkpRounded, pph21Monthly, totalDeductions,
    netMonthly, costToCompany, thrAmount,
  }
}

// ─────────────────────────────────────────────────────────────────
// SECTION CARD — collapsible card wrapper
// ─────────────────────────────────────────────────────────────────

function SectionCard({ title, description, icon: Icon, badge, children, defaultOpen = true }: {
  title: string; description: string; icon: React.ElementType
  badge?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-semibold">{title}</CardTitle>
                    {badge}
                  </div>
                  <CardDescription className="text-xs">{description}</CardDescription>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

// ─────────────────────────────────────────────────────────────────
// COMPLIANCE INDICATOR
// ─────────────────────────────────────────────────────────────────

function ComplianceStatus({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {ok
        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
        : <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      }
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────

export default function CompensationPayrollPage() {
  // ── State: master data (Tab 1) ──
  const [jobGrades, setJobGrades] = useState<JobGrade[]>(seedGrades)
  const [salaryMatrix] = useState<SalaryMatrixEntry[]>(seedMatrix)
  const [salaryComponents] = useState<SalaryComponent[]>(seedComponents)
  const [allowanceTypes] = useState<AllowanceType[]>(seedAllowances)
  const [overtimeRules, setOvertimeRules] = useState<OvertimeRule[]>(seedOvertimeRules)

  // ── State: rules & config (Tab 2) ──
  const [bpjs, setBpjs] = useState<BpjsConfig>(seedBpjs)
  const [pph21] = useState<Pph21Config>(seedPph21)
  const [cityUmr] = useState<CityUmr[]>(seedUmr)
  const [thrConfig, setThrConfig] = useState<ThrConfig>(seedThr)
  const [proRate, setProRate] = useState<ProRateConfig>(seedProRate)

  // ── State: payroll simulator ──
  const [simGradeId, setSimGradeId] = useState("1")
  const [simSalary, setSimSalary] = useState(7000000)
  const [simAllowances, setSimAllowances] = useState(2500000)
  const [simPtkp, setSimPtkp] = useState("TK/0")
  const [simOtHours, setSimOtHours] = useState(0)
  const [simOtDayType, setSimOtDayType] = useState<"weekday" | "weekend" | "holiday">("weekday")
  const [simMonthsWorked, setSimMonthsWorked] = useState(12)
  const [simWorkDays, setSimWorkDays] = useState(22)
  const [simHasNpwp, setSimHasNpwp] = useState(true)
  const [simCity, setSimCity] = useState("DKI Jakarta")

  // ── Saving state ──
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // ── Grade-linked salary sync ──
  const handleGradeChange = useCallback((gradeId: string) => {
    setSimGradeId(gradeId)
    const grade = jobGrades.find(g => g.id === gradeId)
    if (grade) setSimSalary(grade.salary_mid)
  }, [jobGrades])

  // ── Real-time payroll calculation ──
  const payroll = useMemo(
    () => calculatePayroll(
      simSalary, simAllowances, bpjs, pph21, simPtkp,
      simOtHours, simOtDayType, overtimeRules,
      simMonthsWorked, thrConfig, proRate, simWorkDays, simHasNpwp,
    ),
    [simSalary, simAllowances, bpjs, pph21, simPtkp, simOtHours, simOtDayType,
     overtimeRules, simMonthsWorked, thrConfig, proRate, simWorkDays, simHasNpwp],
  )

  // ── Compliance checks ──
  const selectedUmr = cityUmr.find(u => u.city === simCity)
  const isAboveUmr = !selectedUmr || simSalary >= selectedUmr.umr_amount
  const totalBpjsRate = bpjs.jkk_rate + bpjs.jkm_rate + bpjs.jht_employee_rate + bpjs.jht_company_rate + bpjs.jp_employee_rate + bpjs.jp_company_rate + bpjs.kes_employee_rate + bpjs.kes_company_rate

  // ── Derived stats ──
  const earningCount = salaryComponents.filter(c => c.component_type === "earning").length
  const deductionCount = salaryComponents.filter(c => c.component_type === "deduction").length
  const categoryLabel: Record<string, string> = {
    basic: "Gaji Pokok", allowance: "Tunjangan", overtime: "Lembur", bonus: "Bonus",
    bpjs_tk: "BPJS TK", bpjs_kes: "BPJS Kes", pph21: "PPh21", other: "Lainnya",
  }
  const typeLabel: Record<string, string> = { FIXED: "Tetap", ATTENDANCE_BASED: "Kehadiran", CONDITIONAL: "Kondisional", PRORATED: "Pro-Rata" }
  const typeColor: Record<string, string> = { FIXED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", ATTENDANCE_BASED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", CONDITIONAL: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", PRORATED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" }
  const dayTypeLabel: Record<string, string> = { weekday: "Hari Kerja", weekend: "Weekend", holiday: "Hari Besar" }

  async function handleSave() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compensation & Payroll</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Master data kompensasi, konfigurasi BPJS/PPh21, dan simulasi payroll real-time
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Menyimpan..." : saved ? "Tersimpan!" : "Simpan Perubahan"}
        </Button>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Job Grades</span>
            </div>
            <p className="text-xl font-bold mt-1">{jobGrades.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Komponen</span>
            </div>
            <p className="text-xl font-bold mt-1">{salaryComponents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Tunjangan</span>
            </div>
            <p className="text-xl font-bold mt-1">{allowanceTypes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-rose-500" />
              <span className="text-xs text-muted-foreground">Kota UMR</span>
            </div>
            <p className="text-xl font-bold mt-1">{cityUmr.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Matrix Steps</span>
            </div>
            <p className="text-xl font-bold mt-1">{salaryMatrix.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-500" />
              <span className="text-xs text-muted-foreground">Aturan OT</span>
            </div>
            <p className="text-xl font-bold mt-1">{overtimeRules.filter(r => r.is_active).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MAIN 2-TAB SYSTEM                                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-lg">
          <TabsTrigger value="master">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Master & Structure
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Rules & Compliance
          </TabsTrigger>
        </TabsList>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* TAB 1: MASTER & STRUCTURE                                   */}
        {/* ──────────────────────────────────────────────────────────── */}
        <TabsContent value="master" className="space-y-4">

          {/* Job Grades */}
          <SectionCard
            title="Job Grades"
            description="Definisi grade jabatan & rentang gaji — PT. Maju Jaya Sejahtera"
            icon={Award}
            badge={<Badge variant="outline" className="text-[10px]">{jobGrades.length} grades</Badge>}
          >
            <div className="flex justify-end mb-3">
              <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" /> Tambah Grade</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="text-center">Level</TableHead>
                  <TableHead className="text-right">Gaji Min</TableHead>
                  <TableHead className="text-right">Gaji Mid</TableHead>
                  <TableHead className="text-right">Gaji Max</TableHead>
                  <TableHead className="text-center">Cuti</TableHead>
                  <TableHead className="text-center">OT</TableHead>
                  <TableHead className="text-center">Bonus</TableHead>
                  <TableHead className="text-center">Mobil</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobGrades.map(g => (
                  <TableRow key={g.id}>
                    <TableCell className="font-mono text-xs">{g.code}</TableCell>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="text-center">{g.level}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtRp(g.salary_min)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtRp(g.salary_mid)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtRp(g.salary_max)}</TableCell>
                    <TableCell className="text-center">{g.leave_quota}d</TableCell>
                    <TableCell className="text-center">{g.is_overtime_eligible ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-center">{g.is_bonus_eligible ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-center">{g.is_car_allowance_eligible ? <CheckCircle2 className="h-4 w-4 text-blue-500 mx-auto" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-3 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                Pilih grade di Tab 2 (Payroll Simulator) untuk melihat kalkulasi real-time berdasarkan data ini
              </p>
            </div>
          </SectionCard>

          {/* Salary Matrix */}
          <SectionCard
            title="Salary Matrix"
            description="Step kenaikan gaji per grade — linked to Job Grades"
            icon={Grid3X3}
            badge={<Badge variant="outline" className="text-[10px]">{salaryMatrix.length} steps</Badge>}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead className="text-center">Step</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Efektif</TableHead>
                  <TableHead className="text-right">vs Mid-Point</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaryMatrix.map(m => {
                  const grade = jobGrades.find(g => g.code === m.grade_code)
                  const midDiff = grade ? ((m.amount - grade.salary_mid) / grade.salary_mid * 100) : 0
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Badge variant="outline">{m.grade_code}</Badge>
                        <span className="text-muted-foreground text-xs ml-1">{m.grade_name}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-primary/10 text-primary">{m.step}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">{fmtRp(m.amount)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.effective_date}</TableCell>
                      <TableCell className="text-right">
                        <span className={`text-xs font-mono ${midDiff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {midDiff >= 0 ? "+" : ""}{midDiff.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </SectionCard>

          {/* Salary Components */}
          <SectionCard
            title="Salary Components"
            description="Komponen pendapatan & potongan slip gaji"
            icon={Layers}
            badge={
              <div className="flex gap-1">
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">{earningCount} Pendapatan</Badge>
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-[10px]">{deductionCount} Potongan</Badge>
              </div>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Perhitungan</TableHead>
                  <TableHead className="text-right">Nilai</TableHead>
                  <TableHead className="text-center">Pajak</TableHead>
                  <TableHead className="text-center">BPJS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaryComponents.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge className={c.component_type === "earning" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}>
                        {c.component_type === "earning" ? "Pendapatan" : "Potongan"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{categoryLabel[c.category] || c.category}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {c.amount_type === "fixed" ? "Fixed" : c.amount_type === "percentage" ? "Persentase" : "Formula"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{c.fixed_amount ? fmtRp(c.fixed_amount) : c.percentage ? fmtPct(c.percentage) : "Auto"}</TableCell>
                    <TableCell className="text-center">{c.is_taxable ? <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 mx-auto" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-center">{c.is_bpjs_base ? <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 mx-auto" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>

          {/* Allowance Types */}
          <SectionCard
            title="Allowance Types"
            description="Jenis tunjangan & aturan pemotongan per kondisi kehadiran"
            icon={Gift}
            badge={<Badge variant="outline" className="text-[10px]">{allowanceTypes.length} tunjangan</Badge>}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead className="text-center">Pajak</TableHead>
                  <TableHead className="text-center">Alpha</TableHead>
                  <TableHead className="text-center">Sakit</TableHead>
                  <TableHead className="text-center">Cuti</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allowanceTypes.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.code}</TableCell>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell><Badge className={typeColor[a.type]}>{typeLabel[a.type]}</Badge></TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtRp(a.default_nominal)}</TableCell>
                    <TableCell className="text-center">{a.is_taxable ? <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 mx-auto" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-center">{a.deduct_on_alpha ? <AlertCircle className="h-3.5 w-3.5 text-red-500 mx-auto" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-center">{a.deduct_on_sick ? <AlertCircle className="h-3.5 w-3.5 text-amber-500 mx-auto" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-center">{a.deduct_on_leave ? <AlertCircle className="h-3.5 w-3.5 text-blue-500 mx-auto" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={a.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"}>
                        {a.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>

          {/* Overtime Rules */}
          <SectionCard
            title="Overtime Rules"
            description="Aturan lembur berdasarkan Kepmenaker 102/2004"
            icon={Clock}
            badge={<Badge variant="outline" className="text-[10px]">{overtimeRules.filter(r => r.is_active).length} aktif</Badge>}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tipe Hari</TableHead>
                  <TableHead className="text-right">Jam 1 (x)</TableHead>
                  <TableHead className="text-right">Jam 2+ (x)</TableHead>
                  <TableHead className="text-right">Max/Hari</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overtimeRules.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge variant="outline">{dayTypeLabel[r.day_type]}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{r.first_hour_multiplier}x</TableCell>
                    <TableCell className="text-right font-mono">{r.next_hours_multiplier}x</TableCell>
                    <TableCell className="text-right">{r.max_hours_per_day} jam</TableCell>
                    <TableCell className="text-center">
                      <Badge className={r.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-gray-100 text-gray-700"}>
                        {r.is_active ? "Aktif" : "Off"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-3 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
              <p>Formula: Upah/173 x Multiplier x Jam Lembur (Kepmenaker No. 102/MEN/VI/2004)</p>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* TAB 2: RULES & COMPLIANCE (DEFAULT)                         */}
        {/* ──────────────────────────────────────────────────────────── */}
        <TabsContent value="rules" className="space-y-4">

          {/* ── PAYROLL SIMULATOR — hero card ── */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Payroll Simulator</CardTitle>
                  <CardDescription>Simulasi real-time — pilih grade & ubah parameter, hasil kalkulasi otomatis</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Inputs — row 1: grade-linked */}
              <div className="grid gap-4 md:grid-cols-5 mb-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Grade Jabatan</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={simGradeId} onChange={e => handleGradeChange(e.target.value)}>
                    {jobGrades.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Gaji Pokok</Label>
                  <Input type="number" value={simSalary} onChange={e => setSimSalary(Number(e.target.value) || 0)} />
                  <p className="text-[10px] text-muted-foreground">{fmtRp(simSalary)}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tunj. Tetap</Label>
                  <Input type="number" value={simAllowances} onChange={e => setSimAllowances(Number(e.target.value) || 0)} />
                  <p className="text-[10px] text-muted-foreground">{fmtRp(simAllowances)}</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status PTKP</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={simPtkp} onChange={e => setSimPtkp(e.target.value)}>
                    {Object.keys(pph21.ptkp).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Kota UMR</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={simCity} onChange={e => setSimCity(e.target.value)}>
                    {cityUmr.map(u => <option key={u.id} value={u.city}>{u.city}</option>)}
                  </select>
                </div>
              </div>
              {/* Inputs — row 2: detail params */}
              <div className="grid gap-4 md:grid-cols-5 mb-6">
                <div className="space-y-1.5">
                  <Label className="text-xs">Lembur (jam)</Label>
                  <Input type="number" min={0} value={simOtHours} onChange={e => setSimOtHours(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipe Hari Lembur</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={simOtDayType} onChange={e => setSimOtDayType(e.target.value as typeof simOtDayType)}>
                    <option value="weekday">Hari Kerja</option>
                    <option value="weekend">Weekend</option>
                    <option value="holiday">Hari Besar</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Masa Kerja (bln)</Label>
                  <Input type="number" min={0} max={360} value={simMonthsWorked} onChange={e => setSimMonthsWorked(Number(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Hari Kerja Aktual</Label>
                  <Input type="number" min={1} max={31} value={simWorkDays} onChange={e => setSimWorkDays(Number(e.target.value) || 22)} />
                  <p className="text-[10px] text-muted-foreground">dari {proRate.default_working_days} hari</p>
                </div>
                <div className="flex items-end pb-0.5">
                  <div className="flex items-center gap-2">
                    <Switch checked={simHasNpwp} onCheckedChange={setSimHasNpwp} id="npwp-switch" />
                    <Label htmlFor="npwp-switch" className="text-xs cursor-pointer">Punya NPWP</Label>
                  </div>
                </div>
              </div>

              {/* UMR Warning */}
              {!isAboveUmr && selectedUmr && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-400">
                    Gaji pokok ({fmtRp(simSalary)}) di bawah UMR {selectedUmr.city} ({fmtRp(selectedUmr.umr_amount)})
                  </p>
                </div>
              )}

              <Separator className="mb-6" />

              {/* Results — 3-column breakdown */}
              <div className="grid gap-4 md:grid-cols-3">
                {/* Pendapatan */}
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" /> PENDAPATAN
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    <div className="flex justify-between text-sm"><span>Gaji Pokok</span><span className="font-mono">{fmtRp(payroll.basicSalary)}</span></div>
                    {payroll.proRateFactor < 1 && (
                      <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400">
                        <span>Pro-rata ({simWorkDays}/{proRate.default_working_days})</span>
                        <span className="font-mono">{fmtRp(payroll.proratedSalary)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Tunj. Tetap</span>
                      <span className="font-mono">{fmtRp(payroll.proratedAllowances)}</span>
                    </div>
                    {payroll.overtimePay > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Lembur ({simOtHours}j, {dayTypeLabel[simOtDayType]})</span>
                        <span className="font-mono">{fmtRp(payroll.overtimePay)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Gross Bulanan</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">{fmtRp(payroll.grossMonthly)}</span>
                    </div>
                    {payroll.thrAmount > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground pt-1">
                        <span>THR ({simMonthsWorked >= thrConfig.min_months_full ? "1 bulan penuh" : `${simMonthsWorked}/${thrConfig.min_months_full}`})</span>
                        <span className="font-mono">{fmtRp(payroll.thrAmount)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Potongan */}
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" /> POTONGAN KARYAWAN
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    <div className="flex justify-between text-sm"><span>JHT ({fmtPct(bpjs.jht_employee_rate)})</span><span className="font-mono">-{fmtRp(payroll.jhtEmp)}</span></div>
                    <div className="flex justify-between text-sm"><span>JP ({fmtPct(bpjs.jp_employee_rate)})</span><span className="font-mono">-{fmtRp(payroll.jpEmp)}</span></div>
                    <div className="flex justify-between text-sm"><span>BPJS Kes ({fmtPct(bpjs.kes_employee_rate)})</span><span className="font-mono">-{fmtRp(payroll.kesEmp)}</span></div>
                    <div className="flex justify-between text-sm">
                      <span>PPh21 {!simHasNpwp && <span className="text-xs text-red-500">(+{pph21.non_npwp_surcharge}%)</span>}</span>
                      <span className="font-mono">-{fmtRp(payroll.pph21Monthly)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total Potongan</span>
                      <span className="font-mono text-red-600 dark:text-red-400">-{fmtRp(payroll.totalDeductions)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Take-Home Pay */}
                <Card className="border-primary/30">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-primary flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" /> TAKE-HOME PAY
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <div className="text-center py-2">
                      <p className="text-3xl font-bold text-primary">{fmtRp(payroll.netMonthly)}</p>
                      <p className="text-xs text-muted-foreground mt-1">Gaji bersih per bulan</p>
                    </div>
                    <Separator />
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Beban Perusahaan</p>
                      <div className="flex justify-between text-xs"><span>JKK ({fmtPct(bpjs.jkk_rate)})</span><span className="font-mono">{fmtRp(payroll.jkkCo)}</span></div>
                      <div className="flex justify-between text-xs"><span>JKM ({fmtPct(bpjs.jkm_rate)})</span><span className="font-mono">{fmtRp(payroll.jkmCo)}</span></div>
                      <div className="flex justify-between text-xs"><span>JHT Co. ({fmtPct(bpjs.jht_company_rate)})</span><span className="font-mono">{fmtRp(payroll.jhtCo)}</span></div>
                      <div className="flex justify-between text-xs"><span>JP Co. ({fmtPct(bpjs.jp_company_rate)})</span><span className="font-mono">{fmtRp(payroll.jpCo)}</span></div>
                      <div className="flex justify-between text-xs"><span>BPJS Kes Co. ({fmtPct(bpjs.kes_company_rate)})</span><span className="font-mono">{fmtRp(payroll.kesCo)}</span></div>
                      <div className="flex justify-between text-xs font-medium pt-1 border-t">
                        <span>Cost-to-Company</span>
                        <span className="font-mono">{fmtRp(payroll.costToCompany)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* PPh21 detail accordion */}
              <Collapsible className="mt-4">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground w-full justify-start">
                    <ChevronDown className="h-3 w-3 mr-1" /> Detail Perhitungan PPh21
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="bg-muted/30 rounded-lg p-4 mt-2 grid gap-4 md:grid-cols-2 text-xs">
                    <div className="space-y-1">
                      <p className="font-medium text-sm mb-2">Penghasilan Neto Setahun</p>
                      <div className="flex justify-between"><span>Bruto Tahunan (gaji + tunj.)</span><span className="font-mono">{fmtRp((payroll.proratedSalary + payroll.proratedAllowances) * 12)}</span></div>
                      <div className="flex justify-between"><span>Biaya Jabatan ({fmtPct(pph21.jabatan_rate)})</span><span className="font-mono">-{fmtRp(payroll.biayaJabatanMonthly * 12)}</span></div>
                      <div className="flex justify-between"><span>Iuran JHT+JP Tahunan</span><span className="font-mono">-{fmtRp((payroll.jhtEmp + payroll.jpEmp) * 12)}</span></div>
                      <div className="flex justify-between pt-1 border-t font-medium"><span>Neto Tahunan</span><span className="font-mono">{fmtRp(payroll.nettoAnnual)}</span></div>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm mb-2">Pajak Penghasilan</p>
                      <div className="flex justify-between"><span>PTKP ({simPtkp})</span><span className="font-mono">-{fmtRp(pph21.ptkp[simPtkp] || 54000000)}</span></div>
                      <div className="flex justify-between"><span>PKP</span><span className="font-mono">{fmtRp(payroll.pkp)}</span></div>
                      {!simHasNpwp && <div className="flex justify-between text-red-600"><span>Surcharge Non-NPWP</span><span>+{pph21.non_npwp_surcharge}%</span></div>}
                      <div className="flex justify-between font-medium pt-1 border-t"><span>PPh21 Bulanan</span><span className="font-mono">{fmtRp(payroll.pph21Monthly)}</span></div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* ── Compliance Dashboard ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Shield className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold">Compliance Dashboard</CardTitle>
                  <CardDescription className="text-xs">Status kepatuhan regulasi ketenagakerjaan Indonesia</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <ComplianceStatus
                    label="UMR Compliance"
                    ok={isAboveUmr}
                    detail={isAboveUmr ? `Gaji di atas UMR ${simCity}` : `Di bawah UMR ${simCity} (${fmtRp(selectedUmr?.umr_amount || 0)})`}
                  />
                  <ComplianceStatus
                    label="BPJS Ketenagakerjaan"
                    ok={bpjs.jht_employee_rate >= 2.0 && bpjs.jht_company_rate >= 3.7}
                    detail={`JHT: ${bpjs.jht_employee_rate}%/${bpjs.jht_company_rate}% — JP: ${bpjs.jp_employee_rate}%/${bpjs.jp_company_rate}%`}
                  />
                  <ComplianceStatus
                    label="BPJS Kesehatan"
                    ok={bpjs.kes_employee_rate >= 1.0 && bpjs.kes_company_rate >= 4.0}
                    detail={`Karyawan: ${bpjs.kes_employee_rate}% — Perusahaan: ${bpjs.kes_company_rate}%`}
                  />
                </div>
                <div className="space-y-1">
                  <ComplianceStatus
                    label="PPh21 Config"
                    ok={true}
                    detail={`PTKP Tahun ${pph21.tax_year} — TER method ${pph21.use_ter ? "aktif" : "nonaktif"}`}
                  />
                  <ComplianceStatus
                    label="THR Policy"
                    ok={thrConfig.is_active}
                    detail={thrConfig.is_active ? `Aktif — basis: ${thrConfig.calculation_base === "basic_salary" ? "Gaji Pokok" : "Gaji+Tunj."}` : "THR belum diaktifkan"}
                  />
                  <ComplianceStatus
                    label="NPWP Status"
                    ok={simHasNpwp}
                    detail={simHasNpwp ? "NPWP terdaftar — tarif normal" : `Tanpa NPWP — surcharge +${pph21.non_npwp_surcharge}%`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── BPJS Configuration ── */}
          <SectionCard title="BPJS Configuration" description="Tarif iuran BPJS Ketenagakerjaan & Kesehatan" icon={Shield}>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">BPJS Ketenagakerjaan</p>
                <div className="space-y-3">
                  {([
                    ["JKK (Perusahaan)", "jkk_rate"],
                    ["JKM (Perusahaan)", "jkm_rate"],
                    ["JHT Karyawan", "jht_employee_rate"],
                    ["JHT Perusahaan", "jht_company_rate"],
                    ["JP Karyawan", "jp_employee_rate"],
                    ["JP Perusahaan", "jp_company_rate"],
                  ] as const).map(([label, key]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-sm">{label}</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number" step="0.01" className="w-20 text-right text-sm"
                          value={bpjs[key]}
                          onChange={e => setBpjs(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Label className="text-sm">Batas Upah JP</Label>
                    <div className="text-right">
                      <Input
                        type="number" className="w-32 text-right text-sm"
                        value={bpjs.jp_salary_cap}
                        onChange={e => setBpjs(prev => ({ ...prev, jp_salary_cap: parseFloat(e.target.value) || 0 }))}
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">{fmtRp(bpjs.jp_salary_cap)}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">BPJS Kesehatan</p>
                <div className="space-y-3">
                  {([
                    ["Karyawan", "kes_employee_rate"],
                    ["Perusahaan", "kes_company_rate"],
                  ] as const).map(([label, key]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="text-sm">{label}</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number" step="0.01" className="w-20 text-right text-sm"
                          value={bpjs[key]}
                          onChange={e => setBpjs(prev => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Label className="text-sm">Batas Upah Kes</Label>
                    <div className="text-right">
                      <Input
                        type="number" className="w-32 text-right text-sm"
                        value={bpjs.kes_salary_cap}
                        onChange={e => setBpjs(prev => ({ ...prev, kes_salary_cap: parseFloat(e.target.value) || 0 }))}
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">{fmtRp(bpjs.kes_salary_cap)}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Identitas</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span>No. BPJS TK</span><span className="font-mono">{bpjs.bpjs_tk_number}</span></div>
                    <div className="flex justify-between text-xs"><span>No. BPJS Kes</span><span className="font-mono">{bpjs.bpjs_kes_number}</span></div>
                    <div className="flex justify-between text-xs"><span>Berlaku</span><span>{bpjs.effective_date}</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Total iuran BPJS: {totalBpjsRate.toFixed(2)}% (Karyawan: {(bpjs.jht_employee_rate + bpjs.jp_employee_rate + bpjs.kes_employee_rate).toFixed(2)}% | Perusahaan: {(bpjs.jkk_rate + bpjs.jkm_rate + bpjs.jht_company_rate + bpjs.jp_company_rate + bpjs.kes_company_rate).toFixed(2)}%)
              </p>
            </div>
          </SectionCard>

          {/* ── PPh21 Configuration ── */}
          <SectionCard title="PPh21 Configuration" description={`PTKP, tarif progresif, biaya jabatan — Tahun Pajak ${pph21.tax_year}`} icon={Receipt}>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">PTKP Tahun {pph21.tax_year}</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(pph21.ptkp).map(([status, amount]) => (
                    <div key={status} className={`flex justify-between items-center rounded px-3 py-2 ${simPtkp === status ? "bg-primary/10 border border-primary/30" : "bg-muted/30"}`}>
                      <span className="text-xs font-medium">{status}</span>
                      <span className="text-xs font-mono">{fmtRp(amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Tarif Progresif</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">PKP Min</TableHead>
                      <TableHead className="text-xs">PKP Max</TableHead>
                      <TableHead className="text-xs text-right">Tarif</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pph21.brackets.map((b, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono">{fmtRp(b.min)}</TableCell>
                        <TableCell className="text-xs font-mono">{b.max > 0 ? fmtRp(b.max) : "∞"}</TableCell>
                        <TableCell className="text-xs text-right font-semibold">{b.rate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  <p>Biaya Jabatan: {fmtPct(pph21.jabatan_rate)} (max {fmtRp(pph21.jabatan_max_monthly)}/bln)</p>
                  <p>Surcharge Non-NPWP: +{pph21.non_npwp_surcharge}%</p>
                  <div className="flex items-center justify-between pt-2">
                    <span>Metode TER</span>
                    <Badge className={pph21.use_ter ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-gray-100 text-gray-700"}>
                      {pph21.use_ter ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── City UMR ── */}
          <SectionCard
            title="City UMR"
            description="Upah Minimum Regional per kota — Tahun 2026"
            icon={MapPin}
            badge={<Badge variant="outline" className="text-[10px]">{cityUmr.length} kota</Badge>}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kota</TableHead>
                  <TableHead>Provinsi</TableHead>
                  <TableHead className="text-right">UMR</TableHead>
                  <TableHead>Efektif</TableHead>
                  <TableHead>Dasar Hukum</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cityUmr.map(u => (
                  <TableRow key={u.id} className={simCity === u.city ? "bg-primary/5" : ""}>
                    <TableCell className="font-medium">
                      {u.city}
                      {simCity === u.city && <Badge className="ml-2 bg-primary/10 text-primary text-[9px]">Dipilih</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.province}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">{fmtRp(u.umr_amount)}</TableCell>
                    <TableCell className="text-xs">{u.effective_date}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.legal_basis}</TableCell>
                    <TableCell className="text-center">
                      {simSalary >= u.umr_amount
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        : <AlertTriangle className="h-4 w-4 text-red-500 mx-auto" />
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>

          {/* ── THR Settings ── */}
          <SectionCard title="THR Settings" description="Konfigurasi Tunjangan Hari Raya" icon={Gift}>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Dasar Perhitungan</Label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="thr-base" className="accent-primary" checked={thrConfig.calculation_base === "basic_salary"} onChange={() => setThrConfig(p => ({ ...p, calculation_base: "basic_salary" }))} />
                      <span className="text-sm">Gaji Pokok</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="thr-base" className="accent-primary" checked={thrConfig.calculation_base === "basic_plus_fixed"} onChange={() => setThrConfig(p => ({ ...p, calculation_base: "basic_plus_fixed" }))} />
                      <span className="text-sm">Gaji + Tunj. Tetap</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Waktu Pembayaran</Label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="thr-timing" className="accent-primary" checked={thrConfig.payment_timing === "separate"} onChange={() => setThrConfig(p => ({ ...p, payment_timing: "separate" }))} />
                      <span className="text-sm">Terpisah</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="thr-timing" className="accent-primary" checked={thrConfig.payment_timing === "with_payroll"} onChange={() => setThrConfig(p => ({ ...p, payment_timing: "with_payroll" }))} />
                      <span className="text-sm">Bersama Payroll</span>
                    </label>
                  </div>
                </div>
                <div className="grid gap-3 grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Min. Bulan (Full)</Label>
                    <Input type="number" min={1} max={24} value={thrConfig.min_months_full} onChange={e => setThrConfig(p => ({ ...p, min_months_full: parseInt(e.target.value) || 12 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Min. Bulan (Eligible)</Label>
                    <Input type="number" min={0} max={12} value={thrConfig.min_months_eligible} onChange={e => setThrConfig(p => ({ ...p, min_months_eligible: parseInt(e.target.value) || 1 }))} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Status Aktif</Label>
                  <Switch checked={thrConfig.is_active} onCheckedChange={v => setThrConfig(p => ({ ...p, is_active: v }))} />
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Preview THR (data simulator)</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Gaji Pokok</span><span className="font-mono">{fmtRp(simSalary)}</span></div>
                  {thrConfig.calculation_base === "basic_plus_fixed" && (
                    <div className="flex justify-between"><span>+ Tunj. Tetap</span><span className="font-mono">{fmtRp(simAllowances)}</span></div>
                  )}
                  <div className="flex justify-between"><span>Masa Kerja</span><span>{simMonthsWorked} bulan</span></div>
                  <div className="flex justify-between"><span>Proporsi</span><span>{Math.min(simMonthsWorked, thrConfig.min_months_full)}/{thrConfig.min_months_full}</span></div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-primary text-base">
                    <span>THR</span>
                    <span className="font-mono">{fmtRp(payroll.thrAmount)}</span>
                  </div>
                  {simMonthsWorked < thrConfig.min_months_eligible && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3" />
                      Belum memenuhi masa kerja minimum ({thrConfig.min_months_eligible} bulan)
                    </p>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── Pro-Rate Config ── */}
          <SectionCard title="Pro-Rate Config" description="Pengaturan pro-rata untuk join/resign tengah bulan" icon={Calculator} defaultOpen={false}>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Hari Kerja Default</Label>
                    <Input type="number" min={1} max={31} value={proRate.default_working_days} onChange={e => setProRate(p => ({ ...p, default_working_days: parseInt(e.target.value) || 22 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cut-off Payroll</Label>
                    <Input type="number" min={1} max={31} value={proRate.payroll_cutoff_date} onChange={e => setProRate(p => ({ ...p, payroll_cutoff_date: parseInt(e.target.value) || 23 }))} />
                    <p className="text-[10px] text-muted-foreground">Tgl {proRate.payroll_cutoff_date} setiap bulan</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Metode Pro-Rata</Label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="prorate-method" className="accent-primary" checked={proRate.prorate_method === "working_days"} onChange={() => setProRate(p => ({ ...p, prorate_method: "working_days" }))} />
                      <span className="text-sm">Hari Kerja</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="prorate-method" className="accent-primary" checked={proRate.prorate_method === "calendar_days"} onChange={() => setProRate(p => ({ ...p, prorate_method: "calendar_days" }))} />
                      <span className="text-sm">Hari Kalender</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Pro-rata Gaji Pokok</Label>
                    <p className="text-[10px] text-muted-foreground">Hitung gaji berdasarkan hari kerja aktual</p>
                  </div>
                  <Switch checked={proRate.prorate_salary} onCheckedChange={v => setProRate(p => ({ ...p, prorate_salary: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Pro-rata Tunjangan</Label>
                    <p className="text-[10px] text-muted-foreground">Tunjangan tetap ikut dipro-rata</p>
                  </div>
                  <Switch checked={proRate.prorate_allowances} onCheckedChange={v => setProRate(p => ({ ...p, prorate_allowances: v }))} />
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Preview Pro-Rata (data simulator)</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Gaji Pokok</span><span className="font-mono">{fmtRp(simSalary)}</span></div>
                  <div className="flex justify-between"><span>Hari Kerja</span><span>{simWorkDays} / {proRate.default_working_days}</span></div>
                  <div className="flex justify-between"><span>Faktor</span><span className="font-mono">{payroll.proRateFactor.toFixed(4)}</span></div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Gaji Pro-rata</span>
                    <span className="font-mono">{fmtRp(payroll.proratedSalary)}</span>
                  </div>
                  {proRate.prorate_allowances && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tunj. Pro-rata</span>
                      <span className="font-mono">{fmtRp(payroll.proratedAllowances)}</span>
                    </div>
                  )}
                  {payroll.proRateFactor < 1 && (
                    <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400 pt-1 border-t">
                      <span>Selisih dari full</span>
                      <span className="font-mono">-{fmtRp(simSalary - payroll.proratedSalary)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

        </TabsContent>
      </Tabs>
    </div>
  )
}
