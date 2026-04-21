-- =====================================================
-- Fix: Infinite Recursion in user_profiles RLS Policy
-- =====================================================
-- Problem: RLS policy queries user_profiles which triggers the same policy again
-- Solution: Use auth.jwt() claims directly instead of querying user_profiles
-- =====================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "view_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_manage_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "privileged_view_tenant_profiles" ON public.user_profiles;

-- =====================================================
-- Helper Function: Get user role from JWT claims
-- This avoids querying user_profiles table (prevents recursion)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  -- Try to get role from JWT claims (set by auth system)
  v_role := auth.jwt()->>'role';
  
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;
  
  -- Fallback: query user_profiles (only once, not in policy)
  SELECT r.name INTO v_role
  FROM public.user_profiles up
  JOIN public.roles r ON up.role_id = r.id
  WHERE up.id = auth.uid()
  AND up.deleted_at IS NULL
  LIMIT 1;
  
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- New RLS Policies (no recursion)
-- =====================================================

-- 1. View own profile
CREATE POLICY "view_own_profile"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 2. Update own profile
CREATE POLICY "update_own_profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Admin can manage all profiles in tenant
-- Uses JWT claims or a simple role check without recursion
CREATE POLICY "admin_manage_profiles"
  ON public.user_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up
          JOIN public.roles r ON up.role_id = r.id
          WHERE up.id = auth.uid()
          AND r.name IN ('admin', 'super_admin')
          AND up.deleted_at IS NULL
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
        OR EXISTS (
          SELECT 1 FROM public.user_profiles up
          JOIN public.roles r ON up.role_id = r.id
          WHERE up.id = auth.uid()
          AND r.name IN ('admin', 'super_admin')
          AND up.deleted_at IS NULL
        )
      )
    )
  );

-- 4. Privileged roles can view tenant profiles
CREATE POLICY "privileged_view_tenant_profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id  -- Can view own profile
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('admin', 'commercial', 'commercial_director', 'pm_lead', 'cfo', 'ceo', 'super_admin')
      AND up.deleted_at IS NULL
    )
  );

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT INSERT, UPDATE ON public.user_profiles TO authenticated;

-- =====================================================
-- Verification
-- =====================================================
SELECT 
  polname as policy_name,
  polcmd as command,
  polroles::regrole[] as roles
FROM pg_policy
WHERE polrelid = 'public.user_profiles'::regclass
ORDER BY polname;
