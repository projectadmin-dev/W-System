-- Core Transactions Schema
-- PSAK 13: Work in Progress Inventory
-- PSAK 23: Revenue from Contracts with Customers

-- ============================================
-- VENDOR TRANSACTIONS (Accounts Payable)
-- ============================================

-- Vendors/Suppliers master data
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  vendor_code VARCHAR(50) NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  vendor_type VARCHAR(50) DEFAULT 'supplier', -- supplier, contractor, service
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  tax_id VARCHAR(50), -- NPWP
  payment_terms_days INTEGER DEFAULT 30,
  currency VARCHAR(3) DEFAULT 'IDR',
  coa_id UUID REFERENCES coa(id), -- AP account for this vendor
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, vendor_code)
);

-- Bills/Invoices from vendors (Accounts Payable)
CREATE TABLE IF NOT EXISTS vendor_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  bill_number VARCHAR(50) NOT NULL,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,
  currency VARCHAR(3) DEFAULT 'IDR',
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  discount_amount NUMERIC(18,2) DEFAULT 0,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(18,2) DEFAULT 0,
  amount_due NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) DEFAULT 'draft', -- draft, pending_approval, approved, posted, paid, cancelled
  journal_entry_id UUID REFERENCES journal_entries(id),
  description TEXT,
  attachment_url TEXT,
  posted_by UUID REFERENCES user_profiles(id),
  posted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, bill_number)
);

-- Vendor bill line items
CREATE TABLE IF NOT EXISTS vendor_bill_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES vendor_bills(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  coa_id UUID NOT NULL REFERENCES coa(id),
  description TEXT,
  quantity NUMERIC(12,2) DEFAULT 1,
  unit_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bill_id, line_number)
);

-- ============================================
-- CUSTOMER TRANSACTIONS (Accounts Receivable)
-- ============================================

-- Customers master data
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_code VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_type VARCHAR(50) DEFAULT 'individual', -- individual, corporate
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  tax_id VARCHAR(50), -- NPWP
  payment_terms_days INTEGER DEFAULT 30,
  credit_limit NUMERIC(18,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'IDR',
  coa_id UUID REFERENCES coa(id), -- AR account for this customer
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, customer_code)
);

-- Customer invoices (Accounts Receivable)
CREATE TABLE IF NOT EXISTS customer_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_number VARCHAR(50) NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  currency VARCHAR(3) DEFAULT 'IDR',
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  discount_amount NUMERIC(18,2) DEFAULT 0,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(18,2) DEFAULT 0,
  amount_due NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) DEFAULT 'draft', -- draft, pending_approval, approved, posted, paid, cancelled, overdue
  journal_entry_id UUID REFERENCES journal_entries(id),
  description TEXT,
  attachment_url TEXT,
  posted_by UUID REFERENCES user_profiles(id),
  posted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, invoice_number)
);

-- Customer invoice line items
CREATE TABLE IF NOT EXISTS customer_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES customer_invoices(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  coa_id UUID NOT NULL REFERENCES coa(id),
  description TEXT,
  quantity NUMERIC(12,2) DEFAULT 1,
  unit_price NUMERIC(18,2) NOT NULL DEFAULT 0,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(invoice_id, line_number)
);

-- ============================================
-- PAYMENTS & RECEIPTS
-- ============================================

-- Payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  method_name VARCHAR(50) NOT NULL, -- cash, bank_transfer, credit_card, debit_card, cheque
  method_code VARCHAR(20) NOT NULL,
  coa_id UUID REFERENCES coa(id), -- Cash/Bank account
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, method_code)
);

-- Payments (to vendors)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  payment_number VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL,
  vendor_id UUID REFERENCES vendors(id),
  payment_method_id UUID REFERENCES payment_methods(id),
  reference_number VARCHAR(100), -- Bank reference, cheque number
  currency VARCHAR(3) DEFAULT 'IDR',
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) DEFAULT 'draft', -- draft, approved, posted, cancelled
  journal_entry_id UUID REFERENCES journal_entries(id),
  notes TEXT,
  attachment_url TEXT,
  posted_by UUID REFERENCES user_profiles(id),
  posted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, payment_number)
);

-- Payment allocations (linking payments to vendor bills)
CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES vendor_bills(id),
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payment_id, bill_id)
);

-- Receipts (from customers)
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  receipt_number VARCHAR(50) NOT NULL,
  receipt_date DATE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  payment_method_id UUID REFERENCES payment_methods(id),
  reference_number VARCHAR(100), -- Bank reference, cheque number
  currency VARCHAR(3) DEFAULT 'IDR',
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) DEFAULT 'draft', -- draft, approved, posted, cancelled
  journal_entry_id UUID REFERENCES journal_entries(id),
  notes TEXT,
  attachment_url TEXT,
  posted_by UUID REFERENCES user_profiles(id),
  posted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, receipt_number)
);

-- Receipt allocations (linking receipts to customer invoices)
CREATE TABLE IF NOT EXISTS receipt_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES customer_invoices(id),
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(receipt_id, invoice_id)
);

-- ============================================
-- BANK ACCOUNTS
-- ============================================

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  currency VARCHAR(3) DEFAULT 'IDR',
  coa_id UUID REFERENCES coa(id),
  opening_balance NUMERIC(18,2) DEFAULT 0,
  current_balance NUMERIC(18,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, account_number)
);

-- Bank transactions (for reconciliation)
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
  transaction_date DATE NOT NULL,
  description TEXT,
  reference VARCHAR(100),
  debit_amount NUMERIC(18,2) DEFAULT 0,
  credit_amount NUMERIC(18,2) DEFAULT 0,
  balance_after NUMERIC(18,2),
  transaction_type VARCHAR(50), -- deposit, withdrawal, transfer, fee, interest
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES user_profiles(id),
  journal_entry_id UUID REFERENCES journal_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, bank_account_id, transaction_date, reference)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_code ON vendors(tenant_id, vendor_code);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_tenant ON vendor_bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_vendor ON vendor_bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_status ON vendor_bills(status);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_due_date ON vendor_bills(due_date);
CREATE INDEX IF NOT EXISTS idx_vendor_bill_lines_bill ON vendor_bill_lines(bill_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(tenant_id, customer_code);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_tenant ON customer_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_customer ON customer_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_status ON customer_invoices(status);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_due_date ON customer_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_customer_invoice_lines_invoice ON customer_invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_vendor ON payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_bill ON payment_allocations(bill_id);
CREATE INDEX IF NOT EXISTS idx_receipts_tenant ON receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receipts_customer ON receipts(customer_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipt_allocations_receipt ON receipt_allocations(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_allocations_invoice ON receipt_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant ON bank_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_reconciled ON bank_transactions(is_reconciled);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE vendors IS 'Master data for vendors/suppliers (PSAK 13)';
COMMENT ON TABLE vendor_bills IS 'Accounts Payable - Bills from vendors';
COMMENT ON TABLE customers IS 'Master data for customers (PSAK 23)';
COMMENT ON TABLE customer_invoices IS 'Accounts Receivable - Invoices to customers';
COMMENT ON TABLE payments IS 'Cash outflows to vendors';
COMMENT ON TABLE receipts IS 'Cash inflows from customers';
COMMENT ON TABLE bank_accounts IS 'Bank account master data for reconciliation';
COMMENT ON TABLE bank_transactions IS 'Bank statement transactions for reconciliation';
