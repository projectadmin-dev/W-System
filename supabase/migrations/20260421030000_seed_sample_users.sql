-- =====================================================
-- Sample Data: 50 Users untuk Testing User Page
-- =====================================================
-- Run di Supabase Dashboard → SQL Editor
-- =====================================================

-- Helper function untuk generate random email
CREATE OR REPLACE FUNCTION generate_sample_user(
  p_idx integer,
  p_role text,
  p_department text,
  p_full_name text
) RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_password text := 'Password123!';
BEGIN
  -- Generate email
  v_email := lower(regexp_replace(p_full_name, '\s+', '.', 'g')) || p_idx || '@wit.id';
  
  -- Insert ke auth.users (Supabase Auth)
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    role
  ) VALUES (
    gen_random_uuid(),
    v_email,
    crypt(v_password, gen_salt('bf')),
    now(),
    jsonb_build_object('full_name', p_full_name),
    now(),
    now(),
    'authenticated'
  ) RETURNING id INTO v_user_id;
  
  -- Insert ke user_profiles
  INSERT INTO public.user_profiles (
    id,
    tenant_id,
    entity_id,
    full_name,
    email,
    role_id,
    department,
    phone,
    timezone,
    language,
    is_active
  ) VALUES (
    v_user_id,
    (SELECT id FROM public.tenants LIMIT 1), -- Get first tenant
    NULL,
    p_full_name,
    v_email,
    (SELECT id FROM public.roles WHERE name = p_role LIMIT 1),
    p_department,
    '+62 812-' || LPAD((p_idx * 1000)::text, 4, '0') || '-' || LPAD((p_idx * 7)::text, 4, '0'),
    'Asia/Jakarta',
    'id',
    true
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Generate 50 Sample Users dengan berbagai role
-- =====================================================

-- Super Admin (2 users)
SELECT generate_sample_user(1, 'super_admin', 'IT', 'Ahmad Superadmin');
SELECT generate_sample_user(2, 'super_admin', 'IT', 'Budi System');

-- Admin (3 users)
SELECT generate_sample_user(3, 'admin', 'IT', 'Citra Administrator');
SELECT generate_sample_user(4, 'admin', 'Operations', 'Dedi Admin');
SELECT generate_sample_user(5, 'admin', 'Finance', 'Eka Admin');

-- Marketing (5 users)
SELECT generate_sample_user(6, 'marketing', 'Marketing', 'Fani Marketing');
SELECT generate_sample_user(7, 'marketing', 'Marketing', 'Gilang Promo');
SELECT generate_sample_user(8, 'marketing', 'Marketing', 'Hana Campaign');
SELECT generate_sample_user(9, 'marketing', 'Marketing', 'Indra Social');
SELECT generate_sample_user(10, 'marketing', 'Marketing', 'Joko Digital');

-- Marketing Lead (2 users)
SELECT generate_sample_user(11, 'marketing_lead', 'Marketing', 'Kartika Lead');
SELECT generate_sample_user(12, 'marketing_lead', 'Marketing', 'Lukman Senior');

-- Commercial (5 users)
SELECT generate_sample_user(13, 'commercial', 'Sales', 'Maya Sales');
SELECT generate_sample_user(14, 'commercial', 'Sales', 'Nanda Business');
SELECT generate_sample_user(15, 'commercial', 'Sales', 'Oki Account');
SELECT generate_sample_user(16, 'commercial', 'Sales', 'Putri Client');
SELECT generate_sample_user(17, 'commercial', 'Sales', 'Qori Relation');

-- Commercial Director (2 users)
SELECT generate_sample_user(18, 'commercial_director', 'Sales', 'Rudi Director');
SELECT generate_sample_user(19, 'commercial_director', 'Sales', 'Siti Executive');

-- Project Manager (5 users)
SELECT generate_sample_user(20, 'pm', 'Project', 'Tono Manager');
SELECT generate_sample_user(21, 'pm', 'Project', 'Umi Coordinator');
SELECT generate_sample_user(22, 'pm', 'Project', 'Vicky Scrum');
SELECT generate_sample_user(23, 'pm', 'Project', 'Wawan Agile');
SELECT generate_sample_user(24, 'pm', 'Project', 'Xena Delivery');

-- PM Lead (2 users)
SELECT generate_sample_user(25, 'pm_lead', 'Project', 'Yanto Senior');
SELECT generate_sample_user(26, 'pm_lead', 'Project', 'Zahra Head');

-- Developer (10 users)
SELECT generate_sample_user(27, 'developer', 'Engineering', 'Andi Backend');
SELECT generate_sample_user(28, 'developer', 'Engineering', 'Bella Frontend');
SELECT generate_sample_user(29, 'developer', 'Engineering', 'Cahyo Fullstack');
SELECT generate_sample_user(30, 'developer', 'Engineering', 'Dewi Mobile');
SELECT generate_sample_user(31, 'developer', 'Engineering', 'Edi DevOps');
SELECT generate_sample_user(32, 'developer', 'Engineering', 'Fitri QA');
SELECT generate_sample_user(33, 'developer', 'Engineering', 'Galih UI');
SELECT generate_sample_user(34, 'developer', 'Engineering', 'Hendra System');
SELECT generate_sample_user(35, 'developer', 'Engineering', 'Ika Software');
SELECT generate_sample_user(36, 'developer', 'Engineering', 'Jaya Code');

-- Finance (5 users)
SELECT generate_sample_user(37, 'finance', 'Finance', 'Kiki Accountant');
SELECT generate_sample_user(38, 'finance', 'Finance', 'Lina Tax');
SELECT generate_sample_user(39, 'finance', 'Finance', 'Mamat Billing');
SELECT generate_sample_user(40, 'finance', 'Finance', 'Nia Payroll');
SELECT generate_sample_user(41, 'finance', 'Finance', 'Opung Budget');

-- CFO (1 user)
SELECT generate_sample_user(42, 'cfo', 'Finance', 'Arie Anggono');

-- HR (3 users)
SELECT generate_sample_user(43, 'hr', 'Human Resources', 'Ganjar HR');
SELECT generate_sample_user(44, 'hr', 'Human Resources', 'Ratna Recruiter');
SELECT generate_sample_user(45, 'hr', 'Human Resources', 'Sari People');

-- CEO (1 user)
SELECT generate_sample_user(46, 'ceo', 'Executive', 'Project Admin');

-- Client (4 users)
SELECT generate_sample_user(47, 'client', 'External', 'Client Alpha');
SELECT generate_sample_user(48, 'client', 'External', 'Client Beta');
SELECT generate_sample_user(49, 'client', 'External', 'Client Gamma');
SELECT generate_sample_user(50, 'client', 'External', 'Client Delta');

-- =====================================================
-- Cleanup: Drop helper function
-- =====================================================
DROP FUNCTION IF EXISTS generate_sample_user(integer, text, text, text);

-- =====================================================
-- Verification: Show created users
-- =====================================================
SELECT 
  up.full_name,
  up.email,
  r.name as role,
  up.department,
  up.is_active
FROM public.user_profiles up
JOIN public.roles r ON up.role_id = r.id
ORDER BY r.name, up.full_name;

-- =====================================================
-- Default Password untuk semua user: Password123!
-- =====================================================
