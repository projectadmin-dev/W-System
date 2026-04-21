-- =====================================================
-- Fix: Disable RLS temporarily on user_profiles for testing
-- =====================================================
-- This allows all authenticated users to read user_profiles
-- without recursion issues. Re-enable with proper policies later.
-- =====================================================

-- Disable RLS temporarily
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Also disable on roles table for joins
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT 
  relname as table_name,
  relrowsecurity as rls_enabled,
  relforcerowsecurity as rls_forced
FROM pg_class
WHERE relname IN ('user_profiles', 'roles');

-- Grant permissions to authenticated users
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.roles TO authenticated;
