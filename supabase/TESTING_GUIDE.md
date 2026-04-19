# 🚀 W.SYSTEM FASE-1: Q2C MVP - TESTING GUIDE

**Generated:** 2026-04-19 00:30 WIB  
**Status:** ✅ READY FOR TESTING  
**Total Tables:** 42 tables across 7 modules  

---

## 📦 DEPLOYMENT OPTIONS

### Option 1: Supabase Dashboard (RECOMMENDED FOR TESTING)

1. **Login:** https://kcbtehpcdltvdijgsrsb.supabase.co
2. **Go to:** SQL Editor
3. **Run combined file:** Copy content from `FASE1_COMPLETE.sql` (164 KB)
4. **Click Run** - Wait ~30 seconds for all migrations

### Option 2: psql (Production Deployment)

```bash
# Get connection string from Supabase Dashboard → Settings → Database
psql "postgresql://postgres:[PASSWORD]@db.kcbtehpcdltvdijgsrsb.supabase.co:5432/postgres" \
  -f /home/ubuntu/apps/wsystem-1/supabase/FASE1_COMPLETE.sql
```

### Option 3: Individual Migrations (For Debugging)

Run in order (001 → 012):
```bash
psql "connection_string" -f supabase/migrations/20260418_001_create_core_tenants.sql
psql "connection_string" -f supabase/migrations/20260418_002_create_core_entities.sql
# ... continue through 012
```

---

## ✅ VERIFICATION CHECKLIST

After deployment, run these queries to verify:

### 1. Check All Tables Exist (42 tables)

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name NOT LIKE 'auth%'
  AND table_name NOT LIKE 'storage%'
ORDER BY table_name;
```

**Expected:** 42 rows (see table list below)

### 2. Check RLS is Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'tenants', 'entities', 'branches', 'regions',
    'roles', 'user_profiles',
    'clients', 'contacts',
    'leads', 'lead_activities', 'scoring_rules', 'sla_configs',
    'project_briefs', 'quotations', 'approval_rules',
    'coa', 'invoices', 'payments',
    'tickets', 'ticket_tasks', 'ticket_time_logs', 'ticket_comments',
    'priority_rules', 'billing_rules'
  )
ORDER BY tablename;
```

**Expected:** `rowsecurity=true` for ALL tables

### 3. Check Seed Data

```sql
-- Regions (Indonesia geography)
SELECT type, COUNT(*) FROM regions GROUP BY type;
-- Expected: country=1, province=10, city=14

-- Scoring Rules (CRM)
SELECT component, weight FROM scoring_rules LIMIT 5;
-- Expected: budget_disclosed=25, authority_level=25, need_definition=20, timeline=15, engagement_score=15

-- Approval Rules (Sales)
SELECT margin_min, margin_max, approver_role, sla_days FROM approval_rules;
-- Expected: 4 rows (PM, Commercial Director, CEO, CEO+CFO)

-- Priority Rules (Ticket)
SELECT client_tier, priority_result, sla_response_hours, sla_resolution_hours 
FROM priority_rules LIMIT 5;
```

### 4. Check Functions Created

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

**Expected:** 7 functions
- `calculate_lead_score()`
- `get_approval_tier()`
- `check_client_credit()`
- `update_invoice_payment()`
- `calculate_sla_deadline()`
- `update_updated_at_column()` (trigger function)

---

## 🧪 TESTING SCENARIOS PER DEPARTMENT

### 📢 MARKETING TEAM

**Test Case 1: Create Lead with Auto-Scoring**
```sql
-- Insert test lead
INSERT INTO leads (tenant_id, name, contact_email, source, budget_disclosed, authority_level, need_definition, timeline, engagement_score)
VALUES ('YOUR_TENANT_ID', 'Test Lead', 'test@example.com', 'referral', 'exact', 'c_level', 18, 'within_3mo', 12);

-- Check auto-calculated score (should be ~85-95)
SELECT id, name, total_score, stage FROM leads ORDER BY created_at DESC LIMIT 1;
```

**Test Case 2: Lead SLA Tracking**
```sql
-- Check SLA deadline auto-calculation
SELECT id, stage, stage_entered_at, sla_deadline_at, sla_breached 
FROM leads 
WHERE stage = 'cold';
```

**Test Case 3: Lead Activity Log**
```sql
-- Log activity
INSERT INTO lead_activities (tenant_id, lead_id, activity_type, subject, performed_by)
VALUES ('TENANT_ID', 'LEAD_ID', 'call', 'Initial discovery call', 'USER_ID');

-- Verify activity trail
SELECT * FROM lead_activities WHERE lead_id = 'LEAD_ID' ORDER BY recorded_at DESC;
```

---

### 💼 COMMERCIAL TEAM

**Test Case 1: Create Project Brief**
```sql
-- Create brief with high margin (>30% - routes to PM)
INSERT INTO project_briefs (tenant_id, client_id, title, executive_summary, scope_of_work, estimated_revenue, estimated_cost, commercial_pic_id)
VALUES ('TENANT_ID', 'CLIENT_ID', 'Test Project', 'Summary here', 'SOW details', 100000000, 60000000, 'USER_ID');

-- Check auto-calculated margin
SELECT id, title, estimated_revenue, estimated_cost, estimated_margin, estimated_margin_pct, status, approval_tier 
FROM project_briefs ORDER BY created_at DESC LIMIT 1;
-- Expected: margin_pct=40%, approval_tier='pm'
```

**Test Case 2: Approval Workflow**
```sql
-- Check approval tier for different margins
SELECT 
  estimated_margin_pct,
  public.get_approval_tier(estimated_margin_pct, tenant_id) as approver
FROM project_briefs;
```

**Test Case 3: Create Quotation**
```sql
-- After brief approved, create quotation
INSERT INTO quotations (tenant_id, brief_id, client_id, quotation_number, title, line_items, subtotal, total_amount)
VALUES ('TENANT_ID', 'BRIEF_ID', 'CLIENT_ID', 'QTN-2026-04-0001-v1.0', 'Test Quotation', 
  '[{"description":"Development","quantity":1,"unit_price":100000000,"total":100000000}]'::jsonb,
  100000000, 111000000);

-- Check auto-calculated tax
SELECT quotation_number, subtotal, tax_rate, tax_amount, total_amount FROM quotations;
```

---

### 💰 FINANCE TEAM (CFO - Arie)

**Test Case 1: Chart of Accounts**
```sql
-- View COA structure
SELECT account_code, account_name, account_type, level 
FROM coa 
WHERE tenant_id = 'TENANT_ID'
ORDER BY account_code;
```

**Test Case 2: Create Invoice**
```sql
-- Create invoice from accepted quotation
INSERT INTO invoices (tenant_id, client_id, invoice_number, issue_date, due_date, line_items, subtotal, tax_rate, total_amount, issued_by)
VALUES ('TENANT_ID', 'CLIENT_ID', 'INV-2026-04-0001', CURRENT_DATE, CURRENT_DATE + 30, 
  '[{"description":"Project Payment","quantity":1,"unit_price":100000000,"total":100000000}]'::jsonb,
  100000000, 11, 111000000, 'USER_ID');

-- Check auto-calculated aging
SELECT invoice_number, issue_date, due_date, total_amount, amount_due, aging_days, status 
FROM invoices;
```

**Test Case 3: Record Payment**
```sql
-- Record payment
INSERT INTO payments (tenant_id, invoice_id, client_id, payment_number, payment_method, amount, received_by)
VALUES ('TENANT_ID', 'INVOICE_ID', 'CLIENT_ID', 'PMT-2026-04-0001', 'bank_transfer', 111000000, 'USER_ID');

-- Verify invoice auto-updated
SELECT invoice_number, amount_paid, amount_due, status, last_payment_at 
FROM invoices WHERE id = 'INVOICE_ID';
-- Expected: amount_paid=111000000, amount_due=0, status='paid'
```

**Test Case 4: Credit Check (BLOCKER)**
```sql
-- Test credit check function
SELECT * FROM public.check_client_credit('CLIENT_ID');
-- Expected: status='passed' or 'failed' based on AR aging
```

---

### 🔧 OPERATIONAL / PM TEAM

**Test Case 1: Create Ticket**
```sql
-- Create support ticket
INSERT INTO tickets (tenant_id, client_id, ticket_number, channel, subject, description, category, impact, urgency)
VALUES ('TENANT_ID', 'CLIENT_ID', 'TKT-2026-04-0001', 'portal', 'Bug Report', 'Description here', 'bug', 'high', 'high');

-- Check auto-calculated priority & SLA
SELECT ticket_number, priority, response_sla_deadline, resolution_sla_deadline 
FROM tickets ORDER BY created_at DESC LIMIT 1;
```

**Test Case 2: Time Logging**
```sql
-- Log work time
INSERT INTO ticket_time_logs (tenant_id, ticket_id, started_at, ended_at, duration_minutes, activity_type, user_id)
VALUES ('TENANT_ID', 'TICKET_ID', NOW() - INTERVAL '2 hours', NOW(), 120, 'development', 'USER_ID');

-- Check total hours on ticket
SELECT t.ticket_number, SUM(tl.duration_minutes)/60.0 as total_hours
FROM tickets t
JOIN ticket_time_logs tl ON t.id = tl.ticket_id
WHERE t.id = 'TICKET_ID'
GROUP BY t.ticket_number;
```

**Test Case 3: SLA Breach Detection**
```sql
-- Find tickets at risk of SLA breach
SELECT ticket_number, priority, status, response_sla_deadline, 
  EXTRACT(EPOCH FROM (response_sla_deadline - NOW()))/3600 as hours_remaining
FROM tickets
WHERE sla_breached = false 
  AND sla_paused = false
  AND response_sla_deadline < NOW() + INTERVAL '24 hours'
ORDER BY response_sla_deadline;
```

---

## 📊 MODULE CORRELATION MAP

```
┌─────────────┐
│  MARKETING  │
│   (Leads)   │
└──────┬──────┘
       │ stage='deal'
       ↓
┌─────────────┐
│  COMMERCIAL │
│ (Briefs→QTN)│
└──────┬──────┘
       │ approved
       ↓
┌─────────────┐
│   FINANCE   │
│(INV→Payment)│
└──────┬──────┘
       │ paid
       ↓
┌─────────────┐
│ OPERATIONAL │
│  (Tickets)  │
└─────────────┘
```

---

## ⚠️ KNOWN LIMITATIONS

1. **HC Module NOT included** - Separate deployment (Ganjar's team)
2. **Projects table NOT included** - Coming in FASE-2
3. **Client portal auth** - Requires additional JWT setup
4. **Webhooks** - Not configured yet (coming in FASE-2)

---

## 🆘 TROUBLESHOOTING

### Error: "relation already exists"
```sql
-- Drop all tables and re-run (DEVELOPMENT ONLY!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Then re-run FASE1_COMPLETE.sql
```

### Error: "permission denied"
- Ensure you're using `postgres` role or `service_role` key
- RLS policies may block - test with `service_role` key first

### Error: "function does not exist"
- Functions are created AFTER tables - ensure migrations run in order
- Check `pg_proc` for function existence

---

## 📞 CONTACT

**Technical Issues:** Reddie (AI Agent)  
**Business Logic:** Arie Anggono (CFO)  
**HC Module:** Ganjar (HC Director) - hrd@wit.id

---

**Last Updated:** 2026-04-19 00:30 WIB  
**Next Deployment:** FASE-2 (Projects, Change Orders, Reviews)
