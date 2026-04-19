# Supabase Migrations - W-System FASE-0

## Migration Files (Run in Order)

```
supabase/migrations/
├── 20260418_001_create_core_tenants.sql    # Tenants table + RLS
├── 20260418_002_create_core_entities.sql   # Entities table + RLS
├── 20260418_003_create_core_branches.sql   # Branches table + RLS
├── 20260418_004_create_core_regions.sql    # Regions table + RLS + seed data
└── README.md
```

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Open https://kcbtehpcdltvdijgsrsb.supabase.co
2. Go to **SQL Editor**
3. Run each file in order (001 → 002 → 003 → 004)
4. Copy paste content → Click **Run**

### Option 2: psql (Direct connection)
```bash
psql "postgresql://postgres:[PASSWORD]@db.kcbtehpcdltvdijgsrsb.supabase.co:5432/postgres" \
  -f supabase/migrations/20260418_001_create_core_tenants.sql

psql "postgresql://postgres:[PASSWORD]@db.kcbtehpcdltvdijgsrsb.supabase.co:5432/postgres" \
  -f supabase/migrations/20260418_002_create_core_entities.sql

psql "postgresql://postgres:[PASSWORD]@db.kcbtehpcdltvdijgsrsb.supabase.co:5432/postgres" \
  -f supabase/migrations/20260418_003_create_core_branches.sql

psql "postgresql://postgres:[PASSWORD]@db.kcbtehpcdltvdijgsrsb.supabase.co:5432/postgres" \
  -f supabase/migrations/20260418_004_create_core_regions.sql
```

## Verification Queries

After running all migrations:

```sql
-- Verify all 4 tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('tenants', 'entities', 'branches', 'regions')
ORDER BY table_name;
-- Should return 4 rows

-- Check regions seed data
SELECT type, COUNT(*) as count FROM regions GROUP BY type ORDER BY type;
-- Should return: country=1, province=10, city=14

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('tenants', 'entities', 'branches', 'regions');
-- Should show rowsecurity=true for all
```

## Schema Summary

### tenants
- Multi-tenant SaaS foundation
- Columns: `id`, `name`, `slug`, `legal_name`, `tax_id`, `status`, `plan`, `settings`
- RLS: Users can view tenants they belong to (via `user_profiles`)

### entities
- Business entities (holding, subsidiary, division, department)
- Columns: `id`, `tenant_id`, `name`, `code`, `type`, `parent_id`, `status`, `settings`
- Hierarchy: `parent_id` self-reference
- RLS: Users can view entities in their tenant

### branches
- Physical office locations
- Columns: `id`, `tenant_id`, `entity_id`, `name`, `code`, `address`, `city_id`, `province`, `is_headquarters`, `status`
- RLS: Users can view branches in their tenant

### regions
- Geographic reference (Indonesia hierarchy)
- Columns: `id`, `parent_id`, `type`, `name`, `code`, `metadata`
- Types: `country` → `province` → `city`
- RLS: Read-only for all authenticated users
- **Seed data included**: 1 country, 10 provinces, 14 cities

## Next Steps

✅ After FASE-0 is verified:
1. Run verification queries above
2. Proceed to **FASE-4.0 HC Master Data** (11 tables)
3. Generate TypeScript types: `supabase gen types typescript --local`

## Important Notes

1. **FASE-0 is REQUIRED before FASE-4.0** - All HC tables reference these foundation tables
2. **RLS uses `user_profiles` table** - Make sure auth module is deployed first
3. **Regions seed data** is included in `004_create_core_regions.sql`
4. **Demo data**: You may need to create a tenant manually for testing
