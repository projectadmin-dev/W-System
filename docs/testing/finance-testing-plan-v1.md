# 📋 W.System Finance Module — Comprehensive Testing Plan

**Version:** v1.0  
**Date:** 2026-05-12  
**Scope:** `/finance/*` — 24 Active Sub-Modules  
**Prepared by:** Reddie (Analyst Agent)  
**Owner Review:** Arie Anggono (CFO)  

---

## 📊 Executive Summary

Modul Finance W.System v3 memiliki **24 sub-modul aktif** dengan **31 halaman UI** dan **46 endpoint API**. Semua modul sudah terimplementasi penuh (bukan placeholder). Testing plan ini mencakup: API contract testing, UI/UX flow validation, PSAK compliance audit, data integrity checks, dan regression suite.

### Sub-Module Inventory

| # | Module | Pages | API Routes | Priority | PSAK Critical |
|---|--------|-------|------------|----------|---------------|
| 1 | **COA (Chart of Accounts)** | 2 | 1 | 🔴 P0 | ✅ Yes |
| 2 | **Journal Entries** | 2 | 4 | 🔴 P0 | ✅ Yes |
| 3 | **Fiscal Periods** | 1 | 5 | 🔴 P0 | ✅ Yes |
| 4 | **Customer Invoices** | 1 | 3 | 🔴 P0 | ✅ Yes |
| 5 | **Vendor Bills** | 1 | 3 | 🔴 P0 | ✅ Yes |
| 6 | **Payments** | 1 | 2 | 🔴 P0 | ✅ Yes |
| 7 | **Receipts** | 2 | 3 | 🔴 P0 | ✅ Yes |
| 8 | **AR Aging** | 1 | 1 | 🟡 P1 | — |
| 9 | **AP Aging** | 1 | 1 | 🟡 P1 | — |
| 10 | **Cash Register** | 1 | 2 | 🟡 P1 | — |
| 11 | **Petty Cash** | 1 | 1 | 🟡 P1 | — |
| 12 | **Money Requests** | 1 | 5 | 🟡 P1 | — |
| 13 | **Payment Vouchers** | 1 | 3 | 🟡 P1 | ✅ Yes |
| 14 | **Payment Reconciliation** | 1 | 1 | 🟡 P1 | ✅ Yes |
| 15 | **Bank Reconciliation** | 1 | 1 | 🟡 P1 | — |
| 16 | **Expenses** | 1 | 3 | 🟡 P1 | — |
| 17 | **Budget vs Actual** | 1 | 1 | 🟡 P1 | — |
| 18 | **Customers** | 1 | 2 | 🟢 P2 | — |
| 19 | **Vendors** | 1 | 2 | 🟢 P2 | — |
| 20 | **Transactions Hub** | 1 | 1 | 🟢 P2 | ✅ Yes |
| 21 | **Financial Reports** | 5 | 2 | 🔴 P0 | ✅ Yes |
| 22 | **Payroll Periods** | 1 | 0 | 🟢 P2 | — |
| 23 | **Payroll Slips** | 1 | 0 | 🟢 P2 | — |
| 24 | **BKM (Bukti Kas Masuk)** | 1 | 0 | 🟢 P2 | — |

**Total:** 31 Pages | 46 API Routes | 24 Sub-Modules

---

## 🎯 Testing Approach — A/B/C Options (for Arie)

### **Option A: Full Regression + PSAK Audit** (Recommended)
- **Scope:** Test ALL 24 modules end-to-end
- **Depth:** API contract, UI flow, data integrity, PSAK compliance
- **Duration:** ~3-4 sprints (6-8 minggu)
- **Resource:** 2 QA testers + 1 accountant review
- **Deliverable:** Tested system ready for external audit

### **Option B: Risk-Based Priority Testing** (Balanced)
- **Scope:** P0 + P1 modules only (20 modules, exclude payroll/BKM)
- **Depth:** Core API + critical UI flows + PSAK audit for P0 only
- **Duration:** ~2 sprints (4 minggu)
- **Resource:** 1 QA tester + spot check by accountant
- **Deliverable:** Core finance stable, edge modules flagged for later

### **Option C: Smoke Test Only** (Quick Validation)
- **Scope:** P0 modules only (COA, Journal, Periods, Invoices, Bills, Payments, Receipts, Reports)
- **Depth:** API health check + basic UI render + one happy path per module
- **Duration:** 1 sprint (2 minggu)
- **Resource:** 1 developer doing self-testing
- **Deliverable:** "System runs" confirmation, detailed gaps documented

---

## 🔴 P0 Module — Detailed Testing Plan

### 1. COA (Chart of Accounts)

#### API Tests
```bash
# GET all accounts
curl -s http://localhost:3001/api/finance/coa | jq '.data | length'
# Expected: Returns array (0+ items), status 200

# POST create account
curl -s -X POST http://localhost:3001/api/finance/coa \
  -H "Content-Type: application/json" \
  -d '{
    "account_code": "1100-01",
    "account_name": "Kas Bank BCA",
    "account_type": "asset",
    "normal_balance": "debit",
    "parent_account_id": null,
    "is_active": true
  }' | jq '.success'
# Expected: true, status 201

# PUT update account
curl -s -X PUT http://localhost:3001/api/finance/coa \
  -H "Content-Type: application/json" \
  -d '{
    "id": "<account-id>",
    "account_name": "Kas Bank BCA Updated"
  }' | jq '.success'

# DELETE (soft) — requires admin client
curl -s -X DELETE "http://localhost:3001/api/finance/coa?id=<account-id>" \
  | jq '.success'
# Expected: true, row has deleted_at set
```

#### UI Test Scenarios
- [ ] Halaman `/finance/coa` load tanpa error (dark mode)
- [ ] Tabel menampilkan kode, nama, tipe, saldo normal
- [ ] Breadcrumb: Finance > Chart of Accounts
- [ ] Tombol "New Account" buka modal/form
- [ ] Validasi: account_code harus unique
- [ ] Validasi: account_type wajib (asset/liability/equity/revenue/expense)
- [ ] Parent account dropdown (hierarchy)
- [ ] Soft delete → row tetap tampil dengan strikethrough/dim
- [ ] Detail page `/finance/coa/[id]` menampilkan journal history

#### PSAK Compliance Check
- [ ] Kode akun mengikuti struktur numerik standar (1xxx Aset, 2xxx Hutang, etc.)
- [ ] `normal_balance` sesuai dengan tipe akun (Aset=debit, Hutang=credit, etc.)
- [ ] Tidak ada akun dengan kode duplikat
- [ ] Soft delete (deleted_at) mempertahankan historical data

---

### 2. Journal Entries (Jurnal Umum)

#### API Tests
```bash
# GET journal entries
curl -s "http://localhost:3001/api/finance/journal?status=draft" | jq '.data | length'
curl -s "http://localhost:3001/api/finance/journal?status=posted" | jq '.data | length'

# POST create journal (draft)
curl -s -X POST http://localhost:3001/api/finance/journal \
  -H "Content-Type: application/json" \
  -d '{
    "entry_number": "JUR-202605-0001",
    "transaction_date": "2026-05-12",
    "description": "Pembelian perlengkapan kantor",
    "lines": [
      {"coa_id": "<expense-coa-id>", "debit_amount": 2500000, "credit_amount": 0, "line_number": 1},
      {"coa_id": "<asset-coa-id>", "debit_amount": 0, "credit_amount": 2500000, "line_number": 2}
    ]
  }' | jq '.success'
# Expected: true IF debit == credit

# POST fail: imbalance
curl -s -X POST http://localhost:3001/api/finance/journal \
  -H "Content-Type: application/json" \
  -d '{
    "lines": [
      {"coa_id": "<id>", "debit_amount": 1000000, "credit_amount": 0},
      {"coa_id": "<id>", "debit_amount": 0, "credit_amount": 500000}
    ]
  }' | jq '.error'
# Expected: "Journal entry imbalance"

# POST: Post draft → posted
curl -s -X POST "http://localhost:3001/api/finance/journal/post?id=<journal-id>" \
  | jq '.success'
# Expected: true, status changes to posted

# POST: Reverse posted entry
curl -s -X POST "http://localhost:3001/api/finance/journal/reverse?id=<journal-id>" \
  | jq '.success'
# Expected: true, new reversal entry created with negative amounts

# POST: Void draft
curl -s -X POST "http://localhost:3001/api/finance/journal/void?id=<journal-id>" \
  | jq '.success'
# Expected: true only if status == draft
```

#### UI Test Scenarios
- [ ] `/finance/journal` load → tabel dengan kolom: No. Jurnal, Tanggal, Status, Total, Aksi
- [ ] Filter by status (draft/posted/void) berfungsi
- [ ] Tombol "New Journal" → `/finance/journal/new`
- [ ] Form jurnal: auto-generate entry_number
- [ ] Dynamic line items (add/remove rows)
- [ ] Running total debit/credit live calculation
- [ ] Tombol "Post" disabled jika imbalance
- [ ] Tombol "Post" hanya untuk status draft
- [ ] Setelah posted: tombol Edit disabled, tombol Reverse muncul
- [ ] Detail view menampilkan semua journal lines

#### PSAK Compliance Check
- [ ] **Double-entry validation:** Total debit == total credit (tolerance 0.01)
- [ ] **Posted immutability:** Setelah posted, tidak bisa edit/void. Hanya reversal.
- [ ] **Reversal entry:** Membuat entry baru dengan nilai negatif, tidak menghapus original
- [ ] **Fiscal period lock:** Tidak bisa post ke periode yang status != 'open'
- [ ] **Audit trail:** `posted_by`, `posted_at`, `created_by` tercatat

---

### 3. Fiscal Periods (Periode Akuntansi)

#### API Tests
```bash
# GET all periods
curl -s http://localhost:3001/api/finance/periods | jq '.data | length'

# POST create period
curl -s -X POST http://localhost:3001/api/finance/periods \
  -H "Content-Type: application/json" \
  -d '{
    "period_name": "Mei 2026",
    "start_date": "2026-05-01",
    "end_date": "2026-05-31",
    "status": "open"
  }' | jq '.success'

# POST close period
curl -s -X POST "http://localhost:3001/api/finance/periods/close?id=<period-id>" \
  -H "Content-Type: application/json" \
  -d '{"closing_notes": "Closing Mei 2026"}' | jq '.success'
# Expected: true, status → closed

# POST reopen period
curl -s -X POST "http://localhost:3001/api/finance/periods/reopen?id=<period-id>" \
  -H "Content-Type: application/json" \
  -d '{"reopening_reason": "Koreksi pajak"}' | jq '.success'
# Expected: true, status → open, reopening_reason tercatat

# POST validate posting date
curl -s -X POST http://localhost:3001/api/finance/periods/validate \
  -H "Content-Type: application/json" \
  -d '{"transaction_date": "2026-05-15"}' | jq '.valid'
# Expected: true/false with period info
```

#### UI Test Scenarios
- [ ] `/finance/periods` tabel: Nama, Start, End, Status, Aksi
- [ ] Badge status: open (green), soft_close (yellow), closed (red)
- [ ] Tombol "Close Period" muncul hanya untuk open
- [ ] Modal konfirmasi dengan input "closing_notes"
- [ ] Tombol "Reopen" muncul hanya untuk closed
- [ ] Modal reopen meminta "reopening_reason" (wajib)
- [ ] Period yang closed memblokir posting jurnal baru

#### PSAK Compliance Check
- [ ] Closing period memerlukan konfirmasi + notes
- [ ] Reopening memerlukan reason (audit trail)
- [ ] Journal tidak bisa dipost ke periode closed
- [ ] `closed_by`, `closed_at`, `reopening_reason` tercatat

---

### 4. Customer Invoices (AR)

#### API Tests
```bash
# GET invoices
curl -s "http://localhost:3001/api/finance/customer-invoices" | jq '.data | length'

# GET with filters
curl -s "http://localhost:3001/api/finance/customer-invoices?status=sent&customer_id=<id>" | jq '.data | length'

# POST create invoice
curl -s -X POST http://localhost:3001/api/finance/customer-invoices \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "<customer-id>",
    "invoice_number": "INV-202605-0001",
    "invoice_date": "2026-05-12",
    "due_date": "2026-06-12",
    "lines": [
      {"description": "Jasa konsultasi", "quantity": 1, "unit_price": 10000000}
    ]
  }' | jq '.success'

# GET invoice detail
curl -s "http://localhost:3001/api/finance/customer-invoices/<id>" | jq '.data.invoice_number'

# POST record payment
curl -s -X POST "http://localhost:3001/api/finance/customer-invoices/<id>/record-payment" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000000,
    "payment_date": "2026-05-15",
    "payment_method": "transfer",
    "notes": "DP 50%"
  }' | jq '.success'
# Expected: paid_amount updated, balance_due recalculated, status → partial/paid
```

#### UI Test Scenarios
- [ ] `/finance/customer-invoices` tabel load
- [ ] Kolom: No. Invoice, Customer, Tanggal, Jumlah, Paid, Balance, Status
- [ ] Balance due > 0 → text red, Balance == 0 → text green
- [ ] Status: draft/sent/paid/overdue/partial/cancelled
- [ ] Dropdown aksi per row: View, Edit (draft only), Send, Record Payment, Cancel
- [ ] Record Payment dialog: pre-fill balance_due, validasi amount ≤ balance
- [ ] Setelah full payment → status auto jadi "paid"
- [ ] Link ke quotation (jika dari Q2C)

#### PSAK Compliance Check
- [ ] `paid_amount` + `balance_due` (generated column) akurat
- [ ] Status auto-update berdasarkan payment amount
- [ ] Soft delete (cancelled) mempertahankan record
- [ ] `paid_days` terhitung otomatis (invoice_date → paid_at)

---

### 5. Vendor Bills (AP)

#### API Tests
```bash
# GET vendor bills
curl -s "http://localhost:3001/api/finance/vendor-bills" | jq '.data | length'

# POST create
curl -s -X POST http://localhost:3001/api/finance/vendor-bills \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_id": "<vendor-id>",
    "bill_number": "BILL-202605-0001",
    "bill_date": "2026-05-12",
    "due_date": "2026-06-12",
    "lines": [
      {"description": "Pembelian kertas A4", "quantity": 10, "unit_price": 50000}
    ]
  }' | jq '.success'

# POST record payment
curl -s -X POST "http://localhost:3001/api/finance/vendor-bills/<id>/record-payment" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500000,
    "payment_date": "2026-05-15",
    "payment_method": "transfer"
  }' | jq '.success'
```

#### UI Test Scenarios
- [ ] Tabel mirip Customer Invoices (mirror pattern)
- [ ] Balance due coloring (red/green)
- [ ] Status flow: draft → received → paid/overdue/partial
- [ ] Record Payment dialog sama dengan AR

---

### 6. Payments (Outgoing)

#### API Tests
```bash
# GET payments
curl -s "http://localhost:3001/api/finance/payments" | jq '.data | length'

# GET payment detail
curl -s "http://localhost:3001/api/finance/payments/<id>" | jq '.data.payment_number'

# POST create payment
curl -s -X POST http://localhost:3001/api/finance/payments \
  -H "Content-Type: application/json" \
  -d '{
    "payment_number": "PAY-202605-0001",
    "payment_type": "outgoing",
    "amount": 1000000,
    "payment_date": "2026-05-15",
    "payment_method": "transfer",
    "vendor_id": "<vendor-id>"
  }' | jq '.success'
```

#### UI Test Scenarios
- [ ] `/finance/payments` tabel: No., Tipe, Jumlah, Tanggal, Metode, Status
- [ ] Filter by payment_type (incoming/outgoing)
- [ ] Linked invoice/bill column (clickable)
- [ ] Reconciled badge (boolean)

---

### 7. Receipts (Incoming)

#### API Tests
```bash
# GET receipts
curl -s "http://localhost:3001/api/finance/receipts" | jq '.data | length'

# POST create
curl -s -X POST http://localhost:3001/api/finance/receipts \
  -H "Content-Type: application/json" \
  -d '{
    "receipt_number": "RCPT-202605-0001",
    "amount": 2500000,
    "receipt_date": "2026-05-15",
    "customer_id": "<customer-id>"
  }' | jq '.success'

# POST send receipt (email)
curl -s -X POST "http://localhost:3001/api/finance/receipts/<id>/send" \
  | jq '.success'
```

#### UI Test Scenarios
- [ ] `/finance/receipts` tabel load
- [ ] Tombol "Print BKM" → redirect `/finance/receipts/[id]/bkm`
- [ ] BKM page: format standar akuntansi Indonesia
- [ ] Terbilang function: angka → kata-kata Indonesia
- [ ] Signature blocks: Dibuat/Disetujui/Diterima
- [ ] Print CSS: toolbar hidden, paper layout

---

### 8. Financial Reports (P&L, Balance Sheet, Trial Balance, Cash Flow)

#### API Tests
```bash
# GET reports hub
curl -s "http://localhost:3001/api/finance/reports" | jq '.data | length'

# GET Profit & Loss
curl -s "http://localhost:3001/api/finance/reports?type=profit-loss&fiscalPeriodId=<id>" | jq '.revenue'

# GET Balance Sheet
curl -s "http://localhost:3001/api/finance/reports?type=balance-sheet" | jq '.assets.total'

# GET Trial Balance
curl -s "http://localhost:3001/api/finance/reports?type=trial-balance" | jq '.entries | length'
# Expected: Total debit == Total credit

# GET Cash Flow Statement
curl -s "http://localhost:3001/api/finance/reports/cash-flow-statement" | jq '.operating.total'
```

#### UI Test Scenarios
- [ ] `/finance/reports` hub: 4 navigation cards dengan icon
- [ ] `/finance/reports/profit-loss`:
  - Revenue, COGS, Gross Profit, Operating Expenses, Net Income
  - Period filter (fiscal period selector)
  - CSV export
- [ ] `/finance/reports/balance-sheet`:
  - Assets = Liabilities + Equity (balance check banner)
  - Current/Fixed/Non-current breakdown
- [ ] `/finance/reports/trial-balance`:
  - Per account: debit, credit, balance
  - Total debit == Total credit (green check / red warning)
- [ ] `/finance/reports/cash-flow-statement`:
  - Operating, Investing, Financing sections

#### PSAK Compliance Check
- [ ] Trial Balance: Σ debit = Σ credit (exact)
- [ ] Balance Sheet: Assets = Liabilities + Equity
- [ ] P&L: Revenue - Expenses = Net Income
- [ ] All reports hanya menggunakan `journal_entries.status = 'posted'`
- [ ] Fiscal period filter berfungsi dengan benar

---

## 🟡 P1 Module — Testing Plan

### 9. AR Aging
- [ ] `/finance/ar-aging` load
- [ ] Kolom: Customer, Total, Current, 1-30, 31-60, 61-90, >90
- [ ] Per-customer breakdown berdasarkan due_date
- [ ] Summary card: Total AR, Overdue count

### 10. AP Aging
- [ ] Mirror dari AR Aging (vendor-side)
- [ ] Kolom: Vendor, Total, Current, 1-30, 31-60, 61-90, >90

### 11. Cash Register (Kas Besar)
- [ ] `/finance/cash-register` tabel: Tanggal, Tipe, Jumlah, Running Balance
- [ ] Running balance auto-calculate via PostgreSQL trigger
- [ ] Entry types: in/out
- [ ] Summary endpoint `/api/finance/cash-register/summary`

### 12. Petty Cash (Kas Kecil)
- [ ] `/finance/petty-cash` 4 summary cards: Balance, Top-up, Expense, Settlement
- [ ] Custodian management (limit, current balance)
- [ ] Entry types: top_up, expense, settlement, return, adjustment
- [ ] Running balance auto-calculate (trigger)
- [ ] Soft delete → recalculate semua subsequent entries
- [ ] Settlement integration dengan Money Requests

### 13. Money Requests (Pengajuan Dana)
- [ ] `/finance/money-requests` status flow: draft → submitted → pending → approved → paid → closed
- [ ] NIK dropdown dari HC master data
- [ ] Department dropdown
- [ ] Dynamic "Dasar Pengajuan" items (add/remove rows)
- [ ] Total amount auto-calculated
- [ ] Workflow: Approve → Reject → Pay (auto-create cash entry)
- [ ] Auto-generate request number: `MR-YYYYMM-NNNN`

### 14. Payment Vouchers (BKK/BBK)
- [ ] `/finance/payment-vouchers` list
- [ ] Create dengan items (multi-line)
- [ ] Issue action: mark as issued
- [ ] Helper endpoint untuk dropdown data
- [ ] Number generation: `PV-YYYYMM-NNNN`

### 15. Payment Reconciliation
- [ ] `/finance/payment-reconciliation` dual tab: Incoming / Outgoing
- [ ] Tab Incoming: Receipts → match to Customer Invoices
- [ ] Tab Outgoing: Payments → match to Vendor Bills
- [ ] POST reconcile: { type, id, allocations }
- [ ] DELETE unreconcile: hapus allocations + reset flag
- [ ] Allocation tables: `payment_allocations`, `receipt_allocations`

### 16. Bank Reconciliation
- [ ] `/finance/bank-reconciliation` load
- [ ] Import bank statement
- [ ] Match system transactions dengan bank records
- [ ] Mark reconciled/unreconciled

### 17. Budget vs Actual
- [ ] `/finance/budget-vs-actual` summary cards
- [ ] Bar chart: Budget vs Actual per kategori
- [ ] Breakdown table per expense kind
- [ ] Status badge: "Under Budget" (green) / "Over Budget" (red)
- [ ] Rupiah short format di Y-axis (1jt, 1M)

### 18. Expenses
- [ ] `/finance/expenses` tabel: No., Deskripsi, Jumlah, Vendor, Status
- [ ] Summary endpoint `/api/finance/expenses/summary`
- [ ] Auto-generate expense number via trigger: `EXP-YYYYMM-NNNN`
- [ ] CSV export

---

## 🟢 P2 Module — Testing Plan

### 19. Customers
- [ ] `/finance/customers` CRUD tabel
- [ ] Detail `/finance/customers/[id]`
- [ ] Link ke invoice history

### 20. Vendors
- [ ] Mirror dari Customers
- [ ] Detail `/finance/vendors/[id]`
- [ ] Link ke bill history

### 21. Transactions Hub
- [ ] `/finance/transactions` unified view semua transaksi
- [ ] Filter by type (journal, invoice, payment, etc.)
- [ ] Link ke detail masing-masing modul

### 22. Payroll Periods
- [ ] `/finance/payroll-periods` list
- [ ] Create/edit periode penggajian

### 23. Payroll Slips
- [ ] `/finance/payroll-slips` list
- [ ] Generate slip dari periode
- [ ] Download PDF

### 24. BKM (Bukti Kas Masuk)
- [ ] Print page `/finance/receipts/[id]/bkm`
- [ ] Format standar: header, amount, terbilang, signatures
- [ ] Print CSS optimal

---

## 🔐 PSAK Compliance Test Suite

### Double Entry Bookkeeping
| Test # | Scenario | Expected |
|--------|----------|----------|
| PSAK-1 | Create journal dengan debit=100, credit=100 | Success |
| PSAK-2 | Create journal dengan debit=100, credit=90 | Error: "imbalance" |
| PSAK-3 | Post journal → coba edit | Error: "Cannot modify posted" |
| PSAK-4 | Reverse posted journal | New entry created, original intact |
| PSAK-5 | Trial Balance total debit vs credit | Exact match |

### Fiscal Period Controls
| Test # | Scenario | Expected |
|--------|----------|----------|
| PSAK-6 | Post journal ke periode open | Success |
| PSAK-7 | Post journal ke periode closed | Error: "period closed" |
| PSAK-8 | Reopen closed period tanpa reason | Error: "reason required" |
| PSAK-9 | Close period dengan notes | Success, audit trail recorded |

### Data Retention & Audit
| Test # | Scenario | Expected |
|--------|----------|----------|
| PSAK-10 | Soft delete COA | deleted_at set, record retained |
| PSAK-11 | Soft delete invoice | Status cancelled, record retained |
| PSAK-12 | Check created_by, posted_by fields | All populated with user UUID |

### Financial Report Accuracy
| Test # | Scenario | Expected |
|--------|----------|----------|
| PSAK-13 | P&L calculation | Revenue - Expenses = Net Income |
| PSAK-14 | Balance Sheet equation | Assets = Liabilities + Equity |
| PSAK-15 | TB debit/credit equality | Σ debit = Σ credit |
| PSAK-16 | Reports exclude draft journals | Only 'posted' entries included |

---

## 🔄 Regression Checklist

### Pre-Release Regression (run before every deploy)
- [ ] All 24 modules page load tanpa 500 error
- [ ] Dark mode render correct (no white flash)
- [ ] API endpoints return JSON (bukan HTML 404)
- [ ] Authentication: redirect ke login jika token expired
- [ ] RLS: data tenant ter-isolasi (tidak bleed ke tenant lain)
- [ ] Number generation: sequential, tidak duplikat
- [ ] Soft delete: data masih ada, hanya flag berubah
- [ ] Print CSS: BKM dan laporan print dengan baik
- [ ] CSV export: format correct, encoding UTF-8
- [ ] Mobile responsive: tabel bisa di-scroll horizontal

### Post-Migration Regression
- [ ] All Supabase tables exist (no PGRST205)
- [ ] Trigger functions aktif (balance auto-calculate)
- [ ] RLS policies tidak blok anonymous access (admin client bypass)
- [ ] Types generated match schema (`apps/web/src/types/database.ts`)

---

## 🛠️ Testing Tools & Commands

### Quick Health Check Script
```bash
#!/bin/bash
# run-finance-health-check.sh
BASE="http://localhost:3001"

echo "=== Finance Module Health Check ==="
endpoints=(
  "/api/finance/coa"
  "/api/finance/journal"
  "/api/finance/periods"
  "/api/finance/customer-invoices"
  "/api/finance/vendor-bills"
  "/api/finance/payments"
  "/api/finance/receipts"
  "/api/finance/reports?type=profit-loss"
  "/api/finance/reports?type=balance-sheet"
  "/api/finance/reports?type=trial-balance"
)

for ep in "${endpoints[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}${ep}")
  echo "  ${ep}: HTTP ${status}"
done
```

### PSAK Validation Script
```bash
#!/bin/bash
# validate-psak.sh
BASE="http://localhost:3001"

# 1. Check TB balance
echo "=== PSAK Validation ==="
tb=$(curl -s "${BASE}/api/finance/reports?type=trial-balance")
total_debit=$(echo $tb | jq '[.entries[].debit] | add')
total_credit=$(echo $tb | jq '[.entries[].credit] | add')
echo "Trial Balance: Debit=${total_debit} Credit=${total_credit}"
[ "$total_debit" = "$total_credit" ] && echo "✅ Balanced" || echo "❌ IMBALANCED!"

# 2. Check BS equation
bs=$(curl -s "${BASE}/api/finance/reports?type=balance-sheet")
assets=$(echo $bs | jq '.assets.total')
liab=$(echo $bs | jq '.liabilities.total')
equity=$(echo $bs | jq '.equity.total')
echo "Balance Sheet: Assets=${assets} = Liabilities+Equity=$(($liab + $equity))"
[ "$assets" = "$(($liab + $equity))" ] && echo "✅ Balanced" || echo "❌ IMBALANCED!"
```

---

## 📅 Timeline Estimation

| Phase | Duration | Activities |
|-------|----------|------------|
| **Week 1** | 5 days | Setup test environment, seed data, run smoke tests (P0 API health) |
| **Week 2** | 5 days | P0 UI flow testing, PSAK compliance audit, bug fixes |
| **Week 3** | 5 days | P1 module testing, integration tests (Q2C → Invoice, Money Request → Petty Cash) |
| **Week 4** | 5 days | P2 module testing, regression suite, performance check |
| **Week 5-6** | 10 days | Bug fix sprints, re-test, accountant review, documentation |
| **Week 7-8** | 10 days | UAT with real users, final regression, go-live prep |

**Total (Option A):** ~8 minggu  
**Total (Option B):** ~4 minggu  
**Total (Option C):** ~2 minggu

---

## 📁 File Locations

- **Plan ini:** `/home/ubuntu/docs/wsystem-v3/testing/finance-testing-plan-v1.md`
- **Health check script:** `/home/ubuntu/docs/wsystem-v3/testing/scripts/finance-health-check.sh`
- **PSAK validation:** `/home/ubuntu/docs/wsystem-v3/testing/scripts/validate-psak.sh`
- **Seed data:** Refer to `supabase-seed-sample-data` skill

---

*Document generated by Reddie (Analyst Agent) — W.System v3 Testing Division*
