# Payroll API Documentation

## 📍 Base URL

```
https://your-domain.com/api
```

## 🔐 Authentication

All endpoints require authentication via Supabase Auth. Include the access token in the request:

```typescript
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

// Then use in fetch:
fetch('/api/payroll-periods', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

---

## 📋 Endpoints

### 1. List Payroll Periods

**GET** `/payroll-periods`

**Query Parameters:**
- `entity_id` (optional) - Filter by entity
- `status` (optional) - Filter by status (draft, generated, approved, paid, locked)
- `month` (optional) - Filter by month (1-12)
- `year` (optional) - Filter by year

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "entity_id": "uuid",
      "month": 4,
      "year": 2026,
      "start_date": "2026-04-01",
      "end_date": "2026-04-30",
      "status": "draft",
      "payroll_slips": [
        {
          "id": "uuid",
          "employee_id": "uuid",
          "employee_name": "John Doe",
          "status": "draft",
          "thp": 8500000
        }
      ]
    }
  ]
}
```

**Example:**
```typescript
const response = await fetch('/api/payroll-periods?entity_id=xxx&month=4&year=2026')
const data = await response.json()
```

---

### 2. Create Payroll Period

**POST** `/payroll-periods`

**Body:**
```json
{
  "entity_id": "uuid",
  "month": 4,
  "year": 2026,
  "start_date": "2026-04-01",
  "end_date": "2026-04-30",
  "attendance_cutoff_date": "2026-04-25",
  "overtime_cutoff_date": "2026-04-25",
  "payroll_cutoff_date": "2026-04-28"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "entity_id": "uuid",
    "month": 4,
    "year": 2026,
    "status": "draft",
    "created_at": "2026-04-22T12:00:00Z"
  }
}
```

**Example:**
```typescript
const response = await fetch('/api/payroll-periods', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    entity_id: 'entity-uuid',
    month: 4,
    year: 2026,
    start_date: '2026-04-01',
    end_date: '2026-04-30'
  })
})
```

---

### 3. Generate Payroll (CORE ENDPOINT)

**POST** `/payroll-periods/[id]/generate`

**Description:** Generates payroll slips for all active employees in the period. Automatically calculates:
- Basic salary (with pro-rate if needed)
- Allowances (4 types)
- THR (if applicable)
- Overtime
- BPJS deductions
- PPh21 tax

**Path Parameters:**
- `id` - Payroll period ID

**Response:**
```json
{
  "success": true,
  "message": "Payroll generated successfully",
  "data": {
    "generated": 25,
    "failed": 0,
    "slips": [
      {
        "slip_id": "uuid",
        "employee_id": "uuid",
        "employee_name": "Budi Santoso",
        "thp": 8500000,
        "calculation_log": [
          "Starting payroll calculation...",
          "Basic salary: 5000000 (pro-rated: false)",
          "THR calculated: 833333 (0.17 months)",
          "Total Earnings: 9333333",
          "Total Deductions: 833333",
          "THP: 8500000"
        ]
      }
    ],
    "errors": []
  }
}
```

**Error Response (partial failure):**
```json
{
  "success": true,
  "message": "Payroll generated with errors",
  "data": {
    "generated": 24,
    "failed": 1,
    "slips": [...],
    "errors": [
      {
        "employee_id": "uuid",
        "employee_name": "Error Employee",
        "error": "Missing salary data"
      }
    ]
  }
}
```

**Example:**
```typescript
const response = await fetch(`/api/payroll-periods/${periodId}/generate`, {
  method: 'POST'
})
const result = await response.json()

console.log(`Generated ${result.data.generated} slips`)
console.log(`Failed: ${result.data.failed}`)

// Show calculation log for first employee
console.log(result.data.slips[0].calculation_log)
```

---

### 4. Get Payroll Slip

**GET** `/payroll-slips/[id]`

**Description:** Get detailed payroll slip with line items. Users can only view their own slip unless they're HR admin.

**Path Parameters:**
- `id` - Payroll slip ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employee_id": "uuid",
    "employee_name": "Budi Santoso",
    "period_month": 4,
    "period_year": 2026,
    "basic_salary": 5000000,
    "allowances_total": 1500000,
    "overtime_amount": 0,
    "thr_amount": 833333,
    "total_earnings": 7333333,
    "bpjs_tk_employee": 100000,
    "bpjs_kes_employee": 50000,
    "pph21_employee": 150000,
    "total_deductions": 300000,
    "thp": 7033333,
    "status": "draft",
    "payroll_periods": {
      "month": 4,
      "year": 2026,
      "start_date": "2026-04-01",
      "end_date": "2026-04-30"
    },
    "payroll_slip_details": [
      {
        "type": "earning",
        "category": "salary",
        "description": "Gaji Pokok",
        "amount": 5000000,
        "metadata": { "is_prorated": false }
      },
      {
        "type": "earning",
        "category": "allowance",
        "description": "Tunjangan (FIXED)",
        "amount": 1000000,
        "metadata": {}
      },
      {
        "type": "earning",
        "category": "thr",
        "description": "THR",
        "amount": 833333,
        "metadata": { "months": 0.17 }
      },
      {
        "type": "deduction",
        "category": "bpjs",
        "description": "Iuran BPJS TK (JHT + JP)",
        "amount": 100000,
        "metadata": { "base": 5000000 }
      },
      {
        "type": "deduction",
        "category": "tax",
        "description": "PPh 21",
        "amount": 150000,
        "metadata": { "taxable_income": 60000000, "ptkp": 54000000 }
      }
    ],
    "verification": {
      "total_earnings_from_details": 7333333,
      "total_deductions_from_details": 300000,
      "thp_from_details": 7033333,
      "matches": true
    }
  }
}
```

**Example:**
```typescript
const response = await fetch(`/api/payroll-slips/${slipId}`)
const data = await response.json()

console.log(`THP: ${data.data.thp}`)
console.log('Breakdown:')
data.data.payroll_slip_details.forEach(detail => {
  console.log(`  ${detail.type === 'earning' ? '+' : '-'} ${detail.description}: ${detail.amount}`)
})
```

---

### 5. Update Payroll Slip

**PUT** `/payroll-slips/[id]`

**Description:** Update payroll slip status (approve/cancel). Requires HR admin role.

**Path Parameters:**
- `id` - Payroll slip ID

**Body:**
```json
{
  "status": "approved"
}
```

**Valid Statuses:**
- `draft` - Initial state
- `approved` - HR approved
- `paid` - Payment completed
- `cancelled` - Cancelled

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "approved",
    "approved_by": "uuid",
    "approved_at": "2026-04-22T14:00:00Z"
  }
}
```

**Example:**
```typescript
const response = await fetch(`/api/payroll-slips/${slipId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'approved' })
})
```

---

### 6. Delete Payroll Slip

**DELETE** `/payroll-slips/[id]`

**Description:** Delete a payroll slip. Requires HR admin role. Cascade deletes slip details and calculation logs.

**Path Parameters:**
- `id` - Payroll slip ID

**Response:**
```json
{
  "success": true,
  "message": "Payroll slip deleted successfully"
}
```

**Example:**
```typescript
const response = await fetch(`/api/payroll-slips/${slipId}`, {
  method: 'DELETE'
})
```

---

## 🔄 Typical Workflow

### 1. Create Payroll Period

```typescript
// HR Admin creates April 2026 payroll period
const period = await fetch('/api/payroll-periods', {
  method: 'POST',
  body: JSON.stringify({
    entity_id: 'entity-uuid',
    month: 4,
    year: 2026,
    start_date: '2026-04-01',
    end_date: '2026-04-30',
    attendance_cutoff_date: '2026-04-25',
    payroll_cutoff_date: '2026-04-28'
  })
})
```

### 2. Generate Payroll

```typescript
// After attendance cutoff, generate payroll for all employees
const result = await fetch(`/api/payroll-periods/${period.data.id}/generate`, {
  method: 'POST'
})

console.log(`Generated ${result.data.generated} slips`)
```

### 3. Review & Approve

```typescript
// HR reviews slips
const slips = await fetch(`/api/payroll-periods/${periodId}`)

// Approve each slip
for (const slip of slips.data.payroll_slips) {
  await fetch(`/api/payroll-slips/${slip.id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'approved' })
  })
}
```

### 4. Mark as Paid

```typescript
// After payment processing
await fetch(`/api/payroll-periods/${periodId}`, {
  method: 'PUT',
  body: JSON.stringify({ status: 'paid' })
})
```

### 5. Employee Views Payslip

```typescript
// Employee logs in and views their payslip
const mySlip = await fetch(`/api/payroll-slips/${slipId}`)

console.log(`My THP: ${mySlip.data.thp}`)
```

---

## 📊 Calculation Breakdown

Each payroll slip includes detailed breakdown in `payroll_slip_details`:

### Earnings
- **Gaji Pokok** - Basic salary (may be prorated)
- **Tunjangan** - Allowances (FIXED, ATTENDANCE_BASED, CONDITIONAL, PRORATED)
- **THR** - Tunjangan Hari Raya (if applicable)
- **Lembur** - Overtime pay

### Deductions
- **BPJS TK** - JHT (2%) + JP (1%)
- **BPJS Kesehatan** - 1%
- **PPh 21** - Progressive income tax
- **Potongan Kehadiran** - Attendance-based allowance deductions

---

## 🐛 Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Error message",
  "details": [] // Optional validation errors
}
```

**Common Errors:**
- `401 Unauthorized` - Missing or invalid auth token
- `403 Forbidden` - User lacks required role
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Period already exists
- `500 Internal Server Error` - Calculation or DB error

---

## 📝 Next Steps

1. **Deploy migrations** (already done ✅)
2. **Test endpoints** via Postman/Thunder Client
3. **Build UI** for HR Admin dashboard
4. **Add PDF generation** for payslips
5. **Integrate with payment gateway** for salary disbursement

---

**Files Created:**
- `/apps/web/app/api/payroll-periods/route.ts` - List/Create periods
- `/apps/web/app/api/payroll-periods/[id]/generate/route.ts` - Generate payroll
- `/apps/web/app/api/payroll-slips/[id]/route.ts` - Get/Update/Delete slips
- `/apps/web/app/api/PAYROLL-API-README.md` - This documentation

Total: 4 files, ~600 lines of code
