-- =====================================================
-- Fix: hr_departments RLS Policy
-- =====================================================
-- Problem: Policy was references non-existent "user_roles" table
-- Solution: Use existing user_profiles + roles structure
-- =====================================================

-- Fix hr_departments policy
DROP POLICY IF EXISTS "HR admin can manage departments" ON public.hr_departments;
CREATE POLICY "HR admin can manage departments"
  ON public.hr_departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() 
      AND r.name IN ('admin', 'hr_admin')
      AND up.deleted_at IS NULL
    )
  );

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
