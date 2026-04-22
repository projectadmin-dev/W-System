# Payroll Engine Documentation

## 📦 Overview

Payroll engine untuk W-System HR Module dengan fitur:
- ✅ **THR Calculation** (otomatis sesuai masa kerja)
- ✅ **Pro-Rate Salary** (mid-month join/resign)
- ✅ **Dynamic Allowances** (4 tipe: FIXED, ATTENDANCE_BASED, CONDITIONAL, PRORATED)
- ✅ **BPJS** (TK + Kesehatan)
- ✅ **PPh21** (progressive tax calculation)

## 🚀 Quick Start

### 1. Run Migrations

```bash
cd /home/ubuntu/apps/wsystem-1/supabase
supabase db push
```

Atau manual via Supabase Dashboard:
- Copy isi file `migrations/20260422*.sql`
- Paste ke SQL Editor di Supabase Dashboard
- Run

### 2. Use Payroll Engine

```typescript
import { calculatePayroll } from '@/lib/repositories/hr-payroll-engine'

const result = await calculatePayroll({
  employee: {
    id: 'emp-001',
    join_date: '2025-06-01',
    basic_salary: 10000000,
    entity_id: 'entity-001',
    user_id: 'user-001'
  },
  period: {
    id: 'period-001',
    month: 4,
    year: 2026,
    start_date: '2026-04-01',
    end_date: '2026-04-30',
    status: 'draft'
  },
  attendance: {
    working_days: 22,
    present_days: 21,
    alpha_days: 1,
    sick_leave_days: 0,
    paid_leave_days: 0,
    late_days: 0,
    overtime_hours: 5
  },
  allowances: [
    {
      allowance_type_id: 'allowance-001',
      type: 'FIXED',
      nominal: 1000000,
      is_taxable: true
    }
  ],
  thr_config: {
    payment_timing: 'with_payroll',
    calculation_base: 'basic_salary'
  },
  ptkp_status: 'K/2'
})

console.log(result.thp) // Take Home Pay
console.log(result.calculation_log) // Audit trail
```

## 📊 Test Scenarios

### Scenario 1: THR untuk Karyawan Baru (Budi)

**Input:**
- Join Date: 1 Maret 2026
- Periode THR: April 2026
- Gaji Pokok: Rp 5.000.000

**Expected:**
- Masa kerja = 2 bulan
- THR = (2/12) × 5.000.000 = **Rp 833.333**

**Run Test:**
```bash
npm test -- hr-payroll-engine.test.ts -t "THR untuk Karyawan Baru"
```

### Scenario 2: Pro-Rate Gaji (Sari)

**Input:**
- Join Date: 15 April 2026
- Hari Kerja: 22 hari
- Hari Aktual: 16 hari
- Gaji Pokok: Rp 6.000.000

**Expected:**
- Gaji Prorata = (6.000.000 / 22) × 16 = **Rp 4.363.636**

**Run Test:**
```bash
npm test -- hr-payroll-engine.test.ts -t "Pro-Rate Gaji"
```

### Scenario 3: Attendance-Based Allowance (Andi)

**Input:**
- Tunjangan Kehadiran: Rp 500.000
- Hari Kerja: 22 hari
- Hadir: 20 hari, Alpha: 1 hari, Sakit: 1 hari
- deduct_on_alpha: true, deduct_on_sick_leave: false

**Expected:**
- Allowance per hari = 500.000 / 22 = 22.727
- Potongan alpha = 22.727 × 1 = 22.727
- Total = 500.000 - 22.727 = **Rp 477.273**

**Run Test:**
```bash
npm test -- hr-payroll-engine.test.ts -t "Attendance-Based Allowance"
```

## 🧮 Calculation Formulas

### 1. Pro-Rate Salary

```typescript
if (join_date in period || resign_date in period) {
  prorated_salary = (basic_salary / working_days) × actual_days
} else {
  prorated_salary = basic_salary
}
```

### 2. THR (Tunjangan Hari Raya)

```typescript
if (months_worked >= 12) {
  thr_amount = basic_salary
} else if (months_worked > 0) {
  thr_amount = (months_worked / 12) × basic_salary
} else {
  thr_amount = 0
}
```

### 3. Attendance-Based Allowance

```typescript
allowance_per_day = nominal / working_days

deduction = 0
if (deduct_on_alpha && alpha_days > 0) {
  deduction += allowance_per_day × alpha_days
}
if (deduct_on_sick_leave && sick_leave_days > 0) {
  deduction += allowance_per_day × sick_leave_days
}
if (deduct_on_paid_leave && paid_leave_days > 0) {
  deduction += allowance_per_day × paid_leave_days
}

calculated_amount = max(0, nominal - deduction)
```

### 4. BPJS

**Employee:**
- JHT: 2% × base (capped at 12.4M)
- JP: 1% × base (capped at 89.400/month)
- BPJS Kes: 1% × base

**Company:**
- JKK: 0.24% × base (varies by risk level)
- JKM: 0.30% × base
- JHT: 3.70% × base
- JP: 2.00% × base
- BPJS Kes: 4.00% × base

### 5. PPh21 (Progressive Tax)

**PTKP 2026:**
- TK/0: 54.000.000
- K/0: 58.500.000
- K/1: 63.000.000
- K/2: 67.500.000
- K/3: 72.000.000

**Tax Brackets (UU HPP 2021):**
- 0-60M: 5%
- 60-250M: 15%
- 250-500M: 25%
- 500M-5B: 30%
- >5B: 35%

```typescript
annual_gross = (monthly_gross × 12) + thr_amount
taxable_income = annual_gross - biaya_jabatan - iuran_pensiun - ptkp
annual_tax = progressive_calculation(taxable_income)
monthly_tax = annual_tax / 12
```

## 📁 Files Created

```
supabase/migrations/
├── 202604220001_allowance_types.sql          # Allowance types table
├── 202604220002_employee_allowances.sql      # Employee-allowance link
├── 202604220003_thr_configs.sql              # THR config + eligibility
├── 202604220004_pro_rate_configs.sql         # Pro-rate settings
├── 202604220005_allowance_calculation_logs.sql # Audit trail
└── 202604220006_payroll_slips_extend.sql     # Extend payroll_slips

apps/web/lib/repositories/
├── hr-payroll-engine.ts                      # Core calculation engine
└── PAYROLL-README.md                         # This file

apps/web/lib/__tests__/
└── hr-payroll-engine.test.ts                 # Unit tests (3 scenarios)
```

## ✅ Next Steps

1. **Run Tests**
   ```bash
   npm test -- hr-payroll-engine.test.ts
   ```

2. **Deploy Migrations**
   ```bash
   cd /home/ubuntu/apps/wsystem-1/supabase
   supabase db push
   ```

3. **Create API Endpoint**
   ```typescript
   // apps/web/app/api/payroll-periods/[id]/generate/route.ts
   import { calculatePayroll } from '@/lib/repositories/hr-payroll-engine'
   
   export async function POST(req: Request) {
     // 1. Fetch period + employees
     // 2. Calculate payroll for each
     // 3. Save to payroll_slips
     // 4. Generate PDF
   }
   ```

4. **Build UI**
   - HR Admin: Payroll period management
   - Employee: Payslip view

## 🐛 Known Limitations

- Overtime calculation simplified (average 1.75× multiplier)
- Conditional allowance rules need expansion (currently only `has_overtime`)
- No integration with BOPP/TOPP yet
- PDF generation not included

## 📞 Support

Untuk pertanyaan atau issue:
- Check test files untuk example usage
- Lihat calculation_log di result untuk debug
- Referensi: PRD W-System v2.0 Section 4 (Functional Requirements)
