#!/bin/bash
# Seed 50 sample users ke Supabase database
# Menggunakan SQL langsung via psql

SUPABASE_URL="aws-1-ap-northeast-1.pooler.supabase.com"
SUPABASE_DB="postgres"
SUPABASE_USER="postgres.kcbtehpcdltvdijgsrsb"

# Minta password dari user
echo "Masukkan password untuk database Supabase:"
read -s SUPABASE_PASS
echo ""

# Buat temporary SQL file
TEMP_SQL=$(mktemp)

cat > "$TEMP_SQL" << 'SQLEOF'
-- =====================================================
-- Sample Data: 50 Users untuk Testing User Page
-- =====================================================

-- Get first tenant ID
DO $$
DECLARE
  v_tenant_id uuid;
  v_role_id uuid;
  v_user_id uuid;
  v_email text;
  v_full_name text;
  v_idx integer;
BEGIN
  -- Get first tenant
  SELECT id INTO v_tenant_id FROM public.tenants LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'No tenant found. Please create a tenant first.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Using tenant: %', v_tenant_id;
  
  -- Array of sample users (50 users)
  DECLARE
    users text[][] := ARRAY[
      ['Ahmad Superadmin', 'super_admin', 'IT'],
      ['Budi System', 'super_admin', 'IT'],
      ['Citra Administrator', 'admin', 'IT'],
      ['Dedi Admin', 'admin', 'Operations'],
      ['Eka Admin', 'admin', 'Finance'],
      ['Fani Marketing', 'marketing', 'Marketing'],
      ['Gilang Promo', 'marketing', 'Marketing'],
      ['Hana Campaign', 'marketing', 'Marketing'],
      ['Indra Social', 'marketing', 'Marketing'],
      ['Joko Digital', 'marketing', 'Marketing'],
      ['Kartika Lead', 'marketing_lead', 'Marketing'],
      ['Lukman Senior', 'marketing_lead', 'Marketing'],
      ['Maya Sales', 'commercial', 'Sales'],
      ['Nanda Business', 'commercial', 'Sales'],
      ['Oki Account', 'commercial', 'Sales'],
      ['Putri Client', 'commercial', 'Sales'],
      ['Qori Relation', 'commercial', 'Sales'],
      ['Rudi Director', 'commercial_director', 'Sales'],
      ['Siti Executive', 'commercial_director', 'Sales'],
      ['Tono Manager', 'pm', 'Project'],
      ['Umi Coordinator', 'pm', 'Project'],
      ['Vicky Scrum', 'pm', 'Project'],
      ['Wawan Agile', 'pm', 'Project'],
      ['Xena Delivery', 'pm', 'Project'],
      ['Yanto Senior', 'pm_lead', 'Project'],
      ['Zahra Head', 'pm_lead', 'Project'],
      ['Andi Backend', 'developer', 'Engineering'],
      ['Bella Frontend', 'developer', 'Engineering'],
      ['Cahyo Fullstack', 'developer', 'Engineering'],
      ['Dewi Mobile', 'developer', 'Engineering'],
      ['Edi DevOps', 'developer', 'Engineering'],
      ['Fitri QA', 'developer', 'Engineering'],
      ['Galih UI', 'developer', 'Engineering'],
      ['Hendra System', 'developer', 'Engineering'],
      ['Ika Software', 'developer', 'Engineering'],
      ['Jaya Code', 'developer', 'Engineering'],
      ['Kiki Accountant', 'finance', 'Finance'],
      ['Lina Tax', 'finance', 'Finance'],
      ['Mamat Billing', 'finance', 'Finance'],
      ['Nia Payroll', 'finance', 'Finance'],
      ['Opung Budget', 'finance', 'Finance'],
      ['Arie Anggono', 'cfo', 'Finance'],
      ['Ganjar HR', 'hr', 'Human Resources'],
      ['Ratna Recruiter', 'hr', 'Human Resources'],
      ['Sari People', 'hr', 'Human Resources'],
      ['Project Admin', 'ceo', 'Executive'],
      ['Client Alpha', 'client', 'External'],
      ['Client Beta', 'client', 'External'],
      ['Client Gamma', 'client', 'External'],
      ['Client Delta', 'client', 'External']
    ];
  BEGIN
    FOR v_idx IN 1..array_length(users, 1) LOOP
      v_full_name := users[v_idx][1];
      v_email := lower(regexp_replace(users[v_idx][1], '\s+', '.', 'g')) || v_idx || '@wit.id';
      
      -- Get role_id
      SELECT id INTO v_role_id FROM public.roles WHERE name = users[v_idx][2] LIMIT 1;
      
      IF v_role_id IS NULL THEN
        RAISE NOTICE 'Role % not found, skipping %', users[v_idx][2], v_full_name;
        CONTINUE;
      END IF;
      
      -- Generate UUID for user
      v_user_id := gen_random_uuid();
      
      -- Insert into auth.users (using Supabase auth function)
      BEGIN
        -- Try to insert via auth.users - this may fail depending on RLS
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, role)
        VALUES (
          v_user_id,
          v_email,
          crypt('Password123!', gen_salt('bf')),
          now(),
          jsonb_build_object('full_name', v_full_name),
          now(),
          now(),
          'authenticated'
        );
        
        -- Insert into user_profiles
        INSERT INTO public.user_profiles (
          id, tenant_id, full_name, email, role_id, department, phone, timezone, language, is_active
        ) VALUES (
          v_user_id,
          v_tenant_id,
          v_full_name,
          v_email,
          v_role_id,
          users[v_idx][3],
          '+62 812-' || LPAD((v_idx * 1000)::text, 4, '0') || '-' || LPAD((v_idx * 7)::text, 4, '0'),
          'Asia/Jakarta',
          'id',
          true
        );
        
        RAISE NOTICE 'Created user %: % (% as %)', v_idx, v_full_name, v_email, users[v_idx][2];
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create user %: % - %', v_idx, v_full_name, SQLERRM;
      END;
    END LOOP;
  END;
END $$;

-- Show summary
SELECT 
  r.name as role,
  COUNT(up.id) as user_count
FROM public.user_profiles up
JOIN public.roles r ON up.role_id = r.id
GROUP BY r.name
ORDER BY r.name;
SQLEOF

echo "Running SQL script..."
PGPASSWORD="$SUPABASE_PASS" psql -h "$SUPABASE_URL" -U "$SUPABASE_USER" -d "$SUPABASE_DB" -f "$TEMP_SQL"

# Cleanup
rm -f "$TEMP_SQL"

echo ""
echo "Done! Default password for all users: Password123!"
