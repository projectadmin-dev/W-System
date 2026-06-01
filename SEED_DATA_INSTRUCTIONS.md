# AR Aging Seed Data Instructions

Panduan untuk menjalankan seed data dummy invoices untuk testing AR Aging analysis.

## Prerequisites

- Akses ke VPS dengan Supabase CLI atau database tools
- Current date considered: 2026-06-01

## Data yang Akan Di-seed

### Clients (4 total)
1. **PT Maju Jaya Sentosa** - Jakarta
2. **PT Sukses Abadi** - Jakarta  
3. **CV Delta Prima** - Surabaya
4. **PT Mitra Sejahtera** - Semarang

### Invoices (10 total) - Distribution by Aging Bucket

| No | Invoice | Client | Due Date | Days Overdue | Amount | Status |
|----|---------|--------|----------|--------------|---------|--------|
| 1 | INV-2026-001 | PT Maju Jaya Sentosa | 2026-01-25 | 128 | Rp 55.5M | Unpaid |
| 2 | INV-2026-002 | PT Sukses Abadi | 2026-02-20 | 102 | Rp 66.6M | Unpaid |
| 3 | INV-2026-003 | PT Maju Jaya Sentosa | 2026-03-20 | 73 | Rp 111M | Partial (Rp 61M outstanding) |
| 4 | INV-2026-004 | CV Delta Prima | 2026-03-30 | 63 | Rp 66.6M | Unpaid |
| 5 | INV-2026-005 | PT Sukses Abadi | 2026-04-15 | 47 | Rp 44.4M | Unpaid |
| 6 | INV-2026-006 | PT Mitra Sejahtera | 2026-04-20 | 42 | Rp 77.7M | Partial (Rp 47.7M outstanding) |
| 7 | INV-2026-007 | PT Maju Jaya Sentosa | 2026-05-25 | 7 | Rp 55.5M | Unpaid |
| 8 | INV-2026-008 | CV Delta Prima | 2026-06-10 | Not Yet Due | Rp 88.8M | Sent |
| 9 | INV-2026-009 | PT Sukses Abadi | 2026-06-15 | Not Yet Due | Rp 83.25M | Sent |
| 10 | INV-2026-010 | PT Mitra Sejahtera | 2026-06-20 | Not Yet Due | Rp 66.6M | Draft |

### AR Aging Distribution

- **>180 hari**: Rp 55.5M (1 invoice)
- **91-180 hari**: Rp 66.6M (1 invoice)
- **61-90 hari**: Rp 127.6M (2 invoices + 1 partial = Rp 178.2M outstanding)
- **31-60 hari**: Rp 122.1M (2 invoices + 1 partial = Rp 169.8M outstanding)
- **1-30 hari**: Rp 55.5M (1 invoice)
- **Current (Not yet due)**: Rp 238.65M (3 invoices)

**Total AR Outstanding**: Rp 785.75M

## How to Run

### Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to project root
cd /path/to/W-System

# Apply migration
supabase migration up

# Or specifically apply the seed migration
supabase db push --file supabase/migrations/20260601000001_seed_ar_aging_data.sql
```

### Option 2: Direct SQL Execution

Connect to your Supabase database and run the SQL from:
```
supabase/migrations/20260601000001_seed_ar_aging_data.sql
```

You can use:
- Supabase Studio (UI at https://app.supabase.com)
- psql command line
- Any SQL client connected to your Supabase Postgres database

### Option 3: Using Hermes Agent Script

If using deployment automation:
```bash
# Push to master first
git checkout master
git pull origin master

# Then run migration
npm run db:migrate
# or
supabase db push
```

## Verification

After running migration, verify data was inserted:

```sql
-- Check clients
SELECT id, code, name FROM public.clients 
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- Check invoices
SELECT invoice_number, client_id, issue_date, due_date, total_amount, status 
FROM public.invoices 
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
ORDER BY issue_date;

-- Check invoice count
SELECT COUNT(*) as total_invoices 
FROM public.invoices 
WHERE tenant_id = '00000000-0000-0000-0000-000000000001';
```

## Testing AR Aging Page

1. Navigate to: `http://your-domain/finance/ar-aging`
2. You should see:
   - **Summary Cards**: 7 cards showing AR breakdown by aging bucket
   - **Customer Table**: 4 customers with their aging summaries
   - **Expandable Rows**: Click on any customer to see their invoices
   - **Invoice Details**: See invoice dates, aging status, and amounts

## Expected Results

### Summary Cards (Total AR: Rp 785.75M)
- Total Piutang: Rp 785.75M
- Current (≤0 hari): Rp 238.65M
- 1-30 hari: Rp 55.5M
- 31-60 hari: Rp 169.8M outstanding
- 61-90 hari: Rp 178.2M outstanding
- 91-180 hari: Rp 66.6M
- >180 hari: Rp 55.5M

### Customer View
Each customer row shows their portion of AR across aging buckets when expanded to show invoices.

## Data Management

### Reset Data (if needed)

To clear the seed data and start fresh:

```sql
DELETE FROM public.invoices 
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
AND invoice_number LIKE 'INV-2026-%';

DELETE FROM public.clients 
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
AND code LIKE 'CLI-%';
```

Then re-run the migration.

### Modify Data

You can edit amounts, dates, or status in the migration file before running, or update directly in the database via Supabase Studio.

## Notes

- All dates assume current date is 2026-06-01
- tenant_id: `00000000-0000-0000-0000-000000000001` (default)
- user_id: `00000000-0000-0000-0000-000000000002` (default creator)
- Currency: IDR (Indonesian Rupiah)
- Tax rate: 11% (standard Indonesia VAT)
- Invoices use various payment terms (15, 20 days)

## Troubleshooting

### "No data showing on AR Aging page"

1. Verify migration ran successfully:
   ```sql
   SELECT COUNT(*) FROM public.invoices 
   WHERE invoice_number LIKE 'INV-2026-%';
   ```

2. Check if invoices have valid client_id references:
   ```sql
   SELECT invoice_number, client_id, clients.name 
   FROM public.invoices 
   LEFT JOIN public.clients ON invoices.client_id = clients.id 
   WHERE invoices.invoice_number LIKE 'INV-2026-%';
   ```

3. Check API logs for errors:
   - Browser console (F12)
   - Server logs: `docker logs [container-name]`

### Invoices showing but no clients

Make sure `clients` records were created:
```sql
SELECT * FROM public.clients 
WHERE id LIKE 'aaaaaaaa-aaaa-aaaa-aaaa%';
```

If missing, ensure the migration creates them with `ON CONFLICT ... DO NOTHING` clauses.

## Contact

For issues with seed data, check:
- PR #43 in the repository
- Migration file: `supabase/migrations/20260601000001_seed_ar_aging_data.sql`
